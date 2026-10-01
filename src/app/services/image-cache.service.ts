import { Injectable, signal } from '@angular/core';
import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Uma } from '../models/uma.model';

interface SavedImage {
  source: string;
  path: string;
  mime: string;
  etag?: string;
  modified?: string;
}

export interface CachedImages {
  data: Uma[];
  saved: number;
  total: number;
  failed: number;
}

const PREFIX = 'offline_uma_image_v1_';
const FOLDER = 'uma-images';
const directory = Directory.Data;

/** Archivos privados persistentes; localStorage solo contiene un índice pequeño. */
@Injectable({ providedIn: 'root' })
export class ImageCacheService {
  readonly progress = signal<{ completed: number; total: number } | null>(null);
  private queue: Promise<unknown> = Promise.resolve();

  prepare(umas: Uma[], refresh: boolean): Promise<CachedImages> {
    const task = this.queue.then(() => this.prepareImages(umas, refresh));
    this.queue = task.catch(() => undefined);
    return task;
  }

  private async prepareImages(umas: Uma[], refresh: boolean): Promise<CachedImages> {
    const result: CachedImages = { data: [...umas], saved: 0, total: umas.length, failed: 0 };
    let next = 0;
    let completed = 0;
    let networkFailed = false;
    this.progress.set({ completed, total: umas.length });
    try {
      // Limitar memoria y conexiones; todas las imágenes, no solo las visibles.
      await Promise.all(Array.from({ length: Math.min(4, umas.length) }, async () => {
        while (next < umas.length) {
          const index = next++;
          const uma = umas[index];
          let saved = this.readIndex(uma.id);
          let localUrl = saved ? await this.localUrl(saved) : null;
          if (refresh && uma.imageUrl && !networkFailed) {
            try {
              const headers: Record<string, string> = {};
              if (localUrl && saved?.source === uma.imageUrl) {
                if (saved.etag) headers['If-None-Match'] = saved.etag;
                if (saved.modified) headers['If-Modified-Since'] = saved.modified;
              }
              let response;
              try {
                response = await CapacitorHttp.get({
                  url: uma.imageUrl, headers, responseType: 'arraybuffer',
                  connectTimeout: 5000, readTimeout: 5000,
                  webFetchExtra: { signal: AbortSignal.timeout(10000) }
                });
              } catch (error) {
                // Si se pierde el servidor, no esperar un timeout por cada imagen.
                networkFailed = true;
                throw error;
              }
              if (response.status !== 304 || !localUrl) {
                if (response.status !== 200) throw new Error('Imagen no disponible');
                const data = response.data;
                const type = this.imageType(data);
                if (!type) throw new Error('Respuesta de imagen inválida');
                const responseHeaders = Object.fromEntries(Object.entries(response.headers)
                  .map(([key, value]) => [key.toLowerCase(), value]));
                const entry: SavedImage = {
                  source: uma.imageUrl,
                  path: `${FOLDER}/${uma.id}-${crypto.randomUUID()}.${type.extension}`,
                  mime: type.mime,
                  etag: responseHeaders['etag'], modified: responseHeaders['last-modified']
                };
                // Archivo nuevo antes de cambiar el índice: un fallo conserva la copia anterior.
                try {
                  await Filesystem.writeFile({ directory, path: entry.path, data, recursive: true });
                  const newUrl = await this.localUrl(entry);
                  if (!newUrl) throw new Error('No se pudo leer la imagen guardada');
                  localStorage.setItem(PREFIX + uma.id, JSON.stringify(entry));
                  localUrl = newUrl;
                } catch (error) {
                  await this.removeFile(entry.path);
                  throw error;
                }
                if (saved) await this.removeFile(saved.path);
                saved = entry;
              }
            } catch {
              result.failed++;
            }
          } else if (refresh) {
            result.failed++;
          }
          if (localUrl) result.saved++;
          result.data[index] = { ...uma, imageUrl: localUrl || uma.imageUrl };
          this.progress.set({ completed: ++completed, total: umas.length });
        }
      }));
      return result;
    } finally {
      this.progress.set(null);
    }
  }

  private readIndex(id: number): SavedImage | null {
    try {
      const entry = JSON.parse(localStorage.getItem(PREFIX + id) || 'null');
      return entry && typeof entry.source === 'string' &&
        typeof entry.path === 'string' && /^uma-images\/[\w-]+\.(png|jpg|gif|webp)$/.test(entry.path) &&
        /^image\/(png|jpeg|gif|webp)$/.test(entry.mime) &&
        (entry.etag === undefined || typeof entry.etag === 'string') &&
        (entry.modified === undefined || typeof entry.modified === 'string') ? entry : null;
    } catch { return null; }
  }

  private async localUrl(entry: SavedImage): Promise<string | null> {
    try {
      const stat = await Filesystem.stat({ directory, path: entry.path });
      if (stat.size <= 0) return null;
      if (Capacitor.isNativePlatform()) {
        const { uri } = await Filesystem.getUri({ directory, path: entry.path });
        return Capacitor.convertFileSrc(uri);
      }
      const { data } = await Filesystem.readFile({ directory, path: entry.path });
      return typeof data === 'string' ? `data:${entry.mime};base64,${data}` : null;
    } catch { return null; }
  }

  /** Verifica firmas binarias; una página HTML de error nunca sustituye una imagen. */
  private imageType(data: unknown): { mime: string; extension: string } | null {
    if (typeof data !== 'string' || data.length > 14_000_000) return null;
    try {
      const bytes = atob(data);
      if (bytes.startsWith('\x89PNG\r\n\x1a\n')) return { mime: 'image/png', extension: 'png' };
      if (bytes.startsWith('\xff\xd8\xff')) return { mime: 'image/jpeg', extension: 'jpg' };
      if (/^GIF8[79]a/.test(bytes)) return { mime: 'image/gif', extension: 'gif' };
      if (bytes.startsWith('RIFF') && bytes.slice(8, 12) === 'WEBP') return { mime: 'image/webp', extension: 'webp' };
    } catch { /* Base64 inválido. */ }
    return null;
  }

  private async removeFile(path: string): Promise<void> {
    try { await Filesystem.deleteFile({ directory, path }); } catch { /* Puede no existir. */ }
  }

  clear(): Promise<void> {
    const task = this.queue.then(async () => {
      // readdir distingue una carpeta ausente de un fallo al eliminarla.
      let exists = false;
      try { await Filesystem.stat({ directory, path: FOLDER }); exists = true; } catch { /* Sin carpeta. */ }
      if (exists) await Filesystem.rmdir({ directory, path: FOLDER, recursive: true });
      Object.keys(localStorage).filter(key => key.startsWith(PREFIX)).forEach(key => localStorage.removeItem(key));
    });
    this.queue = task.catch(() => undefined);
    return task;
  }
}

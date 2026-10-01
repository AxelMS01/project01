import { Injectable } from '@angular/core';
import axios from 'axios';
import { inject } from '@angular/core';
import { Uma } from '../models/uma.model';
import { getApiBaseUrl } from './api.config';
import { ConnectionService } from './connection.service';
import { DataError, dataErrorMessage } from './data-error';
import { ImageCacheService } from './image-cache.service';

export interface UmaFetchResult {
  data: Uma[];
  fromCache: boolean;
  timestamp: string | null;
  warning?: string;
  imageStatus?: string;
}

const CACHE_KEY = 'offline_cached_umas';

/** Valida los campos obligatorios para renderizar datos de red y caché. */
function isUmaList(value: unknown): value is Uma[] {
  return Array.isArray(value) && value.every(uma =>
    uma && Number.isInteger(uma.id) && typeof uma.name === 'string' &&
    Number.isInteger(uma.rarity) && uma.rarity >= 0 && uma.rarity <= 5 &&
    (uma.rareza_base === undefined || (Number.isInteger(uma.rareza_base) && uma.rareza_base >= 0 && uma.rareza_base <= 5)) &&
    typeof uma.imageUrl === 'string' && uma.aptitudes &&
    ['turf', 'dirt', 'short', 'mile', 'medium', 'long', 'front', 'leader', 'betweener', 'chaser']
      .every(key => typeof uma.aptitudes[key] === 'string')
  );
}

@Injectable({ providedIn: 'root' })
export class UmaService {
  private readonly api = axios.create({ timeout: 8000 });

  private readonly connection = inject(ConnectionService);
  private readonly images = inject(ImageCacheService);

  /** Red primero; ante desconexión o fallo usa la última copia válida, incluso vacía. */
  async getUmas(): Promise<UmaFetchResult> {
    try {
      if (!this.connection.online()) throw new DataError('Sin conexión a la red.');
      const response = await this.api.get(`${getApiBaseUrl()}/api.php`);
      if (response.data?.status !== 'success' || !isUmaList(response.data.data)) {
        throw new DataError('El servidor devolvió datos inválidos. Intenta de nuevo más tarde.');
      }
      const result: UmaFetchResult = {
        data: response.data.data, fromCache: false, timestamp: new Date().toISOString()
      };
      try {
        // Una escritura mantiene unidos los datos y su fecha.
        localStorage.setItem(CACHE_KEY, JSON.stringify({ version: 1, data: result.data, timestamp: result.timestamp }));
      } catch {
        result.warning = 'Datos actualizados, pero no se pudo guardar una copia para usar sin conexión.';
      }
      return this.withImages(result, true, !result.warning);
    } catch (error) {
      const cached = this.readCache();
      if (cached) return this.withImages({ ...cached, fromCache: true, warning: dataErrorMessage(error) }, false, true);
      throw new DataError(`${dataErrorMessage(error)} No hay una copia local válida. Conéctate y pulsa Reintentar para descargar el catálogo.`);
    }
  }

  private async withImages(result: UmaFetchResult, refresh: boolean, catalogSaved: boolean): Promise<UmaFetchResult> {
    try {
      const images = await this.images.prepare(result.data, refresh);
      result.data = images.data;
      const missing = images.total - images.saved;
      result.imageStatus = missing > 0
        ? `Imágenes guardadas: ${images.saved} de ${images.total}. Conéctate y pulsa Actualizar para completar la descarga.`
        : catalogSaved ? 'Catálogo e imágenes disponibles sin conexión.' : 'Imágenes guardadas; falta guardar el catálogo.';
      if (images.failed > 0 && missing === 0) {
        result.imageStatus += ' No se pudieron actualizar todas las imágenes; se conservaron las copias anteriores.';
      }
    } catch {
      result.imageStatus = 'No se pudo acceder a las imágenes guardadas. Pulsa Actualizar para reintentar.';
    }
    return result;
  }

  private readCache(): { data: Uma[]; timestamp: string | null } | null {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw === null) return null;
      const saved = JSON.parse(raw);
      // Compatibilidad con la caché anterior a la versión 1.
      if (isUmaList(saved)) return { data: saved, timestamp: localStorage.getItem('offline_cached_umas_timestamp') };
      if (saved?.version !== 1 || !isUmaList(saved.data) ||
          typeof saved.timestamp !== 'string' || !Number.isFinite(Date.parse(saved.timestamp))) return null;
      return { data: saved.data, timestamp: new Date(saved.timestamp).toLocaleString() };
    } catch {
      return null;
    }
  }

  getFromCache(): Uma[] | null { return this.readCache()?.data ?? null; }
  getCacheTimestamp(): string | null { return this.readCache()?.timestamp ?? null; }
}

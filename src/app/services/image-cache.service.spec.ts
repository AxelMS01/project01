import { vi } from 'vitest';
import { CapacitorHttp, Capacitor } from '@capacitor/core';
import { Filesystem } from '@capacitor/filesystem';
import { ImageCacheService } from './image-cache.service';
import { Uma } from '../models/uma.model';

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: vi.fn(() => true), convertFileSrc: (uri: string) => `local:${uri}` },
  CapacitorHttp: { get: vi.fn() }
}));
vi.mock('@capacitor/filesystem', () => ({
  Directory: { Data: 'DATA' },
  Filesystem: { stat: vi.fn(), getUri: vi.fn(), readFile: vi.fn(), writeFile: vi.fn(), deleteFile: vi.fn(), rmdir: vi.fn() }
}));

const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=';
const catalog = (count = 1) => Array.from({ length: count }, (_, index) => ({
  id: index + 1, name: `Uma ${index + 1}`, imageUrl: `http://localhost:8088/${index + 1}.png`
} as Uma));

describe('Imágenes persistentes del catálogo', () => {
  let service: ImageCacheService;
  let files: Map<string, string>;
  beforeEach(() => {
    vi.resetAllMocks();
    localStorage.clear();
    files = new Map();
    service = new ImageCacheService();
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    vi.mocked(CapacitorHttp.get).mockResolvedValue({ status: 200, data: png, headers: { ETag: 'v1' }, url: '' });
    vi.mocked(Filesystem.writeFile).mockImplementation(async ({ path, data }) => {
      files.set(path, data as string);
      return { uri: `file://${path}` };
    });
    vi.mocked(Filesystem.stat).mockImplementation(async ({ path }) => {
      if (!files.has(path) && path !== 'uma-images') throw new Error('Missing');
      return { name: path, type: 'file', size: 68, uri: `file://${path}`, ctime: 0, mtime: 0 };
    });
    vi.mocked(Filesystem.getUri).mockImplementation(async ({ path }) => ({ uri: `file://${path}` }));
    vi.mocked(Filesystem.readFile).mockImplementation(async ({ path }) => ({ data: files.get(path)! }));
    vi.mocked(Filesystem.deleteFile).mockImplementation(async ({ path }) => { files.delete(path); });
    vi.mocked(Filesystem.rmdir).mockImplementation(async () => { files.clear(); });
  });
  afterEach(() => { vi.restoreAllMocks(); localStorage.clear(); });

  it('guarda las 100 imágenes y una nueva instancia las abre sin peticiones de red', async () => {
    const online = await service.prepare(catalog(100), true);
    expect(online.saved).toBe(100);
    expect(files.size).toBe(100);
    expect(online.data.every(uma => uma.imageUrl.startsWith('local:file://'))).toBe(true);
    vi.mocked(CapacitorHttp.get).mockClear();
    const offline = await new ImageCacheService().prepare(catalog(100), false);
    expect(offline.data).toEqual(online.data);
    expect(offline.saved).toBe(100);
    expect(CapacitorHttp.get).not.toHaveBeenCalled();
    expect(service.progress()).toBeNull();
  });

  it('revalida con ETag y no vuelve a escribir una imagen que no cambió', async () => {
    const first = await service.prepare(catalog(), true);
    vi.mocked(CapacitorHttp.get).mockResolvedValue({ status: 304, data: '', headers: {}, url: '' });
    expect((await service.prepare(catalog(), true)).data).toEqual(first.data);
    expect(CapacitorHttp.get).toHaveBeenLastCalledWith(expect.objectContaining({ headers: { 'If-None-Match': 'v1' } }));
    expect(Filesystem.writeFile).toHaveBeenCalledTimes(1);
  });

  it('reemplaza una imagen modificada y elimina el archivo anterior tras guardar el índice', async () => {
    const first = await service.prepare(catalog(), true);
    const updated = await service.prepare(catalog(), true);
    expect(updated.data[0].imageUrl).not.toBe(first.data[0].imageUrl);
    expect(files.size).toBe(1);
    expect((await new ImageCacheService().prepare(catalog(), false)).data).toEqual(updated.data);
  });

  it('conserva la copia anterior si falla la red o el almacenamiento', async () => {
    const first = await service.prepare(catalog(), true);
    vi.mocked(Filesystem.writeFile).mockRejectedValueOnce(new Error('Full'));
    const full = await service.prepare(catalog(), true);
    expect(full).toMatchObject({ data: first.data, saved: 1, failed: 1 });
    vi.mocked(CapacitorHttp.get).mockRejectedValue(new Error('Offline'));
    expect(await service.prepare(catalog(), true)).toMatchObject({ data: first.data, saved: 1, failed: 1 });
    expect(files.size).toBe(1);
  });

  it('no pierde la imagen previa si no se puede guardar el nuevo índice', async () => {
    const first = await service.prepare(catalog(), true);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Quota'); });
    expect(await service.prepare(catalog(), true)).toMatchObject({ data: first.data, saved: 1, failed: 1 });
    expect(files.size).toBe(1);
  });

  it('detecta archivos eliminados y reintenta descargarlos sin enviar validadores', async () => {
    await service.prepare(catalog(), true);
    files.clear();
    expect((await service.prepare(catalog(), false)).saved).toBe(0);
    expect((await service.prepare(catalog(), true)).saved).toBe(1);
    expect(CapacitorHttp.get).toHaveBeenLastCalledWith(expect.objectContaining({ headers: {} }));
  });

  it('informa descarga parcial y rechaza HTML sin interrumpir otras imágenes', async () => {
    vi.mocked(CapacitorHttp.get).mockResolvedValueOnce({ status: 200, data: btoa('<html>Error</html>'), headers: {}, url: '' });
    expect(await service.prepare(catalog(3), true)).toMatchObject({ saved: 2, total: 3, failed: 1 });
    expect(files.size).toBe(2);
  });

  it('interrumpe los intentos restantes al perder el servidor', async () => {
    vi.mocked(CapacitorHttp.get).mockRejectedValue(new Error('Disconnected'));
    expect(await service.prepare(catalog(100), true)).toMatchObject({ saved: 0, total: 100, failed: 100 });
    expect(vi.mocked(CapacitorHttp.get).mock.calls.length).toBeLessThanOrEqual(4);
  });

  it('en web recupera el archivo persistido como data URI', async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
    expect((await service.prepare(catalog(), true)).data[0].imageUrl).toBe(`data:image/png;base64,${png}`);
  });

  it('limpiar espera la descarga activa y elimina archivos e índices, sin borrar la sesión', async () => {
    localStorage.setItem('currentUser', '{"id":1}');
    const pending = service.prepare(catalog(10), true);
    await service.clear();
    await pending;
    expect(files.size).toBe(0);
    expect(Object.keys(localStorage)).toEqual(['currentUser']);
    expect((await service.prepare(catalog(10), false)).saved).toBe(0);
  });
});

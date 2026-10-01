import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import axios, { AxiosInstance } from 'axios';
import { UmaService } from './uma.service';
import { ConnectionService } from './connection.service';
import { ImageCacheService } from './image-cache.service';

const catalog = [{
  id: 1, name: 'Oguri Cap', rarity: 3, imageUrl: 'http://localhost/image.png',
  baseStats: { speed: 1, stamina: 2, power: 3, guts: 4, wit: 5 },
  growthRates: { speed: 0, stamina: 0, power: 0, guts: 0, wit: 0 },
  aptitudes: { turf: 'A', dirt: 'B', short: 'C', mile: 'A', medium: 'A', long: 'B', front: 'C', leader: 'A', betweener: 'A', chaser: 'B' }
}];

describe('Catálogo sin conexión', () => {
  let service: UmaService;
  let connection: ConnectionService;
  let get: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    localStorage.clear();
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    get = vi.fn().mockResolvedValue({ data: { status: 'success', data: catalog } });
    vi.spyOn(axios, 'create').mockReturnValue({ get } as unknown as AxiosInstance);
    TestBed.configureTestingModule({ providers: [{ provide: ImageCacheService, useValue: {
      prepare: vi.fn(async (data: typeof catalog) => ({ data, saved: data.length, total: data.length, failed: 0 }))
    } }] });
    connection = TestBed.inject(ConnectionService);
    service = TestBed.inject(UmaService);
  });
  afterEach(() => { vi.restoreAllMocks(); localStorage.clear(); });

  it('descarga, persiste y vuelve a abrir sin red sin hacer otra petición', async () => {
    expect((await service.getUmas()).fromCache).toBe(false);
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    window.dispatchEvent(new Event('offline'));
    const reopened = TestBed.runInInjectionContext(() => new UmaService());
    const result = await reopened.getUmas();
    expect(result.data).toEqual(catalog);
    expect(result.fromCache).toBe(true);
    expect(result.timestamp).toBeTruthy();
    expect(get).toHaveBeenCalledTimes(1);
  });

  it('informa cuando se inicia sin conexión y sin caché', async () => {
    connection.online.set(false);
    await expect(service.getUmas()).rejects.toThrow('No hay una copia local válida');
    expect(get).not.toHaveBeenCalled();
  });

  it('conserva una lista vacía válida para uso sin conexión', async () => {
    get.mockResolvedValue({ data: { status: 'success', data: [] } });
    await service.getUmas();
    connection.online.set(false);
    expect(await service.getUmas()).toMatchObject({ data: [], fromCache: true });
  });

  it.each([
    { status: 'error', data: [] },
    { status: 'success', data: [null] },
    { status: 'success', data: [{ id: 1, name: 'incompleto' }] },
    '<html>Error PHP</html>'
  ])('no reemplaza una copia válida con una respuesta inválida: %j', async body => {
    await service.getUmas();
    const saved = localStorage.getItem('offline_cached_umas');
    get.mockResolvedValue({ data: body });
    expect(await service.getUmas()).toMatchObject({ data: catalog, fromCache: true });
    expect(localStorage.getItem('offline_cached_umas')).toBe(saved);
  });

  it.each(['{corrupto', '{"version":1,"data":null}', '[null]'])('maneja caché corrupta: %s', async raw => {
    localStorage.setItem('offline_cached_umas', raw);
    connection.online.set(false);
    await expect(service.getUmas()).rejects.toThrow('No hay una copia local válida');
  });

  it.each([
    [{ isAxiosError: true, response: { status: 500 } }, 'servidor no puede acceder'],
    [{ isAxiosError: true, code: 'ECONNABORTED' }, 'tardó demasiado'],
    [{ isAxiosError: true, code: 'ERR_NETWORK' }, 'contactar al servidor']
  ])('usa caché y distingue el fallo de acceso: %j', async (error, message) => {
    await service.getUmas();
    get.mockRejectedValue(error);
    const result = await service.getUmas();
    expect(result.fromCache).toBe(true);
    expect(result.warning).toContain(message);
    expect(connection.online()).toBe(true);
  });

  it('entrega datos de red y avisa si localStorage está lleno', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('QuotaExceededError'); });
    const result = await service.getUmas();
    expect(result.fromCache).toBe(false);
    expect(result.data).toEqual(catalog);
    expect(result.warning).toContain('no se pudo guardar');
  });

  it('actualiza la copia al recuperar la red', async () => {
    await service.getUmas();
    connection.online.set(false);
    await service.getUmas();
    window.dispatchEvent(new Event('online'));
    get.mockResolvedValue({ data: { status: 'success', data: [] } });
    expect((await service.getUmas()).fromCache).toBe(false);
    expect(service.getFromCache()).toEqual([]);
  });

  it('muestra imágenes locales pero conserva las URLs originales en el catálogo persistido', async () => {
    const images = TestBed.inject(ImageCacheService);
    vi.mocked(images.prepare).mockResolvedValue({
      data: [{ ...catalog[0], imageUrl: 'https://localhost/_capacitor_file_/uma.png' }],
      saved: 1, total: 1, failed: 0
    });
    const result = await service.getUmas();
    expect(result.data[0].imageUrl).toContain('_capacitor_file_');
    expect(result.imageStatus).toContain('disponibles sin conexión');
    expect(service.getFromCache()).toEqual(catalog);
    connection.online.set(false);
    await service.getUmas();
    expect(images.prepare).toHaveBeenLastCalledWith(catalog, false);
  });

  it('no anuncia disponibilidad completa si quedan imágenes pendientes', async () => {
    vi.mocked(TestBed.inject(ImageCacheService).prepare).mockResolvedValue({ data: catalog, saved: 0, total: 1, failed: 1 });
    const result = await service.getUmas();
    expect(result.imageStatus).toContain('0 de 1');
    expect(result.imageStatus).not.toContain('disponibles sin conexión');
  });
});

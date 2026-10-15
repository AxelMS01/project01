import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import axios, { AxiosInstance } from 'axios';
import { ApiService } from './api.service';
import { getApiBaseUrl } from './api.config';

describe('Contrato HTTP del cliente móvil', () => {
  let service: ApiService;
  const get = vi.fn();
  const post = vi.fn();

  beforeEach(() => {
    get.mockReset().mockResolvedValue({ data: { status: 'success', total: 0, data: [] } });
    post.mockReset().mockResolvedValue({ data: { status: 'success', id: '1' } });
    vi.spyOn(axios, 'create').mockReturnValue({ get, post } as unknown as AxiosInstance);
    service = new ApiService();
  });
  afterEach(() => vi.restoreAllMocks());

  it('configura URL compartida, JSON y tiempo máximo', () => {
    expect(axios.create).toHaveBeenCalledWith({
      baseURL: getApiBaseUrl(), timeout: 10000,
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' }
    });
  });

  it('distingue listado, detalle y compatibilidad mediante parámetros', async () => {
    expect(await service.getUmas()).toMatchObject({ total: 0, data: [] });
    await service.getUma(2);
    await service.getCompatibility(2);
    expect(get.mock.calls).toEqual([
      ['/api.php'], ['/api.php', { params: { id: 2 } }],
      ['/api.php', { params: { action: 'compatibility', id: 2 } }]
    ]);
  });

  it.each([0, -1, 1.5, NaN])('evita que un ID inválido consulte accidentalmente el listado: %s', id => {
    expect(() => service.getUma(id)).toThrow('entero positivo');
    expect(() => service.getCompatibility(id)).toThrow('entero positivo');
    expect(get).not.toHaveBeenCalled();
  });

  it('envía credenciales y registro a sus rutas respectivas', async () => {
    const login = { email: 'ana@example.com', password: 'Ejemplo123!' };
    const signup = { ...login, name: 'Ana' };
    await service.login(login);
    await service.signup(signup);
    expect(post.mock.calls).toEqual([['/login.php', login], ['/signup.php', signup]]);
  });

  it('excluye los metadatos offline del mensaje de contacto', async () => {
    const contact = { nombre: 'Ana', apellido: 'López', email: 'ana@example.com', mensaje: 'Hola' };
    await service.sendContact({ ...contact, needsReview: true } as typeof contact);
    expect(post).toHaveBeenCalledWith('/formulario-contacto.php', contact);
  });

  it('rechaza una respuesta sin confirmación de éxito', async () => {
    post.mockResolvedValue({ data: { status: 'error', message: 'Error' } });
    await expect(service.sendContact({ nombre: 'A', apellido: 'B', email: 'a@b.com', mensaje: 'Hola' }))
      .rejects.toThrow('La API no confirmó');
  });

  it('informa un timeout sin repetir un POST que podría haberse guardado', async () => {
    post.mockRejectedValue({ isAxiosError: true, code: 'ECONNABORTED' });
    await expect(service.login({ email: 'a@b.com', password: 'ejemplo' })).rejects.toThrow('tardó demasiado');
    expect(post).toHaveBeenCalledTimes(1);
  });
});

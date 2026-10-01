import { vi } from 'vitest';
import { ConnectionService } from './connection.service';

describe('Detección de conexión', () => {
  afterEach(() => vi.restoreAllMocks());

  it('detecta el arranque sin red, la reconexión y la desconexión', () => {
    const network = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    const service = new ConnectionService();
    expect(service.online()).toBe(false);
    network.mockReturnValue(true);
    window.dispatchEvent(new Event('online'));
    expect(service.online()).toBe(true);
    network.mockReturnValue(false);
    window.dispatchEvent(new Event('offline'));
    expect(service.online()).toBe(false);
    service.ngOnDestroy();
    network.mockReturnValue(true);
    window.dispatchEvent(new Event('online'));
    expect(service.online()).toBe(false);
  });
});

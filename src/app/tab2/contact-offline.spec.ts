import { ChangeDetectorRef } from '@angular/core';
import { ToastController } from '@ionic/angular';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import axios from 'axios';
import { Tab2Page } from './tab2.page';
import { ConnectionService } from '../services/connection.service';
import { AuthService } from '../services/auth.service';

const message = { nombre: 'Ana', apellido: 'López', email: 'ana@example.com', mensaje: 'Hola' };
const key = 'offline_pending_contact_messages';

describe('Contacto y almacenamiento temporal', () => {
  let page: Tab2Page;
  let connection: ConnectionService;
  const toast = { create: vi.fn().mockResolvedValue({ present: vi.fn() }) };

  beforeEach(() => {
    localStorage.clear();
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    connection = new ConnectionService();
    page = new Tab2Page(toast as unknown as ToastController, {} as AuthService, connection,
      { detectChanges: vi.fn() } as unknown as ChangeDetectorRef);
    page.contactData = { ...message };
    vi.spyOn(axios, 'post').mockResolvedValue({ data: { status: 'success' } });
  });
  afterEach(() => { connection.ngOnDestroy(); page.ngOnDestroy(); vi.restoreAllMocks(); localStorage.clear(); });

  it('guarda sin conexión y envía al recibir online', async () => {
    connection.online.set(false);
    await page.onSubmit();
    expect(axios.post).not.toHaveBeenCalled();
    expect(JSON.parse(localStorage.getItem(key)!)[0]).toMatchObject(message);
    expect(page.contactData.mensaje).toBe('');
    page.ngOnInit();
    window.dispatchEvent(new Event('online'));
    await vi.waitFor(() => expect(page.pendingCount).toBe(0));
    expect(axios.post).toHaveBeenCalledTimes(1);
    expect(JSON.parse(localStorage.getItem(key)!)).toEqual([]);
  });

  it('no borra el formulario ni confirma guardado si falta espacio', async () => {
    connection.online.set(false);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
    await page.onSubmit();
    expect(page.contactData).toEqual(message);
    expect(page.statusMessage).toContain('No se pudo guardar');
    expect(page.isLoading).toBe(false);
  });

  it('no sobrescribe una cola corrupta', async () => {
    localStorage.setItem(key, '{roto');
    connection.online.set(false);
    await page.onSubmit();
    expect(localStorage.getItem(key)).toBe('{roto');
    expect(page.contactData).toEqual(message);
  });

  it('conserva formulario ante HTTP 400 y no lo encola como desconexión', async () => {
    vi.mocked(axios.post).mockRejectedValue({ isAxiosError: true, response: { status: 400 } });
    await page.onSubmit();
    expect(page.contactData).toEqual(message);
    expect(localStorage.getItem(key)).toBeNull();
    expect(page.statusMessage).toContain('Revisa los datos');
  });

  it('retiene una respuesta rechazada y evita reenvíos automáticos ambiguos', async () => {
    localStorage.setItem(key, JSON.stringify([message]));
    vi.mocked(axios.post).mockResolvedValue({ data: { status: 'error' } });
    await page.syncPendingMessages();
    expect(page.pendingCount).toBe(1);
    await page.syncPendingMessages();
    expect(axios.post).toHaveBeenCalledTimes(1);
    vi.mocked(axios.post).mockResolvedValue({ data: { status: 'success' } });
    await page.syncPendingMessages(true);
    expect(page.pendingCount).toBe(0);
  });

  it('no ejecuta sincronizaciones simultáneas', async () => {
    localStorage.setItem(key, JSON.stringify([message]));
    let finish!: (result: unknown) => void;
    vi.mocked(axios.post).mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    const first = page.syncPendingMessages();
    await page.syncPendingMessages();
    expect(axios.post).toHaveBeenCalledTimes(1);
    finish({ data: { status: 'success' } });
    await first;
    expect(page.pendingCount).toBe(0);
  });
});

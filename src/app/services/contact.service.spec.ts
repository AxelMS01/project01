import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ContactService } from './contact.service';
import { getApiBaseUrl } from './api.config';

describe('ContactService REST', () => {
  let service: ContactService;
  let http: HttpTestingController;
  const url = `${getApiBaseUrl()}/formulario-contacto.php`;
  const input = { nombre: 'Ana', apellido: 'Prueba', email: 'ana@example.com', mensaje: 'Hola' };
  const contact = { ...input, id: 1, created_at: '2026-10-14 12:00:00' };
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(ContactService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => { http.verify(); TestBed.resetTestingModule(); });
  it('consulta, crea, actualiza y elimina con métodos y cuerpos correctos', () => {
    service.list().subscribe(data => expect(data).toEqual([contact]));
    http.expectOne({ method: 'GET', url }).flush({ status: 'success', data: [contact] });
    service.create(input).subscribe(data => expect(data.id).toBe(1));
    const post = http.expectOne({ method: 'POST', url });
    expect(post.request.body).toEqual(input);
    post.flush({ status: 'success', data: contact }, { status: 201, statusText: 'Created' });
    service.update(1, { ...input, mensaje: 'Editado' }).subscribe();
    const put = http.expectOne({ method: 'PUT', url: `${url}?id=1` });
    expect(put.request.body.mensaje).toBe('Editado');
    put.flush({ status: 'success', data: { ...contact, mensaje: 'Editado' } });
    service.remove(1).subscribe(data => expect(data).toBeNull());
    http.expectOne({ method: 'DELETE', url: `${url}?id=1` }).flush({ status: 'success', data: null });
  });
  it.each([400, 404, 500])('convierte error HTTP %s en un mensaje y no reintenta escrituras', status => {
    let message = '';
    service.create(input).subscribe({ error: error => message = error.message });
    http.expectOne({ method: 'POST', url }).flush({}, { status, statusText: 'Error' });
    expect(message).toMatch(status === 400 ? /campos/ : status === 404 ? /ya no existe/ : /servidor/);
    http.expectNone(url);
  });
  it('rechaza una respuesta que no cumple el contrato', () => {
    let failed = false;
    service.list().subscribe({ error: () => failed = true });
    http.expectOne(url).flush({ status: 'error' });
    expect(failed).toBe(true);
  });
});

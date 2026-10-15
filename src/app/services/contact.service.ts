import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError, map, Observable, throwError, timeout } from 'rxjs';
import { getApiBaseUrl } from './api.config';

export interface ContactInput {
  nombre: string;
  apellido: string;
  email: string;
  mensaje: string;
}
export interface Contact extends ContactInput { id: number; created_at: string; }
interface Envelope<T> { status: 'success' | 'error'; data: T; message?: string; }

@Injectable({ providedIn: 'root' })
export class ContactService {
  private readonly http = inject(HttpClient);
  private readonly url = `${getApiBaseUrl()}/formulario-contacto.php`;

  list(): Observable<Contact[]> { return this.unwrap(this.http.get<Envelope<Contact[]>>(this.url)); }
  create(input: ContactInput): Observable<Contact> {
    return this.unwrap(this.http.post<Envelope<Contact>>(this.url, input));
  }
  update(id: number, input: ContactInput): Observable<Contact> {
    return this.unwrap(this.http.put<Envelope<Contact>>(`${this.url}?id=${id}`, input));
  }
  remove(id: number): Observable<null> {
    return this.unwrap(this.http.delete<Envelope<null>>(`${this.url}?id=${id}`));
  }

  private unwrap<T>(request: Observable<Envelope<T>>): Observable<T> {
    return request.pipe(
      timeout(10000),
      map(response => {
        if (response.status !== 'success' || response.data === undefined) {
          throw new Error('La API devolvió una respuesta inesperada.');
        }
        return response.data;
      }),
      catchError((error: unknown) => {
        let message = 'No se pudo completar la solicitud. Intenta de nuevo.';
        if (error instanceof HttpErrorResponse) {
          if (error.status === 0) message = 'No se pudo conectar con la API. Revisa tu conexión y el servidor.';
          else if (error.status >= 500) message = 'El servidor no está disponible. Intenta más tarde.';
          else if (error.status === 404) message = 'El mensaje ya no existe. Actualiza la lista.';
          else if (error.status === 400) message = 'Revisa los campos y escribe un correo válido.';
        } else if (error instanceof Error && error.name === 'TimeoutError') {
          message = 'El servidor tardó demasiado. Actualiza la lista antes de reintentar.';
        }
        return throwError(() => new Error(message));
      })
    );
  }
}

import { Injectable } from '@angular/core';
import axios from 'axios';
import { Uma } from '../models/uma.model';
import { getApiBaseUrl } from './api.config';
import { DataError, dataErrorMessage } from './data-error';

export interface LoginRequest { email: string; password: string; }
export interface SignupRequest extends LoginRequest { name: string; }
export interface ContactRequest { nombre: string; apellido: string; email: string; mensaje: string; }
// PDO puede devolver IDs y puntos como cadenas; no se fuerzan tipos inexistentes en PHP.
export interface ApiUser { id: number | string; name: string; email: string; }
export interface Compatibility {
  id: number | string;
  nombre: string;
  imagen_url: string;
  puntos_compatibilidad: number | string;
}
export interface SuccessResponse { status: 'success'; message?: string; }
export interface DataResponse<T> extends SuccessResponse { data: T; }
export interface CatalogResponse extends DataResponse<Uma[]> { total: number; }
export interface AuthResponse extends SuccessResponse { user: ApiUser; }
export interface ContactResponse extends SuccessResponse { id: number | string; }

/** Cliente HTTP preparado para todos los endpoints PHP. No gestiona caché ni sesión.
 * Las pantallas existentes conservan su integración y estrategia offline actual.
 */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = axios.create({
    baseURL: getApiBaseUrl(),
    timeout: 10000,
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' }
  });

  getUmas(): Promise<CatalogResponse> {
    return this.request(() => this.http.get<CatalogResponse>('/api.php'));
  }

  getUma(id: number): Promise<DataResponse<Uma>> {
    this.validateId(id);
    return this.request(() => this.http.get<DataResponse<Uma>>('/api.php', { params: { id } }));
  }

  getCompatibility(id: number): Promise<DataResponse<Compatibility[]>> {
    this.validateId(id);
    return this.request(() => this.http.get<DataResponse<Compatibility[]>>('/api.php', {
      params: { action: 'compatibility', id }
    }));
  }

  login(input: LoginRequest): Promise<AuthResponse> {
    return this.request(() => this.http.post<AuthResponse>('/login.php', input));
  }

  signup(input: SignupRequest): Promise<AuthResponse> {
    return this.request(() => this.http.post<AuthResponse>('/signup.php', input));
  }

  sendContact(input: ContactRequest): Promise<ContactResponse> {
    // Solo viajan los cuatro campos de la API, nunca metadatos de la cola local.
    const { nombre, apellido, email, mensaje } = input;
    return this.request(() => this.http.post<ContactResponse>('/formulario-contacto.php', {
      nombre, apellido, email, mensaje
    }));
  }

  private validateId(id: number): void {
    if (!Number.isSafeInteger(id) || id <= 0) throw new DataError('El ID debe ser un entero positivo.');
  }

  private async request<T extends SuccessResponse>(operation: () => Promise<{ data: T }>): Promise<T> {
    try {
      const { data } = await operation();
      if (data?.status !== 'success') throw new DataError('La API no confirmó la operación.');
      return data;
    } catch (error: unknown) {
      throw new DataError(dataErrorMessage(error));
    }
  }
}

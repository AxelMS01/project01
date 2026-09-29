import { Injectable } from '@angular/core';
import axios, { AxiosInstance } from 'axios';
import { Uma, ApiResponse } from '../models/uma.model';
import { getApiBaseUrl } from './api.config';

// Resultado interno del servicio; fromCache y timestamp no vienen del contrato PHP.
export interface UmaFetchResult {
  data: Uma[];
  fromCache: boolean;
  timestamp?: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class UmaService {
  private api: AxiosInstance;
  private readonly CACHE_KEY = 'offline_cached_umas';
  private readonly CACHE_TIME_KEY = 'offline_cached_umas_timestamp';

  constructor() {
    // Cliente del catálogo: URL base /backend, intercambio JSON y espera máxima de 8 s.
    this.api = axios.create({
      baseURL: getApiBaseUrl(),
      timeout: 8000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
  }

  /**
   * GET /backend/api.php: intenta primero la red y guarda el catálogo en localStorage.
   * Si falla (red, timeout o error HTTP), usa la copia local no vacía si existe.
   * Sin respuesta ni caché, propaga el error para que Tab1Page lo muestre.
   */
  async getUmas(): Promise<UmaFetchResult> {
    try {
      this.api.defaults.baseURL = getApiBaseUrl();
      const response = await this.api.get<ApiResponse<Uma[]>>('/api.php');
      // response.data es el JSON de Axios; response.data.data es el arreglo del PHP.
      // ApiResponse<Uma[]> describe tipos, pero no valida el cuerpo en ejecución.
      
      if (response.data && response.data.status === 'success' && Array.isArray(response.data.data)) {
        const umas = response.data.data;
        this.saveToCache(umas);
        return {
          data: umas,
          fromCache: false,
          timestamp: new Date().toLocaleTimeString()
        };
      }
      
      const fallbackList = response.data?.data || [];
      if (fallbackList.length > 0) {
        this.saveToCache(fallbackList);
      }
      return { data: fallbackList, fromCache: false };
    } catch (error) {
      console.warn('Conexión con el servidor no disponible. Cargando copia en caché del teléfono...', error);
      
      const cached = this.getFromCache();
      if (cached && cached.length > 0) {
        return {
          data: cached,
          fromCache: true,
          timestamp: this.getCacheTimestamp()
        };
      }

      // Si no hay datos en caché en el dispositivo, propagar error
      throw error;
    }
  }

  private saveToCache(umas: Uma[]): void {
    // Guarda también baseStats y maxStats; la fecha es local, no enviada por el servidor.
    try {
      localStorage.setItem(this.CACHE_KEY, JSON.stringify(umas));
      localStorage.setItem(this.CACHE_TIME_KEY, new Date().toLocaleString());
    } catch (e) {
      console.error('Error al guardar en caché local:', e);
    }
  }

  public getFromCache(): Uma[] | null {
    try {
      const data = localStorage.getItem(this.CACHE_KEY);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error('Error al leer caché local:', e);
      return null;
    }
  }

  public getCacheTimestamp(): string | null {
    return localStorage.getItem(this.CACHE_TIME_KEY);
  }
}

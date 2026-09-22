import { Injectable } from '@angular/core';
import axios, { AxiosInstance } from 'axios';
import { Uma, ApiResponse } from '../models/uma.model';
import { getApiBaseUrl } from './api.config';

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
   * Obtiene la lista de Uma Musume con soporte Offline-First:
   * 1. Intenta conectarse al backend PHP/MySQL.
   * 2. Si hay conexión: guarda copia fresca en localStorage y devuelve los datos del servidor.
   * 3. Si no hay conexión (sin cable / sin Wi-Fi): lee y devuelve la copia guardada en el teléfono.
   */
  async getUmas(): Promise<UmaFetchResult> {
    try {
      this.api.defaults.baseURL = getApiBaseUrl();
      const response = await this.api.get<ApiResponse<Uma[]>>('/api.php');
      
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
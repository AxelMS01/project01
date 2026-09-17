import { Injectable } from '@angular/core';
import axios, { AxiosInstance } from 'axios';
import { Uma, ApiResponse } from '../models/uma.model';

@Injectable({
  providedIn: 'root'
})
export class UmaService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: 'http://localhost:8088/backend',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
  }

  /**
   * Obtiene la lista completa de Uma Musume desde el servicio backend PHP/MySQL
   * Desempaqueta response.data.data de la respuesta del servidor
   */
  async getUmas(): Promise<Uma[]> {
    try {
      const response = await this.api.get<ApiResponse<Uma[]>>('/api.php');
      
      // Validación y desempaquetado correcto de response.data.data
      if (response.data && response.data.status === 'success' && Array.isArray(response.data.data)) {
        return response.data.data;
      }
      
      return response.data?.data || [];
    } catch (error) {
      console.error('Error al conectar con la API de Uma Musume:', error);
      throw error;
    }
  }
}
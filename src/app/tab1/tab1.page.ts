import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { UmaService } from '../services/uma.service';
import { Uma } from '../models/uma.model';

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
  standalone: false,
})
export class Tab1Page implements OnInit {
  umas: Uma[] = [];
  cargando: boolean = true;
  errorMensaje: string | null = null;

  constructor(
    private umaService: UmaService,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit() {
    await this.cargarUmas();
  }

  /**
   * Evento para refrescar la lista con pull-to-refresh
   */
  async doRefresh(event: any) {
    await this.cargarUmas();
    event.target.complete();
  }

  /**
   * Carga asíncrona de la lista de Uma Musume utilizando Axios y ChangeDetectorRef
   */
  async cargarUmas() {
    this.cargando = true;
    this.errorMensaje = null;
    this.cdr.detectChanges(); // Refresca UI para mostrar el spinner

    try {
      this.umas = await this.umaService.getUmas();
    } catch (error) {
      console.error('Error al conectar con la API de PHP/MySQL:', error);
      this.errorMensaje = 'No se pudo conectar con el servidor backend. Revisa si XAMPP / Apache está activo.';
    } finally {
      this.cargando = false;
      // Axios opera fuera del NgZone de Angular. Es necesario llamar a detectChanges()
      // en el bloque finally para asegurar que el spinner se oculte y los datos se rendericen de inmediato.
      this.cdr.detectChanges();
    }
  }

  /**
   * Genera la representación en estrellas según la rareza de la Uma Musume
   */
  getRarityStars(rarity: number): string {
    return '★'.repeat(rarity);
  }

  /**
   * Retorna el color del ion-badge de Ionic según el rango de aptitud
   */
  getAptitudeColor(rank: string): string {
    if (!rank) return 'medium';
    switch (rank.toUpperCase()) {
      case 'S':
      case 'A':
        return 'success';
      case 'B':
      case 'C':
        return 'warning';
      case 'D':
      case 'E':
        return 'tertiary';
      default:
        return 'medium';
    }
  }
}
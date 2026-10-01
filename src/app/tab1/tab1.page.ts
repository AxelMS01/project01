import { Component, OnInit, OnDestroy, ChangeDetectorRef, inject } from '@angular/core';
import { ImageCacheService } from '../services/image-cache.service';
import { ToastController } from '@ionic/angular';
import { dataErrorMessage } from '../services/data-error';
import { UmaService } from '../services/uma.service';
import { AuthService } from '../services/auth.service';
import { Uma, UmaStats } from '../models/uma.model';
import { flash, heart, barbell, flame, school } from 'ionicons/icons';

type UmaCard = Uma & { statMode: 'base' | 'max' };

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
  standalone: false,
})
export class Tab1Page implements OnInit, OnDestroy {
  readonly imageCache = inject(ImageCacheService);
  imageStatus: string | null = null;
  readonly statDefinitions: { key: keyof UmaStats; label: string; icon: string }[] = [
    { key: 'speed', label: 'Speed', icon: flash },
    { key: 'stamina', label: 'Stamina', icon: heart },
    { key: 'power', label: 'Power', icon: barbell },
    { key: 'guts', label: 'Guts', icon: flame },
    { key: 'wit', label: 'Wit', icon: school }
  ];
  umas: UmaCard[] = [];
  cargando: boolean = true;
  isOffline: boolean = false;
  showOfflineBanner: boolean = false;
  cacheTime: string | null = null;
  errorMensaje: string | null = null;
  statusMessage: string | null = null;
  private loadingRequest = false;
  private destroyed = false;

  // Listener para detectar cuando el dispositivo se vuelve a conectar a la red o cable
  private onlineListener = () => {
    console.log('Reconexión detectada. Sincronizando datos automáticamente...');
    this.cargarUmas(false, true);
  };

  constructor(
    private umaService: UmaService,
    public authService: AuthService,
    private toastCtrl: ToastController,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit() {
    window.addEventListener('online', this.onlineListener);
    await this.cargarUmas();
  }

  ngOnDestroy() {
    window.removeEventListener('online', this.onlineListener);
    this.destroyed = true;
  }

  /**
   * Evento para refrescar la lista con pull-to-refresh
   */
  async doRefresh(event: any) {
    await this.cargarUmas(true);
    event.target.complete();
  }

  /**
   * Carga de datos con sincronización y fallback offline automático
   */
  async cargarUmas(isManualRefresh = false, isAutoSync = false) {
    if (this.loadingRequest) return;
    this.loadingRequest = true;
    this.cargando = true;
    this.errorMensaje = null;
    this.imageStatus = null;
    this.cdr.detectChanges();

    try {
      // UmaService resuelve el GET /backend/api.php o recupera la copia local.
      const result = await this.umaService.getUmas();
      if (this.destroyed) return;
      // PHP envía rarity; se normaliza para el botón rareza_base★ de cada tarjeta.
      // Cada carga empieza en la rareza inicial, incluso después de actualizar.
      this.umas = result.data.map(uma => ({
        ...uma,
        rareza_base: uma.rareza_base ?? uma.rarity,
        statMode: 'base'
      }));
      this.isOffline = result.fromCache;
      this.cacheTime = result.timestamp || null;

      this.showOfflineBanner = result.fromCache;
      this.statusMessage = result.warning || null;
      this.imageStatus = result.imageStatus || null;

      if (!result.fromCache && (isManualRefresh || isAutoSync)) {
        const toast = await this.toastCtrl.create({
          message: isAutoSync ? '✅ Conexión recuperada: Datos sincronizados.' : '✅ Datos actualizados con el servidor.',
          duration: 2500,
          position: 'top',
          color: 'success'
        });
        await toast.present();
      } else if (result.fromCache && isManualRefresh) {
        const toast = await this.toastCtrl.create({
          message: 'No se pudo actualizar. Mostrando la última copia guardada.',
          duration: 3000,
          position: 'top',
          color: 'warning'
        });
        await toast.present();
      }
    } catch (error) {
      console.error('Error al conectar y no hay caché disponible:', error);
      this.errorMensaje = dataErrorMessage(error);
    } finally {
      this.cargando = false;
      this.loadingRequest = false;
      if (!this.destroyed) this.cdr.detectChanges();
    }
  }

  /**
   * Selección local: cambiar a 5★ no llama a la API ni altera Growth Rates/aptitudes.
   * PHP agrupa base_* en baseStats y max_* en maxStats; también se admiten campos sueltos.
   * null permite mostrar — cuando no hay dato, conservando los ceros válidos.
   */
  getStat(uma: UmaCard, stat: keyof UmaStats): number | null {
    if (uma.statMode === 'max') {
      return uma[`max_${stat}`] ?? uma.maxStats?.[stat] ?? null;
    }
    return uma[`base_${stat}`] ?? uma.baseStats?.[stat] ?? null;
  }

  /**
   * Genera la representación en estrellas según la rareza de la Uma Musume
   */
  onImageError(event: Event) {
    const image = event.target as HTMLImageElement;
    if (!image.src.endsWith('/assets/shapes.svg')) image.src = 'assets/shapes.svg';
  }

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

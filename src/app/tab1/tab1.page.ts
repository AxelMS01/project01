import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { ToastController } from '@ionic/angular';
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
  private offlineTimer: any = null;

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
    if (this.offlineTimer) {
      clearTimeout(this.offlineTimer);
    }
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
    this.cargando = true;
    this.errorMensaje = null;
    this.cdr.detectChanges();

    try {
      // UmaService resuelve el GET /backend/api.php o recupera la copia local.
      const result = await this.umaService.getUmas();
      // PHP envía rarity; se normaliza para el botón rareza_base★ de cada tarjeta.
      // Cada carga empieza en la rareza inicial, incluso después de actualizar.
      this.umas = result.data.map(uma => ({
        ...uma,
        rareza_base: uma.rareza_base ?? uma.rarity,
        statMode: 'base'
      }));
      this.isOffline = result.fromCache;
      this.cacheTime = result.timestamp || null;

      if (this.isOffline) {
        // Mostrar aviso temporal y ocultarlo automáticamente después de 4.5 segundos
        this.showOfflineBanner = true;
        if (this.offlineTimer) clearTimeout(this.offlineTimer);
        this.offlineTimer = setTimeout(() => {
          this.showOfflineBanner = false;
          this.cdr.detectChanges();
        }, 4500);
      } else {
        this.showOfflineBanner = false;
      }

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
          message: '📱 Sigues sin conexión. Mostrando datos guardados en el teléfono.',
          duration: 3000,
          position: 'top',
          color: 'warning'
        });
        await toast.present();
      }
    } catch (error) {
      console.error('Error al conectar y no hay caché disponible:', error);
      this.errorMensaje = 'No se pudo conectar con el servidor y no hay datos guardados en el teléfono. Conéctate a la red para descargar los datos por primera vez.';
    } finally {
      this.cargando = false;
      this.cdr.detectChanges();
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

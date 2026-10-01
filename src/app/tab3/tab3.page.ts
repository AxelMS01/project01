import { Component, OnInit } from '@angular/core';
import { AlertController, ToastController } from '@ionic/angular';
import { AuthService, User } from '../services/auth.service';
import { ImageCacheService } from '../services/image-cache.service';

@Component({
  selector: 'app-tab3',
  templateUrl: 'tab3.page.html',
  styleUrls: ['tab3.page.scss'],
  standalone: false,
})
export class Tab3Page implements OnInit {
  user: User | null = null;

  constructor(
    public authService: AuthService,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
    private imageCache: ImageCacheService
  ) {}

  ngOnInit() {
    this.loadUser();
  }

  ionViewWillEnter() {
    this.loadUser();
  }

  loadUser() {
    this.user = this.authService.getCurrentUser();
  }

  /**
   * MODIFICACIÓN: Permite editar el nombre del usuario y persistirlo en el dispositivo
   */
  async editProfile() {
    const alert = await this.alertCtrl.create({
      header: 'Modificar Perfil',
      message: 'Ingresa tu nuevo nombre para actualizar la información persistente:',
      inputs: [
        {
          name: 'name',
          type: 'text',
          placeholder: 'Nombre completo',
          value: this.user?.name || ''
        }
      ],
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Guardar Cambios',
          handler: (data) => {
            if (data.name && data.name.trim()) {
              this.updateUserName(data.name.trim());
            }
          }
        }
      ]
    });

    await alert.present();
  }

  async updateUserName(newName: string) {
    if (!this.user) return;
    this.user.name = newName;
    // Guardado persistente en el almacenamiento local del teléfono
    localStorage.setItem('currentUser', JSON.stringify(this.user));

    const toast = await this.toastCtrl.create({
      message: '✅ Información modificada y guardada persistentemente.',
      duration: 2500,
      position: 'bottom',
      color: 'success'
    });
    await toast.present();
  }

  /**
   * ELIMINACIÓN: Permite eliminar la memoria caché offline del dispositivo
   */
  async clearOfflineCache() {
    const alert = await this.alertCtrl.create({
      header: 'Limpiar Caché Offline',
      message: '¿Deseas eliminar el catálogo y las imágenes guardadas para usarlos sin conexión?',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: async () => {
            try {
              await this.imageCache.clear();
            } catch {
              const errorToast = await this.toastCtrl.create({
                message: 'No se pudieron eliminar las imágenes guardadas. Intenta de nuevo.',
                duration: 3000, color: 'warning'
              });
              await errorToast.present();
              return false;
            }
            localStorage.removeItem('offline_cached_umas');
            localStorage.removeItem('offline_cached_umas_timestamp');
            const toast = await this.toastCtrl.create({
              message: '🗑️ Datos de caché local eliminados correctamente.',
              duration: 2000,
              position: 'bottom',
              color: 'dark'
            });
            await toast.present();
            return true;
          }
        }
      ]
    });
    await alert.present();
  }
}

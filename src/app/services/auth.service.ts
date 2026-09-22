import { Injectable } from '@angular/core';
import { NavController, AlertController, ToastController } from '@ionic/angular';

export interface User {
  id: number;
  name: string;
  email: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  constructor(
    private navCtrl: NavController,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController
  ) {}

  /**
   * Retorna los datos del usuario logueado actualmente desde localStorage
   */
  getCurrentUser(): User | null {
    const userStr = localStorage.getItem('currentUser');
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch (e) {
        return null;
      }
    }
    return null;
  }

  /**
   * Muestra un diálogo de confirmación antes de cerrar sesión
   */
  async confirmLogout() {
    const alert = await this.alertCtrl.create({
      header: 'Cerrar Sesión',
      message: '¿Estás seguro de que deseas salir de tu cuenta?',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Cerrar Sesión',
          role: 'destructive',
          handler: () => {
            this.logout();
          }
        }
      ]
    });

    await alert.present();
  }

  /**
   * Elimina la sesión local, muestra feedback y redirige a /login
   */
  async logout() {
    localStorage.removeItem('currentUser');
    const toast = await this.toastCtrl.create({
      message: 'Sesión cerrada exitosamente.',
      duration: 2000,
      position: 'bottom',
      color: 'dark'
    });
    await toast.present();
    this.navCtrl.navigateRoot('/login');
  }
}

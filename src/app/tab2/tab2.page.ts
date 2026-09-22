import { Component, OnInit, OnDestroy } from '@angular/core';
import { ToastController } from '@ionic/angular';
import { AuthService } from '../services/auth.service';
import { getApiBaseUrl } from '../services/api.config';
import axios from 'axios';

@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss'],
  standalone: false,
})
export class Tab2Page implements OnInit, OnDestroy {
  contactData = {
    nombre: '',
    apellido: '',
    email: '',
    mensaje: ''
  };

  isLoading = false;
  private readonly PENDING_KEY = 'offline_pending_contact_messages';

  get apiUrl(): string {
    return `${getApiBaseUrl()}/formulario-contacto.php`;
  }

  private onlineListener = () => {
    this.syncPendingMessages();
  };

  constructor(
    private toastCtrl: ToastController,
    public authService: AuthService
  ) {}

  ngOnInit() {
    window.addEventListener('online', this.onlineListener);
    // Intentar sincronizar si quedaron mensajes pendientes de una sesión anterior
    this.syncPendingMessages();
  }

  ngOnDestroy() {
    window.removeEventListener('online', this.onlineListener);
  }

  async onSubmit() {
    if (!this.contactData.nombre || !this.contactData.apellido || !this.contactData.email || !this.contactData.mensaje) {
      this.presentToast('Por favor completa todos los campos del formulario.', 'warning');
      return;
    }

    this.isLoading = true;

    try {
      const response = await axios.post(this.apiUrl, this.contactData, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 6000
      });

      this.isLoading = false;

      if (response.data && response.data.status === 'success') {
        this.presentToast(response.data.message || 'Mensaje enviado exitosamente.', 'success');
        this.resetForm();
      } else {
        this.presentToast(response.data.message || 'Error al enviar el mensaje.', 'danger');
      }
    } catch (error: any) {
      this.isLoading = false;
      console.warn('Fallo de red al enviar formulario. Guardando en cola offline...', error);
      
      // Guardar en cola de salida offline
      this.saveToOfflineQueue({ ...this.contactData, date: new Date().toLocaleString() });
      this.resetForm();
      
      this.presentToast(
        '📱 Estás sin conexión. Tu mensaje se guardó en el teléfono y se enviará automáticamente al reconectarte.',
        'warning'
      );
    }
  }

  private saveToOfflineQueue(msg: any): void {
    try {
      const queue = this.getOfflineQueue();
      queue.push(msg);
      localStorage.setItem(this.PENDING_KEY, JSON.stringify(queue));
    } catch (e) {
      console.error('Error al guardar mensaje offline:', e);
    }
  }

  private getOfflineQueue(): any[] {
    try {
      const raw = localStorage.getItem(this.PENDING_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  /**
   * Sincroniza automáticamente los mensajes guardados offline cuando vuelve la red
   */
  async syncPendingMessages() {
    const queue = this.getOfflineQueue();
    if (queue.length === 0) return;

    console.log(`Sincronizando ${queue.length} mensaje(s) pendiente(s)...`);
    const remaining: any[] = [];

    for (const msg of queue) {
      try {
        await axios.post(this.apiUrl, msg, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 6000
        });
      } catch (err) {
        remaining.push(msg);
      }
    }

    localStorage.setItem(this.PENDING_KEY, JSON.stringify(remaining));

    if (remaining.length === 0) {
      this.presentToast('✅ Mensajes guardados offline sincronizados con el servidor.', 'success');
    }
  }

  resetForm() {
    this.contactData = {
      nombre: '',
      apellido: '',
      email: '',
      mensaje: ''
    };
  }

  async presentToast(message: string, color: string = 'dark') {
    const toast = await this.toastCtrl.create({
      message: message,
      duration: 3500,
      color: color,
      position: 'bottom'
    });
    toast.present();
  }
}

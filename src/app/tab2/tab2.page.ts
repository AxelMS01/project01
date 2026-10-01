import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { ToastController } from '@ionic/angular';
import { AuthService } from '../services/auth.service';
import { ConnectionService } from '../services/connection.service';
import { DataError, dataErrorMessage } from '../services/data-error';
import { getApiBaseUrl } from '../services/api.config';
import axios from 'axios';

interface ContactMessage {
  nombre: string;
  apellido: string;
  email: string;
  mensaje: string;
  date?: string;
  needsReview?: boolean;
}

@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss'],
  standalone: false,
})
export class Tab2Page implements OnInit, OnDestroy {
  contactData: ContactMessage = { nombre: '', apellido: '', email: '', mensaje: '' };
  isLoading = false;
  pendingCount = 0;
  statusMessage = '';
  private destroyed = false;
  private readonly PENDING_KEY = 'offline_pending_contact_messages';

  get apiUrl(): string { return `${getApiBaseUrl()}/formulario-contacto.php`; }
  private readonly onlineListener = () => { void this.syncPendingMessages(); };

  constructor(
    private toastCtrl: ToastController,
    public authService: AuthService,
    public connection: ConnectionService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    window.addEventListener('online', this.onlineListener);
    void this.syncPendingMessages();
  }

  ngOnDestroy() {
    this.destroyed = true;
    window.removeEventListener('online', this.onlineListener);
  }

  async onSubmit() {
    if (this.isLoading) return;
    const message = { ...this.contactData };
    if (![message.nombre, message.apellido, message.email, message.mensaje].every(value => value.trim()) ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(message.email)) {
      await this.presentToast('Completa todos los campos e ingresa un correo válido.', 'warning');
      return;
    }
    this.isLoading = true;
    try {
      if (!this.connection.online()) {
        const queue = this.getOfflineQueue();
        queue.push({ ...message, date: new Date().toISOString() });
        this.saveQueue(queue); // Si falla, no se borra el formulario.
        this.resetForm();
        this.statusMessage = 'Mensaje guardado en este dispositivo. Se intentará enviar al recuperar la conexión y abrir Contacto.';
        await this.presentToast(this.statusMessage, 'warning');
      } else {
        await this.send(message);
        this.resetForm();
        this.statusMessage = 'Mensaje enviado correctamente.';
        await this.presentToast(this.statusMessage, 'success');
      }
    } catch (error) {
      this.statusMessage = `${dataErrorMessage(error)} El formulario se conserva. Si no recibiste confirmación, verifica el envío antes de reintentarlo.`;
      await this.presentToast(this.statusMessage, 'danger');
    } finally {
      this.isLoading = false;
      if (!this.destroyed) this.cdr.detectChanges();
    }
  }

  private async send(message: ContactMessage) {
    const { nombre, apellido, email, mensaje } = message;
    const response = await axios.post(this.apiUrl, { nombre, apellido, email, mensaje }, { timeout: 6000 });
    if (response.data?.status !== 'success') {
      throw new DataError('El servidor no confirmó el envío del mensaje.');
    }
  }

  private getOfflineQueue(): ContactMessage[] {
    try {
      const raw = localStorage.getItem(this.PENDING_KEY);
      const queue: unknown = raw === null ? [] : JSON.parse(raw);
      if (!Array.isArray(queue) || !queue.every(msg => msg &&
        ['nombre', 'apellido', 'email', 'mensaje'].every(key => typeof msg[key] === 'string'))) throw new Error();
      this.pendingCount = queue.length;
      return queue;
    } catch {
      throw new DataError('No se pudieron leer los mensajes guardados. No se modificó el almacenamiento.');
    }
  }

  private saveQueue(queue: ContactMessage[]) {
    try {
      localStorage.setItem(this.PENDING_KEY, JSON.stringify(queue));
      this.pendingCount = queue.length;
    } catch {
      throw new DataError('No se pudo guardar el mensaje en este dispositivo. Revisa el espacio o los permisos de almacenamiento.');
    }
  }

  /** Solo confirma y elimina mensajes tras status=success. No hay envíos simultáneos. */
  async syncPendingMessages(manual = false) {
    if (this.isLoading) return;
    this.isLoading = true;
    try {
      const queue = this.getOfflineQueue();
      if (!queue.length) return;
      if (!this.connection.online()) {
        this.statusMessage = 'Hay mensajes guardados pendientes de conexión.';
        return;
      }
      while (queue.length) {
        if (!this.connection.online()) break;
        if (queue[0].needsReview && !manual) {
          this.statusMessage = 'Un envío quedó sin confirmar. Verifica si llegó antes de pulsar Reintentar pendientes; podría duplicarse.';
          return;
        }
        // Se persiste antes del POST: si la app se cierra o se pierde la respuesta,
        // el próximo inicio no repite automáticamente una escritura ambigua.
        queue[0].needsReview = true;
        this.saveQueue(queue);
        await this.send(queue[0]);
        queue.shift();
        this.saveQueue(queue);
      }
      this.statusMessage = queue.length ? 'Sin conexión. Se conservan los mensajes pendientes.' : 'Todos los mensajes pendientes se enviaron correctamente.';
    } catch (error) {
      this.statusMessage = `${dataErrorMessage(error)} Se conservan los pendientes. Verifica si el mensaje llegó antes de reintentar; podría duplicarse.`;
    } finally {
      this.isLoading = false;
      if (!this.destroyed) this.cdr.detectChanges();
    }
  }

  resetForm() { this.contactData = { nombre: '', apellido: '', email: '', mensaje: '' }; }

  async presentToast(message: string, color = 'dark') {
    const toast = await this.toastCtrl.create({ message, duration: 3500, color, position: 'bottom' });
    await toast.present();
  }
}

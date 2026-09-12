import { Component } from '@angular/core';
import { ToastController } from '@ionic/angular';
import axios from 'axios';

@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss'],
  standalone: false,
})
export class Tab2Page {
  contactData = {
    nombre: '',
    apellido: '',
    email: '',
    mensaje: ''
  };

  isLoading = false;
  private apiUrl = 'http://localhost:8088/backend/formulario-contacto.php';

  constructor(private toastCtrl: ToastController) {}

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
        }
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
      console.error('Error al enviar el formulario de contacto:', error);
      let errorMsg = 'No se pudo conectar con el servidor backend.';
      if (error.response && error.response.data && error.response.data.message) {
        errorMsg = error.response.data.message;
      }
      this.presentToast(errorMsg, 'danger');
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
      duration: 3000,
      color: color,
      position: 'bottom'
    });
    toast.present();
  }
}

import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { NavController } from '@ionic/angular';
import { getApiBaseUrl } from '../services/api.config';
import axios from 'axios';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: false,
})
export class LoginPage implements OnInit {
  isSignUpMode = false;
  isLoading = false;
  errorMessage = '';
  successMessage = '';

  // URL compartida en api.config.ts; actualmente http://localhost:8088/backend.
  get apiUrl(): string {
    return getApiBaseUrl();
  }

  signInData = {
    email: '',
    password: ''
  };

  signUpData = {
    name: '',
    email: '',
    password: ''
  };

  constructor(
    private navCtrl: NavController,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit() { }

  ionViewWillEnter() {
    // Limpiar estados y formularios al entrar a la pantalla de Login
    this.isLoading = false;
    this.errorMessage = '';
    this.successMessage = '';
    this.resetForms();

    // Si ya existe una sesión activa, redirigir automáticamente al tab1
    const currentUser = localStorage.getItem('currentUser');
    if (currentUser) {
      this.navCtrl.navigateRoot('/tabs/tab1');
    }
  }

  toggleMode(signUpState?: boolean) {
    this.errorMessage = '';
    this.successMessage = '';
    if (signUpState !== undefined) {
      this.isSignUpMode = signUpState;
    } else {
      this.isSignUpMode = !this.isSignUpMode;
    }
    this.resetForms();
  }

  resetForms() {
    this.signInData = {
      email: '',
      password: ''
    };
    this.signUpData = {
      name: '',
      email: '',
      password: ''
    };
  }

  /**
   * POST /login.php con { email, password } en JSON y timeout de 10 s.
   * La respuesta usa user (no data): { status, message, user: { id, name, email } }.
   * Los errores HTTP de Axios se consultan en error.response.data.message.
   */
  async onSignIn() {
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.signInData.email || !this.signInData.password) {
      this.errorMessage = 'Por favor ingresa correo y contraseña.';
      this.cdr.detectChanges();
      return;
    }

    this.isLoading = true;
    this.cdr.detectChanges();

    try {
      const response = await axios.post(`${this.apiUrl}/login.php`, this.signInData, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });
      const data = response.data;

      if (data && data.status === 'success') {
        // Guardar el usuario para la navegación local; PHP no devuelve un token de sesión.
        localStorage.setItem('currentUser', JSON.stringify(data.user));
        this.successMessage = data.message || 'Inicio de sesión correcto.';
        this.cdr.detectChanges();
        setTimeout(() => {
          this.navCtrl.navigateRoot('/tabs/tab1');
        }, 500);
      } else {
        this.errorMessage = (data && data.message) ? data.message : 'Credenciales inválidas.';
        this.cdr.detectChanges();
      }
    } catch (error: any) {
      console.error('Error al conectar con la API de PHP vía Axios:', error);
      if (error.code === 'ECONNABORTED') {
        this.errorMessage = 'Tiempo de espera agotado (10s). Revisa si Apache y la IP son alcanzables.';
      } else if (error.response && error.response.data && error.response.data.message) {
        this.errorMessage = error.response.data.message;
      } else if (error.message) {
        this.errorMessage = `Error de conexión: ${error.message}. Verifica que el teléfono y la PC compartan Wi-Fi y Apache esté en puerto 8088.`;
      } else {
        this.errorMessage = 'No se pudo conectar con el servidor PHP (XAMPP).';
      }
      this.cdr.detectChanges();
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  /**
   * POST /signup.php con { name, email, password }, JSON y timeout de 10 s.
   * Un 201 con status=success vuelve al login y conserva el correo introducido.
   * PHP responde 400 por validación o 409 si el correo ya está registrado.
   */
  async onSignUp() {
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.signUpData.name || !this.signUpData.email || !this.signUpData.password) {
      this.errorMessage = 'Por favor completa todos los campos para el registro.';
      this.cdr.detectChanges();
      return;
    }

    this.isLoading = true;
    this.cdr.detectChanges();

    try {
      const response = await axios.post(`${this.apiUrl}/signup.php`, this.signUpData, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });
      const data = response.data;

      if (data && data.status === 'success') {
        this.successMessage = data.message || '¡Registro exitoso! Por favor inicia sesión.';
        const registeredEmail = this.signUpData.email;
        this.cdr.detectChanges();
        // Cambiar a vista de inicio de sesión automáticamente y auto-llenar el correo
        setTimeout(() => {
          this.toggleMode(false);
          this.signInData.email = registeredEmail;
          this.cdr.detectChanges();
        }, 1200);
      } else {
        this.errorMessage = (data && data.message) ? data.message : 'Error al registrar el usuario.';
        this.cdr.detectChanges();
      }
    } catch (error: any) {
      console.error('Error al registrar usuario vía Axios:', error);
      if (error.code === 'ECONNABORTED') {
        this.errorMessage = 'Tiempo de espera agotado (10s). Revisa si la IP de tu PC y Apache están activos.';
      } else if (error.response && error.response.data && error.response.data.message) {
        this.errorMessage = error.response.data.message;
      } else if (error.message) {
        this.errorMessage = `Error: ${error.message}. Verifica que el teléfono y PC estén en el mismo Wi-Fi y Apache en 8088.`;
      } else {
        this.errorMessage = 'Error al registrar usuario. Verifica la conexión con el servidor.';
      }
      this.cdr.detectChanges();
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }
}

import { Component, OnInit } from '@angular/core';
import { NavController } from '@ionic/angular';
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

  // Base URL for the PHP API running in XAMPP (Apache is on Port 8088)
  private apiUrl = 'http://localhost:8088/backend';

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
    private navCtrl: NavController
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

  async onSignIn() {
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.signInData.email || !this.signInData.password) {
      this.errorMessage = 'Por favor ingresa correo y contraseña.';
      return;
    }

    this.isLoading = true;

    try {
      const response = await axios.post(`${this.apiUrl}/login.php`, this.signInData, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      const data = response.data;
      this.isLoading = false;

      if (data && data.status === 'success') {
        // Guardar la información del usuario localmente
        localStorage.setItem('currentUser', JSON.stringify(data.user));
        this.successMessage = data.message || 'Inicio de sesión correcto.';
        setTimeout(() => {
          this.navCtrl.navigateRoot('/tabs/tab1');
        }, 500);
      } else {
        this.errorMessage = (data && data.message) ? data.message : 'Credenciales inválidas.';
      }
    } catch (error: any) {
      this.isLoading = false;
      console.error('Error al conectar con la API de PHP vía Axios:', error);
      if (error.response && error.response.data && error.response.data.message) {
        this.errorMessage = error.response.data.message;
      } else {
        this.errorMessage = 'No se pudo conectar con el servidor PHP (XAMPP). Verifica que Apache/MySQL estén activos y la URL sea correcta.';
      }
    }
  }

  async onSignUp() {
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.signUpData.name || !this.signUpData.email || !this.signUpData.password) {
      this.errorMessage = 'Por favor completa todos los campos para el registro.';
      return;
    }

    this.isLoading = true;

    try {
      const response = await axios.post(`${this.apiUrl}/signup.php`, this.signUpData, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      const data = response.data;
      this.isLoading = false;

      if (data && data.status === 'success') {
        this.successMessage = data.message || '¡Registro exitoso! Por favor inicia sesión.';
        // Cambiar a vista de inicio de sesión automáticamente
        setTimeout(() => {
          this.toggleMode(false);
        }, 1500);
      } else {
        this.errorMessage = (data && data.message) ? data.message : 'Error al registrar el usuario.';
      }
    } catch (error: any) {
      this.isLoading = false;
      console.error('Error al registrar usuario vía Axios:', error);
      if (error.response && error.response.data && error.response.data.message) {
        this.errorMessage = error.response.data.message;
      } else {
        this.errorMessage = 'Error al registrar usuario. Verifica la conexión con XAMPP.';
      }
    }
  }
}

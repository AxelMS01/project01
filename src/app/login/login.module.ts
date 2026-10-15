import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonContent, IonIcon, IonSpinner } from '@ionic/angular';
import { LoginPageRoutingModule } from './login-routing.module';
import { LoginPage } from './login.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonContent, IonIcon, IonSpinner,
    LoginPageRoutingModule
  ],
  declarations: [LoginPage],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class LoginPageModule {}

import { ChangeDetectorRef } from '@angular/core';
import { NavController } from '@ionic/angular';
import { vi } from 'vitest';
import axios from 'axios';
import { LoginPage } from './login.page';
import { ConnectionService } from '../services/connection.service';

describe('Acceso sin conexión', () => {
  it('conserva los datos y evita peticiones de login y registro sin red', async () => {
    const connection = new ConnectionService();
    connection.online.set(false);
    const post = vi.spyOn(axios, 'post');
    const page = new LoginPage({} as NavController, { detectChanges: vi.fn() } as unknown as ChangeDetectorRef, connection);
    page.signInData = { email: 'ana@example.com', password: 'ejemplo' };
    page.signUpData = { name: 'Ana', ...page.signInData };
    try {
      await page.onSignIn();
      expect(page.errorMessage).toContain('Necesitas conexión');
      await page.onSignUp();
      expect(page.errorMessage).toContain('Necesitas conexión');
      expect(page.signInData.email).toBe('ana@example.com');
      expect(page.signUpData.name).toBe('Ana');
      expect(post).not.toHaveBeenCalled();
    } finally {
      connection.ngOnDestroy();
      vi.restoreAllMocks();
    }
  });
});

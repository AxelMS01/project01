import { Capacitor } from '@capacitor/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { environment } from '../../environments/environment';
import { getImageDownloadUrl } from './api.config';

describe('URL de descarga de imágenes', () => {
  const source = 'http://localhost:8088/backend/public/images/oguri_cap.png?v=2';

  const production = environment.production;
  beforeEach(() => { environment.production = false; });
  afterEach(() => {
    environment.production = production;
    vi.restoreAllMocks();
  });

  it('usa el origen web actual para las imágenes del backend en desarrollo', () => {
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(false);
    expect(getImageDownloadUrl(source)).toBe(`${window.location.origin}/backend/public/images/oguri_cap.png?v=2`);
  });

  it('mantiene la URL original en Android', () => {
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
    expect(getImageDownloadUrl(source)).toBe(source);
  });

  it('no utiliza el proxy de desarrollo en producción', () => {
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(false);
    environment.production = true;
    expect(getImageDownloadUrl(source)).toBe(source);
  });

  it('no redirige otros servidores, endpoints ni imágenes locales', () => {
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(false);
    for (const url of ['https://images.example.test/image.png', 'http://localhost:8088/backend/api.php', 'assets/shapes.svg', 'data:image/png;base64,AA==']) {
      expect(getImageDownloadUrl(url)).toBe(url);
    }
  });
});

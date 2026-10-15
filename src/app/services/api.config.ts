import { Capacitor } from '@capacitor/core';
import { environment } from '../../environments/environment';

// Puerto HTTP de Apache, distinto al puerto 3307 de MySQL configurado en PHP.
export const SERVER_PORT = '8088';

/**
 * URL base compartida por UmaService, LoginPage y Tab2Page (ver docs/API.md).
 * Las pantallas añaden /api.php, /login.php, /signup.php o /formulario-contacto.php.
 * Actualmente la URL es la misma en todas las plataformas.
 * Con 'adb reverse tcp:8088 tcp:8088', el teléfono redirige http://localhost:8088
 * directamente a la computadora a través del cable USB, evitando problemas de firewall
 * y aislamiento de routers Wi-Fi.
 */
export function getApiBaseUrl(): string {
  return `http://localhost:${SERVER_PORT}/backend`;
}

/** Proxy local solo para descargar imágenes en el servidor de desarrollo web. */
export function getImageDownloadUrl(source: string): string {
  if (Capacitor.isNativePlatform() || environment.production) return source;
  try {
    const url = new URL(source);
    const backend = new URL(getApiBaseUrl());
    if (url.origin === backend.origin && url.pathname.startsWith(`${backend.pathname}/public/images/`)) {
      return new URL(url.pathname + url.search, window.location.origin).href;
    }
  } catch {
    // URLs relativas o no HTTP conservan el comportamiento anterior.
  }
  return source;
}

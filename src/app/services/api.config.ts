import { Capacitor } from '@capacitor/core';

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

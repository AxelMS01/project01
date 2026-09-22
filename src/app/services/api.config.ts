import { Capacitor } from '@capacitor/core';

export const SERVER_PORT = '8088';

/**
 * Con 'adb reverse tcp:8088 tcp:8088', el teléfono redirige http://localhost:8088
 * directamente a la computadora a través del cable USB, evitando problemas de firewall
 * y aislamiento de routers Wi-Fi.
 */
export function getApiBaseUrl(): string {
  return `http://localhost:${SERVER_PORT}/backend`;
}

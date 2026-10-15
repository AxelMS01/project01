import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './e2e', workers: 1, timeout: 60000,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL: 'http://127.0.0.1:4205', viewport: { width: 1280, height: 900 } },
  webServer: [
    { command: 'php -S 127.0.0.1:8089 -t .', url: 'http://127.0.0.1:8089/backend/formulario-contacto.php', reuseExistingServer: true },
    { command: 'node scripts/serve-evidence.cjs', url: 'http://127.0.0.1:4205', reuseExistingServer: true }
  ]
});

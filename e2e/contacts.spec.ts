import { test, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
test('API valida datos, métodos, IDs y preflight', async ({ request }) => {
  const api = 'http://127.0.0.1:8089/backend/formulario-contacto.php';
  expect((await request.post(api, { data: { nombre: 'Demo' } })).status()).toBe(400);
  expect((await request.post(api, { data: { nombre: 'Demo', apellido: 'REST', email: 'inválido', mensaje: 'Prueba' } })).status()).toBe(400);
  expect((await request.put(api, { data: {} })).status()).toBe(400);
  expect((await request.get(`${api}?id=-1`)).status()).toBe(400);
  expect((await request.put(`${api}?id=2147483647`, { data: { nombre: 'Demo', apellido: 'REST', email: 'demo@example.com', mensaje: 'Prueba' } })).status()).toBe(404);
  expect((await request.patch(api, { data: {} })).status()).toBe(405);
  const options = await request.fetch(api, { method: 'OPTIONS' });
  expect(options.status()).toBe(200);
  expect(options.headers()['access-control-allow-methods']).toContain('PUT');
  expect(options.headers()['access-control-allow-methods']).toContain('DELETE');
});
test('CRUD real y estados de carga y error', async ({ page, request }) => {
  const folder = 'docs/evidencias-rest';
  mkdirSync(folder, { recursive: true });
  const api = 'http://127.0.0.1:8089/backend/formulario-contacto.php';
  const network: { method: string; status: number }[] = [];
  // Cambia solo el puerto de destino para probar el código del workspace,
  // sin reemplazar la copia instalada en Apache. No simula respuestas exitosas.
  await page.route('**/backend/formulario-contacto.php*', async route => {
    const url = new URL(route.request().url());
    await route.continue({ url: api + url.search });
  });
  page.on('response', response => {
    if (response.url().includes('formulario-contacto.php')) network.push({ method: response.request().method(), status: response.status() });
  });
  await page.goto('/contactos');
  await expect(page.getByText('GET · Lista actualizada:', { exact: false })).toBeVisible();
  await page.screenshot({ path: `${folder}/01-get.png`, fullPage: true });
  await page.getByLabel('Nombre', { exact: true }).fill('Demo');
  await page.getByLabel('Apellido', { exact: true }).fill('REST');
  await page.getByLabel('Correo electrónico', { exact: true }).fill('demo@example.com');
  const marker = `Prueba REST ${Date.now()}`;
  await page.getByLabel('Mensaje', { exact: true }).fill(marker);
  let id: string | undefined;
  try {
    const created = page.waitForResponse(r => r.url().includes('formulario-contacto.php') && r.request().method() === 'POST');
    await page.getByRole('button', { name: 'Crear mensaje', exact: true }).click();
    const response = await created;
    expect(response.status()).toBe(201);
    id = String((await response.json()).id);
    await expect(page.getByText(`POST · 201 · Mensaje #${id} creado.`)).toBeVisible();
    await page.screenshot({ path: `${folder}/02-post.png`, fullPage: true });
    const card = page.locator('article').filter({ hasText: marker });
    await card.getByRole('button', { name: 'Editar', exact: true }).click();
    await expect(page.locator('ion-textarea textarea')).toHaveValue(marker);
    await page.locator('ion-textarea textarea').fill(`${marker} actualizado`);
    await page.getByRole('button', { name: 'Guardar cambios' }).click();
    await expect(page.getByText(`PUT · 200 · Mensaje #${id} actualizado.`)).toBeVisible();
    const persisted = await request.get(`${api}?id=${id}`);
    expect((await persisted.json()).data.mensaje).toBe(`${marker} actualizado`);
    await page.screenshot({ path: `${folder}/03-put.png`, fullPage: true });
    await card.getByRole('button', { name: 'Eliminar', exact: true }).click();
    await expect(page.getByRole('alertdialog')).toBeVisible();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Eliminar', exact: true }).click();
    await expect(page.getByText(`DELETE · 200 · Mensaje #${id} eliminado.`)).toBeVisible();
    expect((await request.get(`${api}?id=${id}`)).status()).toBe(404);
    await page.screenshot({ path: `${folder}/04-delete.png`, fullPage: true });
  } finally {
    // Solo se limpia el mensaje ficticio creado por esta misma prueba.
    if (id) await request.delete(`${api}?id=${id}`);
  }
  await page.route('**/backend/formulario-contacto.php*', async route => {
    await new Promise(resolve => setTimeout(resolve, 1500));
    await route.abort('failed');
  });
  await page.getByRole('button', { name: 'Actualizar', exact: true }).click();
  await expect(page.getByText('GET · Procesando solicitud…')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Actualizar', exact: true })).toBeDisabled();
  await page.screenshot({ path: `${folder}/05-loading.png`, fullPage: true });
  await expect(page.getByRole('alert')).toContainText('No se pudo conectar');
  await page.screenshot({ path: `${folder}/06-error.png`, fullPage: true });
  await page.unroute('**/backend/formulario-contacto.php*');
  await page.route('**/backend/formulario-contacto.php*', route => route.continue({ url: api }));
  await page.getByRole('button', { name: 'Actualizar', exact: true }).click();
  await expect(page.getByText('GET · Lista actualizada:', { exact: false })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: `${folder}/07-movil.png`, fullPage: true });
  writeFileSync(`${folder}/http.json`, JSON.stringify(network, null, 2));
});

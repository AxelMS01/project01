# Conexión Ionic + API REST

La pantalla **Mensajes**, disponible directamente en `/contactos`, administra registros de la tabla MySQL `contactos`. Es una demostración académica local sin autenticación de backend; utilizar datos ficticios. No publicar este endpoint con información personal.

## Entregables

| Requisito | Implementación |
| --- | --- |
| GET | `ContactService.list()` consulta mensajes y permite actualizar la lista. |
| POST | `ContactService.create()` crea un mensaje; HTTP 201. |
| PUT/PATCH | Se implementa PUT: `ContactService.update()` reemplaza los cuatro campos; HTTP 200. |
| DELETE | `ContactService.remove()` elimina después de confirmar; HTTP 200. |
| Servicio Angular | `src/app/services/contact.service.ts`: HttpClient, observables, tipado y timeout de 10 segundos. |
| Respuestas y errores | Contrato JSON validado; mensajes para conexión, timeout, 400, 404 y 500. No se reintentan automáticamente las escrituras. |
| Loading | Spinner, operación en curso, controles deshabilitados y desbloqueo en `finally`. |
| Evidencia | Siete capturas en `docs/evidencias-rest/` y registro de métodos/estados en `http.json`. |
| Git | App completa en la rama `feature/ionic-rest-crud` del repositorio existente, incluyendo el catálogo y modo offline previos. |

## Ejecutar

1. Instalar dependencias con `npm ci` desde la raíz de `project01`.
2. Iniciar MySQL en el puerto **3307** y disponer de la base **app_db** (configuración de `backend/db_config.php`). El endpoint crea la tabla `contactos` si no existe.
3. Servir **esta versión** de `backend/` con Apache/XAMPP en `http://localhost:8088/backend`. Si XAMPP tiene una copia anterior, actualizar los archivos `formulario-contacto.php` y `db_config.php`. Como alternativa, con el puerto 8088 libre, ejecutar desde `project01`: `php -S 127.0.0.1:8088 -t .`.
4. Ejecutar `npm start` y abrir `http://localhost:4200/contactos`.
5. En Android por USB, utilizar `adb reverse tcp:8088 tcp:8088` y recompilar/sincronizar el proyecto Capacitor cuando corresponda.

La URL común está en `src/app/services/api.config.ts`. El frontend y MySQL usan puertos diferentes; Angular solo se comunica con PHP por HTTP.

## Contrato del endpoint

Ruta: `/backend/formulario-contacto.php`.

| Método | Parámetros/cuerpo | Respuesta |
| --- | --- | --- |
| GET | Sin parámetros | 200 `{ status: "success", data: Contact[] }` |
| GET | `?id=123` | 200 con un mensaje; 404 si no existe |
| POST | JSON con `nombre`, `apellido`, `email`, `mensaje` | 201 `{ status, id, data, message }` |
| PUT | `?id=123` y JSON con los cuatro campos | 200 `{ status, id, data, message }` |
| DELETE | `?id=123` | 200 `{ status: "success", data: null, message }` |
| OPTIONS | Preflight | 200 y encabezados CORS con GET, POST, PUT, DELETE |

Se conservan `id` y `message` del POST para no romper el formulario de contacto ni su cola offline. El servidor valida campos, longitudes, email e IDs, utiliza consultas preparadas y devuelve 400/404/405/500 según corresponda. Las operaciones sobre registros existentes utilizan transacciones. PATCH no se necesita porque se eligió PUT.

## Verificación y capturas

```sh
npm run build
node node_modules/@angular/cli/bin/ng.js test --watch=false
npx playwright install chromium
node node_modules/@playwright/test/cli.js test
```

Playwright inicia el frontend compilado en 4205 y PHP en 8089; requiere MySQL activo. Redirige únicamente el destino HTTP del endpoint de contactos desde 8088 a 8089 para probar el backend del workspace sin sustituir la instalación existente en XAMPP. GET, POST, PUT y DELETE usan PHP/MySQL reales. Solo el caso de error de red se provoca artificialmente; se demora 1,5 segundos para capturar el indicador de carga y luego se corta esa solicitud. La prueba restaura la conexión, verifica recuperación y elimina únicamente su propio registro ficticio.

Resultados: compilación correcta, 65 pruebas unitarias correctas y dos pruebas de integración correctas (validaciones del backend y flujo completo en navegador). La compilación informa advertencias previas sobre navegadores antiguos y el presupuesto SCSS del catálogo.

| Captura | Evidencia |
| --- | --- |
| [01-get.png](evidencias-rest/01-get.png) | Consulta inicial |
| [02-post.png](evidencias-rest/02-post.png) | Creación confirmada |
| [03-put.png](evidencias-rest/03-put.png) | Edición confirmada y persistida en MySQL |
| [04-delete.png](evidencias-rest/04-delete.png) | Eliminación confirmada; consulta posterior devuelve 404 |
| [05-loading.png](evidencias-rest/05-loading.png) | Solicitud en curso y botones bloqueados |
| [06-error.png](evidencias-rest/06-error.png) | Error de conexión visible |
| [07-movil.png](evidencias-rest/07-movil.png) | Vista adaptable a móvil |

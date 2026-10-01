# Conexión, errores y uso sin conexión

Fecha: 29 de septiembre de 2026. Proyecto: Ionic/Angular `project01`.

## Entregables y comportamiento

| Entregable | Implementación |
| --- | --- |
| Detección de conexión | `ConnectionService` consulta `navigator.onLine` al iniciar y escucha `online`/`offline`. La aplicación muestra un aviso persistente cuando falta red. |
| Manejo de errores | Se distinguen desconexión, servidor inaccesible, timeout, errores HTTP y respuestas inválidas. Catálogo: 8 s; contacto: 6 s; acceso: 10 s. Los indicadores de carga se liberan en `finally`. |
| Mensajes al usuario | Avisos en español, botón Reintentar, fecha de la copia local, advertencia de datos posiblemente desactualizados y mensajes de pendientes o fallo de almacenamiento. |
| Caché | Último catálogo válido en `localStorage`, en un registro versionado con datos y fecha ISO. Se admite una lista vacía válida y el formato anterior. |
| Almacenamiento temporal | Contactos enviados sin red se guardan en una cola persistente. El formulario solo se limpia después de guardar o recibir confirmación del servidor. |
| Prueba sin conexión | Pruebas automatizadas reproducibles de servicios, componentes, almacenamiento y eventos de red; procedimiento manual incluido abajo. |
| Bitácora | Seis problemas encontrados y sus soluciones, con participación de IA indicada. |

## Estrategia

### Imágenes persistentes (30 de septiembre de 2026)

`ImageCacheService` descarga todo el catálogo con cuatro descargas simultáneas como máximo usando `CapacitorHttp`. Guarda los binarios mediante `@capacitor/filesystem` en `Directory.Data/uma-images`, dentro del almacenamiento privado de Android. No usa el directorio temporal de caché ni solicita permisos de almacenamiento compartido. Un índice pequeño por corredora en `localStorage` conserva la URL original, el archivo, ETag y Last-Modified; el catálogo conserva las URLs del servidor para poder revalidarlas.

La vista recibe URLs locales mediante `Capacitor.convertFileSrc`. Cerrar la app, reiniciar el dispositivo o desconectar el servidor no elimina estos archivos. Al actualizar se envían los validadores disponibles: HTTP 304 reutiliza la copia; HTTP 200 escribe un archivo nuevo y cambia el índice solo después de poder leerlo. Si el servidor no aporta validadores, se descarga nuevamente. Un fallo de red, respuesta inválida o falta de espacio conserva la imagen anterior y muestra un aviso. Si cambia la URL de una corredora, también se conserva la copia anterior hasta poder descargar la nueva.

La pantalla muestra el progreso y cuántas imágenes están guardadas. Solo anuncia “Catálogo e imágenes disponibles sin conexión” cuando el catálogo se guardó y todos los archivos locales existen. Si se pierde el servidor, deja de iniciar descargas nuevas en esa pasada; Actualizar vuelve a intentar los pendientes. Limpiar Caché Offline desde Perfil elimina imágenes e índices además del catálogo, después de esperar las descargas activas. Desinstalar o borrar los datos de la app también elimina las copias.

En navegador, Filesystem utiliza su almacenamiento web y la vista utiliza data URI; el servidor de imágenes debe permitir CORS para descargarlas (no basta con poder mostrarlas con `<img>`). El HTTP nativo de Android no tiene esta restricción. No se agrega un service worker: abrir una web desde cero sin red sigue requiriendo una solución PWA.

Para actualizar Android tras instalar esta dependencia: `npm run build`, `npx cap sync android` y reconstruir/reinstalar el APK conservando los datos. La primera descarga necesita conexión al backend; con la configuración local actual requiere `adb reverse tcp:8088 tcp:8088` mientras se completa.

Prueba en dispositivo: esperar el aviso de disponibilidad, quitar solo la redirección del puerto 8088, cerrar y abrir la app y recorrer también las últimas tarjetas. Deben usar archivos locales aunque la API falle. Restablecer la redirección y actualizar para comprobar la revalidación. Las pruebas unitarias cubren reapertura de 100 imágenes, HTTP 304, sustitución, red/espacio agotados, archivos ausentes, respuestas HTML, descarga parcial y limpieza durante una descarga.

Validación ejecutada el 30/09/2026: 44 pruebas aprobadas (12 archivos), build de producción y APK correctos, ESLint correcto para ambos servicios de catálogo/imágenes y sus pruebas. APK instalado con `adb install -r`, conservando datos. En Android físico se comprobaron 100 archivos privados y 100 imágenes decodificadas desde URLs locales. Después de retirar la redirección 8088, forzar el cierre y volver a abrir, se conservaron las 100 tarjetas e imágenes; tras restablecer la conexión y actualizar, se mantuvieron 100 archivos y el aviso de disponibilidad completa. La descarga inicial dejó dos pendientes que se completaron en el siguiente intento.

### Datos del catálogo

El catálogo consulta la red cuando está disponible y reemplaza la caché únicamente tras validar la respuesta. Si falla la red, el servidor o el formato, utiliza la última copia válida e informa la causa. La copia no tiene vencimiento obligatorio: se conserva hasta una actualización correcta o hasta que el usuario la borre desde Perfil. Su antigüedad se muestra para que el usuario sepa que puede estar desactualizada. Si el almacenamiento está lleno o bloqueado, los datos recién descargados siguen visibles y aparece una advertencia de que no se guardaron.

Tener red no significa que PHP o MySQL funcionen. Por eso el estado del dispositivo y los errores de las peticiones se manejan por separado. Al recibir `online`, el catálogo vuelve a consultar; también hay actualización manual. Login y registro requieren red, conservan los datos escritos ante errores y no guardan contraseñas en la caché.

Contacto intenta sincronizar los mensajes al iniciar la pantalla y al recibir `online`. Se bloquean envíos simultáneos. Antes de cada POST se guarda `needsReview: true`; solo se elimina el mensaje tras recibir `status: success`. Un mensaje marcado no vuelve a enviarse automáticamente después de un fallo o reinicio. La interfaz pide verificar el envío antes del reintento manual, porque el servidor podría haberlo registrado aunque no llegara la respuesta. El backend actual no implementa idempotencia, por lo que un reintento manual todavía puede duplicarlo.

## Pruebas automatizadas

Desde `C:\unit01\project01`:

```powershell
node node_modules/@angular/cli/bin/ng.js test --watch=false
node node_modules/@angular/cli/bin/ng.js build
npx tsc --noEmit -p tsconfig.app.json
npx tsc --noEmit -p tsconfig.spec.json
```

La suite usa Vitest/jsdom, respuestas HTTP simuladas y eventos del navegador. No depende de Apache o MySQL, no inserta contactos reales y no equivale a una prueba física en Android.

Resultado ejecutado el 29/09/2026: **32 pruebas correctas en 11 archivos**, sin fallos (ejecución final: 12.39 s). La compilación de producción y las comprobaciones TypeScript también finalizaron correctamente. Angular advierte que la configuración existente de Browserslist incluye navegadores antiguos fuera de soporte; esto no impidió la compilación. El primer intento de pruebas fue bloqueado por `spawn EPERM` al iniciar esbuild dentro del entorno restringido; la ejecución autorizada fuera de ese entorno completó la suite.

| Caso | Verificación automatizada |
| --- | --- |
| Descargar, desconectar y volver a abrir | Una nueva instancia del servicio recupera el mismo catálogo y su fecha sin otra petición HTTP. |
| Inicio sin red y sin caché | Error explícito con instrucciones para descargar; no hay petición de red. |
| Catálogo vacío | Una respuesta válida vacía se conserva y se recupera sin conexión. |
| Caché corrupta | JSON roto, objetos inválidos o listas con registros nulos no bloquean la aplicación. |
| Respuesta inválida | HTML, `status: error` o registros incompletos no reemplazan una copia válida. |
| HTTP 500, timeout y fallo de red | Se muestra la copia guardada con un mensaje correspondiente a la causa. |
| Almacenamiento lleno | Se muestran datos de red con advertencia; Contacto conserva el formulario. |
| Reconexión | El servicio detecta los eventos y el componente del catálogo vuelve a consultar. |
| Aviso de caché | El componente muestra la indicación persistente y la fecha. |
| Contacto sin red | Guarda localmente; al recibir `online`, envía y elimina solo el confirmado. |
| Cola corrupta o respuesta rechazada | No sobrescribe datos ilegibles ni elimina mensajes sin confirmación. |
| Sincronización simultánea | Dos llamadas concurrentes generan una sola petición. |
| Acceso sin red | Login y registro no hacen peticiones y mantienen los datos introducidos. |

## Procedimiento manual de demostración

Estos pasos quedan preparados para ejecución en navegador o dispositivo; no se presentan como una prueba física ya realizada.

1. Con API disponible, iniciar sesión y abrir el catálogo. Comprobar que aparecen las corredoras. En almacenamiento del navegador, verificar `offline_cached_umas` con `version`, `data` y `timestamp`.
2. Con la app ya cargada, desconectar Wi-Fi/datos o activar Offline en las herramientas de red del navegador. Debe aparecer el aviso global. Pulsar Actualizar: deben seguir disponibles las tarjetas, las estadísticas y la fecha de la copia, sin esperar el timeout.
3. En la app Android instalada, cerrar y volver a abrir sin red conservando la sesión local. El catálogo debe recuperarse de `localStorage`. En navegador, mantener la página abierta: esta entrega no agrega un service worker para descargar la interfaz desde cero sin conexión.
4. Abrir Contacto sin red, completar los campos y pulsar Guardar para enviar. Debe aparecer el número de pendientes. Recuperar la red con Contacto abierto y API disponible: debe confirmarse el envío y desaparecer el pendiente.
5. Con conexión de red activa, detener solo el servidor de pruebas y actualizar el catálogo. Debe usarse la copia local y mostrarse un fallo de acceso al servidor; el aviso global de falta de red no debe activarse por ese motivo.
6. Desde Perfil, borrar la caché del catálogo, desconectar y actualizar. Debe aparecer el error de falta de copia local y el botón Reintentar. Reconectar, restaurar la API y reintentar para recuperar los datos.
7. Para un POST sin confirmación, usar un entorno de pruebas: el mensaje debe seguir pendiente y el siguiente intento automático debe quedar pausado. Verificar en el servidor si se registró antes de utilizar Reintentar pendientes.

## Bitácora

Todos los problemas siguientes se detectaron mediante revisión del código y se solucionaron con ayuda de IA (Codex). Las verificaciones citadas están implementadas en los archivos `.spec.ts`.

| # | Problema encontrado | Causa | Solución aplicada | Evidencia |
| --- | --- | --- | --- | --- |
| 1 | El aviso de datos guardados desaparecía aunque continuara el fallo. | Temporizador de 4.5 s y detección basada únicamente en la última carga. | Servicio de conexión global, aviso persistente y mensaje independiente para uso de caché. | Pruebas de eventos y del aviso con fecha en Tab1. |
| 2 | Un error del servidor podía parecer un catálogo vacío. | Se aceptaba `response.data.data` fuera de una respuesta exitosa válida. | Validación de estado y campos necesarios; recuperación de la copia sin sobrescribirla. | Casos de HTML, estado error, registros incompletos y HTTP 500. |
| 3 | Una copia vacía válida no se podía usar y la caché corrupta podía llegar a la vista. | Se exigía `length > 0` y se confiaba en `JSON.parse` sin validar estructura. | Validación al leer y distinción entre ausencia de caché y lista vacía. Datos y fecha se guardan juntos. | Casos de lista vacía, JSON roto y registros nulos. |
| 4 | Contacto borraba el formulario incluso si fallaba el guardado local. | El método de almacenamiento ocultaba la excepción y el llamador asumía éxito. | El fallo se propaga, el formulario se conserva y aparece un mensaje de almacenamiento. | Prueba con `setItem` lanzando error por cuota. |
| 5 | La cola eliminaba mensajes sin comprobar confirmación y permitía sincronizaciones superpuestas. | Un HTTP resuelto se interpretaba como envío exitoso; faltaba un bloqueo. | Se exige `status: success`, se guarda cada avance y se bloquean operaciones simultáneas. Los envíos ambiguos requieren revisión. | Respuesta `status: error`, reintento manual y llamadas concurrentes. |
| 6 | Los errores HTTP del formulario se anunciaban como falta de conexión y se encolaban. | El mismo `catch` trataba cualquier fallo como desconexión. | Solo se encola antes de enviar cuando el dispositivo indica falta de red; los errores HTTP conservan el formulario y tienen mensajes diferenciados. | Prueba HTTP 400 sin encolado y pruebas de mensajes por timeout/HTTP 500. |

## Alcance y límites

- Se guardan datos e imágenes del catálogo. Las imágenes pendientes requieren otra actualización con conexión; si no hay copia y la imagen remota falla, se usa `assets/shapes.svg` como sustituto local.
- La interfaz Android está empaquetada; la web necesita haber cargado sus recursos. No se agregó soporte PWA para recarga completa sin red.
- `navigator.onLine` es una señal del sistema, no una comprobación de disponibilidad de Internet o de PHP. En una conexión USB/ADB conviene comprobar el comportamiento en el teléfono real.
- Las copias y los contactos pendientes pertenecen al almacenamiento de este dispositivo/origen. Borrar los datos de la app los elimina. La cola no se sincroniza en segundo plano con la app cerrada.
- El perfil y la navegación conservan el mecanismo previo de sesión local; esta entrega no agrega autenticación del servidor.

# Bitácora de desarrollo asistido por IA

**Proyecto:** Uma Musume Companion App (`project01`).  
**Periodo documentado:** 1 de septiembre al 1 de octubre de 2026.  
**Fecha de elaboración:** 1 de octubre de 2026.  
**Asistente identificado en la documentación:** Codex.

## Objetivo y fuentes

Registrar la evolución del proyecto, los problemas abordados, las soluciones y las evidencias de validación, indicando cuándo existe constancia de apoyo de inteligencia artificial.

Esta bitácora se reconstruyó a partir del historial Git y de [API.md](API.md) y [OFFLINE.md](OFFLINE.md). Las fechas de los commits indican cuándo se registraron los cambios; no necesariamente cuándo comenzó o terminó cada actividad. Las actividades del 29 y 30 de septiembre tienen fechas propias en OFFLINE.md y quedaron integradas en el commit del 1 de octubre.

El repositorio no contiene una transcripción completa de las conversaciones con IA. Por ello, no se atribuye automáticamente a Codex todo el desarrollo ni se inventan prompts, tiempos de trabajo o aprobaciones humanas. La participación histórica de IA está expresamente documentada en las seis correcciones del modo sin conexión. La elaboración de esta bitácora también se realizó con asistencia de Codex.

## Contexto técnico

La aplicación utiliza Ionic y Angular con TypeScript, Axios para las peticiones HTTP y Capacitor para Android. El backend implementado utiliza PHP con PDO y MySQL. La propuesta inicial del README mencionaba Node.js y Express; la documentación de la API describe la implementación actual en PHP.

Las funciones desarrolladas incluyen acceso y registro, catálogo de corredoras con estadísticas y aptitudes, formulario de contacto, perfil local y consulta del catálogo con imágenes sin conexión. El backend también expone detalle y compatibilidad, cuyo consumo desde la interfaz figura como pendiente en API.md.

## Registro cronológico

| Fecha | Actividad y resultado registrado | Evidencia | Participación de IA acreditada |
| --- | --- | --- | --- |
| 01/09/2026 | Creación de la estructura inicial de Ionic/Angular, navegación por pestañas, configuración de Capacitor y archivos iniciales de pruebas. | Commit `ae9d751`. | No especificada en las fuentes consultadas. |
| 11/09/2026 | Incorporación de pantallas de acceso y registro, guard de navegación y endpoints PHP de autenticación, junto con configuración y esquema de base de datos. | Commit `5289b93`; [login.page.ts](../src/app/login/login.page.ts), [login.php](../backend/login.php) y [signup.php](../backend/signup.php). | No especificada en las fuentes consultadas. |
| 11/09/2026 | Implementación del formulario de contacto y del endpoint PHP para guardar mensajes. | Commit `3e0eedd`; [tab2.page.ts](../src/app/tab2/tab2.page.ts) y [formulario-contacto.php](../backend/formulario-contacto.php). | No especificada en las fuentes consultadas. |
| 16/09/2026 | Incorporación del modelo de Uma, servicio de consulta y tarjetas del catálogo; ajustes de integración con el backend. | Commit `cf84382`; [uma.model.ts](../src/app/models/uma.model.ts), [uma.service.ts](../src/app/services/uma.service.ts) y [api.php](../backend/api.php). | No especificada en las fuentes consultadas. |
| 21/09/2026 | Incorporación del proyecto Android y sus recursos, configuración compartida de API, servicio de usuario local y ajustes en catálogo, contacto y perfil. | Commit `7923cee`; [api.config.ts](../src/app/services/api.config.ts) y [auth.service.ts](../src/app/services/auth.service.ts). | No especificada en las fuentes consultadas. |
| 28/09/2026 | Ajustes del contrato de datos, estadísticas y presentación del catálogo; documentación de endpoints y consumo mediante Axios. | Commit `289a9ae`; [API.md](API.md). | No especificada en las fuentes consultadas. |
| 29/09/2026 | Tratamiento de conexión y errores, validación de caché, conservación del formulario y sincronización de contactos pendientes. Se documentaron seis problemas corregidos con IA y sus pruebas. | [Bitácora de OFFLINE.md](OFFLINE.md#bitácora); cambios incluidos en `749c270`. | Codex: revisión de código y apoyo en la solución de los seis problemas descritos abajo. |
| 30/09/2026 | Persistencia de imágenes con Filesystem, revalidación HTTP, progreso de descarga y limpieza de copias; documentación de validación en Android. | [OFFLINE.md](OFFLINE.md); [image-cache.service.ts](../src/app/services/image-cache.service.ts); cambios incluidos en `749c270`. | La fuente no desglosa la intervención de IA en esta ampliación. |
| 01/10/2026 | Registro en Git de las capacidades offline y la caché de imágenes. | Commit `749c270`. | El commit reúne las correcciones asistidas documentadas y otros cambios; no permite atribuir cada modificación a IA. |
| 01/10/2026 | Elaboración de esta bitácora a petición del usuario, mediante revisión de documentación y del historial local. | Archivo `docs/BITACORA_IA.md`. | Codex: recopilación de evidencias, organización cronológica y redacción. |

## Problemas resueltos con asistencia de IA

La siguiente tabla resume los seis casos que OFFLINE.md identifica expresamente como solucionados con ayuda de Codex. Las evidencias enlazadas son archivos de pruebas; su existencia no implica que se hayan vuelto a ejecutar al redactar este documento.

| Problema | Solución documentada | Evidencia de verificación |
| --- | --- | --- |
| El aviso de datos guardados desaparecía aunque continuara el fallo. | Incorporar detección global de conexión y separar el aviso persistente de caché del estado de red. | [connection.service.spec.ts](../src/app/services/connection.service.spec.ts) y [tab1.page.spec.ts](../src/app/tab1/tab1.page.spec.ts). |
| Una respuesta inválida podía interpretarse como catálogo vacío. | Validar estado y estructura de la respuesta antes de sustituir la copia local; conservar la última copia válida ante errores. | [uma.service.spec.ts](../src/app/services/uma.service.spec.ts). |
| Una lista vacía válida se rechazaba y una caché corrupta podía llegar a la vista. | Distinguir una copia vacía de la ausencia de copia, validar el contenido y guardar datos y fecha juntos. | [uma.service.spec.ts](../src/app/services/uma.service.spec.ts). |
| El formulario se limpiaba aunque fallara el almacenamiento local. | Propagar el error, conservar los datos introducidos y mostrar un aviso de almacenamiento. | [contact-offline.spec.ts](../src/app/tab2/contact-offline.spec.ts). |
| La cola eliminaba mensajes sin confirmación y admitía sincronizaciones superpuestas. | Exigir `status: success`, bloquear envíos simultáneos y marcar los envíos ambiguos para revisión antes del reintento. | [contact-offline.spec.ts](../src/app/tab2/contact-offline.spec.ts). |
| Los errores HTTP de contacto se trataban como desconexión y provocaban encolado. | Encolar antes del envío solo si el dispositivo indica falta de red; conservar el formulario y distinguir errores HTTP y timeout. | [contact-offline.spec.ts](../src/app/tab2/contact-offline.spec.ts). |

## Validaciones registradas

Los siguientes resultados se citan de OFFLINE.md. Son registros históricos y no ejecuciones realizadas durante la elaboración de esta bitácora.

| Fecha | Resultado documentado | Alcance |
| --- | --- | --- |
| 29/09/2026 | 32 pruebas correctas en 11 archivos; compilación de producción y comprobaciones TypeScript correctas. | Pruebas con Vitest/jsdom, HTTP simulado y eventos del navegador; no requieren Apache ni MySQL. |
| 30/09/2026 | 44 pruebas aprobadas en 12 archivos; build de producción y APK correctos; ESLint correcto para servicios de catálogo/imágenes y sus pruebas. | Cobertura ampliada de imágenes persistentes, revalidación, fallos y limpieza. |
| 30/09/2026 | APK instalado conservando datos; 100 archivos privados y 100 imágenes locales comprobados en Android físico. | Se retiró la redirección del puerto 8088, se cerró y abrió la app y se conservaron tarjetas e imágenes. Tras reconectar y actualizar se mantuvo la disponibilidad completa. |
| 01/10/2026 | Revisión documental del historial Git, referencias y coherencia de esta bitácora. | Cambio exclusivamente documental; no se repitieron pruebas de aplicación ni compilaciones. |

El registro del 29 de septiembre informa de un bloqueo inicial `spawn EPERM` en el entorno restringido y una ejecución posterior autorizada que completó las pruebas. El registro del 30 de septiembre indica que dos imágenes pendientes de la descarga inicial se completaron en el siguiente intento.

## Aprendizajes y pendientes

- La revisión asistida permitió documentar fallos que no se aprecian en el flujo exitoso: respuestas inválidas, cuota de almacenamiento, copias corruptas y envíos sin confirmación.
- La conectividad del dispositivo y la disponibilidad del backend se tratan por separado. El catálogo puede seguir usando una copia válida cuando falla el servidor.
- La caché del catálogo y la persistencia de imágenes requieren verificaciones distintas; tener los datos guardados no garantiza que todas las imágenes estén disponibles.
- Queda pendiente la idempotencia del backend de contacto: un reintento manual de un envío ambiguo puede duplicar el mensaje.
- El control de navegación basado en usuario local no sustituye la autenticación y autorización del servidor. La documentación actual no registra emisión de JWT ni sesión de servidor.
- La versión web no incorpora un service worker para abrir la interfaz desde cero sin conexión. La aplicación Android dispone de la interfaz empaquetada.
- Para futuras sesiones conviene registrar la solicitud real a la IA, su propuesta, los ajustes humanos y la validación realizada, de modo que la participación quede trazable desde el inicio.

## Formato para próximas entradas

```text
Fecha:
Objetivo o problema:
Solicitud realizada a la IA:
Herramienta o asistente utilizado:
Propuesta de la IA:
Decisión y ajustes de la persona desarrolladora:
Cambios aplicados y archivos afectados:
Pruebas ejecutadas y resultado observado:
Limitaciones o pendientes:
Evidencia (commit, documento o salida de prueba):
```

Cuando no exista evidencia de un dato, registrarlo como «no documentado». Separar siempre las pruebas propuestas de las efectivamente ejecutadas.

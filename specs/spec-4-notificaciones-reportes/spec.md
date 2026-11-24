# Especificación — SPEC-4: Notificaciones y reportes

## 1. Propósito y alcance

Esta especificación define la recepción y consulta de notificaciones del
Festival Internacional de Artes Vivas Loja (FIAVL), además de tres reportes
administrativos: ocupación por función, funciones más reservadas y
postulaciones agrupadas por estado.

El servicio conserva las notificaciones que otros servicios le entregan y
permite consultarlas por correo. Para los reportes solicita información
actualizada a programación, reservas y convocatoria mediante sus API HTTP/JSON.
Cada servicio conserva la propiedad de sus propios datos.

Quedan fuera de alcance el envío de correo electrónico o mensajes a través de
proveedores externos, autenticación, modificación de reservas o postulaciones,
y consultas directas a bases de datos de otros servicios.

## 2. Actores

- **Público o compañía artística:** consulta la bandeja de notificaciones
  asociada a su correo.
- **Servicio emisor:** reservas-service o convocatoria-service, que registra
  sucesos relevantes mediante la API de notificaciones.
- **Administrador:** consulta los reportes agregados del festival.
- **Servicios dependientes:** programación-service, reservas-service y
  convocatoria-service, proveedores de los datos de reportes.

## 3. Historias de usuario

- **HU-001:** Como servicio emisor, quiero registrar un aviso con destinatario,
  tipo, referencia y mensaje, para que el destinatario pueda consultarlo luego.
- **HU-002:** Como público o compañía, quiero consultar los avisos de mi correo
  y verlos ordenados del más reciente al más antiguo.
- **HU-003:** Como administrador, quiero conocer la ocupación de cada función
  para identificar demanda y disponibilidad.
- **HU-004:** Como administrador, quiero ver las funciones ordenadas por
  entradas reservadas, distinguiendo entradas de reservas, para comparar su
  demanda.
- **HU-005:** Como administrador, quiero consultar el total de postulaciones
  por estado para conocer el avance de la convocatoria.

## 4. Requisitos funcionales

- **FR-001 — Recibir notificaciones.** El sistema aceptará por HTTP/JSON
  notificaciones que cumplan el contrato publicado para reservas y
  postulaciones. En el prototipo no autenticará la identidad del emisor.
- **FR-002 — Validar notificaciones.** El sistema validará correo, tipo,
  referencia y mensaje requeridos. Admitirá correo de hasta 254 caracteres,
  referencia de 1 a 100 y mensaje de 1 a 2000 caracteres, además de los tipos
  definidos en el contrato OpenAPI. Rechazará solicitudes inválidas con una
  respuesta comprensible.
- **FR-003 — Persistir notificaciones.** El sistema guardará cada notificación
  en su propia base de datos, con identificador y fecha de creación. Los tipos
  podrán ampliarse sin rediseñar el modelo.
- **FR-004 — Consultar por correo.** El sistema devolverá las notificaciones
  del correo solicitado, en orden descendente por fecha de creación. Una
  consulta válida sin coincidencias devolverá una lista vacía.
- **FR-005 — Gestionar confirmaciones de reservas.** El sistema reconocerá
  `RESERVA_CONFIRMADA`. Para compatibilidad con el formato provisional
  publicado por SPEC-3, también reconocerá `reserva` como la misma clase de
  aviso.
- **FR-006 — Gestionar aprobaciones de postulaciones.** El sistema reconocerá
  `POSTULACION_APROBADA` cuando el emisor identifique explícitamente la
  aprobación. No deducirá el resultado del texto del mensaje.
- **FR-007 — Reportar ocupación por función.** El sistema combinará el aforo y
  la información de funciones de programación con las entradas confirmadas
  por función de reservas. Calculará
  `entradas_reservadas / aforo * 100`; nunca dividirá por cero.
- **FR-008 — Reportar funciones más reservadas.** El sistema presentará las
  funciones ordenadas de mayor a menor por **número de entradas confirmadas**.
  También expondrá, sin confundirlas, las cantidades de entradas (`entradas`)
  y reservas (`reservas`) que publica reservas-service. Los empates se
  resolverán por `funcion_id` ascendente.
- **FR-009 — Reportar postulaciones por estado.** El sistema presentará los
  conteos publicados por convocatoria para `pendiente`, `aprobada`,
  `rechazada` y `total`.
- **FR-010 — Informar dependencias no disponibles.** Si un servicio necesario
  no responde, excede el tiempo límite, devuelve una respuesta inválida o sus
  datos no permiten relacionar una función con aforo válido, el endpoint de
  reporte devolverá HTTP 503 con un mensaje claro y el proceso continuará
  disponible.
- **FR-011 — Informar salud del servicio.** El servicio expondrá un endpoint
  de salud para verificar que el proceso responde.

## 5. Requisitos no funcionales

- **NFR-001 — Arquitectura:** el servicio será independiente y escuchará en el
  puerto 3004; se integrará con el frontend exclusivamente a través del API
  Gateway en el puerto 3000.
- **NFR-002 — Persistencia:** las notificaciones residirán en un archivo SQLite
  propio, usando `better-sqlite3`; no se compartirán bases de datos.
- **NFR-003 — Interoperabilidad:** las dependencias se consultarán por HTTP y
  JSON conforme a sus contratos publicados; cada llamada tendrá tiempo límite.
- **NFR-004 — Disponibilidad ante fallos:** errores de dependencias o de datos
  remotos no cerrarán el proceso ni se presentarán como reportes exitosos.
- **NFR-005 — Privacidad básica:** la búsqueda se limitará al correo solicitado;
  no se registrarán en logs mensajes ni direcciones personales.
- **NFR-006 — Trazabilidad:** los requisitos funcionales se vincularán a tareas
  verificables y a pruebas automatizadas.
- **NFR-007 — Mantenibilidad:** rutas, validaciones, persistencia y clientes
  HTTP se mantendrán separados en módulos.

## 6. Criterios de aceptación

1. Una notificación válida se guarda una sola vez por solicitud y su respuesta
   incluye el registro persistido y su fecha.
2. Correo inválido, campos requeridos ausentes, tipo no admitido o JSON mal
   formado producen HTTP 400; no se inserta ningún registro.
3. La consulta de un correo devuelve solo sus notificaciones y en orden
   descendente; para un correo sin avisos devuelve HTTP 200 y una lista vacía.
4. Los avisos `reserva` y `RESERVA_CONFIRMADA` quedan clasificados como
   confirmaciones de reserva; `postulacion` queda como `POSTULACION` genérico.
   Un aviso explícito `POSTULACION_APROBADA` se conserva con esa clasificación.
5. La ocupación se calcula con el aforo publicado y las entradas confirmadas.
   Si el aforo es cero, falta un dato necesario o hay una referencia de reserva
   sin función correspondiente, el endpoint responde HTTP 503 y no devuelve
   porcentajes ni un reporte parcial.
6. El reporte de funciones usa `entradas` como métrica principal, conserva el
   conteo separado de `reservas` y tiene orden determinista.
7. El resumen de postulaciones refleja los cuatro conteos del contrato
   convocatoria-service y reconoce los estados publicados.
8. La caída o respuesta inválida de una dependencia produce HTTP 503, formato
   `{ "error": "..." }`, y solicitudes posteriores de salud siguen respondiendo.
9. Ningún reporte usa datos de ejemplo para sustituir una dependencia caída.
10. Ningún cliente del frontend llama directamente a los puertos 3001–3004.
11. El endpoint de salud responde HTTP 200 mientras el proceso está disponible,
    incluso después de un error 503 de una dependencia.

### Trazabilidad de FR a criterios y tareas

| Requisito | Criterios de aceptación | Tareas |
|---|---|---|
| FR-001 | 1, 2 | T007, T019 |
| FR-002 | 2 | T007, T019 |
| FR-003 | 1, 2 | T006, T007, T019 |
| FR-004 | 3 | T008, T016, T019 |
| FR-005 | 4 | T007, T016, T019 |
| FR-006 | 4 | T007, T009, T016, T019 |
| FR-007 | 5 | T010, T011, T012, T017, T020 |
| FR-008 | 6 | T010, T013, T017, T020 |
| FR-009 | 7 | T010, T014, T017, T020 |
| FR-010 | 5, 8, 9 | T005, T010, T012, T014, T020 |
| FR-011 | 8, 11 | T004, T005, T015 |

## 7. Escenarios principales y alternativos

### Registrar confirmación de reserva

1. reservas-service envía correo, tipo, referencia y mensaje.
2. El sistema valida los campos y reconoce el tipo de reserva.
3. El sistema guarda el aviso y devuelve HTTP 201 con sus datos.

**Alternativas:** datos inválidos producen HTTP 400; fallo de persistencia
produce HTTP 500 sin una respuesta de éxito.

### Consultar bandeja

1. El usuario envía un correo válido.
2. El sistema busca coincidencias y devuelve la lista ordenada.

**Alternativas:** correo inválido produce HTTP 400; ninguna coincidencia
produce HTTP 200 con una lista vacía.

### Generar reporte

1. El administrador solicita un reporte a través del Gateway.
2. notificaciones-service consulta las dependencias requeridas por HTTP/JSON.
3. El servicio valida las respuestas, calcula y devuelve el reporte.

**Alternativas:** una dependencia no disponible, lenta o con formato
incompatible produce HTTP 503; una lista sin datos produce un reporte vacío,
no datos ficticios. Referencias a funciones inexistentes o datos de aforo no
válidos producen HTTP 503 en lugar de un reporte parcial.

## 8. Manejo de errores

Todas las respuestas de error tendrán la forma `{ "error": "mensaje" }`.

| HTTP | Uso |
|---|---|
| 400 | Parámetros, correo, cuerpo o JSON inválidos |
| 404 | Ruta inexistente |
| 500 | Error inesperado local o de persistencia |
| 503 | Dependencia no disponible, lenta, incompatible o datos remotos inconsistentes para el reporte |

El registro de una notificación no depende de la disponibilidad de los otros
servicios. Un fallo del almacenamiento no se convierte en éxito ni en una
notificación parcial.

## 9. Dependencias, restricciones y brechas de contrato

- SPEC-1 publica `GET /funciones` y `GET /funciones/:id`. El ejemplo JSON
  detallado corresponde a `GET /funciones/:id`; el contrato no documenta de
  forma explícita el cuerpo exacto de la lista `GET /funciones`. La
  implementación actual de SPEC-1 sí devuelve una lista y cada elemento
  contiene `id`, `aforo`, `fecha`, `hora`, `obra.titulo` y `escenario.nombre`
  con la forma del ejemplo individual. La respuesta completa implementada
  también contiene `precio`, y objetos anidados `obra` y `escenario` con otros
  campos. Aun así, el contrato publicado debe confirmar formalmente esta forma
  para que SPEC-4 dependa solo de un contrato; no se modificará desde esta spec.
- SPEC-3 publica `GET /reservas/resumen` como una lista de objetos
  `{ "funcion_id": number, "entradas": number, "reservas": number }`, contando
  solo reservas confirmadas. Este es el origen de las métricas de reservas.
- SPEC-2 publica `GET /postulaciones/resumen` con
  `{ "pendiente": number, "aprobada": number, "rechazada": number, "total": number }`.
  convocatoria-service todavía no está implementado; mientras no responda, el
  reporte debe retornar HTTP 503.
- Los ejemplos provisionales de SPEC-2 envían `tipo: "postulacion"` tanto al
  aprobar como al rechazar y no incluyen un campo que distinga el resultado.
  No es posible clasificar ese aviso con certeza como
  `POSTULACION_APROBADA`. SPEC-4 aceptará el tipo canónico cuando el emisor lo
  proporcione y almacenará el tipo genérico como `POSTULACION` sin inferir su
  resultado. Se requiere coordinar con el responsable de SPEC-2 la publicación
  de un tipo explícito antes de afirmar compatibilidad automática con
  aprobaciones.
- El Gateway ya enruta `/api/notificaciones` a `http://localhost:3004`; SPEC-4
  no cambia su lógica.
- El prototipo no autentica al emisor ni al usuario que consulta una bandeja;
  la autenticación no está definida en el alcance compartido del proyecto.
- No se modifican archivos, servicios ni contratos que pertenezcan a otras
  specs.

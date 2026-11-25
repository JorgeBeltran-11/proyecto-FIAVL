# Spec-2: Convocatoria de artistas

- **Rama:** `spec-2`
- **Responsable:** David León
- **Estado:** Aprobada
- **Microservicio:** `convocatoria-service`

## 1. Contexto

Cada año el FIAVL abre una convocatoria para que compañías nacionales e
internacionales postulen sus obras. Hoy las postulaciones llegan por canales
dispersos (correo, formularios sueltos), lo que dificulta revisarlas, responder
a las compañías y pasar las obras seleccionadas a la programación. Se necesita
un único lugar donde la compañía **postule su obra**, la organización la
**revise y decida**, y las obras aprobadas **pasen automáticamente** a la
programación del festival (spec-1).

## 2. Actores

| Actor | Descripción |
|---|---|
| Compañía artística | Grupo o artista que postula una obra al festival |
| Administrador | Personal de la organización que revisa y decide las postulaciones |
| Servicio de programación (spec-1) | Recibe las obras aprobadas |
| Servicio de notificaciones (spec-4) | Recibe los avisos de aprobación o rechazo |
| Servicio de reportes (spec-4) | Consulta las postulaciones por estado |

## 3. Historias de usuario

### HU-1 — Postular una obra (Prioridad P1)
Como **compañía artística**, quiero llenar un formulario público con los datos
de mi obra y de contacto, para participar en la convocatoria del festival.

**Criterios de aceptación**
1. Puedo enviar una postulación con: título de la obra, nombre de la compañía,
   país de origen, disciplina, duración en minutos, sinopsis, nombre del
   responsable, correo de contacto y, opcionalmente, un enlace a un video de la obra.
2. La disciplina debe ser una de: teatro, danza, música, circo, títeres,
   artes visuales (las mismas que usa programación).
3. El sistema rechaza la postulación si falta un campo obligatorio, si el correo
   no tiene un formato válido o si la duración es menor o igual a 0, e indica
   qué campo está mal.
4. Al enviar, veo un **código de postulación** único y el estado "pendiente".
5. El sistema rechaza una postulación si la misma compañía ya tiene otra
   postulación **pendiente** con el mismo título.

### HU-2 — Consultar el estado de mi postulación (Prioridad P1)
Como **compañía artística**, quiero consultar mi postulación con su código,
para saber si fue aprobada o rechazada sin tener que escribir a la organización.

**Criterios de aceptación**
1. Al ingresar un código válido veo el título de la obra, la fecha de envío y el
   estado: pendiente, aprobada o rechazada.
2. Si fue rechazada, veo el motivo del rechazo.
3. Si el código no existe, veo el mensaje "No existe una postulación con ese código".

### HU-3 — Revisar las postulaciones (Prioridad P1)
Como **administrador**, quiero ver la lista de postulaciones y el detalle de
cada una, para evaluarlas.

**Criterios de aceptación**
1. Veo las postulaciones ordenadas de la más antigua a la más reciente, con
   título, compañía, disciplina, fecha de envío y estado.
2. Puedo filtrar la lista por **estado** y por **disciplina**.
3. Al abrir una postulación veo todos sus datos, incluido el enlace al video.

### HU-4 — Aprobar una postulación (Prioridad P1)
Como **administrador**, quiero aprobar una postulación, para que la obra pase a
la programación del festival sin volver a escribir sus datos.

**Criterios de aceptación**
1. Al aprobar una postulación pendiente, el sistema crea la obra en el servicio
   de programación con sus datos y la postulación queda "aprobada", guardando
   el identificador de la obra creada.
2. Si el servicio de programación no responde o rechaza la obra, la postulación
   **sigue pendiente** y veo un mensaje de error claro (no queda aprobada a medias).
3. Solo se pueden aprobar postulaciones **pendientes**.

### HU-5 — Rechazar una postulación (Prioridad P1)
Como **administrador**, quiero rechazar una postulación indicando el motivo,
para que la compañía sepa por qué no fue seleccionada.

**Criterios de aceptación**
1. Para rechazar debo escribir un motivo; sin motivo el sistema no lo permite.
2. La postulación queda "rechazada" con su motivo.
3. Solo se pueden rechazar postulaciones **pendientes**.

### HU-6 — Avisar a la compañía (Prioridad P2)
Como **compañía artística**, quiero recibir un aviso cuando mi postulación sea
aprobada o rechazada, para enterarme sin consultar a cada rato.

**Criterios de aceptación**
1. Al aprobar o rechazar, el sistema envía un aviso al servicio de
   notificaciones (spec-4) con el correo de contacto, el código y el resultado.
2. Si el servicio de notificaciones no responde, la aprobación o el rechazo
   **igual se guardan**; el aviso fallido no deshace la decisión.

### HU-7 — Consulta de postulaciones por otros servicios (Prioridad P2)
Como **servicio de reportes (spec-4)**, quiero consultar las postulaciones por
una API, para generar el reporte de postulaciones por estado.

**Criterios de aceptación**
1. La API devuelve la lista de postulaciones con su estado y disciplina, con
   filtro opcional por estado.
2. La API devuelve el conteo de postulaciones por estado.

## 4. Requisitos funcionales

| ID | Requisito |
|---|---|
| FR-001 | El sistema debe permitir registrar una postulación con los campos obligatorios de HU-1 y validarlos. |
| FR-002 | El sistema debe generar un código único por postulación y asignarle el estado inicial "pendiente". |
| FR-003 | El sistema debe impedir postulaciones pendientes duplicadas (misma compañía y mismo título). |
| FR-004 | El sistema debe permitir consultar una postulación por su código. |
| FR-005 | El sistema debe listar las postulaciones con filtros por estado y disciplina. |
| FR-006 | El sistema debe permitir aprobar solo postulaciones pendientes y, al hacerlo, crear la obra en programación (`POST /obras` de spec-1). |
| FR-007 | El sistema no debe marcar una postulación como aprobada si la creación de la obra falla. |
| FR-008 | El sistema debe permitir rechazar solo postulaciones pendientes, con un motivo obligatorio. |
| FR-009 | El sistema debe enviar un aviso a notificaciones (spec-4) al aprobar o rechazar, sin que un fallo del aviso deshaga la decisión. |
| FR-010 | El sistema debe exponer sus datos por una API REST documentada en `contracts/`, incluido el conteo por estado. |
| FR-011 | El sistema debe precargar postulaciones de ejemplo en distintos estados para la demostración. |

## 5. Requisitos no funcionales

| ID | Requisito |
|---|---|
| NFR-001 | El servicio guarda sus datos en su propia base SQLite y nunca lee la base de otro servicio. |
| NFR-002 | Las respuestas usan JSON y códigos HTTP estándar (200, 201, 400, 404, 409, 503). |
| NFR-003 | Si programación no está disponible al aprobar, el servicio responde 503 sin caerse. |
| NFR-004 | El frontend accede al servicio solo a través del API Gateway. |

## 6. Entidades del dominio

- **Postulación:** id, código, título, compañía, país, disciplina, duración (min),
  sinopsis, nombre del responsable, correo de contacto, enlace de video (opcional),
  estado (pendiente / aprobada / rechazada), motivo de rechazo, fecha de envío,
  fecha de decisión, obraId (cuando se aprueba).

Relación con otros contextos: `obraId` apunta a la obra en programación (spec-1)
**solo por id**, sin clave foránea entre bases de datos.

## 7. Fuera de alcance

- Login y cuentas de compañías o administradores.
- Subida de archivos (fichas técnicas, fotos, videos): solo se pide un enlace.
- Evaluación por jurado con puntajes o varias rondas.
- Programar la función de la obra aprobada (lo hace el administrador en spec-1).
- Envío real de correos (spec-4 solo registra las notificaciones).

## 8. Preguntas abiertas para el equipo

1. ¿Hay una **fecha límite** de la convocatoria después de la cual no se aceptan postulaciones?
2. ¿Qué formato tendrá el aviso a `POST /notificaciones`? Depende del contrato de spec-4.
3. ¿Se permite volver a postular una obra que fue rechazada?

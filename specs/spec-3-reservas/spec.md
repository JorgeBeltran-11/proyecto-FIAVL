# Spec-3: Entradas y reservas

- **Rama:** `spec-3`
- **Responsable:** Julio Cesar
- **Estado:** Borrador
- **Microservicio:** `reservas-service`

## 1. Contexto

Las funciones del FIAVL se presentan en escenarios con un aforo limitado
(teatros, plazas, parques). Hoy el público no tiene una forma de asegurar su
lugar antes de llegar, y la organización no sabe cuántas personas asistirán a
cada función. Se necesita que el público **reserve entradas** para una función
de la cartelera (spec-1), que el sistema **no permita superar el aforo** de la
función, que cada reserva tenga un **código** para consultarla o cancelarla, y
que al confirmarla se **registre un aviso** en el servicio de notificaciones
(spec-4).

## 2. Actores

| Actor | Descripción |
|---|---|
| Público (asistente) | Persona que reserva entradas para una función |
| Servicio de programación (spec-1) | Informa si la función existe y cuál es su aforo |
| Servicio de notificaciones (spec-4) | Recibe el aviso de reserva confirmada |
| Servicio de reportes (spec-4) | Consulta las reservas para el reporte de ocupación |

## 3. Historias de usuario

### HU-1 — Reservar entradas (Prioridad P1)
Como **público**, quiero reservar entradas para una función con mi nombre,
correo y la cantidad de entradas, para asegurar mi lugar.

**Criterios de aceptación**
1. Puedo reservar indicando la función, mi nombre, mi correo y la cantidad de
   entradas.
2. El sistema rechaza la reserva si falta un campo, si el correo no tiene un
   formato válido o si la cantidad no es un número entero mayor a 0, e indica
   qué campo está mal.
3. Si la función no existe en la programación, veo el mensaje "La función no existe".
4. Al confirmar, veo un **código de reserva** único y el estado "confirmada".

### HU-2 — No superar el aforo (Prioridad P1)
Como **público**, quiero que el sistema solo acepte reservas mientras haya
cupo, para tener la seguridad de que mi entrada es válida.

**Criterios de aceptación**
1. Antes de guardar la reserva, el sistema consulta el aforo de la función en
   el servicio de programación.
2. Si las entradas ya reservadas (confirmadas) más las que pido superan el
   aforo, la reserva se rechaza con el mensaje "Aforo completo" e indica
   cuántas entradas quedan disponibles.
3. Las reservas canceladas **no cuentan** para el aforo.
4. Si el servicio de programación no responde, la reserva **no se guarda** y
   veo un mensaje claro de que el servicio no está disponible.

### HU-3 — Consultar mi reserva (Prioridad P1)
Como **público**, quiero consultar mi reserva con su código, para revisar los
datos de la función y el estado de mi reserva.

**Criterios de aceptación**
1. Al ingresar un código válido veo la función reservada, mi nombre, la
   cantidad de entradas, la fecha de la reserva y el estado: confirmada o cancelada.
2. Si el código no existe, veo el mensaje "No existe una reserva con ese código".

### HU-4 — Cancelar mi reserva (Prioridad P1)
Como **público**, quiero cancelar mi reserva con su código, para liberar las
entradas si ya no voy a asistir.

**Criterios de aceptación**
1. Al cancelar una reserva confirmada, queda en estado "cancelada" y sus
   entradas vuelven a estar disponibles para otras personas.
2. Solo se pueden cancelar reservas **confirmadas**; una reserva ya cancelada
   no se puede cancelar otra vez.

### HU-5 — Aviso de reserva confirmada (Prioridad P2)
Como **público**, quiero que se registre un aviso con los datos de mi reserva,
para tenerlo en mi bandeja de notificaciones (spec-4).

**Criterios de aceptación**
1. Al confirmar una reserva, el sistema envía un aviso al servicio de
   notificaciones con el correo, el código y los datos de la función.
2. Si el servicio de notificaciones no responde, la reserva **igual queda
   confirmada**; el aviso fallido no deshace la reserva.

### HU-6 — Consulta de reservas por otros servicios (Prioridad P2)
Como **servicio de reportes (spec-4)**, quiero consultar las reservas por una
API, para generar los reportes de ocupación por función y de funciones más
reservadas.

**Criterios de aceptación**
1. La API devuelve la lista de reservas con filtro opcional por función y por estado.
2. La API devuelve, por cada función, el total de entradas reservadas (confirmadas).

## 4. Requisitos funcionales

| ID | Requisito |
|---|---|
| FR-001 | El sistema debe permitir registrar una reserva con función, nombre, correo y cantidad, y validarlos. |
| FR-002 | El sistema debe consultar la función en programación (`GET /funciones/:id` de spec-1) antes de reservar. |
| FR-003 | El sistema debe impedir que las entradas confirmadas de una función superen su aforo. |
| FR-004 | El sistema debe generar un código único por reserva y asignarle el estado inicial "confirmada". |
| FR-005 | El sistema debe permitir consultar una reserva por su código. |
| FR-006 | El sistema debe permitir cancelar solo reservas confirmadas, liberando sus entradas. |
| FR-007 | El sistema debe enviar un aviso a notificaciones (spec-4) al confirmar una reserva, sin que un fallo del aviso deshaga la reserva. |
| FR-008 | El sistema debe exponer sus datos por una API REST documentada en `contracts/`, incluido el total de entradas por función. |
| FR-009 | El sistema debe precargar reservas de ejemplo para la demostración. |

## 5. Requisitos no funcionales

| ID | Requisito |
|---|---|
| NFR-001 | El servicio guarda sus datos en su propia base SQLite y nunca lee la base de otro servicio. |
| NFR-002 | Las respuestas usan JSON y códigos HTTP estándar (200, 201, 400, 404, 409, 503). |
| NFR-003 | Si programación no está disponible al reservar, el servicio responde 503 sin caerse. |
| NFR-004 | El frontend accede al servicio solo a través del API Gateway. |

## 6. Entidades del dominio

- **Reserva:** id, código, funcionId, nombre, correo, cantidad, estado
  (confirmada / cancelada), fecha de reserva, fecha de cancelación.

Relación con otros contextos: `funcionId` apunta a la función en programación
(spec-1) **solo por id**, sin clave foránea entre bases de datos.

## 7. Fuera de alcance

- Login y cuentas de usuario.
- Pagos en línea (las funciones con precio se pagan en taquilla).
- Elección de asientos numerados: solo se controla la cantidad de entradas.
- Lista de espera cuando el aforo está completo.
- Envío real de correos (spec-4 solo registra las notificaciones).

## 8. Preguntas abiertas para el equipo

1. ¿Hay un **máximo de entradas** por reserva?
2. ¿Se puede reservar o cancelar una función que **ya pasó**?
3. ¿Qué formato tendrá el aviso a `POST /notificaciones`? Depende del contrato de spec-4.
4. ¿Se debe avisar a spec-4 también cuando se **cancela** una reserva?

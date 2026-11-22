# Spec-1: Programación del festival

- **Rama:** `spec-1`
- **Responsable:** Jorge Beltrán
- **Estado:** Aprobada
- **Microservicio:** `programacion-service` (+ `api-gateway`)

## 1. Contexto

El FIAVL se desarrolla durante varios días en teatros, centros culturales,
calles, plazas y parques de Loja, con obras de teatro, danza, música, circo,
títeres y artes visuales de compañías nacionales e internacionales. El público
necesita saber **qué obra se presenta, dónde y cuándo**, y la organización
necesita registrar esa información en un solo lugar del que dependan las demás
partes del sistema (convocatoria, reservas y reportes).

## 2. Actores

| Actor | Descripción |
|---|---|
| Público | Persona que consulta la cartelera del festival |
| Administrador | Personal de la organización que registra escenarios, obras y funciones |
| Otros servicios | convocatoria, reservas y notificaciones, que consultan o crean datos de programación |

## 3. Historias de usuario

### HU-1 — Ver la cartelera (Prioridad P1)
Como **público**, quiero ver la lista de funciones del festival con la obra,
el escenario, la fecha y la hora, para decidir a qué espectáculo asistir.

**Criterios de aceptación**
1. Dado que existen funciones registradas, cuando abro la cartelera, veo cada
   función con título de la obra, compañía, disciplina, escenario, fecha y hora.
2. Las funciones aparecen ordenadas por fecha y hora.
3. Cuando filtro por **día**, solo veo las funciones de ese día.
4. Cuando filtro por **disciplina**, solo veo las funciones de esa disciplina.
5. Si no hay funciones que cumplan el filtro, veo el mensaje "No hay funciones
   para este filtro".

### HU-2 — Registrar escenarios (Prioridad P1)
Como **administrador**, quiero registrar los escenarios del festival con su
dirección, tipo y aforo, para poder programar funciones en ellos.

**Criterios de aceptación**
1. Puedo registrar un escenario con nombre, dirección, tipo (teatro, plaza,
   parque, centro cultural, calle) y aforo.
2. El sistema rechaza un aforo menor o igual a 0.
3. El escenario aparece en la lista de escenarios.

### HU-3 — Registrar obras (Prioridad P1)
Como **administrador**, quiero registrar las obras con su compañía, país,
disciplina y duración, para incluirlas en la programación.

**Criterios de aceptación**
1. Puedo registrar una obra con título, compañía, país de origen, disciplina,
   duración en minutos y sinopsis.
2. La disciplina debe ser una de: teatro, danza, música, circo, títeres,
   artes visuales.
3. El sistema rechaza una obra sin título o sin compañía.

### HU-4 — Programar funciones (Prioridad P1)
Como **administrador**, quiero programar una función (una obra en un escenario,
en una fecha y hora), para que aparezca en la cartelera.

**Criterios de aceptación**
1. Puedo crear una función eligiendo una obra, un escenario, fecha y hora.
2. El aforo de la función es, por defecto, el aforo del escenario.
3. Puedo indicar si la función es **gratuita** o tiene un **precio**.
4. El sistema **rechaza** una función si el escenario ya tiene otra función que
   se cruza en horario (según la duración de la obra).
5. El sistema rechaza fechas fuera del periodo del festival.

### HU-5 — Consulta de programación por otros servicios (Prioridad P1)
Como **servicio de reservas, convocatoria o reportes**, quiero consultar y
crear datos de programación por una API, para no duplicar información.

**Criterios de aceptación**
1. `GET /funciones/:id` devuelve la función con su aforo.
2. `POST /obras` permite que convocatoria cree una obra aprobada.
3. Si el id no existe, la respuesta es 404 con un mensaje claro.

## 4. Requisitos funcionales

| ID | Requisito |
|---|---|
| FR-001 | El sistema debe listar las funciones ordenadas por fecha y hora. |
| FR-002 | El sistema debe permitir filtrar funciones por día y por disciplina. |
| FR-003 | El sistema debe permitir crear y listar escenarios con aforo mayor a 0. |
| FR-004 | El sistema debe permitir crear, listar y consultar obras con disciplina válida. |
| FR-005 | El sistema debe permitir crear funciones asociando obra y escenario existentes. |
| FR-006 | El sistema debe impedir funciones que se crucen en el mismo escenario. |
| FR-007 | El sistema debe impedir funciones fuera del periodo del festival (12 al 22 de noviembre de 2026). |
| FR-008 | El sistema debe exponer sus datos por una API REST documentada en `contracts/`. |
| FR-009 | El frontend debe acceder a todos los servicios a través de un único API Gateway. |
| FR-010 | El sistema debe precargar datos de ejemplo para la demostración. |

## 5. Requisitos no funcionales

| ID | Requisito |
|---|---|
| NFR-001 | El servicio guarda sus datos en su propia base SQLite (independencia de datos). |
| NFR-002 | Las respuestas de la API usan JSON y códigos HTTP estándar (200, 201, 400, 404, 409). |
| NFR-003 | Si un servicio interno no está disponible, el gateway responde 503 sin caerse. |
| NFR-004 | La cartelera carga en menos de 2 segundos con 500 funciones. |

## 6. Entidades del dominio

- **Escenario:** id, nombre, dirección, tipo, aforo.
- **Obra:** id, título, compañía, país, disciplina, duración (min), sinopsis.
- **Función:** id, obraId, escenarioId, fecha, hora, aforo, precio (0 = gratuita).

## 7. Fuera de alcance

- Login y cuentas de usuario.
- Postulación de obras (spec-2), reservas (spec-3), notificaciones y reportes (spec-4).
- Pagos en línea.

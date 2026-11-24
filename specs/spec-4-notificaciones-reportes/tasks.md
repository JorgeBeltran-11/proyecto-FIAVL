# Tareas — SPEC-4: Notificaciones y reportes

Las tareas se completan en orden de etapa; las dependencias externas pendientes
se anotan sin modificar contratos ajenos. Cada elemento enlaza los requisitos
funcionales que satisface.

## 1. Documentación

- [x] **T001 — Auditar contratos y definir alcance.** Registrar rutas, campos y
  estados publicados por SPEC-1, SPEC-2 y SPEC-3; identificar brechas sin
  inventar contratos. **FR:** FR-005–FR-010. **Verificación:** referencias
  contractuales y bloqueos explícitos en `spec.md` y `plan.md`.
- [x] **T002 — Definir especificación funcional.** Escribir historias,
  requisitos, criterios, escenarios y errores. **FR:** FR-001–FR-011.
  **Verificación:** todos los requisitos tienen identificador y criterio
  verificable.
- [x] **T003 — Definir arquitectura y OpenAPI.** Documentar persistencia,
  módulos y API propia. **FR:** FR-001–FR-011. **Verificación:** rutas y
  esquemas de `plan.md` coinciden con `contracts/notificaciones-api.yaml`.

## 2. Configuración del servicio

- [x] **T004 — Crear paquete y arranque Express.** Crear scripts, configuración
  de puerto 3004, `app.js`, `server.js` y `/health`. **FR:** FR-011.
  **Verificación:** servicio inicia y su endpoint de salud responde.
- [x] **T005 — Configurar errores y variables de entorno.** Implementar
  middleware central y configuración de dependencias/timeout. **FR:** FR-010,
  FR-011. **Verificación:** fallos de clientes responden 503 y no cierran el
  proceso.

## 3. Base de datos

- [x] **T006 — Crear persistencia SQLite propia.** Crear tabla, índice y
  configuración de ruta mediante `better-sqlite3`. **FR:** FR-003.
  **Verificación:** las tablas se crean en la base aislada del servicio.

## 4. Notificaciones

- [x] **T007 — Implementar validación y registro.** Validar cuerpo, correo,
  tipo, referencia y mensaje; normalizar solo alias no ambiguos y persistir.
  **FR:** FR-001, FR-002, FR-003, FR-005, FR-006.
  **Verificación:** respuesta 201 incluye registro y fecha; entrada inválida
  produce 400 y no persiste.
- [x] **T008 — Implementar bandeja por correo.** Consultar por correo y ordenar
  por fecha descendente. **FR:** FR-004. **Verificación:** no filtra avisos de
  otros correos y devuelve lista vacía si no hay resultados.
- [ ] **T009 — Acordar clasificación de avisos SPEC-2.** Solicitar al
  responsable de SPEC-2 un tipo explícito de aprobación compatible con
  `POSTULACION_APROBADA`. **FR:** FR-006. **Verificación:** registrar la
  decisión del equipo; hasta entonces no inferir el resultado de
  `tipo: postulacion`.

## 5. Reportes

- [x] **T010 — Implementar clientes HTTP.** Consultar rutas publicadas por
  programación, reservas y convocatoria con timeout y validación de respuesta.
  **FR:** FR-007–FR-010. **Verificación:** cada cliente usa los paths y
  estructuras documentados o verificados en el servicio propietario; las
  respuestas HTTP, JSON, timeout, conexión y forma raíz se prueban con mocks
  locales.
- [ ] **T011 — Confirmar el formato de la lista de funciones.** Solicitar a
  SPEC-1 confirmación de que los elementos de `GET /funciones` tienen el
  formato del ejemplo individual. **FR:** FR-007. **Verificación:** respuesta
  del propietario documentada; no crear un formato externo alternativo.
  **Estado:** la implementación actual fue verificada, pero la confirmación
  formal del propietario sigue pendiente; producción permanece condicionada.
- [x] **T012 — Calcular ocupación.** Unir funciones y resumen de reservas,
  incluir funciones sin reservas, calcular porcentaje con aforo positivo y
  controlar referencias/datos incompletos. **FR:** FR-007, FR-010.
  **Verificación:** fórmula correcta y cero entradas probadas; aforo inválido
  o referencia sin función produce HTTP 503 sin reporte parcial.
- [x] **T013 — Generar reporte de demanda.** Ordenar resumen por `entradas`
  descendente y desempatar por `funcion_id`, manteniendo separado `reservas`.
  **FR:** FR-008. **Verificación:** orden y métricas se corresponden con
  `GET /reservas/resumen`; probado con datos simulados.
- [x] **T014 — Generar reporte de postulaciones.** Consultar y validar conteos
  exactos por estado. **FR:** FR-009, FR-010. **Verificación:** respuesta
  coincide con el resumen de convocatoria; servicio ausente da 503. El `total`
  se conserva como lo publica el servicio: SPEC-4 no define una regla para
  recalcularlo.

## 6. Integración

- [x] **T015 — Integrar mediante el Gateway existente.** Verificar proxy
  `/api/notificaciones` sin modificar lógica del Gateway. **FR:** FR-001,
  FR-004, FR-007–FR-011. **Verificación:** pruebas HTTP reales mediante el
  Gateway confirmaron:
  - `GET /api/notificaciones/health`: respuesta correcta.
  - `POST /api/notificaciones/notificaciones`: creación correcta, HTTP 201.
  - `GET /api/notificaciones/notificaciones?correo=...`: consulta correcta.
  - `GET /api/notificaciones/reportes/ocupacion`: HTTP 503 por dependencia de
    reservas no disponible.
  - `GET /api/notificaciones/reportes/funciones-mas-reservadas`: HTTP 503 por
    dependencia de reservas no disponible.
  - `GET /api/notificaciones/reportes/postulaciones-por-estado`: HTTP 503 por
    dependencia de convocatoria no disponible.
  Los HTTP 503 fueron respuestas controladas por dependencias apagadas, no
  errores de enrutamiento del Gateway. No se validaron reportes con datos
  reales de los servicios externos.

## 7. Frontend

- [ ] **T016 — Crear bandeja de notificaciones.** Añadir vista aislada con
  consulta por correo y presentación de los campos persistidos. **FR:** FR-004,
  FR-005, FR-006. **Verificación:** solicitudes usan `frontend/src/api.js`
  y prefijo del Gateway.
- [ ] **T017 — Crear vistas de reportes.** Presentar las tres secciones,
  errores de dependencia y resultados vacíos. **FR:** FR-007–FR-010.
  **Verificación:** no hay llamadas directas a puertos de microservicios.
- [ ] **T018 — Integrar navegación de SPEC-4.** Agregar las vistas al menú
  compartido con cambios mínimos. **FR:** FR-004, FR-007–FR-009.
  **Verificación:** las páginas existentes continúan accesibles.

## 8. Pruebas

- [x] **T019 — Probar notificaciones y persistencia.** Cubrir registro válido,
  campos requeridos, correo inválido, consulta vacía/ordenada y persistencia
  SQLite. **FR:** FR-001–FR-006. **Verificación:** suite `node:test` pasa con
  base temporal.
- [x] **T020 — Probar cálculos y errores de reportes.** Cubrir ocupación,
  orden de demanda, conteos por estado, datos vacíos/incompletos, dependencia
  caída, timeout y HTTP 503. **FR:** FR-007–FR-010. **Verificación:** casos
  unitarios identificados como mocks; no se presentan como integración real.
- [ ] **T021 — Probar integración HTTP disponible.** Ejecutar pruebas reales
  solo con servicios externos levantados y documentar cuáles participaron.
  **FR:** FR-007–FR-010. **Verificación:** las pruebas diferencian claramente
  integración real de unitarias. **Estado:** rutas, controladores, servicios
  y clientes se probaron por HTTP con servidores locales simulados; no se
  ejecutó integración real con convocatoria-service porque no está disponible.

## 9. Documentación final

- [x] **T022 — Documentar ejecución y limitaciones.** Añadir instrucciones,
  endpoints, variables, resultados de pruebas y brechas de coordinación;
  actualizar diagramas Mermaid de arquitectura y secuencias. **FR:** FR-001–
  FR-011. **Verificación:** instrucciones reproducibles y diagramas no alteran
  el diseño de servicios ajenos.

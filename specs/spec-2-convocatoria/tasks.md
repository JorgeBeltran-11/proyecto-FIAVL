# Tareas — Spec-2: Convocatoria de artistas

Leyenda: `[x]` hecha · `[ ]` pendiente · entre paréntesis el requisito que cumple.

## Fase 1 — Especificación
- [x] T001 Redactar `spec.md`
- [x] T002 Redactar `plan.md` y `contracts/convocatoria-api.md` (FR-010)
- [x] T003 Acordar con spec-4 el formato de `POST /notificaciones` (FR-009) — coincide con `notificaciones-api.yaml`
- [x] T004 Aprobación de la spec por el equipo

## Fase 2 — convocatoria-service
- [x] T005 Inicializar `services/convocatoria-service` con Express y `/health`
- [x] T006 Crear tabla y datos de ejemplo en `db.js` (NFR-001, FR-011)
- [x] T007 `POST /postulaciones` con validaciones y código único (FR-001, FR-002)
- [x] T008 Regla: impedir duplicados pendientes → 409 (FR-003)
- [x] T009 `GET /postulaciones/codigo/:codigo` y `GET /postulaciones/:id` (FR-004)
- [x] T010 `GET /postulaciones` con filtros y `GET /postulaciones/resumen` (FR-005, FR-010)
- [x] T011 Cliente de programación y `POST /:id/aprobar` con 502/503 (FR-006, FR-007, NFR-003)
- [x] T012 `POST /:id/rechazar` con motivo obligatorio (FR-008)
- [x] T013 Cliente de notificaciones que no bloquea la decisión (FR-009)

## Fase 3 — Integración
- [x] T014 Agregar el servicio a los scripts `instalar` y `dev` del `package.json` raíz
- [x] T015 Probar el acceso por el gateway (`/api/convocatoria`) (NFR-004)

## Fase 4 — Frontend
- [x] T016 `ConvocatoriaPage`: formulario y consulta por código (HU-1, HU-2)
- [x] T017 `AdminConvocatoriaPage`: lista, filtros, aprobar y rechazar (HU-3, HU-4, HU-5)

## Fase 5 — Arquitectura y cierre
- [x] T018 Actualizar los diagramas 4+1 en `docs/arquitectura/` con spec-2
- [x] T019 Escribir `quickstart.md` y probar los criterios de aceptación con `curl`
- [ ] T020 Abrir Pull Request `spec-2` → `main`

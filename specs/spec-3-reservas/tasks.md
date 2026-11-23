# Tareas — Spec-3: Entradas y reservas

Leyenda: `[x]` hecha · `[ ]` pendiente · entre paréntesis el requisito que cumple.

## Fase 1 — Especificación
- [x] T001 Redactar `spec.md`
- [x] T002 Redactar `plan.md` y `contracts/reservas-api.md` (FR-008)
- [ ] T003 Acordar con spec-4 el formato de `POST /notificaciones` (FR-007)
- [ ] T004 Aprobación de la spec por el equipo

## Fase 2 — reservas-service
- [ ] T005 Inicializar `services/reservas-service` con Express y `/health`
- [ ] T006 Crear tabla y datos de ejemplo en `db.js` (NFR-001, FR-009)
- [ ] T007 Cliente de programación: `GET /funciones/:id` con 404/503 (FR-002, NFR-003)
- [ ] T008 `POST /reservas` con validaciones y código único (FR-001, FR-004)
- [ ] T009 Regla: no superar el aforo, en una transacción → 409 (FR-003)
- [ ] T010 `GET /reservas/codigo/:codigo` (FR-005)
- [ ] T011 `POST /reservas/codigo/:codigo/cancelar` solo si está confirmada (FR-006)
- [ ] T012 `GET /reservas` con filtros y `GET /reservas/resumen` (FR-008)
- [ ] T013 Cliente de notificaciones que no bloquea la reserva (FR-007)

## Fase 3 — Integración
- [ ] T014 Agregar el servicio a los scripts `instalar` y `dev` del `package.json` raíz
- [ ] T015 Probar el acceso por el gateway (`/api/reservas`) (NFR-004)

## Fase 4 — Frontend
- [ ] T016 `ReservasPage`: elegir función, reservar, consultar y cancelar por código (HU-1 a HU-4)

## Fase 5 — Arquitectura y cierre
- [ ] T017 Actualizar los diagramas 4+1 en `docs/arquitectura/` con spec-3
- [ ] T018 Escribir `quickstart.md` y probar los criterios de aceptación con `curl`
- [ ] T019 Abrir Pull Request `spec-3` → `main`

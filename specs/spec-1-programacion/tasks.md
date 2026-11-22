# Tareas — Spec-1: Programación del festival

Leyenda: `[x]` hecha · `[ ]` pendiente · entre paréntesis el requisito que cumple.

## Fase 1 — Base del proyecto
- [x] T001 Crear estructura del repositorio, `.gitignore` y `README.md`
- [x] T002 Redactar la constitución en `.specify/memory/constitution.md`
- [x] T003 Documentar el reparto de specs en `docs/reparto-specs.md`

## Fase 2 — programacion-service
- [x] T004 Inicializar `services/programacion-service` con Express (FR-008)
- [x] T005 Crear tablas y datos de ejemplo en `db.js` (NFR-001, FR-010)
- [x] T006 Endpoints de escenarios con validación de aforo (FR-003)
- [x] T007 Endpoints de obras con validación de disciplina (FR-004)
- [x] T008 Endpoints de funciones con filtros por día y disciplina (FR-001, FR-002, FR-005)
- [x] T009 Regla: impedir cruce de horario en un escenario → 409 (FR-006)
- [x] T010 Regla: impedir fechas fuera del festival → 400 (FR-007)

## Fase 3 — API Gateway
- [x] T011 Crear `services/api-gateway` con proxy a los 4 servicios (FR-009)
- [x] T012 Responder 503 si un servicio no está disponible (NFR-003)
- [x] T013 Endpoint `GET /api/health` con el estado de cada servicio

## Fase 4 — Frontend
- [x] T014 Inicializar `frontend` con React + Vite y menú de navegación
- [x] T015 Página de cartelera con filtros (HU-1)
- [x] T016 Página de administración de programación (HU-2, HU-3, HU-4)

## Fase 5 — Arquitectura y cierre
- [x] T017 Documentar el modelo 4+1 con Mermaid en `docs/arquitectura/`
- [x] T018 Probar los criterios de aceptación con `curl` (ver `quickstart.md`)
- [ ] T019 Abrir Pull Request `spec-1` → `main`

# Constitución del proyecto FIAVL

Plataforma web para el **Festival Internacional de Artes Vivas Loja (FIAVL)**.
Este documento fija las reglas que todas las specs deben respetar. Ninguna spec
puede contradecirlo; si hace falta cambiarlo, se discute en equipo y se modifica
por Pull Request a `main`.

## Principio I — Specification-Driven Development (SDD)

1. Ningún código se escribe sin una especificación aprobada.
2. Cada spec sigue el ciclo: `spec.md` → `plan.md` → `tasks.md` → implementación.
3. La spec describe **qué** y **por qué** (sin tecnología). El plan describe **cómo**.
4. Cada requisito funcional tiene un identificador (`FR-xxx`) y cada tarea
   indica qué requisito cumple.

## Principio II — Arquitectura de microservicios

1. Cada spec es dueña de **un microservicio** independiente.
2. Cada microservicio tiene **su propia base de datos** (SQLite). Ningún
   servicio lee la base de datos de otro.
3. Los servicios se comunican **solo por HTTP/JSON** mediante los contratos
   publicados en `specs/<spec>/contracts/`.
4. El frontend nunca llama directamente a un servicio: todo pasa por el
   **API Gateway** (`http://localhost:3000/api/...`).
5. Si un servicio del que dependes no responde, tu servicio debe devolver un
   error claro (HTTP 503) y no caerse.

## Principio III — Stack tecnológico común

| Capa | Tecnología |
|---|---|
| Servicios | Node.js 20+ y Express |
| Persistencia | SQLite (`better-sqlite3`), un archivo `.db` por servicio |
| Gateway | Express + `http-proxy-middleware` |
| Frontend | React + Vite |
| Diagramas | Mermaid (dentro de los `.md`) |

## Principio IV — Puertos asignados

| Componente | Puerto | Spec |
|---|---|---|
| API Gateway | 3000 | spec-1 |
| programacion-service | 3001 | spec-1 |
| convocatoria-service | 3002 | spec-2 |
| reservas-service | 3003 | spec-3 |
| notificaciones-service | 3004 | spec-4 |
| frontend | 5173 | compartido |

## Principio V — Flujo de trabajo con ramas

1. `main` siempre debe funcionar. Nadie hace commit directo a `main`.
2. Cada integrante trabaja en su rama: `spec-1`, `spec-2`, `spec-3`, `spec-4`.
3. La integración se hace con **Pull Request** hacia `main`, revisado por al
   menos otro integrante.
4. Mensajes de commit con prefijo: `docs:`, `feat:`, `fix:`, `chore:`.
5. Antes de abrir el PR: `git pull origin main` y resolver conflictos en tu rama.

## Principio VI — Simplicidad

Se busca un prototipo funcional y claro, no un producto final. Sin
autenticación de usuarios: las acciones de administración se hacen desde
pantallas marcadas como "Administración".

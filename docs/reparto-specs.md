# Reparto de specs

Cada integrante es dueño de una spec, una rama y un microservicio.

| Spec | Rama | Microservicio | Puerto | Responsable |
|---|---|---|---|---|
| spec-1 — Programación del festival + base | `spec-1` | `programacion-service` + `api-gateway` | 3001 / 3000 | Jorge Beltrán |
| spec-2 — Convocatoria de artistas | `spec-2` | `convocatoria-service` | 3002 | _(por asignar)_ |
| spec-3 — Entradas y reservas | `spec-3` | `reservas-service` | 3003 | Julio Cesar |
| spec-4 — Notificaciones y reportes | `spec-4` | `notificaciones-service` | 3004 | _(por asignar)_ |

## spec-1 — Programación del festival (base del proyecto)

- Estructura del repositorio, constitución y API Gateway.
- Gestión de **escenarios** (teatros, plazas, parques) con su aforo.
- Gestión de **obras** (título, compañía, país, disciplina, duración).
- Gestión de **funciones** (una obra en un escenario, en una fecha y hora).
- **Cartelera pública** filtrable por día y disciplina.
- Expone los contratos que usan spec-2, spec-3 y spec-4.

## spec-2 — Convocatoria de artistas

- Formulario público para que una compañía **postule una obra** al festival.
- Panel de administración para **revisar, aprobar o rechazar** postulaciones.
- Al **aprobar**, crea la obra en `programacion-service` (`POST /obras`).
- Consulta del estado de una postulación por código.

## spec-3 — Entradas y reservas

- El asistente **reserva entradas** para una función con nombre, correo y cantidad.
- Antes de reservar consulta `GET /funciones/:id` en `programacion-service` para
  conocer el aforo, y **no permite superar el aforo**.
- Genera un código de reserva; permite consultar y cancelar la reserva.
- Al confirmar, avisa a `notificaciones-service` (`POST /notificaciones`).

## spec-4 — Notificaciones y reportes

- Recibe y guarda notificaciones (confirmación de reserva, aprobación de
  postulación) y las muestra en una bandeja por correo.
- **Reportes** para administración: ocupación por función, funciones más
  reservadas, postulaciones por estado.
- Obtiene los datos consultando los otros servicios por HTTP.

## Cómo empezar tu spec

```powershell
git clone https://github.com/JorgeBeltran-11/proyecto-FIAVL.git
cd proyecto-FIAVL
git checkout main
git pull origin main
git checkout -b spec-2        # usa el número de tu spec
```

1. Copia `specs/spec-1-programacion/` como ejemplo de formato.
2. Escribe tu `spec.md` → `plan.md` → `tasks.md` (en ese orden).
3. Crea tu servicio en `services/<tu-servicio>/` copiando la estructura de
   `services/programacion-service/`.
4. Agrega tu pantalla en `frontend/src/pages/`.
5. Actualiza los diagramas de `docs/arquitectura/` con tu servicio.
6. Sube tu rama y abre un Pull Request a `main`.

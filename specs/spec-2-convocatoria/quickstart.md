# Quickstart — Spec-2

## Requisitos
- Node.js 20 o superior (`node -v`)

## Levantar todo (desde la raíz del repo)

```powershell
npm run instalar   # la primera vez, o si se agregó un servicio nuevo
npm run dev        # gateway :3000 + programacion :3001 + convocatoria :3002 + reservas :3003 + frontend :5173
```

Abrir http://localhost:5173 → menús **Convocatoria** y **Admin · Convocatoria**.

> Para que se registren los avisos (HU-6) también debe estar levantado
> `notificaciones-service` (:3004): `npm start --prefix services/notificaciones-service`.
> Si no lo está, aprobar y rechazar funcionan igual y responden `"notificacion": "no enviada"`.

## Datos de ejemplo

| id | Código | Obra | Estado |
|---|---|---|---|
| 1 | CONV-DEMO01 | Raíces del Sur | aprobada (obra 1 de programación) |
| 2 | CONV-DEMO02 | Voces del Río | rechazada |
| 3 | CONV-DEMO03 | Cuerpos en Tránsito | pendiente |
| 4 | CONV-DEMO04 | El Gran Malabar | pendiente |
| 5 | CONV-DEMO05 | Cuerdas de la Sierra | pendiente |

Para volver a estos datos, borrar `services/convocatoria-service/convocatoria.db` y reiniciar.

## Probar los criterios de aceptación (PowerShell)

```powershell
$G = "http://localhost:3000/api/convocatoria/postulaciones"

# HU-1: postular → 201 con código CONV-XXXXXX
Invoke-RestMethod $G -Method Post -ContentType "application/json" `
  -Body '{"titulo":"Raíces","compania":"Colectivo Andino","pais":"Perú","disciplina":"danza","duracion_min":60,"sinopsis":"...","responsable":"Ana Quispe","correo":"ana@colectivoandino.pe"}'

# HU-1: repetir la misma postulación → 409 (duplicada)
# HU-1: sin compañía o con correo inválido → 400 indicando el campo

# HU-2: consultar por código (la rechazada muestra el motivo)
Invoke-RestMethod "$G/codigo/CONV-DEMO02"

# HU-3: lista con filtros
Invoke-RestMethod "$G?estado=pendiente"
Invoke-RestMethod "$G?disciplina=danza"

# HU-4: aprobar → crea la obra en programación
Invoke-RestMethod "$G/4/aprobar" -Method Post
Invoke-RestMethod "http://localhost:3000/api/programacion/obras"

# HU-4: aprobar otra vez → 409 (ya no está pendiente)

# HU-5: rechazar sin motivo → 400; con motivo → 200
Invoke-RestMethod "$G/3/rechazar" -Method Post -ContentType "application/json" -Body '{"motivo":"Supera el presupuesto"}'

# HU-7: resumen para spec-4
Invoke-RestMethod "$G/resumen"
```

## Probar los fallos

| Prueba | Resultado esperado |
|---|---|
| Apagar `programacion-service` y aprobar | 503, la postulación sigue **pendiente** (FR-007) |
| Apagar `notificaciones-service` y aprobar | 200 con `"notificacion": "no enviada"` (FR-009) |
| Apagar `convocatoria-service` y llamar por el gateway | 503 `Servicio convocatoria no disponible` |

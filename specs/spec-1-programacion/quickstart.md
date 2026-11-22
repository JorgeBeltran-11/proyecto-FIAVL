# Quickstart — Spec-1

## Requisitos
- Node.js 20 o superior (`node -v`)

## Levantar todo (PowerShell, desde la raíz del repo)

```powershell
npm run instalar   # solo la primera vez
npm run dev        # gateway :3000 + programacion :3001 + frontend :5173
```

Abrir http://localhost:5173

## Probar los criterios de aceptación (PowerShell)

```powershell
$G = "http://localhost:3000/api"

# Estado de los servicios
Invoke-RestMethod "$G/health"

# HU-1: cartelera completa y filtrada
Invoke-RestMethod "$G/programacion/funciones"
Invoke-RestMethod "$G/programacion/funciones?fecha=2026-11-14"
Invoke-RestMethod "$G/programacion/funciones?disciplina=danza"

# HU-2: aforo inválido → 400
Invoke-RestMethod "$G/programacion/escenarios" -Method Post -ContentType "application/json" `
  -Body '{"nombre":"X","direccion":"Y","tipo":"plaza","aforo":0}'

# HU-4: cruce de horario → 409 (ya hay una función a las 19:30 del 14 nov en el escenario 1)
Invoke-RestMethod "$G/programacion/funciones" -Method Post -ContentType "application/json" `
  -Body '{"obra_id":1,"escenario_id":1,"fecha":"2026-11-14","hora":"20:00"}'

# HU-4: fecha fuera del festival → 400
Invoke-RestMethod "$G/programacion/funciones" -Method Post -ContentType "application/json" `
  -Body '{"obra_id":1,"escenario_id":1,"fecha":"2026-12-01","hora":"20:00"}'

# NFR-003: servicio aún no implementado → 503
Invoke-RestMethod "$G/reservas/reservas"
```

## Resultados obtenidos

| Prueba | Esperado | Obtenido |
|---|---|---|
| Cartelera completa | 6 funciones ordenadas | ✅ |
| Filtro por día 14 nov | 2 funciones | ✅ |
| Filtro danza | 1 función | ✅ |
| Aforo 0 | 400 | ✅ |
| Disciplina inválida | 400 | ✅ |
| Cruce de horario | 409 | ✅ |
| Fecha fuera del festival | 400 | ✅ |
| Función inexistente | 404 | ✅ |
| Servicio caído vía gateway | 503 | ✅ |

Para volver a los datos de ejemplo, borra `services/programacion-service/programacion.db`
y reinicia el servicio.

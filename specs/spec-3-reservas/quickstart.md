# Quickstart — Spec-3

## Requisitos
- Node.js 20 o superior (`node -v`)

## Levantar todo (PowerShell, desde la raíz del repo)

```powershell
npm run instalar   # solo la primera vez
npm run dev        # gateway :3000 + programacion :3001 + reservas :3003 + frontend :5173
```

Abrir http://localhost:5173 → pestaña **Mis reservas**.

> Si `npm` avisa que `better-sqlite3` tiene *install scripts* sin aprobar (npm 11+),
> ejecuta `npm rebuild better-sqlite3 --prefix services/reservas-service`
> (y lo mismo para `programacion-service`).

## Probar los criterios de aceptación (PowerShell)

```powershell
$G = "http://localhost:3000/api/reservas/reservas"

# HU-1: reservar → 201 con código RES-XXXXXX
Invoke-RestMethod $G -Method Post -ContentType "application/json" `
  -Body '{"funcion_id":2,"nombre":"María Torres","correo":"maria@correo.com","cantidad":2}'

# HU-1: correo inválido → 400
Invoke-RestMethod $G -Method Post -ContentType "application/json" `
  -Body '{"funcion_id":2,"nombre":"X","correo":"malo","cantidad":2}'

# HU-1: función inexistente → 404
Invoke-RestMethod $G -Method Post -ContentType "application/json" `
  -Body '{"funcion_id":999,"nombre":"X","correo":"a@b.co","cantidad":1}'

# HU-2: superar el aforo (función 2 tiene aforo 500) → 409 con "disponibles"
Invoke-RestMethod $G -Method Post -ContentType "application/json" `
  -Body '{"funcion_id":2,"nombre":"X","correo":"a@b.co","cantidad":600}'

# HU-3: consultar por código (reservas de ejemplo RES-DEMO01 … RES-DEMO06)
Invoke-RestMethod "$G/codigo/RES-DEMO01"

# HU-4: cancelar → 200; cancelar otra vez → 409
Invoke-RestMethod "$G/codigo/RES-DEMO03/cancelar" -Method Post
Invoke-RestMethod "$G/codigo/RES-DEMO03/cancelar" -Method Post

# HU-6: lista con filtros y resumen por función (para spec-4)
Invoke-RestMethod "$G`?funcion_id=1&estado=confirmada"
Invoke-RestMethod "$G/resumen"
```

## Resultados obtenidos

Probado el 2026-11-23 a través del gateway, con programación y reservas levantados.

| Prueba | Esperado | Obtenido |
|---|---|---|
| Reserva válida | 201 + código `RES-XXXXXX`, estado confirmada | ✅ |
| Falta nombre / correo inválido / cantidad 0 o 2.5 | 400 con el campo | ✅ |
| JSON mal formado | 400 | ✅ |
| Función inexistente | 404 "La función no existe" | ✅ |
| Cantidad mayor al cupo | 409 "Aforo completo" + `disponibles` | ✅ |
| Llenar el aforo exacto y pedir 1 más | 201 y luego 409 con 0 disponibles | ✅ |
| Consulta por código (también en minúsculas) | 200 con datos de la función | ✅ |
| Código inexistente | 404 | ✅ |
| Cancelar / cancelar dos veces | 200 / 409 | ✅ |
| Tras cancelar, las entradas vuelven a estar disponibles | 201 | ✅ |
| Filtro de estado inválido | 400 | ✅ |
| Resumen por función | ordenado de más a menos entradas | ✅ |
| Notificaciones caído | 201 con `"notificacion": "no enviada"` | ✅ |
| Notificaciones activo (servidor de prueba en :3004) | 201 con `"notificacion": "enviada"` y aviso `tipo: reserva` | ✅ |
| Programación caída al reservar | 503, no se guarda | ✅ |
| Programación caída al consultar | 200 con `"funcion": null` | ✅ |

Para volver a los datos de ejemplo, borra `services/reservas-service/reservas.db`
y reinicia el servicio.

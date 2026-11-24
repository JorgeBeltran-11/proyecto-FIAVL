# Contrato — reservas-service (puerto 3003)

Desde el frontend se usa a través del gateway: `http://localhost:3000/api/reservas/...`
Entre servicios se llama directo: `http://localhost:3003/...`

## Valores permitidos

- `estado`: `confirmada`, `cancelada`
- `cantidad`: entero mayor a 0
- `codigo`: `RES-` seguido de 6 caracteres `A-Z0-9`

## Reservas

| Método | Ruta | Descripción | Respuestas |
|---|---|---|---|
| POST | `/reservas` | Reserva entradas para una función (público) | 201, 400, 404, 409, 503 |
| GET | `/reservas?funcion_id=&estado=` | Lista (**usado por spec-4**) | 200, 400 |
| GET | `/reservas/resumen` | Entradas confirmadas por función (**usado por spec-4**) | 200 |
| GET | `/reservas/codigo/:codigo` | Consulta pública por código | 200, 404 |
| POST | `/reservas/codigo/:codigo/cancelar` | Cancela la reserva y libera las entradas | 200, 404, 409 |

```json
// POST /reservas
{ "funcion_id": 2, "nombre": "María Torres", "correo": "maria@correo.com", "cantidad": 2 }

// → 201
{ "id": 8, "codigo": "RES-4F7KQ2", "funcion_id": 2, "cantidad": 2,
  "estado": "confirmada", "fecha_reserva": "2026-11-23T15:00:00Z", "notificacion": "enviada" }
// "notificacion" puede ser "no enviada" si spec-4 no respondió; la reserva igual queda.
```

```json
// POST /reservas → 409 (sin cupo)
{ "error": "Aforo completo: quedan 3 entradas para esta función", "disponibles": 3 }
```

```json
// GET /reservas/codigo/RES-4F7KQ2  → 200
{ "id": 8, "codigo": "RES-4F7KQ2", "funcion_id": 2, "nombre": "María Torres",
  "correo": "maria@correo.com", "cantidad": 2, "estado": "confirmada",
  "fecha_reserva": "...", "fecha_cancelacion": null,
  "funcion": { "fecha": "2026-11-13", "hora": "20:00",
               "obra": "El último viaje", "escenario": "Teatro Bolívar" } }
// "funcion" se completa con GET /funciones/:id de spec-1; es null si programación no responde.
```

```json
// GET /reservas/resumen  → 200
[ { "funcion_id": 2, "entradas": 120, "reservas": 48 },
  { "funcion_id": 1, "entradas": 75,  "reservas": 30 } ]
// Solo cuenta reservas confirmadas; ordenado de más a menos entradas.
```

```json
// POST /reservas/codigo/RES-4F7KQ2/cancelar  → 200
{ "id": 8, "codigo": "RES-4F7KQ2", "estado": "cancelada", "fecha_cancelacion": "..." }
```

## Llamadas que este servicio hace a otros

| Destino | Llamada | Cuándo |
|---|---|---|
| programacion-service (spec-1) | `GET /funciones/:id` (usa `aforo`, fecha, hora, obra y escenario) | Al reservar y al consultar por código |
| notificaciones-service (spec-4) | `POST /notificaciones` | Al confirmar una reserva |

Formato **provisional** del aviso a spec-4 (por acordar con su responsable):

```json
{ "tipo": "reserva", "correo": "maria@correo.com",
  "referencia": "RES-4F7KQ2",
  "mensaje": "Reserva confirmada: 2 entradas para \"El último viaje\", 13/11 20:00, Teatro Bolívar." }
// tipo "reserva" como en la vista de procesos; mismo formato que usa spec-2
```

## Errores

Todos los errores responden `{ "error": "mensaje" }`.

| Código | Cuándo |
|---|---|
| 400 | Datos faltantes o inválidos, filtro inválido |
| 404 | La función no existe en programación, o no existe una reserva con ese código |
| 409 | Aforo completo, o la reserva ya está cancelada |
| 503 | Programación no está disponible al reservar |

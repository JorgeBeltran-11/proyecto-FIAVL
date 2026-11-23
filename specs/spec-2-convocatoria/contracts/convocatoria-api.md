# Contrato — convocatoria-service (puerto 3002)

Desde el frontend se usa a través del gateway: `http://localhost:3000/api/convocatoria/...`
Entre servicios se llama directo: `http://localhost:3002/...`

## Valores permitidos

- `disciplina`: `teatro`, `danza`, `musica`, `circo`, `titeres`, `artes-visuales` (igual que spec-1)
- `estado`: `pendiente`, `aprobada`, `rechazada`
- `codigo`: `CONV-` seguido de 6 caracteres `A-Z0-9`

## Postulaciones

| Método | Ruta | Descripción | Respuestas |
|---|---|---|---|
| POST | `/postulaciones` | Envía una postulación (público) | 201, 400, 409 |
| GET | `/postulaciones?estado=&disciplina=` | Lista (administración y **spec-4**) | 200, 400 |
| GET | `/postulaciones/resumen` | Conteo por estado (**usado por spec-4**) | 200 |
| GET | `/postulaciones/codigo/:codigo` | Consulta pública por código (compañía) | 200, 404 |
| GET | `/postulaciones/:id` | Una postulación (administración) | 200, 404 |
| POST | `/postulaciones/:id/aprobar` | Aprueba y crea la obra en spec-1 | 200, 404, 409, 502, 503 |
| POST | `/postulaciones/:id/rechazar` | Rechaza con motivo | 200, 400, 404, 409 |

```json
// POST /postulaciones   (video_url es opcional)
{ "titulo": "Raíces", "compania": "Colectivo Andino", "pais": "Perú",
  "disciplina": "danza", "duracion_min": 60, "sinopsis": "...",
  "responsable": "Ana Quispe", "correo": "ana@colectivoandino.pe",
  "video_url": "https://youtu.be/..." }

// → 201
{ "id": 5, "codigo": "CONV-7K2Q9M", "estado": "pendiente", "fecha_envio": "2026-11-22T16:00:00Z" }
```

```json
// GET /postulaciones/codigo/CONV-7K2Q9M  → 200
{ "id": 5, "codigo": "CONV-7K2Q9M", "titulo": "Raíces", "compania": "Colectivo Andino",
  "pais": "Perú", "disciplina": "danza", "duracion_min": 60, "sinopsis": "...",
  "responsable": "Ana Quispe", "correo": "ana@colectivoandino.pe",
  "video_url": "https://youtu.be/...", "estado": "rechazada",
  "motivo_rechazo": "La obra supera la duración máxima", "fecha_envio": "...",
  "fecha_decision": "...", "obra_id": null }
```

```json
// GET /postulaciones/resumen  → 200
{ "pendiente": 4, "aprobada": 2, "rechazada": 1, "total": 7 }
```

```json
// POST /postulaciones/5/rechazar
{ "motivo": "La obra supera la duración máxima" }
```

```json
// POST /postulaciones/5/aprobar  → 200
{ "id": 5, "codigo": "CONV-7K2Q9M", "estado": "aprobada", "obra_id": 7, "notificacion": "enviada" }
// "notificacion" puede ser "no enviada" si spec-4 no respondió; la aprobación igual queda.
```

## Llamadas que este servicio hace a otros

| Destino | Llamada | Cuándo |
|---|---|---|
| programacion-service (spec-1) | `POST /obras` con `titulo, compania, pais, disciplina, duracion_min, sinopsis` | Al aprobar |
| notificaciones-service (spec-4) | `POST /notificaciones` | Al aprobar o rechazar |

Formato **provisional** del aviso a spec-4 (por acordar con su responsable):

```json
{ "tipo": "postulacion", "correo": "ana@colectivoandino.pe",
  "referencia": "CONV-7K2Q9M",
  "mensaje": "Tu obra \"Raíces\" fue aprobada para el FIAVL 2026." }
// tipo "postulacion" como en la vista de procesos; el resultado va en el mensaje
```

## Errores

Todos los errores responden `{ "error": "mensaje" }`.

| Código | Cuándo |
|---|---|
| 400 | Datos faltantes o inválidos, filtro inválido, rechazo sin motivo |
| 404 | No existe una postulación con ese código |
| 409 | Postulación pendiente duplicada, o la postulación ya no está pendiente |
| 502 | Programación rechazó los datos de la obra |
| 503 | Programación no está disponible al aprobar |

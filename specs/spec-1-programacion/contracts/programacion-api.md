# Contrato — programacion-service (puerto 3001)

Desde el frontend se usa a través del gateway: `http://localhost:3000/api/programacion/...`
Entre servicios se llama directo: `http://localhost:3001/...`

## Valores permitidos

- `disciplina`: `teatro`, `danza`, `musica`, `circo`, `titeres`, `artes-visuales`
- `tipo` de escenario: `teatro`, `plaza`, `parque`, `centro-cultural`, `calle`
- `fecha`: `YYYY-MM-DD` entre `2026-11-12` y `2026-11-22`
- `hora`: `HH:MM` (24 h)

## Escenarios

| Método | Ruta | Descripción | Respuestas |
|---|---|---|---|
| GET | `/escenarios` | Lista escenarios | 200 |
| GET | `/escenarios/:id` | Un escenario | 200, 404 |
| POST | `/escenarios` | Crea escenario | 201, 400 |

```json
// POST /escenarios
{ "nombre": "Teatro Bolívar", "direccion": "Calle Bolívar y Rocafuerte", "tipo": "teatro", "aforo": 600 }
```

## Obras

| Método | Ruta | Descripción | Respuestas |
|---|---|---|---|
| GET | `/obras` | Lista obras | 200 |
| GET | `/obras/:id` | Una obra | 200, 404 |
| POST | `/obras` | Crea obra (**usado por spec-2 al aprobar**) | 201, 400 |

```json
// POST /obras
{ "titulo": "La casa de Bernarda Alba", "compania": "Teatro Ensayo", "pais": "Ecuador",
  "disciplina": "teatro", "duracion_min": 90, "sinopsis": "..." }
```

## Funciones

| Método | Ruta | Descripción | Respuestas |
|---|---|---|---|
| GET | `/funciones?fecha=&disciplina=` | Cartelera (filtros opcionales) | 200 |
| GET | `/funciones/:id` | Una función (**usado por spec-3 para el aforo**) | 200, 404 |
| POST | `/funciones` | Programa una función | 201, 400, 404, 409 |

```json
// POST /funciones   (aforo opcional: por defecto el del escenario; precio 0 = gratuita)
{ "obra_id": 1, "escenario_id": 1, "fecha": "2026-11-14", "hora": "19:00", "precio": 0 }
```

```json
// GET /funciones/1  → 200
{
  "id": 1, "fecha": "2026-11-14", "hora": "19:00", "aforo": 600, "precio": 0,
  "obra": { "id": 1, "titulo": "...", "compania": "...", "disciplina": "teatro", "duracion_min": 90 },
  "escenario": { "id": 1, "nombre": "Teatro Bolívar", "tipo": "teatro" }
}
```

## Errores

Todos los errores responden `{ "error": "mensaje" }`.

| Código | Cuándo |
|---|---|
| 400 | Datos faltantes o inválidos |
| 404 | La obra, escenario o función no existe |
| 409 | La función se cruza con otra en el mismo escenario |

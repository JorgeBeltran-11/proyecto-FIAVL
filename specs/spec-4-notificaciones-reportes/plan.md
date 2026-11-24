# Plan técnico — SPEC-4: Notificaciones y reportes

## 1. Arquitectura

`notificaciones-service` será un proceso Express independiente en el puerto
3004. Guardará notificaciones en su propio archivo SQLite mediante
`better-sqlite3`. El API Gateway, que ya enruta `/api/notificaciones`, será el
único punto de entrada para el frontend.

Los reportes obtendrán datos actualizados de los otros servicios por HTTP/JSON:

| Cliente | Servicio | Llamada contractual | Uso |
|---|---|---|---|
| `programacion.js` | programacion-service :3001 | `GET /funciones` | Aforo y datos descriptivos de funciones |
| `reservas.js` | reservas-service :3003 | `GET /reservas/resumen` | Entradas y reservas confirmadas por función |
| `convocatoria.js` | convocatoria-service :3002 | `GET /postulaciones/resumen` | Conteo por estado |

No se consultarán las bases SQLite externas, no se copiarán sus datos a una
base local ni se usarán datos ficticios como alternativa a errores remotos.
Los clientes fijarán un timeout configurable y validarán el estado HTTP y la
forma mínima del JSON recibido. Fallos de transporte, timeout o respuesta
incompatible se elevarán como dependencia no disponible y se responderán con
HTTP 503.

### Brecha para ocupación

El contrato de programación muestra la forma de una función individual pero no
define explícitamente el cuerpo de `GET /funciones`. La implementación actual
de SPEC-1 devuelve una lista de objetos con esa misma estructura (incluye
`id`, `fecha`, `hora`, `aforo`, `precio`, `obra` anidada y `escenario`
anidado). La solución prevista es unir esa lista con
`/reservas/resumen`, de modo que aparezcan también funciones sin reservas.
Antes de depender de la respuesta en producción, se requiere que SPEC-1
confirme/documente formalmente la forma de la lista en su contrato. No se
modificará el contrato de otro integrante desde esta spec.

### Brecha para avisos de convocatoria

SPEC-2 documenta de forma provisional `tipo: "postulacion"` para aprobaciones
y rechazos por igual. El servicio preservará esa semántica genérica como
`POSTULACION`; solo clasificará como `POSTULACION_APROBADA` un aviso que llegue
con ese tipo explícito. La integración completa para reconocer aprobaciones
requiere coordinar una actualización del contrato con el propietario de SPEC-2.

## 2. Organización propuesta

```text
services/notificaciones-service/
├── package.json
├── src/
│   ├── app.js
│   ├── server.js
│   ├── db.js
│   ├── routes/
│   │   ├── notificaciones.js
│   │   └── reportes.js
│   ├── controllers/
│   │   ├── notificaciones.js
│   │   └── reportes.js
│   ├── services/
│   │   ├── notificaciones.js
│   │   └── reportes.js
│   ├── clients/
│   │   ├── programacion.js
│   │   ├── reservas.js
│   │   └── convocatoria.js
│   └── middleware/
│       └── errores.js
└── test/
    ├── notificaciones.test.js
    └── reportes.test.js
```

`app.js` ensamblará Express y será importable por pruebas sin abrir el puerto.
`server.js` configurará el puerto y arrancará el proceso. Los controladores
adaptarán HTTP a llamadas de servicio; los servicios contendrán validación,
persistencia y agregación; los clientes aislarán HTTP externo.

## 3. Persistencia

Archivo propio: `services/notificaciones-service/notificaciones.db`. La ruta
podrá reemplazarse en pruebas y por variable de entorno.

```sql
CREATE TABLE IF NOT EXISTS notificacion (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  correo TEXT NOT NULL,
  tipo TEXT NOT NULL,
  referencia TEXT NOT NULL,
  mensaje TEXT NOT NULL,
  fecha_creacion TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_notificacion_correo_fecha
  ON notificacion (correo, fecha_creacion DESC);
```

`tipo` es texto extensible, no un `CHECK` cerrado. La solicitud valida los
tipos `RESERVA_CONFIRMADA`, `POSTULACION_APROBADA`, `POSTULACION`, `reserva` y
`postulacion`. `reserva` se normaliza a `RESERVA_CONFIRMADA`;
`postulacion` se normaliza a `POSTULACION`, sin atribuirle aprobación o
rechazo. Se validan correo de hasta 254 caracteres, referencia de 1 a 100 y
mensaje de 1 a 2000 caracteres, de acuerdo con OpenAPI. La fecha se guardará
en UTC ISO-8601. No se agrega un estado de lectura: no está definido en los
contratos de los emisores ni es necesario para la bandeja solicitada.

## 4. API del servicio

El detalle normativo de cuerpos, respuestas y esquemas estará en
[contracts/notificaciones-api.yaml](contracts/notificaciones-api.yaml).
Desde el frontend las rutas pasan por `http://localhost:3000/api/notificaciones`.

| Método | Ruta | Resultado |
|---|---|---|
| GET | `/health` | Estado del proceso |
| POST | `/notificaciones` | Valida y persiste un aviso; responde 201 |
| GET | `/notificaciones?correo=` | Consulta la bandeja ordenada por fecha descendente |
| GET | `/reportes/ocupacion` | Ocupación por función |
| GET | `/reportes/funciones-mas-reservadas` | Orden por entradas confirmadas, con entradas y reservas separadas |
| GET | `/reportes/postulaciones-por-estado` | Conteo de estados de convocatoria |

Todos los errores usarán `{ "error": "mensaje" }`. Los reportes devolverán
HTTP 503 ante dependencia inalcanzable, timeout o respuesta que no cumpla el
contrato.

## 5. Validaciones y clasificación de notificaciones

- El cuerpo debe ser un objeto JSON; correo válido y normalizado para búsqueda.
- `tipo`, `referencia` y `mensaje` deben ser cadenas no vacías; se limitan sus
  longitudes para evitar entradas desproporcionadas.
- Se aceptan los tipos canónicos `RESERVA_CONFIRMADA`,
  `POSTULACION_APROBADA`, el genérico `POSTULACION` y los alias provisionales
  `reserva` y `postulacion`.
- `reserva` se almacena como `RESERVA_CONFIRMADA`; `postulacion` se almacena
  como `POSTULACION`. Nunca se deducirá aprobación o rechazo a partir del
  contenido de `mensaje`.
- Correo de consulta requerido; correo inválido produce HTTP 400.
- Las consultas no exponen direcciones de otros destinatarios.

Se validarán los límites concretos del contrato OpenAPI: correo de hasta 254
caracteres, referencia de 1 a 100 y mensaje de 1 a 2000 caracteres.

## 6. Reportes y reglas de cálculo

### Ocupación

Obtener funciones mediante `GET /funciones` y resumen mediante
`GET /reservas/resumen`. Relacionar por `id` de función y `funcion_id`,
respectivamente. `entradas` cuenta entradas confirmadas. Para cada función
con aforo entero positivo:

```text
ocupacion_porcentaje = entradas_reservadas / aforo * 100
```

Se incluirán funciones con cero entradas. Si el aforo es cero, está ausente o
es inválido, o si un `funcion_id` del resumen de reservas no corresponde a una
función obtenida, el endpoint responderá HTTP 503 con `{ "error": "..." }`;
no devolverá un porcentaje engañoso ni un reporte parcial. Si no puede
determinarse la estructura de `GET /funciones`, se responderá 503 hasta
confirmar el contrato con SPEC-1.

Cada elemento de la respuesta utilizará `id` como `funcion_id`, conservará
`fecha`, `hora` y `aforo`, y expondrá `obra.titulo` como `obra` y
`escenario.nombre` como `escenario`. El valor `entradas_reservadas` proviene
de `entradas` en el resumen de reservas; si no hay elemento para esa función,
será cero. `ocupacion_porcentaje` contiene la fórmula indicada arriba.

### Funciones más reservadas

Usar los objetos exactos de `GET /reservas/resumen`. Ordenar por `entradas`
descendente y `funcion_id` ascendente en empate. Mantener el significado de
`reservas` (cantidad de reservas confirmadas) distinto de `entradas` (cantidad
de entradas confirmadas); no volver a contar reservas individualmente.

### Postulaciones por estado

Devolver los valores `pendiente`, `aprobada`, `rechazada` y `total` recibidos
de `GET /postulaciones/resumen`. Validar que sean conteos numéricos no
negativos. No calcular ni simular un resumen local cuando convocatoria no esté
disponible.

## 7. Manejo de errores y privacidad

El middleware central manejará JSON mal formado (400), errores de validación
(400), rutas desconocidas (404), dependencias HTTP/timeout/respuesta
incompatible o datos remotos inconsistentes para ocupación (503), y errores
inesperados o SQLite (500). Los errores de dependencias se traducirán sin
terminar el proceso. Los clientes usarán `AbortSignal.timeout` de Node.js y no
incluirán mensajes, correos ni cuerpos personales en logs.

## 8. Integración frontend y Gateway

Se añadirán páginas aisladas `BandejaNotificacionesPage` y
`ReportesPage`; solo se llamará al cliente común `frontend/src/api.js` con rutas
`/notificaciones/...`, que resuelve mediante el prefijo `/api` hacia Gateway.
La bandeja consultará por correo y presentará tipo, mensaje, referencia y
fecha. Reportes presentará tablas para ocupación, demanda y estados, con
errores/estados vacíos visibles. No se editará la lógica del Gateway: su
registro actual ya incluye `notificaciones` en el puerto 3004 y proxya
`/api/notificaciones`.

La incorporación de navegación en el `App.jsx` compartido será un cambio
mínimo de integración frontend SPEC-4, después de autorización de esta fase.

## 9. Estrategia de pruebas

El repositorio no declara un framework ni scripts de pruebas. Se propone
`node:test` y `node:assert/strict`, incluidos en Node.js 20, para no agregar
dependencias. Las pruebas HTTP levantarán `app` en un puerto efímero y usarán
SQLite temporal aislada. Los clientes externos se sustituirán en pruebas
unitarias; esos casos se identificarán como unitarios, no como integración
real. Se cubrirán registro, validaciones, orden, aislamiento por correo,
persistencia, cálculo, orden, datos vacíos/incompletos, error externo y HTTP
503. Una prueba de integración real con los servicios remotos solo se
ejecutará cuando dichas dependencias estén disponibles y se identificará como
tal.

## 10. Configuración de ejecución

- `PORT`: puerto HTTP, predeterminado 3004.
- `DATABASE_PATH`: ubicación de la base propia; predeterminada
  `notificaciones.db` dentro del paquete.
- `PROGRAMACION_URL`: predeterminado `http://localhost:3001`.
- `RESERVAS_URL`: predeterminado `http://localhost:3003`.
- `CONVOCATORIA_URL`: predeterminado `http://localhost:3002`.
- `SERVICE_TIMEOUT_MS`: límite de espera de llamadas externas.

La integración futura actualizará los scripts raíz de instalación y ejecución
para incluir solo este servicio, sin cambiar la lógica de otros microservicios.

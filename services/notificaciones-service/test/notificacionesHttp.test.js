const assert = require('node:assert/strict');
const { once } = require('node:events');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { createApp } = require('../src/app');
const { openDatabase } = require('../src/database');
const { createNotificationsRepository } = require('../src/repositories/notificacionesRepository');
const { createNotificationsService } = require('../src/services/notificacionesService');

const aviso = {
  correo: 'persona@ejemplo.com',
  tipo: 'RESERVA_CONFIRMADA',
  referencia: 'RES-123456',
  mensaje: 'Reserva confirmada.',
};

async function iniciarAplicacion(t) {
  const directorio = fs.mkdtempSync(path.join(os.tmpdir(), 'fiavl-notificaciones-http-'));
  const db = openDatabase(path.join(directorio, 'notificaciones.db'));
  const repository = createNotificationsRepository(db);
  const notificacionesService = createNotificationsService(repository);
  const app = createApp({
    notificacionesService,
    reportesService: {
      async obtenerOcupacion() { return []; },
      async obtenerFuncionesMasReservadas() { return []; },
      async obtenerPostulacionesPorEstado() {
        return { pendiente: 0, aprobada: 0, rechazada: 0, total: 0 };
      },
    },
    logger: { error() {} },
  });
  const server = app.listen(0);
  await once(server, 'listening');
  const { port } = server.address();

  t.after(async () => {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
    if (db.open) db.close();
    fs.rmSync(directorio, { recursive: true, force: true });
  });

  return { db, baseUrl: `http://127.0.0.1:${port}` };
}

async function postJson(baseUrl, body) {
  return fetch(`${baseUrl}/notificaciones`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

test('GET /health responde el objeto definido en OpenAPI', async (t) => {
  const { baseUrl } = await iniciarAplicacion(t);

  const response = await fetch(`${baseUrl}/health`);

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    servicio: 'notificaciones-service',
    estado: 'ok',
  });

  const missingRouteResponse = await fetch(`${baseUrl}/ruta-inexistente`);
  assert.equal(missingRouteResponse.status, 404);
  assert.deepEqual(await missingRouteResponse.json(), { error: 'Ruta no encontrada' });
});

test('POST registra y normaliza correo; GET consulta únicamente esa bandeja', async (t) => {
  const { baseUrl } = await iniciarAplicacion(t);

  const createdResponse = await postJson(baseUrl, {
    ...aviso,
    correo: ' Persona@EJEMPLO.COM ',
    tipo: 'reserva',
  });
  const created = await createdResponse.json();

  assert.equal(createdResponse.status, 201);
  assert.equal(created.correo, 'Persona@ejemplo.com');
  assert.equal(created.tipo, 'RESERVA_CONFIRMADA');
  assert.equal(created.referencia, aviso.referencia);
  assert.equal(created.mensaje, aviso.mensaje);
  assert.equal(new Date(created.fecha_creacion).toISOString(), created.fecha_creacion);

  const response = await fetch(`${baseUrl}/notificaciones?correo=${encodeURIComponent('Persona@EJEMPLO.COM')}`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    correo: 'Persona@ejemplo.com',
    total: 1,
    notificaciones: [created],
  });

  const emptyResponse = await fetch(`${baseUrl}/notificaciones?correo=otra%40ejemplo.com`);
  assert.deepEqual(await emptyResponse.json(), {
    correo: 'otra@ejemplo.com',
    total: 0,
    notificaciones: [],
  });
});

test('POST rechaza campos faltantes, correo inválido, tipo desconocido y propiedades extra', async (t) => {
  const { baseUrl } = await iniciarAplicacion(t);
  const campos = ['correo', 'tipo', 'referencia', 'mensaje'];

  for (const campo of campos) {
    const body = { ...aviso };
    delete body[campo];
    const response = await postJson(baseUrl, body);
    assert.equal(response.status, 400, `Debe rechazar el campo faltante ${campo}`);
    assert.equal(typeof (await response.json()).error, 'string');
  }

  for (const body of [
    { ...aviso, correo: 'no-es-correo' },
    { ...aviso, tipo: 'TIPO_DESCONOCIDO' },
    { ...aviso, propiedadExtra: 'no permitida' },
  ]) {
    assert.equal((await postJson(baseUrl, body)).status, 400);
  }

  const inboxResponse = await fetch(`${baseUrl}/notificaciones?correo=${encodeURIComponent(aviso.correo)}`);
  assert.equal((await inboxResponse.json()).total, 0);
});

test('POST acepta límites OpenAPI y rechaza cada valor que los excede', async (t) => {
  const { baseUrl } = await iniciarAplicacion(t);
  const correoMaximo = `${'a'.repeat(64)}@${'b'.repeat(63)}.${'c'.repeat(63)}.${'d'.repeat(61)}`;
  const valoresMaximos = {
    ...aviso,
    correo: correoMaximo,
    referencia: 'R'.repeat(100),
    mensaje: 'm'.repeat(2000),
  };
  assert.equal((await postJson(baseUrl, valoresMaximos)).status, 201);

  for (const body of [
    { ...aviso, correo: `${correoMaximo}x` },
    { ...aviso, referencia: 'R'.repeat(101) },
    { ...aviso, mensaje: 'm'.repeat(2001) },
  ]) {
    assert.equal((await postJson(baseUrl, body)).status, 400);
  }
});

test('GET rechaza correo ausente o inválido y JSON mal formado responde 400', async (t) => {
  const { baseUrl } = await iniciarAplicacion(t);

  assert.equal((await fetch(`${baseUrl}/notificaciones`)).status, 400);
  assert.equal((await fetch(`${baseUrl}/notificaciones?correo=invalido`)).status, 400);

  const malformedResponse = await fetch(`${baseUrl}/notificaciones`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{',
  });
  assert.equal(malformedResponse.status, 400);
  assert.equal(typeof (await malformedResponse.json()).error, 'string');
});

test('los errores de persistencia responden 500 sin tumbar la aplicación', async (t) => {
  const { db, baseUrl } = await iniciarAplicacion(t);
  db.close();

  const response = await postJson(baseUrl, aviso);
  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { error: 'Error interno del servidor' });

  const inboxResponse = await fetch(`${baseUrl}/notificaciones?correo=${encodeURIComponent(aviso.correo)}`);
  assert.equal(inboxResponse.status, 500);
  assert.deepEqual(await inboxResponse.json(), { error: 'Error interno del servidor' });

  const healthResponse = await fetch(`${baseUrl}/health`);
  assert.equal(healthResponse.status, 200);
});

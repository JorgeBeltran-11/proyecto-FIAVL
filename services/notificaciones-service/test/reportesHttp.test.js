const assert = require('node:assert/strict');
const http = require('node:http');
const { once } = require('node:events');
const test = require('node:test');
const { createConvocatoriaClient } = require('../src/clients/convocatoriaClient');
const { createProgramacionClient } = require('../src/clients/programacionClient');
const { createReservasClient } = require('../src/clients/reservasClient');
const { createApp } = require('../src/app');
const { createReportesService } = require('../src/services/reportesService');

const funciones = [
  {
    id: 2,
    fecha: '2026-11-14',
    hora: '19:00',
    aforo: 100,
    obra: { titulo: 'Obra B' },
    escenario: { nombre: 'Sala B' },
  },
  {
    id: 1,
    fecha: '2026-11-15',
    hora: '20:00',
    aforo: 50,
    obra: { titulo: 'Obra A' },
    escenario: { nombre: 'Sala A' },
  },
];

const resumenReservas = [
  { funcion_id: 2, entradas: 25, reservas: 8 },
  { funcion_id: 1, entradas: 10, reservas: 6 },
];

const resumenPostulaciones = {
  pendiente: 2,
  aprobada: 1,
  rechazada: 3,
  total: 6,
};

async function iniciarServidor(t, handler) {
  const server = http.createServer((req, res) => handler(req, res));
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const { port } = server.address();

  t.after(async () => {
    server.closeAllConnections();
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  });

  return { server, baseUrl: `http://127.0.0.1:${port}` };
}

function responderJson(res, status, value) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(value));
}

async function iniciarApi(t, upstreamUrl) {
  const reportesService = createReportesService({
    programacionClient: createProgramacionClient({ baseUrl: upstreamUrl }),
    reservasClient: createReservasClient({ baseUrl: upstreamUrl }),
    convocatoriaClient: createConvocatoriaClient({ baseUrl: upstreamUrl }),
  });
  const app = createApp({
    notificacionesService: {
      registrar() { throw new Error('No se usa en esta prueba'); },
      consultar() { throw new Error('No se usa en esta prueba'); },
    },
    reportesService,
    logger: { error() {} },
  });
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const { port } = server.address();

  t.after(async () => {
    server.closeAllConnections();
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  });

  return `http://127.0.0.1:${port}`;
}

test('las tres rutas HTTP integran controladores, reportes y clientes HTTP locales', async (t) => {
  const rutasConsultadas = [];
  const { baseUrl: upstreamUrl } = await iniciarServidor(t, (req, res) => {
    rutasConsultadas.push(req.url);
    if (req.url === '/funciones') return responderJson(res, 200, funciones);
    if (req.url === '/reservas/resumen') return responderJson(res, 200, resumenReservas);
    if (req.url === '/postulaciones/resumen') {
      return responderJson(res, 200, resumenPostulaciones);
    }
    return responderJson(res, 404, { error: 'Ruta no encontrada' });
  });
  const apiUrl = await iniciarApi(t, upstreamUrl);

  const ocupacionResponse = await fetch(`${apiUrl}/reportes/ocupacion`);
  assert.equal(ocupacionResponse.status, 200);
  assert.deepEqual(await ocupacionResponse.json(), [
    {
      funcion_id: 2,
      fecha: '2026-11-14',
      hora: '19:00',
      obra: 'Obra B',
      escenario: 'Sala B',
      aforo: 100,
      entradas_reservadas: 25,
      ocupacion_porcentaje: 25,
    },
    {
      funcion_id: 1,
      fecha: '2026-11-15',
      hora: '20:00',
      obra: 'Obra A',
      escenario: 'Sala A',
      aforo: 50,
      entradas_reservadas: 10,
      ocupacion_porcentaje: 20,
    },
  ]);

  const demandaResponse = await fetch(`${apiUrl}/reportes/funciones-mas-reservadas`);
  assert.equal(demandaResponse.status, 200);
  assert.deepEqual(await demandaResponse.json(), [
    { funcion_id: 2, entradas: 25, reservas: 8 },
    { funcion_id: 1, entradas: 10, reservas: 6 },
  ]);

  const postulacionesResponse = await fetch(`${apiUrl}/reportes/postulaciones-por-estado`);
  assert.equal(postulacionesResponse.status, 200);
  assert.deepEqual(await postulacionesResponse.json(), resumenPostulaciones);
  assert.deepEqual(rutasConsultadas.sort(), [
    '/funciones',
    '/postulaciones/resumen',
    '/reservas/resumen',
    '/reservas/resumen',
  ]);
});

test('las rutas responden 503 sin filtrar errores externos ni devolver datos parciales', async (t) => {
  const { baseUrl: upstreamUrl } = await iniciarServidor(t, (req, res) => {
    if (req.url === '/funciones') return responderJson(res, 200, [funciones[0]]);
    if (req.url === '/reservas/resumen') {
      return responderJson(res, 200, [{ funcion_id: 99, entradas: 5, reservas: 2 }]);
    }
    if (req.url === '/postulaciones/resumen') {
      return responderJson(res, 503, { error: 'SQLITE_PRIVATE_DETAIL' });
    }
    return responderJson(res, 404, {});
  });
  const apiUrl = await iniciarApi(t, upstreamUrl);

  const ocupacionResponse = await fetch(`${apiUrl}/reportes/ocupacion`);
  assert.equal(ocupacionResponse.status, 503);
  const errorOcupacion = await ocupacionResponse.json();
  assert.deepEqual(errorOcupacion, { error: 'Servicio de reservas no disponible' });
  assert.doesNotMatch(JSON.stringify(errorOcupacion), /SQLITE|PRIVATE_DETAIL/);

  const postulacionesResponse = await fetch(`${apiUrl}/reportes/postulaciones-por-estado`);
  assert.equal(postulacionesResponse.status, 503);
  const errorPostulaciones = await postulacionesResponse.json();
  assert.deepEqual(errorPostulaciones, { error: 'Servicio de convocatoria no disponible' });
  assert.doesNotMatch(JSON.stringify(errorPostulaciones), /SQLITE|PRIVATE_DETAIL/);
});

test('el servicio sigue disponible después de un 503 de una dependencia', async (t) => {
  let fallaReservas = true;
  const { baseUrl: upstreamUrl } = await iniciarServidor(t, (req, res) => {
    if (req.url === '/funciones') return responderJson(res, 200, []);
    if (req.url === '/reservas/resumen') {
      if (fallaReservas) {
        fallaReservas = false;
        return responderJson(res, 503, { error: 'DEPENDENCIA_NO_DISPONIBLE' });
      }
      return responderJson(res, 200, []);
    }
    return responderJson(res, 404, {});
  });
  const apiUrl = await iniciarApi(t, upstreamUrl);

  const reporteFallido = await fetch(`${apiUrl}/reportes/ocupacion`);
  assert.equal(reporteFallido.status, 503);
  assert.deepEqual(await reporteFallido.json(), {
    error: 'Servicio de reservas no disponible',
  });

  const healthResponse = await fetch(`${apiUrl}/health`);
  assert.equal(healthResponse.status, 200);
  assert.deepEqual(await healthResponse.json(), {
    servicio: 'notificaciones-service',
    estado: 'ok',
  });

  const reportePosterior = await fetch(`${apiUrl}/reportes/funciones-mas-reservadas`);
  assert.equal(reportePosterior.status, 200);
  assert.deepEqual(await reportePosterior.json(), []);
});

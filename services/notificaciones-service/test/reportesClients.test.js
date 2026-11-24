const assert = require('node:assert/strict');
const http = require('node:http');
const { once } = require('node:events');
const test = require('node:test');
const { DependencyUnavailableError } = require('../src/errors');
const { createConvocatoriaClient } = require('../src/clients/convocatoriaClient');
const { createProgramacionClient } = require('../src/clients/programacionClient');
const { createReservasClient } = require('../src/clients/reservasClient');

async function iniciarMockHttp(t, handler) {
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

  return `http://127.0.0.1:${port}`;
}

function responderJson(res, status, value) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(value));
}

test('los clientes consultan las rutas contractuales y aceptan respuestas JSON', async (t) => {
  const rutas = [];
  const baseUrl = await iniciarMockHttp(t, (req, res) => {
    rutas.push(req.url);
    if (req.url === '/funciones') return responderJson(res, 200, []);
    if (req.url === '/reservas/resumen') return responderJson(res, 200, []);
    if (req.url === '/postulaciones/resumen') {
      return responderJson(res, 200, {
        pendiente: 0,
        aprobada: 0,
        rechazada: 0,
        total: 0,
      });
    }
    return responderJson(res, 404, {});
  });

  assert.deepEqual(await createProgramacionClient({ baseUrl }).getFunciones(), []);
  assert.deepEqual(await createReservasClient({ baseUrl }).getResumen(), []);
  assert.deepEqual(await createConvocatoriaClient({ baseUrl }).getResumen(), {
    pendiente: 0,
    aprobada: 0,
    rechazada: 0,
    total: 0,
  });
  assert.deepEqual(rutas, [
    '/funciones',
    '/reservas/resumen',
    '/postulaciones/resumen',
  ]);
});

test('los clientes traducen HTTP no exitoso sin exponer el cuerpo remoto', async (t) => {
  const baseUrl = await iniciarMockHttp(t, (req, res) => {
    responderJson(res, 503, { error: 'detalle interno secreto' });
  });
  const client = createConvocatoriaClient({ baseUrl });

  await assert.rejects(client.getResumen(), (error) => {
    assert.ok(error instanceof DependencyUnavailableError);
    assert.equal(error.status, 503);
    assert.equal(error.message, 'Servicio de convocatoria no disponible');
    assert.doesNotMatch(error.message, /secreto/);
    return true;
  });
});

test('los clientes traducen JSON inválido y tipo de contenido incompatible a 503', async (t) => {
  const baseUrl = await iniciarMockHttp(t, (req, res) => {
    if (req.url === '/funciones') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end('{');
    }
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    return res.end('[]');
  });

  await assert.rejects(
    createProgramacionClient({ baseUrl }).getFunciones(),
    (error) => error instanceof DependencyUnavailableError && error.status === 503
  );
  await assert.rejects(
    createReservasClient({ baseUrl }).getResumen(),
    (error) => error instanceof DependencyUnavailableError && error.status === 503
  );
});

test('los clientes traducen estructuras raíz incompatibles a 503', async (t) => {
  const baseUrl = await iniciarMockHttp(t, (req, res) => {
    responderJson(res, 200, req.url === '/postulaciones/resumen' ? [] : {});
  });

  await assert.rejects(
    createProgramacionClient({ baseUrl }).getFunciones(),
    (error) => error instanceof DependencyUnavailableError && error.status === 503
  );
  await assert.rejects(
    createReservasClient({ baseUrl }).getResumen(),
    (error) => error instanceof DependencyUnavailableError && error.status === 503
  );
  await assert.rejects(
    createConvocatoriaClient({ baseUrl }).getResumen(),
    (error) => error instanceof DependencyUnavailableError && error.status === 503
  );
});

test('los clientes traducen timeout y error de conexión a 503', async (t) => {
  const baseUrl = await iniciarMockHttp(t, () => {});

  await assert.rejects(
    createProgramacionClient({ baseUrl, timeoutMs: 50 }).getFunciones(),
    (error) => error instanceof DependencyUnavailableError && error.status === 503
  );

  const client = createReservasClient({
    baseUrl,
    fetchImpl: async () => {
      throw new Error('conexión privada no disponible');
    },
  });
  await assert.rejects(client.getResumen(), (error) => {
    assert.ok(error instanceof DependencyUnavailableError);
    assert.equal(error.status, 503);
    assert.equal(error.message, 'Servicio de reservas no disponible');
    assert.ok(error.cause instanceof Error);
    return true;
  });
});

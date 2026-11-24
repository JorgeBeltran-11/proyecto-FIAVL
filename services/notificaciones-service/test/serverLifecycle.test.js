const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { openDatabase } = require('../src/database');
const { registerShutdownHandlers } = require('../src/serverLifecycle');

function crearContexto(t) {
  const directorio = fs.mkdtempSync(path.join(os.tmpdir(), 'fiavl-shutdown-'));
  const db = openDatabase(path.join(directorio, 'notificaciones.db'));
  t.after(() => {
    if (db.open) db.close();
    fs.rmSync(directorio, { recursive: true, force: true });
  });
  return db;
}

function crearServidorFalso() {
  const server = new EventEmitter();
  server.closeCalls = 0;
  server.closeCallback = null;
  server.close = (callback) => {
    server.closeCalls += 1;
    server.closeCallback = callback;
  };
  return server;
}

function rastrearConexion(db) {
  let closeCalls = 0;
  return {
    get open() {
      return db.open;
    },
    get closeCalls() {
      return closeCalls;
    },
    close() {
      closeCalls += 1;
      db.close();
    },
  };
}

const loggerSilencioso = { log() {}, error() {} };

test('cierra una vez si llega un error del servidor durante SIGTERM', (t) => {
  const db = crearContexto(t);
  const database = rastrearConexion(db);
  const server = crearServidorFalso();
  const signals = new EventEmitter();
  const exitCodes = [];

  registerShutdownHandlers(server, database, {
    signals,
    logger: loggerSilencioso,
    setExitCode: (code) => exitCodes.push(code),
  });

  signals.emit('SIGTERM');
  server.emit('error', new Error('server failure'));
  assert.equal(database.closeCalls, 0);

  server.closeCallback(null);
  signals.emit('SIGINT');

  assert.equal(server.closeCalls, 1);
  assert.equal(database.closeCalls, 1);
  assert.equal(db.open, false);
  assert.deepEqual(exitCodes, [1]);
});

test('cierra una vez si la señal llega después del error del servidor', (t) => {
  const db = crearContexto(t);
  const database = rastrearConexion(db);
  const server = crearServidorFalso();
  const signals = new EventEmitter();
  const exitCodes = [];

  registerShutdownHandlers(server, database, {
    signals,
    logger: loggerSilencioso,
    setExitCode: (code) => exitCodes.push(code),
  });

  server.emit('error', new Error('server failure'));
  signals.emit('SIGTERM');

  assert.equal(server.closeCalls, 0);
  assert.equal(database.closeCalls, 1);
  assert.equal(db.open, false);
  assert.deepEqual(exitCodes, [1]);
});

test('registra un error real al cerrar SQLite y marca fallo del proceso', () => {
  const server = crearServidorFalso();
  const signals = new EventEmitter();
  const closeError = new Error('sqlite close failure');
  const loggedErrors = [];
  const exitCodes = [];
  const database = {
    open: true,
    close() {
      throw closeError;
    },
  };

  registerShutdownHandlers(server, database, {
    signals,
    logger: {
      log() {},
      error: (...args) => loggedErrors.push(args),
    },
    setExitCode: (code) => exitCodes.push(code),
  });

  signals.emit('SIGTERM');
  server.closeCallback(null);

  assert.equal(loggedErrors.length, 1);
  assert.strictEqual(loggedErrors[0][1], closeError);
  assert.deepEqual(exitCodes, [1]);
});

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { closeDatabase, openDatabase } = require('../src/database');
const {
  NotificationsRepositoryError,
  createNotificationsRepository,
} = require('../src/repositories/notificacionesRepository');

function crearContexto(t) {
  const directorio = fs.mkdtempSync(path.join(os.tmpdir(), 'fiavl-notificaciones-'));
  const databasePath = path.join(directorio, 'notificaciones.db');
  const db = openDatabase(databasePath);

  t.after(() => {
    if (db.open) db.close();
    fs.rmSync(directorio, { recursive: true, force: true });
  });

  return { db, databasePath, repository: createNotificationsRepository(db) };
}

const aviso = (overrides = {}) => ({
  correo: 'persona@ejemplo.com',
  tipo: 'RESERVA_CONFIRMADA',
  referencia: 'RES-123456',
  mensaje: 'Reserva confirmada.',
  ...overrides,
});

test('inicializa la tabla y el índice de consulta por correo', (t) => {
  const { db } = crearContexto(t);
  const columnas = db.prepare('PRAGMA table_info(notificacion)').all().map((row) => row.name);
  const indices = db.prepare('PRAGMA index_list(notificacion)').all().map((row) => row.name);

  assert.deepEqual(columnas, [
    'id',
    'correo',
    'tipo',
    'referencia',
    'mensaje',
    'fecha_creacion',
  ]);
  assert.ok(indices.includes('idx_notificacion_correo_fecha'));
});

test('inserta y devuelve una notificación persistida con fecha ISO-8601', (t) => {
  const { repository } = crearContexto(t);

  const guardada = repository.crear(aviso());

  assert.equal(guardada.id, 1);
  assert.equal(guardada.correo, 'persona@ejemplo.com');
  assert.equal(guardada.tipo, 'RESERVA_CONFIRMADA');
  assert.equal(guardada.referencia, 'RES-123456');
  assert.equal(guardada.mensaje, 'Reserva confirmada.');
  assert.equal(new Date(guardada.fecha_creacion).toISOString(), guardada.fecha_creacion);
});

test('consulta solo por correo y ordena fecha descendente con desempate determinista', (t) => {
  const { db, repository } = crearContexto(t);
  const primera = repository.crear(aviso());
  const segunda = repository.crear(aviso({ referencia: 'RES-654321' }));
  repository.crear(aviso({ correo: 'otra@ejemplo.com' }));

  db.prepare('UPDATE notificacion SET fecha_creacion = ? WHERE id = ?')
    .run('2026-01-01T10:00:00.000Z', primera.id);
  db.prepare('UPDATE notificacion SET fecha_creacion = ? WHERE id = ?')
    .run('2026-01-02T10:00:00.000Z', segunda.id);

  const resultado = repository.buscarPorCorreoElectronico('persona@ejemplo.com');

  assert.deepEqual(resultado.map((row) => row.id), [segunda.id, primera.id]);
});

test('persiste registros al cerrar y reabrir la base de datos', (t) => {
  const { db, databasePath, repository } = crearContexto(t);
  const guardada = repository.crear(aviso());
  closeDatabase(db);
  assert.doesNotThrow(() => closeDatabase(db));

  const reopenedDb = openDatabase(databasePath);
  try {
    const reopenedRepository = createNotificationsRepository(reopenedDb);
    assert.deepEqual(
      reopenedRepository.buscarPorCorreoElectronico('persona@ejemplo.com'),
      [guardada]
    );
  } finally {
    reopenedDb.close();
  }
});

test('mantiene tipos extensibles y deja que SQLite rechace campos fuera de límites', (t) => {
  const { repository } = crearContexto(t);

  const futureType = repository.crear(aviso({ tipo: 'NUEVO_TIPO_FUTURO' }));
  assert.equal(futureType.tipo, 'NUEVO_TIPO_FUTURO');
});

test('acepta el correo de 254 caracteres y rechaza uno de 255', (t) => {
  const { repository } = crearContexto(t);
  const correoMaximo = `${'a'.repeat(64)}@${'b'.repeat(63)}.${'c'.repeat(63)}.${'d'.repeat(61)}`;
  assert.equal(correoMaximo.length, 254);

  assert.equal(repository.crear(aviso({ correo: correoMaximo })).correo, correoMaximo);
  assert.throws(() => repository.crear(aviso({ correo: `${correoMaximo}x` })), NotificationsRepositoryError);
});

test('acepta la referencia de 100 caracteres y rechaza una de 101', (t) => {
  const { repository } = crearContexto(t);
  const referenciaMaxima = 'R'.repeat(100);

  assert.equal(
    repository.crear(aviso({ referencia: referenciaMaxima })).referencia,
    referenciaMaxima
  );
  assert.throws(
    () => repository.crear(aviso({ referencia: 'R'.repeat(101) })),
    NotificationsRepositoryError
  );
});

test('acepta un mensaje de 2000 caracteres y rechaza uno de 2001', (t) => {
  const { repository } = crearContexto(t);

  assert.equal(repository.crear(aviso({ mensaje: 'm'.repeat(2000) })).mensaje.length, 2000);
  assert.throws(
    () => repository.crear(aviso({ mensaje: 'm'.repeat(2001) })),
    NotificationsRepositoryError
  );
});

test('conserva la causa SQLite original en el error del repositorio', (t) => {
  const { repository } = crearContexto(t);

  assert.throws(
    () => repository.crear(aviso({ mensaje: 'm'.repeat(2001) })),
    (error) => {
      assert.ok(error instanceof NotificationsRepositoryError);
      assert.ok(error.cause instanceof Error);
      assert.match(error.cause.message, /CHECK constraint failed/);
      return true;
    }
  );
});

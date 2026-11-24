const path = require('path');
const Database = require('better-sqlite3');

const db = new Database(path.join(__dirname, '..', 'reservas.db'));

// funcion_id apunta a la función de programacion-service solo por id (sin FK entre bases).
db.exec(`
  CREATE TABLE IF NOT EXISTS reserva (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    codigo            TEXT NOT NULL UNIQUE,
    funcion_id        INTEGER NOT NULL,
    nombre            TEXT NOT NULL,
    correo            TEXT NOT NULL,
    cantidad          INTEGER NOT NULL CHECK (cantidad > 0),
    estado            TEXT NOT NULL DEFAULT 'confirmada' CHECK (estado IN ('confirmada', 'cancelada')),
    fecha_reserva     TEXT NOT NULL,
    fecha_cancelacion TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_reserva_funcion ON reserva (funcion_id, estado);
`);

// Datos de ejemplo (FR-009): solo si la base está vacía.
// Usan las funciones precargadas por programacion-service (ids 1 a 6).
const vacia = db.prepare('SELECT COUNT(*) AS n FROM reserva').get().n === 0;
if (vacia) {
  const ins = db.prepare(
    `INSERT INTO reserva (codigo, funcion_id, nombre, correo, cantidad, estado, fecha_reserva, fecha_cancelacion)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );
  db.transaction(() => {
    ins.run('RES-DEMO01', 1, 'María Torres', 'maria.torres@correo.com', 4, 'confirmada', '2026-11-05T14:10:00.000Z', null);
    ins.run('RES-DEMO02', 1, 'Luis Jaramillo', 'luis.jaramillo@correo.com', 2, 'confirmada', '2026-11-06T09:30:00.000Z', null);
    ins.run('RES-DEMO03', 2, 'Ana Castillo', 'ana.castillo@correo.com', 3, 'confirmada', '2026-11-06T18:45:00.000Z', null);
    ins.run('RES-DEMO04', 2, 'Pedro Ochoa', 'pedro.ochoa@correo.com', 2, 'cancelada', '2026-11-07T11:00:00.000Z', '2026-11-08T10:00:00.000Z');
    ins.run('RES-DEMO05', 4, 'Carla Ríos', 'carla.rios@correo.com', 5, 'confirmada', '2026-11-08T16:20:00.000Z', null);
    ins.run('RES-DEMO06', 5, 'Familia Paredes', 'paredes@correo.com', 6, 'confirmada', '2026-11-09T08:15:00.000Z', null);
  })();
}

module.exports = db;

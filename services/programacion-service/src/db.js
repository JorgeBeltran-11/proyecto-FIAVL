const path = require('path');
const Database = require('better-sqlite3');

const db = new Database(path.join(__dirname, '..', 'programacion.db'));
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS escenario (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre    TEXT NOT NULL,
    direccion TEXT NOT NULL,
    tipo      TEXT NOT NULL,
    aforo     INTEGER NOT NULL CHECK (aforo > 0)
  );

  CREATE TABLE IF NOT EXISTS obra (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    titulo       TEXT NOT NULL,
    compania     TEXT NOT NULL,
    pais         TEXT NOT NULL,
    disciplina   TEXT NOT NULL,
    duracion_min INTEGER NOT NULL CHECK (duracion_min > 0),
    sinopsis     TEXT DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS funcion (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    obra_id      INTEGER NOT NULL REFERENCES obra(id),
    escenario_id INTEGER NOT NULL REFERENCES escenario(id),
    fecha        TEXT NOT NULL,
    hora         TEXT NOT NULL,
    aforo        INTEGER NOT NULL CHECK (aforo > 0),
    precio       REAL NOT NULL DEFAULT 0
  );
`);

// Datos de ejemplo (FR-010): solo si la base está vacía.
const vacia = db.prepare('SELECT COUNT(*) AS n FROM escenario').get().n === 0;
if (vacia) {
  const insEsc = db.prepare('INSERT INTO escenario (nombre, direccion, tipo, aforo) VALUES (?, ?, ?, ?)');
  const insObra = db.prepare(
    'INSERT INTO obra (titulo, compania, pais, disciplina, duracion_min, sinopsis) VALUES (?, ?, ?, ?, ?, ?)'
  );
  const insFun = db.prepare(
    'INSERT INTO funcion (obra_id, escenario_id, fecha, hora, aforo, precio) VALUES (?, ?, ?, ?, ?, ?)'
  );

  db.transaction(() => {
    insEsc.run('Teatro Nacional Benjamín Carrión', 'Av. Universitaria', 'teatro', 900);
    insEsc.run('Teatro Bolívar', 'Calle Bolívar y Rocafuerte', 'teatro', 500);
    insEsc.run('Plaza de San Sebastián', 'Centro histórico', 'plaza', 2000);
    insEsc.run('Parque Jipiro', 'Av. Salvador Bustamante Celi', 'parque', 3000);

    insObra.run('Raíces del Sur', 'Compañía Ensamble Andino', 'Ecuador', 'danza', 60, 'Danza contemporánea inspirada en la cosmovisión andina.');
    insObra.run('El último viaje', 'Teatro del Viento', 'Chile', 'teatro', 90, 'Una familia emprende un viaje que cambiará su historia.');
    insObra.run('Cirko Urbano', 'Colectivo Malabar', 'Colombia', 'circo', 50, 'Acrobacias y malabares en espacio público.');
    insObra.run('Sinfonía de la Ciudad', 'Orquesta Sinfónica de Loja', 'Ecuador', 'musica', 80, 'Concierto con obras de compositores lojanos.');
    insObra.run('Hilos de Papel', 'Títeres La Gotera', 'México', 'titeres', 45, 'Teatro de títeres para toda la familia.');

    insFun.run(1, 1, '2026-11-12', '19:00', 900, 0);
    insFun.run(2, 2, '2026-11-13', '20:00', 500, 5);
    insFun.run(3, 3, '2026-11-14', '16:00', 2000, 0);
    insFun.run(4, 1, '2026-11-14', '19:30', 900, 10);
    insFun.run(5, 4, '2026-11-15', '11:00', 3000, 0);
    insFun.run(2, 2, '2026-11-15', '20:00', 500, 5);
  })();
}

module.exports = db;

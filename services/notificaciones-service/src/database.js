const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');
const { DATABASE_PATH } = require('./config');

const ESQUEMA = `
  CREATE TABLE IF NOT EXISTS notificacion (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    correo TEXT NOT NULL CHECK (length(trim(correo)) BETWEEN 1 AND 254),
    tipo TEXT NOT NULL CHECK (length(trim(tipo)) > 0),
    referencia TEXT NOT NULL CHECK (length(trim(referencia)) BETWEEN 1 AND 100),
    mensaje TEXT NOT NULL CHECK (length(trim(mensaje)) BETWEEN 1 AND 2000),
    fecha_creacion TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_notificacion_correo_fecha
    ON notificacion (correo, fecha_creacion DESC, id DESC);
`;

class DatabaseInitializationError extends Error {
  constructor(databasePath, cause) {
    super(`No se pudo inicializar la base SQLite: ${databasePath}`, { cause });
    this.name = 'DatabaseInitializationError';
  }
}

function openDatabase(databasePath = DATABASE_PATH) {
  const resolvedPath = path.resolve(databasePath);
  let db;

  try {
    fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });
    db = new Database(resolvedPath);
    db.exec(ESQUEMA);
    return db;
  } catch (cause) {
    if (db && db.open) {
      try {
        db.close();
      } catch (closeError) {
        throw new AggregateError(
          [cause, closeError],
          `No se pudo inicializar ni cerrar la base SQLite: ${resolvedPath}`
        );
      }
    }

    throw new DatabaseInitializationError(resolvedPath, cause);
  }
}

function closeDatabase(db) {
  if (db.open) db.close();
}

module.exports = { DatabaseInitializationError, closeDatabase, openDatabase };

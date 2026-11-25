const path = require('path');
const Database = require('better-sqlite3');

const db = new Database(path.join(__dirname, '..', 'convocatoria.db'));

// obra_id apunta a la obra de programacion-service solo por id (sin FK entre bases).
db.exec(`
  CREATE TABLE IF NOT EXISTS postulacion (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    codigo         TEXT NOT NULL UNIQUE,
    titulo         TEXT NOT NULL,
    compania       TEXT NOT NULL,
    pais           TEXT NOT NULL,
    disciplina     TEXT NOT NULL,
    duracion_min   INTEGER NOT NULL CHECK (duracion_min > 0),
    sinopsis       TEXT NOT NULL,
    responsable    TEXT NOT NULL,
    correo         TEXT NOT NULL,
    video_url      TEXT,
    estado         TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aprobada', 'rechazada')),
    motivo_rechazo TEXT,
    fecha_envio    TEXT NOT NULL,
    fecha_decision TEXT,
    obra_id        INTEGER
  );
  CREATE INDEX IF NOT EXISTS idx_postulacion_estado ON postulacion (estado, disciplina);
`);

// Datos de ejemplo (FR-011): solo si la base está vacía.
// La aprobada apunta a la obra 1 que precarga programacion-service ("Raíces del Sur").
const vacia = db.prepare('SELECT COUNT(*) AS n FROM postulacion').get().n === 0;
if (vacia) {
  const ins = db.prepare(
    `INSERT INTO postulacion (codigo, titulo, compania, pais, disciplina, duracion_min, sinopsis, responsable,
       correo, video_url, estado, motivo_rechazo, fecha_envio, fecha_decision, obra_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  db.transaction(() => {
    ins.run('CONV-DEMO01', 'Raíces del Sur', 'Compañía Ensamble Andino', 'Ecuador', 'danza', 60,
      'Danza contemporánea inspirada en la cosmovisión andina.', 'Sofía Guamán', 'sofia@ensambleandino.ec',
      'https://www.youtube.com/watch?v=demo1', 'aprobada', null, '2026-09-02T15:00:00.000Z', '2026-09-20T14:00:00.000Z', 1);
    ins.run('CONV-DEMO02', 'Voces del Río', 'Teatro La Orilla', 'Perú', 'teatro', 75,
      'Historias de las comunidades que viven junto al río.', 'Miguel Paredes', 'miguel@laorilla.pe',
      null, 'rechazada', 'La propuesta no incluye ficha técnica de montaje.', '2026-09-05T10:30:00.000Z', '2026-09-21T09:00:00.000Z', null);
    ins.run('CONV-DEMO03', 'Cuerpos en Tránsito', 'Colectivo Pulso', 'Argentina', 'danza', 55,
      'Pieza de danza sobre la migración y el desarraigo.', 'Lucía Fernández', 'lucia@colectivopulso.ar',
      'https://vimeo.com/demo3', 'pendiente', null, '2026-09-10T18:20:00.000Z', null, null);
    ins.run('CONV-DEMO04', 'El Gran Malabar', 'Circo Itinerante Sol', 'Ecuador', 'circo', 40,
      'Espectáculo de malabares y equilibrio para toda la familia.', 'Andrés Celi', 'andres@circosol.ec',
      null, 'pendiente', null, '2026-09-12T12:00:00.000Z', null, null);
    ins.run('CONV-DEMO05', 'Cuerdas de la Sierra', 'Ensamble Cordillera', 'Bolivia', 'musica', 70,
      'Música andina contemporánea con instrumentos tradicionales.', 'Rosa Mamani', 'rosa@cordillera.bo',
      'https://www.youtube.com/watch?v=demo5', 'pendiente', null, '2026-09-15T16:45:00.000Z', null, null);
  })();
}

module.exports = db;

// Capa de negocio: reglas y validaciones de la spec-1.
const db = require('../db');

const DISCIPLINAS = ['teatro', 'danza', 'musica', 'circo', 'titeres', 'artes-visuales'];
const TIPOS_ESCENARIO = ['teatro', 'plaza', 'parque', 'centro-cultural', 'calle'];
const FESTIVAL_INICIO = '2026-11-12';
const FESTIVAL_FIN = '2026-11-22';

// Error con código HTTP para que las rutas lo traduzcan.
class ErrorNegocio extends Error {
  constructor(status, mensaje) {
    super(mensaje);
    this.status = status;
  }
}

const texto = (v) => typeof v === 'string' && v.trim().length > 0;
const entero = (v) => Number.isInteger(Number(v)) && Number(v) > 0;
const aMinutos = (hora) => {
  const [h, m] = hora.split(':').map(Number);
  return h * 60 + m;
};

// ---------- Escenarios ----------
function listarEscenarios() {
  return db.prepare('SELECT * FROM escenario ORDER BY nombre').all();
}

function obtenerEscenario(id) {
  const e = db.prepare('SELECT * FROM escenario WHERE id = ?').get(id);
  if (!e) throw new ErrorNegocio(404, `Escenario ${id} no existe`);
  return e;
}

function crearEscenario({ nombre, direccion, tipo, aforo }) {
  if (!texto(nombre) || !texto(direccion)) throw new ErrorNegocio(400, 'Nombre y dirección son obligatorios');
  if (!TIPOS_ESCENARIO.includes(tipo)) throw new ErrorNegocio(400, `Tipo inválido. Use: ${TIPOS_ESCENARIO.join(', ')}`);
  if (!entero(aforo)) throw new ErrorNegocio(400, 'El aforo debe ser un número entero mayor a 0');
  const r = db
    .prepare('INSERT INTO escenario (nombre, direccion, tipo, aforo) VALUES (?, ?, ?, ?)')
    .run(nombre.trim(), direccion.trim(), tipo, Number(aforo));
  return obtenerEscenario(r.lastInsertRowid);
}

// ---------- Obras ----------
function listarObras() {
  return db.prepare('SELECT * FROM obra ORDER BY titulo').all();
}

function obtenerObra(id) {
  const o = db.prepare('SELECT * FROM obra WHERE id = ?').get(id);
  if (!o) throw new ErrorNegocio(404, `Obra ${id} no existe`);
  return o;
}

function crearObra({ titulo, compania, pais, disciplina, duracion_min, sinopsis = '' }) {
  if (!texto(titulo) || !texto(compania)) throw new ErrorNegocio(400, 'Título y compañía son obligatorios');
  if (!texto(pais)) throw new ErrorNegocio(400, 'El país es obligatorio');
  if (!DISCIPLINAS.includes(disciplina)) throw new ErrorNegocio(400, `Disciplina inválida. Use: ${DISCIPLINAS.join(', ')}`);
  if (!entero(duracion_min)) throw new ErrorNegocio(400, 'La duración debe ser un número entero de minutos');
  const r = db
    .prepare('INSERT INTO obra (titulo, compania, pais, disciplina, duracion_min, sinopsis) VALUES (?, ?, ?, ?, ?, ?)')
    .run(titulo.trim(), compania.trim(), pais.trim(), disciplina, Number(duracion_min), sinopsis);
  return obtenerObra(r.lastInsertRowid);
}

// ---------- Funciones ----------
const SELECT_FUNCION = `
  SELECT f.id, f.fecha, f.hora, f.aforo, f.precio,
         o.id AS obra_id, o.titulo, o.compania, o.pais, o.disciplina, o.duracion_min,
         e.id AS escenario_id, e.nombre AS escenario_nombre, e.tipo AS escenario_tipo, e.direccion
  FROM funcion f
  JOIN obra o ON o.id = f.obra_id
  JOIN escenario e ON e.id = f.escenario_id
`;

const formatear = (r) => ({
  id: r.id,
  fecha: r.fecha,
  hora: r.hora,
  aforo: r.aforo,
  precio: r.precio,
  obra: { id: r.obra_id, titulo: r.titulo, compania: r.compania, pais: r.pais, disciplina: r.disciplina, duracion_min: r.duracion_min },
  escenario: { id: r.escenario_id, nombre: r.escenario_nombre, tipo: r.escenario_tipo, direccion: r.direccion },
});

function listarFunciones({ fecha, disciplina } = {}) {
  const condiciones = [];
  const params = [];
  if (fecha) { condiciones.push('f.fecha = ?'); params.push(fecha); }
  if (disciplina) { condiciones.push('o.disciplina = ?'); params.push(disciplina); }
  const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
  return db.prepare(`${SELECT_FUNCION} ${where} ORDER BY f.fecha, f.hora`).all(...params).map(formatear);
}

function obtenerFuncion(id) {
  const r = db.prepare(`${SELECT_FUNCION} WHERE f.id = ?`).get(id);
  if (!r) throw new ErrorNegocio(404, `Función ${id} no existe`);
  return formatear(r);
}

function crearFuncion({ obra_id, escenario_id, fecha, hora, aforo, precio = 0 }) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha || '')) throw new ErrorNegocio(400, 'Fecha inválida (YYYY-MM-DD)');
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(hora || '')) throw new ErrorNegocio(400, 'Hora inválida (HH:MM)');
  // FR-007: periodo del festival
  if (fecha < FESTIVAL_INICIO || fecha > FESTIVAL_FIN) {
    throw new ErrorNegocio(400, `La fecha debe estar entre ${FESTIVAL_INICIO} y ${FESTIVAL_FIN}`);
  }
  if (Number(precio) < 0 || Number.isNaN(Number(precio))) throw new ErrorNegocio(400, 'El precio no puede ser negativo');

  const obra = obtenerObra(obra_id);
  const escenario = obtenerEscenario(escenario_id);

  const aforoFinal = aforo === undefined || aforo === '' ? escenario.aforo : Number(aforo);
  if (!entero(aforoFinal)) throw new ErrorNegocio(400, 'El aforo debe ser un entero mayor a 0');
  if (aforoFinal > escenario.aforo) throw new ErrorNegocio(400, `El aforo no puede superar el del escenario (${escenario.aforo})`);

  // FR-006: no cruzar horarios en el mismo escenario
  const inicio = aMinutos(hora);
  const fin = inicio + obra.duracion_min;
  const mismasFunciones = db
    .prepare(`SELECT f.hora, o.duracion_min, o.titulo FROM funcion f JOIN obra o ON o.id = f.obra_id
              WHERE f.escenario_id = ? AND f.fecha = ?`)
    .all(escenario.id, fecha);
  const choque = mismasFunciones.find((f) => {
    const i = aMinutos(f.hora);
    return inicio < i + f.duracion_min && i < fin;
  });
  if (choque) {
    throw new ErrorNegocio(409, `El escenario ya tiene "${choque.titulo}" a las ${choque.hora} ese día`);
  }

  const r = db
    .prepare('INSERT INTO funcion (obra_id, escenario_id, fecha, hora, aforo, precio) VALUES (?, ?, ?, ?, ?, ?)')
    .run(obra.id, escenario.id, fecha, hora, aforoFinal, Number(precio));
  return obtenerFuncion(r.lastInsertRowid);
}

module.exports = {
  ErrorNegocio,
  DISCIPLINAS,
  TIPOS_ESCENARIO,
  listarEscenarios, obtenerEscenario, crearEscenario,
  listarObras, obtenerObra, crearObra,
  listarFunciones, obtenerFuncion, crearFuncion,
};

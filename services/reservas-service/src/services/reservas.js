// Capa de negocio: reglas y validaciones de la spec-3.
const crypto = require('crypto');
const db = require('../db');
const programacion = require('../clients/programacion');
const notificaciones = require('../clients/notificaciones');

const ESTADOS = ['confirmada', 'cancelada'];
const CARACTERES = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

// Error con código HTTP para que las rutas lo traduzcan; `extra` se agrega a la respuesta.
class ErrorNegocio extends Error {
  constructor(status, mensaje, extra = {}) {
    super(mensaje);
    this.status = status;
    this.extra = extra;
  }
}

const texto = (v) => typeof v === 'string' && v.trim().length > 0;
const entero = (v) => v !== '' && v !== null && Number.isInteger(Number(v)) && Number(v) > 0;
const correoValido = (v) => typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

// FR-004: código RES- + 6 caracteres A-Z0-9, único.
function nuevoCodigo() {
  const existe = db.prepare('SELECT 1 FROM reserva WHERE codigo = ?');
  let codigo;
  do {
    codigo = 'RES-' + Array.from(crypto.randomBytes(6), (b) => CARACTERES[b % CARACTERES.length]).join('');
  } while (existe.get(codigo));
  return codigo;
}

// FR-002 / NFR-003: consulta la función en spec-1 y traduce los fallos.
async function buscarFuncion(funcionId) {
  try {
    return await programacion.obtenerFuncion(funcionId);
  } catch (e) {
    if (e instanceof programacion.ProgramacionNoDisponible) {
      throw new ErrorNegocio(503, 'El servicio de programación no está disponible, intenta más tarde');
    }
    throw e;
  }
}

const entradasConfirmadas = db.prepare(
  "SELECT COALESCE(SUM(cantidad), 0) AS n FROM reserva WHERE funcion_id = ? AND estado = 'confirmada'"
);
const insertar = db.prepare(
  `INSERT INTO reserva (codigo, funcion_id, nombre, correo, cantidad, estado, fecha_reserva)
   VALUES (?, ?, ?, ?, ?, 'confirmada', ?)`
);

// FR-003: suma y guarda en una sola transacción para no superar el aforo.
const guardarSiHayCupo = db.transaction((funcion, datos) => {
  const disponibles = Math.max(funcion.aforo - entradasConfirmadas.get(funcion.id).n, 0);
  if (datos.cantidad > disponibles) {
    throw new ErrorNegocio(409, `Aforo completo: quedan ${disponibles} entradas para esta función`, { disponibles });
  }
  const r = insertar.run(nuevoCodigo(), funcion.id, datos.nombre, datos.correo, datos.cantidad, new Date().toISOString());
  return db.prepare('SELECT * FROM reserva WHERE id = ?').get(r.lastInsertRowid);
});

// HU-1, HU-2, HU-5: reservar entradas.
async function crearReserva({ funcion_id, nombre, correo, cantidad } = {}) {
  // FR-001: validaciones
  if (!entero(funcion_id)) throw new ErrorNegocio(400, 'Debe indicar la función (funcion_id)');
  if (!texto(nombre)) throw new ErrorNegocio(400, 'El nombre es obligatorio');
  if (!correoValido(correo)) throw new ErrorNegocio(400, 'El correo no tiene un formato válido');
  if (!entero(cantidad)) throw new ErrorNegocio(400, 'La cantidad debe ser un número entero mayor a 0');

  const funcion = await buscarFuncion(Number(funcion_id));
  if (!funcion) throw new ErrorNegocio(404, 'La función no existe');

  const reserva = guardarSiHayCupo(funcion, {
    nombre: nombre.trim(),
    correo: correo.trim(),
    cantidad: Number(cantidad),
  });

  // FR-007: el aviso va después de guardar; si falla, la reserva igual queda.
  const enviada = await notificaciones.enviar({
    tipo: 'reserva',
    correo: reserva.correo,
    referencia: reserva.codigo,
    mensaje:
      `Reserva confirmada: ${reserva.cantidad} entradas para "${funcion.obra.titulo}", ` +
      `${funcion.fecha.slice(8, 10)}/${funcion.fecha.slice(5, 7)} ${funcion.hora}, ${funcion.escenario.nombre}.`,
  });

  return {
    id: reserva.id,
    codigo: reserva.codigo,
    funcion_id: reserva.funcion_id,
    cantidad: reserva.cantidad,
    estado: reserva.estado,
    fecha_reserva: reserva.fecha_reserva,
    notificacion: enviada ? 'enviada' : 'no enviada',
  };
}

function buscarPorCodigo(codigo) {
  const r = db.prepare('SELECT * FROM reserva WHERE codigo = ?').get(String(codigo || '').trim().toUpperCase());
  if (!r) throw new ErrorNegocio(404, 'No existe una reserva con ese código');
  return r;
}

// HU-3 / FR-005: consulta por código, con los datos de la función si spec-1 responde.
async function obtenerPorCodigo(codigo) {
  const r = buscarPorCodigo(codigo);
  let funcion = null;
  try {
    const f = await programacion.obtenerFuncion(r.funcion_id);
    if (f) funcion = { fecha: f.fecha, hora: f.hora, obra: f.obra.titulo, escenario: f.escenario.nombre };
  } catch {
    funcion = null;
  }
  return { ...r, funcion };
}

// HU-4 / FR-006: solo se cancelan reservas confirmadas.
function cancelar(codigo) {
  const r = buscarPorCodigo(codigo);
  if (r.estado !== 'confirmada') throw new ErrorNegocio(409, 'La reserva ya está cancelada');
  const fecha = new Date().toISOString();
  const cambio = db
    .prepare("UPDATE reserva SET estado = 'cancelada', fecha_cancelacion = ? WHERE id = ? AND estado = 'confirmada'")
    .run(fecha, r.id);
  if (cambio.changes === 0) throw new ErrorNegocio(409, 'La reserva ya está cancelada');
  return { id: r.id, codigo: r.codigo, estado: 'cancelada', fecha_cancelacion: fecha };
}

// HU-6 / FR-008: lista para spec-4, con filtros opcionales.
function listar({ funcion_id, estado } = {}) {
  const condiciones = [];
  const params = [];
  if (funcion_id !== undefined && funcion_id !== '') {
    if (!entero(funcion_id)) throw new ErrorNegocio(400, 'funcion_id debe ser un entero mayor a 0');
    condiciones.push('funcion_id = ?');
    params.push(Number(funcion_id));
  }
  if (estado !== undefined && estado !== '') {
    if (!ESTADOS.includes(estado)) throw new ErrorNegocio(400, `Estado inválido. Use: ${ESTADOS.join(', ')}`);
    condiciones.push('estado = ?');
    params.push(estado);
  }
  const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
  return db.prepare(`SELECT * FROM reserva ${where} ORDER BY fecha_reserva`).all(...params);
}

// HU-6 / FR-008: entradas confirmadas por función, de más a menos.
function resumen() {
  return db
    .prepare(
      `SELECT funcion_id, SUM(cantidad) AS entradas, COUNT(*) AS reservas
       FROM reserva WHERE estado = 'confirmada'
       GROUP BY funcion_id ORDER BY entradas DESC, funcion_id`
    )
    .all();
}

module.exports = { ErrorNegocio, ESTADOS, crearReserva, obtenerPorCodigo, cancelar, listar, resumen };

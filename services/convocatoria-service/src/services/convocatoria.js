// Capa de negocio: reglas y validaciones de la spec-2.
const crypto = require('crypto');
const db = require('../db');
const programacion = require('../clients/programacion');
const notificaciones = require('../clients/notificaciones');

// Misma lista que programacion-service (spec-1). Si spec-1 la cambia, actualizar aquí.
const DISCIPLINAS = ['teatro', 'danza', 'musica', 'circo', 'titeres', 'artes-visuales'];
const ESTADOS = ['pendiente', 'aprobada', 'rechazada'];
const ALFABETO = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

// Error con código HTTP para que las rutas lo traduzcan.
class ErrorNegocio extends Error {
  constructor(status, mensaje) {
    super(mensaje);
    this.status = status;
  }
}

const texto = (v) => typeof v === 'string' && v.trim().length > 0;
const entero = (v) => Number.isInteger(Number(v)) && Number(v) > 0;
const correoValido = (v) => typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
const urlValida = (v) => {
  try {
    return ['http:', 'https:'].includes(new URL(v).protocol);
  } catch {
    return false;
  }
};
const ahora = () => new Date().toISOString();

// FR-002: código público CONV-XXXXXX, no secuencial.
function generarCodigo() {
  const existe = db.prepare('SELECT 1 FROM postulacion WHERE codigo = ?');
  for (;;) {
    let sufijo = '';
    for (let i = 0; i < 6; i++) sufijo += ALFABETO[crypto.randomInt(ALFABETO.length)];
    const codigo = `CONV-${sufijo}`;
    if (!existe.get(codigo)) return codigo;
  }
}

// ---------- Consultas ----------
function obtenerPorId(id) {
  const p = entero(id) ? db.prepare('SELECT * FROM postulacion WHERE id = ?').get(Number(id)) : null;
  if (!p) throw new ErrorNegocio(404, `Postulación ${id} no existe`);
  return p;
}

// FR-004 / HU-2
function obtenerPorCodigo(codigo) {
  const p = db.prepare('SELECT * FROM postulacion WHERE codigo = ?').get(String(codigo).trim().toUpperCase());
  if (!p) throw new ErrorNegocio(404, 'No existe una postulación con ese código');
  return p;
}

// FR-005 / HU-3: de la más antigua a la más reciente, con filtros opcionales.
function listar({ estado, disciplina } = {}) {
  const condiciones = [];
  const params = [];
  if (estado) {
    if (!ESTADOS.includes(estado)) throw new ErrorNegocio(400, `Estado inválido. Use: ${ESTADOS.join(', ')}`);
    condiciones.push('estado = ?');
    params.push(estado);
  }
  if (disciplina) {
    if (!DISCIPLINAS.includes(disciplina)) throw new ErrorNegocio(400, `Disciplina inválida. Use: ${DISCIPLINAS.join(', ')}`);
    condiciones.push('disciplina = ?');
    params.push(disciplina);
  }
  const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
  return db.prepare(`SELECT * FROM postulacion ${where} ORDER BY fecha_envio, id`).all(...params);
}

// FR-010 / HU-7: usado por spec-4 para el reporte de postulaciones por estado.
function resumen() {
  const conteo = { pendiente: 0, aprobada: 0, rechazada: 0 };
  for (const r of db.prepare('SELECT estado, COUNT(*) AS n FROM postulacion GROUP BY estado').all()) {
    conteo[r.estado] = r.n;
  }
  return { ...conteo, total: conteo.pendiente + conteo.aprobada + conteo.rechazada };
}

// ---------- Postular (HU-1) ----------
function crear(datos = {}) {
  const { titulo, compania, pais, disciplina, duracion_min, sinopsis, responsable, correo, video_url } = datos;
  // FR-001: validar campo por campo para decir cuál está mal.
  const obligatorios = { titulo, compania, pais, sinopsis, responsable };
  for (const [campo, valor] of Object.entries(obligatorios)) {
    if (!texto(valor)) throw new ErrorNegocio(400, `El campo "${campo}" es obligatorio`);
  }
  if (!DISCIPLINAS.includes(disciplina)) throw new ErrorNegocio(400, `Disciplina inválida. Use: ${DISCIPLINAS.join(', ')}`);
  if (!entero(duracion_min)) throw new ErrorNegocio(400, 'La duración debe ser un número entero de minutos mayor a 0');
  if (!correoValido(correo)) throw new ErrorNegocio(400, 'El correo de contacto no tiene un formato válido');
  if (video_url && !urlValida(video_url)) throw new ErrorNegocio(400, 'El enlace del video debe empezar con http:// o https://');

  // FR-003: no se repite una postulación pendiente de la misma compañía con el mismo título.
  const duplicada = db
    .prepare(`SELECT codigo FROM postulacion
              WHERE estado = 'pendiente' AND lower(trim(compania)) = lower(?) AND lower(trim(titulo)) = lower(?)`)
    .get(compania.trim(), titulo.trim());
  if (duplicada) {
    throw new ErrorNegocio(409, `Ya existe una postulación pendiente de esta compañía con ese título (${duplicada.codigo})`);
  }

  const codigo = generarCodigo();
  const fecha = ahora();
  const r = db
    .prepare(`INSERT INTO postulacion (codigo, titulo, compania, pais, disciplina, duracion_min, sinopsis,
                responsable, correo, video_url, estado, fecha_envio)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pendiente', ?)`)
    .run(codigo, titulo.trim(), compania.trim(), pais.trim(), disciplina, Number(duracion_min), sinopsis.trim(),
      responsable.trim(), correo.trim(), video_url ? video_url.trim() : null, fecha);
  return { id: r.lastInsertRowid, codigo, estado: 'pendiente', fecha_envio: fecha };
}

// Solo se decide sobre postulaciones pendientes (FR-006, FR-008).
function pendiente(id) {
  const p = obtenerPorId(id);
  if (p.estado !== 'pendiente') throw new ErrorNegocio(409, `La postulación ya está ${p.estado}`);
  return p;
}

// FR-009: el aviso nunca deshace la decisión.
async function avisar(p, mensaje) {
  const ok = await notificaciones.enviar({ correo: p.correo, tipo: 'postulacion', referencia: p.codigo, mensaje });
  return ok ? 'enviada' : 'no enviada';
}

// ---------- Aprobar (HU-4) ----------
async function aprobar(id) {
  const p = pendiente(id);

  // FR-006 / FR-007: primero la obra; si falla, la postulación sigue pendiente.
  let obra;
  try {
    obra = await programacion.crearObra({
      titulo: p.titulo, compania: p.compania, pais: p.pais,
      disciplina: p.disciplina, duracion_min: p.duracion_min, sinopsis: p.sinopsis,
    });
  } catch (err) {
    if (err instanceof programacion.ObraRechazada) throw new ErrorNegocio(502, err.message);
    if (err instanceof programacion.ProgramacionNoDisponible) {
      throw new ErrorNegocio(503, `${err.message}. La postulación sigue pendiente.`);
    }
    throw err;
  }

  // WHERE estado = 'pendiente': si otro administrador aprobó al mismo tiempo, solo una queda registrada.
  const r = db
    .prepare(`UPDATE postulacion SET estado = 'aprobada', obra_id = ?, fecha_decision = ?
              WHERE id = ? AND estado = 'pendiente'`)
    .run(obra.id, ahora(), p.id);
  if (r.changes === 0) {
    throw new ErrorNegocio(409, `La postulación cambió de estado mientras se aprobaba (obra ${obra.id} creada en programación)`);
  }

  const notificacion = await avisar(p, `Tu obra "${p.titulo}" fue aprobada para el FIAVL 2026.`);
  return { id: p.id, codigo: p.codigo, estado: 'aprobada', obra_id: obra.id, notificacion };
}

// ---------- Rechazar (HU-5) ----------
async function rechazar(id, { motivo } = {}) {
  if (!texto(motivo)) throw new ErrorNegocio(400, 'El motivo del rechazo es obligatorio');
  const p = pendiente(id);

  const r = db
    .prepare(`UPDATE postulacion SET estado = 'rechazada', motivo_rechazo = ?, fecha_decision = ?
              WHERE id = ? AND estado = 'pendiente'`)
    .run(motivo.trim(), ahora(), p.id);
  if (r.changes === 0) throw new ErrorNegocio(409, 'La postulación cambió de estado mientras se rechazaba');

  const notificacion = await avisar(p, `Tu obra "${p.titulo}" no fue seleccionada para el FIAVL 2026. Motivo: ${motivo.trim()}`);
  return { id: p.id, codigo: p.codigo, estado: 'rechazada', motivo_rechazo: motivo.trim(), notificacion };
}

module.exports = {
  ErrorNegocio,
  DISCIPLINAS,
  ESTADOS,
  listar, resumen, obtenerPorId, obtenerPorCodigo,
  crear, aprobar, rechazar,
};

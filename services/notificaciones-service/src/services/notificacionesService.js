const { ValidationError } = require('../errors');

const TIPOS_NOTIFICACION = new Set([
  'RESERVA_CONFIRMADA',
  'POSTULACION_APROBADA',
  'POSTULACION',
  'reserva',
  'postulacion',
]);
const NORMALIZAR_TIPO = {
  reserva: 'RESERVA_CONFIRMADA',
  postulacion: 'POSTULACION',
};
const CAMPOS_NOTIFICACION = new Set(['correo', 'tipo', 'referencia', 'mensaje']);
const PARTE_LOCAL_EMAIL = /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*$/;
const ETIQUETA_DOMINIO = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?$/;

function normalizarCorreo(correo) {
  if (typeof correo !== 'string' || correo.length > 254) {
    throw new ValidationError('El correo electrónico no es válido');
  }

  const correoRecortado = correo.trim();
  const separador = correoRecortado.indexOf('@');
  if (
    correoRecortado.length === 0
    || correoRecortado.length > 254
    || separador < 1
    || separador !== correoRecortado.lastIndexOf('@')
  ) {
    throw new ValidationError('El correo electrónico no es válido');
  }

  const parteLocal = correoRecortado.slice(0, separador);
  const dominio = correoRecortado.slice(separador + 1);
  const etiquetasDominio = dominio.split('.');
  if (
    parteLocal.length > 64
    || !PARTE_LOCAL_EMAIL.test(parteLocal)
    || etiquetasDominio.length < 2
    || etiquetasDominio.some((etiqueta) => (
      etiqueta.length < 1 || etiqueta.length > 63 || !ETIQUETA_DOMINIO.test(etiqueta)
    ))
  ) {
    throw new ValidationError('El correo electrónico no es válido');
  }

  return `${parteLocal}@${dominio.toLowerCase()}`;
}

function longitudUnicode(valor) {
  return Array.from(valor).length;
}

function validarTexto(valor, campo, maxLength) {
  if (
    typeof valor !== 'string'
    || valor.trim().length === 0
    || longitudUnicode(valor) > maxLength
  ) {
    throw new ValidationError(`El campo ${campo} no es válido`);
  }
}

function validarNotificacion(datos) {
  if (datos === null || typeof datos !== 'object' || Array.isArray(datos)) {
    throw new ValidationError('El cuerpo debe ser un objeto JSON');
  }

  if (Object.keys(datos).some((campo) => !CAMPOS_NOTIFICACION.has(campo))) {
    throw new ValidationError('El cuerpo contiene campos no permitidos');
  }

  const correo = normalizarCorreo(datos.correo);
  if (!TIPOS_NOTIFICACION.has(datos.tipo)) {
    throw new ValidationError('El tipo de notificación no está permitido');
  }
  validarTexto(datos.referencia, 'referencia', 100);
  validarTexto(datos.mensaje, 'mensaje', 2000);

  return {
    correo,
    tipo: NORMALIZAR_TIPO[datos.tipo] || datos.tipo,
    referencia: datos.referencia,
    mensaje: datos.mensaje,
  };
}

function createNotificationsService(repository) {
  return {
    registrar(datos) {
      return repository.crear(validarNotificacion(datos));
    },

    consultar(correo) {
      const correoNormalizado = normalizarCorreo(correo);
      const notificaciones = repository.buscarPorCorreoElectronico(correoNormalizado);
      return {
        correo: correoNormalizado,
        total: notificaciones.length,
        notificaciones,
      };
    },
  };
}

module.exports = {
  createNotificationsService,
  normalizarCorreo,
  validarNotificacion,
};

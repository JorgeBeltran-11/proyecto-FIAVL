const assert = require('node:assert/strict');
const test = require('node:test');
const { ValidationError } = require('../src/errors');
const {
  normalizarCorreo,
  validarNotificacion,
} = require('../src/services/notificacionesService');

const aviso = {
  correo: 'persona@ejemplo.com',
  tipo: 'RESERVA_CONFIRMADA',
  referencia: 'RES-123456',
  mensaje: 'Reserva confirmada.',
};

test('normaliza espacios externos y dominio sin cambiar mayúsculas de la parte local', () => {
  assert.equal(normalizarCorreo('  Persona@EJEMPLO.COM  '), 'Persona@ejemplo.com');
});

test('acepta los tipos OpenAPI y normaliza únicamente los alias definidos', () => {
  const casos = [
    ['RESERVA_CONFIRMADA', 'RESERVA_CONFIRMADA'],
    ['POSTULACION_APROBADA', 'POSTULACION_APROBADA'],
    ['POSTULACION', 'POSTULACION'],
    ['reserva', 'RESERVA_CONFIRMADA'],
    ['postulacion', 'POSTULACION'],
  ];

  for (const [tipo, tipoEsperado] of casos) {
    assert.equal(validarNotificacion({ ...aviso, tipo }).tipo, tipoEsperado);
  }
});

test('rechaza correo inválido, datos requeridos ausentes, campos extra y tipo no permitido', () => {
  assert.throws(() => normalizarCorreo('no-es-un-correo'), ValidationError);
  assert.throws(() => validarNotificacion({ ...aviso, mensaje: undefined }), ValidationError);
  assert.throws(() => validarNotificacion({ ...aviso, campoExtra: true }), ValidationError);
  assert.throws(() => validarNotificacion({ ...aviso, tipo: 'TIPO_DESCONOCIDO' }), ValidationError);
});

test('valida los límites máximos de los campos de notificación', () => {
  const correoMaximo = `${'a'.repeat(64)}@${'b'.repeat(63)}.${'c'.repeat(63)}.${'d'.repeat(61)}`;
  assert.equal(correoMaximo.length, 254);
  assert.equal(normalizarCorreo(correoMaximo).length, 254);

  assert.doesNotThrow(() => validarNotificacion({
    ...aviso,
    correo: correoMaximo,
    referencia: 'R'.repeat(100),
    mensaje: 'm'.repeat(2000),
  }));
  assert.throws(() => normalizarCorreo(`${correoMaximo}x`), ValidationError);
  assert.throws(() => validarNotificacion({ ...aviso, referencia: 'R'.repeat(101) }), ValidationError);
  assert.throws(() => validarNotificacion({ ...aviso, mensaje: 'm'.repeat(2001) }), ValidationError);
});

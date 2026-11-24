const { DependencyUnavailableError } = require('../errors');

const CAMPOS_RESUMEN_POSTULACIONES = [
  'pendiente',
  'aprobada',
  'rechazada',
  'total',
];

function esObjeto(valor) {
  return valor !== null && typeof valor === 'object' && !Array.isArray(valor);
}

function esEnteroPositivo(valor) {
  return Number.isInteger(valor) && valor > 0;
}

function esEnteroNoNegativo(valor) {
  return Number.isInteger(valor) && valor >= 0;
}

function esFecha(valor) {
  if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const fecha = new Date(`${valor}T00:00:00.000Z`);
  return Number.isFinite(fecha.getTime()) && fecha.toISOString().slice(0, 10) === valor;
}

function esHora(valor) {
  return typeof valor === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(valor);
}

function validarFunciones(funciones) {
  if (!Array.isArray(funciones)) {
    throw new DependencyUnavailableError('programación');
  }

  const ids = new Set();
  for (const funcion of funciones) {
    if (
      !esObjeto(funcion)
      || !esEnteroPositivo(funcion.id)
      || !esFecha(funcion.fecha)
      || !esHora(funcion.hora)
      || !esEnteroPositivo(funcion.aforo)
      || !esObjeto(funcion.obra)
      || typeof funcion.obra.titulo !== 'string'
      || funcion.obra.titulo.trim().length === 0
      || !esObjeto(funcion.escenario)
      || typeof funcion.escenario.nombre !== 'string'
      || funcion.escenario.nombre.trim().length === 0
      || ids.has(funcion.id)
    ) {
      throw new DependencyUnavailableError('programación');
    }
    ids.add(funcion.id);
  }

  return funciones;
}

function validarResumenReservas(resumen) {
  if (!Array.isArray(resumen)) {
    throw new DependencyUnavailableError('reservas');
  }

  const ids = new Set();
  for (const fila of resumen) {
    if (
      !esObjeto(fila)
      || !esEnteroPositivo(fila.funcion_id)
      || !esEnteroNoNegativo(fila.entradas)
      || !esEnteroNoNegativo(fila.reservas)
      || ids.has(fila.funcion_id)
    ) {
      throw new DependencyUnavailableError('reservas');
    }
    ids.add(fila.funcion_id);
  }

  return resumen;
}

function validarResumenPostulaciones(resumen) {
  if (
    !esObjeto(resumen)
    || CAMPOS_RESUMEN_POSTULACIONES.some((campo) => !esEnteroNoNegativo(resumen[campo]))
  ) {
    throw new DependencyUnavailableError('convocatoria');
  }

  return Object.fromEntries(
    CAMPOS_RESUMEN_POSTULACIONES.map((campo) => [campo, resumen[campo]])
  );
}

function createReportesService({
  programacionClient,
  reservasClient,
  convocatoriaClient,
}) {
  if (
    !programacionClient
    || typeof programacionClient.getFunciones !== 'function'
    || !reservasClient
    || typeof reservasClient.getResumen !== 'function'
    || !convocatoriaClient
    || typeof convocatoriaClient.getResumen !== 'function'
  ) {
    throw new TypeError('Se requieren los clientes HTTP de reportes');
  }

  return {
    async obtenerOcupacion() {
      const [respuestaFunciones, respuestaReservas] = await Promise.all([
        programacionClient.getFunciones(),
        reservasClient.getResumen(),
      ]);
      const funciones = validarFunciones(respuestaFunciones);
      const resumenReservas = validarResumenReservas(respuestaReservas);
      const funcionesPorId = new Map(funciones.map((funcion) => [funcion.id, funcion]));
      const entradasPorFuncion = new Map();

      for (const reserva of resumenReservas) {
        if (!funcionesPorId.has(reserva.funcion_id)) {
          throw new DependencyUnavailableError('reservas');
        }
        entradasPorFuncion.set(reserva.funcion_id, reserva.entradas);
      }

      return funciones.map((funcion) => {
        const entradasReservadas = entradasPorFuncion.get(funcion.id) || 0;
        const ocupacionPorcentaje = (entradasReservadas / funcion.aforo) * 100;
        if (!Number.isFinite(ocupacionPorcentaje)) {
          throw new DependencyUnavailableError('reservas');
        }

        return {
          funcion_id: funcion.id,
          fecha: funcion.fecha,
          hora: funcion.hora,
          obra: funcion.obra.titulo,
          escenario: funcion.escenario.nombre,
          aforo: funcion.aforo,
          entradas_reservadas: entradasReservadas,
          ocupacion_porcentaje: ocupacionPorcentaje,
        };
      });
    },

    async obtenerFuncionesMasReservadas() {
      const resumen = validarResumenReservas(await reservasClient.getResumen());
      return resumen
        .slice()
        .sort((a, b) => (b.entradas - a.entradas) || (a.funcion_id - b.funcion_id))
        .map(({ funcion_id, entradas, reservas }) => ({
          funcion_id,
          entradas,
          reservas,
        }));
    },

    async obtenerPostulacionesPorEstado() {
      return validarResumenPostulaciones(await convocatoriaClient.getResumen());
    },
  };
}

module.exports = {
  createReportesService,
  validarFunciones,
  validarResumenPostulaciones,
  validarResumenReservas,
};

const { DependencyUnavailableError } = require('../errors');
const {
  PROGRAMACION_URL,
  SERVICE_TIMEOUT_MS,
} = require('../config');
const { createHttpJsonClient } = require('./httpJsonClient');

function createProgramacionClient(options = {}) {
  const getJson = createHttpJsonClient({
    baseUrl: options.baseUrl || PROGRAMACION_URL,
    serviceName: 'programación',
    timeoutMs: options.timeoutMs === undefined ? SERVICE_TIMEOUT_MS : options.timeoutMs,
    fetchImpl: options.fetchImpl,
  });

  return {
    async getFunciones() {
      const funciones = await getJson('/funciones');
      if (!Array.isArray(funciones)) {
        throw new DependencyUnavailableError('programación');
      }
      return funciones;
    },
  };
}

module.exports = { createProgramacionClient };

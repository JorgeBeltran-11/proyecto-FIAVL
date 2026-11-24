const { DependencyUnavailableError } = require('../errors');
const { CONVOCATORIA_URL, SERVICE_TIMEOUT_MS } = require('../config');
const { createHttpJsonClient } = require('./httpJsonClient');

function createConvocatoriaClient(options = {}) {
  const getJson = createHttpJsonClient({
    baseUrl: options.baseUrl || CONVOCATORIA_URL,
    serviceName: 'convocatoria',
    timeoutMs: options.timeoutMs === undefined ? SERVICE_TIMEOUT_MS : options.timeoutMs,
    fetchImpl: options.fetchImpl,
  });

  return {
    async getResumen() {
      const resumen = await getJson('/postulaciones/resumen');
      if (resumen === null || typeof resumen !== 'object' || Array.isArray(resumen)) {
        throw new DependencyUnavailableError('convocatoria');
      }
      return resumen;
    },
  };
}

module.exports = { createConvocatoriaClient };

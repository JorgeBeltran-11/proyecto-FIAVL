const { DependencyUnavailableError } = require('../errors');
const { RESERVAS_URL, SERVICE_TIMEOUT_MS } = require('../config');
const { createHttpJsonClient } = require('./httpJsonClient');

function createReservasClient(options = {}) {
  const getJson = createHttpJsonClient({
    baseUrl: options.baseUrl || RESERVAS_URL,
    serviceName: 'reservas',
    timeoutMs: options.timeoutMs === undefined ? SERVICE_TIMEOUT_MS : options.timeoutMs,
    fetchImpl: options.fetchImpl,
  });

  return {
    async getResumen() {
      const resumen = await getJson('/reservas/resumen');
      if (!Array.isArray(resumen)) {
        throw new DependencyUnavailableError('reservas');
      }
      return resumen;
    },
  };
}

module.exports = { createReservasClient };

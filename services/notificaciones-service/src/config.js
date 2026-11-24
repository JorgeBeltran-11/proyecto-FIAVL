const path = require('node:path');

const PORT = Number(process.env.PORT || 3004);
if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
  throw new Error('PORT debe ser un entero entre 1 y 65535');
}

const DATABASE_PATH = path.resolve(
  __dirname,
  '..',
  process.env.DATABASE_PATH || 'notificaciones.db'
);

function serviceUrl(environmentVariable, defaultValue) {
  const value = process.env[environmentVariable] || defaultValue;
  let url;

  try {
    url = new URL(value);
  } catch (cause) {
    throw new Error(`${environmentVariable} debe ser una URL HTTP o HTTPS`, { cause });
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`${environmentVariable} debe ser una URL HTTP o HTTPS`);
  }

  return url.toString().replace(/\/+$/, '');
}

const SERVICE_TIMEOUT_MS = Number(process.env.SERVICE_TIMEOUT_MS || 5000);
if (!Number.isInteger(SERVICE_TIMEOUT_MS) || SERVICE_TIMEOUT_MS < 1) {
  throw new Error('SERVICE_TIMEOUT_MS debe ser un entero positivo');
}

const PROGRAMACION_URL = serviceUrl('PROGRAMACION_URL', 'http://localhost:3001');
const RESERVAS_URL = serviceUrl('RESERVAS_URL', 'http://localhost:3003');
const CONVOCATORIA_URL = serviceUrl('CONVOCATORIA_URL', 'http://localhost:3002');

module.exports = {
  CONVOCATORIA_URL,
  DATABASE_PATH,
  PORT,
  PROGRAMACION_URL,
  RESERVAS_URL,
  SERVICE_TIMEOUT_MS,
};

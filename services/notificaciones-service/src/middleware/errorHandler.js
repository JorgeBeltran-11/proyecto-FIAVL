const { HttpError } = require('../errors');

function createErrorHandler(logger = console) {
  return (error, req, res, next) => {
    if (res.headersSent) return next(error);

    if (error.type === 'entity.parse.failed' || error.type === 'entity.too.large') {
      return res.status(400).json({ error: 'La solicitud no contiene un JSON válido' });
    }

    const status = error instanceof HttpError ? error.status : 500;
    if (status === 500) {
      logger.error('Error interno en notificaciones-service:', error);
    }

    const message = status === 500 ? 'Error interno del servidor' : error.message;
    return res.status(status).json({ error: message });
  };
}

module.exports = { createErrorHandler };

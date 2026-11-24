const express = require('express');
const { HttpError } = require('./errors');
const { createErrorHandler } = require('./middleware/errorHandler');
const { createNotificationsRoutes } = require('./routes/notificacionesRoutes');
const { createReportesRoutes } = require('./routes/reportesRoutes');

function createApp({ notificacionesService, reportesService, logger = console }) {
  if (!notificacionesService || !reportesService) {
    throw new TypeError('Se requieren los servicios de notificaciones y reportes');
  }

  const app = express();
  app.disable('x-powered-by');
  app.use(express.json());

  app.get('/health', (req, res) => {
    res.json({ servicio: 'notificaciones-service', estado: 'ok' });
  });
  app.use('/notificaciones', createNotificationsRoutes(notificacionesService));
  app.use('/reportes', createReportesRoutes(reportesService));
  app.use((req, res, next) => next(new HttpError(404, 'Ruta no encontrada')));
  app.use(createErrorHandler(logger));

  return app;
}

module.exports = { createApp };

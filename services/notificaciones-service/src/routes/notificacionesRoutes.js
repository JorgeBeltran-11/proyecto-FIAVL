const express = require('express');
const { createNotificationsController } = require('../controllers/notificacionesController');

function createNotificationsRoutes(notificacionesService) {
  const router = express.Router();
  const controller = createNotificationsController(notificacionesService);

  router.post('/', controller.registrar);
  router.get('/', controller.consultar);

  return router;
}

module.exports = { createNotificationsRoutes };

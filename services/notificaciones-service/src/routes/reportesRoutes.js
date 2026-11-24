const express = require('express');
const { createReportesController } = require('../controllers/reportesController');

function createReportesRoutes(reportesService) {
  const router = express.Router();
  const controller = createReportesController(reportesService);

  router.get('/ocupacion', controller.obtenerOcupacion);
  router.get('/funciones-mas-reservadas', controller.obtenerFuncionesMasReservadas);
  router.get('/postulaciones-por-estado', controller.obtenerPostulacionesPorEstado);

  return router;
}

module.exports = { createReportesRoutes };

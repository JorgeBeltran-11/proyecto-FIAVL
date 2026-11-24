function asyncHandler(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res)).catch(next);
  };
}

function createReportesController(reportesService) {
  return {
    obtenerOcupacion: asyncHandler(async (req, res) => (
      res.json(await reportesService.obtenerOcupacion())
    )),
    obtenerFuncionesMasReservadas: asyncHandler(async (req, res) => (
      res.json(await reportesService.obtenerFuncionesMasReservadas())
    )),
    obtenerPostulacionesPorEstado: asyncHandler(async (req, res) => (
      res.json(await reportesService.obtenerPostulacionesPorEstado())
    )),
  };
}

module.exports = { createReportesController };

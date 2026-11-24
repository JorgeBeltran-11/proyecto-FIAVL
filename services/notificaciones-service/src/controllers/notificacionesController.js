function createNotificationsController(notificacionesService) {
  return {
    registrar(req, res) {
      res.status(201).json(notificacionesService.registrar(req.body));
    },

    consultar(req, res) {
      res.json(notificacionesService.consultar(req.query.correo));
    },
  };
}

module.exports = { createNotificationsController };

const router = require('express').Router();
const svc = require('../services/programacion');

// Cartelera: filtros opcionales ?fecha=YYYY-MM-DD&disciplina=teatro
router.get('/', (req, res) => {
  const { fecha, disciplina } = req.query;
  res.json(svc.listarFunciones({ fecha, disciplina }));
});
// Usado por reservas-service (spec-3) para conocer el aforo.
router.get('/:id', (req, res) => res.json(svc.obtenerFuncion(req.params.id)));
router.post('/', (req, res) => res.status(201).json(svc.crearFuncion(req.body)));

module.exports = router;

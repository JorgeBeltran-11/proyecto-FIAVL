const router = require('express').Router();
const svc = require('../services/programacion');

router.get('/', (req, res) => res.json(svc.listarObras()));
router.get('/:id', (req, res) => res.json(svc.obtenerObra(req.params.id)));
// Usado también por convocatoria-service (spec-2) al aprobar una postulación.
router.post('/', (req, res) => res.status(201).json(svc.crearObra(req.body)));

module.exports = router;

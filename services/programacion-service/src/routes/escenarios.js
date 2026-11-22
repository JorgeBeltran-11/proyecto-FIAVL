const router = require('express').Router();
const svc = require('../services/programacion');

router.get('/', (req, res) => res.json(svc.listarEscenarios()));
router.get('/:id', (req, res) => res.json(svc.obtenerEscenario(req.params.id)));
router.post('/', (req, res) => res.status(201).json(svc.crearEscenario(req.body)));

module.exports = router;

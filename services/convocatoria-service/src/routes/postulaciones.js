const router = require('express').Router();
const svc = require('../services/convocatoria');

// Express 4 no captura errores de funciones async: los pasamos a next().
const conErrores = (fn) => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);

// Administración y spec-4 (reportes).
router.get('/', (req, res) => {
  const { estado, disciplina } = req.query;
  res.json(svc.listar({ estado, disciplina }));
});
router.get('/resumen', (req, res) => res.json(svc.resumen()));

// Público: consultar el estado con el código.
router.get('/codigo/:codigo', (req, res) => res.json(svc.obtenerPorCodigo(req.params.codigo)));

// Público: postular una obra.
router.post('/', (req, res) => res.status(201).json(svc.crear(req.body)));

// Administración: detalle, aprobar y rechazar.
router.get('/:id', (req, res) => res.json(svc.obtenerPorId(req.params.id)));
router.post('/:id/aprobar', conErrores(async (req, res) => res.json(await svc.aprobar(req.params.id))));
router.post('/:id/rechazar', conErrores(async (req, res) => res.json(await svc.rechazar(req.params.id, req.body))));

module.exports = router;

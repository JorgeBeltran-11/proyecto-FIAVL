const router = require('express').Router();
const svc = require('../services/reservas');

// Express 4 no captura errores de funciones async: los pasamos a next().
const conErrores = (fn) => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);

// Lista y resumen: usados por spec-4 (reportes).
router.get('/', (req, res) => {
  const { funcion_id, estado } = req.query;
  res.json(svc.listar({ funcion_id, estado }));
});
router.get('/resumen', (req, res) => res.json(svc.resumen()));

// Público: consultar y cancelar por código.
router.get('/codigo/:codigo', conErrores(async (req, res) => res.json(await svc.obtenerPorCodigo(req.params.codigo))));
router.post('/codigo/:codigo/cancelar', (req, res) => res.json(svc.cancelar(req.params.codigo)));

// Público: reservar entradas.
router.post('/', conErrores(async (req, res) => res.status(201).json(await svc.crearReserva(req.body))));

module.exports = router;

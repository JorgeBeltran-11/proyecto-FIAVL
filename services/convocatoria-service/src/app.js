const express = require('express');
const cors = require('cors');
const { ErrorNegocio, DISCIPLINAS, ESTADOS } = require('./services/convocatoria');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => res.json({ servicio: 'convocatoria-service', estado: 'ok' }));
app.get('/catalogos', (req, res) => res.json({ disciplinas: DISCIPLINAS, estados: ESTADOS }));

app.use('/postulaciones', require('./routes/postulaciones'));

// Manejo central de errores: traduce ErrorNegocio a su código HTTP.
app.use((err, req, res, next) => {
  if (err instanceof ErrorNegocio) return res.status(err.status).json({ error: err.message });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'El cuerpo no es un JSON válido' });
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

module.exports = app;

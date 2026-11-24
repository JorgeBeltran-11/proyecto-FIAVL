const express = require('express');
const cors = require('cors');
const { ErrorNegocio } = require('./services/reservas');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => res.json({ servicio: 'reservas-service', estado: 'ok' }));

app.use('/reservas', require('./routes/reservas'));

// Manejo central de errores: traduce ErrorNegocio a su código HTTP.
app.use((err, req, res, next) => {
  if (err instanceof ErrorNegocio) return res.status(err.status).json({ error: err.message, ...err.extra });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'El cuerpo no es un JSON válido' });
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

module.exports = app;

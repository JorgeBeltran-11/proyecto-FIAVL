const express = require('express');
const cors = require('cors');
const { ErrorNegocio, DISCIPLINAS, TIPOS_ESCENARIO } = require('./services/programacion');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => res.json({ servicio: 'programacion-service', estado: 'ok' }));
app.get('/catalogos', (req, res) => res.json({ disciplinas: DISCIPLINAS, tiposEscenario: TIPOS_ESCENARIO }));

app.use('/escenarios', require('./routes/escenarios'));
app.use('/obras', require('./routes/obras'));
app.use('/funciones', require('./routes/funciones'));

// Manejo central de errores: traduce ErrorNegocio a su código HTTP.
app.use((err, req, res, next) => {
  if (err instanceof ErrorNegocio) return res.status(err.status).json({ error: err.message });
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

module.exports = app;

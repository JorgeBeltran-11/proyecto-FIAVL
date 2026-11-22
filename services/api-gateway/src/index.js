const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');

// Registro de servicios: cada spec agrega o ajusta su línea aquí.
const SERVICIOS = {
  programacion: process.env.PROGRAMACION_URL || 'http://localhost:3001',   // spec-1
  convocatoria: process.env.CONVOCATORIA_URL || 'http://localhost:3002',   // spec-2
  reservas: process.env.RESERVAS_URL || 'http://localhost:3003',           // spec-3
  notificaciones: process.env.NOTIFICACIONES_URL || 'http://localhost:3004', // spec-4
};

const app = express();
app.use(cors());

// Estado de todos los servicios (T013)
app.get('/api/health', async (req, res) => {
  const estado = {};
  await Promise.all(
    Object.entries(SERVICIOS).map(async ([nombre, url]) => {
      try {
        const r = await fetch(`${url}/health`, { signal: AbortSignal.timeout(1500) });
        estado[nombre] = r.ok ? 'activo' : 'con errores';
      } catch {
        estado[nombre] = 'no disponible';
      }
    })
  );
  res.json({ gateway: 'activo', servicios: estado });
});

// Proxy: /api/<servicio>/... → <url del servicio>/...
for (const [nombre, target] of Object.entries(SERVICIOS)) {
  app.use(
    `/api/${nombre}`,
    createProxyMiddleware({
      target,
      changeOrigin: true,
      on: {
        // NFR-003: si el servicio está caído, responder 503 sin tumbar el gateway
        error: (err, req, res) => {
          if (!res.headersSent) {
            res.writeHead(503, { 'Content-Type': 'application/json' });
          }
          res.end(JSON.stringify({ error: `Servicio ${nombre} no disponible` }));
        },
      },
    })
  );
}

app.use((req, res) => res.status(404).json({ error: `Ruta ${req.originalUrl} no existe en el gateway` }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API Gateway escuchando en http://localhost:${PORT}`);
  for (const [n, u] of Object.entries(SERVICIOS)) console.log(`  /api/${n} → ${u}`);
});

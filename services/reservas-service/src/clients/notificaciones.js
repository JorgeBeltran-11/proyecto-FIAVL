// Cliente de notificaciones-service (spec-4). Formato provisional, ver contracts/reservas-api.md.
const NOTIFICACIONES_URL = process.env.NOTIFICACIONES_URL || 'http://localhost:3004';

// POST /notificaciones. Nunca lanza error: devuelve true si spec-4 lo registró (FR-007).
async function enviar(aviso) {
  try {
    const res = await fetch(`${NOTIFICACIONES_URL}/notificaciones`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(aviso),
      signal: AbortSignal.timeout(2000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

module.exports = { enviar };

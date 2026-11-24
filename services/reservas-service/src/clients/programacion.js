// Cliente de programacion-service (spec-1). Si cambia su contrato, solo se toca este archivo.
const PROGRAMACION_URL = process.env.PROGRAMACION_URL || 'http://localhost:3001';

class ProgramacionNoDisponible extends Error {}

// GET /funciones/:id → la función (con aforo), null si no existe (404).
// Lanza ProgramacionNoDisponible si el servicio no responde o falla.
async function obtenerFuncion(id) {
  let res;
  try {
    res = await fetch(`${PROGRAMACION_URL}/funciones/${encodeURIComponent(id)}`, {
      signal: AbortSignal.timeout(2000),
    });
  } catch {
    throw new ProgramacionNoDisponible('Servicio de programación no disponible');
  }
  if (res.status === 404) return null;
  if (!res.ok) throw new ProgramacionNoDisponible(`Servicio de programación respondió ${res.status}`);
  return res.json();
}

module.exports = { obtenerFuncion, ProgramacionNoDisponible };

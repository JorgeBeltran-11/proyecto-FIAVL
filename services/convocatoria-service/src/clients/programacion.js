// Cliente de programacion-service (spec-1). Si cambia su contrato, solo se toca este archivo.
const PROGRAMACION_URL = process.env.PROGRAMACION_URL || 'http://localhost:3001';

class ProgramacionNoDisponible extends Error {}
class ObraRechazada extends Error {}

// POST /obras → la obra creada (con id).
// Lanza ProgramacionNoDisponible si no responde o falla (→ 503)
// y ObraRechazada si programación responde 4xx con los datos (→ 502).
async function crearObra(obra) {
  let res;
  try {
    res = await fetch(`${PROGRAMACION_URL}/obras`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(obra),
      signal: AbortSignal.timeout(3000),
    });
  } catch {
    throw new ProgramacionNoDisponible('Servicio de programación no disponible');
  }
  const data = await res.json().catch(() => ({}));
  if (res.status >= 400 && res.status < 500) {
    throw new ObraRechazada(`Programación rechazó la obra: ${data.error || `error ${res.status}`}`);
  }
  if (!res.ok || !data.id) throw new ProgramacionNoDisponible(`Servicio de programación respondió ${res.status}`);
  return data;
}

module.exports = { crearObra, ProgramacionNoDisponible, ObraRechazada };

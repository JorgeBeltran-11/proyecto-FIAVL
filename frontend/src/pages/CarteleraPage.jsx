import { useEffect, useState } from 'react';
import { api } from '../api.js';

const DIAS = Array.from({ length: 11 }, (_, i) => `2026-11-${String(12 + i).padStart(2, '0')}`);
const DISCIPLINAS = ['teatro', 'danza', 'musica', 'circo', 'titeres', 'artes-visuales'];
const NOMBRE_DIA = (f) =>
  new Date(`${f}T12:00:00`).toLocaleDateString('es-EC', { weekday: 'short', day: 'numeric', month: 'short' });

// HU-1: Ver la cartelera con filtros por día y disciplina.
export default function CarteleraPage() {
  const [funciones, setFunciones] = useState([]);
  const [fecha, setFecha] = useState('');
  const [disciplina, setDisciplina] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams();
    if (fecha) params.set('fecha', fecha);
    if (disciplina) params.set('disciplina', disciplina);
    setCargando(true);
    api
      .get(`/programacion/funciones?${params}`)
      .then((d) => { setFunciones(d); setError(''); })
      .catch((e) => setError(e.message))
      .finally(() => setCargando(false));
  }, [fecha, disciplina]);

  return (
    <section>
      <h1>Cartelera</h1>
      <div className="filtros">
        <label>
          Día
          <select value={fecha} onChange={(e) => setFecha(e.target.value)}>
            <option value="">Todos los días</option>
            {DIAS.map((d) => <option key={d} value={d}>{NOMBRE_DIA(d)}</option>)}
          </select>
        </label>
        <label>
          Disciplina
          <select value={disciplina} onChange={(e) => setDisciplina(e.target.value)}>
            <option value="">Todas</option>
            {DISCIPLINAS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </label>
      </div>

      {error && <p className="error">{error}</p>}
      {!error && !cargando && funciones.length === 0 && <p className="vacio">No hay funciones para este filtro</p>}

      <div className="grilla">
        {funciones.map((f) => (
          <article key={f.id} className="tarjeta">
            <span className={`etiqueta ${f.obra.disciplina}`}>{f.obra.disciplina}</span>
            <h2>{f.obra.titulo}</h2>
            <p className="compania">{f.obra.compania} · {f.obra.pais}</p>
            <p><strong>{NOMBRE_DIA(f.fecha)}</strong> · {f.hora} · {f.obra.duracion_min} min</p>
            <p>{f.escenario.nombre}</p>
            <p className="pie">
              <span>{f.precio > 0 ? `$${f.precio.toFixed(2)}` : 'Gratuita'}</span>
              <span>Aforo {f.aforo}</span>
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

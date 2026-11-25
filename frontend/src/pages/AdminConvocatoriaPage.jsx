import { useEffect, useState } from 'react';
import { api } from '../api.js';

const DISCIPLINAS = ['teatro', 'danza', 'musica', 'circo', 'titeres', 'artes-visuales'];
const ESTADOS = ['pendiente', 'aprobada', 'rechazada'];
const FECHA = (iso) => new Date(iso).toLocaleDateString('es-EC', { day: 'numeric', month: 'short', year: 'numeric' });

// HU-4 y HU-5: detalle con las acciones de aprobar y rechazar.
function Detalle({ postulacion: p, onDecidida }) {
  const [motivo, setMotivo] = useState('');
  const [mensaje, setMensaje] = useState(null);
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => { setMotivo(''); setMensaje(null); }, [p.id]);

  const decidir = async (accion, cuerpo) => {
    setOcupado(true);
    setMensaje(null);
    try {
      const r = await api.post(`/convocatoria/postulaciones/${p.id}/${accion}`, cuerpo);
      const aviso = r.notificacion === 'enviada' ? 'Se avisó a la compañía.' : 'No se pudo avisar a la compañía (notificaciones no disponible).';
      const texto = accion === 'aprobar'
        ? `Aprobada. Se creó la obra ${r.obra_id} en programación. ${aviso}`
        : `Rechazada. ${aviso}`;
      setMensaje({ ok: true, texto });
      onDecidida();
    } catch (err) {
      setMensaje({ ok: false, texto: err.message });
    } finally {
      setOcupado(false);
    }
  };

  return (
    <div className="panel">
      <h2>{p.titulo}</h2>
      <p><span className={`etiqueta estado-${p.estado}`}>{p.estado}</span> <span className={`etiqueta ${p.disciplina}`}>{p.disciplina}</span></p>
      <p><strong>{p.compania}</strong> · {p.pais} · {p.duracion_min} min</p>
      <p>{p.sinopsis}</p>
      <p className="compania">{p.responsable} · {p.correo}</p>
      {p.video_url && <p><a href={p.video_url} target="_blank" rel="noreferrer">Ver video de la obra</a></p>}
      <p className="compania">Código {p.codigo} · enviada el {FECHA(p.fecha_envio)}</p>
      {p.estado === 'rechazada' && <p>Motivo del rechazo: {p.motivo_rechazo}</p>}
      {p.estado === 'aprobada' && <p>Obra en programación: #{p.obra_id}</p>}

      {p.estado === 'pendiente' && (
        <>
          <button type="button" disabled={ocupado} onClick={() => decidir('aprobar')}>Aprobar y pasar a programación</button>
          <label>
            Motivo del rechazo
            <textarea rows="2" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
          </label>
          <button type="button" className="secundario" disabled={ocupado || !motivo.trim()} onClick={() => decidir('rechazar', { motivo })}>
            Rechazar
          </button>
        </>
      )}
      {mensaje && <p className={mensaje.ok ? 'exito' : 'error'}>{mensaje.texto}</p>}
    </div>
  );
}

// HU-3: lista de postulaciones con filtros.
export default function AdminConvocatoriaPage() {
  const [filtros, setFiltros] = useState({ estado: '', disciplina: '' });
  const [lista, setLista] = useState([]);
  const [resumen, setResumen] = useState(null);
  const [seleccionada, setSeleccionada] = useState(null);
  const [error, setError] = useState(null);

  const cargar = () => {
    const query = new URLSearchParams(Object.entries(filtros).filter(([, v]) => v)).toString();
    api
      .get(`/convocatoria/postulaciones${query ? `?${query}` : ''}`)
      .then((datos) => {
        setLista(datos);
        setError(null);
        setSeleccionada((actual) => (actual ? datos.find((d) => d.id === actual.id) || actual : null));
      })
      .catch((e) => setError(e.message));
    api.get('/convocatoria/postulaciones/resumen').then(setResumen).catch(() => setResumen(null));
  };
  useEffect(cargar, [filtros]); // eslint-disable-line

  const recargarSeleccionada = async () => {
    cargar();
    if (seleccionada) setSeleccionada(await api.get(`/convocatoria/postulaciones/${seleccionada.id}`));
  };

  return (
    <section>
      <h1>Administración · Convocatoria</h1>
      {resumen && (
        <p className="compania">
          {resumen.pendiente} pendientes · {resumen.aprobada} aprobadas · {resumen.rechazada} rechazadas · {resumen.total} en total
        </p>
      )}
      <div className="filtros">
        <label>
          Estado
          <select value={filtros.estado} onChange={(e) => setFiltros({ ...filtros, estado: e.target.value })}>
            <option value="">Todos</option>
            {ESTADOS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <label>
          Disciplina
          <select value={filtros.disciplina} onChange={(e) => setFiltros({ ...filtros, disciplina: e.target.value })}>
            <option value="">Todas</option>
            {DISCIPLINAS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </label>
      </div>
      {error && <p className="error">{error}</p>}

      <div className="admin">
        <div className="lista-postulaciones">
          {lista.length === 0 && !error && <p className="vacio">No hay postulaciones para este filtro</p>}
          {lista.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`tarjeta fila ${seleccionada?.id === p.id ? 'elegida' : ''}`}
              onClick={() => setSeleccionada(p)}
            >
              <span className={`etiqueta estado-${p.estado}`}>{p.estado}</span>
              <strong>{p.titulo}</strong>
              <span className="compania">{p.compania} · {p.disciplina} · {FECHA(p.fecha_envio)}</span>
            </button>
          ))}
        </div>
        {seleccionada
          ? <Detalle postulacion={seleccionada} onDecidida={recargarSeleccionada} />
          : <p className="vacio">Elige una postulación para ver su detalle</p>}
      </div>
    </section>
  );
}

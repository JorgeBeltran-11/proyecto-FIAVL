import { useEffect, useState } from 'react';
import { api } from '../api.js';

const DISCIPLINAS = ['teatro', 'danza', 'musica', 'circo', 'titeres', 'artes-visuales'];
const VACIO = {
  titulo: '', compania: '', pais: '', disciplina: 'teatro', duracion_min: '',
  sinopsis: '', responsable: '', correo: '', video_url: '',
};
const FECHA = (iso) => new Date(iso).toLocaleDateString('es-EC', { day: 'numeric', month: 'long', year: 'numeric' });

// HU-1: formulario público para postular una obra.
function FormularioPostulacion({ onEnviada }) {
  const [datos, setDatos] = useState(VACIO);
  const [mensaje, setMensaje] = useState(null);
  const cambiar = (campo) => (e) => setDatos({ ...datos, [campo]: e.target.value });

  const enviar = async (e) => {
    e.preventDefault();
    try {
      const cuerpo = { ...datos, duracion_min: Number(datos.duracion_min) };
      if (!cuerpo.video_url.trim()) delete cuerpo.video_url;
      const r = await api.post('/convocatoria/postulaciones', cuerpo);
      setMensaje({ ok: true, texto: `Postulación enviada. Guarda tu código: ${r.codigo}` });
      setDatos(VACIO);
      onEnviada(r.codigo);
    } catch (err) {
      setMensaje({ ok: false, texto: err.message });
    }
  };

  return (
    <form className="panel" onSubmit={enviar}>
      <h2>Postular una obra</h2>
      <label>Título de la obra<input value={datos.titulo} onChange={cambiar('titulo')} required /></label>
      <label>Compañía<input value={datos.compania} onChange={cambiar('compania')} required /></label>
      <label>País de origen<input value={datos.pais} onChange={cambiar('pais')} required /></label>
      <label>
        Disciplina
        <select value={datos.disciplina} onChange={cambiar('disciplina')}>
          {DISCIPLINAS.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
      </label>
      <label>
        Duración (min)
        <input type="number" min="1" value={datos.duracion_min} onChange={cambiar('duracion_min')} required />
      </label>
      <label>Sinopsis<textarea rows="3" value={datos.sinopsis} onChange={cambiar('sinopsis')} required /></label>
      <label>Nombre del responsable<input value={datos.responsable} onChange={cambiar('responsable')} required /></label>
      <label>Correo de contacto<input type="email" value={datos.correo} onChange={cambiar('correo')} required /></label>
      <label>
        Enlace a un video (opcional)
        <input type="url" value={datos.video_url} onChange={cambiar('video_url')} placeholder="https://..." />
      </label>
      <button type="submit">Enviar postulación</button>
      {mensaje && <p className={mensaje.ok ? 'exito' : 'error'}>{mensaje.texto}</p>}
    </form>
  );
}

// HU-2: consultar el estado con el código.
function ConsultaPostulacion({ codigoInicial }) {
  const [codigo, setCodigo] = useState('');
  const [postulacion, setPostulacion] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (codigoInicial) setCodigo(codigoInicial);
  }, [codigoInicial]);

  const consultar = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      setPostulacion(await api.get(`/convocatoria/postulaciones/codigo/${encodeURIComponent(codigo.trim())}`));
    } catch (err) {
      setPostulacion(null);
      setError(err.message);
    }
  };

  return (
    <form className="panel" onSubmit={consultar}>
      <h2>Consultar mi postulación</h2>
      <label>
        Código de postulación
        <input value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="CONV-XXXXXX" required />
      </label>
      <button type="submit">Consultar</button>
      {postulacion && (
        <div>
          <p><span className={`etiqueta estado-${postulacion.estado}`}>{postulacion.estado}</span></p>
          <p><strong>{postulacion.titulo}</strong></p>
          <p className="compania">Enviada el {FECHA(postulacion.fecha_envio)}</p>
          {postulacion.estado === 'rechazada' && <p>Motivo: {postulacion.motivo_rechazo}</p>}
          {postulacion.estado === 'aprobada' && <p className="exito">¡Tu obra forma parte de la programación del festival!</p>}
        </div>
      )}
      {error && <p className="error">{error}</p>}
    </form>
  );
}

export default function ConvocatoriaPage() {
  const [ultimoCodigo, setUltimoCodigo] = useState('');
  return (
    <section>
      <h1>Convocatoria de artistas</h1>
      <div className="admin">
        <FormularioPostulacion onEnviada={setUltimoCodigo} />
        <ConsultaPostulacion codigoInicial={ultimoCodigo} />
      </div>
    </section>
  );
}

import { useEffect, useState } from 'react';
import { api } from '../api.js';

const DISCIPLINAS = ['teatro', 'danza', 'musica', 'circo', 'titeres', 'artes-visuales'];
const TIPOS = ['teatro', 'plaza', 'parque', 'centro-cultural', 'calle'];

// Formulario genérico: recibe los campos y la ruta del POST.
function Formulario({ titulo, campos, ruta, onCreado }) {
  const inicial = Object.fromEntries(campos.map((c) => [c.name, c.opciones ? c.opciones[0]?.value ?? '' : '']));
  const [datos, setDatos] = useState(inicial);
  const [mensaje, setMensaje] = useState(null);

  useEffect(() => setDatos(inicial), [JSON.stringify(campos.map((c) => c.opciones))]); // eslint-disable-line

  const enviar = async (e) => {
    e.preventDefault();
    try {
      await api.post(ruta, datos);
      setMensaje({ ok: true, texto: `${titulo}: guardado correctamente` });
      setDatos(inicial);
      onCreado();
    } catch (err) {
      setMensaje({ ok: false, texto: err.message });
    }
  };

  return (
    <form className="panel" onSubmit={enviar}>
      <h2>{titulo}</h2>
      {campos.map((c) => (
        <label key={c.name}>
          {c.label}
          {c.opciones ? (
            <select value={datos[c.name]} onChange={(e) => setDatos({ ...datos, [c.name]: e.target.value })}>
              {c.opciones.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          ) : (
            <input
              type={c.type || 'text'}
              value={datos[c.name]}
              onChange={(e) => setDatos({ ...datos, [c.name]: e.target.value })}
              {...(c.attrs || {})}
            />
          )}
        </label>
      ))}
      <button type="submit">Guardar</button>
      {mensaje && <p className={mensaje.ok ? 'exito' : 'error'}>{mensaje.texto}</p>}
    </form>
  );
}

const op = (lista) => lista.map((v) => ({ value: v, label: v }));

// HU-2, HU-3 y HU-4: administración de escenarios, obras y funciones.
export default function AdminProgramacionPage() {
  const [escenarios, setEscenarios] = useState([]);
  const [obras, setObras] = useState([]);

  const recargar = () => {
    api.get('/programacion/escenarios').then(setEscenarios).catch(() => {});
    api.get('/programacion/obras').then(setObras).catch(() => {});
  };
  useEffect(recargar, []);

  return (
    <section>
      <h1>Administración · Programación</h1>
      <div className="admin">
        <Formulario
          titulo="Escenario"
          ruta="/programacion/escenarios"
          onCreado={recargar}
          campos={[
            { name: 'nombre', label: 'Nombre' },
            { name: 'direccion', label: 'Dirección' },
            { name: 'tipo', label: 'Tipo', opciones: op(TIPOS) },
            { name: 'aforo', label: 'Aforo', type: 'number', attrs: { min: 1 } },
          ]}
        />
        <Formulario
          titulo="Obra"
          ruta="/programacion/obras"
          onCreado={recargar}
          campos={[
            { name: 'titulo', label: 'Título' },
            { name: 'compania', label: 'Compañía' },
            { name: 'pais', label: 'País' },
            { name: 'disciplina', label: 'Disciplina', opciones: op(DISCIPLINAS) },
            { name: 'duracion_min', label: 'Duración (min)', type: 'number', attrs: { min: 1 } },
            { name: 'sinopsis', label: 'Sinopsis' },
          ]}
        />
        <Formulario
          titulo="Función"
          ruta="/programacion/funciones"
          onCreado={recargar}
          campos={[
            { name: 'obra_id', label: 'Obra', opciones: obras.map((o) => ({ value: o.id, label: o.titulo })) },
            { name: 'escenario_id', label: 'Escenario', opciones: escenarios.map((e) => ({ value: e.id, label: `${e.nombre} (${e.aforo})` })) },
            { name: 'fecha', label: 'Fecha', type: 'date', attrs: { min: '2026-11-12', max: '2026-11-22' } },
            { name: 'hora', label: 'Hora', type: 'time' },
            { name: 'precio', label: 'Precio ($, 0 = gratuita)', type: 'number', attrs: { min: 0, step: '0.5' } },
          ]}
        />
      </div>
    </section>
  );
}

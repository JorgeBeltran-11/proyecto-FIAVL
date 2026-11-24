import { useEffect, useState } from 'react';
import { api } from '../api.js';

const NOMBRE_DIA = (f) =>
  new Date(`${f}T12:00:00`).toLocaleDateString('es-EC', { weekday: 'short', day: 'numeric', month: 'short' });
const VACIO = { funcion_id: '', nombre: '', correo: '', cantidad: 1 };

// HU-1 y HU-2: reservar entradas para una función de la cartelera.
function FormularioReserva({ onReservada }) {
  const [funciones, setFunciones] = useState([]);
  const [vendidas, setVendidas] = useState({});
  const [datos, setDatos] = useState(VACIO);
  const [mensaje, setMensaje] = useState(null);

  const cargar = () => {
    api
      .get('/programacion/funciones')
      .then(setFunciones)
      .catch((e) => setMensaje({ ok: false, texto: e.message }));
    api
      .get('/reservas/reservas/resumen')
      .then((r) => setVendidas(Object.fromEntries(r.map((x) => [x.funcion_id, x.entradas]))))
      .catch(() => setVendidas({}));
  };
  useEffect(cargar, []);

  const cambiar = (campo) => (e) => setDatos({ ...datos, [campo]: e.target.value });

  const enviar = async (e) => {
    e.preventDefault();
    try {
      const r = await api.post('/reservas/reservas', { ...datos, cantidad: Number(datos.cantidad) });
      setMensaje({ ok: true, texto: `Reserva confirmada. Tu código es ${r.codigo}` });
      setDatos(VACIO);
      cargar();
      onReservada(r.codigo);
    } catch (err) {
      setMensaje({ ok: false, texto: err.message });
    }
  };

  return (
    <form className="panel" onSubmit={enviar}>
      <h2>Reservar entradas</h2>
      <label>
        Función
        <select value={datos.funcion_id} onChange={cambiar('funcion_id')} required>
          <option value="">Elige una función</option>
          {funciones.map((f) => {
            const quedan = f.aforo - (vendidas[f.id] || 0);
            return (
              <option key={f.id} value={f.id} disabled={quedan <= 0}>
                {f.obra.titulo} · {NOMBRE_DIA(f.fecha)} {f.hora} · {f.escenario.nombre} · quedan {quedan}
              </option>
            );
          })}
        </select>
      </label>
      <label>
        Nombre
        <input value={datos.nombre} onChange={cambiar('nombre')} required />
      </label>
      <label>
        Correo
        <input type="email" value={datos.correo} onChange={cambiar('correo')} required />
      </label>
      <label>
        Cantidad de entradas
        <input type="number" min="1" value={datos.cantidad} onChange={cambiar('cantidad')} required />
      </label>
      <button type="submit">Reservar</button>
      {mensaje && <p className={mensaje.ok ? 'exito' : 'error'}>{mensaje.texto}</p>}
    </form>
  );
}

// HU-3 y HU-4: consultar y cancelar una reserva por su código.
function ConsultaReserva({ codigoInicial }) {
  const [codigo, setCodigo] = useState('');
  const [reserva, setReserva] = useState(null);
  const [mensaje, setMensaje] = useState(null);

  useEffect(() => {
    if (codigoInicial) setCodigo(codigoInicial);
  }, [codigoInicial]);

  const consultar = async (e) => {
    e?.preventDefault();
    setMensaje(null);
    try {
      setReserva(await api.get(`/reservas/reservas/codigo/${encodeURIComponent(codigo.trim())}`));
    } catch (err) {
      setReserva(null);
      setMensaje({ ok: false, texto: err.message });
    }
  };

  const cancelar = async () => {
    if (!window.confirm('¿Seguro que quieres cancelar esta reserva?')) return;
    try {
      await api.post(`/reservas/reservas/codigo/${encodeURIComponent(reserva.codigo)}/cancelar`);
      setMensaje({ ok: true, texto: 'Reserva cancelada. Las entradas quedaron libres.' });
      setReserva(await api.get(`/reservas/reservas/codigo/${encodeURIComponent(reserva.codigo)}`));
    } catch (err) {
      setMensaje({ ok: false, texto: err.message });
    }
  };

  return (
    <form className="panel" onSubmit={consultar}>
      <h2>Consultar mi reserva</h2>
      <label>
        Código de reserva
        <input value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="RES-XXXXXX" required />
      </label>
      <button type="submit">Consultar</button>

      {reserva && (
        <div>
          <p>
            <span className={`etiqueta ${reserva.estado === 'confirmada' ? 'circo' : ''}`}>{reserva.estado}</span>
          </p>
          {reserva.funcion ? (
            <>
              <p><strong>{reserva.funcion.obra}</strong></p>
              <p>{NOMBRE_DIA(reserva.funcion.fecha)} · {reserva.funcion.hora} · {reserva.funcion.escenario}</p>
            </>
          ) : (
            <p className="vacio">Función {reserva.funcion_id} (datos de la función no disponibles)</p>
          )}
          <p>{reserva.nombre} · {reserva.cantidad} entradas</p>
          <p className="compania">Reservada el {new Date(reserva.fecha_reserva).toLocaleString('es-EC')}</p>
          {reserva.estado === 'confirmada' && (
            <button type="button" onClick={cancelar}>Cancelar reserva</button>
          )}
        </div>
      )}
      {mensaje && <p className={mensaje.ok ? 'exito' : 'error'}>{mensaje.texto}</p>}
    </form>
  );
}

export default function ReservasPage() {
  const [ultimoCodigo, setUltimoCodigo] = useState('');
  return (
    <section>
      <h1>Mis reservas</h1>
      <div className="admin">
        <FormularioReserva onReservada={setUltimoCodigo} />
        <ConsultaReserva codigoInicial={ultimoCodigo} />
      </div>
    </section>
  );
}

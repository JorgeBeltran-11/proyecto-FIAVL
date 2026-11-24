import { useState } from 'react';
import CarteleraPage from './pages/CarteleraPage.jsx';
import AdminProgramacionPage from './pages/AdminProgramacionPage.jsx';
import ReservasPage from './pages/ReservasPage.jsx';

// Menú principal. Cada spec agrega aquí su página.
const PAGINAS = [
  { id: 'cartelera', titulo: 'Cartelera', componente: CarteleraPage },                       // spec-1
  { id: 'admin-programacion', titulo: 'Admin · Programación', componente: AdminProgramacionPage }, // spec-1
  // { id: 'convocatoria', titulo: 'Convocatoria', componente: ConvocatoriaPage },         // spec-2
  { id: 'reservas', titulo: 'Mis reservas', componente: ReservasPage },                     // spec-3
  // { id: 'reportes', titulo: 'Admin · Reportes', componente: ReportesPage },            // spec-4
];

export default function App() {
  const [actual, setActual] = useState('cartelera');
  const Pagina = PAGINAS.find((p) => p.id === actual).componente;

  return (
    <>
      <header className="header">
        <div className="marca">
          <span className="sigla">FIAVL</span>
          <span className="nombre">Festival Internacional de Artes Vivas Loja · 12–22 nov 2026</span>
        </div>
        <nav>
          {PAGINAS.map((p) => (
            <button key={p.id} className={p.id === actual ? 'activo' : ''} onClick={() => setActual(p.id)}>
              {p.titulo}
            </button>
          ))}
        </nav>
      </header>
      <main className="contenido">
        <Pagina />
      </main>
    </>
  );
}

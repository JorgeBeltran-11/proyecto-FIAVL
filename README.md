# proyecto-FIAVL

Plataforma web para el **Festival Internacional de Artes Vivas Loja (FIAVL)**:
cartelera de funciones, convocatoria de artistas, reserva de entradas y
reportes.

- **Asignatura:** Arquitectura de Software — UTPL
- **Metodología:** Specification-Driven Development (SDD)
- **Estilo arquitectónico:** Microservicios con API Gateway
- **Stack:** Node.js + Express + SQLite · React + Vite · Mermaid

## Estructura

```
proyecto-FIAVL/
├── .specify/memory/constitution.md   # Reglas del proyecto (SDD)
├── specs/                            # Una carpeta por spec (spec → plan → tasks)
├── services/                         # Un microservicio por spec + API Gateway
├── frontend/                         # Aplicación web React
└── docs/
    ├── reparto-specs.md              # Quién hace qué
    └── arquitectura/                 # Modelo 4+1 con diagramas Mermaid
```

## Cómo ejecutar

```powershell
npm run instalar   # solo la primera vez
npm run dev        # levanta gateway, servicios y frontend
```

Abrir http://localhost:5173 · Más detalles en
[specs/spec-1-programacion/quickstart.md](specs/spec-1-programacion/quickstart.md).

## Equipo y specs

Ver [docs/reparto-specs.md](docs/reparto-specs.md).

## Flujo de trabajo

Cada integrante trabaja en su rama (`spec-1` … `spec-4`) e integra a `main`
mediante Pull Request. Ver la [constitución](.specify/memory/constitution.md).

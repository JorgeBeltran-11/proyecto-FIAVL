# Arquitectura FIAVL — Modelo 4+1

- **Estilo:** Microservicios con API Gateway
- **Estado:** spec-1 y spec-3 implementadas · spec-2 y spec-4 planificadas
  (en los diagramas, las líneas punteadas son lo que falta implementar)

| Vista | Pregunta que responde | Interesado principal |
|---|---|---|
| [+1 Escenarios](#1-vista-de-escenarios-1) | ¿Qué hace el sistema? | Usuarios, todo el equipo |
| [Lógica](#2-vista-lógica) | ¿Qué partes del dominio existen? | Analistas, desarrolladores |
| [Desarrollo](#3-vista-de-desarrollo) | ¿Cómo está organizado el código? | Desarrolladores |
| [Procesos](#4-vista-de-procesos) | ¿Cómo colaboran en tiempo de ejecución? | Integradores |
| [Física](#5-vista-física) | ¿Dónde se ejecuta cada parte? | Operaciones |

---

## 1. Vista de escenarios (+1)

Casos de uso principales y la spec responsable de cada uno.

```mermaid
flowchart LR
    publico([Público])
    compania([Compañía artística])
    admin([Administrador])

    subgraph FIAVL[Plataforma FIAVL]
        CU1[CU-1 Consultar cartelera<br/><i>spec-1</i>]
        CU2[CU-2 Gestionar escenarios, obras y funciones<br/><i>spec-1</i>]
        CU3[CU-3 Postular una obra<br/><i>spec-2</i>]
        CU4[CU-4 Aprobar o rechazar postulación<br/><i>spec-2</i>]
        CU5[CU-5 Reservar entradas<br/><i>spec-3</i>]
        CU6[CU-6 Consultar o cancelar reserva<br/><i>spec-3</i>]
        CU7[CU-7 Ver notificaciones<br/><i>spec-4</i>]
        CU8[CU-8 Ver reportes de ocupación<br/><i>spec-4</i>]
    end

    publico --> CU1
    publico --> CU5
    publico --> CU6
    publico --> CU7
    compania --> CU3
    compania --> CU7
    admin --> CU2
    admin --> CU4
    admin --> CU8
```

**Escenario clave que recorre todas las vistas — "Reservar una entrada":**
el público ve una función en la cartelera (spec-1), reserva 2 entradas
(spec-3), reservas verifica el aforo con programación (spec-1) y, al
confirmar, se registra una notificación (spec-4).

---

## 2. Vista lógica

Cada microservicio es un **contexto delimitado** (bounded context) dueño de sus
entidades. Las relaciones entre contextos son **por id**, nunca por clave
foránea entre bases de datos.

```mermaid
classDiagram
    namespace Programacion_spec1 {
        class Escenario {
            +int id
            +string nombre
            +string direccion
            +string tipo
            +int aforo
        }
        class Obra {
            +int id
            +string titulo
            +string compania
            +string pais
            +string disciplina
            +int duracionMin
        }
        class Funcion {
            +int id
            +date fecha
            +time hora
            +int aforo
            +decimal precio
        }
    }
    namespace Convocatoria_spec2 {
        class Postulacion {
            +int id
            +string codigo
            +string tituloObra
            +string compania
            +string estado
            +int obraId
        }
    }
    namespace Reservas_spec3 {
        class Reserva {
            +int id
            +string codigo
            +int funcionId
            +string nombre
            +string correo
            +int cantidad
            +string estado
        }
    }
    namespace Notificaciones_spec4 {
        class Notificacion {
            +int id
            +string correo
            +string tipo
            +string mensaje
            +datetime fecha
        }
    }

    Escenario "1" --> "*" Funcion : alberga
    Obra "1" --> "*" Funcion : se presenta en
    Postulacion ..> Obra : al aprobar crea (obraId)
    Reserva ..> Funcion : referencia (funcionId)
    Notificacion ..> Reserva : informa
```

---

## 3. Vista de desarrollo

Organización del repositorio: un paquete independiente por servicio, cada uno
con las mismas capas internas (rutas → servicios de negocio → datos).

```mermaid
flowchart TB
    subgraph repo[proyecto-FIAVL]
        direction TB
        subgraph specs[specs/]
            s1[spec-1-programacion]
            s2[spec-2-convocatoria]:::pend
            s3[spec-3-reservas]
            s4[spec-4-notificaciones]:::pend
        end
        subgraph fe[frontend/ React + Vite]
            pages[pages/] --> apijs[api.js]
        end
        subgraph services[services/]
            gw[api-gateway]
            subgraph prog[programacion-service]
                direction TB
                rutas[routes/] --> negocio[services/] --> datos[db.js · SQLite]
            end
            conv[convocatoria-service]:::pend
            subgraph res[reservas-service]
                direction TB
                rutasR[routes/] --> negocioR[services/] --> datosR[db.js · SQLite]
                negocioR --> clientesR[clients/]
            end
            noti[notificaciones-service]:::pend
        end
        docs[docs/arquitectura]
    end
    apijs -->|HTTP /api| gw
    gw --> prog
    gw -.-> conv
    gw --> res
    gw -.-> noti
    clientesR -->|HTTP| prog
    clientesR -.->|HTTP| noti
    s1 -. especifica .-> prog
    s3 -. especifica .-> res

    classDef pend stroke-dasharray: 5 5,fill:#f5f5f5,color:#777
```

| Paquete | Rama | Dependencias |
|---|---|---|
| `services/api-gateway` | spec-1 | express, http-proxy-middleware |
| `services/programacion-service` | spec-1 | express, better-sqlite3 |
| `services/convocatoria-service` | spec-2 | express, better-sqlite3 |
| `services/reservas-service` | spec-3 | express, better-sqlite3 |
| `services/notificaciones-service` | spec-4 | express, better-sqlite3 |
| `frontend` | compartido | react, vite |

---

## 4. Vista de procesos

### 4.1 Consultar la cartelera (implementado)

```mermaid
sequenceDiagram
    actor P as Público
    participant FE as Frontend
    participant GW as API Gateway :3000
    participant PR as programacion-service :3001
    participant DB as programacion.db

    P->>FE: Abre Cartelera y filtra por "danza"
    FE->>GW: GET /api/programacion/funciones?disciplina=danza
    GW->>PR: GET /funciones?disciplina=danza
    PR->>DB: SELECT funciones JOIN obra JOIN escenario
    DB-->>PR: filas
    PR-->>GW: 200 [funciones]
    GW-->>FE: 200 [funciones]
    FE-->>P: Tarjetas de funciones
```

### 4.2 Reservar entradas (spec-3 + spec-1 + spec-4) (implementado, salvo spec-4)

```mermaid
sequenceDiagram
    actor P as Público
    participant GW as API Gateway
    participant RE as reservas-service :3003
    participant PR as programacion-service :3001
    participant NO as notificaciones-service :3004

    P->>GW: POST /api/reservas/reservas {funcion_id, nombre, correo, cantidad}
    GW->>RE: POST /reservas
    RE->>PR: GET /funciones/:id
    alt programación no responde
        PR--xRE: sin respuesta
        RE-->>GW: 503 Servicio de programación no disponible
    else función existe
        PR-->>RE: 200 {aforo}
        RE->>RE: vendidas + cantidad <= aforo?
        alt hay cupo
            RE->>RE: guardar reserva (código)
            RE-)NO: POST /notificaciones {correo, tipo: reserva}
            RE-->>GW: 201 {codigo}
        else sin cupo
            RE-->>GW: 409 Aforo completo
        end
    end
    GW-->>P: respuesta
```

### 4.3 Aprobar una postulación (spec-2 + spec-1)

```mermaid
sequenceDiagram
    actor A as Administrador
    participant GW as API Gateway
    participant CO as convocatoria-service :3002
    participant PR as programacion-service :3001
    participant NO as notificaciones-service :3004

    A->>GW: POST /api/convocatoria/postulaciones/:id/aprobar
    GW->>CO: POST /postulaciones/:id/aprobar
    CO->>PR: POST /obras {titulo, compania, ...}
    PR-->>CO: 201 {id}
    CO->>CO: estado = aprobada, obraId = id
    CO-)NO: POST /notificaciones {correo, tipo: postulacion}
    CO-->>GW: 200 postulación aprobada
```

---

## 5. Vista física

Despliegue en el entorno de desarrollo: cada servicio es un proceso Node.js
independiente con su propio archivo de base de datos.

```mermaid
flowchart LR
    subgraph cliente[Equipo del usuario]
        nav[Navegador web]
    end
    subgraph servidor[Servidor / laptop de desarrollo]
        vite[Vite dev server<br/>:5173]
        gw[Node · api-gateway<br/>:3000]
        subgraph n1[Node · programacion-service :3001]
            db1[(programacion.db)]
        end
        subgraph n2[Node · convocatoria-service :3002]
            db2[(convocatoria.db)]
        end
        subgraph n3[Node · reservas-service :3003]
            db3[(reservas.db)]
        end
        subgraph n4[Node · notificaciones-service :3004]
            db4[(notificaciones.db)]
        end
    end
    nav -->|HTTP| vite
    vite -->|proxy /api| gw
    gw --> n1
    gw -.-> n2
    gw --> n3
    gw -.-> n4
    n3 -->|HTTP| n1
    n2 -.->|HTTP| n1
    n3 -.->|HTTP| n4
    n2 -.->|HTTP| n4
```

En producción, cada nodo podría ser un contenedor distinto; como solo se
comunican por HTTP, basta con cambiar las URLs en las variables de entorno del
gateway (`PROGRAMACION_URL`, `RESERVAS_URL`, ...).

---

## Decisiones arquitectónicas

Ver [decisiones.md](decisiones.md).

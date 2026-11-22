# Registro de decisiones arquitectónicas (ADR)

Estas decisiones son las que se explican en el video de sustentación.

## ADR-001 — Microservicios en lugar de monolito

- **Contexto:** El enunciado prohíbe el monolito modular. Somos 4 integrantes
  trabajando en ramas separadas y el festival tiene áreas de negocio claras
  (programación, convocatoria, reservas, notificaciones).
- **Decisión:** Un microservicio por área de negocio, uno por integrante.
- **Consecuencias:**
  - ✅ Cada integrante trabaja, prueba y despliega su servicio sin bloquear a los demás.
  - ✅ Si reservas falla, la cartelera sigue funcionando (aislamiento de fallos).
  - ✅ Durante el festival (muchas consultas a la cartelera) se podría escalar
    solo `programacion-service`.
  - ⚠️ Más procesos que levantar y llamadas por red entre servicios.

## ADR-002 — API Gateway como punto único de entrada

- **Contexto:** El frontend necesitaría conocer 4 puertos distintos.
- **Decisión:** Un gateway en `:3000` que enruta `/api/<servicio>/*`.
- **Consecuencias:**
  - ✅ El frontend solo conoce `/api`; los servicios pueden moverse sin cambiarlo.
  - ✅ Manejo uniforme de errores: si un servicio está caído, devuelve 503.
  - ⚠️ El gateway es un punto único de falla (aceptable en el prototipo).

## ADR-003 — Una base de datos por servicio (SQLite)

- **Contexto:** Si dos servicios comparten tablas, quedan acoplados.
- **Decisión:** Cada servicio tiene su propio archivo SQLite; nadie lee la base de otro.
- **Consecuencias:**
  - ✅ Independencia de datos y de esquema.
  - ✅ SQLite no requiere instalar un motor de base de datos.
  - ⚠️ Los datos de otro servicio se obtienen por API (ej.: reservas pide el
    aforo a programación).

## ADR-004 — Comunicación REST síncrona

- **Contexto:** Las interacciones entre servicios son pocas y simples.
- **Decisión:** HTTP/JSON con contratos en `specs/<spec>/contracts/`.
- **Consecuencias:**
  - ✅ Fácil de probar con el navegador o `curl` y de explicar.
  - ⚠️ Acoplamiento temporal: si programación cae, reservas no puede validar
    el aforo (responde 503). Una mejora futura sería usar eventos o caché.

## ADR-005 — Specification-Driven Development con contratos primero

- **Contexto:** Cuatro personas construyen piezas que deben encajar.
- **Decisión:** Cada spec publica primero su contrato de API; los demás
  programan contra ese contrato.
- **Consecuencias:**
  - ✅ Se puede trabajar en paralelo sin esperar a que el otro termine.
  - ⚠️ Cambiar un contrato obliga a avisar al equipo y actualizar la spec.

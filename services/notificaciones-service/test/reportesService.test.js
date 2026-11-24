const assert = require('node:assert/strict');
const test = require('node:test');
const { DependencyUnavailableError } = require('../src/errors');
const { createReportesService } = require('../src/services/reportesService');

const funciones = [
  {
    id: 2,
    fecha: '2026-11-14',
    hora: '19:00',
    aforo: 100,
    obra: { titulo: 'Obra B' },
    escenario: { nombre: 'Sala B' },
  },
  {
    id: 1,
    fecha: '2026-11-15',
    hora: '20:00',
    aforo: 50,
    obra: { titulo: 'Obra A' },
    escenario: { nombre: 'Sala A' },
  },
];

function crearServicio({ funcionesRespuesta = funciones, reservas = [], postulaciones = {
  pendiente: 2,
  aprobada: 3,
  rechazada: 1,
  total: 6,
} } = {}) {
  return createReportesService({
    programacionClient: { async getFunciones() { return funcionesRespuesta; } },
    reservasClient: { async getResumen() { return reservas; } },
    convocatoriaClient: { async getResumen() { return postulaciones; } },
  });
}

async function assertDependencyUnavailable(promise) {
  await assert.rejects(promise, (error) => {
    assert.ok(error instanceof DependencyUnavailableError);
    assert.equal(error.status, 503);
    return true;
  });
}

test('calcula ocupación, relaciona por ID e incluye funciones sin reservas', async () => {
  const service = crearServicio({
    reservas: [{ funcion_id: 2, entradas: 25, reservas: 8 }],
  });

  assert.deepEqual(await service.obtenerOcupacion(), [
    {
      funcion_id: 2,
      fecha: '2026-11-14',
      hora: '19:00',
      obra: 'Obra B',
      escenario: 'Sala B',
      aforo: 100,
      entradas_reservadas: 25,
      ocupacion_porcentaje: 25,
    },
    {
      funcion_id: 1,
      fecha: '2026-11-15',
      hora: '20:00',
      obra: 'Obra A',
      escenario: 'Sala A',
      aforo: 50,
      entradas_reservadas: 0,
      ocupacion_porcentaje: 0,
    },
  ]);
});

test('el reporte de ocupación queda vacío cuando no hay funciones ni reservas', async () => {
  assert.deepEqual(
    await crearServicio({ funcionesRespuesta: [], reservas: [] }).obtenerOcupacion(),
    []
  );
});

test('ocupación rechaza aforo, métricas, referencias o datos de función inválidos', async () => {
  const casos = [
    {
      funcionesRespuesta: [{ ...funciones[0], aforo: 0 }],
      reservas: [],
    },
    {
      funcionesRespuesta: [{ ...funciones[0], aforo: -1 }],
      reservas: [],
    },
    {
      funcionesRespuesta: [funciones[0]],
      reservas: [{ funcion_id: 2, entradas: -1, reservas: 1 }],
    },
    {
      funcionesRespuesta: [funciones[0]],
      reservas: [{ funcion_id: 99, entradas: 1, reservas: 1 }],
    },
    {
      funcionesRespuesta: [{ ...funciones[0], aforo: 1 }],
      reservas: [{ funcion_id: 2, entradas: Number.MAX_VALUE, reservas: 1 }],
    },
    {
      funcionesRespuesta: [{ ...funciones[0], obra: {} }],
      reservas: [],
    },
    {
      funcionesRespuesta: [funciones[0], funciones[0]],
      reservas: [],
    },
  ];

  for (const caso of casos) {
    await assertDependencyUnavailable(crearServicio(caso).obtenerOcupacion());
  }
});

test('ocupación rechaza formatos y valores de fecha y hora inválidos', async () => {
  const casos = [
    { fecha: '14-11-2026' },
    { fecha: '2026-02-30' },
    { hora: '7:00' },
    { hora: '24:00' },
  ];

  for (const cambios of casos) {
    await assertDependencyUnavailable(
      crearServicio({
        funcionesRespuesta: [{ ...funciones[0], ...cambios }],
        reservas: [],
      }).obtenerOcupacion()
    );
  }
});

test('ordena funciones por entradas descendentes y desempata por funcion_id', async () => {
  const service = crearServicio({
    reservas: [
      { funcion_id: 8, entradas: 12, reservas: 4 },
      { funcion_id: 3, entradas: 20, reservas: 5 },
      { funcion_id: 6, entradas: 12, reservas: 9 },
    ],
  });

  assert.deepEqual(await service.obtenerFuncionesMasReservadas(), [
    { funcion_id: 3, entradas: 20, reservas: 5 },
    { funcion_id: 6, entradas: 12, reservas: 9 },
    { funcion_id: 8, entradas: 12, reservas: 4 },
  ]);
});

test('el reporte de demanda conserva lista vacía y rechaza filas incorrectas', async () => {
  assert.deepEqual(
    await crearServicio({ reservas: [] }).obtenerFuncionesMasReservadas(),
    []
  );

  for (const reservas of [
    [{ funcion_id: 1, entradas: -1, reservas: 1 }],
    [{ funcion_id: 1, entradas: 1, reservas: -1 }],
    [{ funcion_id: 1, entradas: 1.5, reservas: 1 }],
    [{ funcion_id: 1, entradas: 1, reservas: 1 }, { funcion_id: 1, entradas: 2, reservas: 2 }],
    [{ funcion_id: 1, entradas: 1 }],
  ]) {
    await assertDependencyUnavailable(
      crearServicio({ reservas }).obtenerFuncionesMasReservadas()
    );
  }
});

test('devuelve los cuatro conteos de postulaciones, incluidos los valores cero', async () => {
  const service = crearServicio({
    postulaciones: { pendiente: 0, aprobada: 0, rechazada: 0, total: 0 },
  });

  assert.deepEqual(await service.obtenerPostulacionesPorEstado(), {
    pendiente: 0,
    aprobada: 0,
    rechazada: 0,
    total: 0,
  });
});

test('postulaciones rechaza respuesta vacía, campos ausentes y conteos inválidos', async () => {
  for (const postulaciones of [
    null,
    [],
    {},
    { pendiente: 1, aprobada: 0, rechazada: 0 },
    { pendiente: -1, aprobada: 0, rechazada: 0, total: 0 },
    { pendiente: 0, aprobada: 1.2, rechazada: 0, total: 1 },
  ]) {
    await assertDependencyUnavailable(
      crearServicio({ postulaciones }).obtenerPostulacionesPorEstado()
    );
  }
});

test('no sustituye el total remoto por un cálculo local', async () => {
  const service = crearServicio({
    postulaciones: { pendiente: 1, aprobada: 1, rechazada: 0, total: 9 },
  });

  assert.deepEqual(await service.obtenerPostulacionesPorEstado(), {
    pendiente: 1,
    aprobada: 1,
    rechazada: 0,
    total: 9,
  });
});

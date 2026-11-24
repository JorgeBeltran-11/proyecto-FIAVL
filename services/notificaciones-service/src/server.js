const {
  CONVOCATORIA_URL,
  PORT,
  PROGRAMACION_URL,
  RESERVAS_URL,
  SERVICE_TIMEOUT_MS,
} = require('./config');
const { openDatabase } = require('./database');
const { createApp } = require('./app');
const { registerShutdownHandlers } = require('./serverLifecycle');
const { createNotificationsRepository } = require('./repositories/notificacionesRepository');
const { createNotificationsService } = require('./services/notificacionesService');
const { createProgramacionClient } = require('./clients/programacionClient');
const { createReservasClient } = require('./clients/reservasClient');
const { createConvocatoriaClient } = require('./clients/convocatoriaClient');
const { createReportesService } = require('./services/reportesService');

let database;

try {
  database = openDatabase();
} catch (error) {
  console.error('No se pudo iniciar notificaciones-service:', error);
  process.exitCode = 1;
}

if (database) {
  const repository = createNotificationsRepository(database);
  const notificacionesService = createNotificationsService(repository);
  const reportesService = createReportesService({
    programacionClient: createProgramacionClient({
      baseUrl: PROGRAMACION_URL,
      timeoutMs: SERVICE_TIMEOUT_MS,
    }),
    reservasClient: createReservasClient({
      baseUrl: RESERVAS_URL,
      timeoutMs: SERVICE_TIMEOUT_MS,
    }),
    convocatoriaClient: createConvocatoriaClient({
      baseUrl: CONVOCATORIA_URL,
      timeoutMs: SERVICE_TIMEOUT_MS,
    }),
  });
  const app = createApp({ notificacionesService, reportesService });
  const server = app.listen(PORT, () => {
    console.log(`notificaciones-service escuchando en http://localhost:${PORT}`);
  });
  registerShutdownHandlers(server, database);
}

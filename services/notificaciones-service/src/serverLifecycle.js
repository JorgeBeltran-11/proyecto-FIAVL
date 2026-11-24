const { closeDatabase } = require('./database');

function registerShutdownHandlers(
  server,
  database,
  { signals = process, logger = console, setExitCode = (code) => { process.exitCode = code; } } = {}
) {
  let closing = false;

  function closeDatabaseSafely() {
    try {
      closeDatabase(database);
    } catch (error) {
      logger.error('No se pudo cerrar la base SQLite:', error);
      setExitCode(1);
    }
  }

  function shutdown(signal) {
    if (closing) return;
    closing = true;
    logger.log(`Cerrando notificaciones-service (${signal})`);

    server.close((serverError) => {
      if (serverError) {
        logger.error('No se pudo cerrar el servidor HTTP:', serverError);
        setExitCode(1);
      }
      closeDatabaseSafely();
    });
  }

  server.on('error', (error) => {
    logger.error('Error del servidor HTTP:', error);
    setExitCode(1);
    if (closing) return;
    closing = true;
    closeDatabaseSafely();
  });

  signals.once('SIGINT', () => shutdown('SIGINT'));
  signals.once('SIGTERM', () => shutdown('SIGTERM'));
}

module.exports = { registerShutdownHandlers };

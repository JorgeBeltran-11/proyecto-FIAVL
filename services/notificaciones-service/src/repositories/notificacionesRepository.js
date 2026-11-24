class NotificationsRepositoryError extends Error {
  constructor(operation, cause) {
    super(`No se pudo ${operation} en el repositorio de notificaciones`, { cause });
    this.name = 'NotificationsRepositoryError';
  }
}

function createNotificationsRepository(db) {
  const insertar = db.prepare(`
    INSERT INTO notificacion (correo, tipo, referencia, mensaje, fecha_creacion)
    VALUES (@correo, @tipo, @referencia, @mensaje, @fecha_creacion)
  `);
  const obtenerPorId = db.prepare('SELECT * FROM notificacion WHERE id = ?');
  const buscarPorCorreo = db.prepare(`
    SELECT * FROM notificacion
    WHERE correo = ?
    ORDER BY fecha_creacion DESC, id DESC
  `);

  function crear({ correo, tipo, referencia, mensaje }) {
    const notificacion = {
      correo,
      tipo,
      referencia,
      mensaje,
      fecha_creacion: new Date().toISOString(),
    };

    try {
      const resultado = insertar.run(notificacion);
      return obtenerPorId.get(resultado.lastInsertRowid);
    } catch (cause) {
      throw new NotificationsRepositoryError('insertar una notificación', cause);
    }
  }

  function buscarPorCorreoElectronico(correo) {
    try {
      return buscarPorCorreo.all(correo);
    } catch (cause) {
      throw new NotificationsRepositoryError('consultar notificaciones', cause);
    }
  }

  return { crear, buscarPorCorreoElectronico };
}

module.exports = { NotificationsRepositoryError, createNotificationsRepository };

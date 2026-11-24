class HttpError extends Error {
  constructor(status, message, options) {
    super(message, options);
    this.name = 'HttpError';
    this.status = status;
  }
}

class ValidationError extends HttpError {
  constructor(message) {
    super(400, message);
    this.name = 'ValidationError';
  }
}

class DependencyUnavailableError extends HttpError {
  constructor(serviceName, cause) {
    super(
      503,
      `Servicio de ${serviceName} no disponible`,
      cause === undefined ? undefined : { cause }
    );
    this.name = 'DependencyUnavailableError';
  }
}

module.exports = { DependencyUnavailableError, HttpError, ValidationError };

const { DependencyUnavailableError } = require('../errors');

function isJsonContentType(contentType) {
  const mediaType = (contentType || '').split(';', 1)[0].trim().toLowerCase();
  return mediaType === 'application/json'
    || (mediaType.startsWith('application/') && mediaType.endsWith('+json'));
}

async function discardResponseBody(response, serviceName) {
  try {
    if (response.body) await response.body.cancel();
  } catch (cause) {
    throw new DependencyUnavailableError(serviceName, cause);
  }
}

function createHttpJsonClient({ baseUrl, serviceName, timeoutMs, fetchImpl = globalThis.fetch }) {
  if (
    typeof baseUrl !== 'string'
    || typeof serviceName !== 'string'
    || !Number.isInteger(timeoutMs)
    || timeoutMs < 1
    || typeof fetchImpl !== 'function'
  ) {
    throw new TypeError('La configuración del cliente HTTP no es válida');
  }

  const baseUrlWithSlash = `${baseUrl.replace(/\/+$/, '')}/`;

  return async function getJson(resourcePath) {
    let response;
    try {
      const url = new URL(resourcePath.replace(/^\/+/, ''), baseUrlWithSlash);
      response = await fetchImpl(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (cause) {
      throw new DependencyUnavailableError(serviceName, cause);
    }

    if (!response.ok) {
      await discardResponseBody(response, serviceName);
      throw new DependencyUnavailableError(
        serviceName,
        new Error(`El servicio respondió HTTP ${response.status}`)
      );
    }

    if (!isJsonContentType(response.headers.get('content-type'))) {
      await discardResponseBody(response, serviceName);
      throw new DependencyUnavailableError(serviceName);
    }

    try {
      return await response.json();
    } catch (cause) {
      throw new DependencyUnavailableError(serviceName, cause);
    }
  };
}

module.exports = { createHttpJsonClient };

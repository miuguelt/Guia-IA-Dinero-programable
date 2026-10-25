const HEADERS = {
  'x-content-type-options': 'nosniff', 'referrer-policy': 'same-origin',
  'content-security-policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'self'",
  'cache-control': 'no-store'
};

function json(response, status, data) {
  response.writeHead(status, { ...HEADERS, 'content-type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(data, (_, value) => typeof value === 'bigint' ? value.toString() : value));
}

function failure(response, error) {
  json(response, error.status || 500, { error: {
    code: error.code || 'REQUEST_FAILED', message: error.status ? error.message : 'No se pudo completar la solicitud. Revisa el estado local e intenta de nuevo.',
    retryable: !error.status || error.status >= 500
  } });
}

function reject(status, message, code = 'INVALID_REQUEST') {
  return Object.assign(new Error(message), { status, code });
}

module.exports = { HEADERS, json, failure, reject };

const { test } = require('node:test');
const assert = require('node:assert/strict');
const net = require('node:net');
const { provisionDatabase } = require('../../scripts/provision-database.cjs');

test('aprovisionamiento usa GUIA_DB_HOST y GUIA_DB_PORT del PostgreSQL del aprendiz', async () => {
  const connections = [];
  const server = net.createServer(socket => { connections.push(socket.remoteAddress); socket.destroy(); });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  try {
    await assert.rejects(provisionDatabase({ GUIA_ADMIN_USER: 'postgres', GUIA_ADMIN_PASSWORD: 'clave-de-prueba',
      GUIA_DB_USER: 'guia_dinero_programable', GUIA_DB_PASSWORD: 'clave-del-rol', GUIA_DB_HOST: '127.0.0.1', GUIA_DB_PORT: String(port) }));
    assert.equal(connections.length, 1, 'La conexión administrativa llega al servidor y puerto configurados.');
  } finally { await new Promise(resolve => server.close(resolve)); }
});

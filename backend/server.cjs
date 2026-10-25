const { createServer } = require('node:http');
const { createHandler } = require('./http/handler.cjs');
const { createRuntime } = require('./runtime.cjs');

async function startServer(options = {}) {
  const port = options.port ?? Number(process.env.GUIA_PORT || 8153);
  const dependencies = options.dependencies || await createRuntime({ ...options, port });
  const server = createServer(createHandler(dependencies));
  server.requestTimeout = 30000;
  await new Promise((resolve, reject) => {
    server.once('error', reject); server.listen(port, '127.0.0.1', resolve);
  });
  async function close() { await new Promise(resolve => server.close(resolve)); await dependencies.close(); }
  return { server, close };
}

async function runCli({ start = startServer, operator = process, logger = console, options = {} } = {}) {
  try {
    const instance = await start(options);
    logger.log('Aula disponible en http://localhost:8153/.');
    async function shutdown() { await instance.close(); operator.exit(0); }
    for (const signal of ['SIGINT', 'SIGTERM']) operator.once(signal, shutdown);
    return { instance, shutdown };
  } catch {
    logger.error('No se pudo iniciar el aula. Revisa el puerto y las dependencias locales.');
    operator.exitCode = 1;
    return null;
  }
}

if (require.main === module) void runCli();

module.exports = { startServer, runCli };

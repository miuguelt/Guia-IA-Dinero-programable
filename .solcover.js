module.exports = {
  istanbulFolder: './test-results/solidity',
  istanbulReporter: ['html', 'lcov', 'text', 'json'],
  // Los fixtures son actores de prueba (receptor adversarial, tokens no estándar), no código de producción.
  skipFiles: ['fixtures/'],
};

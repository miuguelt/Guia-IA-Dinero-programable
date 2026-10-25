const {expect} = require('chai');
const {spawnSync} = require('node:child_process');
const path = require('node:path');

describe('Cierre de los trabajadores de pruebas ZK', function () {
  it('permite que un proceso Node termine por sí mismo después de generar, verificar y cerrar', function () {
    this.timeout(30000);
    const result = spawnSync(process.execPath,[path.resolve(__dirname,'fixtures/chain-shutdown.cjs')],{encoding:'utf8',timeout:10000,windowsHide:true});
    expect(result.stdout).to.include('Prueba criptográfica verificada');
    expect(result.error?.code, 'El proceso no debe quedar retenido por trabajadores ZK.').not.to.equal('ETIMEDOUT');
    expect(result.status,result.stderr).to.equal(0);
  });
});

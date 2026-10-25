const { expect } = require('chai');
const { ethers } = require('hardhat');
const { loadFixture } = require('@nomicfoundation/hardhat-toolbox/network-helpers');
const { TIPOS_EVENTO, leerEventos, sincronizar, reconstruir } = require('../src/indexador');
const { RepositorioMemoria } = require('../src/repositorio-memoria');
const { ESQUEMA_SQL, crearPoolDesdeEntorno, RepositorioPostgres } = require('../src/repositorio-postgres');

async function conMovimientos() {
  const [admin, oraculo, productor] = await ethers.getSigners();
  const contrato = await (await ethers.getContractFactory('GarantiaAgroPay')).deploy(oraculo.address);
  await contrato.depositarGarantia({ value: ethers.parseEther('2') });
  await contrato.connect(oraculo).autorizarPago(5, productor.address, ethers.parseEther('1'));
  await contrato.connect(productor).retirar();
  return { contrato, admin, productor };
}

function pruebasDeProyeccion(crearRepositorio) {
  it('guarda los tres eventos con sus datos', async () => {
    const { contrato, admin, productor } = await loadFixture(conMovimientos);
    const repositorio = await crearRepositorio();
    expect(await sincronizar({ contrato, repositorio })).to.deep.equal({ leidos: 3, nuevos: 3 });

    const eventos = await repositorio.listarEventos();
    expect(eventos.map(e => e.tipo)).to.deep.equal(TIPOS_EVENTO);
    expect(eventos[0]).to.include({ cuenta: admin.address, montoWei: ethers.parseEther('2').toString(), idLote: null });
    expect(eventos[1]).to.include({ cuenta: productor.address, idLote: '5', montoWei: ethers.parseEther('1').toString() });
    expect(eventos[1].txHash).to.match(/^0x[0-9a-f]{64}$/);
  });

  it('no duplica eventos al sincronizar otra vez', async () => {
    const { contrato } = await loadFixture(conMovimientos);
    const repositorio = await crearRepositorio();
    await sincronizar({ contrato, repositorio });
    expect(await sincronizar({ contrato, repositorio })).to.deep.equal({ leidos: 3, nuevos: 0 });
    expect(await repositorio.listarEventos()).to.have.length(3);
  });

  it('reconstruye la proyección con los mismos registros', async () => {
    const { contrato } = await loadFixture(conMovimientos);
    const repositorio = await crearRepositorio();
    await sincronizar({ contrato, repositorio });
    const antes = await repositorio.listarEventos();
    expect(await reconstruir({ contrato, repositorio })).to.deep.equal({ leidos: 3, nuevos: 3 });
    expect(await repositorio.listarEventos()).to.deep.equal(antes);
  });
}

describe('Etapa 5 · Indexador de eventos', () => {
  it('lee solo los eventos desde el bloque indicado', async () => {
    const { contrato } = await loadFixture(conMovimientos);
    const todos = await leerEventos(contrato);
    expect(todos).to.have.length(3);
    expect(await leerEventos(contrato, todos[2].bloque)).to.have.length(1);
  });

  describe('repositorio en memoria (nivel mínimo)', () => {
    pruebasDeProyeccion(async () => new RepositorioMemoria());
  });

  describe('conexión a PostgreSQL', () => {
    it('exige la URL en el entorno y valida el esquema', () => {
      expect(() => crearPoolDesdeEntorno({})).to.throw('TALLER_DATABASE_URL');
      expect(() => crearPoolDesdeEntorno({ TALLER_DATABASE_URL: 'postgres://x@127.0.0.1/x', TALLER_DATABASE_SCHEMA: 'a;b' }))
        .to.throw('TALLER_DATABASE_SCHEMA');
    });

    it('la tabla impide duplicados por transacción e índice de evento', () => {
      expect(ESQUEMA_SQL).to.match(/UNIQUE\s*\(\s*tx_hash\s*,\s*log_index\s*\)/i);
      expect(ESQUEMA_SQL).to.match(/monto_wei\s+NUMERIC\s*\(\s*78\s*,\s*0\s*\)/i);
    });
  });

  describe('repositorio PostgreSQL (nivel completo)', function () {
    let pool;
    before(async function () {
      if (!process.env.TALLER_DATABASE_URL) {
        console.log('      Nivel completo omitido: define TALLER_DATABASE_URL para probar con PostgreSQL.');
        this.skip();
      }
      pool = crearPoolDesdeEntorno();
      await new RepositorioPostgres(pool).preparar();
    });
    after(async () => { if (pool) await pool.end(); });

    pruebasDeProyeccion(async () => {
      const repositorio = new RepositorioPostgres(pool);
      await repositorio.vaciar();
      return repositorio;
    });
  });
});

// Pruebas del indexador y de la proyección: sin duplicados, reconstruible y en orden.
const { expect } = require('chai');
const { ethers } = require('hardhat');
const { TIPOS_EVENTO, leerEventos, sincronizar, reconstruir, proyectarProductos } = require('../backend-node/indexador');
const { RepositorioMemoria } = require('../backend-node/repositorio-memoria');
const { ESQUEMA_SQL, crearPoolDesdeEntorno, RepositorioPostgres } = require('../backend-node/repositorio-postgres');
const { levantarApi } = require('./apoyo');

async function contratoConHistoria() {
  const [responsable] = await ethers.getSigners();
  const contrato = await (await ethers.getContractFactory('RegistroProductos')).deploy();
  await contrato.crear('Café', 12000);
  await contrato.crear('Panela', 4500);
  await contrato.actualizarPrecio(1, 13500);
  await contrato.desactivar(2);
  return { contrato, responsable };
}

function comprobarRepositorio(crearRepositorio) {
  let repositorio, contrato, responsable;
  beforeEach(async () => {
    ({ contrato, responsable } = await contratoConHistoria());
    repositorio = await crearRepositorio();
  });

  it('guarda los cuatro eventos con sus datos y en orden', async () => {
    expect(await sincronizar({ contrato, repositorio })).to.include({ leidos: 4, nuevos: 4 });
    const eventos = await repositorio.listarEventos();
    expect(eventos.map(evento => [evento.tipo, evento.idProducto, evento.nombre, evento.precio])).to.deep.equal([
      ['ProductoCreado', '1', 'Café', '12000'],
      ['ProductoCreado', '2', 'Panela', '4500'],
      ['PrecioActualizado', '1', null, '13500'],
      ['ProductoDesactivado', '2', null, null],
    ]);
    expect(eventos[0].cuenta).to.equal(responsable.address);
    expect(eventos[0].txHash).to.match(/^0x[0-9a-f]{64}$/);
    expect(eventos[2].cuenta).to.equal(null);
  });

  it('sincronizar otra vez no duplica eventos', async () => {
    await sincronizar({ contrato, repositorio });
    expect(await sincronizar({ contrato, repositorio })).to.include({ leidos: 4, nuevos: 0 });
    expect(await repositorio.listarEventos()).to.have.length(4);
  });

  it('reconstruir vacía la proyección y recupera los mismos productos', async () => {
    await sincronizar({ contrato, repositorio });
    const antes = proyectarProductos(await repositorio.listarEventos());
    expect(await reconstruir({ contrato, repositorio })).to.include({ leidos: 4, nuevos: 4 });
    expect(proyectarProductos(await repositorio.listarEventos())).to.deep.equal(antes);
    expect(antes).to.deep.equal([
      { id: '1', nombre: 'Café', precio: '13500', responsable: responsable.address, activo: true, cambios: 2 },
      { id: '2', nombre: 'Panela', precio: '4500', responsable: responsable.address, activo: false, cambios: 2 },
    ]);
  });
}

describe('Indexador de eventos', () => {
  it('conoce los tres eventos del contrato', () => {
    expect(TIPOS_EVENTO).to.deep.equal(['ProductoCreado', 'PrecioActualizado', 'ProductoDesactivado']);
  });

  it('lee solo desde el bloque indicado e informa hasta dónde llegó', async () => {
    const { contrato } = await contratoConHistoria();
    const todos = await leerEventos(contrato);
    const ultimoBloque = todos.at(-1).bloque;
    expect(await leerEventos(contrato, ultimoBloque)).to.have.length(1);
    const repositorio = new RepositorioMemoria();
    expect(await sincronizar({ contrato, repositorio, desdeBloque: ultimoBloque })).to.deep.equal({ leidos: 1, nuevos: 1, hastaBloque: ultimoBloque });
    expect(await sincronizar({ contrato, repositorio, desdeBloque: ultimoBloque + 5 })).to.deep.equal({ leidos: 0, nuevos: 0, hastaBloque: ultimoBloque + 5 });
  });

  it('la proyección ignora cambios de un producto cuya creación no está en la lista', () => {
    const huerfano = { txHash: '0x1', logIndex: 0, bloque: 3, tipo: 'PrecioActualizado', idProducto: '8', cuenta: null, nombre: null, precio: '5' };
    expect(proyectarProductos([huerfano])).to.deep.equal([]);
  });

  describe('repositorio en memoria (nivel mínimo)', () => {
    comprobarRepositorio(async () => new RepositorioMemoria());
  });

  describe('conexión a PostgreSQL', () => {
    it('exige la URL en el entorno y valida el nombre del esquema', () => {
      expect(() => crearPoolDesdeEntorno({})).to.throw(/DATABASE_URL/);
      expect(() => crearPoolDesdeEntorno({ DATABASE_URL: 'postgres://localhost/x', DATABASE_SCHEMA: 'mal; drop' })).to.throw(/DATABASE_SCHEMA/);
    });

    it('la tabla impide duplicados por transacción e índice de evento', () => {
      expect(ESQUEMA_SQL).to.match(/UNIQUE \(tx_hash, log_index\)/);
      expect(ESQUEMA_SQL).to.match(/CREATE TABLE IF NOT EXISTS eventos_productos/);
    });
  });

  describe('repositorio PostgreSQL (nivel completo)', function () {
    let pool;
    before(function () {
      if (!process.env.DATABASE_URL) {
        console.log('      Nivel completo omitido: define DATABASE_URL para probar con PostgreSQL.');
        this.skip();
      }
      pool = crearPoolDesdeEntorno();
    });
    after(async () => { if (pool) await pool.end(); });

    comprobarRepositorio(async () => {
      const repositorio = new RepositorioPostgres(pool);
      await repositorio.preparar();
      await repositorio.vaciar();
      return repositorio;
    });

    it('la API usa PostgreSQL cuando DATABASE_URL está definida', async () => {
      const app = await levantarApi({ DATABASE_URL: process.env.DATABASE_URL, DATABASE_SCHEMA: process.env.DATABASE_SCHEMA });
      try {
        await app.api.repositorio.vaciar();
        expect(app.api.almacenamiento).to.equal('PostgreSQL');
        await app.llamar('POST', '/api/productos', { nombre: 'Queso', precio: 9000 });
        const { rows } = await pool.query('SELECT tipo, nombre, precio FROM eventos_productos');
        expect(rows).to.deep.equal([{ tipo: 'ProductoCreado', nombre: 'Queso', precio: '9000' }]);
      } finally {
        await app.cerrar();
      }
    });
  });
});

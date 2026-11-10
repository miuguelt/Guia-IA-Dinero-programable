// Pruebas de la API de Node: cada ruta del CRUD contra el contrato real en la red de Hardhat.
const { expect } = require('chai');
const fs = require('node:fs');
const path = require('node:path');
const hre = require('hardhat');
const { levantarApi, puenteRpc, carpetaTemporal, cuentaConSaldo } = require('./apoyo');
const { iniciar, ejecutar } = require('../backend-node/servidor');
const { cargarDespliegue, peticionRpc, conectar } = require('../backend-node/contrato');
const { archivoDespliegue, desplegar, ejecutar: ejecutarDespliegue } = require('../scripts/desplegar');
const { leerId, leerPrecio, leerNombre, nombreRevert, traducirError, ErrorEntrada } = require('../backend-node/app');

describe('API de Node · el CRUD sobre el contrato', () => {
  let app;
  beforeEach(async () => { app = await levantarApi(); });
  afterEach(async () => { await app.cerrar(); });

  it('informa la red, el contrato y la cuenta con la que firma', async () => {
    const { estado, datos } = await app.llamar('GET', '/api/salud');
    expect(estado).to.equal(200);
    expect(datos).to.deep.equal({ contrato: app.despliegue.direccion, chainId: 31337, cuentaApi: app.cuentaApi });
    expect(app.api.almacenamiento).to.equal('memoria');
  });

  it('POST crea el producto, espera el recibo y lo deja en la proyección', async () => {
    const creado = await app.llamar('POST', '/api/productos', { nombre: '  Café  ', precio: 12000 });
    expect(creado.estado).to.equal(201);
    expect(creado.datos.id).to.equal('1');
    expect(creado.datos.txHash).to.match(/^0x[0-9a-f]{64}$/);
    expect(creado.datos.bloque).to.be.greaterThan(app.despliegue.bloque);

    const lista = await app.llamar('GET', '/api/productos');
    expect(lista.datos).to.deep.equal([{ id: '1', nombre: 'Café', precio: '12000', responsable: app.cuentaApi, activo: true, cambios: 1 }]);
  });

  it('GET por id lee el contrato directamente y responde 404 si no existe', async () => {
    await app.llamar('POST', '/api/productos', { nombre: 'Panela', precio: '4500' });
    const uno = await app.llamar('GET', '/api/productos/1');
    expect(uno.datos).to.deep.equal({ id: '1', nombre: 'Panela', precio: '4500', responsable: app.cuentaApi, activo: true });
    const ausente = await app.llamar('GET', '/api/productos/9');
    expect(ausente).to.deep.equal({ estado: 404, datos: { error: 'Ese producto no existe.' } });
  });

  it('PATCH actualiza el precio y el historial conserva el evento anterior', async () => {
    await app.llamar('POST', '/api/productos', { nombre: 'Café', precio: 12000 });
    const cambio = await app.llamar('PATCH', '/api/productos/1', { precio: 13500 });
    expect(cambio.estado).to.equal(200);
    const lista = await app.llamar('GET', '/api/productos');
    expect(lista.datos[0]).to.include({ precio: '13500', cambios: 2 });
    const eventos = await app.llamar('GET', '/api/eventos');
    expect(eventos.datos.map(evento => [evento.tipo, evento.precio])).to.deep.equal([['ProductoCreado', '12000'], ['PrecioActualizado', '13500']]);
  });

  it('DELETE desactiva sin borrar y después rechaza cambios con 409', async () => {
    await app.llamar('POST', '/api/productos', { nombre: 'Café', precio: 12000 });
    expect((await app.llamar('DELETE', '/api/productos/1')).estado).to.equal(200);
    const lista = await app.llamar('GET', '/api/productos');
    expect(lista.datos[0]).to.include({ nombre: 'Café', activo: false, cambios: 2 });
    const cambio = await app.llamar('PATCH', '/api/productos/1', { precio: 1 });
    expect(cambio).to.deep.equal({ estado: 409, datos: { error: 'El producto está desactivado y ya no se modifica.' } });
  });

  it('prepara la transacción para una billetera y no puede modificar el producto de otra cuenta', async () => {
    const preparada = await app.llamar('POST', '/api/transacciones/crear', { nombre: 'Miel', precio: 20000 });
    expect(preparada.datos.to).to.equal(app.despliegue.direccion);
    expect(preparada.datos.chainId).to.equal(31337);

    const [, usuaria] = await hre.ethers.getSigners();
    await (await usuaria.sendTransaction({ to: preparada.datos.to, data: preparada.datos.data })).wait();
    const lista = await app.llamar('GET', '/api/productos');
    expect(lista.datos[0]).to.include({ nombre: 'Miel', responsable: usuaria.address });

    const ajeno = await app.llamar('PATCH', '/api/productos/1', { precio: 1 });
    expect(ajeno).to.deep.equal({ estado: 403, datos: { error: 'Solo la cuenta que creó el producto puede modificarlo.' } });
    expect((await app.llamar('DELETE', '/api/productos/1')).estado).to.equal(403);
  });

  it('rechaza entradas inválidas con 400 antes de gastar gas', async () => {
    const bloqueAntes = await hre.ethers.provider.getBlockNumber();
    for (const [metodo, ruta, cuerpo, mensaje] of [
      ['POST', '/api/productos', { nombre: '', precio: 1 }, /nombre es obligatorio/],
      ['POST', '/api/productos', { precio: 1 }, /nombre es obligatorio/],
      ['POST', '/api/productos', { nombre: 'x'.repeat(81), precio: 1 }, /80 caracteres/],
      ['POST', '/api/productos', { nombre: 'Café', precio: -1 }, /precio debe ser un entero/],
      ['POST', '/api/productos', { nombre: 'Café', precio: '12.5' }, /precio debe ser un entero/],
      ['POST', '/api/productos', { nombre: 'Café' }, /precio debe ser un entero/],
      ['POST', '/api/transacciones/crear', { nombre: 'Café', precio: 1.5 }, /precio debe ser un entero/],
      ['PATCH', '/api/productos/0', { precio: 1 }, /id debe ser un entero positivo/],
      ['DELETE', '/api/productos/abc', undefined, /id debe ser un entero positivo/],
      ['POST', '/api/productos', '{mal json', /JSON válido/],
    ]) {
      const { estado, datos } = await app.llamar(metodo, ruta, cuerpo);
      expect(estado, `${metodo} ${ruta}`).to.equal(400);
      expect(datos.error).to.match(mensaje);
    }
    expect(await hre.ethers.provider.getBlockNumber()).to.equal(bloqueAntes);
  });

  it('entrega la interfaz web desde la misma API', async () => {
    const respuesta = await fetch(app.base + '/');
    expect(respuesta.status).to.equal(200);
    expect(await respuesta.text()).to.include('<h1>Registro de productos</h1>');
  });

  it('responde 502 con un mensaje claro si la red deja de responder', async () => {
    const original = app.api.contrato.runner.provider.send;
    app.api.contrato.runner.provider.send = async () => { throw new Error('conexión rechazada'); };
    try {
      const { estado, datos } = await app.llamar('GET', '/api/productos');
      expect(estado).to.equal(502);
      expect(datos.error).to.match(/La red no respondió/);
    } finally {
      app.api.contrato.runner.provider.send = original;
    }
  });
});

describe('API de Node · validaciones y errores', () => {
  it('leerId, leerPrecio y leerNombre devuelven valores listos para el contrato', () => {
    expect(leerId('15')).to.equal(15n);
    expect(leerPrecio('123456789012345678901234567890')).to.equal(123456789012345678901234567890n);
    expect(leerPrecio(0)).to.equal(0n);
    expect(leerNombre(' Arepa ')).to.equal('Arepa');
    for (const invalido of [() => leerId('-1'), () => leerPrecio(Number.MAX_VALUE), () => leerPrecio(null), () => leerNombre(5)]) {
      expect(invalido).to.throw(ErrorEntrada);
    }
  });

  it('nombreRevert reconoce el error del contrato en las formas que entregan las bibliotecas', async () => {
    const contrato = await (await hre.ethers.getContractFactory('RegistroProductos')).deploy();
    const datos = contrato.interface.encodeErrorResult('ProductoInactivo', [1]);
    expect(nombreRevert(contrato, { revert: { name: 'NombreVacio' } })).to.equal('NombreVacio');
    expect(nombreRevert(contrato, { data: datos })).to.equal('ProductoInactivo');
    expect(nombreRevert(contrato, { error: { data: datos } })).to.equal('ProductoInactivo');
    expect(nombreRevert(contrato, { info: { error: { data: datos } } })).to.equal('ProductoInactivo');
    expect(nombreRevert(contrato, { data: '0x12345678' })).to.equal(null);
    expect(nombreRevert(contrato, { data: 'no es hexadecimal' })).to.equal(null);
    expect(nombreRevert(contrato, new Error('otro'))).to.equal(null);
    expect(traducirError(contrato, { data: datos }).estado).to.equal(409);
    expect(traducirError(contrato, new Error('otro')).estado).to.equal(502);
  });
});

describe('Arranque de la API y despliegue', () => {
  let carpeta;
  beforeEach(() => { carpeta = carpetaTemporal(); });
  afterEach(() => { fs.rmSync(carpeta, { recursive: true, force: true }); });

  it('desplegar escribe red, dirección, bloque y ABI', async () => {
    const destino = path.join(carpeta, 'despliegue.json');
    const despliegue = await desplegar({ hre, destino });
    expect(JSON.parse(fs.readFileSync(destino, 'utf8'))).to.deep.equal(despliegue);
    expect(despliegue.chainId).to.equal(31337);
    expect(despliegue.direccion).to.match(/^0x[0-9a-fA-F]{40}$/);
    expect(despliegue.abi.filter(parte => parte.type === 'function').map(parte => parte.name).sort())
      .to.deep.equal(['actualizarPrecio', 'crear', 'desactivar', 'obtener', 'totalProductos']);
    expect(await hre.ethers.provider.getCode(despliegue.direccion)).to.not.equal('0x');
  });

  it('el despliegue local y el remoto se guardan en archivos distintos', () => {
    expect(path.basename(archivoDespliegue('localhost'))).to.equal('despliegue.json');
    expect(path.basename(archivoDespliegue('hardhat'))).to.equal('despliegue.json');
    expect(path.basename(archivoDespliegue('remota'))).to.equal('despliegue.remota.json');
    const ignorados = fs.readFileSync(path.join(__dirname, '..', '.gitignore'), 'utf8').split(/\r?\n/);
    expect(ignorados).to.include('despliegue.json').and.to.not.include('despliegue.remota.json');
  });

  it('el comando de despliegue informa el resultado o el motivo del fallo', async () => {
    const lineas = [];
    const registro = { log: linea => lineas.push(linea), error: linea => lineas.push('ERROR ' + linea) };
    const proceso = {};
    const bien = await ejecutarDespliegue({ opciones: { hre, destino: path.join(carpeta, 'd.json') }, registro, proceso });
    expect(lineas[0]).to.include(bien.direccion).and.to.include('archivo de despliegue');
    expect(proceso.exitCode).to.equal(undefined);
    const mal = await ejecutarDespliegue({ opciones: { hre, destino: path.join(carpeta, 'no-existe', 'd.json') }, registro, proceso });
    expect(mal).to.equal(null);
    expect(lineas[1]).to.match(/^ERROR No fue posible desplegar/);
    expect(proceso.exitCode).to.equal(1);
  });

  it('cargarDespliegue explica qué hacer si el archivo falta o está incompleto', () => {
    expect(() => cargarDespliegue(path.join(carpeta, 'nada.json'))).to.throw(/npm run desplegar/);
    const incompleto = path.join(carpeta, 'incompleto.json');
    fs.writeFileSync(incompleto, JSON.stringify({ direccion: '0x1', chainId: 1 }));
    expect(() => cargarDespliegue(incompleto)).to.throw(/no tiene «abi»/);
  });

  it('la API no arranca sin sus variables ni contra una red o dirección equivocadas', async () => {
    await expect(iniciar({})).to.be.rejectedWith('Define la variable RPC_URL');
    await expect(iniciar({ RPC_URL: 'http://127.0.0.1:1' })).to.be.rejectedWith('Define la variable CLAVE_PRIVADA_API');

    const puente = await puenteRpc();
    try {
      const cuenta = await cuentaConSaldo();
      const despliegue = await desplegar({ hre, destino: path.join(carpeta, 'despliegue.json') });
      const otraRed = { ...despliegue, chainId: 5 };
      await expect(conectar({ despliegue: otraRed, rpcUrl: puente.url, clavePrivada: cuenta.privateKey })).to.be.rejectedWith(/red 31337 y el despliegue es de la red 5/);
      const sinCodigo = { ...despliegue, direccion: cuenta.address };
      await expect(conectar({ despliegue: sinCodigo, rpcUrl: puente.url, clavePrivada: cuenta.privateKey })).to.be.rejectedWith(/No hay contrato/);
    } finally {
      await puente.cerrar();
    }
  });

  it('envía usuario y contraseña a un nodo protegido y sin ellos no conecta', async () => {
    const puente = await puenteRpc({ autorizacion: 'Basic ' + Buffer.from('aprendiz:clave de práctica').toString('base64') });
    try {
      const cuenta = await cuentaConSaldo();
      const despliegue = await desplegar({ hre, destino: path.join(carpeta, 'despliegue.json') });
      const conCredenciales = puente.url.replace('http://', 'http://aprendiz:clave%20de%20pr%C3%A1ctica@');
      const { proveedor, contrato } = await conectar({ despliegue, rpcUrl: conCredenciales, clavePrivada: cuenta.privateKey });
      expect(await contrato.totalProductos()).to.equal(0n);
      proveedor.destroy();
      await expect(conectar({ despliegue, rpcUrl: puente.url, clavePrivada: cuenta.privateKey })).to.be.rejected;
      expect(peticionRpc('http://127.0.0.1:8545')).to.equal('http://127.0.0.1:8545');
      expect(peticionRpc('https://aprendiz:x@rpc.ejemplo.test').allowInsecureAuthentication).to.equal(false);
    } finally {
      await puente.cerrar();
    }
  });

  it('el comando de arranque anuncia el puerto o deja el motivo del fallo', async () => {
    const lineas = [];
    const registro = { log: linea => lineas.push(linea), error: linea => lineas.push('ERROR ' + linea) };
    const proceso = {};
    expect(await ejecutar({ entorno: {}, registro, proceso })).to.equal(null);
    expect(lineas[0]).to.equal('ERROR Define la variable RPC_URL antes de iniciar la API.');
    expect(proceso.exitCode).to.equal(1);

    const app = await levantarApi();
    await app.api.cerrar();
    const api = await ejecutar({ entorno: app.entorno, registro, proceso: {} });
    try {
      expect(lineas[1]).to.equal(`API lista en http://localhost:${api.puerto} · proyección en memoria.`);
    } finally {
      await api.cerrar();
      await app.cerrar().catch(() => {});
    }
  });
});

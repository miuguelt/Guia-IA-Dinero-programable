const {expect} = require('chai');
const {ethers} = require('hardhat');
const cliente = require('../scripts/ejemplo-cliente-frontend');
const agente = require('../scripts/agente-ia-oraculo');
const migracion = require('../scripts/migracion-ecommerce-web2-a-web3');

// Billetera efímera creada en cada corrida: solo recibe fondos de la red local de pruebas.
const oraculo = ethers.Wallet.createRandom();

describe('Scripts de integración contra contratos desplegados en la red de pruebas', function () {
  let admin, beneficiario, base, direccion, silenciar;

  before(async function () {
    [admin, , beneficiario] = await ethers.getSigners();
    base = await (await ethers.getContractFactory('DineroProgramableBase')).deploy(admin.address, {value: ethers.parseEther('2')});
    direccion = await base.getAddress();
  });
  beforeEach(function () {
    const originales = {log: console.log, warn: console.warn};
    console.log = () => {}; console.warn = () => {};
    silenciar = () => Object.assign(console, originales);
  });
  afterEach(function () { silenciar(); });

  it('el cliente lee el estado y avisa los eventos de autorización y retiro', async function () {
    const mensajes = [];
    console.log = (...partes) => mensajes.push(partes.join(' '));
    const {contratoLectura} = await cliente.inicializarClienteWeb3(undefined, {provider: ethers.provider, direccion});
    expect(mensajes.some(m => m.includes('Administrador registrado: ' + admin.address))).to.equal(true);
    const eventos = ['PagoAutorizadoPorIA', 'FondosRetirados'].map(nombre => new Promise(resolve => contratoLectura.once(nombre, resolve)));
    await base.actualizarOraculoIA(admin.address);
    await base.autorizarPagoCondicional(1, beneficiario.address, ethers.parseEther('0.1'), 95);
    await base.connect(beneficiario).retirarMiDinero();
    await Promise.all(eventos);
    await new Promise(resolve => setTimeout(resolve, 50));
    await contratoLectura.removeAllListeners();
    expect(mensajes.some(m => m.includes('[EVENTO EN VIVO] ¡Pago Autorizado por IA!'))).to.equal(true);
    expect(mensajes.some(m => m.includes('Retiro completado para: ' + beneficiario.address))).to.equal(true);
  });

  it('el cliente informa una lectura fallida sin interrumpir la configuración', async function () {
    const avisos = [];
    console.warn = (...partes) => avisos.push(partes.join(' '));
    const sinContrato = ethers.Wallet.createRandom().address;
    const {contratoLectura} = await cliente.inicializarClienteWeb3(undefined, {provider: ethers.provider, direccion: sinContrato});
    await contratoLectura.removeAllListeners();
    expect(avisos.some(a => a.startsWith('Aviso de lectura'))).to.equal(true);
  });

  it('el retiro del beneficiario confirma saldo y evita gastar gas sin saldo', async function () {
    await base.autorizarPagoCondicional(2, beneficiario.address, ethers.parseEther('0.2'), 97);
    const resultado = await cliente.ejecutarRetiroBeneficiario(beneficiario, undefined, direccion);
    expect(resultado.exito).to.equal(true);
    expect(resultado.hash).to.match(/^0x[0-9a-f]{64}$/);
    expect(await base.saldosPendientes(beneficiario.address)).to.equal(0);
    expect(await cliente.ejecutarRetiroBeneficiario(beneficiario, undefined, direccion)).to.deep.equal({exito: false, motivo: 'SIN_SALDO'});
  });

  it('el agente autoriza on-chain un lote aprobado y deniega uno deficiente sin transacción', async function () {
    await admin.sendTransaction({to: oraculo.address, value: ethers.parseEther('1')});
    await base.actualizarOraculoIA(oraculo.address);
    const comun = {cuentaOraculoPrivKey: oraculo.privateKey, beneficiarioAddress: beneficiario.address, montoEth: 0.05, provider: ethers.provider, direccionContrato: direccion};
    const aprobado = await agente.procesarLoteYAutorizarPago({...comun, lote: {idLote: 10, tipo: 'LECHE', producto: 'Leche', temperatura: 3.5, acidez: 16}});
    expect(aprobado).to.include({autorizado: true, puntaje: 98});
    expect(await base.saldosPendientes(beneficiario.address)).to.equal(ethers.parseEther('0.05'));
    const rechazado = await agente.procesarLoteYAutorizarPago({...comun, lote: {idLote: 11, tipo: 'LECHE', producto: 'Leche', temperatura: 7, acidez: 16}});
    expect(rechazado).to.deep.equal({autorizado: false, motivo: 'CALIDAD_INSUFICIENTE', puntaje: 58});
  });

  it('el agente se niega a firmar si su cuenta no es el oráculo registrado', async function () {
    await base.actualizarOraculoIA(admin.address);
    await expect(agente.procesarLoteYAutorizarPago({
      lote: {idLote: 12, tipo: 'OTRO', producto: 'Prueba'}, cuentaOraculoPrivKey: oraculo.privateKey,
      beneficiarioAddress: beneficiario.address, montoEth: 0.01, provider: ethers.provider, direccionContrato: direccion,
    })).to.be.rejectedWith(/no coincide con el oráculo registrado/);
  });

  it('la tienda migra un pedido Web2 a custodia Web3 y sincroniza su estado', async function () {
    const [, vendedor, comprador] = await ethers.getSigners();
    const tienda = await (await ethers.getContractFactory('TiendaEscrowWeb3')).deploy();
    const direccionEscrow = await tienda.getAddress();
    const pedido = migracion.backendCrearPedidoWeb2({clienteId: 7, productoId: 2, vendedorAddress: vendedor.address});
    const oyentes = {};
    migracion.iniciarSincronizadorEventos({on: (nombre, oyente) => { oyentes[nombre] = oyente; }});
    const recibo = await migracion.clientePagarPedidoWeb3({idPedido: pedido.idPedido, vendedorAddress: vendedor.address, montoEth: pedido.montoEthRequerido, signer: comprador, direccionEscrow});
    expect(recibo.status).to.equal(1);
    expect((await tienda.pedidos(pedido.idPedido)).monto).to.equal(ethers.parseEther('0.05'));
    oyentes.PedidoCreado(BigInt(pedido.idPedido), comprador.address, vendedor.address, ethers.parseEther('0.05'));
    expect(migracion.baseDatosPostgreSQL.pedidos.get(pedido.idPedido)).to.include({estadoWeb2: 'CUSTODIADO_EN_ESCROW', compradorAddress: comprador.address});
    oyentes.PagoLiberadoAlVendedor(BigInt(pedido.idPedido), ethers.parseEther('0.05'));
    expect(migracion.baseDatosPostgreSQL.pedidos.get(pedido.idPedido).estadoWeb2).to.equal('ENTREGADO_Y_PAGADO');
    oyentes.PedidoCreado(999n, comprador.address, vendedor.address, 1n);
    oyentes.PagoLiberadoAlVendedor(999n, 1n);
    expect(migracion.baseDatosPostgreSQL.pedidos.has(999)).to.equal(false);
  });
});

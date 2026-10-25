const path = require('node:path');
const {createConnection} = require('./connection.cjs');
const {createElectionLab} = require('./elections.cjs');
const {agroPay,tokenPayment,escrow,amount,quality} = require('./payments.cjs');
const {pharma,honey,certificate} = require('./telemetry.cjs');
const {collectEvents} = require('./events.cjs');
const {confirmed} = require('./receipts.cjs');
const {closeProofResources} = require('./proof-resources.cjs');

function createChainRuntime(options={}) {
  const root = options.root || path.resolve(__dirname,'../..');
  const connection = createConnection({...options,manifestPath:options.manifestPath || path.join(root,'artifacts/deployment.json')});
  const election = createElectionLab({root});
  async function execute(labId,input={},observe) {
    const ctx = await connection.context();
    ctx.confirm = transaction => confirmed(transaction, observe);
    if (labId === 'elections') return election.execute(ctx,input);
    if (labId === 'pharma') return pharma(ctx,input);
    if (labId === 'honey') return honey(ctx,input);
    if (['pipeline','architecture'].includes(labId)) return agroPay(ctx,input);
    if (labId === 'myths') {
      const result = await agroPay(ctx,input);
      return {...result,prediction:input.prediction ?? 'approved',predictionCorrect:(input.prediction !== 'rejected') === result.approved,evaluator:'Reglas deterministas; no se ejecuta un modelo de IA.'};
    }
    if (labId === 'comparison') return comparison(ctx,input);
    if (labId === 'evm') return evm(ctx,input);
    throw new Error('Este laboratorio no corresponde al adaptador EVM.');
  }
  async function events(options) { return collectEvents(await connection.context(), options); }
  async function close() {
    try { await closeProofResources(); }
    finally { connection.close(); }
  }
  return {health:connection.health,execute,events,close};
}

async function evm(ctx,input) {
  if (input.action === 'erc20') return tokenPayment(ctx,input);
  if (input.action === 'escrow') return escrow(ctx,input);
  if (input.action === 'certificate') return certificate(ctx,input);
  if (input.action === 'agropay') return agroPay(ctx,input);
  if (input.action && input.action !== 'deposit') throw new Error('Selecciona una operación disponible del taller EVM.');
  const contract = ctx.contract('DineroProgramableBase');
  const before = await contract.consultarBalanceContrato();
  const receipt = await ctx.confirm(contract.depositarGarantia({value:amount(input)}));
  return {summary:'Depósito confirmado en el contrato de garantía.',receipt,receipts:[receipt],balanceBeforeWei:before.toString(),balanceAfterWei:(await contract.consultarBalanceContrato()).toString()};
}

async function comparison(ctx,input) {
  const native = await agroPay(ctx,input);
  const token = await tokenPayment(ctx,input);
  const nativeGas = native.receipts.reduce((sum,item) => sum+BigInt(item.gasUsed),0n);
  const tokenGas = token.receipts.reduce((sum,item) => sum+BigInt(item.gasUsed),0n);
  return {summary:'Comparación medida con recibos de la misma red local.',nativeGas:nativeGas.toString(),tokenGas:tokenGas.toString(),receipts:[...native.receipts,...token.receipts],receipt:token.receipt,network:'Hardhat 31337',scope:'Los valores describen estas ejecuciones; no son tarifas de una red pública.'};
}

module.exports = {createChainRuntime,evm,comparison};

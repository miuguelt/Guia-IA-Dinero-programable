const {id,sha256,toUtf8Bytes} = require('ethers');
const {randomUUID} = require('node:crypto');


async function pharma(ctx,input={}) {
  const temperature = Number(input.temperature ?? 4.2);
  if (!Number.isFinite(temperature) || temperature < -100 || temperature > 100) throw new Error('Ingresa una temperatura entre -100 y 100 °C.');
  const batchId = String(input.batchId || randomUUID());
  const batch = id(batchId);
  const digest = sha256(toUtf8Bytes(JSON.stringify({batchId,temperature,nonce:randomUUID()})));
  const contract = ctx.contract('RegistroTelemetria',ctx.signers[1]);
  const receipt = await ctx.confirm(contract.registrar(batch,Math.round(temperature*10),digest));
  const lot = await contract.lotes(batch);
  return {summary:lot.cuarentena ? 'Lectura confirmada: el lote permanece en cuarentena.' : 'Lectura confirmada dentro del intervalo del ejercicio.',receipt,receipts:[receipt],batchId,temperature:Number(lot.temperaturaX10)/10,quarantine:lot.cuarentena,readings:lot.lecturas.toString(),digest};
}

async function certificate(ctx,input={}) {
  const contract = ctx.contract('CertificadosInmutables');
  const code = String(input.batchId || randomUUID());
  const documentHash = sha256(toUtf8Bytes(JSON.stringify({code,description:input.description || 'Evidencia del ejercicio',nonce:randomUUID()})));
  const receipt = await ctx.confirm(contract.emitirCertificado(documentHash,code,'Resultado de práctica ADSO'));
  const result = await contract.verificarAutenticidad(documentHash);
  return {summary:'Hash del certificado registrado y consultado en Solidity.',receipt,receipts:[receipt],documentHash,authentic:result.esAutentico,valid:result.estaVigente,code:result.codigo};
}

async function honey(ctx,input={}) {
  const humidity = Number(input.humidity ?? 17.2);
  const hmf = Number(input.hmf ?? 14);
  const delta = Number(input.deltaC13 ?? -26.4);
  if (![humidity,hmf,delta].every(Number.isFinite) || humidity < 0 || hmf < 0) throw new Error('Ingresa parámetros numéricos válidos. Humedad y HMF no pueden ser negativos.');
  const batchId = String(input.batchId || randomUUID());
  const documentHash = sha256(toUtf8Bytes(JSON.stringify({batchId,humidity,hmf,delta})));
  const contract = ctx.contract('CertificacionMiel',ctx.signers[1]);
  const receipt = await ctx.confirm(contract.certificar(id(batchId),documentHash,Math.round(humidity*10),Math.round(hmf*10),Math.round(delta*10)));
  return {summary:'El lote cumple las reglas del ejercicio y su certificado quedó registrado.',receipt,receipts:[receipt],batchId,documentHash,registeredHash:await contract.certificados(id(batchId)),humidity,hmf,deltaC13:delta};
}

module.exports = {pharma,honey,certificate};

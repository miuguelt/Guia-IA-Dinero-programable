const {parseEther, id} = require('ethers');
const {randomUUID} = require('node:crypto');


function amount(input) {
  const result = input.amountWei === undefined ? parseEther(String(input.amountEth ?? '0.01')) : BigInt(input.amountWei);
  if (result <= 0n || result > parseEther('10')) throw new Error('Ingresa un monto mayor que cero y de hasta 10 ETH de práctica.');
  return result;
}

function quality(input) {
  const temperature = Number(input.temperature ?? 3.5);
  const acidity = Number(input.acidity ?? 16);
  if (!Number.isFinite(temperature) || !Number.isFinite(acidity)) throw new Error('Ingresa temperatura y acidez numéricas.');
  return (temperature <= 4 ? 60 : 20) + (acidity >= 14 && acidity <= 18 ? 38 : 10);
}

async function agroPay(ctx, input={}) {
  const contract = ctx.contract('DineroProgramableBase');
  const beneficiary = await ctx.signers[2].getAddress();
  const value = amount(input);
  const score = input.score ?? quality(input);
  const before = await contract.consultarBalanceContrato();
  if (score < 90) return {summary:'El evaluador por reglas rechazó el lote. Los fondos permanecen en garantía.',approved:false,score,balanceBeforeWei:before.toString(),balanceAfterWei:before.toString(),receipts:[]};
  const batch = BigInt(id(String(input.batchId || randomUUID())));
  const receipts = [await ctx.confirm(contract.depositarGarantia({value}))];
  receipts.push(await ctx.confirm(contract.connect(ctx.signers[1]).autorizarPagoCondicional(batch, beneficiary, value, score)));
  const pending = await contract.saldosPendientes(beneficiary);
  receipts.push(await ctx.confirm(contract.connect(ctx.signers[2]).retirarMiDinero()));
  return {summary:'Depósito, autorización y retiro confirmados en la red local.',approved:true,score,receipts,receipt:receipts.at(-1),amountWei:value.toString(),authorizedWei:pending.toString(),balanceBeforeWei:before.toString(),balanceAfterWei:(await contract.consultarBalanceContrato()).toString(),pendingWei:(await contract.saldosPendientes(beneficiary)).toString()};
}

async function tokenPayment(ctx, input={}) {
  const token = ctx.contract('TokenPractica');
  const contract = ctx.contract('DineroProgramableERC20');
  const value = amount(input);
  const beneficiary = await ctx.signers[2].getAddress();
  const batch = BigInt(id(String(input.batchId || randomUUID())));
  const before = await token.balanceOf(beneficiary);
  const receipts = [await ctx.confirm(token.approve(await contract.getAddress(), value))];
  receipts.push(await ctx.confirm(contract.depositarGarantiaTokens(value)));
  receipts.push(await ctx.confirm(contract.connect(ctx.signers[1]).autorizarPagoCondicionalTokens(batch,beneficiary,value,input.score ?? 98)));
  receipts.push(await ctx.confirm(contract.connect(ctx.signers[2]).retirarMiDineroTokens()));
  return {summary:'Transferencia ERC-20 de práctica confirmada.',receipts,receipt:receipts.at(-1),amountWei:value.toString(),beneficiaryBeforeWei:before.toString(),beneficiaryAfterWei:(await token.balanceOf(beneficiary)).toString()};
}

async function escrow(ctx, input={}) {
  const contract = ctx.contract('TiendaEscrowWeb3');
  const seller = await ctx.signers[3].getAddress();
  const order = BigInt(id(String(input.batchId || randomUUID())));
  const receipts = [await ctx.confirm(contract.connect(ctx.signers[2]).pagarYBloquearEnEscrow(order,seller,{value:amount(input)}))];
  receipts.push(await ctx.confirm(contract.connect(ctx.signers[3]).marcarDespachado(order)));
  if (input.refund) receipts.push(await ctx.confirm(contract.reembolsarComprador(order)));
  else receipts.push(await ctx.confirm(contract.connect(ctx.signers[2]).confirmarRecibidoYLiberarPago(order)));
  return {summary:input.refund ? 'Reembolso confirmado.' : 'Pedido entregado y pago liberado.',receipts,receipt:receipts.at(-1),orderId:order.toString(),state:Number((await contract.pedidos(order)).estado)};
}

module.exports = {amount,quality,agroPay,tokenPayment,escrow};

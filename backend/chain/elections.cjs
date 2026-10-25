const {Identity,Group,generateProof,verifyProof} = require('@semaphore-protocol/core');
const {prepareProofAssets} = require('./proof-assets.cjs');

const {id} = require('ethers');

function createElectionLab({root}) {
  const sessions = new Map();
  async function state(ctx) {
    if (!sessions.has(ctx.manifest.id)) sessions.set(ctx.manifest.id, {identities:new Map()});
    const current = sessions.get(ctx.manifest.id);
    const election = ctx.contract('EleccionesSemaphore');
    const semaphore = ctx.contract('Semaphore');
    const groupId = await election.grupo();
    const events = await semaphore.queryFilter(semaphore.filters.MemberAdded(groupId),ctx.manifest.deployedAtBlock);
    return {...current,election,group:new Group(events.map(event => event.args.identityCommitment))};
  }
  async function execute(ctx, input={}) {
    const current = await state(ctx);
    const voterId = String(input.voterId || 'aprendiz-1');
    const candidate = Number(input.candidate ?? 1);
    if (![1,2,3].includes(candidate)) throw new Error('Selecciona una de las tres opciones de la elección.');
    if (!current.identities.has(voterId)) {
      if (current.group.size >= 16) throw new Error('La elección de práctica admite 16 identidades. Reinicia el ejercicio mediante el lanzador.');
      const identity = new Identity();
      await ctx.confirm(current.election.registrarElector(identity.commitment));
      current.identities.set(voterId,identity);
      current.group.addMember(identity.commitment);
    }
    const identity = current.identities.get(voterId);
    const scope = await current.election.ambito();
    const assets = await prepareProofAssets(root);
    const proof = await generateProof(identity,current.group,candidate,scope,4,assets);
    if (input.tamper || input.scenario === 'invalid') proof.message = String(candidate === 3 ? 1 : candidate+1);
    const verified = await verifyProof(proof);
    if (!verified) throw new Error('La prueba fue alterada y no supera la verificación criptográfica de Semaphore.');
    const before = await current.election.votos(candidate);
    const receipt = await ctx.confirm(current.election.emitirVoto(proof));
    let replayRejected = false;
    if (input.scenario === 'replay') {
      try { await ctx.confirm(current.election.emitirVoto(proof)); }
      catch (error) {
        const expected = id('Semaphore__YouAreUsingTheSameNullifierTwice()').slice(0,10);
        if (error.code !== 'CALL_EXCEPTION' || error.data?.slice(0,10) !== expected) throw error;
        replayRejected = true;
      }
    }
    return {summary:replayRejected ? 'Un voto confirmado; el segundo intento fue rechazado por nullifier repetido.' : 'Prueba Semaphore verificada y voto confirmado en Solidity.',verified,replayRejected,receipt,receipts:[receipt],nullifier:proof.nullifier,candidate,votesBefore:before.toString(),votesAfter:(await current.election.votos(candidate)).toString(),scope:scope.toString(),privacy:'La identidad efímera de práctica se conserva solo en memoria del servicio; este ejercicio no acredita anonimato electoral.'};
  }
  return {execute};
}

module.exports = {createElectionLab};

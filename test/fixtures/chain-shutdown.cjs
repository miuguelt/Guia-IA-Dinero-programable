const assert = require('node:assert/strict');
const path = require('node:path');
const {Identity,Group,generateProof,verifyProof} = require('@semaphore-protocol/core');
const {prepareProofAssets} = require('../../backend/chain/proof-assets.cjs');
const {createChainRuntime} = require('../../backend/chain/runtime.cjs');

async function main() {
  const identity = new Identity();
  const group = new Group([identity.commitment]);
  const root = path.resolve(__dirname,'../..');
  const proof = await generateProof(identity,group,1,1,4,await prepareProofAssets(root));
  assert.equal(await verifyProof(proof),true);
  const runtime = createChainRuntime({root,rpcUrl:'http://127.0.0.1:18599'});
  await runtime.close();
  await runtime.close();
  console.log('Prueba criptográfica verificada y recursos del runtime cerrados.');
}

main().catch(error => {console.error(error.message);process.exitCode=1;});

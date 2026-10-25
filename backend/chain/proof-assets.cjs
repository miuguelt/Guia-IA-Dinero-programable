const fs = require('node:fs/promises');
const path = require('node:path');
const {createHash} = require('node:crypto');

async function prepareProofAssets(root) {
  const directory = path.join(root, '.cache/semaphore-4.13.0-depth4');
  await fs.mkdir(directory, {recursive:true});
  const result = {};
  for (const extension of ['wasm','zkey']) {
    const target = path.join(directory, `semaphore-4.${extension}`);
    try { await fs.access(target); }
    catch {
      const response = await fetch(`https://snark-artifacts.pse.dev/semaphore/4.13.0/semaphore-4.${extension}`);
      if (!response.ok) throw new Error('No se pudieron preparar los recursos públicos de Semaphore. Ejecuta la preparación con conexión a internet.');
      const buffer = Buffer.from(await response.arrayBuffer());
      await fs.writeFile(`${target}.partial`, buffer);
      await fs.rename(`${target}.partial`,target);
    }
    result[extension] = target;
  }
  return result;
}

async function proofAssetHashes(root) {
  const files = await prepareProofAssets(root);
  const result = {};
  for (const [name,file] of Object.entries(files)) result[name] = createHash('sha256').update(await fs.readFile(file)).digest('hex');
  return result;
}

module.exports = {prepareProofAssets,proofAssetHashes};

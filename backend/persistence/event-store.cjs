function eventValues(deploymentId, event) {
  try {
    if (!deploymentId || typeof event.txHash !== 'string' || !event.txHash || !Number.isInteger(event.logIndex) || event.logIndex < 0 ||
      !Number.isSafeInteger(Number(event.blockNumber)) || Number(event.blockNumber) < 0 || !event.name || !event.args || typeof event.args !== 'object') throw new Error();
    return [deploymentId, event.txHash, event.logIndex, String(event.blockNumber), event.name, JSON.stringify(event.args)];
  } catch {
    throw Object.assign(new Error('El evento necesita despliegue, transacción, posición, bloque, nombre y datos JSON válidos.'), { code: 'EVENT_INVALID' });
  }
}

function createEventStore(pool) {
  async function write(deploymentId, events, rebuilding) {
    const values = events.map(event => eventValues(deploymentId, event));
    if (!deploymentId) throw Object.assign(new Error('Selecciona un despliegue válido.'), { code: 'EVENT_INVALID' });
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [deploymentId]);
      if (rebuilding) await client.query('DELETE FROM guide_projections WHERE deployment_id=$1', [deploymentId]);
      for (const value of values) {
        await client.query('INSERT INTO guide_events(deployment_id,tx_hash,log_index,block_number,name,args) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING', value);
        await client.query('INSERT INTO guide_projections(deployment_id,tx_hash,log_index,block_number,name,args) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING', value);
      }
      await client.query('COMMIT');
      return { indexed: values.length, deploymentId, rebuilt: rebuilding };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async function recordEvents(deploymentId, events) { return write(deploymentId, events, false); }
  async function rebuild(deploymentId, events) { return write(deploymentId, events, true); }
  async function readEvents(deploymentId) {
    const { rows } = await pool.query('SELECT deployment_id,tx_hash,log_index,block_number,name,args FROM guide_projections WHERE deployment_id=$1 ORDER BY block_number,log_index', [deploymentId]);
    return rows.map(row => ({ deploymentId: row.deployment_id, txHash: row.tx_hash, logIndex: row.log_index, blockNumber: row.block_number, name: row.name, args: row.args }));
  }
  async function readPosition(deploymentId) {
    const { rows } = await pool.query('SELECT block_number,log_index FROM guide_events WHERE deployment_id=$1 ORDER BY block_number DESC,log_index DESC LIMIT 1', [deploymentId]);
    return rows.length ? { blockNumber: Number(rows[0].block_number), logIndex: rows[0].log_index } : null;
  }
  return { recordEvents, rebuild, readEvents, readPosition };
}

module.exports = { createEventStore };

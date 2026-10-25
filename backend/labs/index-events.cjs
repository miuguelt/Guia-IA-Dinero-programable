async function indexEvents(chain, store) {
  try {
    const health = await chain.health();
    const id = health.deploymentId || health.deployment?.id;
    if (!id) throw new Error('No hay un despliegue activo para indexar.');
    const previous = await store.readPosition?.(id);
    const events = await chain.events(previous ? { fromBlock: previous.blockNumber } : undefined);
    await store.recordEvents(id, events);
    const position = await store.readPosition?.(id);
    return { status: 'indexed', deploymentId: id, count: events.length, position: position || null, fromBlock: previous?.blockNumber ?? null };
  } catch {
    return { status: 'pending', message: 'La operación se ejecutó. La indexación está pendiente; revisa PostgreSQL y vuelve a sincronizar.' };
  }
}

module.exports = { indexEvents };

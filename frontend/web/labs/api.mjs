export function createApi(fetcher = globalThis.fetch.bind(globalThis)) {
  let csrfToken = '';
  async function request(path, options = {}) {
    let response;
    try { response = await fetcher(path, { credentials: 'same-origin', ...options }); }
    catch { throw new Error('No se pudo conectar con el servicio local. Inicia el proyecto y reintenta.'); }
    if (response.status === 404 && !String(response.headers?.get?.('content-type') || '').includes('application/json')) {
      throw new Error('Esta copia de la guía no incluye el servicio local. La modalidad Real local funciona con la guía iniciada en tu equipo (pwsh ./start-windows.ps1); aquí usa Simulación.');
    }
    const data = await response.json().catch(() => ({ error: { message: 'El servicio devolvió una respuesta que no se puede leer.' } }));
    if (!response.ok) throw new Error(data.error?.message || 'La solicitud no pudo completarse.');
    return data;
  }
  async function runtime() {
    const data = await request('/api/runtime');
    csrfToken = data.csrfToken || '';
    return data;
  }
  async function post(path, body) {
    if (!csrfToken) await runtime();
    return request(path, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken }, body: JSON.stringify(body) });
  }
  async function run(labId, input, onUpdate, signal) {
    let record = await post('/api/labs/' + encodeURIComponent(labId) + '/runs', { input });
    const started = Date.now();
    while (!['completed', 'failed'].includes(record.status)) {
      if (signal?.aborted) throw new Error('Se dejó de consultar esta ejecución. El servicio puede seguir procesándola.');
      onUpdate(record);
      if (Date.now() - started > 180000) throw new Error('La ejecución sigue sin terminar. Revisa el servicio local antes de reintentar.');
      await new Promise(resolve => setTimeout(resolve, 500));
      record = await request('/api/runs/' + encodeURIComponent(record.id));
    }
    onUpdate(record);
    return record;
  }
  return { runtime, post, run };
}

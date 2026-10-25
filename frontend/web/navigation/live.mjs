export function createLiveReload({ window: win, document, fetcher = win.fetch?.bind(win), clock = win, reload = win.location.reload.bind(win.location) }) {
  let revision = null, timer = null, checking = false, destroyed = false;
  const allowed = ['localhost', '127.0.0.1'].includes(win.location.hostname) && typeof fetcher === 'function';
  function destroy() {
    destroyed = true;
    if (timer !== null) { clock.clearInterval(timer); timer = null; }
  }
  async function poll() {
    if (!allowed || destroyed || checking || document.visibilityState === 'hidden') return;
    checking = true;
    try {
      const response = await fetcher('/api/revision', { cache: 'no-store', credentials: 'same-origin' });
      if (!response.ok) {
        if (response.status === 404 && revision === null) destroy();
        return;
      }
      const data = await response.json();
      if (destroyed || !['string', 'number'].includes(typeof data.revision)) return;
      const previous = revision;
      revision = data.revision;
      if (previous !== null && revision !== previous) reload();
    } catch {
      // Una desconexión no altera la guía ni confirma una revisión.
    } finally { checking = false; }
  }
  if (allowed) timer = clock.setInterval(poll, 2000);
  const ready = allowed ? poll() : Promise.resolve();
  return { destroy, ready };
}

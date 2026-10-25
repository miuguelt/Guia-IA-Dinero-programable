// Tablas, resultados y bloques que se desplazan en horizontal deben poder recorrerse con el teclado
// (WCAG 2.1.1). Solo se agregan al orden de tabulación mientras realmente se desplazan.
const SELECTOR = 'pre, table, .dossier-table';

export function markScrollableRegions(root) {
  for (const element of root.querySelectorAll(SELECTOR)) {
    const managed = element.hasAttribute('data-scroll-region');
    if (element.hasAttribute('tabindex') && !managed) continue;
    const scrolls = element.scrollWidth > element.clientWidth + 1;
    if (scrolls && !managed) {
      element.tabIndex = 0;
      element.setAttribute('data-scroll-region', '');
    } else if (!scrolls && managed) {
      element.removeAttribute('tabindex');
      element.removeAttribute('data-scroll-region');
    }
  }
}

export function watchScrollableRegions({ window: win, root }) {
  let pending = null;
  const schedule = () => {
    if (pending !== null) return;
    pending = win.setTimeout(() => { pending = null; markScrollableRegions(root); }, 50);
  };
  const observer = new win.MutationObserver(schedule);
  observer.observe(root, { childList: true, subtree: true });
  win.addEventListener('resize', schedule);
  schedule();
  return {
    schedule,
    destroy() {
      observer.disconnect();
      win.removeEventListener('resize', schedule);
      if (pending !== null) win.clearTimeout(pending);
    },
  };
}

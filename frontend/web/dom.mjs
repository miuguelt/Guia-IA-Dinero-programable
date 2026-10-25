export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}
export function icon(name = 'arrow') {
  const paths = {
    arrow: '<path d="m9 5 7 7-7 7M4 12h12"/>',
    book: '<path d="M4 4h7v16H4zM11 4h9v16h-9M7 8h1m6 0h3M7 12h1m6 0h3"/>',
    flask: '<path d="M9 3h6m-5 0v6L5 18a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3M8 15h8"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    leaf: '<path d="M19 4C9 3 3 7 5 14c2 7 13 4 14-10ZM5 20l9-10"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    layers: '<path d="m3 8 9-5 9 5-9 5-9-5Zm0 5 9 5 9-5M3 18l9 5 9-5"/>'
  };
  return '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (paths[name] || paths.arrow) + '</svg>';
}
export function announce(message) {
  const element = document.getElementById('announcer');
  if (element) element.textContent = message;
}

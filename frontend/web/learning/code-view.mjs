export function decorateCode(document, root) {
  const keywords = /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\b(?:function|external|uint256|if|revert|bool|await|const|return|INSERT|ON|CONFLICT|DO|NOTHING|UNIQUE)\b|\b\d+(?:n)?\b)/g;
  for (const [index, code] of [...root.querySelectorAll('pre code')].entries()) {
    const text = code.textContent;
    const output = code.closest('pre').classList.contains('terminal-output');
    const fragment = document.createDocumentFragment();
    let position = 0;
    for (const match of output ? [] : text.matchAll(keywords)) {
      fragment.append(document.createTextNode(text.slice(position, match.index)));
      const span = document.createElement('span');
      span.className = /^['"]/.test(match[0]) ? 'syntax-string' : /^\d/.test(match[0]) ? 'syntax-number' : 'syntax-keyword';
      span.textContent = match[0];
      fragment.append(span);
      position = match.index + match[0].length;
    }
    fragment.append(document.createTextNode(text.slice(position)));
    code.replaceChildren(fragment);
    code.id = 'code-example-' + index;
    const toolbar = document.createElement('div');
    toolbar.className = 'code-toolbar';
    const label = document.createElement('span');
    label.textContent = output ? 'Salida de terminal' : 'Código de referencia';
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.copyCode = code.id;
    button.textContent = output ? 'Copiar salida' : 'Copiar código';
    toolbar.append(label, button);
    const block = code.closest('pre');
    block.before(toolbar);
    // El bloque conserva sus líneas y se desplaza en horizontal: debe alcanzarse con el teclado.
    block.tabIndex = 0;
    block.setAttribute('role', 'region');
    block.setAttribute('aria-label', label.textContent);
  }
}

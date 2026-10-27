// Modelo didáctico del laboratorio Auditoría: comprobaciones del contrato base, versiones con fallas
// y traducción de los valores que entrega Slither en la modalidad real (backend/audit/runner.cjs).
const BASE = 'contracts/DineroProgramableBase.sol';
const ADVERSARY = 'contracts/fixtures/AdversarioRetiro.sol';

export const AUDIT_CHECKS = [
  { id: 'oracle', title: 'Permisos del oráculo', protects: 'Solo la cuenta del oráculo puede autorizar pagos. Sin esta regla, cualquier cuenta podría asignarse dinero de la garantía.', code: 'Modificador soloOraculoIA en autorizarPagoCondicional; revierte con NoAutorizado.', test: 'Prueba de permisos de la etapa 3 del taller: una cuenta distinta del oráculo intenta autorizar y la llamada revierte.' },
  { id: 'cei', title: 'Estado antes de llamadas externas', protects: 'El saldo se pone en cero antes de enviar el dinero. Así, un receptor que vuelva a llamar no encuentra saldo para retirar dos veces (reentrada).', code: 'retirarMiDinero: saldosPendientes[msg.sender] = 0 antes del call; revierte con FalloTransferencia si el envío falla.', test: 'WithdrawalSecurity.test.js: AdversarioRetiro intenta reentrar y reentradaExitosa queda en false.' },
  { id: 'batch', title: 'Lote de un solo uso', protects: 'Un mismo lote no se puede autorizar dos veces. Evita pagar dos veces por la misma entrega.', code: 'autorizarPagoCondicional revisa autorizaciones[_idLote].ejecutado antes de reservar el saldo.', test: 'Prueba de repetición de la etapa 3: se autoriza el mismo lote dos veces y la segunda llamada revierte.' },
  { id: 'empty', title: 'Retiro sin saldo', protects: 'Una cuenta sin saldo pendiente no puede retirar. Evita transferencias de valor cero y estados inconsistentes.', code: 'retirarMiDinero revierte con SinSaldoPendiente cuando el saldo es 0.', test: 'Prueba de retiro de la etapa 3: una cuenta sin pagos autorizados intenta retirar y la llamada revierte.' }
];

const finding = (detector, impact, confidence, scope, file, lines, description) => ({ detector, impact, confidence, scope, description, locations: [{ file, lines }] });
const adversaryCall = finding('low-level-calls', 'Informational', 'High', 'fixture', ADVERSARY, [19, 20, 21, 22], 'Low level call in AdversarioRetiro.receive(): address(custodia).call(...)');
const baseCall = finding('low-level-calls', 'Informational', 'High', 'production', BASE, [129, 138, 139, 142], 'Low level call in DineroProgramableBase.retirarMiDinero(): msg.sender.call{value: montoARetirar}("")');
const reentrancy = finding('reentrancy-eth', 'High', 'Medium', 'production', BASE, [129, 135, 138, 142], 'Reentrancy in DineroProgramableBase.retirarMiDinero(): external call msg.sender.call{value: montoARetirar}("") before state variable saldosPendientes[msg.sender] = 0');

export const AUDIT_SCENARIOS = {
  protected: { label: 'Contrato actual (protegido)', failing: [], findings: [baseCall, adversaryCall], attackDetail: 'Todas las pruebas de seguridad pasan: el adversario no logra reentrar, cobrar dos veces ni autorizar sin permiso.', explanation: 'Slither informa llamadas de bajo nivel, pero son informativas: no bloquean la revisión. Los hallazgos del archivo adversario se esperan, porque ese contrato existe para atacar.' },
  reentrancy: { label: 'Variante: envía el dinero antes de poner el saldo en cero', failing: ['cei'], findings: [reentrancy, baseCall, adversaryCall], attackDetail: 'Falla WithdrawalSecurity.test.js: el adversario reentra durante el envío y retira más de lo autorizado.', explanation: 'Las dos herramientas coinciden: Slither marca reentrancy-eth con impacto alto en el contrato de producción y la prueba de ataque lo confirma.' },
  'no-access': { label: 'Variante: cualquier cuenta puede autorizar pagos', failing: ['oracle'], findings: [baseCall, adversaryCall], attackDetail: 'Falla la prueba de permisos: una cuenta cualquiera autoriza un pago a su favor.', explanation: 'Slither no encuentra el problema: no sabe quién debería tener permiso. Solo la prueba, que expresa la regla de negocio, revela la falla.' },
  replay: { label: 'Variante: un lote se puede autorizar dos veces', failing: ['batch'], findings: [baseCall, adversaryCall], attackDetail: 'Falla la prueba de repetición: el mismo lote se paga dos veces.', explanation: 'Slither no detecta lógica de negocio incompleta. La prueba de repetición sí lo hace, porque comprueba la regla «un lote, un pago».' }
};

const IMPACT_LABELS = { High: 'Alto', Medium: 'Medio', Low: 'Bajo', Informational: 'Informativo', Optimization: 'Optimización' };
const CONFIDENCE_LABELS = { High: 'Alta', Medium: 'Media', Low: 'Baja' };
const DETECTOR_INFO = {
  'reentrancy-eth': 'Una llamada externa envía dinero antes de actualizar el estado. El receptor puede aprovechar ese momento para que el contrato vuelva a llamar a la función y retire otra vez.',
  'reentrancy-no-eth': 'Una llamada externa ocurre antes de actualizar el estado, aunque no envíe dinero. Un contrato malicioso podría reentrar y observar o cambiar datos a medio actualizar.',
  'reentrancy-benign': 'Hay una llamada externa antes de un cambio de estado, pero el analizador no ve forma de sacar provecho. Conviene revisarla y mantener el orden comprobar, actualizar, interactuar.',
  'reentrancy-events': 'Un evento se emite después de una llamada externa. Si hay reentrada, los eventos pueden quedar en un orden confuso para quien los indexa.',
  'low-level-calls': 'El contrato usa call de bajo nivel. Es la forma recomendada de enviar ETH, pero obliga a revisar el valor de retorno y a protegerse de la reentrada.',
  'arbitrary-send-eth': 'Una función envía ETH a una dirección que podría elegir quien llama. Revisa que solo una cuenta autorizada pueda definir el destino.',
  'solc-version': 'La versión del compilador tiene errores conocidos o no está fijada. Fija una versión revisada.',
  'pragma': 'Los archivos piden versiones distintas del compilador. Unifica la versión.',
  'naming-convention': 'Un nombre no sigue la convención de Solidity. No es una falla de seguridad; mejora la lectura.',
  timestamp: 'Una decisión depende de block.timestamp, que el validador del bloque puede ajustar unos segundos.',
  'missing-zero-check': 'Una dirección se guarda sin comprobar que no sea la dirección cero.',
  'constable-states': 'Una variable nunca cambia y podría declararse constant para ahorrar gas.',
  'immutable-states': 'Una variable solo se asigna en el constructor y podría declararse immutable para ahorrar gas.',
  'locked-ether': 'El contrato puede recibir ETH, pero no tiene ninguna función para sacarlo. Ese dinero quedaría bloqueado para siempre.',
  'erc20-interface': 'Una función no coincide con la firma del estándar ERC-20, por ejemplo porque no devuelve bool. Otras aplicaciones podrían fallar al usar el token.',
  'missing-inheritance': 'El contrato implementa las funciones de una interfaz, pero no declara que la hereda. Declararla documenta la intención y deja que el compilador la compruebe.',
  'unused-return':'Se ignora el valor que devuelve una llamada externa; un fallo podría pasar inadvertido.'
};

export function impactLabel(value) { return value ? IMPACT_LABELS[value] || value : 'Sin clasificar'; }
export function confidenceLabel(value) { return value ? CONFIDENCE_LABELS[value] || value : 'Sin clasificar'; }
export function describeDetector(id) {
  return DETECTOR_INFO[id] || 'Este detector no tiene explicación en la guía. Busca su nombre en la documentación de Slither y relaciónalo con el código señalado.';
}
export function blocksReview(item) { return item.scope === 'production' && ['High', 'Medium'].includes(item.impact); }

export function simulateAudit(input = {}) {
  const id = input.scenario || 'protected';
  if (!Object.hasOwn(AUDIT_SCENARIOS, id)) throw new Error('Elige una de las versiones del contrato que ofrece el formulario.');
  const scenario = AUDIT_SCENARIOS[id];
  const staticPassed = !scenario.findings.some(blocksReview);
  const attackPassed = scenario.failing.length === 0;
  return {
    scenario: id, scenarioLabel: scenario.label,
    checks: AUDIT_CHECKS.map(check => ({ id: check.id, status: scenario.failing.includes(check.id) ? 'failed' : 'ok' })),
    findings: scenario.findings.map(item => ({ ...item, locations: item.locations.map(location => ({ ...location })) })),
    staticPassed, attackTest: { passed: attackPassed, detail: scenario.attackDetail }, passed: staticPassed && attackPassed,
    explanation: scenario.explanation
  };
}

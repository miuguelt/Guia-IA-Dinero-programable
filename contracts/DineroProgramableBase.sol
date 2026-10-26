// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

/**
 * @title DineroProgramableBase
 * @dev Contrato base pedagógico para el Tecnólogo ADSO (SENA).
 * Demuestra los principios fundamentales del Dinero Programable:
 * 1. Reglas lógicas autónomas e inmutables (sin intermediarios bancarios).
 * 2. Custodia condicional en garantía (Escrow).
 * 3. Integración con agentes u oráculos evaluadores (simulación de IA).
 * 4. Patrón de seguridad Pull (Withdrawal Pattern) y Check-Effects-Interactions (CEI).
 */
contract DineroProgramableBase {

    // --- ERRORES PERSONALIZADOS (Ahorro de gas y claridad) ---
    error NoAutorizado(address remitente, address esperado);
    error MontoInvalido();
    error FondosInsuficientes(uint256 saldoActual, uint256 montoRequerido);
    error CondicionNoCumplida(uint256 puntajeActual, uint256 puntajeMinimo);
    error SinSaldoPendiente();
    error FalloTransferencia();
    error DireccionInvalida();
    error PuntajeInvalido();

    // --- VARIABLES DE ESTADO ---
    address public immutable administrador;
    address public oraculoIA;
    uint256 public totalEnGarantia;

    // Saldo acumulado por cada beneficiario listo para retiro (Patrón Pull)
    mapping(address => uint256) public saldosPendientes;

    // Registro de pagos autorizados para auditoría
    struct AutorizacionPago {
        uint256 idLote;
        address beneficiario;
        uint256 monto;
        uint256 puntajeCalidadIA;
        bool ejecutado;
    }

    mapping(uint256 => AutorizacionPago) public autorizaciones;

    // --- EVENTOS (Trazabilidad e indexación en el explorador de bloques) ---
    event FondosDepositados(address indexed depositante, uint256 monto, uint256 nuevoTotal);
    event PagoAutorizadoPorIA(uint256 indexed idLote, address indexed beneficiario, uint256 monto, uint256 puntaje);
    event FondosRetirados(address indexed beneficiario, uint256 monto);
    event OraculoActualizado(address indexed nuevoOraculo);

    // --- MODIFICADORES ---
    modifier soloAdmin() {
        if (msg.sender != administrador) revert NoAutorizado(msg.sender, administrador);
        _;
    }

    modifier soloOraculoIA() {
        if (msg.sender != oraculoIA) revert NoAutorizado(msg.sender, oraculoIA);
        _;
    }

    // --- CONSTRUCTOR ---
    constructor(address _oraculoIA) payable {
        if (_oraculoIA == address(0)) revert DireccionInvalida();
        administrador = msg.sender;
        oraculoIA = _oraculoIA;
        if (msg.value > 0) {
            totalEnGarantia += msg.value;
            emit FondosDepositados(msg.sender, msg.value, totalEnGarantia);
        }
    }

    // --- 1. DEPÓSITO DE DINERO PROGRAMABLE (Fondos en Garantía) ---
    function depositarGarantia() external payable {
        if (msg.value == 0) revert MontoInvalido();
        totalEnGarantia += msg.value;
        emit FondosDepositados(msg.sender, msg.value, totalEnGarantia);
    }

    // --- 2. LÓGICA PROGRAMADA: Autorización Condicional basada en IA ---
    /**
     * @notice La IA evalúa una condición objetiva (ej. calidad de leche > 90% o hito de obra entregado).
     * Si la condición matemática se cumple, el dinero se programa para el beneficiario.
     */
    function autorizarPagoCondicional(
        uint256 _idLote,
        address _beneficiario,
        uint256 _monto,
        uint256 _puntajeCalidadIA
    ) external soloOraculoIA {
        if (_beneficiario == address(0)) revert DireccionInvalida();
        if (_monto == 0) revert MontoInvalido();
        if (_puntajeCalidadIA > 100) revert PuntajeInvalido();
        // Regla lógica 1: El puntaje mínimo de calidad certificado por IA debe ser >= 90
        uint256 PUNTAJE_MINIMO = 90;
        if (_puntajeCalidadIA < PUNTAJE_MINIMO) {
            revert CondicionNoCumplida(_puntajeCalidadIA, PUNTAJE_MINIMO);
        }

        // Regla lógica 2: El contrato debe tener balance en garantía suficiente
        if (address(this).balance < _monto || totalEnGarantia < _monto) {
            revert FondosInsuficientes(address(this).balance, _monto);
        }

        // Regla lógica 3: No autorizar dos veces el mismo lote
        if (autorizaciones[_idLote].ejecutado) {
            revert MontoInvalido();
        }

        // Actualización de estado interno
        totalEnGarantia -= _monto;
        saldosPendientes[_beneficiario] += _monto;

        autorizaciones[_idLote] = AutorizacionPago({
            idLote: _idLote,
            beneficiario: _beneficiario,
            monto: _monto,
            puntajeCalidadIA: _puntajeCalidadIA,
            ejecutado: true
        });

        emit PagoAutorizadoPorIA(_idLote, _beneficiario, _monto, _puntajeCalidadIA);
    }

    // --- 3. PATRÓN DE RETIRO SEGURO (Check-Effects-Interactions) ---
    /**
     * @notice Cada beneficiario retira su propio dinero.
     * Previene ataques de reentrada (Reentrancy) y bloqueos DoS.
     */
    function retirarMiDinero() external {
        // 1. CHECKS (Comprobaciones)
        uint256 montoARetirar = saldosPendientes[msg.sender];
        if (montoARetirar == 0) revert SinSaldoPendiente();

        // 2. EFFECTS (Actualizar estado interno ANTES de transferir)
        saldosPendientes[msg.sender] = 0;

        // 3. INTERACTIONS (Transferencia de valor al final)
        (bool exito, ) = msg.sender.call{value: montoARetirar}("");
        if (!exito) revert FalloTransferencia();

        emit FondosRetirados(msg.sender, montoARetirar);
    }

    // --- FUNCIONES DE ADMINISTRACIÓN ---
    function actualizarOraculoIA(address _nuevoOraculo) external soloAdmin {
        if (_nuevoOraculo == address(0)) revert DireccionInvalida();
        oraculoIA = _nuevoOraculo;
        emit OraculoActualizado(_nuevoOraculo);
    }

    // Función de consulta de balance del contrato
    function consultarBalanceContrato() external view returns (uint256) {
        return address(this).balance;
    }
}

// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

/**
 * @dev Interfaz mínima del estándar ERC-20 (Stablecoins como USDC, USDT o DAI).
 */
interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
}

/**
 * @title DineroProgramableERC20
 * @dev Contrato de Dinero Programable con Stablecoins (Tokens ERC-20).
 * Demuestra por qué en producción se utilizan monedas estables (USDC/USDT)
 * en lugar de criptomonedas volátiles, y cómo opera el patrón universal
 * approve() + transferFrom() para custodia condicional y retiro seguro (CEI).
 */
contract DineroProgramableERC20 {

    // --- ERRORES PERSONALIZADOS ---
    error NoAutorizado(address remitente, address esperado);
    error MontoInvalido();
    error FondosInsuficientes(uint256 saldoActual, uint256 montoRequerido);
    error CondicionNoCumplida(uint256 puntajeActual, uint256 puntajeMinimo);
    error SinSaldoPendiente();
    error FalloTransferenciaERC20();
    error LoteYaEjecutado(uint256 idLote);
    error DireccionInvalida();
    error PuntajeInvalido();

    // --- VARIABLES DE ESTADO ---
    address public immutable administrador;
    address public oraculoIA;
    IERC20 public immutable tokenEstable; // Dirección de USDC o token ERC-20

    uint256 public totalEnGarantia;
    mapping(address => uint256) public saldosPendientes;

    struct AutorizacionPago {
        uint256 idLote;
        address beneficiario;
        uint256 monto;
        uint256 puntajeCalidadIA;
        bool ejecutado;
    }

    mapping(uint256 => AutorizacionPago) public autorizaciones;

    // --- EVENTOS ---
    event GarantiaDepositada(address indexed depositante, uint256 monto, uint256 nuevoTotal);
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
    constructor(address _tokenEstable, address _oraculoIA) {
        if (_tokenEstable == address(0) || _oraculoIA == address(0)) revert MontoInvalido();
        administrador = msg.sender;
        tokenEstable = IERC20(_tokenEstable);
        oraculoIA = _oraculoIA;
    }

    // --- 1. DEPÓSITO CON PATRÓN APPROVE + TRANSFERFROM ---
    /**
     * @notice Para depositar tokens ERC-20, el usuario primero debe ejecutar
     * token.approve(address(esteContrato), monto) en el contrato del token.
     * Luego este método transfiere los tokens a la custodia del contrato.
     */
    function depositarGarantiaTokens(uint256 _monto) external {
        if (_monto == 0) revert MontoInvalido();

        // 1. Efectos internos antes de interacción externa
        totalEnGarantia += _monto;

        // 2. Interacción: transferir tokens del depositante hacia este contrato
        _llamarToken(abi.encodeCall(IERC20.transferFrom, (msg.sender, address(this), _monto)));

        emit GarantiaDepositada(msg.sender, _monto, totalEnGarantia);
    }

    // --- 2. LÓGICA CONDICIONAL EVALUADA POR IA ---
    function autorizarPagoCondicionalTokens(
        uint256 _idLote,
        address _beneficiario,
        uint256 _monto,
        uint256 _puntajeCalidadIA
    ) external soloOraculoIA {
        if (_beneficiario == address(0)) revert DireccionInvalida();
        if (_monto == 0) revert MontoInvalido();
        if (_puntajeCalidadIA > 100) revert PuntajeInvalido();
        uint256 PUNTAJE_MINIMO = 90;
        if (_puntajeCalidadIA < PUNTAJE_MINIMO) {
            revert CondicionNoCumplida(_puntajeCalidadIA, PUNTAJE_MINIMO);
        }

        if (totalEnGarantia < _monto) {
            revert FondosInsuficientes(totalEnGarantia, _monto);
        }

        if (autorizaciones[_idLote].ejecutado) {
            revert LoteYaEjecutado(_idLote);
        }

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

    // --- 3. RETIRO SEGURO (Check-Effects-Interactions con ERC-20) ---
    function retirarMiDineroTokens() external {
        // 1. CHECKS
        uint256 monto = saldosPendientes[msg.sender];
        if (monto == 0) revert SinSaldoPendiente();

        // 2. EFFECTS
        saldosPendientes[msg.sender] = 0;

        // 3. INTERACTIONS
        _llamarToken(abi.encodeCall(IERC20.transfer, (msg.sender, monto)));

        emit FondosRetirados(msg.sender, monto);
    }

    // --- TRANSFERENCIA SEGURA ---
    /**
     * @dev Algunos tokens reales (como USDT en Ethereum) no devuelven `bool`.
     * Llamar con la interfaz estricta los haría fallar; por eso se acepta una
     * respuesta vacía o `true`, y se exige que la dirección del token tenga código.
     */
    function _llamarToken(bytes memory datos) private {
        address token = address(tokenEstable);
        if (token.code.length == 0) revert FalloTransferenciaERC20();
        (bool exito, bytes memory respuesta) = token.call(datos);
        if (!exito || (respuesta.length != 0 && !abi.decode(respuesta, (bool)))) revert FalloTransferenciaERC20();
    }

    // --- ADMINISTRACIÓN ---
    function actualizarOraculoIA(address _nuevoOraculo) external soloAdmin {
        if (_nuevoOraculo == address(0)) revert DireccionInvalida();
        oraculoIA = _nuevoOraculo;
        emit OraculoActualizado(_nuevoOraculo);
    }

    function consultarBalanceTokensContrato() external view returns (uint256) {
        return tokenEstable.balanceOf(address(this));
    }
}

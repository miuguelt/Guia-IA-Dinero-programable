// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title GarantiaAgroPay
/// @notice Custodia fondos de garantía de práctica y autoriza pagos a productores
/// cuando el oráculo registrado certifica un lote conforme a las reglas.
/// Los fondos de la red local no tienen valor monetario.
contract GarantiaAgroPay {
    // --- ERRORES PERSONALIZADOS (Ahorran gas y explican el motivo de reversión) ---
    error DireccionInvalida();
    error MontoInvalido();
    error SoloOraculo(address llamador);
    error LoteYaAutorizado(uint256 idLote);
    error FondosInsuficientes(uint256 disponible, uint256 solicitado);
    error SinSaldoPendiente();
    error FalloTransferencia();

    // --- CAPA 1: EVM STORAGE (Estado persistente en la cadena de bloques) ---
    // 1. Inmutable: vive en el bytecode del contrato; no consume slot de almacenamiento dinámico.
    address public immutable oraculo;

    // 2. Variables de estado: residen en ranuras (storage slots) de la máquina virtual Ethereum (EVM).
    // Toda modificación requiere minar una transacción y pagar gas.
    uint256 public garantiaDisponible;
    mapping(address => uint256) public saldoPendiente;
    mapping(uint256 => bool) public loteAutorizado;

    // --- CAPA 2: BITÁCORA DE EVENTOS / LOGS (Registro criptográfico inmutable) ---
    // Los eventos no se pueden consultar desde otros contratos en la EVM, pero quedan grabados
    // para siempre en la estructura de bloques y son la fuente de verdad que lee el indexador.
    event GarantiaDepositada(address indexed depositante, uint256 monto);
    event PagoAutorizado(uint256 indexed idLote, address indexed productor, uint256 monto);
    event PagoRetirado(address indexed productor, uint256 monto);

    /// @notice Despliega el contrato y vincula la dirección pública autorizada del oráculo.
    constructor(address oraculo_) {
        if (oraculo_ == address(0)) revert DireccionInvalida();
        oraculo = oraculo_;
    }

    /// @notice Etapa 2: Recibe fondos de garantía del comprador/financiador.
    /// @dev Al ser `payable`, transfiere ethers reales de la red local al balance del contrato.
    function depositarGarantia() external payable {
        // Validación de entrada: no admitir transacciones de valor cero
        if (msg.value == 0) revert MontoInvalido();

        // Mutación de estado en EVM Storage
        garantiaDisponible += msg.value;

        // Emisión del evento: queda en los logs del bloque para el indexador
        emit GarantiaDepositada(msg.sender, msg.value);
    }

    /// @notice Etapa 3: Autoriza el pago a un productor. Solo el oráculo registrado puede invocarla.
    /// @param idLote Identificador unívoco del lote de producción evaluado.
    /// @param productor Dirección de la cuenta del productor que recibirá los fondos.
    /// @param monto Cantidad en wei comprometida para el pago.
    function autorizarPago(uint256 idLote, address productor, uint256 monto) external {
        // Control de acceso criptográfico: comprueba que quien firma la transacción sea el oráculo
        if (msg.sender != oraculo) revert SoloOraculo(msg.sender);
        if (productor == address(0)) revert DireccionInvalida();
        if (monto == 0) revert MontoInvalido();

        // Control de idempotencia y unicidad: no pagar dos veces el mismo lote
        if (loteAutorizado[idLote]) revert LoteYaAutorizado(idLote);

        // Control de solvencia: no comprometer más fondos de los que existen en garantía
        if (monto > garantiaDisponible) revert FondosInsuficientes(garantiaDisponible, monto);

        // Efectos en EVM Storage: asegurar la reserva antes de cualquier interacción
        loteAutorizado[idLote] = true;
        garantiaDisponible -= monto;
        saldoPendiente[productor] += monto;

        // Bitácora pública del evento
        emit PagoAutorizado(idLote, productor, monto);
    }

    /// @notice Etapa 3: Retiro seguro de fondos por parte del productor.
    /// @dev Aplica rigurosamente el patrón Checks-Effects-Interactions (CEI) para prevenir ataques de reentrada.
    function retirar() external {
        // 1. CHECKS: Comprobar que el llamador tenga saldo disponible
        uint256 monto = saldoPendiente[msg.sender];
        if (monto == 0) revert SinSaldoPendiente();

        // 2. EFFECTS: Poner el saldo en cero ANTES de transferir dinero.
        // Si un atacante intenta llamar recursivamente a retirar() durante la transferencia,
        // su saldo ya será 0 y la segunda llamada revertirá con SinSaldoPendiente().
        saldoPendiente[msg.sender] = 0;

        // 3. INTERACTIONS: Transferir los fondos a la cuenta del productor
        (bool exito, ) = msg.sender.call{value: monto}("");
        if (!exito) revert FalloTransferencia();

        emit PagoRetirado(msg.sender, monto);
    }
}

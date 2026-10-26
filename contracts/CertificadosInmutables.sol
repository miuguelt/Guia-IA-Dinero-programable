// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

/**
 * @title CertificadosInmutables
 * @dev Caso de uso práctico para aprendices ADSO:
 * Trazabilidad y certificación inmutable de títulos académicos (SENA),
 * actas de entrega de software o sellos de calidad agropecuaria.
 * 
 * Principio clave:
 * NO se sube el archivo PDF ni la imagen a la blockchain (sería impagable en gas).
 * Se calcula el hash criptográfico SHA-256 del documento off-chain y solo se
 * almacena el hash de 32 bytes on-chain.
 * Cualquier persona puede verificar la autenticidad con costo CERO de gas (view call).
 */
contract CertificadosInmutables {

    error NoAutorizado();
    error CertificadoYaExiste(bytes32 hashDocumento);
    error CertificadoNoExiste(bytes32 hashDocumento);
    error DatosInvalidos();

    struct Certificado {
        bytes32 hashDocumento; // SHA-256 del archivo PDF/ZIP
        string codigoIdentificador; // Ej. "ADSO-2026-FICHA-228118"
        string descripcion;
        address emisor;
        uint256 fechaEmision;
        bool vigente;
    }

    address public immutable entidadEmisora; // Dirección del SENA o empresa
    mapping(bytes32 => Certificado) public certificados;
    mapping(bytes32 => bool) private emitidos;

    event CertificadoEmitido(bytes32 indexed hashDocumento, string codigo, address emisor, uint256 fecha);
    event CertificadoRevocado(bytes32 indexed hashDocumento, string motivo);

    modifier soloEmisor() {
        if (msg.sender != entidadEmisora) revert NoAutorizado();
        _;
    }

    constructor() {
        entidadEmisora = msg.sender;
    }

    /**
     * @notice Registra un certificado inmutable en la red.
     */
    function emitirCertificado(
        bytes32 _hashDocumento,
        string calldata _codigo,
        string calldata _descripcion
    ) external soloEmisor {
        if (_hashDocumento == bytes32(0) || bytes(_codigo).length == 0) revert DatosInvalidos();
        if (emitidos[_hashDocumento]) revert CertificadoYaExiste(_hashDocumento);
        emitidos[_hashDocumento] = true;

        certificados[_hashDocumento] = Certificado({
            hashDocumento: _hashDocumento,
            codigoIdentificador: _codigo,
            descripcion: _descripcion,
            emisor: msg.sender,
            fechaEmision: block.timestamp,
            vigente: true
        });

        emit CertificadoEmitido(_hashDocumento, _codigo, msg.sender, block.timestamp);
    }

    /**
     * @notice Verificación instantánea con costo CERO de gas (función view).
     */
    function verificarAutenticidad(bytes32 _hashDocumento) external view returns (
        bool esAutentico,
        bool estaVigente,
        string memory codigo,
        uint256 fechaEmision
    ) {
        Certificado memory cert = certificados[_hashDocumento];
        if (!emitidos[_hashDocumento]) {
            return (false, false, "", 0);
        }
        return (true, cert.vigente, cert.codigoIdentificador, cert.fechaEmision);
    }

    /**
     * @notice Revocación en caso de anulación administrativa o fraude.
     */
    function revocarCertificado(bytes32 _hashDocumento, string calldata _motivo) external soloEmisor {
        if (!emitidos[_hashDocumento]) revert CertificadoNoExiste(_hashDocumento);
        certificados[_hashDocumento].vigente = false;
        emit CertificadoRevocado(_hashDocumento, _motivo);
    }
}

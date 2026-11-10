// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @title RegistroProductos: el CRUD que ya conoces, escrito como contrato.
/// @notice Crear, leer, actualizar y desactivar productos. Nada se borra:
///         cada cambio queda como evento en la cadena.
contract RegistroProductos {
    struct Producto {
        string nombre;
        uint256 precio; // pesos enteros, sin decimales
        address responsable; // la cuenta que lo creó; solo ella lo modifica
        bool activo;
    }

    /// @notice Cantidad de productos creados; el último id usado.
    uint256 public totalProductos;
    mapping(uint256 => Producto) private productos;

    event ProductoCreado(uint256 indexed id, address indexed responsable, string nombre, uint256 precio);
    event PrecioActualizado(uint256 indexed id, uint256 precioAnterior, uint256 precioNuevo);
    event ProductoDesactivado(uint256 indexed id, address indexed responsable);

    error NombreVacio();
    error ProductoInexistente(uint256 id);
    error SoloResponsable(address cuenta);
    error ProductoInactivo(uint256 id);

    /// @notice C de CRUD: equivale a un INSERT. Cuesta gas y emite un evento.
    function crear(string calldata nombre, uint256 precio) external returns (uint256 id) {
        if (bytes(nombre).length == 0) revert NombreVacio();
        id = ++totalProductos;
        productos[id] = Producto(nombre, precio, msg.sender, true);
        emit ProductoCreado(id, msg.sender, nombre, precio);
    }

    /// @notice R de CRUD: equivale a un SELECT por id. Es `view`: no cuesta gas.
    function obtener(uint256 id) external view returns (Producto memory) {
        return _existente(id);
    }

    /// @notice U de CRUD: equivale a un UPDATE, pero el valor anterior queda en el evento.
    function actualizarPrecio(uint256 id, uint256 precioNuevo) external {
        Producto storage producto = _modificable(id);
        uint256 precioAnterior = producto.precio;
        producto.precio = precioNuevo;
        emit PrecioActualizado(id, precioAnterior, precioNuevo);
    }

    /// @notice D de CRUD: no existe DELETE. El producto se marca inactivo y su historia permanece.
    function desactivar(uint256 id) external {
        Producto storage producto = _modificable(id);
        producto.activo = false;
        emit ProductoDesactivado(id, msg.sender);
    }

    function _existente(uint256 id) private view returns (Producto storage producto) {
        producto = productos[id];
        if (producto.responsable == address(0)) revert ProductoInexistente(id);
    }

    function _modificable(uint256 id) private view returns (Producto storage producto) {
        producto = _existente(id);
        if (producto.responsable != msg.sender) revert SoloResponsable(msg.sender);
        if (!producto.activo) revert ProductoInactivo(id);
    }
}

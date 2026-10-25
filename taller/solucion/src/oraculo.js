// Etapa 4: oráculo con datos firmados criptográficamente.
// Demuestra cómo un sistema externo vincula el mundo físico/IoT con la cadena de bloques:
// 1. Firma digital ECDSA: asegura identidad del emisor e inmutabilidad del mensaje.
// 2. Control de nonce: previene ataques de repetición (replay attacks).
// 3. Evaluación de reglas antes de interactuar con el contrato inteligente.
const { verifyMessage } = require('ethers');
const { evaluarLectura } = require('./reglas');

function errorOraculo(codigo, mensaje) {
  return Object.assign(new Error(mensaje), { codigo });
}

/**
 * Serializa de forma determinista el contenido que se firmará.
 * El orden fijo de claves garantiza que el hash generado sea siempre idéntico.
 */
function contenidoFirmado(lectura) {
  return JSON.stringify({
    idLote: lectura.idLote,
    temperatura: lectura.temperatura,
    acidez: lectura.acidez,
    nonce: lectura.nonce,
  });
}

/**
 * El oráculo/sensor firma la lectura con su clave privada mediante la red.
 */
async function firmarLectura(firmante, lectura) {
  const firma = await firmante.signMessage(contenidoFirmado(lectura));
  return { lectura: { ...lectura }, firma };
}

/**
 * Crea un componente verificador vinculado a la dirección pública del oráculo.
 * Comprueba que el paquete no haya sido adulterado y que el nonce no se reutilice.
 */
function crearVerificador(direccionOraculo) {
  // Almacenamiento local de nonces ya procesados
  const usados = new Set();

  return {
    verificar(paquete) {
      // 1. Recuperar la dirección pública que firmó el contenido
      const recuperada = verifyMessage(contenidoFirmado(paquete.lectura), paquete.firma);

      // 2. Comprobar identidad del firmante y detección de alteración
      if (recuperada.toLowerCase() !== direccionOraculo.toLowerCase()) {
        throw errorOraculo('FIRMA_INVALIDA', 'La firma no corresponde al oráculo registrado o la lectura cambió.');
      }

      // 3. Comprobar que no sea un ataque de repetición
      if (usados.has(paquete.lectura.nonce)) {
        throw errorOraculo('LECTURA_REPETIDA', 'Esta lectura ya se procesó. Genera una lectura nueva.');
      }

      // Registrar el nonce como consumido
      usados.add(paquete.lectura.nonce);
      return paquete.lectura;
    },
  };
}

/**
 * Procesa la lectura completa: verifica criptografía, evalúa reglas de negocio
 * y solo si se aprueba, envía la transacción hacia el contrato en la red.
 */
async function procesarLectura({ contrato, verificador, paquete, productor, monto }) {
  // Paso A: Comprobar integridad criptográfica y unicidad
  const lectura = verificador.verificar(paquete);

  // Paso B: Evaluar reglas deterministas de negocio
  const dictamen = evaluarLectura(lectura);

  // Si la calidad no cumple, no se envía transacción a la red (ahorro de gas y preservación de estado)
  if (!dictamen.aprobada) {
    return { ...dictamen, txHash: null };
  }

  // Paso C: Interacción con la cadena: autorización del pago en el contrato
  const tx = await contrato.autorizarPago(lectura.idLote, productor, monto);
  const recibo = await tx.wait();

  return { ...dictamen, txHash: recibo.hash };
}

module.exports = { contenidoFirmado, firmarLectura, crearVerificador, procesarLectura };

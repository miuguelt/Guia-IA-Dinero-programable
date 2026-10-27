// Guía paso a paso de cada laboratorio: qué hacer, qué resultado esperar y cómo resolver un fallo.
// `notice` es un aviso propio del laboratorio; `concepts` es un glosario breve que se muestra antes de ejecutar.
const SIGNED_DATA_NOTICE = 'Los datos se ingresan por software. Una firma válida no demuestra que una lectura corresponda a un producto físico.';

export const labGuidance = {
  elections: {
    steps: ['Deja «Prueba válida» y ejecuta: el voto se cuenta.', 'Ejecuta otra vez con la misma identidad: se rechaza la repetición.', 'Pulsa «Reiniciar simulación», elige «Prueba inválida» y ejecuta.', 'Anota qué comprueba la prueba y qué no demuestra sobre una elección pública.'],
    expect: 'El primer voto válido se cuenta; la repetición y la prueba inválida se rechazan con un motivo.',
    troubleshoot: 'Si el primer voto aparece como repetido, pulsa «Reiniciar simulación». En Real local, la primera ejecución descarga recursos de Semaphore y puede tardar.',
    taller: null,
  },
  signatures: {
    steps: ['Ejecuta con las casillas desmarcadas: el paquete se acepta.', 'Marca «Alterar el contenido después de firmar» y ejecuta.', 'Desmarca la alteración, marca «Repetir el paquete» y ejecuta.', 'Compara los tres motivos con los códigos FIRMA_INVALIDA y LECTURA_REPETIDA del taller.'],
    expect: 'Solo el paquete sin alteración y sin repetir se acepta.',
    troubleshoot: 'En Real local, una firma vencida (más de cinco minutos) también se rechaza: genera una lectura nueva.',
    notice: SIGNED_DATA_NOTICE,
    taller: 4,
  },
  pipeline: {
    steps: ['Ejecuta con 3,5 °C y acidez 16: observa las seis etapas.', 'Cambia la temperatura a 9 y ejecuta de nuevo.', 'En Real local, identifica la etapa que queda «Sin transacción» y explica por qué no hubo autorización.'],
    expect: 'Con valores dentro de los límites, el dictamen se acepta; con 9 °C se rechaza y no se envía una autorización.',
    troubleshoot: 'En Real local, si la indexación queda pendiente, el recibo se conserva: revisa que PostgreSQL esté activo y reintenta.',
    notice: SIGNED_DATA_NOTICE,
    taller: 6,
  },
  pharma: {
    steps: ['Ejecuta LOTE-01 con 4,2 °C: queda disponible.', 'Ejecuta el mismo lote con 9 °C: entra en cuarentena.', 'Vuelve a 4 °C con el mismo lote y observa que la cuarentena se conserva.', 'Prueba un lote nuevo para comparar.'],
    expect: 'Una lectura fuera de 2 a 8 °C deja el lote en cuarentena y una lectura posterior correcta no la levanta.',
    troubleshoot: 'Si el lote sigue en cuarentena desde un intento anterior, cambia el identificador o reinicia la simulación.',
    notice: SIGNED_DATA_NOTICE,
    taller: 1,
  },
  honey: {
    steps: ['Ejecuta con los valores iniciales: el lote cumple.', 'Sube la humedad a 22 % y ejecuta.', 'Cambia el delta de carbono a -20 y revisa la lista de razones.'],
    expect: 'Cada criterio que falla agrega su razón al dictamen.',
    troubleshoot: 'Si el campo marca error, revisa que el valor esté dentro del rango que admite el formulario.',
    notice: SIGNED_DATA_NOTICE,
    taller: 1,
  },
  audit: {
    steps: [
      'Ejecuta la simulación con «Contrato actual (protegido)». Lee el veredicto y la tabla: cada comprobación dice qué riesgo evita y dónde está en el código.',
      'Elige la variante que envía el dinero antes de poner el saldo en cero. Observa que Slither y la prueba de ataque detectan la reentrada.',
      'Prueba las variantes de permisos y de lote repetido. Slither no encuentra nada, pero la prueba falla: anota por qué un analizador automático no reemplaza las pruebas.',
      'En Real local, ejecuta la revisión del proyecto. Separa los hallazgos del contrato de producción de los del archivo adversario y explica cada hallazgo alto o medio.'
    ],
    expect: 'La versión protegida queda aprobada: la prueba de ataque pasa y no hay hallazgos altos ni medios en el contrato de producción. Cada variante queda en «Requiere corrección» con la comprobación que falla.',
    troubleshoot: 'Si Real local informa que Slither no está instalado, instálalo con uv (Prepara tu equipo, nivel completo). Si falla la compilación, ejecuta npx hardhat compile y corrige el error antes de auditar. Si falla la prueba de ataque, revisa su salida en «Ver detalles de la ejecución».',
    concepts: [
      ['Auditoría', 'Revisión del código de un contrato para encontrar fallas antes de desplegarlo, cuando todavía se pueden corregir.'],
      ['Slither', 'Analizador estático: lee el código sin ejecutarlo y señala patrones de riesgo conocidos. No conoce las reglas del negocio.'],
      ['Prueba de ataque', 'Prueba automatizada en la que un contrato adversario intenta abusar del contrato. Si el abuso funciona, la prueba falla.'],
      ['Hallazgo', 'Cada alerta del analizador. Indica el detector, la gravedad y el lugar del código.'],
      ['Impacto', 'Gravedad estimada del hallazgo: alto, medio, bajo, informativo u optimización. Los altos y medios en producción bloquean la revisión.'],
      ['Confianza', 'Qué tan seguro está el analizador de que el hallazgo es real y no una falsa alarma.'],
      ['Contrato de producción', 'El código que se desplegaría para usuarios reales. Sus hallazgos altos o medios deben corregirse.'],
      ['Archivo adversario', 'Contrato que solo existe para las pruebas y ataca a propósito, como AdversarioRetiro.sol. Que tenga hallazgos es lo esperado.'],
      ['Checks-Effects-Interactions', 'Orden seguro de una función: comprobar condiciones, actualizar el estado y, al final, interactuar con otras cuentas.'],
      ['Relación con el taller', 'En la etapa 3 trabajas con GarantiaAgroPay y AtacanteRetiro. Aquí se revisan DineroProgramableBase y AdversarioRetiro: el patrón de defensa es el mismo.']
    ],
    notice: 'Un análisis sin hallazgos altos no garantiza que el contrato sea seguro. Combínalo con pruebas de las reglas del negocio y con revisión humana.',
    taller: 3,
  },
  evm: {
    steps: ['Deposita 0.01 y consulta el saldo.', 'Autoriza un pago de 0.01 y revisa el saldo pendiente.', 'Retira el pago; repite el retiro y observa el rechazo.', 'Compara cada paso con las pruebas de las etapas 2 y 3.'],
    expect: 'La garantía disminuye al autorizar, el saldo pendiente sube y vuelve a cero al retirar.',
    troubleshoot: 'Usa punto decimal en el monto. En Real local, reinicia la guía con pwsh ./start-windows.ps1 -Reload si la red no responde.',
    taller: 2,
  },
  myths: {
    steps: ['Escribe tu predicción antes de ejecutar.', 'Ejecuta con 3,5 °C y acidez 16.', 'Cambia la temperatura a 4,5 y predice de nuevo.', 'Explica por qué una regla explicable no es un modelo de IA.'],
    expect: 'El resultado muestra el puntaje, si tu predicción acertó y la regla aplicada.',
    troubleshoot: 'Si no entiendes el puntaje, revisa la explicación del resultado: indica los límites del ejercicio.',
    taller: 1,
  },
  comparison: {
    steps: ['Ejecuta en Simulación y lee el efecto de cada operación.', 'En Real local, ejecuta y anota el gas observado.', 'Explica por qué esa medición local no representa el costo en una red pública.'],
    expect: 'Tres escenarios con su efecto; en Real local, además, el gas medido.',
    troubleshoot: 'La simulación no inventa cifras de gas: para verlas necesitas la modalidad Real local.',
    taller: null,
  },
  blocks: {
    steps: ['Ejecuta con el contenido vacío: los cuatro bloques quedan íntegros.', 'Elige el bloque 1, escribe «Depósito de garantía: 9,00 ETH» y ejecuta sin recalcular el hash.', 'Marca «Volver a calcular el hash del bloque alterado» y ejecuta de nuevo: observa qué bloque falla ahora.', 'En Real local, compara el parentHash de cada bloque con el hash de la fila anterior.'],
    expect: 'Sin recalcular, falla el bloque alterado; al recalcularlo, falla el enlace del bloque siguiente. En Real local todos los enlaces coinciden.',
    troubleshoot: 'En Real local, si aparecen pocos bloques, ejecuta antes otro laboratorio que envíe transacciones. Si la red no responde, reinicia la guía con pwsh ./start-windows.ps1 -Reload.',
    concepts: [['Hash', 'Huella de longitud fija: cambiar un solo carácter del contenido produce otra huella.'], ['Hash anterior', 'Huella del bloque previo que cada bloque guarda; en Ethereum se llama parentHash.'], ['Génesis', 'Primer bloque de la cadena; su hash anterior es una serie de ceros.']],
    taller: null,
  },
  pc: {
    steps: ['Elige «Compilar» y ejecuta.', 'Elige «Ejecutar pruebas» y revisa el código de salida.', 'Si tienes Slither, elige «Auditar con Slither».', 'Compara con lo que haces en el taller con npm run etapa:N.'],
    expect: 'Cada tarea termina con código de salida 0 y su reporte.',
    troubleshoot: 'Un código distinto de 0 indica que la herramienta falló: lee el reporte antes de reintentar. En Simulación solo ves los comandos.',
    taller: 0,
  },
  architecture: {
    steps: ['Ejecuta para ver las capas y el estado de los servicios.', 'En Real local, registra una clave de acceso con tu navegador.', 'Autentícate con esa clave y observa la respuesta.'],
    expect: 'Cada capa muestra su estado; el registro y la autenticación terminan con un mensaje de éxito.',
    troubleshoot: 'WebAuthn requiere abrir la guía en http://localhost:8153 con un navegador compatible. Si cancelas el diálogo, la interfaz lo informa.',
    taller: 6,
  },
  database: {
    steps: ['Elige «Sincronizar eventos» y ejecuta.', 'Ejecuta otra vez y comprueba que el número de registros no aumenta.', 'Elige «Reconstruir proyección» y compara los registros.'],
    expect: 'Sincronizar dos veces no duplica registros y la reconstrucción produce los mismos datos.',
    troubleshoot: 'En Real local se necesita PostgreSQL activo y la base preparada con start-windows.ps1 -InitializeDatabase.',
    taller: 5,
  },
};

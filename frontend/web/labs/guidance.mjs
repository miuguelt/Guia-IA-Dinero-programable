// Guía paso a paso de cada laboratorio: qué hacer, qué resultado esperar y cómo resolver un fallo.
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
    taller: 4,
  },
  pipeline: {
    steps: ['Ejecuta con 3,5 °C y acidez 16: observa las seis etapas.', 'Cambia la temperatura a 9 y ejecuta de nuevo.', 'En Real local, identifica la etapa que queda «Sin transacción» y explica por qué no hubo autorización.'],
    expect: 'Con valores dentro de los límites, el dictamen se acepta; con 9 °C se rechaza y no se envía una autorización.',
    troubleshoot: 'En Real local, si la indexación queda pendiente, el recibo se conserva: revisa que PostgreSQL esté activo y reintenta.',
    taller: 6,
  },
  pharma: {
    steps: ['Ejecuta LOTE-01 con 4,2 °C: queda disponible.', 'Ejecuta el mismo lote con 9 °C: entra en cuarentena.', 'Vuelve a 4 °C con el mismo lote y observa que la cuarentena se conserva.', 'Prueba un lote nuevo para comparar.'],
    expect: 'Una lectura fuera de 2 a 8 °C deja el lote en cuarentena y una lectura posterior correcta no la levanta.',
    troubleshoot: 'Si el lote sigue en cuarentena desde un intento anterior, cambia el identificador o reinicia la simulación.',
    taller: 1,
  },
  honey: {
    steps: ['Ejecuta con los valores iniciales: el lote cumple.', 'Sube la humedad a 22 % y ejecuta.', 'Cambia el delta de carbono a -20 y revisa la lista de razones.'],
    expect: 'Cada criterio que falla agrega su razón al dictamen.',
    troubleshoot: 'Si el campo marca error, revisa que el valor esté dentro del rango que admite el formulario.',
    taller: 1,
  },
  audit: {
    steps: ['En Simulación, revisa la lista de comprobaciones.', 'Relaciona cada comprobación con una prueba de la etapa 3 del taller.', 'En Real local, ejecuta y revisa los hallazgos: separa los del contrato de producción de los del archivo adversario.'],
    expect: 'La prueba de ataque pasa y no hay hallazgos altos o medios en los contratos de producción.',
    troubleshoot: 'Si aparece «Slither no disponible», instala uv y Slither (ver Prepara tu equipo, nivel completo).',
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

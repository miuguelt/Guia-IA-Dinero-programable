import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { evaluarCalidadConIA } from '../scripts/agente-ia-oraculo.js';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../scripts/ejemplo-cliente-frontend.js';

const projectRoot = process.cwd();

describe('⚡ Verificación: Implementación en Aplicaciones Reales, Redes y Coolify', () => {

  describe('1. Cliente Frontend Web3 (scripts/ejemplo-cliente-frontend.js)', () => {
    test('Exporta dirección del contrato válida en formato hexadecimal (42 caracteres)', () => {
      assert.ok(CONTRACT_ADDRESS.startsWith('0x'));
      assert.equal(CONTRACT_ADDRESS.length, 42);
    });

    test('Exporta ABI completa con funciones de lectura, escritura y eventos clave', () => {
      assert.ok(Array.isArray(CONTRACT_ABI));
      const abiString = CONTRACT_ABI.join(' ');
      
      // Lecturas
      assert.ok(abiString.includes('totalEnGarantia'));
      assert.ok(abiString.includes('saldosPendientes'));
      assert.ok(abiString.includes('consultarBalanceContrato'));

      // Escrituras
      assert.ok(abiString.includes('depositarGarantia'));
      assert.ok(abiString.includes('autorizarPagoCondicional'));
      assert.ok(abiString.includes('retirarMiDinero'));

      // Eventos
      assert.ok(abiString.includes('PagoAutorizadoPorIA'));
      assert.ok(abiString.includes('FondosDepositados'));
      assert.ok(abiString.includes('FondosRetirados'));
    });
  });

  describe('2. Agente Autónomo de IA como Oráculo (scripts/agente-ia-oraculo.js)', () => {
    test('Aprueba lote de leche de alta calidad (Temp <= 4°C, Acidez 16) con puntaje >= 90', async () => {
      const loteLeche = {
        idLote: 101,
        producto: 'Leche Cruda Fresca',
        tipo: 'LECHE',
        temperatura: 3.5,
        acidez: 16
      };
      const res = await evaluarCalidadConIA(loteLeche);
      assert.ok(res.puntaje >= 90);
      assert.equal(res.aprobado, true);
    });

    test('Rechaza lote de leche con ruptura de cadena de frío (Temp 8.5°C) con puntaje < 90', async () => {
      const loteCaliente = {
        idLote: 102,
        producto: 'Leche con ruptura térmica',
        tipo: 'LECHE',
        temperatura: 8.5,
        acidez: 16
      };
      const res = await evaluarCalidadConIA(loteCaliente);
      assert.ok(res.puntaje < 90);
      assert.equal(res.aprobado, false);
    });

    test('Aprueba miel pura (Humedad <= 20%, Delta C13 <= -24.5) con puntaje >= 90', async () => {
      const loteMiel = {
        idLote: 103,
        producto: 'Miel de Abejas del Bosque',
        tipo: 'MIEL',
        humedad: 18.2,
        deltaC13: -25.8
      };
      const res = await evaluarCalidadConIA(loteMiel);
      assert.ok(res.puntaje >= 90);
      assert.equal(res.aprobado, true);
    });

    test('Rechaza miel adulterada con jarabe de maíz C4', async () => {
      const loteAdulterado = {
        idLote: 104,
        producto: 'Miel adulterada',
        tipo: 'MIEL',
        humedad: 18.0,
        deltaC13: -12.0 // Típico de maíz C4
      };
      const res = await evaluarCalidadConIA(loteAdulterado);
      assert.ok(res.puntaje < 90);
      assert.equal(res.aprobado, false);
    });
  });

  describe('3. Agente de IA Oráculo en Python (scripts/agente_ia_oraculo.py)', () => {
    test('Ejecuta script de demostración en Python sin errores de sintaxis', () => {
      const pythonScript = path.join(projectRoot, 'scripts', 'agente_ia_oraculo.py');
      assert.ok(fs.existsSync(pythonScript));
      const output = execSync(`python "${pythonScript}"`, { encoding: 'utf-8' });
      assert.ok(output.includes('APROBADO ✅'));
      assert.ok(output.includes('autorizarPagoCondicional'));
    });
  });

  describe('4. Contrato de Dinero Programable con Stablecoins ERC-20 (contracts/DineroProgramableERC20.sol)', () => {
    const erc20Sol = fs.readFileSync(path.join(projectRoot, 'contracts', 'DineroProgramableERC20.sol'), 'utf-8');

    test('Implementa la interfaz IERC20 con transfer, transferFrom y approve', () => {
      assert.ok(erc20Sol.includes('interface IERC20'));
      assert.ok(erc20Sol.includes('transferFrom'));
      assert.ok(erc20Sol.includes('approve'));
    });

    test('Aplica el patrón de seguridad Check-Effects-Interactions en retiros de tokens', () => {
      assert.ok(erc20Sol.includes('function retirarMiDineroTokens'));
      // Verifica que el saldo se pone en 0 antes del transfer de tokens
      const idxEffects = erc20Sol.indexOf('saldosPendientes[msg.sender] = 0;');
      const idxInteractions = erc20Sol.indexOf('tokenEstable.transfer(msg.sender, monto);');
      assert.ok(idxEffects > 0);
      assert.ok(idxInteractions > 0);
      assert.ok(idxEffects < idxInteractions, 'Effects debe preceder a Interactions');
    });

    test('Requiere autorización exclusiva del oráculo de IA para pagos condicionales', () => {
      assert.ok(erc20Sol.includes('soloOraculoIA'));
      assert.ok(erc20Sol.includes('revert CondicionNoCumplida'));
    });
  });

  describe('5. Topología de Redes & Despliegue en Contenedores Coolify', () => {
    const composeContent = fs.readFileSync(path.join(projectRoot, 'docker-compose.yml'), 'utf-8');

    // La conformidad completa con §6.2 vive en tests/deploy-coolify.test.mjs.
    test('El docker-compose publica solo el frontend estático en la red coolify', () => {
      assert.ok(composeContent.includes('frontend:'));
      assert.ok(!composeContent.includes('evm-node:'));
      assert.ok(!/^\s*postgres:/m.test(composeContent));
      assert.match(composeContent, /coolify:\s*\n\s*external: true/);
    });

    test('Los contenedores cuentan con healthchecks autónomos para orquestación en PaaS', () => {
      assert.ok(composeContent.includes('healthcheck:'));
      assert.ok(composeContent.includes('restart: unless-stopped'));
    });
  });

  describe('6. Caso de Uso E-Commerce: TiendaEscrowWeb3.sol', () => {
    const tiendaSol = fs.readFileSync(path.join(projectRoot, 'contracts', 'TiendaEscrowWeb3.sol'), 'utf-8');

    test('Implementa estados del pedido: FONDOS_BLOQUEADOS, DESPACHADO, ENTREGADO_PAGADO, REEMBOLSADO', () => {
      assert.ok(tiendaSol.includes('enum EstadoPedido'));
      assert.ok(tiendaSol.includes('FONDOS_BLOQUEADOS'));
      assert.ok(tiendaSol.includes('DESPACHADO'));
      assert.ok(tiendaSol.includes('ENTREGADO_PAGADO'));
      assert.ok(tiendaSol.includes('REEMBOLSADO'));
    });

    test('Aplica el patrón Check-Effects-Interactions al liberar pago al vendedor', () => {
      const idxState = tiendaSol.indexOf('pedido.estado = EstadoPedido.ENTREGADO_PAGADO;');
      const idxMontoZero = tiendaSol.indexOf('pedido.monto = 0;');
      const idxCall = tiendaSol.indexOf('(bool exito, ) = vendedor.call{value: monto}("");');

      assert.ok(idxState > 0);
      assert.ok(idxMontoZero > 0);
      assert.ok(idxCall > 0);
      assert.ok(idxMontoZero < idxCall, 'El monto debe limpiarse antes de transferir ether (CEI)');
    });
  });

  describe('7. Caso de Uso Certificación: CertificadosInmutables.sol', () => {
    const certSol = fs.readFileSync(path.join(projectRoot, 'contracts', 'CertificadosInmutables.sol'), 'utf-8');

    test('Permite emitir certificados con hash SHA-256 de 32 bytes y código identificador', () => {
      assert.ok(certSol.includes('function emitirCertificado'));
      assert.ok(certSol.includes('bytes32 _hashDocumento'));
      assert.ok(certSol.includes('CertificadoEmitido'));
    });

    test('Función verificarAutenticidad es view para consulta gratuita sin costo de gas', () => {
      assert.ok(certSol.includes('function verificarAutenticidad(bytes32 _hashDocumento) external view'));
    });
  });

  describe('8. Migración Práctica Web2 a Web3 (scripts/migracion-ecommerce-web2-a-web3.js)', () => {
    test('El módulo exporta funciones de backend Web2 y sincronizador CQRS', async () => {
      const migracionModule = await import('../scripts/migracion-ecommerce-web2-a-web3.js');
      assert.ok(typeof migracionModule.backendCrearPedidoWeb2 === 'function');
      assert.ok(typeof migracionModule.iniciarSincronizadorEventos === 'function');

      // Prueba de creación de pedido Web2
      const pedidoWeb2 = migracionModule.backendCrearPedidoWeb2({
        clienteId: 'APRENDIZ-001',
        productoId: 1,
        vendedorAddress: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8'
      });
      assert.ok(pedidoWeb2.idPedido > 0);
      assert.equal(pedidoWeb2.montoEthRequerido, '0.08');
    });
  });

  describe('9. Ilustraciones e Infografías Arquitectónicas en assets/', () => {
    test('Existen las ilustraciones 3D para Web2 a Web3 y Smart Contract Vending Machine', () => {
      const imgWeb2Web3 = path.join(projectRoot, 'assets', '3d_web2_to_web3.jpg');
      const imgVending = path.join(projectRoot, 'assets', '3d_smart_contract_vending.jpg');

      assert.ok(fs.existsSync(imgWeb2Web3), '3d_web2_to_web3.jpg debe existir');
      assert.ok(fs.existsSync(imgVending), '3d_smart_contract_vending.jpg debe existir');
      assert.ok(fs.statSync(imgWeb2Web3).size > 10000);
      assert.ok(fs.statSync(imgVending).size > 10000);
    });
  });

  describe('10. Paradigma Computacional: POO vs Smart Contracts', () => {
    test('Existe la guía técnica docs/03c-paradigma-poo-vs-smart-contracts.md con los conceptos clave', () => {
      const guidePath = path.join(projectRoot, 'docs', '03c-paradigma-poo-vs-smart-contracts.md');
      assert.ok(fs.existsSync(guidePath), '03c-paradigma-poo-vs-smart-contracts.md debe existir');
      
      const content = fs.readFileSync(guidePath, 'utf-8');
      assert.ok(content.includes('Deterministic Replicated State Machine') || content.includes('Máquina de Estados Finitos Criptográfica'));
      assert.ok(content.includes('Gas Metering'));
      assert.ok(content.includes('storage') && content.includes('memory') && content.includes('calldata'));
      assert.ok(content.includes('Reentrancy') || content.includes('reentrada'));
      assert.ok(content.includes('Decálogo Mental'));
    });

    test('el módulo 3 conserva la comparación POO/EVM y explica persistencia, permisos y retiro', () => {
      const modulePath = path.join(projectRoot, 'frontend', 'web', 'learning', 'module-3.json');
      const module = JSON.parse(fs.readFileSync(modulePath, 'utf-8'));
      const content = module.steps.map(step => step.body).join('\n');
      assert.equal(module.id, 'm3');
      assert.equal(module.steps.length, 4);
      assert.match(content, /POO y EVM/);
      assert.match(content, /storage.*memory.*calldata/s);
      assert.match(content, /msg.sender/);
      assert.match(content, /saldosPendientes\[msg.sender\] = 0/);
    });
  });
});



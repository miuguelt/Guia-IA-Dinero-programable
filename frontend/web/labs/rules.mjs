export function numeric(value, fallback = 0) {
  const number = value === undefined ? fallback : Number(value);
  if (!Number.isFinite(number)) throw new Error('Ingresa un número válido.');
  return number;
}
export function evaluateMilk(input) {
  const temperature = numeric(input.temperature, 3.5);
  const acidity = numeric(input.acidity, 16);
  const score = (temperature <= 4 ? 60 : 20) + (acidity >= 14 && acidity <= 18 ? 38 : 10);
  return { temperature, acidity, score, accepted: score >= 90, explanation: 'Temperatura ≤ 4 y acidez entre 14 y 18 son las reglas de este ejercicio.' };
}
export function evaluateHoney(input) {
  const humidity = numeric(input.humidity, 17.2);
  const hmf = numeric(input.hmf, 14);
  const deltaC13 = numeric(input.deltaC13, -26.4);
  const reasons = [];
  if (humidity < 0 || humidity > 20) reasons.push('La humedad no cumple el rango del ejercicio (0–20 %).');
  if (hmf < 0 || hmf > 40) reasons.push('El HMF no cumple el rango del ejercicio (0–40 mg/kg).');
  if (deltaC13 > -24.5 || deltaC13 < -100) reasons.push('El delta de carbono no cumple el criterio del ejercicio.');
  return { humidity, hmf, deltaC13, accepted: reasons.length === 0, reasons, explanation: 'El dictamen es didáctico; no certifica inocuidad ni autenticidad de un alimento.' };
}
export function parseEtherInput(value = '0.01') {
  const amount = String(value);
  if (!/^\d+(\.\d{1,18})?$/.test(amount)) throw new Error('Usa un monto positivo con punto y hasta 18 decimales.');
  const [whole, decimal = ''] = amount.split('.');
  const wei = BigInt(whole) * 10n ** 18n + BigInt(decimal.padEnd(18, '0'));
  if (wei <= 0n) throw new Error('El monto debe ser mayor que cero.');
  return wei;
}
export function formatEtherValue(wei) {
  const whole = wei / 10n ** 18n;
  const decimal = (wei % 10n ** 18n).toString().padStart(18, '0').replace(/0+$/, '');
  return whole.toString() + (decimal ? '.' + decimal : '');
}

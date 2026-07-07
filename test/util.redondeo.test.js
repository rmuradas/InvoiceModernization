// test/util.redondeo.test.js
// Tests de caracterización de redondear2 (lib/util.js:5-7).
// Congelan lo que el codigo PRODUCE HOY, no lo que "deberia". Runner nativo node:test.
// Regla de negocio: RN-01 (redondeo a 2 decimales). Corazon del calculo fiscal.
//
// REGLA DE ORO: el valor esperado es el que produce Math.round(x*100)/100.
// Si un test falla, se corrige el TEST, jamas el codigo.

var test = require('node:test');
var assert = require('node:assert');
var util = require('../lib/util');

test('redondear2: ejemplos reales de factura (RN-01)', function () {
  // FA-2026-000101, linea del vaso: 0,44 x 21,60 = 9,504 -> 9,50 (db.js:130)
  assert.strictEqual(util.redondear2(9.504), 9.5);
  // IVA de esa base: 9,50 x 21/100 = 1,995 -> 2,00 (db.js:130)
  assert.strictEqual(util.redondear2(1.995), 2);
});

test('redondear2: cero, negativos y enteros', function () {
  assert.strictEqual(util.redondear2(0), 0);
  // CONGELA: -0 se preserva como -0 (Math.round(-0*100)/100 = -0). Ver A-21.
  assert.ok(Object.is(util.redondear2(-0), -0));
  assert.strictEqual(util.redondear2(100), 100);
  assert.strictEqual(util.redondear2(-100), -100);
});

// ---------------------------------------------------------------------------
// Bordes de coma flotante. AQUI el comportamiento contradice la doctrina
// "medio cent hacia arriba" (reglas-de-negocio.md RN-01) porque Math.round
// opera sobre x*100 en binario. Se congela la REALIDAD (ver A-21 en el
// registro de anomalias).
// ---------------------------------------------------------------------------
test('redondear2: el "medio hacia arriba" NO es universal (coma flotante)', function () {
  // 0,005 SI sube (0.005*100 = 0.5 exacto-ish -> Math.round da 1)
  assert.strictEqual(util.redondear2(0.005), 0.01);
  // 1,005 NO sube: 1.005*100 = 100.49999... en binario -> Math.round -> 100 -> 1,00
  assert.strictEqual(util.redondear2(1.005), 1);
  // 2,675 -> 2,68 (2.675*100 = 267.49999... pero Math.round da 268 aqui)
  assert.strictEqual(util.redondear2(2.675), 2.68);
  // 5,50 x 21/100 = 1,155 -> 1,16 (1.155*100 = 115.5 exacto -> sube).
  // OJO: este es el valor del MOTOR; el dato historico db.js:143 grabo 1,15 a mano.
  assert.strictEqual(util.redondear2(1.155), 1.16);
  // 658,80 x 4/100 = 26,3519... -> 26,35
  assert.strictEqual(util.redondear2(658.80 * 4 / 100), 26.35);
});

test('redondear2: negativos redondean hacia +infinito (Math.round)', function () {
  // La doc (H-1) ESPECULA que -9,505 daria -9,50 "hacia +inf". FALSO:
  // -9.505*100 = -950.4999... -> Math.round -> -950 -> -9,50 seria lo esperado,
  // pero el motor produce -9,51. Se congela lo REAL (ver A-21).
  assert.strictEqual(util.redondear2(-9.505), -9.51);
  assert.strictEqual(util.redondear2(-1.005), -1);
});

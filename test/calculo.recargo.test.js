// test/calculo.recargo.test.js
// Caracterizacion de recargoPara (services/calculo.js:12-23).
// Reglas: RN-06 (tabla vigente), RN-08 (tipos antiguos), RN-09 (desconocido -> 0).
// Congela el comportamiento actual, incluida la comparacion ESTRICTA (===).

var test = require('node:test');
var assert = require('node:assert');
var calc = require('../services/calculo');

test('recargoPara: tipos de IVA vigentes (RN-06)', function () {
  assert.strictEqual(calc.recargoPara(21), 5.2);
  assert.strictEqual(calc.recargoPara(10), 1.4);
  assert.strictEqual(calc.recargoPara(4), 0.5);
});

test('recargoPara: tipos de IVA antiguos conservados (RN-08)', function () {
  assert.strictEqual(calc.recargoPara(18), 4);
  assert.strictEqual(calc.recargoPara(16), 4);
  assert.strictEqual(calc.recargoPara(8), 1);
  assert.strictEqual(calc.recargoPara(7), 1);
});

test('recargoPara: tipo desconocido -> 0 (RN-09)', function () {
  assert.strictEqual(calc.recargoPara(5), 0);
  assert.strictEqual(calc.recargoPara(0), 0);
  assert.strictEqual(calc.recargoPara(25), 0);
});

// CONGELA comportamiento actual: la comparacion es === (estricta), asi que el
// tipo pasado como CADENA no matchea y cae en el 0 final. Anomalia A-16.
test('CONGELA comportamiento actual: recargoPara("21") -> 0 por comparacion estricta (A-16)', function () {
  assert.strictEqual(calc.recargoPara('21'), 0);
  assert.strictEqual(calc.recargoPara('10'), 0);
  assert.strictEqual(calc.recargoPara('4'), 0);
});

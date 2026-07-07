// test/util.formato.test.js
// Caracterizacion de formatearImporte (lib/util.js:51-58). Regla RN-21:
// formato español (miles con punto, decimales con coma, 2 decimales fijos).
// Congela el comportamiento actual, incluidos nulos, NaN y negativos.

var test = require('node:test');
var assert = require('node:assert');
var util = require('../lib/util');

test('formatearImporte: formato español con separador de miles (RN-21)', function () {
  assert.strictEqual(util.formatearImporte(1234.5), '1.234,50');
  assert.strictEqual(util.formatearImporte(9.5), '9,50');
  assert.strictEqual(util.formatearImporte(1000), '1.000,00');
  assert.strictEqual(util.formatearImporte(1234567.891), '1.234.567,89');
});

test('formatearImporte: importe negativo (rectificativa real RE-2026-000001)', function () {
  // total -122,23 grabado en db.js:160
  assert.strictEqual(util.formatearImporte(-122.23), '-122,23');
});

test('formatearImporte: nulos, undefined y no numericos -> "0,00"', function () {
  assert.strictEqual(util.formatearImporte(null), '0,00');
  assert.strictEqual(util.formatearImporte(undefined), '0,00');
  assert.strictEqual(util.formatearImporte('abc'), '0,00');
  assert.strictEqual(util.formatearImporte(NaN), '0,00');
});

test('formatearImporte: cero', function () {
  assert.strictEqual(util.formatearImporte(0), '0,00');
});

// CONGELA comportamiento actual: usa toFixed(2), que redondea DISTINTO de
// redondear2 (Math.round). -0,005 -> "-0,01" via toFixed. Ver A-21.
test('CONGELA comportamiento actual: formatearImporte usa toFixed, no redondear2 (A-21)', function () {
  assert.strictEqual(util.formatearImporte(-0.005), '-0,01');
});

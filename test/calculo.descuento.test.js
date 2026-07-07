// test/calculo.descuento.test.js
// Caracterizacion de porcentajeDescuento (services/calculo.js:39-43).
// Regla RN-04: descuento por volumen sobre la base bruta, umbral ESTRICTO (>).
// Congela los tres puntos por los dos lados de cada frontera (1.000 y 5.000).

var test = require('node:test');
var assert = require('node:assert');
var calc = require('../services/calculo');

test('porcentajeDescuento: frontera de 1.000 € (RN-04, umbral estricto)', function () {
  assert.strictEqual(calc.porcentajeDescuento(999.99), 0);   // justo debajo
  assert.strictEqual(calc.porcentajeDescuento(1000), 0);     // exacto -> NO descuenta
  assert.strictEqual(calc.porcentajeDescuento(1000.01), 2);  // justo encima
});

test('porcentajeDescuento: frontera de 5.000 € (RN-04, umbral estricto)', function () {
  assert.strictEqual(calc.porcentajeDescuento(4999.99), 2);  // justo debajo
  assert.strictEqual(calc.porcentajeDescuento(5000), 2);     // exacto -> sigue 2%
  assert.strictEqual(calc.porcentajeDescuento(5000.01), 5);  // justo encima
});

test('porcentajeDescuento: cero y negativos -> 0', function () {
  assert.strictEqual(calc.porcentajeDescuento(0), 0);
  assert.strictEqual(calc.porcentajeDescuento(-5), 0);
  assert.strictEqual(calc.porcentajeDescuento(500), 0);
});

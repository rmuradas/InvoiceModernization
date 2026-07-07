// test/calculo.linea.test.js
// Caracterizacion de calcularLinea (services/calculo.js:26-34).
// Regla RN-02: cada linea calcula base, cuotaIva y cuotaRecargo, TODO redondeado
// por linea. La cuota de IVA y de recargo se calculan sobre la base YA redondeada.

var test = require('node:test');
var assert = require('node:assert');
var calc = require('../services/calculo');

test('calcularLinea: linea real del vaso, sin recargo (FA-2026-000101, db.js:130)', function () {
  // 0,44 x 21,60 = 9,504 -> base 9,50; IVA 9,50x21/100 = 1,995 -> 2,00
  assert.deepStrictEqual(
    calc.calcularLinea(0.44, 21.60, 21, false),
    { base: 9.5, cuotaIva: 2, cuotaRecargo: 0 }
  );
});

test('calcularLinea: linea real con recargo (FA-2026-000102, db.js:133)', function () {
  // 4 x 18,50 = 74,00; IVA 15,54; recargo 74x5,2/100 = 3,848 -> 3,85
  assert.deepStrictEqual(
    calc.calcularLinea(4, 18.50, 21, true),
    { base: 74, cuotaIva: 15.54, cuotaRecargo: 3.85 }
  );
  // 28,90 al 21% con recargo: 28,90x5,2/100 = 1,5028 -> 1,50 (db.js:134)
  assert.deepStrictEqual(
    calc.calcularLinea(1, 28.90, 21, true),
    { base: 28.9, cuotaIva: 6.07, cuotaRecargo: 1.5 }
  );
});

test('calcularLinea: sin recargo, la cuota de recargo es 0 (RN-07)', function () {
  var r = calc.calcularLinea(4, 18.50, 21, false);
  assert.strictEqual(r.cuotaRecargo, 0);
});

test('calcularLinea: cantidad 0 y precio 0', function () {
  assert.deepStrictEqual(
    calc.calcularLinea(0, 21.60, 21, true),
    { base: 0, cuotaIva: 0, cuotaRecargo: 0 }
  );
  assert.deepStrictEqual(
    calc.calcularLinea(5, 0, 21, true),
    { base: 0, cuotaIva: 0, cuotaRecargo: 0 }
  );
});

test('calcularLinea: tipo de IVA desconocido calcula IVA pero recargo 0 (RN-09)', function () {
  // base 100 al 5%: IVA 5,00; recargo 0 (5 no esta en la tabla)
  assert.deepStrictEqual(
    calc.calcularLinea(1, 100, 5, true),
    { base: 100, cuotaIva: 5, cuotaRecargo: 0 }
  );
});

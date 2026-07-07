// test/calculo.factura.test.js
// Caracterizacion de calcularFactura (services/calculo.js:48-88).
// Reglas: RN-03 (totales suman lineas ya redondeadas), RN-04/05 (descuento por
// volumen linea a linea sobre el precio), RN-07 (recargo solo si cliente marcado).
// Congela el comportamiento actual con facturas reales de datos/gesfact.db.

var test = require('node:test');
var assert = require('node:assert');
var calc = require('../services/calculo');

test('calcularFactura: FA-2026-000102, cliente con recargo, 4 lineas (RN-03)', function () {
  var cliente = { recargo_equivalencia: 1 };
  var lineas = [
    { descripcion: 'Desengrasante cocinas 10L', cantidad: 4, precio: 18.50, tipoIva: 21 },
    { descripcion: 'Plato llano', cantidad: 1, precio: 28.90, tipoIva: 21 },
    { descripcion: 'Vaso caña', cantidad: 0.5, precio: 21.60, tipoIva: 21 },
    { descripcion: 'Portes', cantidad: 0.32, precio: 6.00, tipoIva: 21 }
  ];
  var r = calc.calcularFactura(lineas, cliente);
  // OJO (A-22): la cabecera grabada en db.js:132 dice base 115,60 / total 145,89,
  // pero la linea de Portes se grabo con base 1,90 a mano cuando 0,32 x 6,00 = 1,92.
  // El MOTOR de hoy produce base 115,62 / total 145,91. Congelamos EL MOTOR.
  assert.strictEqual(r.base, 115.62);
  assert.strictEqual(r.iva, 24.28);
  assert.strictEqual(r.recargo, 6.01);
  assert.strictEqual(r.total, 145.91);
  assert.strictEqual(r.descuentoPct, 0);
});

test('calcularFactura: cliente SIN recargo -> recargo total 0 (RN-07)', function () {
  var cliente = { recargo_equivalencia: 0 };
  var lineas = [{ descripcion: 'x', cantidad: 1, precio: 100, tipoIva: 21 }];
  var r = calc.calcularFactura(lineas, cliente);
  assert.strictEqual(r.recargo, 0);
  assert.strictEqual(r.base, 100);
  assert.strictEqual(r.iva, 21);
  assert.strictEqual(r.total, 121);
});

test('calcularFactura: cliente null se trata como sin recargo (RN-07)', function () {
  var lineas = [{ descripcion: 'x', cantidad: 1, precio: 100, tipoIva: 21 }];
  var r = calc.calcularFactura(lineas, null);
  assert.strictEqual(r.recargo, 0);
  assert.strictEqual(r.total, 121);
});

test('CONGELA comportamiento actual: recargo_equivalencia como cadena "1" SI activa recargo (== 1)', function () {
  // La comparacion es == 1 (no ===), asi que la cadena "1" tambien activa recargo.
  var r = calc.calcularFactura(
    [{ descripcion: 'x', cantidad: 2, precio: 50, tipoIva: 21 }],
    { recargo_equivalencia: '1' }
  );
  assert.strictEqual(r.recargo, 5.2);
  assert.strictEqual(r.total, 126.2);
});

test('calcularFactura: base bruta 1.000 justa NO lleva descuento (RN-04, borde estricto)', function () {
  // Base bruta EXACTAMENTE 1.000,00 (500 + 300 + 200): 1000 > 1000 es falso -> 0%.
  var cliente = { recargo_equivalencia: 0 };
  var lineas = [
    { descripcion: 'a', cantidad: 1, precio: 500.00, tipoIva: 21 },
    { descripcion: 'b', cantidad: 1, precio: 300.00, tipoIva: 21 },
    { descripcion: 'c', cantidad: 1, precio: 200.00, tipoIva: 21 }
  ];
  var r = calc.calcularFactura(lineas, cliente);
  assert.strictEqual(r.base, 1000);
  assert.strictEqual(r.descuentoPct, 0);   // 1000 > 1000 es falso
  assert.strictEqual(r.iva, 210);
  assert.strictEqual(r.total, 1210);
});

test('CONGELA comportamiento actual: A-22 la factura historica FA-2026-000103 NO es reproducible', function () {
  // Sus lineas reales (db.js:140-143) NO suman 1.000 bruto sino 1.000,02
  // (0,92 x 6,00 = 5,52, no 5,50 como se grabo a mano). Pasadas por el motor:
  // base bruta > 1.000 -> descuento 2% -> resultado TOTALMENTE distinto del
  // grabado (base 980,01 / dto 2%), no los 1.000 / 0% / 1.210 de la cabecera.
  var cliente = { recargo_equivalencia: 0 };
  var lineas = [
    { descripcion: 'Plato llano', cantidad: 20, precio: 28.90, tipoIva: 21 },
    { descripcion: 'Vaso caña', cantidad: 15, precio: 21.60, tipoIva: 21 },
    { descripcion: 'Desengrasante', cantidad: 5, precio: 18.50, tipoIva: 21 },
    { descripcion: 'Portes', cantidad: 0.92, precio: 6.00, tipoIva: 21 }
  ];
  var r = calc.calcularFactura(lineas, cliente);
  assert.strictEqual(r.descuentoPct, 2);   // el motor SI descuenta (1000,02 > 1000)
  assert.strictEqual(r.base, 980.01);      // no los 1.000 grabados en db.js:139
  assert.strictEqual(r.total, 1185.82);    // no los 1.210 grabados
});

test('calcularFactura: con descuento del 2%, aplicado linea a linea sobre el precio (RN-05)', function () {
  // 1 linea cant 10 x 120,00 = base bruta 1.200 > 1.000 -> dto 2%
  var cliente = { recargo_equivalencia: 0 };
  var lineas = [{ descripcion: 'x', cantidad: 10, precio: 120.00, tipoIva: 21 }];
  var r = calc.calcularFactura(lineas, cliente);
  assert.strictEqual(r.descuentoPct, 2);
  // precio con dto: 120 x 98/100 = 117,60; base 10 x 117,60 = 1.176,00
  assert.strictEqual(r.lineas[0].precio, 117.6);
  assert.strictEqual(r.base, 1176);
  assert.strictEqual(r.iva, 246.96);
  assert.strictEqual(r.total, 1422.96);
});

test('calcularFactura: factura vacia -> todo a 0', function () {
  var r = calc.calcularFactura([], { recargo_equivalencia: 0 });
  assert.deepStrictEqual(r, {
    lineas: [], base: 0, iva: 0, recargo: 0, total: 0, descuentoPct: 0
  });
});

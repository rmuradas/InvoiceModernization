// test/util.nif.test.js
// Caracterizacion de validarNIF (lib/util.js:44-48). Regla RN-20 / anomalia A-12:
// solo comprueba la LONGITUD (9 caracteres tras quitar espacios y guiones).
// Congela el comportamiento actual: NO valida la letra de control.

var test = require('node:test');
var assert = require('node:assert');
var util = require('../lib/util');

test('validarNIF: acepta cualquier cadena de 9 caracteres (RN-20)', function () {
  // NIF reales dudosos que HOY se aceptan (letra en minuscula, db.js:101 y :97)
  assert.strictEqual(util.validarNIF('70355910k'), true);
  assert.strictEqual(util.validarNIF('03488812K'), true);
  // Cadenas sin sentido de 9 caracteres: tambien pasan
  assert.strictEqual(util.validarNIF('123456789'), true);
  assert.strictEqual(util.validarNIF('XXXXXXXXX'), true);
});

test('validarNIF: rechaza longitudes distintas de 9', function () {
  assert.strictEqual(util.validarNIF('B4581239'), false);   // 8
  assert.strictEqual(util.validarNIF('12345678'), false);   // 8
  assert.strictEqual(util.validarNIF('1234567890'), false); // 10
});

test('validarNIF: vacio/nulo -> false', function () {
  assert.strictEqual(util.validarNIF(''), false);
  assert.strictEqual(util.validarNIF(null), false);
  assert.strictEqual(util.validarNIF(undefined), false);
});

test('validarNIF: quita espacios y guiones ANTES de contar', function () {
  // "12 345-678" -> "12345678" = 8 caracteres -> false
  assert.strictEqual(util.validarNIF('12 345-678'), false);
  // "123-456-789" -> "123456789" = 9 -> true
  assert.strictEqual(util.validarNIF('123-456-789'), true);
  assert.strictEqual(util.validarNIF('12345 6789'), true); // 9 tras quitar espacio
});

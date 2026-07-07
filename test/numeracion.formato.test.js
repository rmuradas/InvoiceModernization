// test/numeracion.formato.test.js
// Caracterizacion de formatear (lib/numeracion.js:38-42). Regla RN-16:
// numero de factura SERIE-AÑO-NNNNNN, secuencial acolchado a 6 digitos.
// Solo se congela la funcion PURA "formatear". siguienteNumero/reservar tocan
// la BD (contadores) y quedan FUERA de la red pura (ver LEEME del golden master).

var test = require('node:test');
var assert = require('node:assert');
var numeracion = require('../lib/numeracion');

test('formatear: formato SERIE-AÑO-NNNNNN con 6 digitos (RN-16)', function () {
  assert.strictEqual(numeracion.formatear('FA', 2026, 109), 'FA-2026-000109');
  assert.strictEqual(numeracion.formatear('FA', 2026, 1), 'FA-2026-000001');
  assert.strictEqual(numeracion.formatear('RE', 2026, 2), 'RE-2026-000002');
});

test('CONGELA comportamiento actual: mas de 6 digitos NO se trunca (RN-16, borde teorico)', function () {
  // 1.000.000 no cabe en 6 digitos: se imprime tal cual, con 7.
  assert.strictEqual(numeracion.formatear('FA', 2026, 1000000), 'FA-2026-1000000');
});

test('formatear: numero 0 -> 000000', function () {
  assert.strictEqual(numeracion.formatear('FA', 2026, 0), 'FA-2026-000000');
});

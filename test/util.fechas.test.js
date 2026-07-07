// test/util.fechas.test.js
// Caracterizacion de las funciones de fecha de lib/util.js:
//   hoy (10-15), sumarDias (20-26), fechaBonita (29-33), diasDelMes (36-39).
// Congela el comportamiento ACTUAL. Runner nativo node:test.
// Reglas: RN-18 (vencimiento = fecha + dias), y el hallazgo H-4/A-10 (sumarDias).

var test = require("node:test");
var assert = require("node:assert");
var util = require("../lib/util");

// --- sumarDias (RN-18) -------------------------------------------------------
test("sumarDias: vencimientos reales grabados en la BD (RN-18)", function () {
  // FA-2026-000104: fecha 2026-03-05 + 30 -> 2026-04-04 (db.js:145)
  assert.strictEqual(util.sumarDias("2026-03-05", 30), "2026-04-04");
  // FA-2026-000103: fecha 2026-02-20 + 60 -> 2026-04-21 (db.js:139)
  assert.strictEqual(util.sumarDias("2026-02-20", 60), "2026-04-21");
  // FA-2026-000101: fecha 2026-01-31 + 30 -> 2026-03-02 (db.js:126)
  assert.strictEqual(util.sumarDias("2026-01-31", 30), "2026-03-02");
});

test("sumarDias: fin de año, fin de mes y bisiesto", function () {
  assert.strictEqual(util.sumarDias("2026-12-31", 1), "2027-01-01");
  assert.strictEqual(util.sumarDias("2024-02-28", 1), "2024-02-29"); // bisiesto
  assert.strictEqual(util.sumarDias("2026-02-28", 1), "2026-03-01"); // no bisiesto
  assert.strictEqual(util.sumarDias("2026-03-31", 0), "2026-03-31"); // sumar 0
});

// H-4 / A-10: el desfase de un dia por cambio de hora NO se reproduce con estas
// entradas. Se congela que HOY produce la fecha correcta (frozen: sin desfase).
test("CONGELA comportamiento actual: sumarDias no muestra desfase reproducible (A-10)", function () {
  // Cambio de hora en España: ultimo domingo de marzo (2026-03-29).
  // Un intervalo que lo cruza sigue dando el dia natural correcto HOY.
  assert.strictEqual(util.sumarDias("2026-03-05", 30), "2026-04-04");
  assert.strictEqual(util.sumarDias("2026-03-28", 2), "2026-03-30");
});

// --- diasDelMes --------------------------------------------------------------
test("diasDelMes: 28/29/30/31 reales (usado por la remesa, RN-13)", function () {
  assert.strictEqual(util.diasDelMes("2026-01-15"), 31);
  assert.strictEqual(util.diasDelMes("2026-04-05"), 30);
  assert.strictEqual(util.diasDelMes("2026-12-31"), 31);
  assert.strictEqual(util.diasDelMes("2026-02-10"), 28); // febrero no bisiesto
  assert.strictEqual(util.diasDelMes("2024-02-10"), 29); // febrero bisiesto
  assert.strictEqual(util.diasDelMes("2000-02-01"), 29); // 2000 bisiesto (regla 400)
  assert.strictEqual(util.diasDelMes("1900-02-01"), 28); // 1900 NO bisiesto (regla 100)
});

// --- fechaBonita -------------------------------------------------------------
test('fechaBonita: YYYY-MM-DD -> DD/MM/YYYY; vacio -> ""', function () {
  assert.strictEqual(util.fechaBonita("2026-04-04"), "04/04/2026");
  assert.strictEqual(util.fechaBonita("2026-12-31"), "31/12/2026");
  assert.strictEqual(util.fechaBonita(""), "");
  assert.strictEqual(util.fechaBonita(null), "");
  assert.strictEqual(util.fechaBonita(undefined), "");
});

// --- hoy ---------------------------------------------------------------------
test("hoy: devuelve una cadena YYYY-MM-DD bien formada", function () {
  var s = util.hoy();
  assert.match(s, /^\d{4}-\d{2}-\d{2}$/);
});

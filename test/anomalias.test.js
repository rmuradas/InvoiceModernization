// test/anomalias.test.js
// Red de tests que CONGELA comportamientos anomalos EJECUTABLES del registro de
// anomalias (specs/000-reconocimiento/registro-de-anomalias.md). Cada test lleva
// el prefijo "CONGELA comportamiento actual:" y remite al ID de la anomalia.
//
// Regla de oro: el valor esperado es lo que el codigo PRODUCE HOY. Estas
// anomalias NO se corrigen en esta fase; se congelan para detectar cambios.

var test = require("node:test");
var assert = require("node:assert");
var calc = require("../services/calculo");
var util = require("../lib/util");

// --- A-15: prorrateo negativo a 0 en silencio; asume mismo mes --------------
test("CONGELA comportamiento actual: A-15 prorrateo negativo -> 0,00 € sin aviso", function () {
  assert.strictEqual(calc.calcularProrrateo(90, "2026-06-20", "2026-06-10"), 0);
});

test("CONGELA comportamiento actual: A-15 calcularProrrateo ignora el mes (solo el dia)", function () {
  // Mismo dia-desde y dia-hasta en meses distintos: da lo mismo que dentro del mes.
  assert.strictEqual(
    calc.calcularProrrateo(90, "2026-01-05", "2026-01-20"),
    calc.calcularProrrateo(90, "2026-03-05", "2026-08-20"),
  );
});

// --- A-16: IVA desconocido -> recargo 0 en silencio; === rechaza "21" -------
test("CONGELA comportamiento actual: A-16 IVA desconocido -> recargo 0 silencioso", function () {
  assert.strictEqual(calc.recargoPara(5), 0);
  assert.strictEqual(calc.recargoPara(25), 0);
});

test('CONGELA comportamiento actual: A-16 comparacion === rechaza el tipo como cadena "21"', function () {
  assert.strictEqual(calc.recargoPara("21"), 0); // aunque "sea" el 21
  assert.strictEqual(calc.recargoPara(21), 5.2); // el numero 21 si
});

// --- A-01: doble prorrateo divergente (ya congelado en calculo.prorrateo) ---
test("CONGELA comportamiento actual: A-01 las dos formulas de prorrateo divergen", function () {
  // (A) 30 fijos: 60/30*15 = 30,00
  var a = calc.calcularProrrateo(60, "2026-07-16", "2026-07-30");
  // (B) dias reales (julio 31): 60/31*15 = 29,03
  var diasMes = util.diasDelMes("2026-07-01");
  var b = util.redondear2((60 / diasMes) * 15);
  assert.strictEqual(a, 30);
  assert.strictEqual(b, 29.03);
  assert.notStrictEqual(a, b); // divergen: es la anomalia
});

// --- A-10: sumarDias, desfase NO reproducido --------------------------------
test("CONGELA comportamiento actual: A-10 sumarDias no reproduce el desfase de un dia", function () {
  // Cruza el cambio de hora de primavera (2026-03-29) sin perder el dia.
  assert.strictEqual(util.sumarDias("2026-03-05", 30), "2026-04-04");
});

// --- A-21 (NUEVA): la doctrina "medio cent hacia arriba" no es universal ----
// Descubierta ejecutando: redondear2 hereda los bordes de coma flotante de
// Math.round(x*100). Contradice reglas-de-negocio.md RN-01 y su matiz H-1.
test("CONGELA comportamiento actual: A-21 redondeo NO siempre sube el medio centimo", function () {
  assert.strictEqual(util.redondear2(0.005), 0.01); // sube
  assert.strictEqual(util.redondear2(1.005), 1); // NO sube (contra la doctrina)
});

test("CONGELA comportamiento actual: A-21 redondeo de negativos va hacia +infinito", function () {
  // La doc H-1 especula -9,505 -> -9,50; el codigo produce -9,51.
  assert.strictEqual(util.redondear2(-9.505), -9.51);
});

test("CONGELA comportamiento actual: A-21 formatearImporte redondea con toFixed, no con redondear2", function () {
  // toFixed(2) y Math.round pueden discrepar en el mismo valor.
  assert.strictEqual(util.formatearImporte(-0.005), "-0,01");
});

// --- A-22 (NUEVA): los datos historicos de db.js NO son reproducibles por el
// motor de hoy. Dos manifestaciones ejecutables:
//  (1) FA-2026-000103: sus lineas suman 1.000,02 bruto (0,92x6=5,52, no 5,50),
//      asi que el motor DESCUENTA 2% y da base 980,01 / total 1.185,82, no los
//      1.000 / 1.210 con descuento 0 grabados en db.js:139.
//  (2) FA-2026-000102: la linea de Portes se grabo con base 1,90 cuando
//      0,32x6=1,92, asi que el motor da total 145,91, no los 145,89 grabados.
test("CONGELA comportamiento actual: A-22 FA-2026-000103 no reproducible (descuenta 2%)", function () {
  var lineas = [
    { descripcion: "a", cantidad: 20, precio: 28.9, tipoIva: 21 },
    { descripcion: "b", cantidad: 15, precio: 21.6, tipoIva: 21 },
    { descripcion: "c", cantidad: 5, precio: 18.5, tipoIva: 21 },
    { descripcion: "d", cantidad: 0.92, precio: 6.0, tipoIva: 21 },
  ];
  var r = calc.calcularFactura(lineas, { recargo_equivalencia: 0 });
  assert.strictEqual(r.descuentoPct, 2); // db.js grabo 0
  assert.strictEqual(r.base, 980.01); // db.js grabo 1.000,00
  assert.strictEqual(r.total, 1185.82); // db.js grabo 1.210,00
});

test("CONGELA comportamiento actual: A-22 FA-2026-000102 no reproducible (portes 1,92 vs 1,90)", function () {
  var lineas = [
    { descripcion: "Desengrasante", cantidad: 4, precio: 18.5, tipoIva: 21 },
    { descripcion: "Plato", cantidad: 1, precio: 28.9, tipoIva: 21 },
    { descripcion: "Vaso", cantidad: 0.5, precio: 21.6, tipoIva: 21 },
    { descripcion: "Portes", cantidad: 0.32, precio: 6.0, tipoIva: 21 },
  ];
  var r = calc.calcularFactura(lineas, { recargo_equivalencia: 1 });
  assert.strictEqual(r.base, 115.62); // db.js:132 grabo 115,60
  assert.strictEqual(r.total, 145.91); // db.js:132 grabo 145,89
});

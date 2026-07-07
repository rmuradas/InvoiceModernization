// test/calculo.prorrateo.test.js
// Caracterizacion del PRORRATEO, que esta implementado DOS VECES con resultados
// distintos (contradiccion H-3 / anomalia A-01). Se congela CADA implementacion
// por separado, cada una con su resultado divergente:
//   (A) calcularProrrateo  -> mes de 30 dias FIJOS (services/calculo.js:95-102)
//   (B) remesa mensual     -> dias REALES del mes  (scripts/remesa_mensual.js:47-51)
//
// NOTA sobre A-01: el negocio decidio (acta D-01) que la formula oficial es (B),
// dias reales. PERO esta fase es "documentar y proteger": el codigo NO se cambia,
// asi que ambos calculos SIGUEN vivos y ambos se congelan tal cual estan HOY.

var test = require("node:test");
var assert = require("node:assert");
var calc = require("../services/calculo");
var util = require("../lib/util");

// ---------------------------------------------------------------------------
// (A) calcularProrrateo: mes de 30 dias fijos. Lo usa la baja de contrato.
// ---------------------------------------------------------------------------
test("calcularProrrateo (30 fijos): medio mes y mes completo (RN-10)", function () {
  assert.strictEqual(
    calc.calcularProrrateo(90, "2026-06-16", "2026-06-30"),
    45,
  ); // 15 dias
  assert.strictEqual(
    calc.calcularProrrateo(90, "2026-06-01", "2026-06-15"),
    45,
  ); // 15 dias
  assert.strictEqual(
    calc.calcularProrrateo(90, "2026-06-01", "2026-06-30"),
    90,
  ); // 30 dias
  assert.strictEqual(calc.calcularProrrateo(90, "2026-06-01", "2026-06-01"), 3); // 1 dia
});

test("CONGELA comportamiento actual: el dia 31 NO se cobra, se topa a 30 (RN-11, A-01)", function () {
  // Servicio 1-31 (31 dias naturales) en un mes de 31: se topa a 30 -> cuota entera.
  assert.strictEqual(
    calc.calcularProrrateo(90, "2026-07-01", "2026-07-31"),
    90,
  );
});

test("CONGELA comportamiento actual: prorrateo negativo se corta a 0 € en silencio (RN-12, A-15)", function () {
  // "desde" (20) posterior a "hasta" (10): dias = 10-20+1 = -9 -> 0 -> 0,00 €.
  // No hay aviso; se factura 0 silenciosamente. Ver A-15 (pendiente de ratificar).
  assert.strictEqual(calc.calcularProrrateo(90, "2026-06-20", "2026-06-10"), 0);
});

test("CONGELA comportamiento actual: calcularProrrateo solo mira el DIA (asume mismo mes, A-15)", function () {
  // Solo usa split("-")[2]. El mes de "desde"/"hasta" es IGNORADO: cruzar meses
  // da un calculo sin sentido pero sin error. 16 (dic) -> 15 (ene) = 15-16+1 = 0 dias.
  assert.strictEqual(calc.calcularProrrateo(90, "2025-12-16", "2026-01-15"), 0);
  // 5 (marzo) -> 20 (mayo) = 20-5+1 = 16 dias, ignora que son meses distintos.
  assert.strictEqual(
    calc.calcularProrrateo(90, "2026-03-05", "2026-05-20"),
    48,
  );
});

// ---------------------------------------------------------------------------
// (B) Prorrateo de la REMESA: dias reales del mes. Es la que factura de verdad.
// Reproducimos la formula inline de remesa_mensual.js:47-51 (no es funcion
// exportada) para congelar SU resultado, distinto del de (A).
// ---------------------------------------------------------------------------
function prorrateoRemesa(cuota, primerDia, diaDesde, diaHasta) {
  var diasMes = util.diasDelMes(primerDia);
  var diasServicio = diaHasta - diaDesde + 1;
  return util.redondear2((cuota / diasMes) * diasServicio);
}

test("prorrateo remesa (dias reales): mismo supuesto que (A) da DISTINTO (RN-13, A-01)", function () {
  // Cuota 60, servicio 16-30 en julio (31 dias): 60/31*15 = 29,032... -> 29,03
  assert.strictEqual(prorrateoRemesa(60, "2026-07-01", 16, 30), 29.03);
  // La formula (A) para el mismo caso da 30,00 -> divergencia de 0,97 € (A-01).
  assert.strictEqual(
    calc.calcularProrrateo(60, "2026-07-16", "2026-07-30"),
    30,
  );
});

test("prorrateo remesa (dias reales): mes de 31 completo pierde respecto a 30 fijos", function () {
  // Servicio 1-30 en julio (31 dias): 90/31*30 = 87,096... -> 87,10
  assert.strictEqual(prorrateoRemesa(90, "2026-07-01", 1, 30), 87.1);
  // (A) daria 90,00 para 1-30. Divergencia clara.
  assert.strictEqual(
    calc.calcularProrrateo(90, "2026-07-01", "2026-07-30"),
    90,
  );
});

test("prorrateo remesa (dias reales): febrero (28 dias) mes completo", function () {
  // 90/28*28 = 90,00
  assert.strictEqual(prorrateoRemesa(90, "2026-02-01", 1, 28), 90);
  // medio febrero: 60/28*14 = 30,00
  assert.strictEqual(prorrateoRemesa(60, "2026-02-01", 15, 28), 30);
});

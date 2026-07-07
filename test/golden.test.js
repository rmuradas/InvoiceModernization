// test/golden.test.js
// GOLDEN MASTER del flujo central de negocio (el calculo fiscal de la factura).
// Regenera la salida de los casos fijos (test/golden/casos.js) contra el codigo
// de produccion y la compara EN PROFUNDIDAD contra el master congelado
// (test/golden/factura-master.json), campo a campo.
//
// Si este test falla, el codigo de calculo ha CAMBIADO de comportamiento. NO se
// regenera el master para "arreglarlo": ver test/golden/LEEME.md (solo se
// regenera con decision de negocio documentada).

var test = require("node:test");
var assert = require("node:assert");
var fs = require("fs");
var gen = require("./golden/generar");

var master = JSON.parse(fs.readFileSync(gen.MASTER_PATH, "utf8"));
var actual = gen.generar();

// Compara recursivamente 'act' contra 'exp' acumulando la ruta exacta del campo.
function comparar(exp, act, ruta, fallos) {
  if (exp && typeof exp === "object" && act && typeof act === "object") {
    var claves = Object.keys(exp);
    Object.keys(act).forEach(function (k) {
      if (claves.indexOf(k) === -1) claves.push(k);
    });
    claves.forEach(function (k) {
      comparar(
        exp ? exp[k] : undefined,
        act ? act[k] : undefined,
        ruta ? ruta + "." + k : k,
        fallos,
      );
    });
  } else if (exp !== act) {
    fallos.push(
      "  " +
        ruta +
        ": master=" +
        JSON.stringify(exp) +
        "  actual=" +
        JSON.stringify(act),
    );
  }
}

test("golden master: la salida del calculo fiscal coincide campo a campo", function () {
  var fallos = [];
  // Recorre por caso para que el mensaje indique el ID exacto que rompe.
  var ids = Object.keys(master);
  Object.keys(actual).forEach(function (id) {
    if (ids.indexOf(id) === -1) ids.push(id);
  });
  ids.forEach(function (id) {
    comparar(master[id], actual[id], id, fallos);
  });

  assert.strictEqual(
    fallos.length,
    0,
    "\nEl calculo fiscal ha cambiado respecto al golden master. Campos divergentes:\n" +
      fallos.join("\n") +
      "\n\nSi el cambio NO esta autorizado por el negocio, es una regresion: revisa el codigo." +
      "\nSi SI lo esta, regenera el master segun test/golden/LEEME.md.\n",
  );
});

test("golden master: el conjunto de casos no ha cambiado (mismos IDs)", function () {
  assert.deepStrictEqual(
    Object.keys(actual).sort(),
    Object.keys(master).sort(),
    "Han cambiado los casos del golden master (casos.js). Regenera el master si es intencionado.",
  );
});

test("golden master: el fichero en disco esta serializado de forma estable", function () {
  // Garantiza que el master en disco es exactamente lo que produce el generador
  // (claves ordenadas, 2 espacios, salto final). Detecta ediciones a mano.
  var enDisco = fs.readFileSync(gen.MASTER_PATH, "utf8");
  var regenerado = gen.serializar(actual);
  assert.strictEqual(
    enDisco,
    regenerado,
    "El fichero factura-master.json no coincide con la serializacion estable.\n" +
      'No lo edites a mano: regenéralo con "node test/golden/generar.js" (ver LEEME.md).',
  );
});

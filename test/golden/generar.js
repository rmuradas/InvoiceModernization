// test/golden/generar.js
// Motor del GOLDEN MASTER: ejecuta el juego fijo de casos (casos.js) contra el
// codigo de produccion (services/calculo.js) y produce la salida COMPLETA, con
// todos los decimales y CLAVES ORDENADAS, en formato JSON estable.
//
// Se usa desde dos sitios:
//   - test/golden.test.js          -> regenera en memoria y compara con el master.
//   - node test/golden/generar.js  -> reescribe factura-master.json (SOLO con
//                                      decision de negocio documentada; ver LEEME.md).

var fs = require("fs");
var path = require("path");
var calc = require("../../services/calculo");
var casos = require("./casos");

var MASTER_PATH = path.join(__dirname, "factura-master.json");

// Ordena las claves de un objeto recursivamente, para que el JSON sea estable
// y el diff sea legible independientemente del orden de insercion.
function ordenar(x) {
  if (Array.isArray(x)) return x.map(ordenar);
  if (x && typeof x === "object") {
    var out = {};
    Object.keys(x)
      .sort()
      .forEach(function (k) {
        out[k] = ordenar(x[k]);
      });
    return out;
  }
  return x;
}

// Genera el objeto master completo a partir de los casos.
function generar() {
  var salida = {};
  casos.forEach(function (caso) {
    var r = calc.calcularFactura(caso.lineas, caso.cliente);
    salida[caso.id] = {
      descripcion: caso.descripcion,
      entrada: { cliente: caso.cliente, lineas: caso.lineas },
      salida: r,
    };
  });
  return ordenar(salida);
}

// Serializa de forma estable (2 espacios, salto final).
function serializar(obj) {
  return JSON.stringify(obj, null, 2) + "\n";
}

function escribirMaster() {
  fs.writeFileSync(MASTER_PATH, serializar(generar()));
}

module.exports = {
  MASTER_PATH: MASTER_PATH,
  generar: generar,
  serializar: serializar,
  escribirMaster: escribirMaster,
};

// Ejecutado directamente: reescribe el master en disco.
if (require.main === module) {
  escribirMaster();
  console.log("Golden master regenerado en " + MASTER_PATH);
}

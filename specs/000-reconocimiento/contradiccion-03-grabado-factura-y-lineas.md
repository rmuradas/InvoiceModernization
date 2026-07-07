# Contradicción 03 — "Grabar una factura y sus líneas" está implementado tres veces, con criterios distintos de orden e integridad

> Documento de **reconocimiento**. Duplicidad observada tal y como está hoy, con evidencia.
> No decide cuál es la correcta ni corrige nada (constitución). Va al registro de anomalías
> y al guion de entrevista.

## 1. Implementaciones implicadas

El concepto de negocio **"persistir una factura: primero la cabecera en `facturas`, luego
sus N líneas en `lineas`"** está escrito **tres veces**, en tres bloques de código copiados
y ligeramente distintos. No existe una función común de "grabar factura".

### Implementación A — alta manual (web), líneas **en paralelo**

Evidencia: [routes/facturas.js:74-99](../../routes/facturas.js#L74-L99).

```js
db.run('INSERT INTO facturas (...) VALUES (...)', [...], function (err3) {
  var facturaId = this.lastID;
  var pendientes = calc.lineas.length;
  var huboError = null;
  calc.lineas.forEach(function (l) {                 // lanza todos los INSERT a la vez
    db.run('INSERT INTO lineas (...) VALUES (...)', [...], function (e) {
      if (e) huboError = e;
      pendientes--;
      if (pendientes === 0) { /* email + redirect */ }
    });
  });
});
```

- Líneas insertadas con `forEach` → **todos los `INSERT` disparados en paralelo**.
- Sin transacción. Comentario explícito: *"si falla una a mitad ya se apañó en su día a mano
  en la BD"* ([routes/facturas.js:81-82](../../routes/facturas.js#L81-L82)).
- Al terminar (`pendientes === 0`) llama a `email.enviarFactura` y redirige.

### Implementación B — rectificativa (web), líneas **en paralelo** (copia de A)

Evidencia: [routes/facturas.js:141-159](../../routes/facturas.js#L141-L159).

```js
db.run('INSERT INTO facturas (...) VALUES (...)', [...], function (err4) {
  var rectId = this.lastID;
  var pendientes = lineas.length;
  lineas.forEach(function (l) {                      // mismo patrón que A
    db.run('INSERT INTO lineas (...) VALUES (...)', [...], function () {
      pendientes--;
      if (pendientes === 0) { /* UPDATE original a 'rectificada' + redirect */ }
    });
  });
});
```

- Mismo patrón `forEach`/`pendientes` que A, **también en paralelo**, sin transacción.
- **Diferencia con A:** el callback de línea **no captura el error** (`function () {}` sin
  parámetro `e`) — si un `INSERT` de línea falla, se ignora silenciosamente y aun así la
  original pasa a `rectificada`.

### Implementación C — remesa mensual (CLI), líneas **en secuencia**

Evidencia: [scripts/remesa_mensual.js:61-73](../../scripts/remesa_mensual.js#L61-L73).

```js
db.run('INSERT INTO facturas (...) VALUES (...)', [...], function (err4) {
  var fid = this.lastID;
  var l = calc.lineas[0];                            // SIEMPRE una sola línea
  db.run('INSERT INTO lineas (...) VALUES (...)', [...], function (err5) {
    if (err5) { console.error(err5); process.exit(1); }
    procesarSiguiente();                             // encadena la siguiente factura
  });
});
```

- **Secuencial**: una única línea por factura, y solo tras grabarla se procesa el siguiente
  contrato (recursión `procesarSiguiente`).
- **Integridad distinta:** si falla un `INSERT`, hace `process.exit(1)` — **aborta toda la
  remesa** en vez de "apañarlo a mano".

## 2. ¿Misma convención o algoritmo? Comparación paso a paso

| Aspecto | A (alta web) | B (rectificar) | C (remesa) |
|---------|--------------|----------------|------------|
| Nº de líneas | N (las del formulario) | N (las de la original) | siempre 1 |
| Orden de inserción de líneas | **paralelo** (`forEach`) | **paralelo** (`forEach`) | **secuencial** (1 sola) |
| ¿`id` de líneas conserva el orden? | **no garantizado** | **no garantizado** | trivial (1 línea) |
| Transacción | no | no | no |
| Manejo de error de línea | captura en `huboError`, responde HTTP 500 | **se ignora** (callback sin `e`) | `console.error` + `process.exit(1)` (aborta remesa) |
| Acción al terminar | email + redirect | `UPDATE` original a `rectificada` + redirect | siguiente factura |

Los tres persiguen lo mismo ("cabecera + líneas"), pero **ninguno comparte código** y cada
uno decide de forma distinta el **orden** y **qué pasa si algo falla**.

## 3. Ejemplos concretos donde divergen

### 3.1 Orden de las líneas en pantalla (A y B, paralelo)

`sqlite3` ejecuta los `db.run` en su cola y **los callbacks vuelven en el orden en que la
librería los completa, no necesariamente en el del `forEach`**. El `id` autoincremental se
asigna en el momento del `INSERT` efectivo. El detalle de factura las relee con
`ORDER BY id` ([routes/facturas.js:109](../../routes/facturas.js#L109)).

Ejemplo con la factura real `FA-2026-000102`, que tiene 4 líneas en este orden de
formulario ([db.js:132-136](../../db.js#L132-L136)):

```
1) Desengrasante cocinas 10L
2) Plato llano hostelería 25cm
3) Vaso caña 20cl
4) Portes y manipulación
```

Si esa misma factura se grabara hoy por el camino A (web), **el orden de las cuatro líneas
impresas podría no ser 1-2-3-4** sino cualquier permutación, porque los cuatro `INSERT`
compiten. En los datos históricos el orden está "bien" porque se insertaron con
`db.prepare` secuencial en `cargarDatosIniciales`, **no** por el camino de producción. Es
una divergencia **observable en la factura impresa** (cambia la posición de las líneas),
aunque los importes totales no varían.

> Ya registrado como **A2** en [flujo-factura.md §1.4](./flujo-factura.md). Se reconoce aquí
> como consecuencia directa de la duplicidad de código.

### 3.2 Error en una línea: tres desenlaces distintos para el mismo fallo

Supóngase que el `INSERT` de la **segunda** línea de una factura de 3 líneas falla (p. ej.
bloqueo momentáneo de la BD):

| Camino | Qué queda grabado | Qué ve el usuario |
|--------|-------------------|-------------------|
| A (web) | cabecera + líneas 1 y 3 (la 2 no); **la 2 se pierde** | HTTP 500 tras terminar las demás |
| B (rectificar) | cabecera rectificativa + líneas 1 y 3; **la original igualmente pasa a `rectificada`** | redirect normal, **sin aviso de error** |
| C (remesa) | (no aplica: 1 línea) pero un fallo aborta la remesa entera | traza en consola + código de salida 1 |

Para el **mismo tipo de fallo**, A deja una factura descuadrada y avisa, B deja una
rectificativa descuadrada **sin avisar** y marca la original como rectificada, y C detiene
todo el lote. Son tres políticas de integridad incompatibles para la misma operación.

## 4. Cuándo se manifiesta y cuándo coinciden (por qué nadie la ha detectado)

- La divergencia de **orden** (3.1) solo se ve si una factura tiene **≥ 2 líneas** y el
  planificador de sqlite altera el orden; en un equipo de oficina con poca concurrencia y BD
  local, los `INSERT` suelen completarse en orden de emisión casi siempre, así que
  **normalmente el orden sale bien** y nadie lo nota. C nunca la sufre (1 línea).
- La divergencia de **integridad** (3.2) solo se manifiesta cuando **falla un `INSERT`**,
  algo raro en SQLite local. El propio comentario de A admite que pasó "en su día" y se
  arregló a mano ([routes/facturas.js:81-82](../../routes/facturas.js#L81-L82)): es
  infrecuente, por eso convive.
- Los tres caminos **coinciden en el caso normal** (sin errores y con órdenes que salen en
  secuencia): la factura queda con su cabecera y sus líneas correctas. La duplicidad es
  invisible mientras nada falle.

## 5. Historia probable de cómo se llegó aquí

1. El patrón original es el de **`routes/facturas.js`**: Julián reconoce que el fichero
   "se ha ido haciendo grande, algún día habría que partirlo"
   ([routes/facturas.js:2-3](../../routes/facturas.js#L2-L3)). El alta manual (A) es el
   código más antiguo.
2. La **rectificativa (B)** se añadió después **copiando el bloque de A** (mismo
   `forEach`/`pendientes`), pero al copiar se perdió la captura de error del callback de
   línea (`function ()` en vez de `function (e)`), quizá porque en la rectificativa "no se
   recalcula nada" y se percibió como operación de bajo riesgo.
3. La **remesa (C)**, de Roberto en 2021, se escribió aparte como script CLI con estilo
   propio (secuencial, `process.exit`), sin reutilizar el bloque web —coherente con las
   otras reimplementaciones del mismo autor, ver [[contradiccion-01-prorrateo]] y
   [[contradiccion-02-vencimiento-por-defecto]].

Nunca se extrajo una función común "grabarFactura(cabecera, líneas, cb)" porque cada camino
nació en un momento distinto y el coste de unificar (con la restricción de no refactorizar)
nunca se pagó. El resultado es la misma regla de persistencia escrita tres veces con tres
criterios de orden e integridad.

## 6. Pregunta para el guion de entrevista

> Al grabar una factura con varias líneas, ¿importa el **orden** en que aparecen las líneas
> en la factura impresa? (Hoy el alta web no garantiza el orden.) Y si al grabar falla una
> línea, ¿qué debe pasar: rechazar la factura entera, grabarla incompleta y avisar, o
> grabarla incompleta en silencio? Hoy el sistema hace **las tres cosas** según el camino.

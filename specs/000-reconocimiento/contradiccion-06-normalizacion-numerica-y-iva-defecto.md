# Contradicción 06 — Normalización de números "a la española" y tipo de IVA por defecto, repetidos con criterios distintos

> Documento de **reconocimiento**. Duplicidad observada tal y como está hoy, con evidencia.
> No decide cuál es la correcta ni corrige nada (constitución). Va al registro de anomalías
> y al guion de entrevista.

Este documento recoge **dos duplicidades pequeñas pero reales** en la capa de entrada de
datos, ambas del tipo *"la misma transformación/validación escrita varias veces con criterios
que no coinciden del todo"*.

---

## Parte A — Normalización de importes con coma decimal (`parseFloat(('' + x).replace(',', '.'))`)

### A.1 Implementaciones implicadas

El concepto de negocio es **"admitir que el usuario teclee el importe con coma decimal
española (`12,50`) y convertirlo a número"**. Está escrito **tres veces**, idéntico, copiado
y pegado:

- Líneas de factura — cantidad y precio:
  [routes/facturas.js:59-60](../../routes/facturas.js#L59-L60)
  ```js
  cantidad: parseFloat(('' + cants[i]).replace(',', '.')),
  precio:   parseFloat(('' + precios[i]).replace(',', '.')),
  ```
- Cuota de contrato: [routes/contratos.js:19](../../routes/contratos.js#L19)
  ```js
  parseFloat(('' + req.body.cuota).replace(',', '.')),
  ```
- Precio de artículo: [routes/articulos.js:19](../../routes/articulos.js#L19)
  ```js
  parseFloat(('' + req.body.precio).replace(',', '.')),
  ```

**No existe** una función `util.parseImporte(x)` (o similar) en `lib/util.js`; cada ruta
repite la expresión. `lib/util.js` tiene el sentido contrario (`formatearImporte`, número →
texto español) pero **no** el de entrada (texto español → número).

### A.2 ¿Misma convención?

Las tres copias son **literalmente idénticas** hoy, así que **coinciden siempre**. La
"contradicción" es de **duplicación y fragilidad compartida**: los tres comparten el mismo
criterio incompleto.

Concretamente, `replace(',', '.')` **solo sustituye la primera coma**. Un usuario que teclee
un separador de miles a la española (`1.234,56`) obtiene:

```
'1.234,56'.replace(',', '.')  ->  '1.234.56'
parseFloat('1.234.56')        ->  1.234   (¡para en el segundo punto!)
```

Es decir, `1.234,56 €` se interpreta como **1,234 €**. Las tres copias tienen **exactamente
el mismo agujero**, porque son la misma línea copiada.

### A.3 Ejemplo concreto

Si en el alta de un artículo alguien escribe el precio como `1.234,56` (formato de miles
español, natural en importes grandes):

| Entrada tecleada | Resultado almacenado | ¿Correcto? |
|------------------|----------------------|-----------|
| `1234,56` | `1234.56` | sí |
| `1234.56` | `1234.56` | sí (punto ya decimal) |
| `1.234,56` | `1.234` → **1,234** | **NO**, se pierden 3 órdenes de magnitud |

Como las tres copias son iguales, el fallo se reproduce idéntico en factura, contrato y
artículo. **No divergen entre sí**; divergen todas por igual del comportamiento esperable.

### A.4 Por qué nadie lo ha detectado

- Los importes de esta empresa (material de hostelería, cuotas de alquiler) rara vez pasan de
  1.000 € en una sola línea/cuota, y quien los teclea (Marga) probablemente **no usa el punto
  de miles**, solo la coma decimal. Con `1234,56` funciona perfecto.
- Al ser copia literal, no hay divergencia **entre** los tres puntos que pudiera chirriar; el
  fallo solo aparece con un formato de entrada concreto que en la práctica no se usa.

---

## Parte B — Tipo de IVA por defecto: `config.IVA_DEFECTO` vs. literal `21`

### B.1 Implementaciones implicadas

El concepto **"qué IVA poner si el usuario no especifica uno"** se resuelve con **dos
fuentes distintas** según la pantalla:

- Alta de artículo → **usa configuración**,
  [routes/articulos.js:16](../../routes/articulos.js#L16):
  ```js
  var iva = req.body.tipo_iva ? parseInt(req.body.tipo_iva, 10) : config.IVA_DEFECTO;
  ```
  con `config.IVA_DEFECTO = 21` ([config.js:24-25](../../config.js#L24-L25)).
- Alta de contrato → **usa un literal `21`**,
  [routes/contratos.js:20](../../routes/contratos.js#L20):
  ```js
  parseInt(req.body.tipo_iva || 21, 10),
  ```
  Además la columna `contratos.tipo_iva` tiene `DEFAULT 21` en el esquema
  ([db.js:46](../../db.js#L46)) — un **tercer** sitio donde vive el "21".
- Líneas de factura → **no aplican defecto**: el IVA viene siempre del formulario/artículo
  ([routes/facturas.js:61](../../routes/facturas.js#L61)); si falta, `parseInt(undefined)` da
  `NaN` (caso aparte, no un "defecto").

### B.2 ¿Misma convención?

El **valor coincide hoy** (ambos 21), pero la **fuente no**: artículos es parametrizable
(`config.IVA_DEFECTO`), contratos es constante repetida (y duplicada además en el `DEFAULT`
del esquema). Es el mismo patrón que [[contradiccion-02-vencimiento-por-defecto]]: un defecto
que en un camino se lee de `config` y en otro está hardcodeado.

### B.3 Ejemplo donde divergen

Si el negocio decidiera que el IVA por defecto de la casa pasa a **10 %** y editara
`config.js` (`IVA_DEFECTO: 10`):

| Camino | IVA aplicado a un alta sin IVA explícito |
|--------|------------------------------------------|
| Nuevo **artículo** | **10** (lee config) |
| Nuevo **contrato** | **21** (literal `21` en el código, y `DEFAULT 21` en la tabla) |

**Divergencia: 21 vs. 10** para el mismo gesto (crear algo sin indicar IVA), según sea
artículo o contrato. El cambio de config solo alcanzaría a los artículos.

### B.4 Por qué nadie lo ha detectado

Igual que en [[contradiccion-02-vencimiento-por-defecto]]: **`IVA_DEFECTO` vale 21, el mismo
número hardcodeado en contratos**, así que mientras nadie toque la config los dos caminos son
indistinguibles. Y en la práctica quien da de alta un contrato **siempre** indica el IVA (es
un dato central de la cuota), con lo que el defecto casi nunca entra en juego.

---

## Historia probable (común a A y B)

1. `lib/util.js` centralizó la **salida** de importes (`formatearImporte`) pero nunca la
   **entrada**; cada formulario resolvió la conversión de coma decimal *inline* copiando la
   misma expresión. Al ser copia literal, se propagó también el fallo del punto de miles.
2. `config.IVA_DEFECTO` se creó como parámetro "de la casa" y el alta de artículos lo usa;
   pero contratos —y el propio esquema de la tabla— fijaron el 21 a mano, probablemente
   escritos en momentos distintos por manos distintas sin cruzar referencias.

Ninguna de las dos produce divergencias con los datos y usos actuales, pero ambas son "la
misma regla escrita varias veces" con fuentes que pueden separarse en cuanto se toque un
parámetro o se teclee un formato de número inhabitual.

## Preguntas para el guion de entrevista

> (a) ¿Se teclean alguna vez importes con separador de miles (`1.234,56`)? Hoy el sistema los
> interpretaría mal (los tres formularios por igual). ¿Es un caso real o nunca ocurre?
>
> (b) El IVA por defecto es parametrizable para artículos pero está fijado a 21 para
> contratos (y en el esquema de la BD). Si se cambiara el IVA por defecto de la casa, ¿debería
> afectar también a los contratos? (Hoy no.)

# Contradicción 04 — "Totalizar sumando importes" se hace con tres convenciones de redondeo distintas

> Documento de **reconocimiento**. Duplicidad observada tal y como está hoy, con evidencia.
> No decide cuál es la correcta ni corrige nada (constitución). Va al registro de anomalías
> y al guion de entrevista.

## 1. Implementaciones implicadas

La regla **sagrada** de la casa es *"redondeo línea a línea; los totales suman líneas ya
redondeadas"* ([services/calculo.js:1-7](../../services/calculo.js#L1-L7), aviso de Julián
mayo 2019: cambiarlo hizo que la gestoría devolviera el trimestre). Pero **la operación de
"sumar importes para dar un total" aparece en tres sitios con tres tratamientos de redondeo
distintos**.

### Implementación A — `calcularFactura`: suma re-redondeando en **cada** acumulación

Evidencia: [services/calculo.js:81-86](../../services/calculo.js#L81-L86).

```js
resultado.base    = util.redondear2(resultado.base    + c.base);
resultado.iva     = util.redondear2(resultado.iva     + c.cuotaIva);
resultado.recargo = util.redondear2(resultado.recargo + c.cuotaRecargo);
...
resultado.total   = util.redondear2(resultado.base + resultado.iva + resultado.recargo);
```

Cada término ya viene redondeado a 2 decimales por `calcularLinea`
([services/calculo.js:26-33](../../services/calculo.js#L26-L33)), **y además la suma
acumulada se vuelve a redondear en cada iteración**. Es la referencia canónica y la que
graba los importes de cabecera de cada factura.

También en la primera pasada, la `baseBruta` para decidir el descuento se re-redondea suma a
suma ([services/calculo.js:54-58](../../services/calculo.js#L54-L58)).

### Implementación B — informe de IVA: suma en JavaScript **sin redondear**, sobre sumas de SQL

Evidencia: [routes/informes.js:23-25](../../routes/informes.js#L23-L25) +
[views/informe_iva.ejs:5](../../views/informe_iva.ejs#L5).

En SQL se agrupa por tipo de IVA sumando las columnas ya redondeadas de `lineas`:

```sql
SELECT l.tipo_iva, SUM(l.base) AS base, SUM(l.cuota_iva) AS cuota,
       SUM(l.cuota_recargo) AS recargo
FROM lineas l JOIN facturas f ON f.id = l.factura_id
WHERE f.fecha >= ? AND f.fecha <= ? GROUP BY l.tipo_iva
```

Y el **total general** de la tabla se calcula **en la plantilla EJS**, acumulando en
JavaScript **sin ningún `redondear2`** ([views/informe_iva.ejs:5](../../views/informe_iva.ejs#L5)):

```js
var tb=0, ti=0, tr=0; filas.forEach(function(x){ tb+=x.base; ti+=x.cuota; tr+=x.recargo; });
```

Solo se redondea **al formatear para pantalla** con `util.formatearImporte`
([views/informe_iva.ejs:12-14](../../views/informe_iva.ejs#L12-L14)), que hace
`toFixed(2)` ([lib/util.js:51-57](../../lib/util.js#L51-L57)). Es decir: se suma en coma
flotante y se redondea **solo al final**, al pintar.

### Implementación C — exportación gestoría: **no totaliza**, formatea factura a factura

Evidencia: [routes/informes.js:42-45](../../routes/informes.js#L42-L45). El CSV escupe los
importes de cabecera de cada factura tal cual (`f.base`, `f.iva`, …) pasados por
`util.formatearImporte`, **sin sumar nada**. La gestoría hace sus propias sumas. Se incluye
como tercer tratamiento del mismo dato para dejar constancia de que aquí **no** hay
totalización interna.

## 2. ¿Misma convención? Comparación paso a paso

| Aspecto | A (`calcularFactura`) | B (informe IVA) | C (export CSV) |
|---------|-----------------------|-----------------|----------------|
| Nivel de agregación | por factura | por trimestre y tipo de IVA | por factura (sin agregar) |
| Fuente de los sumandos | líneas recién calculadas (redondeadas) | `SUM()` de SQL sobre `lineas.*` (redondeadas) | cabecera `facturas.*` |
| Redondeo intermedio | **sí, `redondear2` en cada suma** | **no** (acumulación en `Number` de JS) | no aplica |
| Redondeo final | `redondear2(total)` | solo `toFixed(2)` al formatear | `toFixed(2)` al formatear |

A y B parten del **mismo dato base** (importes de línea ya redondeados a 2 decimales) pero
**los agregan con reglas de redondeo distintas**: A re-redondea en cada paso; B no redondea
hasta el final.

## 3. ¿Divergen numéricamente? Análisis

Punto delicado: **sumar valores que ya tienen exactamente 2 decimales y redondear el
resultado a 2 decimales da el mismo número tanto si redondeas en cada paso como si redondeas
al final** — siempre que no intervenga el error binario de coma flotante. Es decir, para
importes "limpios" a céntimos, A y B **coinciden**.

La divergencia potencial de B es **puramente de coma flotante**: acumular muchos `Number`
con dos decimales puede arrastrar un epsilon (p. ej. `0.1 + 0.2 = 0.30000000000000004`) que,
justo en un valor a mitad de céntimo, haga que `toFixed(2)` caiga a un lado distinto del que
daría re-redondear paso a paso.

### Ejemplo con datos reales (informe IVA, 1T 2026)

Facturas del 1T 2026 (enero–marzo), líneas con `tipo_iva = 21` de las facturas
`FA-2026-000101..000105` ([db.js:126-154](../../db.js#L126-L154)). Sumando las
`cuota_iva` de las líneas al 21 %:

```
18.90 + 15.54 + 6.07 + 2.27 + 0.40 + 121.38 + 68.04 + 19.43 + 1.15
  + 30.45 + 242.76 + 3.61  = 530.00
```

Aquí `SUM()` de SQL y el `+=` de la plantilla dan `530.00` y coinciden con lo que daría A.
**No hay divergencia observable en estos datos**: los importes son limpios a céntimo y la
suma no cae en un medio-céntimo problemático.

**Conclusión honesta:** con los datos actuales A y B **no divergen**. La contradicción es de
**convención**, no (todavía) de resultado: B **incumple la regla sagrada** de "redondear en
cada suma" aunque hoy dé el mismo número. El riesgo es (a) un caso futuro donde el epsilon de
coma flotante desvíe un céntimo en el total del trimestre —justo el tipo de descuadre que en
2019 hizo devolver el trimestre— y (b) que el total del informe no está protegido por la
misma disciplina que el resto del sistema, así que **cualquier cambio futuro en cómo se suma
podría separarlos sin que salte ninguna alarma**.

## 4. Cuándo se manifiesta y cuándo coinciden

- **Coinciden** siempre que los sumandos sean importes exactos a céntimo (lo normal, porque
  vienen de columnas ya redondeadas) y la suma no arrastre error binario que caiga justo en
  el punto medio de redondeo. Es decir: **casi siempre**.
- **Podrían divergir** solo en el borde de coma flotante, y por **como mucho 1 céntimo** en
  el total del trimestre. Nadie lo ha detectado porque (1) el caso es rarísimo, (2) el total
  del informe lo **revisa la gestoría a mano** antes del modelo 303
  ([views/informe_iva.ejs:16](../../views/informe_iva.ejs#L16)) y un céntimo se cuadra sin
  levantar acta, y (3) los datos reales hasta hoy no lo han disparado.

## 5. Historia probable de cómo se llegó aquí

1. La regla de redondeo línea a línea se blindó en `calculo.js` en **mayo 2019** tras el
   incidente de la gestoría ([services/calculo.js:1-7](../../services/calculo.js#L1-L7)).
   Esa disciplina vive **solo dentro de `calculo.js`**.
2. Los **informes se añadieron en la v2.3 (2019)** ([server.js:5](../../server.js#L5)). El
   total del informe de IVA se resolvió "a lo rápido" **en la propia plantilla** con un
   acumulador JS, sin pasar por `calculo.js` ni por `redondear2`, seguramente porque quien
   escribió la vista pensó "son importes ya redondeados, sumarlos es inofensivo" —cierto en
   la práctica, pero salta la disciplina que tanto costó imponer.
3. Como el resultado coincide con los datos reales, nunca hubo un síntoma que obligara a
   unificar el criterio.

Que el total del informe **deba** seguir la misma regla de redondeo que las facturas, o baste
con redondear al formatear, es una **decisión de negocio/gestoría**, no técnica.

## 6. Pregunta para el guion de entrevista

> El total del informe de IVA del trimestre se calcula sumando en coma flotante y redondeando
> solo al mostrarlo, **no** con la regla de "redondear en cada suma" que rige las facturas.
> Hoy da el mismo número, pero podría desviarse un céntimo en un caso límite. ¿Debe el total
> del informe seguir exactamente la misma aritmética de redondeo que las facturas que la
> gestoría reconcilia?

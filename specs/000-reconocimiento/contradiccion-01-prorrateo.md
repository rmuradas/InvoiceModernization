# Contradicción 01 — El prorrateo de cuotas de contrato está implementado dos veces con algoritmos distintos

> Documento de **reconocimiento**. Describe una duplicidad observada en el sistema **tal y
> como está hoy**, con evidencia (`fichero:líneas`). **No** decide cuál es la correcta ni
> corrige nada: eso es decisión escrita del negocio (constitución del proyecto). Terminará
> como entrada del registro de anomalías y como pregunta del guion de entrevista.

## 1. Implementaciones implicadas

Hay **dos** cálculos del prorrateo de una cuota mensual de contrato, escritos en sitios
distintos, con **algoritmos diferentes**, y **cada camino de negocio usa uno distinto**.

### Implementación A — `services/calculo.js:calcularProrrateo` (mes fijo de 30 días)

Evidencia: [services/calculo.js:95-102](../../services/calculo.js#L95-L102).

```js
function calcularProrrateo(cuota, desde, hasta) {
  var d1 = parseInt(desde.split('-')[2], 10);
  var d2 = parseInt(hasta.split('-')[2], 10);
  var dias = d2 - d1 + 1;
  if (dias > 30) dias = 30; // meses de 31: el dia 31 no se cobra
  if (dias < 0) dias = 0;
  return util.redondear2(cuota / 30 * dias);
}
```

- Denominador **fijo = 30** ("mes comercial").
- Tope `dias > 30 → 30` ("el día 31 no se cobra").
- **Quién la usa:** la pantalla de **baja de contrato** desde la web,
  `POST /contratos/:id/baja` — [routes/contratos.js:31-43](../../routes/contratos.js#L31-L43),
  concretamente [routes/contratos.js:39](../../routes/contratos.js#L39):

  ```js
  var primeroDeMes = fechaBaja.slice(0, 8) + '01';
  var importe = calculo.calcularProrrateo(contrato.cuota, primeroDeMes, fechaBaja);
  res.redirect('/contratos?prorrateo=' + importe.toFixed(2));
  ```

  Ese importe **se le muestra a administración** en la barra de direcciones y, según el
  propio código y la vista, **administración emite después la factura a mano** con ese
  número ([routes/contratos.js:28-30](../../routes/contratos.js#L28-L30),
  [views/contratos.ejs:17](../../views/contratos.ejs#L17)).

### Implementación B — cálculo inline en `scripts/remesa_mensual.js` (días reales del mes)

Evidencia: [scripts/remesa_mensual.js:45-51](../../scripts/remesa_mensual.js#L45-L51).

```js
var desde = co.fecha_alta > primerDia ? co.fecha_alta : primerDia;
var hasta = (co.fecha_baja && co.fecha_baja < ultimoDia) ? co.fecha_baja : ultimoDia;
var diasMes = util.diasDelMes(primerDia);          // 28 / 29 / 30 / 31 REALES
var d1 = parseInt(desde.split('-')[2], 10);
var d2 = parseInt(hasta.split('-')[2], 10);
var diasServicio = d2 - d1 + 1;
var importe = util.redondear2(co.cuota / diasMes * diasServicio);
```

- Denominador **variable = días reales del mes** (`util.diasDelMes`,
  [lib/util.js:36-39](../../lib/util.js#L36-L39)): 28, 29, 30 o 31.
- **Sin** tope de 30 días.
- **Quién la usa:** la **remesa mensual automática**, `node scripts/remesa_mensual.js
  YYYY-MM`, que es **la que factura de verdad las cuotas de todos los contratos cada mes**
  ([scripts/remesa_mensual.js:51-55](../../scripts/remesa_mensual.js#L51-L55)). El importe
  prorrateado se mete como `precio` de la única línea y de ahí sale la factura real grabada
  en BD.

> **Nota clave:** `calcularProrrateo` (implementación A) está exportada
> ([services/calculo.js:109](../../services/calculo.js#L109)) y **el único consumidor en
> todo el código de producción es la baja de contrato**. La remesa **no la llama**:
> reimplementa el prorrateo por su cuenta. Verificado por búsqueda de `calcularProrrateo`
> en `routes/`, `scripts/` y `services/` (única referencia externa: `routes/contratos.js`).

## 2. ¿Misma convención o algoritmo? Comparación paso a paso

| Paso | A (`calcularProrrateo`) | B (inline remesa) |
|------|-------------------------|-------------------|
| Días de servicio | `d2 - d1 + 1` sobre los días de mes | `d2 - d1 + 1` (idéntico) |
| Denominador | **30 fijo** | **`diasDelMes` real (28/29/30/31)** |
| Tope superior | `dias > 30 → 30` (día 31 no se cobra) | **ninguno**: si hay 31 días de servicio se dividen entre 31 y se cobran los 31 |
| Guarda inferior | `dias < 0 → 0` | ninguna |
| Recorte de rango | ninguno: usa `desde`/`hasta` tal cual | recorta `desde`/`hasta` a `[primerDia, ultimoDia]` del mes antes de contar |
| Redondeo | `redondear2(cuota / 30 * dias)` | `redondear2(cuota / diasMes * diasServicio)` |

Coinciden en la **forma** (`cuota / N * dias`, redondeo a 2 decimales línea a línea) pero
**difieren en `N`** (30 vs. días reales) y en el **tope del día 31**. Son, por tanto, dos
convenciones de "mes comercial" distintas: A es *mes de 30 días de verdad*; B es *mes
natural completo*.

## 3. Ejemplos concretos donde divergen (con datos reales de producción)

Los contratos vienen de los datos iniciales, [db.js:115-120](../../db.js#L115-L120):

- Contrato 1: *Alquiler máquina de café Futurmat F3*, cuota **90,00 €**, alta 2024-03-01,
  sin baja (cliente 1).
- Contrato 3: *Alquiler lavavasos barra piscina*, cuota **60,00 €**, alta 2025-06-16, baja
  **2025-09-15** (cliente 5).

### Ejemplo 3.1 — Baja el día 15 de un mes de 31 días (contrato del lavavasos)

El lavavasos se dio de baja el **2025-09-15** (septiembre, 30 días). Pero planteemos su mes
de alta, **junio 2025 (30 días)**, y variantes en meses de otra longitud para aislar la
divergencia. Cuota 60,00 €, servicio del día 1 al 15 (15 días):

| Mes (días) | A: `60/30*15` | B: `60/diasMes*15` | Divergencia |
|------------|---------------|--------------------|-------------|
| Febrero (28) | `30.00` | `60/28*15 = 32.142… → 32,14` | **+2,14 €** en B |
| Abril (30) | `30.00` | `60/30*15 = 30.00` | 0 (coinciden) |
| Marzo (31) | `30.00` | `60/31*15 = 29.032… → 29,03` | **−0,97 €** en B |

### Ejemplo 3.2 — Mes completo de 31 días (contrato de café, cuota 90 €)

Alta 2024-03-01, mes marzo (31 días), servicio del 1 al 31:

- **A** (`calcularProrrateo(90, '2024-03-01', '2024-03-31')`): `dias = 31 → tope 30`,
  resultado `90/30*30 = 90,00`.
- **B** (remesa marzo): `diasServicio = 31`, `diasMes = 31`, resultado `90/31*31 = 90,00`.

Coinciden en el importe final del mes completo (ambos dan la cuota íntegra), **pero por
caminos distintos**: A porque capa a 30 días, B porque 31/31 = 1. La coincidencia es
casual y solo ocurre en el mes **completo**.

### Ejemplo 3.3 — Mes de 31 días con servicio hasta el día 31 (baja el 31)

Cuota 90 €, servicio del 1 al 31 de un mes de 31 días **pero contado como prorrateo
parcial** (p. ej. si se diera de baja el 31):

- **A**: `dias = 31 → 30`, `90/30*30 = 90,00`. El día 31 **no se cobra** (regla explícita).
- **B**: `diasServicio = 31`, `90/31*31 = 90,00`. El día 31 **sí entra** en el reparto.

Mismo total, pero la **doctrina** difiere: para A el día 31 es gratis; para B no existe el
concepto. Diverge en cuanto el servicio **no** llega al día 31: p. ej. servicio del 1 al 30
en un mes de 31 días → A: `90/30*30 = 90,00`; B: `90/31*30 = 87.096… → 87,10`. **Divergencia
de 2,90 € en la cuota completa aparente** aunque falte un solo día.

### Cuantificación general

Para una cuota `C` y `d` días de servicio en un mes de `M` días:

```
A = C/30 * min(d,30)
B = C/M  * d
```

La divergencia es **cero solo si `M = 30`** (o en el mes completo por el doble efecto del
tope). En febrero puede llegar a **~7 %** de la parte prorrateada (`30/28 − 1`), y en meses
de 31 días a **~−3 %** (`30/31 − 1`).

## 4. Cuándo se manifiesta y cuándo coinciden (por qué nadie la ha detectado)

**Coinciden exactamente cuando:**
- El mes tiene **30 días** (abril, junio, septiembre, noviembre): `M = 30`, mismo resultado
  siempre.
- Es un **mes completo** (`d = M`): ambos devuelven la cuota íntegra `C`, aunque por
  mecanismos distintos (tope de 30 en A, `M/M=1` en B). **Este es el caso normal**: la
  inmensa mayoría de las remesas mensuales facturan meses completos, donde B da la cuota
  entera y A también daría la cuota entera. La divergencia **solo aparece en el prorrateo
  parcial** (alta o baja a mitad de mes).

**Divergen cuando** coinciden estas dos condiciones a la vez:
1. El mes **no** tiene 30 días (febrero, o los siete meses de 31 días), **y**
2. Hay **prorrateo parcial** (alta o baja intramensual), no mes completo.

Además, **los dos importes casi nunca se comparan entre sí**, porque cada uno vive en un
flujo distinto:
- El de **A** (baja de contrato) se muestra en pantalla para que administración **emita la
  factura a mano** — es un número orientativo que teclea una persona.
- El de **B** (remesa) se graba directamente en la factura automática.

El punto de fricción real es la **secuencia baja + remesa del mismo mes**: si un contrato se
da de baja a mitad de un mes de 31 días, la pantalla de baja sugiere el importe con **A**
(30 días), pero si ese mes se factura por la **remesa** el importe saldría con **B** (31
días) — y son distintos. Que no haya saltado es coherente con que las bajas parciales son
raras y con que la factura de la baja se hace **a mano** copiando el número de pantalla, de
modo que el resultado de A "gana" para esa factura concreta sin que nadie compare con lo que
habría dado B.

> **SUPOSICIÓN (a preguntar al negocio):** que la factura de baja se emite a mano con el
> número de la pantalla de contratos y **no** por la remesa. Lo sugieren
> [routes/contratos.js:28-30](../../routes/contratos.js#L28-L30) y
> [views/contratos.ejs:17](../../views/contratos.ejs#L17), pero no está verificado con
> administración. Si en algún mes la remesa **también** genera la cuota del contrato dado de
> baja, podría haber además una **doble facturación** (independiente de esta contradicción).

## 5. Historia probable de cómo se llegó aquí

Reconstrucción a partir de comentarios, autoría y cronología:

1. **`calcularProrrateo` (A) es lo "antiguo y canónico".** Vive en `services/calculo.js`,
   *el corazón fiscal*, junto al resto de reglas sagradas, y su comentario describe la
   doctrina de la casa: *"el mes son siempre 30 días… así lo hacía Paco a mano en el Access
   y así lo espera la gestoría"* ([services/calculo.js:90-94](../../services/calculo.js#L90-L94)).
   Es la traducción a código de cómo prorrateaba Paco históricamente. La pantalla de baja de
   contrato la consume, que es el uso para el que se escribió.
2. **La remesa (B) la añadió Roberto, el becario, en verano de 2021**, "para no meter las
   cuotas a mano cada mes" ([scripts/remesa_mensual.js:1-7](../../scripts/remesa_mensual.js#L1-L7)).
   Es código nuevo, con estilo propio (variables `diasMes`, `diasServicio`, su propio
   `nombreMes`), escrito por alguien que probablemente **no sabía que `calcularProrrateo` ya
   existía** en `calculo.js`, o que la miró y decidió (sin dejarlo escrito) que "el mes son
   los días que tenga el mes". Reimplementó el prorrateo con `util.diasDelMes` en vez de
   reutilizar la función del corazón fiscal.
3. **La divergencia quedó latente** porque la remesa factura casi siempre meses completos
   (donde ambos coinciden) y porque los dos números viven en flujos separados que rara vez
   se cruzan. El propio `CLAUDE.md` y el `flujo-factura.md` ya la habían olido ("son dos
   cálculos distintos"), pero nunca se cuantificó ni se llevó a decisión del negocio.

En resumen: A es la regla de negocio explícita (mes comercial de 30, día 31 gratis); B es
una reimplementación pragmática *ad hoc* del becario que usa el mes natural. Cuál de las dos
es la que la gestoría considera correcta para una cuota prorrateada **es una pregunta de
negocio**, no técnica.

## 6. Pregunta para el guion de entrevista

> Cuando un contrato se da de alta o de baja a mitad de un mes que **no** tiene 30 días
> (febrero, o un mes de 31), ¿el importe prorrateado debe calcularse sobre **30 días fijos**
> (como hace la pantalla de baja de contrato y como prorrateaba Paco) o sobre los **días
> reales del mes** (como hace la remesa mensual que factura de verdad)? ¿Y el día 31 se cobra
> o no? Hoy el sistema responde **las dos cosas a la vez** según por dónde salga la factura.

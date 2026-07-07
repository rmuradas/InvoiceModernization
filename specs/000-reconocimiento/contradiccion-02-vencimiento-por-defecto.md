# Contradicción 02 — "Días de pago por defecto" está escrito de dos formas: `config.VENCIMIENTO_DIAS` vs. un `30` hardcodeado

> Documento de **reconocimiento**. Duplicidad observada tal y como está hoy, con evidencia.
> No decide cuál es la correcta ni corrige nada (constitución). Va al registro de anomalías
> y al guion de entrevista.

## 1. Implementaciones implicadas

El mismo concepto de negocio —**"cuántos días de vencimiento tiene una factura si el cliente
no tiene una forma de pago propia"**— se resuelve en dos sitios que **no comparten la misma
fuente del número por defecto**.

### Implementación A — alta manual de factura (web): usa `config.VENCIMIENTO_DIAS`

Evidencia: [routes/facturas.js:68-69](../../routes/facturas.js#L68-L69).

```js
var dias = cliente.dias_pago || config.VENCIMIENTO_DIAS;
var vencimiento = util.sumarDias(fecha, dias);
```

El valor por defecto se lee de configuración,
[config.js:39-40](../../config.js#L39-L40):

```js
// dias de vencimiento por defecto si el cliente no tiene forma de pago
VENCIMIENTO_DIAS: 30
```

### Implementación B — remesa mensual (CLI): usa un literal `30`

Evidencia: [scripts/remesa_mensual.js:60](../../scripts/remesa_mensual.js#L60).

```js
var venc = util.sumarDias(fecha, co.dias_pago || 30);
```

Aquí el "30" está **escrito a mano en el código** del script; **no** lee
`config.VENCIMIENTO_DIAS`. El script sí importa `util`, `calculo`, `db` y `numeracion`,
pero **no importa `config`** ([scripts/remesa_mensual.js:9-12](../../scripts/remesa_mensual.js#L9-L12)),
así que no tiene forma de ver el valor de configuración aunque quisiera.

> Un tercer camino, la **rectificativa**, no entra en esta contradicción: una rectificativa
> nace con `vencimiento = null` (no vence), [routes/facturas.js:142](../../routes/facturas.js#L142).

## 2. ¿Misma convención o algoritmo? Comparación paso a paso

| Paso | A (alta web) | B (remesa) |
|------|--------------|------------|
| Prioridad 1 | `cliente.dias_pago` si existe | `co.dias_pago` si existe (mismo dato del cliente vía JOIN) |
| Valor por defecto | `config.VENCIMIENTO_DIAS` | literal `30` |
| Fecha base | `req.body.fecha || util.hoy()` | `ultimoDia` del mes |
| Suma | `util.sumarDias(fecha, dias)` | `util.sumarDias(fecha, dias)` (idéntica) |

El **algoritmo es idéntico** (`sumarDias(fecha, dias_pago || DEFECTO)`), y **hoy los dos
valores por defecto coinciden numéricamente** porque `config.VENCIMIENTO_DIAS` vale
justamente `30` ([config.js:40](../../config.js#L40)). La diferencia es de **fuente del
número**, no de resultado: uno es parametrizable, el otro es una constante repetida.

## 3. Ejemplo concreto donde divergen

Con la configuración actual **no divergen**: ambos usan 30. La divergencia aparece **en
cuanto alguien cambie `config.VENCIMIENTO_DIAS`**, que es exactamente el gesto que la
existencia de ese parámetro invita a hacer.

Supóngase que el negocio decide que el vencimiento por defecto pasa a **60 días** y edita
`config.js`:

```js
VENCIMIENTO_DIAS: 60
```

Cliente **1** (Cafetería La Parada) tiene `dias_pago = NULL`
([db.js:96](../../db.js#L96)), así que usa el defecto en ambos caminos. Su contrato de café
factura el 2026-05-31 ([db.js:168](../../db.js#L168), factura real `FA-2026-000108`):

| Camino | Fecha factura | Días aplicados | Vencimiento resultante |
|--------|---------------|----------------|------------------------|
| A: alta manual de una factura a ese cliente el 2026-05-31 | 2026-05-31 | **60** (config) | 2026-07-30 |
| B: remesa de mayo para ese contrato | 2026-05-31 | **30** (literal) | 2026-06-30 |

**Divergencia: un mes entero de vencimiento** para el mismo cliente sin forma de pago, según
la factura la teclee una persona en la web o la genere la remesa. El cambio de config se
aplicaría solo a la mitad del sistema.

Los clientes **con** `dias_pago` explícito (p. ej. cliente 3 y 5 con 60 días,
[db.js:98,100](../../db.js#L98-L100)) **no** se ven afectados: ahí ambos caminos toman el
valor del cliente y coinciden. La divergencia se limita a los clientes con `dias_pago =
NULL` (clientes 1, 2, 4, 6 en los datos de ejemplo).

## 4. Cuándo se manifiesta y cuándo coinciden (por qué nadie la ha detectado)

**Coinciden hoy** porque `config.VENCIMIENTO_DIAS === 30`, el mismo número que está
hardcodeado en la remesa. Mientras nadie toque la config, los dos caminos son
indistinguibles y **no hay síntoma observable**.

**Divergirían** solo si:
1. Se modifica `config.VENCIMIENTO_DIAS` a un valor ≠ 30, **y**
2. Se factura (por cualquiera de los dos caminos) a un cliente con `dias_pago = NULL`.

Por eso está latente: es una **bomba de relojería de configuración**. El parámetro existe,
está documentado con un comentario que anima a usarlo ("días de vencimiento por defecto si
el cliente no tiene forma de pago"), pero **la remesa lo ignora**. Nadie lo ha notado porque
seguramente **nunca se ha cambiado el valor** desde que se creó.

## 5. Historia probable de cómo se llegó aquí

1. `VENCIMIENTO_DIAS` se definió en `config.js` como parámetro "correcto", junto al resto de
   configuración de empresa, pensado para el alta manual (v2.x, el flujo web original).
2. Cuando **Roberto (becario) añadió la remesa en 2021**
   ([scripts/remesa_mensual.js:6-7](../../scripts/remesa_mensual.js#L6-L7)), escribió el
   fallback como `co.dias_pago || 30` copiando el número "de memoria" en vez de importar
   `config` y leer `config.VENCIMIENTO_DIAS`. Encaja con el patrón del mismo autor en
   [[contradiccion-01-prorrateo]]: reimplementó *inline* lo que la aplicación ya tenía
   parametrizado, sin conectar con la infraestructura existente (el script ni siquiera
   `require('../config')`).
3. Como el valor coincidía (30 = 30), el atajo nunca produjo un número distinto y quedó
   fosilizado.

## 6. Pregunta para el guion de entrevista

> El "vencimiento por defecto de 30 días" está en un sitio configurable (`config.js`) para
> el alta manual, pero la remesa mensual lo tiene escrito a mano. Si el negocio decidiera
> cambiar ese plazo por defecto, ¿debe afectar **también** a las cuotas de contrato que
> genera la remesa? (Hoy no: solo cambiaría el alta manual.)

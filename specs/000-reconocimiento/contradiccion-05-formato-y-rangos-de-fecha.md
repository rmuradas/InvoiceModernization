# Contradicción 05 — Presentación y manejo de fechas: lógica repartida entre `lib/util.js`, scripts y rutas

> Documento de **reconocimiento**. Duplicidad observada tal y como está hoy, con evidencia.
> No decide cuál es la correcta ni corrige nada (constitución). Va al registro de anomalías
> y al guion de entrevista.
>
> **Aviso de honestidad:** esta es la contradicción **más leve** del lote. Aquí NO hay dos
> implementaciones del mismo cálculo dando números distintos como en
> [[contradiccion-01-prorrateo]]. Lo que hay es **lógica de fechas viviendo fuera del módulo
> que centraliza las fechas**, con criterios de construcción de rangos que no cuadran entre
> sí. Se documenta porque el encargo pide localizar *"lógica inline en scripts que
> reimplementa cosas que ya existen"* y *"validaciones que se repiten con criterios
> diferentes"*.

## 1. Implementaciones implicadas

`lib/util.js` es el módulo declarado como hogar del **formateo y cálculo de fechas**:
`hoy`, `sumarDias`, `fechaBonita`, `diasDelMes`
([lib/util.js:9-39](../../lib/util.js#L9-L39)). Sin embargo, hay lógica de fechas escrita
**fuera** de él, con dos síntomas distintos.

### Síntoma A — `nombreMes`: nombre de mes en castellano definido en un script, no en `util`

Evidencia: [scripts/remesa_mensual.js:80-84](../../scripts/remesa_mensual.js#L80-L84).

```js
function nombreMes(m) {
  var nombres = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  return nombres[parseInt(m.split('-')[1], 10) - 1] + ' ' + m.split('-')[0];
}
```

Convierte `"2026-06"` en `"junio 2026"`. Es lógica de **presentación de fechas en
castellano** —exactamente la familia de `fechaBonita`— pero vive en el script de remesa,
**no** en `lib/util.js`. Hoy **no hay duplicación literal** (nadie más define `nombreMes`),
pero sí hay **dispersión**: el mismo tipo de responsabilidad (formatear fechas para humanos)
está en dos módulos.

### Síntoma B — construcción de rangos de mes/trimestre con criterios distintos

El concepto **"primer y último día de un periodo"** se resuelve de tres formas:

1. **Remesa (mes):** `primerDia = mes + '-01'`; `ultimoDia = mes + '-' +
   util.diasDelMes(mes + '-01')` — usa los **días reales** del mes
   ([scripts/remesa_mensual.js:20-21](../../scripts/remesa_mensual.js#L20-L21)).
2. **Baja de contrato (mes):** `primeroDeMes = fechaBaja.slice(0, 8) + '01'` — troceo de
   string por posición, **sin** usar `diasDelMes` ni ninguna función de `util`
   ([routes/contratos.js:38](../../routes/contratos.js#L38)).
3. **Informe de IVA (trimestre):** `desde = anyo+'-MM-01'`; `hasta = anyo+'-MM-31'` — el fin
   de trimestre se fija **siempre a `-31`**, exista o no ese día
   ([routes/informes.js:17-19](../../routes/informes.js#L17-L19)).

## 2. Comparación paso a paso

| Operación | Remesa | Baja contrato | Informe IVA |
|-----------|--------|---------------|-------------|
| Primer día del periodo | `mes+'-01'` | `fechaBaja.slice(0,8)+'01'` | `anyo+'-MM-01'` |
| Último día del periodo | `diasDelMes(...)` **real** | (no lo calcula) | **`-31` fijo** |
| ¿Usa `lib/util`? | sí (`diasDelMes`) | no (troceo manual) | no (literal `31`) |
| Nombre de mes | `nombreMes` propio | — | — |

Coinciden todos en el formato de string `YYYY-MM-DD`, pero el **último día** se obtiene de
tres maneras: días reales (remesa), no se calcula (baja), o `31` siempre (informe).

## 3. ¿Divergen? Ejemplos concretos

### 3.1 El `-31` fijo del informe de IVA (síntoma B.3)

El filtro del informe es `WHERE f.fecha >= desde AND f.fecha <= hasta`
([routes/informes.js:23-25](../../routes/informes.js#L23-L25)) con `hasta = anyo+'-MM-31'`.
Para el **1T** `hasta = '2026-03-31'`; para el **2T** `hasta = '2026-06-31'`.

**`2026-06-31` no existe** (junio tiene 30 días). Como la comparación es **textual** sobre
strings `YYYY-MM-DD` en SQLite, la cadena `'2026-06-31'` es **lexicográficamente mayor** que
cualquier fecha real de junio (`'2026-06-30' < '2026-06-31'`), así que el filtro **sí captura
todo junio** por accidente afortunado. Igual para el 4T con `'2026-12-31'` (que sí existe) y
el 1T con `'2026-03-31'` (existe).

- **Coincide con lo correcto** para 1T (marzo tiene 31) y 4T (diciembre tiene 31).
- Para **2T** (`-06-31` inexistente) y **3T** (`-09-31` inexistente) **funciona igual** solo
  porque la comparación es de texto y `'...-31'` ordena después de `'...-30'`.

**Divergiría** si alguna vez la comparación dejara de ser puramente textual (p. ej. si se
migrara a un tipo `DATE` real o a otra BD —recordemos que existe un volcado de migración a
MySQL pendiente, [db.js:2-4](../../db.js#L2-L4)). En MySQL, `f.fecha <= '2026-06-31'` sobre
una columna `DATE` podría comportarse distinto (fecha inválida). Hoy, sobre SQLite con fechas
como texto, **no hay síntoma**.

### 3.2 `nombreMes` (síntoma A)

No produce ningún resultado incorrecto hoy; es correcto y coincide con lo que haría cualquier
otra implementación. La "divergencia" es de **mantenibilidad**: si mañana se quisiera el mes
con mayúscula inicial o abreviado en toda la aplicación, habría que recordar que existe esta
copia escondida en el script.

## 4. Cuándo se manifiesta y cuándo coinciden (por qué nadie lo ha detectado)

- El `-31` fijo **nunca ha fallado** porque SQLite compara fechas como texto y `'…-31'`
  siempre ordena al final del mes. Es un bug latente que **el motor de BD tapa**. Coincide
  con lo correcto en todos los trimestres precisamente por esa propiedad textual.
- `nombreMes` **nunca ha divergido** porque solo hay una copia y es correcta; el problema es
  de ubicación, no de resultado.

Por eso ninguno de los dos ha dado la cara: uno está protegido por un detalle del motor, el
otro simplemente no tiene un gemelo con quien discrepar (todavía).

## 5. Historia probable de cómo se llegó aquí

1. `lib/util.js` arrastra funciones "del gesfact 1.x en Access"
   ([lib/util.js:1-2](../../lib/util.js#L1-L2)); es un cajón de sastre de utilidades de
   fecha/importe que ha crecido por acumulación.
2. Los **informes (v2.3, 2019)** resolvieron el rango de trimestre con el atajo `-31` fijo,
   sabiendo (o descubriendo) que "con texto cuela". Nadie lo pasó por `diasDelMes` porque
   funcionaba.
3. La **remesa (2021, Roberto)** necesitaba el nombre del mes en castellano para el concepto
   y las observaciones de la factura, y como `lib/util.js` no lo ofrecía, se escribió
   `nombreMes` **dentro del script**. Coherente con el patrón del mismo autor de resolver las
   cosas *inline* en vez de ampliar los módulos compartidos (ver
   [[contradiccion-01-prorrateo]], [[contradiccion-02-vencimiento-por-defecto]]).
4. La **baja de contrato** trocea el string a mano (`slice(0,8)+'01'`) en vez de usar util,
   otro atajo local más.

Ninguno es un error de cálculo; son cuatro maneras distintas de tocar fechas que deberían
pasar por un único sitio y no lo hacen.

## 6. Preguntas para el guion de entrevista

> (a) El informe de IVA construye el fin de trimestre como `-31` siempre (`2026-06-31`,
> `2026-09-31`), fechas que no existen; hoy funciona solo porque la BD compara fechas como
> texto. ¿Se da por bueno ese comportamiento o el rango del trimestre debería usar el último
> día real del mes?
>
> (b) (menor, mantenibilidad) ¿Hay inconveniente del negocio en que el nombre del mes en
> castellano y el cálculo de rangos de fecha estén repartidos entre el script de remesa, las
> rutas y `lib/util.js`, en vez de centralizados? (No cambia ningún importe; es organización
> del código.)

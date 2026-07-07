# Ciclo de vida de una factura en GesFact 2.4

> Documento de **reconocimiento**. Describe lo que el sistema **hace hoy**, siguiendo el
> código paso a paso, con evidencia (`fichero:líneas`) en cada afirmación. No propone
> cambios. Cualquier comportamiento dudoso se marca como **ANOMALÍA** o **SUPOSICIÓN**,
> no se corrige (constitución del proyecto).

## 0. Resumen de los tres caminos de creación

Existen exactamente **tres** caminos que crean filas en la tabla `facturas`. Se ha
comprobado buscando quién hace `INSERT INTO facturas`:

| # | Camino | Punto de entrada | Serie | Evidencia |
|---|--------|------------------|-------|-----------|
| 1 | Alta manual desde la web | `POST /facturas/nueva` | `FA` | [routes/facturas.js:42-102](../../routes/facturas.js#L42-L102) |
| 2 | Remesa mensual de contratos | CLI `node scripts/remesa_mensual.js YYYY-MM` | `FA` | [scripts/remesa_mensual.js:61-63](../../scripts/remesa_mensual.js#L61-L63) |
| 3 | Rectificación (abono total) | `POST /facturas/:id/rectificar` | `RE` | [routes/facturas.js:129-164](../../routes/facturas.js#L129-L164) |

(Un cuarto `INSERT INTO facturas` existe en `db.js:cargarDatosIniciales`, pero es la
carga de datos de ejemplo/históricos al crear la BD vacía, no un camino de negocio —
[db.js:123-166](../../db.js#L123-L166).)

Los estados posibles de una factura son `emitida` → `cobrada` → `rectificada`
([db.js:61](../../db.js#L61)). Ver §5.

---

## 1. Camino 1 — Alta manual desde la web

### 1.1 Entradas
El formulario `POST /facturas/nueva` recibe ([routes/facturas.js:41-53](../../routes/facturas.js#L41-L53)):

- `cliente_id` (entero, [línea 43](../../routes/facturas.js#L43)).
- `fecha` (opcional; si falta se usa `util.hoy()`, [línea 44](../../routes/facturas.js#L44)).
- `obs` (observaciones, [línea 76](../../routes/facturas.js#L76)).
- Cuatro arrays paralelos de líneas: `desc[]`, `cant[]`, `precio[]`, `iva[]`
  ([líneas 50-53](../../routes/facturas.js#L50-L53)).

El formulario que los produce es [views/factura_nueva.ejs] y se sirve por
`GET /facturas/nueva` ([routes/facturas.js:30-38](../../routes/facturas.js#L30-L38)),
que solo carga clientes y artículos activos para rellenar los desplegables.

### 1.2 Módulos que atraviesa, en orden

1. **`routes/facturas.js`** valida el cliente: `SELECT * FROM clientes WHERE id = ?`;
   si hay error o no existe → HTTP 400 ([líneas 46-47](../../routes/facturas.js#L46-L47)).
2. **`routes/facturas.js`** monta las líneas: normaliza `cantidad` y `precio` con
   `parseFloat(('' + x).replace(',', '.'))` (admite coma decimal) y `tipoIva` con
   `parseInt` ([líneas 55-63](../../routes/facturas.js#L55-L63)). Descarta filas sin
   descripción ([línea 56](../../routes/facturas.js#L56)). Si no queda ninguna línea →
   HTTP 400 ([línea 64](../../routes/facturas.js#L64)).
3. **`services/calculo.js` → `calcularFactura(lineas, cliente)`** hace toda la aritmética
   ([línea 66](../../routes/facturas.js#L66)). Detalle en §4.
4. **`lib/util.js` → `sumarDias(fecha, dias)`** calcula el vencimiento. `dias =
   cliente.dias_pago || config.VENCIMIENTO_DIAS` (30 por defecto)
   ([líneas 68-69](../../routes/facturas.js#L68-L69), [lib/util.js:20-26](../../lib/util.js#L20-L26)).
5. **`lib/numeracion.js` → `siguienteNumero('FA', cb)`** reserva el número
   ([línea 71](../../routes/facturas.js#L71)). Detalle en §3.
6. **`db`** graba cabecera y líneas (§1.4).
7. **`services/email.js` → `enviarFactura(...)`** que hoy solo hace `console.log`
   (correo fuera de servicio desde 2022) y luego redirige a `/facturas/:id`
   ([líneas 93-95](../../routes/facturas.js#L93-L95), [services/email.js:11-29](../../services/email.js#L11-L29)).

### 1.3 Cálculos aplicados
Todos vía `calculo.calcularFactura` (§4). Incluye redondeo línea a línea, descuento por
volumen y recargo de equivalencia si el cliente lo tiene.

### 1.4 Qué se graba, en qué tablas y en qué orden

1. **`facturas`** (cabecera), un `INSERT` con
   `numero, serie='FA', cliente_id, fecha, vencimiento, base, iva, recargo, total,
   estado='emitida', observaciones` ([líneas 74-76](../../routes/facturas.js#L74-L76)).
   `this.lastID` da el `facturaId` ([línea 79](../../routes/facturas.js#L79)).
   - En `observaciones` se concatena, si hubo descuento, el texto
     ` Descuento volumen N% aplicado` ([línea 76](../../routes/facturas.js#L76)).
2. **`lineas`**, un `INSERT` **por cada línea** de `calc.lineas`, en un `forEach` con
   contador `pendientes`; cuando llega a cero se dispara el email y el redirect
   ([líneas 83-98](../../routes/facturas.js#L83-L98)). Cada línea guarda `base`,
   `cuota_iva` y `cuota_recargo` **ya redondeadas** ([db.js:72-74](../../db.js#L72-L74)).

> **ANOMALÍA (ya conocida en el código):** las líneas se insertan sin transacción; el
> propio comentario admite que "si falla una a mitad ya se apañó en su día a mano en la
> BD" ([routes/facturas.js:81-82](../../routes/facturas.js#L81-L82)). La cabecera queda
> grabada aunque falle una línea.

> **ANOMALÍA (orden de líneas):** el `forEach` lanza los `INSERT` en paralelo (callbacks
> asíncronos de sqlite3); el orden final de `id` en la tabla `lineas` no está garantizado
> que coincida con el orden del formulario. El detalle luego las lee con `ORDER BY id`
> ([routes/facturas.js:109](../../routes/facturas.js#L109)).

### 1.5 Estado resultante
`emitida` ([línea 75](../../routes/facturas.js#L75)).

---

## 2. Camino 2 — Remesa mensual de contratos (CLI)

### 2.1 Entradas
`node scripts/remesa_mensual.js YYYY-MM`. El único argumento es el mes; se valida con
regex `^\d{4}-\d{2}$` ([scripts/remesa_mensual.js:14-18](../../scripts/remesa_mensual.js#L14-L18)).
Se derivan `primerDia = mes+'-01'` y `ultimoDia = mes+'-'+util.diasDelMes(...)`
([líneas 20-21](../../scripts/remesa_mensual.js#L20-L21)).

### 2.2 Módulos que atraviesa, en orden

1. **`db.inicializar(cb)`** — abre/crea la BD antes de nada
   ([línea 23](../../scripts/remesa_mensual.js#L23)).
2. **`db`** — selecciona los contratos vigentes en el mes con `JOIN clientes`, filtrando
   `fecha_alta <= ultimoDia AND (fecha_baja IS NULL OR fecha_baja >= primerDia)`
   ([líneas 26-29](../../scripts/remesa_mensual.js#L26-L29)). Trae también
   `nombre, recargo_equivalencia, dias_pago` del cliente.
3. Procesa los contratos **de uno en uno, secuencialmente**, con la función recursiva
   `procesarSiguiente()` (a diferencia del camino 1, aquí no hay paralelismo)
   ([líneas 33-76](../../scripts/remesa_mensual.js#L33-L76)).
4. Para cada contrato calcula el **importe prorrateado** (§2.3), monta **una sola línea**
   ([línea 54](../../scripts/remesa_mensual.js#L54)) y llama a
   **`calculo.calcularFactura`** ([línea 55](../../scripts/remesa_mensual.js#L55)).
5. **`numeracion.siguienteNumero('FA', cb)`** ([línea 57](../../scripts/remesa_mensual.js#L57)).
6. **`db`** graba cabecera y su única línea (§2.4).

### 2.3 Cálculos aplicados — prorrateo (¡ojo, aquí está la divergencia clave!)

El importe del mes se prorratea **inline dentro del script**, NO con
`calculo.calcularProrrateo` ([líneas 45-51](../../scripts/remesa_mensual.js#L45-L51)):

```
desde = fecha_alta si cae dentro del mes, si no primerDia
hasta = fecha_baja si cae dentro del mes, si no ultimoDia
diasMes = util.diasDelMes(primerDia)         // 28/29/30/31 REALES
diasServicio = d2 - d1 + 1
importe = redondear2(cuota / diasMes * diasServicio)
```

Ese `importe` se mete como `precio` de la única línea, con `cantidad = 1` y
`tipoIva = co.tipo_iva` ([línea 54](../../scripts/remesa_mensual.js#L54)), y sobre esa
línea `calcularFactura` aplica IVA, descuento y recargo (§4).

Sufijo del concepto: ` (N dias)` si hay prorrateo parcial, o ` (mes año)` si es mes
completo ([línea 53](../../scripts/remesa_mensual.js#L53)).

Vencimiento: `fecha = ultimoDia`; `venc = util.sumarDias(fecha, co.dias_pago || 30)`
([líneas 59-60](../../scripts/remesa_mensual.js#L59-L60)).

### 2.4 Qué se graba, en qué tablas y en qué orden
1. **`facturas`**: `numero, serie='FA', cliente_id, fecha=ultimoDia, venc, base, iva,
   recargo, total, estado='emitida', observaciones='Remesa <mes año>'`
   ([líneas 61-62](../../scripts/remesa_mensual.js#L61-L62)).
2. **`lineas`**: **una sola** línea (`calc.lineas[0]`)
   ([líneas 66-68](../../scripts/remesa_mensual.js#L66-L68)). Solo tras grabarla se llama
   a `procesarSiguiente()` ([línea 72](../../scripts/remesa_mensual.js#L72)).

Evidencia de datos reales: `FA-2026-000108`, obs `Remesa mayo`, es una factura de este
camino y tiene 3 líneas porque en los datos históricos se grabó a mano con más de una
línea; el script genera **1 línea por contrato** ([db.js:168-171](../../db.js#L168-L171)
frente a la lógica del script).

### 2.5 Estado resultante
`emitida` ([línea 62](../../scripts/remesa_mensual.js#L62)). No hay envío de email en
este camino (el script no importa `services/email`).

---

## 3. Obtención del número de factura (común a los caminos 1 y 3; el 2 usa el mismo módulo)

`lib/numeracion.js:siguienteNumero(serie, cb)`
([lib/numeracion.js:14-42](../../lib/numeracion.js#L14-L42)):

1. `anyo = new Date().getFullYear()` — **año del reloj del servidor**, no de la fecha de
   la factura ([línea 15](../../lib/numeracion.js#L15)).
2. `SELECT ultimo FROM contadores WHERE serie=? AND anyo=?` ([línea 16](../../lib/numeracion.js#L16)).
3. Si no hay fila (serie/año nuevos): `INSERT ... ultimo=0` y luego `reservar(...,0)`
   ([líneas 18-23](../../lib/numeracion.js#L18-L23)).
4. `reservar`: `nuevo = ultimo + 1`; `UPDATE contadores SET ultimo=nuevo`; devuelve
   `formatear(serie, anyo, nuevo)` ([líneas 30-36](../../lib/numeracion.js#L30-L36)).
5. `formatear`: `SERIE-AÑO-NNNNNN` (6 dígitos con ceros a la izquierda),
   p. ej. `FA-2026-000109` ([líneas 38-42](../../lib/numeracion.js#L38-L42)).

Contadores iniciales en los datos de ejemplo: `FA/2026 = 108`, `RE/2026 = 1`
([db.js:176-177](../../db.js#L176-L177)).

> **ANOMALÍA (ya conocida, firmada por Julián 01/2021):** la reserva NO es atómica (lee y
> luego escribe en dos operaciones separadas). Dos altas simultáneas pueden dar el mismo
> número ([lib/numeracion.js:8-10, 30-32](../../lib/numeracion.js#L8-L10)). El requisito
> legal es numeración correlativa sin huecos ([líneas 3-6](../../lib/numeracion.js#L3-L6)).

> **SUPOSICIÓN:** usar el año del reloj (paso 1) implica que una remesa lanzada en enero
> para facturar diciembre del año anterior numeraría en la serie del año nuevo. No
> verificado con el negocio; se anota como pregunta.

---

## 4. El cálculo fiscal: `services/calculo.js:calcularFactura`

Función común a los caminos 1 y 2 ([services/calculo.js:48-88](../../services/calculo.js#L48-L88)).
El camino 3 **NO** la usa (ver §5).

1. `conRecargo = cliente.recargo_equivalencia == 1` ([línea 49](../../services/calculo.js#L49)).
2. **Primera pasada**: calcula la `baseBruta` sumando la base de cada línea, **cada una ya
   redondeada** vía `calcularLinea`, y **la suma también se redondea** en cada iteración
   ([líneas 54-58](../../services/calculo.js#L54-L58)).
3. `dto = porcentajeDescuento(baseBruta)`: `>5000 → 5%`, `>1000 → 2%`, resto `0`.
   Comparación estricta `>` (1.000 justo NO descuenta)
   ([líneas 39-43, 60](../../services/calculo.js#L39-L43)). Confirmado por el dato real
   `FA-2026-000103` con base `1000.00` y sin descuento ([db.js:138-139](../../db.js#L138-L139)).
4. **Segunda pasada**: aplica el descuento **línea a línea sobre el precio**
   (`precioConDto = redondear2(precio * (100-dto)/100)`), recalcula la línea con
   `calcularLinea` y acumula `base`, `iva`, `recargo` — **todos redondeados en cada suma**
   ([líneas 65-84](../../services/calculo.js#L65-L84)).
5. `total = redondear2(base + iva + recargo)` ([línea 86](../../services/calculo.js#L86)).

`calcularLinea(cantidad, precio, tipoIva, conRecargo)`
([líneas 26-34](../../services/calculo.js#L26-L34)):
- `base = redondear2(cantidad * precio)`
- `cuotaIva = redondear2(base * tipoIva / 100)`
- `cuotaRecargo = redondear2(base * recargoPara(tipoIva) / 100)` si `conRecargo`

`recargoPara`: 21→5,2; 10→1,4; 4→0,5; y tipos antiguos 18/16→4; 8/7→1
([líneas 12-23](../../services/calculo.js#L12-L23)).

**Regla sagrada:** redondeo línea a línea; los totales suman líneas ya redondeadas.
Aviso en cabecera del fichero, Julián mayo 2019, cambiarlo hizo que la gestoría devolviera
el trimestre ([services/calculo.js:1-7](../../services/calculo.js#L1-L7)).

---

## 5. Camino 3 — Rectificación (abono total)

### 5.1 Entradas
`POST /facturas/:id/rectificar`; opcionalmente `motivo` en el cuerpo
([routes/facturas.js:129-143](../../routes/facturas.js#L129-L143)).

### 5.2 Guardas previas
- `SELECT ... FROM facturas ... WHERE f.id=?`; si no existe → 404 ([líneas 130-131](../../routes/facturas.js#L130-L131)).
- Si `estado === 'rectificada'` → 400 "Ya esta rectificada" ([línea 132](../../routes/facturas.js#L132)).
- Si `serie === 'RE'` → 400 "No se rectifica una rectificativa" ([línea 133](../../routes/facturas.js#L133)).

### 5.3 Módulos y orden
1. **`db`** lee la cabecera y luego `SELECT * FROM lineas WHERE factura_id=?`
   ([líneas 130-135](../../routes/facturas.js#L130-L135)).
2. **`numeracion.siguienteNumero('RE', cb)`** ([línea 138](../../routes/facturas.js#L138)).
3. **`db`** graba cabecera rectificativa y líneas espejo (§5.5).
4. **`db`** actualiza la original a `rectificada` ([línea 154](../../routes/facturas.js#L154)).

### 5.4 Cálculos: **NO hay recálculo, se invierten los signos**
La cabecera se graba con `-f.base, -f.iva, -f.recargo, -f.total` tomados **directamente de
la factura original** ([línea 142](../../routes/facturas.js#L142)). Las líneas se copian
invirtiendo `cantidad`, `base`, `cuota_iva`, `cuota_recargo` (el `precio` se mantiene en
positivo) y prefijando la descripción con `Rectificación: `
([líneas 149-150](../../routes/facturas.js#L149-L150)). Comentario explícito: "aquí NO se
recalcula nada, se invierte lo que hay (Puri dixit: la rectificativa tiene que ser espejo
exacto de la original)" ([líneas 127-128](../../routes/facturas.js#L127-L128)).

Evidencia de datos reales: `RE-2026-000001` espeja a `FA-2026-000106` con importes
negativos idénticos en signo invertido ([db.js:156-162](../../db.js#L156-L162)).

### 5.5 Qué se graba, en qué tablas y en qué orden
1. **`facturas`**: serie `RE`, `fecha=util.hoy()`, `vencimiento=null`, importes negativos,
   `estado='emitida'`, `rectifica_a=f.numero`, obs `Rectifica <numero>. <motivo>`
   ([líneas 141-143](../../routes/facturas.js#L141-L143)). `rectId = this.lastID`.
2. **`lineas`**: una por cada línea original, en `forEach` con contador `pendientes`
   ([líneas 147-159](../../routes/facturas.js#L147-L159)).
3. **`facturas` (UPDATE)**: solo cuando `pendientes === 0`, la original pasa a
   `rectificada` y se redirige a la rectificativa ([líneas 153-156](../../routes/facturas.js#L153-L156)).

### 5.6 Estado resultante
- La **rectificativa** nace `emitida` ([línea 142](../../routes/facturas.js#L142)).
- La **original** pasa a `rectificada` ([línea 154](../../routes/facturas.js#L154)).

---

## 6. Estados de una factura y quién los cambia

| Estado | Se pone en | Quién / cómo |
|--------|-----------|--------------|
| `emitida` | Al crear (caminos 1, 2 y la rectificativa del 3) | INSERT con `estado='emitida'` ([facturas.js:75](../../routes/facturas.js#L75), [remesa_mensual.js:62](../../scripts/remesa_mensual.js#L62), [facturas.js:142](../../routes/facturas.js#L142)) |
| `cobrada` | `POST /facturas/:id/cobrar` | `UPDATE ... SET estado='cobrada' WHERE id=? AND estado='emitida'` — solo transiciona desde `emitida` ([facturas.js:117-121](../../routes/facturas.js#L117-L121)) |
| `rectificada` | `POST /facturas/:id/rectificar` sobre la original | `UPDATE ... SET estado='rectificada'` ([facturas.js:154](../../routes/facturas.js#L154)) |

Observaciones sobre las transiciones:
- No hay ruta que revierta `cobrada` ni `rectificada`.
- `cobrar` exige `estado='emitida'` en el `WHERE`, así que cobrar una factura ya
  `cobrada` o `rectificada` no hace nada (0 filas afectadas) pero **igualmente redirige
  sin error** ([facturas.js:118-120](../../routes/facturas.js#L118-L120)).
- Las facturas **no se borran nunca** (obligación legal, [numeracion.js:3-6](../../lib/numeracion.js#L3-L6)); no existe ruta de borrado.

---

## 7. Puntos donde dos caminos hacen "lo mismo" con código distinto

Estos son los solapamientos donde conviene fijarse porque un cambio en un sitio no se
propaga al otro:

### 7.1 Prorrateo: `calcularProrrateo` vs. cálculo inline de la remesa ⚠️ (el más grave)
Hay **dos** implementaciones del prorrateo que dan **resultados distintos**:

- `services/calculo.js:calcularProrrateo` usa **mes fijo de 30 días**:
  `redondear2(cuota / 30 * dias)`, con tope `dias>30 → 30` ("el día 31 no se cobra")
  ([services/calculo.js:95-102](../../services/calculo.js#L95-L102)).
- `scripts/remesa_mensual.js` prorratea sobre los **días reales del mes**:
  `redondear2(cuota / diasMes * diasServicio)` con `diasMes = util.diasDelMes(...)`
  (28/29/30/31) ([scripts/remesa_mensual.js:47-51](../../scripts/remesa_mensual.js#L47-L51)).

**Consecuencia:** para un febrero (28 días) o un mes de 31, ambos métodos dan importes
diferentes. La remesa mensual, que es la que factura de verdad las cuotas,
**NO llama a `calcularProrrateo`** — reimplementa el prorrateo por su cuenta. Es decir,
`calcularProrrateo` existe en el corazón fiscal pero **ningún camino de producción lo usa**
(sin referencias fuera de su propio módulo; comprobado por lectura de `routes/` y
`scripts/`). El propio CLAUDE.md ya lo señala como "dos cálculos distintos".

### 7.2 Grabado de líneas: paralelo vs. secuencial
- Camino 1 (web): `forEach` que lanza todos los `INSERT` de líneas **en paralelo** con
  contador `pendientes` ([routes/facturas.js:83-98](../../routes/facturas.js#L83-L98)).
- Camino 3 (rectificar): mismo patrón `forEach`/`pendientes`, también paralelo
  ([routes/facturas.js:147-159](../../routes/facturas.js#L147-L159)).
- Camino 2 (remesa): grabado **secuencial** (una línea, y en su callback la siguiente
  factura) ([scripts/remesa_mensual.js:66-72](../../scripts/remesa_mensual.js#L66-L72)).

Es el mismo objetivo ("grabar las líneas de la factura") con tres bloques de código
copiados y ligeramente distintos; no hay una función común de "grabar factura".

### 7.3 Cálculo de importes: `calcularFactura` vs. inversión de signos
- Caminos 1 y 2 calculan importes con `calculo.calcularFactura` (§4).
- Camino 3 **no calcula**: niega los importes ya grabados
  ([routes/facturas.js:142, 149-150](../../routes/facturas.js#L142-L150)). Es intencional
  (espejo exacto), pero significa que si alguna vez `calcularFactura` cambiara, las
  rectificativas seguirían reflejando el cálculo con el que se grabó la original.

### 7.4 Fecha y vencimiento por defecto
- Camino 1: `fecha = req.body.fecha || util.hoy()`; `dias = cliente.dias_pago ||
  config.VENCIMIENTO_DIAS` ([routes/facturas.js:44,68](../../routes/facturas.js#L44)).
- Camino 2: `fecha = ultimoDia`; `dias = co.dias_pago || 30` (**30 hardcodeado**, no lee
  `config.VENCIMIENTO_DIAS`) ([scripts/remesa_mensual.js:60](../../scripts/remesa_mensual.js#L60)).
- Camino 3: `fecha = util.hoy()`; `vencimiento = null` (una rectificativa no vence)
  ([routes/facturas.js:142](../../routes/facturas.js#L142)).

El "30" de la remesa y el `config.VENCIMIENTO_DIAS` del alta web son el mismo concepto
("días de pago por defecto") escritos de dos formas distintas; si el valor de config
cambiara, la remesa no lo respetaría.

### 7.5 `nombreMes` duplicable
`scripts/remesa_mensual.js` define su propio `nombreMes`
([líneas 80-84](../../scripts/remesa_mensual.js#L80-L84)); `lib/util.js` no expone nada
equivalente, así que aquí no hay duplicación real hoy, pero es lógica de presentación de
fechas viviendo fuera de `lib/util.js` (donde está el resto del formateo de fechas).

---

## 8. Anomalías y suposiciones registradas en este documento (índice)

- **A1** Líneas sin transacción (caminos 1 y 3): cabecera puede quedar sin todas sus
  líneas — §1.4, [routes/facturas.js:81-82](../../routes/facturas.js#L81-L82).
- **A2** Orden de `id` de líneas no garantizado por el `forEach` paralelo — §1.4.
- **A3** Reserva de número no atómica → posibles duplicados — §3,
  [lib/numeracion.js:8-10](../../lib/numeracion.js#L8-L10).
- **A4** Dos prorrateos distintos; `calcularProrrateo` no lo usa nadie en producción —
  §7.1.
- **A5** `cobrar` sobre factura no `emitida` redirige sin error aunque no cambie nada —
  §6.
- **S1** Numeración por año de reloj, no de fecha de factura — §3 (pregunta al negocio).
- **S2** `sumarDias` tuvo un desfase de un día no reproducido (marzo 2019) —
  [lib/util.js:18-19](../../lib/util.js#L18-L19).

> Ninguna de estas anomalías se corrige en esta fase. Se documentan para trasladarlas al
> registro de anomalías y, en su caso, a decisión escrita del negocio.

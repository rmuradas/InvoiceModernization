# Feature Specification: Aritmética fiscal de la factura (ingeniería inversa)

**Feature Branch**: `001-aritmetica-fiscal-factura`

**Created**: 2026-07-07

**Status**: Draft

**Input**: User description: "Spec de ingeniería inversa: documenta el comportamiento EXISTENTE de la aritmética fiscal de la factura en GesFact 2.4. No es una feature nueva: es la especificación formal de lo que el sistema YA hace, para que sirva de contrato en la modernización."

> **Naturaleza de esta spec (léase primero).** Esto **no es una feature nueva**. Es la
> especificación formal, en formato Spec Kit, del comportamiento **que GesFact 2.4 ya tiene hoy**
> en producción para la aritmética central de una factura. Sirve de **contrato de comportamiento**
> para la modernización: lo que aquí se afirma es lo que el sistema hace, con su evidencia
> (`fichero:función` o dato real), no lo que "debería" hacer. Rige la constitución del proyecto
> (`.specify/memory/constitution.md`): *documentar y proteger, no mejorar*. Un bug encontrado se
> **especifica tal cual** y se referencia por su ID del
> [registro de anomalías](../000-reconocimiento/registro-de-anomalias.md); **no se corrige** en
> esta fase.

## Alcance de esta spec

**Dentro de alcance** (la aritmética que produce base, cuota de IVA, cuota de recargo y totales,
más el formato de importe para pantalla e impresión):

- **RN-01** · Redondeo a 2 decimales (`lib/util.js:redondear2`).
- **RN-02** · Cálculo línea a línea con redondeo individual (`services/calculo.js:calcularLinea`).
- **RN-03** · Totales que suman líneas ya redondeadas (`services/calculo.js:calcularFactura`).
- **RN-21** · Formato de importe español (`lib/util.js:formatearImporte`).
- **A-21** · El redondeo "medio hacia arriba" **no es universal** en los bordes de coma flotante
  (comportamiento accidental, latente).
- **A-22** · Las facturas de ejemplo `FA-2026-000102` y `FA-2026-000103` **no son reproducibles**
  por el motor de hoy (bug en los datos sembrados, no en el motor).

**Fuera de alcance** (viven en otras specs; se nombran aquí solo para delimitar la frontera):

- **Descuento por volumen** (RN-04/RN-05) → **Spec 002**.
- **Recargo de equivalencia** por tipo de IVA (RN-06 y la anomalía A-16 del `===`) → **Spec 003**.
- **Total del informe de IVA** y su divergencia de redondeo (A-06) → **Spec 008**.

> Nota de frontera: `calcularFactura` **sí invoca** el descuento por volumen y el recargo de
> equivalencia, y algunos casos de aceptación de esta spec los atraviesan (p. ej. A-22, que salta
> por el descuento del 2 %). Aquí se especifica solo la **aritmética de redondeo y totalización**;
> los umbrales del descuento y la tabla de recargo se especifican en 002/003.

## User Scenarios & Testing *(mandatory)*

Los "usuarios" de esta aritmética son: **Marga** (da de alta facturas a mano), **Puri** (gestoría,
reconcilia céntimo a céntimo con el Contaplus) y el **motor de cálculo** que consumen el alta web,
la rectificativa y la remesa mensual. Cada historia es una porción del comportamiento observable
verificable de forma independiente contra `test/`.

### User Story 1 - El redondeo produce el mismo céntimo que hoy (Priority: P1)

Como gestoría que reconcilia céntimo a céntimo, necesito que cada importe se redondee **exactamente
como ahora**, porque cambiar la forma de redondear ya provocó en mayo de 2019 la devolución de todo
un trimestre (`services/calculo.js:3-7`).

**Why this priority**: Es la regla más sagrada del sistema. Cualquier desviación de un céntimo
rompe la reconciliación externa y tiene precedente de coste real.

**Independent Test**: Se verifica de forma aislada llamando a `redondear2` con los valores canónicos
de factura y comprobando la salida, sin arrancar el servidor ni tocar la BD
(`test/util.redondeo.test.js`).

**Acceptance Scenarios**:

1. **Given** la línea del vaso de `FA-2026-000101` (`0,44 × 21,60 = 9,504`), **When** se redondea la
   base, **Then** el resultado es `9,50 €` (`redondear2(9.504) === 9.5`,
   `test/util.redondeo.test.js:15`).
2. **Given** esa base `9,50` al 21 %, **When** se calcula su cuota (`9,50 × 21/100 = 1,995`),
   **Then** el resultado es `2,00 €` (`redondear2(1.995) === 2`, `test/util.redondeo.test.js:17`).
3. **Given** un importe cero, negativo o entero, **When** se redondea, **Then** se preserva
   (`0 → 0`, `-0 → -0`, `100 → 100`, `-100 → -100`; `test/util.redondeo.test.js:20-26`).

### User Story 2 - Cada línea se calcula y redondea por separado (Priority: P1)

Como gestoría, necesito que la base, la cuota de IVA y la cuota de recargo de **cada línea** se
redondeen **individualmente** a 2 decimales, porque así cuadra el Contaplus línea a línea; redondear
sobre la base total es justamente lo que se prohibió en 2019.

**Why this priority**: Es la mecánica que sostiene RN-01 en una factura real de varias líneas. Sin
ella, RN-01 aislado no basta.

**Independent Test**: Llamando a `calcularLinea` / `calcularFactura` con las líneas reales de una
factura de datos y comprobando `base`, `cuotaIva`, `cuotaRecargo` (`test/calculo.linea.test.js`,
`test/calculo.factura.test.js`), sin servidor ni BD.

**Acceptance Scenarios**:

1. **Given** la línea de desengrasante de `FA-2026-000102` (`4 × 18,50`), **When** se calcula,
   **Then** su base es `74,00`, su cuota de IVA `74,00 × 21/100 = 15,54` y su cuota de recargo
   `74,00 × 5,2/100 = 3,848 → 3,85` (redondeados por separado; `services/calculo.js:26-34`,
   dato `db.js:133`).
2. **Given** una línea con IVA reducido, **When** se calcula, **Then** cada componente se redondea a
   2 decimales de forma independiente antes de sumarse a los totales.

### User Story 3 - Los totales suman las líneas ya redondeadas (Priority: P1)

Como gestoría, necesito que el total de la factura sea la **suma de las líneas ya redondeadas**
(base + IVA + recargo), no un recálculo sobre la base bruta, para que el impreso cuadre con la suma
de sus líneas.

**Why this priority**: Cierra la cadena RN-01 → RN-02 → RN-03. Es la salida que se imprime y se
reconcilia.

**Independent Test**: `calcularFactura` sobre las líneas de una factura real, comprobando `base`,
`iva`, `recargo`, `total` (`test/calculo.factura.test.js:11-33`).

**Acceptance Scenarios**:

1. **Given** las 4 líneas de `FA-2026-000102` con cliente con recargo, **When** se totaliza,
   **Then** el motor produce `base 115,62`, `iva 24,28`, `recargo 6,01`, `total 145,91`
   (`services/calculo.js:81-86`; `test/calculo.factura.test.js:28-31`).
2. **Given** una factura sin líneas, **When** se calcula, **Then** todos los importes son `0`
   (`test/calculo.factura.test.js:108-118`).

> **Aviso (A-22):** la cabecera **grabada** de `FA-2026-000102` en `db.js:132` dice
> `base 115,60 / total 145,89`. Eso **no** es lo que produce el motor (`115,62 / 145,91`): la línea
> de Portes se sembró a mano con base `1,90` cuando `0,32 × 6,00 = 1,92`. La spec congela **el
> motor** (correcto); el dato divergente es la anomalía A-22 (ver más abajo).

### User Story 4 - El importe se muestra en formato español (Priority: P2)

Como Marga (que imprime facturas) y Puri (que las revisa), necesito que los importes se muestren con
punto de miles y coma decimal, dos decimales fijos, y que los nulos se muestren como `0,00`.

**Why this priority**: Es presentación, no aritmética del dinero facturado; importa para el impreso
pero no altera la reconciliación numérica. De ahí P2.

**Independent Test**: `formatearImporte` con valores representativos incluyendo nulos y negativos
(`test/util.formato.test.js`).

**Acceptance Scenarios**:

1. **Given** `1234.5`, **When** se formatea, **Then** `"1.234,50"` (`test/util.formato.test.js:11`).
2. **Given** `null` / `undefined` / no numérico, **When** se formatea, **Then** `"0,00"`
   (`test/util.formato.test.js:22-27`).
3. **Given** el total `-122,23` de la rectificativa real `RE-2026-000001` (`db.js:160`), **When** se
   formatea, **Then** `"-122,23"` (`test/util.formato.test.js:19`).

### User Story 5 - El sistema conserva sus rarezas de borde tal cual (Priority: P1)

Como equipo de modernización, necesito que las anomalías **A-21** y **A-22** queden **especificadas
como comportamiento actual** —no ocultas ni "arregladas"— para que la red de tests detecte cualquier
cambio accidental y para decidir su tratamiento con acta de negocio.

**Why this priority**: El valor de una spec de ingeniería inversa es precisamente fijar lo que hoy
es frágil. Omitir estas rarezas rompería el contrato.

**Independent Test**: `test/anomalias.test.js` y el golden master (`test/golden.test.js`, caso
`03-fa103-no-reproducible`).

**Acceptance Scenarios**:

1. **Given** `redondear2(0.005)`, **When** se evalúa, **Then** `0.01` (sube); **but Given**
   `redondear2(1.005)`, **Then** `1` (**no** sube) — el "medio hacia arriba" **no** es universal
   (A-21; `test/util.redondeo.test.js:36-38`, `test/anomalias.test.js:59-62`).
2. **Given** las líneas reales de `FA-2026-000103` (que suman `1.000,02` bruto, no `1.000,00`),
   **When** se pasan por `calcularFactura`, **Then** el motor descuenta 2 % y da `base 980,01 /
   total 1.185,82`, **distinto** de los `1.000,00 / 1.210,00` grabados en `db.js:139` (A-22;
   `test/anomalias.test.js:81-92`, golden `03-fa103-no-reproducible`).

### Edge Cases

- **Medio céntimo en positivo**: `0,005` sube a `0,01`, pero `1,005` **no** sube (queda `1,00`) por
  el binario de `Math.round(x*100)`. Congelado en A-21.
- **Medio céntimo en negativo**: `redondear2(-9.505) = -9.51` y `redondear2(-1.005) = -1`; el
  redondeo va hacia +∞, **no** "hacia afuera" como especula la doctrina H-1. Congelado en A-21.
- **`-0`**: `redondear2(-0)` preserva `-0` (`Object.is`), no `0` (`test/util.redondeo.test.js:23`).
- **Formato vs. redondeo divergen**: `formatearImporte` usa `toFixed(2)`, que redondea **distinto**
  de `redondear2` (`Math.round`); `formatearImporte(-0.005) = "-0,01"` (A-21;
  `test/util.formato.test.js:35-37`).
- **Factura vacía**: todos los importes a `0`.
- **Cantidad 0 en una línea**: la línea aporta `0` a los totales sin romper el cálculo
  (golden `11-una-linea-cero`).
- **Datos de ejemplo no reproducibles**: `FA-2026-000102` (portes `1,90` vs. `1,92`) y
  `FA-2026-000103` (bruto `1.000,02` vs. `1.000,00`) divergen del motor. A-22.

## Requirements *(mandatory)*

Cada requisito describe **comportamiento actual** con su evidencia. "MUST" significa "el sistema hoy
hace esto y la modernización debe preservarlo salvo decisión escrita del negocio".

### Functional Requirements

- **FR-001 (RN-01)**: El sistema MUST redondear cualquier importe a 2 decimales mediante
  `redondear2(x) = Math.round(x*100)/100` (`lib/util.js:5-7`). Ejemplo canónico: base del vaso de
  `FA-2026-000101`, `0,44 × 21,60 = 9,504 → 9,50 €`; su cuota de IVA `9,50 × 21/100 = 1,995 →
  2,00 €` (`db.js:130`).

- **FR-002 (RN-01, enunciado corregido)**: La doctrina "medio céntimo **siempre** hacia arriba"
  descrita en la regla RN-01 y en la hipótesis H-1 de
  [reglas-de-negocio.md](../000-reconocimiento/reglas-de-negocio.md#rn-01--redondeo-a-2-decimales-medio-hacia-arriba)
  **describe mal el código**. El comportamiento real MUST especificarse como: `redondear2` hereda el
  redondeo de `Math.round(x*100)` en binario, de modo que el medio céntimo **a veces sube y a veces
  no** (ver FR-010). Esta corrección de *enunciado* es el tratamiento acordado de A-21; el *código*
  no se toca.

- **FR-003 (RN-02)**: Para cada línea, el sistema MUST calcular y redondear **por separado** la
  base (`redondear2(cantidad × precio)`), la cuota de IVA (`redondear2(base × tipoIva/100)`) y la
  cuota de recargo (`redondear2(base × recargoPara(tipoIva)/100)`, solo si el cliente tiene recargo)
  (`services/calculo.js:26-34`). Ejemplo: línea de `FA-2026-000102`, `4 × 18,50 = 74,00`; IVA
  `15,54`; recargo `74,00 × 5,2/100 = 3,848 → 3,85` (`db.js:133`).

- **FR-004 (RN-03)**: El sistema MUST calcular los totales de la factura **acumulando las líneas ya
  redondeadas**, re-redondeando a 2 decimales en cada suma parcial:
  `base`, `iva`, `recargo` suman sus líneas y `total = redondear2(base + iva + recargo)`
  (`services/calculo.js:81-86`). El sistema MUST NOT redondear sobre la base total (prohibición de
  2019, `services/calculo.js:3-7`). Ejemplo: `FA-2026-000102` → `115,62 + 24,28 + 6,01 = 145,91 €`
  (motor; ver A-22 respecto al dato grabado `145,89` en `db.js:132`).

- **FR-005 (RN-03)**: Una factura sin líneas MUST producir `{ lineas: [], base: 0, iva: 0,
  recargo: 0, total: 0, descuentoPct: 0 }` (`services/calculo.js:48-88`;
  `test/calculo.factura.test.js:108-118`).

- **FR-006 (RN-21)**: El sistema MUST formatear un importe para pantalla e impresión en formato
  español: separador de miles `.`, separador decimal `,`, 2 decimales fijos
  (`formatearImporte`, `lib/util.js:51-58`). Ejemplo: `1234.5 → "1.234,50"`.

- **FR-007 (RN-21)**: El sistema MUST devolver `"0,00"` cuando el importe es `null`, `undefined` o
  no numérico (`NaN`) (`lib/util.js:52`; `test/util.formato.test.js:22-27`).

- **FR-008 (RN-21)**: El sistema MUST conservar el signo en negativos al formatear:
  `-122.23 → "-122,23"` (dato real `RE-2026-000001`, `db.js:160`;
  `test/util.formato.test.js:19`).

- **FR-009 (A-21)**: El sistema MUST preservar `-0` como `-0` al redondear
  (`redondear2(-0)` cumple `Object.is(_, -0)`; `test/util.redondeo.test.js:23`). Comportamiento
  accidental, congelado.

- **FR-010 (A-21 · redondeo no universal en bordes)**: El sistema, tal como está hoy, MUST exhibir
  este comportamiento de borde (accidental, latente, **no se corrige**;
  ver [A-21](../000-reconocimiento/registro-de-anomalias.md)):
  - `redondear2(0.005) = 0.01` (sube) **pero** `redondear2(1.005) = 1` (no sube);
  - `redondear2(2.675) = 2.68`; `redondear2(1.155) = 1.16`;
  - `redondear2(-9.505) = -9.51`; `redondear2(-1.005) = -1` (hacia +∞);
  - `formatearImporte(-0.005) = "-0,01"` (porque `formatearImporte` usa `toFixed(2)`, que redondea
    **distinto** de `redondear2`).

  Evidencia: `toFixed` ≠ `Math.round` (`lib/util.js:5-7` vs. `:54`). Congelado por
  `test/util.redondeo.test.js` y `test/anomalias.test.js:59-72`.

- **FR-011 (A-22 · datos de ejemplo no reproducibles)**: El **motor** `calcularFactura` MUST
  especificarse **tal cual** (es correcto); son los **datos sembrados** de dos facturas de ejemplo
  los que no reproduce (bug en datos, no en motor;
  ver [A-22](../000-reconocimiento/registro-de-anomalias.md)):
  - `FA-2026-000103`: sus líneas suman `1.000,02` bruto (`0,92 × 6,00 = 5,52`, no `5,50`), así que
    el motor cruza el umbral de descuento y aplica **2 %**, dando `base 980,01 / total 1.185,82` en
    vez de los `1.000,00 / 0 % / 1.210,00` grabados (`db.js:139-143`).
  - `FA-2026-000102`: la línea de Portes se grabó con base `1,90` cuando `0,32 × 6,00 = 1,92`, así
    que el motor da `base 115,62 / total 145,91` en vez de los `115,60 / 145,89` grabados
    (`db.js:132-136`).

  Congelado por `test/calculo.factura.test.js:77-93`, `test/anomalias.test.js:81-104` y el golden
  master (caso `03-fa103-no-reproducible`).

### Key Entities *(include if data involved)*

- **Línea de factura (cruda)**: `{ descripcion, cantidad, precio, tipoIva }`. Entrada de
  `calcularLinea` / `calcularFactura`.
- **Línea calculada**: `{ descripcion, cantidad, precio, tipoIva, base, cuotaIva, cuotaRecargo }`,
  con cada importe ya redondeado a 2 decimales.
- **Resultado de factura**: `{ lineas[], base, iva, recargo, total, descuentoPct }`, todos los
  importes redondeados; `total = base + iva + recargo` re-redondeado.
- **Importe formateado**: cadena en formato español (`"1.234,50"`, `"-122,23"`, `"0,00"`).

## Success Criteria *(mandatory)*

Al ser una spec de ingeniería inversa, el éxito se mide como **fidelidad** al comportamiento actual,
verificable con la red de tests de caracterización sin tocar producción.

### Measurable Outcomes

- **SC-001**: El 100 % de los ejemplos canónicos de redondeo (`9,504 → 9,50`; `1,995 → 2,00`)
  descritos en la spec reproducen exactamente la salida del sistema, verificado por
  `test/util.redondeo.test.js` (todos los tests en verde).

- **SC-002**: Para las facturas reales usadas como referencia, la base, cuota de IVA, cuota de
  recargo y total calculados por el motor coinciden **al céntimo** con lo especificado, verificado
  por `test/calculo.linea.test.js` y `test/calculo.factura.test.js`.

- **SC-003**: El 100 % de los casos del golden master
  (`test/golden.test.js` sobre `test/golden/factura-master.json`) pasan sin diferencia; cualquier
  cambio de un solo céntimo en cualquier caso hace fallar la suite (protección anti-regresión).

- **SC-004**: Las dos anomalías en alcance (A-21, A-22) están **especificadas como comportamiento
  actual y referenciadas por su ID**, y cada una tiene al menos un test de caracterización que la
  congela (`test/anomalias.test.js`, `test/util.redondeo.test.js`, golden
  `03-fa103-no-reproducible`). Ninguna se corrige en esta fase.

- **SC-005**: El enunciado erróneo de RN-01/H-1 ("medio céntimo siempre hacia arriba") queda
  **corregido en la documentación** (FR-002) sin alterar una sola línea del código de producción.

## Assumptions

- **Fase del proyecto = documentar y proteger.** Toda afirmación cita `fichero:función`, dato real
  de `datos/gesfact.db` o acta de negocio; nada se corrige (`.specify/memory/constitution.md`).
- **El comportamiento observable actual es la especificación**, aunque contradiga la doctrina
  narrada en comentarios (caso A-21) o los datos sembrados (caso A-22).
- **Los tests de caracterización son la fuente de verdad ejecutable.** Se ejecutan con el runner
  nativo `node --test`, sin frameworks externos, y no tocan estado de producción.
- **Frontera con otras specs**: el descuento por volumen (002) y el recargo de equivalencia (003)
  se **invocan** desde `calcularFactura` pero se **especifican** en sus propias specs; aquí solo se
  fija la aritmética de redondeo y totalización. El total del informe de IVA (A-06) es Spec 008.
- **Tratamiento acordado de A-21**: especificar tal cual y corregir solo el *enunciado* de
  RN-01/H-1; **decisión de negocio** sobre si algún flujo redondea importes negativos directamente
  sigue pendiente de ratificación (H-1, pregunta al negocio en reglas-de-negocio.md).
- **Tratamiento acordado de A-22**: especificar el motor tal cual (correcto); **regenerar los datos
  de ejemplo** es trabajo de modernización (coordinado con A-19), no de esta fase.
- **Fuente de las decisiones de negocio citadas**: registro de anomalías consolidado a 2026-07-07
  (`specs/000-reconocimiento/registro-de-anomalias.md`) y acta de entrevista de la misma fecha
  (`specs/000-reconocimiento/entrevista-negocio.md`). A-21 y A-22 no requieren decisión de negocio
  para *especificarse tal cual*; su corrección sí, en modernización.

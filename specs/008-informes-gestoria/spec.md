# Feature Specification: Informes a la gestoría — resumen de IVA trimestral y export CSV

**Feature Branch**: `008-informes-gestoria`

**Created**: 2026-07-07

**Status**: Aprobada

**Input**: User description: "Spec de ingeniería inversa de los informes a la gestoría (resumen de IVA trimestral y export CSV). No es una feature nueva: es la especificación formal de lo que el sistema YA hace, para que sirva de contrato en la modernización."

---

## Naturaleza de esta especificación *(leer primero)*

Esta **NO** es una especificación de una funcionalidad nueva. Es una **especificación de
ingeniería inversa**: documenta, con evidencia, el **comportamiento observable actual** de GesFact
2.4 en los dos informes que la gestoría (Puri) consume —el **resumen de IVA por trimestre** y el
**export CSV anual de facturas**— para que sirva de **contrato** en una futura modernización.

Rige la [constitución del proyecto](../../.specify/memory/constitution.md): el comportamiento
actual es sagrado (Principio I), toda afirmación lleva evidencia (Principio II) y los hallazgos se
**registran, no se corrigen** (Principio III). Las anomalías referenciadas (**A-06**, **A-11**)
pertenecen al [registro de anomalías](../000-reconocimiento/registro-de-anomalias.md); aquí se
congelan como contrato **por su ID**, **no** se proponen soluciones salvo como decisión de negocio
citada por acta.

**Estado de las decisiones citadas**: **D-07** y **D-10** están marcadas **SIMULADAS — a ratificar**
por el negocio (no proceden de acta real); indican el tratamiento *deseado* de A-06 y A-11 en la
modernización, pero **ninguna autoriza por sí sola cambiar comportamiento observable en esta fase**
(constitución, Principio I).

**Hueco de tests conocido**: hoy los informes **no tienen ni characterization test ni golden
master** (verificado: no existe `test/informes.*`). Esta spec **exige tests nuevos** que congelen el
comportamiento actual; su ausencia es parte del contrato a cerrar.

---

## User Scenarios & Testing *(mandatory)*

El "usuario" de estos informes es **Puri** (la gestoría), que recibe el resumen de IVA antes de
presentar el modelo 303 y el fichero CSV para su contabilidad. Los escenarios describen lo que el
sistema **hace hoy**.

### User Story 1 - Resumen de IVA sumado desde las líneas (Priority: P1)

Al pedir el resumen de IVA de un trimestre, el sistema agrupa por tipo de IVA y suma **desde la
tabla `lineas`** (no desde las cabeceras de factura): `SUM(l.base)`, `SUM(l.cuota_iva)`,
`SUM(l.cuota_recargo)` de todas las líneas cuyas facturas caen en el rango de fechas del trimestre
(`routes/informes.js:23-26`). Sumar desde las líneas es **intencional**: las rectificativas de
serie `RE` guardan importes en negativo, de modo que **restan solas** en el agregado sin lógica
especial (comentario `informes.js:21-22`, `informe_iva.ejs:16`).

**Why this priority**: Es la salida que la gestoría reconcilia antes del modelo 303; el criterio
"sumar desde las líneas para que las rectificativas resten solas" es la regla de negocio central del
informe y debe congelarse como contrato para que la modernización no lo sustituya por una suma sobre
cabeceras (que dejaría de restar las rectificativas automáticamente).

**Independent Test**: Verificable con un test nuevo (hoy inexistente) que, sobre los datos de
ejemplo de `db.js`, invoque la consulta del trimestre y compruebe el agregado por tipo de IVA,
incluyendo un caso con una factura `RE` que reste.

**Acceptance Scenarios**:

1. **Given** las facturas del 1T 2026 (enero–marzo) con líneas al 21 % (`db.js:126-154`),
   **When** se genera el resumen de IVA del 1T 2026, **Then** la fila del tipo 21 suma
   `cuota_iva = 530,00 €` (`contradiccion-04 §3`).
2. **Given** una factura rectificativa de serie `RE` con importes en negativo dentro del trimestre,
   **When** se genera el resumen, **Then** sus importes **restan** del agregado sin tratamiento
   especial (entran como sumandos negativos vía `SUM`).
3. **Given** un trimestre sin facturas, **When** se genera el resumen, **Then** no aparece ninguna
   fila de tipo de IVA (agrupación vacía).
4. **Given** líneas de varios tipos de IVA en el trimestre, **When** se genera el resumen,
   **Then** aparece una fila por tipo, ordenadas por tipo de IVA descendente
   (`ORDER BY l.tipo_iva DESC`, `informes.js:25`).

---

### User Story 2 - Export CSV en "formato Puri" (Priority: P1)

Al exportar las facturas de un año para la gestoría, el sistema produce un CSV con el **formato
acordado con Puri en 2019** (`informes.js:32-33`): separador de campos **`;`** (punto y coma),
importes con **decimales por coma y miles por punto** (vía `util.formatearImporte`,
`lib/util.js:50-57`), **primera línea `CLAVE;SH-CONTA-7731`** (la clave de exportación de gestoría,
`config.js:37`), **segunda línea de cabeceras** de columna, y una línea por factura del año
ordenadas por número (`informes.js:38,42-45`). El fin de línea es `\r\n` (`informes.js:49`) y el
fichero se descarga como `facturas_<año>.csv` (`informes.js:48`).

**Why this priority**: El formato es un contrato externo vivo con la gestoría; cualquier desviación
(separador, decimales, presencia o valor de la clave, orden de columnas) rompe la importación en el
lado de Puri. Debe congelarse literal.

**Independent Test**: Verificable con un test nuevo que genere el CSV sobre los datos de ejemplo de
`db.js` y compruebe: primera línea exacta `CLAVE;SH-CONTA-7731`; segunda línea de cabeceras exacta;
separador `;`; importes formateados con coma decimal; orden por número de factura.

**Acceptance Scenarios**:

1. **Given** cualquier export, **When** se genera el CSV, **Then** la **primera línea** es
   exactamente `CLAVE;SH-CONTA-7731` (`config.CLAVE_EXPORT_GESTORIA`, `config.js:37`).
2. **Given** cualquier export, **When** se genera el CSV, **Then** la **segunda línea** es
   exactamente `NUMERO;FECHA;CLIENTE;NIF;BASE;IVA;RECARGO;TOTAL;ESTADO` (`informes.js:41`).
3. **Given** una factura con base `1234.5`, **When** se exporta, **Then** el importe aparece como
   `1.234,50` (miles con punto, decimales con coma, `formatearImporte`).
4. **Given** varias facturas del año, **When** se exporta, **Then** se emiten ordenadas por
   `f.numero` (`informes.js:38`), una por línea, campos unidos por `;`.
5. **Given** una factura cuyo cliente no tiene NIF, **When** se exporta, **Then** el campo NIF sale
   vacío (`f.nif || ''`, `informes.js:43`), no como `null`.
6. **Given** el filtro anual, **When** se seleccionan las facturas, **Then** se incluyen todas las
   del año vía `f.fecha LIKE '<año>-%'` (`informes.js:38`).

---

### User Story 3 - A-06 · Total del informe sin la regla de redondeo sagrada (Priority: P2)

El **total general** de la tabla del resumen de IVA se acumula en coma flotante **en la plantilla
EJS** (`informe_iva.ejs:5`: `var tb=0,ti=0,tr=0; filas.forEach(function(x){ tb+=x.base; ... })`),
**sin** aplicar la regla sagrada de "redondear en cada suma" que rige las facturas
(`services/calculo.js:81-86`); solo se redondea **al formatear** con `toFixed(2)`
(`informe_iva.ejs:12-14`). Es la anomalía **A-06**, clasificada **ACCIDENTAL** y **latente**: la
divergencia posible frente a la regla dueña es de **como mucho 1 céntimo**, solo en un borde de coma
flotante. Para el 1T 2026 **ambos métodos dan `530,00 €`** (`contradiccion-04 §3`), por lo que **hoy
no hay diferencia observable**. La convención dueña (redondeo línea a línea) vive en la **Spec 001**;
aquí se especifica **solo la divergencia** como anomalía congelada.

**Why this priority**: Toca un importe que la gestoría reconcilia. Aunque hoy no diverge, el total
del informe **no está protegido** por la disciplina de redondeo del resto del sistema, y cualquier
cambio futuro en cómo se suma podría separarlo del método canónico sin que salte alarma. Congelarlo
documenta la divergencia y su latencia.

**Independent Test**: Verificable con un test nuevo que compruebe que, para el 1T 2026, el total del
informe (acumulador flotante de la plantilla) coincide con el que daría la aritmética canónica de la
Spec 001: **530,00 €** por ambos métodos.

**Acceptance Scenarios**:

1. **Given** las líneas al 21 % del 1T 2026, **When** se acumula el total con el método de la
   plantilla (flotante, sin `redondear2` intermedio) **y** con el método canónico de la Spec 001
   (re-redondeo en cada suma), **Then** ambos dan `530,00 €` (sin divergencia con los datos
   actuales).
2. **Given** el total del informe, **When** se formatea, **Then** el único redondeo aplicado es el
   `toFixed(2)` de presentación (`informe_iva.ejs:12-14`), no un `redondear2` por suma.

---

### User Story 4 - A-11 · Fin de trimestre `AAAA-MM-31` tapado por SQLite textual (Priority: P2)

El resumen de IVA construye el fin de trimestre **siempre** como `AAAA-MM-31`
(`informes.js:17-19`: `hasta = anyo + '-' + meses[t][1] + '-31'`), incluso para meses que no tienen
día 31 (p. ej. junio → `2026-06-31`, septiembre → `2026-09-31`). Hoy el rango **captura todo el mes
correctamente** solo porque SQLite compara las fechas **como texto** y la cadena `'2026-06-31'`
ordena **después** de `'2026-06-30'`, incluyendo así todas las facturas de junio. Es la anomalía
**A-11**, clasificada **BUG A SECAS** (latente, tapado por el motor): conceptualmente incorrecto,
sin efecto hoy, se rompería al migrar a un motor con tipo de fecha estricto (p. ej. MySQL con
`DATE`).

**Why this priority**: El rango de fechas define qué facturas entran en el modelo 303. El bug es
inocuo hoy pero se activaría en la migración a un motor de fecha estricta; congelarlo como contrato
avisa a la modernización de que el comportamiento **observable actual** (capturar todo el mes) debe
preservarse aunque el mecanismo (`-31` textual) cambie.

**Independent Test**: Verificable con un test nuevo que confirme que el rango
`['2026-04-01', '2026-06-31']` (2T 2026) captura una factura con fecha `2026-06-30`, y que
`'2026-06-31' >= '2026-06-30'` en comparación textual.

**Acceptance Scenarios**:

1. **Given** el 2T 2026, **When** se calcula el rango, **Then** `hasta = '2026-06-31'` (día 31
   inexistente en junio), `informes.js:19`.
2. **Given** una factura con fecha `2026-06-30`, **When** se aplica el filtro `f.fecha <= '2026-06-31'`,
   **Then** la factura **queda incluida**, porque en comparación textual `'2026-06-30' <= '2026-06-31'`.
3. **Given** el mecanismo actual (comparación textual de SQLite), **When** se migre a un motor con
   fecha estricta, **Then** el comportamiento observable (capturar todo el mes) debe preservarse
   usando el último día real del mes (tratamiento propuesto **D-10**, no aplicado en esta fase).

---

### Edge Cases

- **Trimestre inválido en la petición**: si `trimestre` no es 1–4, el código usa `|| 1`
  (`informes.js:16`), por lo que un valor ausente o no numérico cae al **1T**. Comportamiento actual
  congelado.
- **Año ausente en la petición**: se usa `new Date().getFullYear()` (año del sistema,
  `informes.js:15,35`). *(El uso del "año del sistema" frente al año de la factura pertenece a la
  numeración — ver **A-14/Spec 004** —; aquí solo se congela como valor por defecto del filtro.)*
- **Meses `2026-09-31` (3T)**: mismo mecanismo que junio; `'…-09-31'` ordena tras `'…-09-30'` y
  captura septiembre completo (A-11).
- **Factura sin NIF en el CSV**: campo vacío, no `null` (`f.nif || ''`, `informes.js:43`).
- **Importe `NaN` o nulo en el CSV**: `formatearImporte` devuelve `'0,00'` (`lib/util.js:52`); no se
  emite `NaN`. Congelado como comportamiento actual.
- **Rectificativas `RE` en el CSV**: se listan como una fila más (con sus importes en negativo tal y
  como estén en cabecera); el CSV **no totaliza** (`contradiccion-04`, Implementación C).

---

## Requirements *(mandatory)*

Cada requisito describe comportamiento **actual** con su evidencia. "MUST" = "el sistema hoy hace".

### Functional Requirements

- **FR-001**: El resumen de IVA DEBE agrupar por `tipo_iva` y sumar **desde la tabla `lineas`**
  (`SUM(l.base)`, `SUM(l.cuota_iva)`, `SUM(l.cuota_recargo)`), uniendo `lineas` con `facturas` y
  filtrando por rango de fecha del trimestre (`routes/informes.js:23-26`).
- **FR-002**: El resumen DEBE ordenar las filas por `tipo_iva` descendente
  (`ORDER BY l.tipo_iva DESC`, `informes.js:25`).
- **FR-003**: Al sumar desde las líneas, las facturas rectificativas de serie `RE` (importes en
  negativo) DEBEN **restar solas** en el agregado, sin lógica de signo específica (intencional;
  comentario `informes.js:21-22`).
- **FR-004**: El export CSV DEBE emitir como **primera línea** exactamente
  `CLAVE;` seguido de `config.CLAVE_EXPORT_GESTORIA` (= `SH-CONTA-7731`, `config.js:37`,
  `informes.js:40`).
- **FR-005**: El export CSV DEBE emitir como **segunda línea** la cabecera exacta
  `NUMERO;FECHA;CLIENTE;NIF;BASE;IVA;RECARGO;TOTAL;ESTADO` (`informes.js:41`).
- **FR-006**: El export CSV DEBE usar **`;`** como separador de campos y `\r\n` como fin de línea
  (`informes.js:45,49`), y formatear los importes con `util.formatearImporte` (miles con punto,
  decimales con coma; `lib/util.js:50-57`).
- **FR-007**: El export CSV DEBE seleccionar las facturas del año con `f.fecha LIKE '<año>-%'` y
  emitirlas ordenadas por `f.numero` (`informes.js:38`), y descargarse como `facturas_<año>.csv`
  con `Content-Type: text/csv; charset=utf-8` (`informes.js:47-48`).
- **FR-008**: El export CSV DEBE emitir el NIF vacío cuando el cliente no tiene NIF (`f.nif || ''`,
  `informes.js:43`), no como `null`.
- **FR-009 (A-06)**: El **total general** del resumen de IVA DEBE acumularse en coma flotante en la
  plantilla, **sin** `redondear2` intermedio, redondeando solo al formatear con `toFixed(2)`
  (`informe_iva.ejs:5,12-14`). Diverge de la regla sagrada de la Spec 001 en **como mucho 1 céntimo**
  (borde de coma flotante) y **hoy no diverge** con los datos reales. Comportamiento congelado como
  contrato; su tratamiento es **D-07** (no aplicado en esta fase).
- **FR-010 (A-11)**: El resumen de IVA DEBE construir el fin de trimestre como `AAAA-MM-31`
  siempre (`informes.js:17-19`), y este rango DEBE capturar todo el mes por la comparación **textual**
  de SQLite (`'…-31'` ordena tras `'…-30'`). El comportamiento observable (capturar el mes completo)
  queda congelado; el mecanismo es un BUG A SECAS latente cuyo tratamiento es **D-10** (no aplicado
  en esta fase).

### Decisiones de negocio referenciadas *(citadas, no ejecutadas en esta fase)*

- **D-07** (SIMULADA — a ratificar): alinear el total del informe de IVA (A-06) con la aritmética de
  redondeo de la **Spec 001** (redondeo por suma), de modo que el informe quede protegido por la
  misma disciplina que las facturas. **No se aplica en esta fase.**
- **D-10** (SIMULADA — a ratificar): antes de migrar a un motor con tipo de fecha estricto, sustituir
  el `-31` fijo (A-11) por el **último día real del mes**, preservando el comportamiento observable
  actual (capturar el mes completo). **No se aplica en esta fase.**

### Key Entities *(include if feature involves data)*

- **Línea de factura (`lineas`)**: fuente de verdad del resumen de IVA; cada línea guarda `base`,
  `cuota_iva`, `cuota_recargo` **ya redondeadas** y su `tipo_iva`. El resumen suma estas columnas.
- **Factura (`facturas`)**: aporta `fecha` (filtro de rango), `numero` (orden del CSV), `serie`
  (`RE` implica importes negativos que restan solos) y las columnas de cabecera del CSV (`base`,
  `iva`, `recargo`, `total`, `estado`).
- **Cliente (`clientes`)**: aporta `nombre` y `nif` al CSV (NIF vacío si ausente).
- **Clave de exportación**: `config.CLAVE_EXPORT_GESTORIA = 'SH-CONTA-7731'` (`config.js:37`),
  primera línea del CSV. Su condición de **secreto en claro en `config.js` versionado** es la
  anomalía **A-18** y se trata en el **anexo de deuda técnica**, no aquí.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El resumen de IVA del 1T 2026, sumado desde las líneas al 21 %, produce
  `cuota_iva = 530,00 €`, verificado por un **test nuevo** (hoy inexistente) sobre los datos de
  ejemplo de `db.js` (`contradiccion-04 §3`).
- **SC-002**: Para el 1T 2026, el total del informe calculado por el método de la plantilla
  (acumulador flotante, A-06) y por el método canónico de la Spec 001 (redondeo por suma) **coinciden
  en 530,00 €**, congelado por un test nuevo.
- **SC-003**: El rango `2026-06-31` (2T, A-11) **captura todo junio**: una factura con fecha
  `2026-06-30` queda incluida por la comparación textual `'2026-06-30' <= '2026-06-31'`, verificado
  por un test nuevo.
- **SC-004**: El CSV generado tiene como primera línea exactamente `CLAVE;SH-CONTA-7731` y como
  segunda `NUMERO;FECHA;CLIENTE;NIF;BASE;IVA;RECARGO;TOTAL;ESTADO`, verificado por un test nuevo.
- **SC-005**: Una factura rectificativa `RE` con importes negativos **resta** del agregado del
  resumen de IVA sin lógica especial, verificado por un test nuevo.
- **SC-006**: Ninguna salida observable (agregados del resumen, contenido y formato del CSV) cambia
  respecto al comportamiento actual como resultado de esta especificación (es un contrato, no un
  cambio).

---

## Assumptions

- **Hueco de tests**: se asume (verificado) que hoy **no existe** ningún characterization test ni
  golden master de los informes; esta spec los **exige como trabajo nuevo**. Su ausencia no es un
  descuido a corregir en producción sino un hueco de cobertura a cerrar en la caracterización.
- **Decisiones SIMULADAS**: D-07 y D-10 no proceden de acta real; se citan como hipótesis de
  tratamiento a ratificar por el negocio (Puri). Su ratificación **no** autoriza por sí sola cambiar
  comportamiento en esta fase.
- **Datos de ejemplo como fuente**: los criterios cuantitativos (530,00 €, junio) se apoyan en los
  datos autopoblados por `db.js`. Se asume que los tests nuevos operan sobre una BD de prueba
  aislada (nunca sobre producción; constitución, disciplina de caracterización).
- **`formatearImporte` sin cambios**: el formato "Puri" del CSV depende de `lib/util.js:50-57`; su
  comportamiento (`0,00` para `NaN`/nulo, miles con punto) se toma como dado y se congela.

---

## Fuera de alcance

- **La regla de redondeo en sí** (redondeo línea a línea, aritmética canónica) → **Spec 001**. Aquí
  solo se especifica la **divergencia** del total del informe (A-06), no la regla dueña.
- **El formato de importe** (`formatearImporte`, RN-21) → **Spec 001 (RN-21)**. Aquí se usa como dado.
- **Los secretos de `config.js`** (clave de export en claro, A-18) → **anexo de deuda técnica**. Aquí
  la clave se trata solo como **contenido literal** de la primera línea del CSV, no como riesgo de
  seguridad.
- **El "año del sistema" como defecto del filtro** y su relación con la numeración por año →
  **A-14 / Spec 004**.
- **Aplicar D-07 o D-10** (alinear el redondeo del total, usar el último día real del mes): son
  **decisiones de modernización** de una fase posterior, no de esta.

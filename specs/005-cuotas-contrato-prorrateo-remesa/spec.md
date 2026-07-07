# Feature Specification: Cuotas de contrato, prorrateo y remesa mensual

**Feature Branch**: `005-cuotas-contrato-prorrateo-remesa`

**Created**: 2026-07-07

**Status**: Draft

**Input**: User description: "Spec de ingeniería inversa que documenta el comportamiento EXISTENTE de las cuotas de contrato, su prorrateo y la remesa mensual."

## Encuadre

Esta es una **especificación de ingeniería inversa**. No describe una funcionalidad nueva:
formaliza, con evidencia, **lo que GesFact ya hace hoy** con las cuotas de contrato, su
prorrateo y la generación de la remesa mensual, para que sirva de **contrato observable** en la
modernización.

Conforme a la constitución (fase "documentar y proteger"): el comportamiento actual es la
especificación aunque contenga defectos; los defectos se **especifican y referencian por su ID**
de anomalía, **no se corrigen** en esta fase. Las decisiones del negocio (D-01, D-03) se citan
como origen de la fórmula oficial y del tratamiento futuro, pero **no alteran** el código actual.

Toda regla lleva su evidencia (`fichero:líneas`) y es verificable contra `test/`.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Remesa mensual de cuotas de contrato (Priority: P1)

Marga lanza el día 1 de cada mes el script de remesa para el mes que acaba de terminar. El
sistema recorre los contratos vigentes en ese mes, calcula el importe de la cuota (prorrateando
sobre **días reales del mes** si el alta o la baja caen dentro del mes), y emite una factura de
serie `FA` por contrato.

**Why this priority**: Es el flujo que **factura dinero real** de forma masiva y recurrente. La
fórmula de la remesa es la que la gestoría reconcilia y la que el negocio ha ratificado como
oficial (D-01). Es el comportamiento más crítico a congelar.

**Independent Test**: Verificable de forma aislada reproduciendo la fórmula inline de
`scripts/remesa_mensual.js:47-51` en `test/calculo.prorrateo.test.js` (bloque "prorrateo remesa
(días reales)"), sin tocar producción.

**Acceptance Scenarios**:

1. **Given** una cuota de 60,00 € y un servicio del 16 al 30 de julio (mes de 31 días),
   **When** la remesa calcula el importe, **Then** aplica `redondear2(60 / 31 × 15) = 29,03 €`.
2. **Given** un contrato vigente el mes completo (sin alta ni baja dentro del mes),
   **When** la remesa calcula el importe, **Then** `diasServicio == diasMes` y el importe es la
   cuota íntegra prorrateada sobre los días reales (p. ej. febrero de 28 días: `90/28×28 = 90,00`).
3. **Given** un servicio del 1 al 30 en un mes de 31 días, cuota 90,00 €,
   **When** la remesa calcula, **Then** `redondear2(90 / 31 × 30) = 87,10 €` (no 90,00).

---

### User Story 2 - Prorrateo de baja de contrato a "30 días fijos" (Priority: P2)

Cuando administración da de baja un contrato a mitad de mes, la pantalla de baja calcula el
importe del último mes con la función `calcularProrrateo`, que prorratea sobre un **mes de 30
días fijos** (`cuota/30 × días`) con tope a 30 días. Administración emite después esa factura a
mano con el importe mostrado.

**Why this priority**: Es un cálculo distinto y **divergente** del de la remesa (anomalía A-01),
todavía vivo en producción (`routes/contratos.js:39`). Debe congelarse tal cual, aunque el
negocio haya declarado oficial la otra fórmula, porque esta fase no modifica código.

**Independent Test**: Verificable llamando directamente a `calculo.calcularProrrateo(...)` en
`test/calculo.prorrateo.test.js` (bloque "calcularProrrateo (30 fijos)").

**Acceptance Scenarios**:

1. **Given** cuota 90,00 € y servicio del 16 al 30 de junio (15 días),
   **When** se calcula la baja, **Then** `redondear2(90/30 × 15) = 45,00 €`.
2. **Given** cuota 90,00 € y servicio del 1 al 31 de julio (31 días naturales),
   **When** se calcula la baja, **Then** los días se topan a 30 y se cobra la cuota entera
   `90,00 €` (RN-11: el día 31 no se cobra).
3. **Given** el mismo supuesto que la remesa (cuota 60,00 €, servicio 16–30 julio),
   **When** se comparan ambas fórmulas, **Then** `calcularProrrateo` da 30,00 € frente a los
   29,03 € de la remesa: **divergencia real de 0,97 €** (A-01).

---

### User Story 3 - Prorrateo con rango inválido o intermensual (Priority: P3)

Cuando a `calcularProrrateo` se le pasa un rango donde "desde" es posterior a "hasta", o donde
las fechas están en meses distintos, el cálculo produce un resultado sin sentido **sin ningún
aviso ni error**: factura 0,00 € en silencio, o cuenta días ignorando el mes.

**Why this priority**: Es un comportamiento frágil conocido (A-15), de menor frecuencia pero con
riesgo de facturar 0 € o un importe absurdo sin que nadie lo detecte. Se documenta el
comportamiento **actual**; la corrección (avisar y bloquear el grabado, no cruzar dos meses) es
decisión de modernización (D-03), **no retroactiva**.

**Independent Test**: Verificable en `test/calculo.prorrateo.test.js` y `test/anomalias.test.js`
(casos A-15) comprobando el resultado 0 y el conteo por día que ignora el mes.

**Acceptance Scenarios**:

1. **Given** cuota 90,00 € y rango "desde" 2026-06-20 "hasta" 2026-06-10 (invertido),
   **When** se calcula, **Then** `dias = 10 − 20 + 1 = −9 → 0`, resultado `0,00 €`, **sin aviso**.
2. **Given** cuota 90,00 € y rango 2026-03-05 → 2026-05-20 (meses distintos),
   **When** se calcula, **Then** solo se usan los días (5 y 20): `20 − 5 + 1 = 16 días → 48,00 €`,
   **ignorando** que son meses diferentes.

---

### Edge Cases

- **Mes de 31 días — remesa vs. baja**: la remesa divide entre 31 (día real); `calcularProrrateo`
  topa a 30 y nunca cobra el día 31. Ambos comportamientos se congelan por separado (A-01).
- **Febrero (28/29 días)**: la remesa usa `util.diasDelMes` (días reales), luego un febrero
  completo da la cuota íntegra; `calcularProrrateo` seguiría usando 30 fijos.
- **Rango invertido** (`desde > hasta`): `calcularProrrateo` corta a 0 días → 0,00 € en silencio
  (A-15). La remesa nunca produce este caso porque acota `desde`/`hasta` al mes facturado.
- **Rango intermensual**: `calcularProrrateo` solo lee `split('-')[2]` (el día), ignora el mes
  (A-15). La remesa siempre opera dentro de un único mes por construcción.
- **Mes sin contratos que facturar**: la remesa informa "No hay contratos que facturar" y termina
  sin emitir facturas.

## Requirements *(mandatory)*

### Functional Requirements

#### Remesa mensual (fórmula oficial)

- **FR-001 (RN-13 · OFICIAL)**: La remesa mensual MUST calcular el importe de cada cuota como
  `importe = redondear2(cuota / diasMes × diasServicio)`, donde `diasMes` son los **días reales
  del mes** (28/29/30/31) obtenidos de `util.diasDelMes`, y `diasServicio = diaHasta − diaDesde + 1`.
  Evidencia: `scripts/remesa_mensual.js:47-51`.
- **FR-002 (RN-13)**: La remesa MUST acotar el periodo de servicio al mes facturado: `desde` = la
  mayor de (`fecha_alta`, primer día del mes); `hasta` = la menor de (`fecha_baja`, último día del
  mes). Evidencia: `scripts/remesa_mensual.js:45-46`.
- **FR-003 (RN-13)**: La remesa MUST emitir una factura de serie `FA` por cada contrato vigente en
  el mes (alta ≤ último día y sin baja o baja ≥ primer día), con la línea descrita como concepto
  del contrato más el sufijo de días o nombre de mes. Evidencia: `scripts/remesa_mensual.js:26-54`.

#### Prorrateo de baja de contrato (fórmula histórica, aún viva)

- **FR-004 (RN-10 · REVOCADA/HISTÓRICA)**: `calculo.calcularProrrateo(cuota, desde, hasta)` MUST
  calcular `redondear2(cuota / 30 × dias)` con `dias = diaHasta − diaDesde + 1` sobre un mes de
  **30 días fijos**. Es la fórmula usada por la baja de contrato. Evidencia:
  `services/calculo.js:95-102`, uso en `routes/contratos.js:39`.
- **FR-005 (RN-11 · REVOCADA/HISTÓRICA)**: `calcularProrrateo` MUST topar los días a 30 cuando
  `dias > 30`, de modo que **el día 31 no se cobra**. Evidencia: `services/calculo.js:99`.
  El negocio decidió (D-01, Paco/Puri) que en la modernización **el día 31 SÍ se cobra** (un alta
  16–31 de julio son 16 días); ese cambio es **futuro y no retroactivo**, y NO se aplica aquí.

#### Comportamiento frágil a especificar tal cual (A-15)

- **FR-006 (RN-12 / A-15)**: `calcularProrrateo` MUST devolver `0` (0,00 €) **en silencio, sin
  aviso ni error**, cuando `dias < 0` (rango "desde" posterior a "hasta"). Evidencia:
  `services/calculo.js:96-97,100`.
- **FR-007 (A-15)**: `calcularProrrateo` MUST calcular usando **únicamente el día del mes**
  (`split('-')[2]`), ignorando el mes y el año; asume que ambas fechas caen en el mismo mes. Un
  rango intermensual produce un resultado sin sentido pero sin error. Evidencia:
  `services/calculo.js:96-97`.

#### Divergencia entre ambas fórmulas (A-01)

- **FR-008 (A-01)**: El sistema MUST mantener **dos cálculos de prorrateo distintos y divergentes**
  conviviendo: la remesa a días reales (FR-001) y la baja a 30 fijos (FR-004). Para el mismo
  supuesto (cuota 60,00 €, servicio 16–30 julio) la divergencia observable es de **0,97 €**
  (29,03 € remesa vs. 30,00 € baja). Evidencia: `scripts/remesa_mensual.js:45-51` vs.
  `services/calculo.js:95-102`. Estado: **A-01 CERRADA** — fórmula oficial = remesa (días reales),
  el día 31 se cobra (D-01); la de 30 fijos queda como **histórica a unificar en modernización, no
  retroactivo**.

### Anomalías referenciadas (registrar, no corregir)

- **A-01 · Doble prorrateo divergente** — CERRADA. Única contradicción con divergencia real en
  producción. Fórmula oficial: la de la remesa (días reales, día 31 se cobra, D-01). Unificación
  diferida a modernización, no retroactiva.
- **A-15 · Prorrateo negativo → 0 €/0 días en silencio; asume mismo mes** — clasificada
  **BUG A SECAS, CERRADA** por ratificación escrita **D-03 (Marga/Paco, 2026-07-07)**. Decisión
  futura: avisar y no permitir grabar cuando "desde" > "hasta"; no cruzar dos meses (dos líneas si
  hiciera falta). **Tratamiento en esta fase**: especificar el comportamiento actual (0,00 €
  silencioso; cálculo intermensual sin sentido); corregir en modernización, **no retroactivo**.

### Key Entities *(include if feature involves data)*

- **Contrato**: cuota mensual recurrente de un cliente. Atributos que importan aquí: `cuota`,
  `concepto`, `tipo_iva`, `fecha_alta`, `fecha_baja`, y del cliente `recargo_equivalencia` y
  `dias_pago`. Un contrato es "vigente en el mes" si `fecha_alta ≤ último día` y (`fecha_baja` nula
  o `≥ primer día`).
- **Remesa mensual**: lote de facturas `FA` generado para un mes `YYYY-MM`, una por contrato
  vigente. No es una entidad persistida propia; es el resultado del script.
- **Prorrateo**: importe parcial de una cuota para un periodo de servicio. Existe en **dos
  variantes divergentes**: la de la remesa (días reales) y la de la baja de contrato (30 fijos).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El 100 % de los criterios de aceptación de las tres historias se verifica contra
  `test/calculo.prorrateo.test.js`, que congela **ambas** fórmulas: `calcularProrrateo` (30 fijos,
  tope a 30, negativo → 0) y el prorrateo inline de la remesa (días reales), incluida su
  divergencia.
- **SC-002**: Las anomalías A-01 y A-15 quedan cubiertas por casos de prueba en
  `test/anomalias.test.js` que reproducen la divergencia de 0,97 € (A-01) y el 0,00 € silencioso /
  conteo intermensual (A-15).
- **SC-003**: Para el supuesto de referencia (cuota 60,00 €, servicio 16–30 julio) la
  documentación y los tests reflejan exactamente `29,03 €` (remesa) y `30,00 €` (baja), con la
  divergencia de `0,97 €` explícita.
- **SC-004**: Ningún criterio de esta spec exige modificar código de producción; toda verificación
  se realiza sin tocar `datos/gesfact.db` ni servicios externos vivos.

## Assumptions

- La remesa **end-to-end no tiene golden master** porque el script escribe en la base de datos y
  la fase "documentar y proteger" prohíbe tocar el estado de producción. La cobertura de esta spec
  se limita a la **fórmula de cálculo** (reproducida en test), no al grabado. Un test de
  integración end-to-end de la remesa se añadiría **solo si se decide en modernización**.
- Los ejemplos numéricos asumen el redondeo a 2 decimales de `util.redondear2` tal como está hoy;
  el redondeo en sí se especifica en la Spec 001 y no se re-deriva aquí.
- D-01 (día 31 se cobra; días reales oficiales) y D-03 (bloquear rango invertido, no cruzar meses)
  son decisiones **del negocio para modernización**; en esta fase solo se citan como origen del
  tratamiento futuro y **no cambian el comportamiento actual**.

## Fuera de alcance

- **Vencimiento por defecto de la remesa** (literal `30` en `scripts/remesa_mensual.js:60`,
  `co.dias_pago || 30`) → **Spec 006 (A-05)**.
- **Grabado y numeración** de las facturas de la remesa (`INSERT` en `facturas`/`lineas`,
  `numeracion.siguienteNumero`) → **Spec 004 (A-13)**.
- **Cálculo de IVA, base, recargo y redondeo** de la línea (`calculo.calcularFactura`) → **Spec 001**.

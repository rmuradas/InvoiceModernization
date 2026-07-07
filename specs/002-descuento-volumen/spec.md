# Especificación: Descuento comercial por volumen

**Feature Branch**: `002-descuento-volumen`

**Created**: 2026-07-07

**Status**: Draft

**Input**: Descripción del usuario: "Spec de ingeniería inversa del comportamiento EXISTENTE del descuento comercial por volumen. No es una feature nueva: es la especificación formal de lo que el sistema YA hace, para que sirva de contrato en la modernización."

<!--
  Esta es una especificación de INGENIERÍA INVERSA (característica del sistema heredado GesFact 2.4).
  Rige la constitución del proyecto (.specify/memory/constitution.md, v1.0.0):
  - El comportamiento observable actual ES la especificación (Principio I).
  - Toda afirmación cita evidencia: fichero:líneas, dato real de gesfact.db, o testimonio con
    nombre y fecha (Principio II).
  - Los hallazgos no se corrigen, se registran como anomalías (Principio III).
  Esta característica NO introduce anomalías propias: el borde estricto `>` es una regla protegida
  e INTENCIONAL (acta Paco/Puri 2018). El único matiz de dato conocido es A-22, ya registrada en
  Spec 001.
-->

## Contexto y encuadre

GesFact aplica un **descuento comercial por volumen** a las facturas cuya base bruta supera
determinados umbrales. La regla fue acordada con el negocio en 2018 para fidelizar a la clientela
de hostelería (comentario en `services/calculo.js:38`, «acordado con Paco en 2018 para fidelizar
hosteleria»; desglose línea a línea «peticion de Puri, 2018», `services/calculo.js:63-64`).

El objetivo de esta spec es **documentar formalmente lo que el sistema ya hace**, con evidencia
trazable, para que sirva de contrato en la modernización. No propone cambios: congela el
comportamiento observable que la gestoría reconcilia céntimo a céntimo.

### Fuera de alcance

- **El redondeo línea a línea de la base** (cómo se redondea cada importe): pertenece a
  **Spec 001** (aritmética fiscal de factura). Aquí se asume dado.
- **El recargo de equivalencia sobre la base ya descontada**: pertenece a **Spec 003**. Esta spec
  solo constata que el descuento se aplica antes de calcular IVA y recargo; el detalle del recargo
  es de Spec 003.
- **La numeración, el estado de la factura y las rectificativas**: otras specs de dominio.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Factura por debajo del umbral no lleva descuento (Priority: P1)

Cuando la gestoría o el usuario de administración calcula una factura cuya base bruta no supera
1.000,00 €, el sistema **no aplica ningún descuento**: los precios de línea se mantienen tal cual y
el porcentaje de descuento registrado es 0 %.

**Why this priority**: es el caso mayoritario del día a día (la mayoría de facturas de reposición
no llegan a 1.000 €). Congelar este comportamiento protege el importe base de casi todas las
facturas emitidas.

**Independent Test**: verificable de forma aislada con
[test/calculo.factura.test.js](../../test/calculo.factura.test.js) (caso «factura vacía → todo a 0»
y «cliente SIN recargo») y con [test/calculo.descuento.test.js](../../test/calculo.descuento.test.js)
(`porcentajeDescuento(500) === 0`).

**Acceptance Scenarios**:

1. **Given** una factura de una sola línea de base bruta 500,00 €, **When** se calcula, **Then** el
   descuento aplicado es 0 % y el precio de línea no se altera.
2. **Given** una factura vacía (sin líneas), **When** se calcula, **Then** el descuento es 0 % y
   todos los importes son 0.

---

### User Story 2 - Factura entre 1.000 y 5.000 € lleva 2 % de descuento (Priority: P1)

Cuando la base bruta de la factura es **estrictamente mayor** que 1.000,00 € y no supera
5.000,00 €, el sistema aplica un **2 %** de descuento, rebajando el precio de cada línea antes de
calcular su base, IVA y recargo.

**Why this priority**: es el tramo de descuento más habitual (pedidos de apertura de temporada,
lotes medianos). El importe rebajado es el que factura dinero real y la gestoría reconcilia.

**Independent Test**: verificable con
[test/calculo.factura.test.js](../../test/calculo.factura.test.js) (caso «con descuento del 2 %,
aplicado línea a línea sobre el precio (RN-05)»: precio 120,00 → 117,60; base 1.176,00; IVA 246,96)
y con el caso golden `05-descuento-2pct` de
[test/golden/factura-master.json](../../test/golden/factura-master.json).

**Acceptance Scenarios**:

1. **Given** una factura de una línea `10 × 120,00 €` (base bruta 1.200,00 €), **When** se calcula,
   **Then** el descuento es 2 %, el precio con descuento es `redondear2(120,00 × 98/100) = 117,60`,
   la base de línea es `10 × 117,60 = 1.176,00`, el IVA (21 %) es 246,96 y el total 1.422,96.
2. **Given** una factura de varias líneas con IVA mezclado (21/10/4) cuya base bruta supera
   1.000,00 € (caso golden `05-descuento-2pct`), **When** se calcula, **Then** el descuento es 2 %
   aplicado línea a línea y la salida coincide céntimo a céntimo con el golden master
   (base 2.288,68 / IVA 332,22 / total 2.620,90).

---

### User Story 3 - Factura por encima de 5.000 € lleva 5 % de descuento (Priority: P2)

Cuando la base bruta es **estrictamente mayor** que 5.000,00 €, el sistema aplica un **5 %** de
descuento.

**Why this priority**: son las facturas de mayor importe (lotes grandes); menos frecuentes pero de
alto valor. Congelar el tramo superior protege los importes más grandes.

**Independent Test**: verificable con el caso golden `06-descuento-5pct` de
[test/golden/factura-master.json](../../test/golden/factura-master.json)
(base bruta > 5.000 → 5 %, base 5.700,00 / IVA 1.040,25 / total 6.740,25) y con
[test/calculo.descuento.test.js](../../test/calculo.descuento.test.js)
(`porcentajeDescuento(5000.01) === 5`).

**Acceptance Scenarios**:

1. **Given** una factura de base bruta 6.000,00 € (`100 × 45,00` + `50 × 30,00`), **When** se
   calcula, **Then** el descuento es 5 %, cada precio se rebaja al 95 % y la salida coincide con el
   caso golden `06-descuento-5pct`.

---

### User Story 4 - El borde exacto de 1.000,00 € NO descuenta (Priority: P1)

El umbral es **estricto** (comparación `>`): una factura cuya base bruta sea **exactamente**
1.000,00 € **no** lleva descuento. Igualmente, 5.000,00 € exactos siguen en el tramo del 2 %, no en
el del 5 %.

**Why this priority**: es la regla protegida más delicada y la más fácil de romper sin querer al
modernizar (cambiar `>` por `>=` alteraría importes de forma silenciosa). El acta del negocio la
declara intencional.

**Independent Test**: verificable con
[test/calculo.descuento.test.js](../../test/calculo.descuento.test.js) (fronteras de 1.000 y 5.000
por ambos lados) y con
[test/calculo.factura.test.js](../../test/calculo.factura.test.js) (caso «base bruta 1.000 justa NO
lleva descuento») y el caso golden `03-base-1000-justa`.

**Acceptance Scenarios**:

1. **Given** una factura de tres líneas `500,00 + 300,00 + 200,00` (base bruta exacta 1.000,00 €),
   **When** se calcula, **Then** el descuento es 0 %, la base es 1.000,00, el IVA 210,00 y el total
   1.210,00.
2. **Given** `porcentajeDescuento(1000)`, **When** se evalúa, **Then** devuelve 0.
3. **Given** `porcentajeDescuento(1000.01)`, **When** se evalúa, **Then** devuelve 2.
4. **Given** `porcentajeDescuento(5000)`, **When** se evalúa, **Then** devuelve 2 (sigue en el
   tramo intermedio).
5. **Given** `porcentajeDescuento(5000.01)`, **When** se evalúa, **Then** devuelve 5.

---

### Edge Cases

- **Base bruta 0 o negativa**: `porcentajeDescuento(0) === 0` y `porcentajeDescuento(-5) === 0`
  (evidencia: [test/calculo.descuento.test.js](../../test/calculo.descuento.test.js), líneas 22-26).
  Ninguna base no positiva alcanza el umbral, luego nunca descuenta.
- **El umbral se evalúa sobre la base BRUTA acumulada** (suma de las bases de línea sin descuento),
  no sobre el total con IVA ni sobre la base ya descontada. Evidencia:
  `services/calculo.js:53-60` (se acumula `baseBruta` y `porcentajeDescuento(baseBruta)` decide el
  tramo antes del bucle de aplicación).
- **La base bruta se acumula redondeando línea a línea** (`baseBruta = redondear2(baseBruta + c.base)`,
  `services/calculo.js:57`); el detalle del redondeo es de **Spec 001**, pero afecta a qué lado del
  umbral cae la factura (ver nota A-22).
- **Nota de dato — A-22 (registrada en Spec 001)**: el ejemplo histórico del borde «1.000 justo»
  era la factura **FA-2026-000103** (`db.js:139-143`). Sus líneas reales suman **1.000,02 €** brutos
  (la línea de Portes se grabó a mano con base 5,50 cuando `0,92 × 6,00 = 5,52`), de modo que el
  **motor** de hoy sí descuenta el 2 % sobre esa factura (base resultante 980,01, total 1.185,82),
  en contradicción con la cabecera grabada (1.000,00 / 0 % / 1.210,00). Esto **no invalida la regla
  del borde estricto**: la regla sigue viva y se demuestra con un ejemplo reproducible por el motor
  (`500 + 300 + 200 = 1.000,00`, caso `03-base-1000-justa`). Evidencia del contraste:
  [test/calculo.factura.test.js](../../test/calculo.factura.test.js), test «A-22 la factura
  histórica FA-2026-000103 NO es reproducible».
- **Nota de dato — cabecera de FA-2026-000105**: la cabecera grabada (`db.js:149`) dice base
  2.287,75 y anota «Descuento volumen 2% aplicado», pero pasadas sus líneas por el **motor** la base
  con descuento del 2 % es **2.288,68** (caso golden `05-descuento-2pct`). Se toma el valor del
  motor por ser reproducible; la discrepacia de céntimos con la cabecera es del mismo tipo que A-22
  y no es objeto de esta spec.

## Requirements *(mandatory)*

### Functional Requirements

- **RN-04 · Umbral estricto sobre la base bruta**: el sistema DEBE determinar el porcentaje de
  descuento a partir de la base bruta acumulada de la factura, con umbrales **estrictos**:
  - base bruta ≤ 1.000,00 € → **0 %**
  - 1.000,00 € < base bruta ≤ 5.000,00 € → **2 %**
  - base bruta > 5.000,00 € → **5 %**

  La comparación es estricta (`>`): **1.000,00 € exactos NO descuentan** y **5.000,00 € exactos
  permanecen en el 2 %**. Evidencia: `services/calculo.js:39-43`
  (`if (baseTotal > 5000) return 5; if (baseTotal > 1000) return 2; return 0;`) y el punto de
  llamada `services/calculo.js:53-60`. Es una regla protegida e **intencional** (acta Paco/Puri
  2018, comentario `services/calculo.js:38`).

- **RN-05 · Descuento aplicado al precio, línea a línea**: cuando el descuento es mayor que 0, el
  sistema DEBE rebajar el **precio unitario de cada línea** antes de recalcular su base, IVA y
  recargo, mediante `precioConDto = redondear2(precio × (100 − dto) / 100)`. La línea se recalcula
  íntegramente con ese precio rebajado, de forma que el desglose quede visible línea a línea.
  Evidencia: `services/calculo.js:63-84` y el testimonio «peticion de Puri, 2018»
  (`services/calculo.js:63-64`). Ejemplo verificable: precio 120,00 al 2 % → 117,60; línea
  `10 × 117,60 = 1.176,00`; IVA `246,96`
  ([test/calculo.factura.test.js](../../test/calculo.factura.test.js), caso RN-05).

- **RN-04.1 · El umbral se evalúa sobre la base sin descuento**: el porcentaje se decide con la base
  **bruta** (antes de aplicar descuento), no con la base ya rebajada. El descuento nunca se
  «autoexcluye» por bajar la base por debajo del umbral tras aplicarse. Evidencia:
  `services/calculo.js:53-61` (la base bruta se acumula y el porcentaje se fija **antes** del bucle
  de aplicación de `services/calculo.js:65-84`).

- **RN-05.1 · Base no positiva no descuenta**: para base bruta ≤ 0 el descuento es 0 %. Evidencia:
  RN-04 (umbral estricto) y [test/calculo.descuento.test.js](../../test/calculo.descuento.test.js)
  líneas 22-26.

### Key Entities

- **Factura (entrada de cálculo)**: conjunto de líneas `{descripción, cantidad, precio, tipoIva}` y
  cliente `{recargo_equivalencia}`. El descuento se decide con la suma de las bases de línea
  (base bruta).
- **Línea**: cantidad × precio → base; el descuento actúa sobre el **precio** de la línea, no sobre
  su base ya calculada.
- **Porcentaje de descuento (`descuentoPct`)**: valor 0, 2 o 5 que el cálculo devuelve en el
  resultado de la factura (`services/calculo.js:50,61`) y que la gestoría ve desglosado.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El 100 % de los casos de descuento de
  [test/calculo.descuento.test.js](../../test/calculo.descuento.test.js) pasan sin modificar el
  código de producción: las seis fronteras (999,99 / 1.000 / 1.000,01 y 4.999,99 / 5.000 / 5.000,01)
  devuelven exactamente 0/0/2 y 2/2/5.
- **SC-002**: Los casos con y sin descuento de
  [test/calculo.factura.test.js](../../test/calculo.factura.test.js) reproducen céntimo a céntimo
  la base, el IVA y el total esperados (incluido el borde 1.000,00 justo → 0 % y el caso 2 % →
  precio 117,60 / base 1.176,00 / IVA 246,96 / total 1.422,96).
- **SC-003**: Los casos golden `03-base-1000-justa`, `05-descuento-2pct` y `06-descuento-5pct` de
  [test/golden/factura-master.json](../../test/golden/factura-master.json) coinciden byte a byte con
  la salida del motor: cualquier cambio de umbral o de porcentaje rompe el golden master.
- **SC-004**: La spec no introduce ninguna anomalía nueva; el borde estricto queda documentado como
  regla intencional y las únicas notas de dato (A-22 y la cabecera de FA-2026-000105) remiten a
  registros ya existentes, sin abrir corrección.

## Assumptions

- El redondeo `redondear2` (a 2 decimales) se comporta según lo caracterizado en **Spec 001**; esta
  spec lo usa como operación dada, tanto en la acumulación de la base bruta como en el precio con
  descuento.
- El recargo de equivalencia, cuando el cliente lo tiene activado, se calcula sobre la base ya
  descontada; el detalle de ese cálculo pertenece a **Spec 003** y aquí solo se constata el orden
  (descuento → base → IVA/recargo).
- Los ejemplos numéricos de esta spec se toman del **motor** (`services/calculo.js`) por ser
  reproducibles, no de las cabeceras grabadas a mano en `db.js` cuando ambos difieren (ver notas de
  dato A-22 y FA-2026-000105).
- Las decisiones de negocio citadas (umbrales, porcentajes, desglose línea a línea) se apoyan en el
  acta de Paco/Puri de 2018 evidenciada en los comentarios del propio código; no se dispone de acta
  firmada aparte, por lo que el testimonio es el comentario datado del código de producción.

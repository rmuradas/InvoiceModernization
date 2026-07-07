# Feature Specification: Numeración correlativa y ciclo de vida de la factura

**Feature Branch**: `004-numeracion-ciclo-vida-factura`

**Created**: 2026-07-07

**Status**: Draft

**Input**: User description: "Spec de ingeniería inversa: documenta el comportamiento EXISTENTE de la numeración correlativa y el ciclo de vida de la factura (emitir, cobrar, rectificar). No es una feature nueva: es la especificación formal de lo que el sistema YA hace, para que sirva de contrato en la modernización."

<!--
  ENCUADRE (constitución, fase "documentar y proteger"): esta spec NO propone
  mejoras. Congela el comportamiento observable de HOY como contrato. Las anomalías
  se especifican tal cual, referenciadas por su ID; no se corrigen aquí. Toda
  afirmación cita fichero:líneas o dato real de db.js. Fuera de alcance:
  - Cálculo de importes de la factura → Specs 001/002/003.
  - Prorrateo de la remesa → Spec 005.
  - Vencimiento → Spec 006.
-->

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Emitir una factura con número correlativo (Priority: P1)

Una administrativa (Marga, Julián) da de alta una factura nueva. El sistema le asigna
automáticamente el **siguiente número correlativo de la serie `FA` del año en curso**, sin
huecos, y la deja en estado `emitida`. El número es la identidad legal de la factura y se
imprime en el documento que recibe el cliente y que la gestoría reconcilia.

**Why this priority**: Es el flujo central del sistema y la obligación legal más dura
(numeración correlativa sin huecos, inspección de 2020, `numeracion.js:3-6`). Sin este
comportamiento congelado no hay contrato de modernización posible.

**Independent Test**: Partiendo del contador real `FA/2026 = 108` (`db.js:176`), emitir una
factura `FA` y comprobar que sale `FA-2026-000109` y que el contador queda en 109.

**Acceptance Scenarios**:

1. **Given** contador `FA/2026 = 108`, **When** se emite una factura `FA` en 2026, **Then** su número es `FA-2026-000109`, su estado es `emitida` y el contador pasa a 109 (`numeracion.js:14-36`, `facturas.js:71-75`).
2. **Given** dos facturas `FA` emitidas consecutivamente, **When** se comparan sus números, **Then** son consecutivos sin hueco (…109, …110).
3. **Given** una serie `FA` y una serie `RE` en el mismo año, **When** se emite en cada una, **Then** cada serie mantiene su propio contador independiente (`FA/2026 = 108`, `RE/2026 = 1`; `db.js:176-177`).

---

### User Story 2 - Cobrar una factura emitida (Priority: P1)

La administrativa marca una factura como **cobrada** cuando entra el pago. El sistema
cambia el estado de `emitida` a `cobrada`. La operación es idempotente en la práctica:
sobre una factura que no está `emitida` no hace nada y redirige igualmente sin señalar
error.

**Why this priority**: Es la segunda transición del ciclo de vida y afecta a la lectura de
estado en informes. Su comportamiento silencioso (no avisa si no cambia nada) es
observable y debe congelarse.

**Independent Test**: Cobrar una factura `emitida` y verificar que queda `cobrada`; volver
a cobrarla (o cobrar una ya `rectificada`) y verificar que no cambia el estado ni devuelve
error.

**Acceptance Scenarios**:

1. **Given** una factura en estado `emitida`, **When** se ejecuta cobrar, **Then** pasa a `cobrada` (`facturas.js:117-122`).
2. **Given** una factura en estado `cobrada` o `rectificada`, **When** se ejecuta cobrar, **Then** el estado no cambia (el `WHERE … AND estado='emitida'` no afecta filas) y la respuesta redirige sin error (`facturas.js:118`).

---

### User Story 3 - Rectificar una factura como espejo exacto (Priority: P1)

Ante un error en una factura ya emitida, no se borra (prohibido legalmente): se emite una
**rectificativa en serie `RE`** que es el **espejo exacto** de la original —mismos
conceptos con signo invertido— y la original pasa a estado `rectificada`. Los importes de
la rectificativa **no se recalculan**: se niegan los que ya hay ("Puri dixit", la
rectificativa tiene que ser espejo exacto, `facturas.js:126-128`).

**Why this priority**: Es la vía legal de corrección y sustituye al borrado. El espejo sin
recálculo es una regla de negocio explícita y frágil que la gestoría reconcilia.

**Independent Test**: Rectificar `FA-2026-000106` y verificar que la `RE` resultante tiene
`base/iva/recargo/total` negados exactamente (`-101,61 / -20,62 / 0 / -122,23`), que copia
las líneas con signos invertidos y que la original queda `rectificada`. Contraste real:
`RE-2026-000001` espeja `FA-2026-000106` en `db.js:156-162`.

**Acceptance Scenarios**:

1. **Given** una factura `FA` en estado `emitida` o `cobrada`, **When** se rectifica, **Then** se crea una factura serie `RE` con el siguiente número `RE` del año, importes negados de la original sin recálculo, y `rectifica_a` = número de la original (`facturas.js:129-160`).
2. **Given** la rectificación se completa, **When** se consulta la original, **Then** su estado es `rectificada` (`facturas.js:154`).
3. **Given** una factura ya en estado `rectificada`, **When** se intenta rectificar, **Then** se rechaza con "Ya esta rectificada" (`facturas.js:132`).
4. **Given** una factura de serie `RE`, **When** se intenta rectificar, **Then** se rechaza con "No se rectifica una rectificativa" (`facturas.js:133`).
5. **Given** las líneas de la rectificativa, **When** se leen, **Then** llevan la descripción prefijada "Rectificación: …" y `cantidad/base/cuota_iva/cuota_recargo` negados (`facturas.js:149-150`).

---

### User Story 4 - Apertura de contador al cambiar de año (Priority: P2)

Al emitir la primera factura de una serie en un año nuevo, el sistema abre el contador de
ese `(serie, año)` a cero y asigna el número 1.

**Why this priority**: Es un borde crítico anual (cambio de ejercicio) y está ligado al
riesgo R15 y a la anomalía A-14. Ocurre poco (una vez al año por serie) pero su fallo tiene
consecuencias legales.

**Independent Test**: Sin contador `FA/2027`, emitir la primera `FA` de 2027 y verificar que
sale `FA-2027-000001` y que se crea el contador `FA/2027` en 1.

**Acceptance Scenarios**:

1. **Given** no existe contador para `(FA, 2027)`, **When** se emite la primera `FA` de 2027, **Then** se inserta el contador a 0, se reserva el 1 y el número es `FA-2027-000001` (`numeracion.js:18-23`).

---

### Edge Cases

- **Número por encima de 6 dígitos**: `formatear` acolcha a 6 dígitos pero **no trunca**; el número 1.000.000 sale como `FA-2026-1000000` (7 dígitos). Comportamiento congelado en `test/numeracion.formato.test.js:17-23` (RN-16, borde teórico).
- **Número 0**: `formatear("FA", 2026, 0)` → `FA-2026-000000` (`test/numeracion.formato.test.js:25-27`). No se emite en producción, pero es el estado inicial del contador de un año nuevo antes de reservar.
- **Cobrar una factura inexistente o no `emitida`**: no hay error visible; el `UPDATE` no afecta filas y se redirige igual (A-04/estado silencioso, `facturas.js:117-122`).
- **Fallo al grabar una línea a mitad del alta**: el `INSERT` de cabecera ya se ha ejecutado; una línea que falle deja la factura con líneas incompletas (A-03/A-04). En alta se responde error tras grabar el resto; en rectificativa el error de línea se **silencia** (A-04, `facturas.js:151`).
- **Cambio de ejercicio con dos contadores de año vivos**: si conviven el año del sistema y el año de `factura.fecha`, dos facturas de distinto criterio de año pueden solaparse en el borde de fin de año (A-14, Riesgo R15).
- **Concurrencia de dos usuarios grabando a la vez**: la reserva `SELECT`+`UPDATE` no es atómica; dos altas simultáneas pueden leer el mismo `ultimo` y producir números duplicados (A-02, incidente 02/01, `numeracion.js:16,30-32`).

## Requirements *(mandatory)*

### Functional Requirements

Cada requisito congela comportamiento **actual** con evidencia. Los IDs `RN-` y `A-`
provienen del reconocimiento y del acta; se conservan como referencia cruzada.

#### Numeración

- **FR-001 (RN-14)**: El sistema DEBE asignar a cada factura un número **correlativo por serie y año, sin huecos**, tomando el último número reservado de `contadores (serie, anyo)` e incrementándolo en 1 (`numeracion.js:14-36`). Evidencia legal del requisito de "sin huecos": `numeracion.js:3-6`. Contadores reales de referencia: `FA/2026 = 108`, `RE/2026 = 1` (`db.js:176-177`) → siguiente `FA` = `FA-2026-000109`.
- **FR-002 (RN-15)**: El sistema DEBE **abrir a cero** el contador de un `(serie, año)` la primera vez que se emite en ese año, insertando la fila de contador y reservando el número 1 (`numeracion.js:18-23`). Primera `FA` de 2027 → `FA-2027-000001`.
- **FR-003 (RN-16)**: El sistema DEBE formatear el número como **`SERIE-AAAA-NNNNNN`**, con la parte secuencial acolchada a **6 dígitos** con ceros a la izquierda (`numeracion.js:38-42`). El acolchado **no trunca**: números de más de 6 dígitos se imprimen con su longitud real (`FA-2026-1000000`). Verificable en `test/numeracion.formato.test.js`.
- **FR-004 (RN-17 / A-02)**: El sistema reserva el número mediante `SELECT` seguido de `UPDATE` **sin transacción atómica** (`numeracion.js:16,30-32`). Este comportamiento se especifica **tal cual** (bug histórico con dependientes): bajo concurrencia dos altas pueden leer el mismo `ultimo` y duplicar número. Contexto de negocio (D-14): concurrencia real = 2 usuarios; sin duplicados observados desde 2021 (incidente 02/01, `numeracion.js:8-10`). **No se corrige en esta fase.**
- **FR-005 (A-14)**: El sistema DEBE tomar el año del **reloj del sistema** (`new Date().getFullYear()`, `numeracion.js:15`), **no** del campo `factura.fecha`. Se especifica como comportamiento actual (bug). Decisión de negocio **D-02 (CERRADA)**: el año correcto es el de `factura.fecha`; la corrección **no es retroactiva**. **Riesgo R15**: en el cambio de ejercicio pueden convivir dos criterios de año. **No se corrige en esta fase.**

#### Ciclo de vida y estados

- **FR-006**: El sistema DEBE emitir toda factura nueva en estado **`emitida`** (`facturas.js:75`, `db.js:61`).
- **FR-007**: Los estados válidos de una factura DEBEN ser **`emitida → cobrada → rectificada`** (`db.js:61`). No existen otros estados.
- **FR-008**: El sistema DEBE permitir marcar como **`cobrada`** únicamente una factura en estado `emitida`; la operación filtra por `estado='emitida'` en el `WHERE` y **redirige sin error aunque no cambie ninguna fila** (`facturas.js:117-122`). Comportamiento silencioso congelado tal cual.
- **FR-009**: El sistema **NO DEBE permitir el borrado** de facturas (obligación legal desde la inspección de 2020, `numeracion.js:3-6`). No existe ruta de borrado.

#### Rectificación (espejo exacto)

- **FR-010**: El sistema DEBE generar la rectificativa en serie **`RE`** con un número correlativo propio de esa serie (`facturas.js:138`), enlazada a la original por `rectifica_a` = número de la original (`facturas.js:142`).
- **FR-011**: El sistema DEBE construir la rectificativa como **espejo exacto sin recalcular**: importes de cabecera negados de la original (`-base, -iva, -recargo, -total`) y líneas copiadas con `cantidad/base/cuota_iva/cuota_recargo` negados y descripción prefijada "Rectificación: " (`facturas.js:142,149-150,126-128`). Contraste real: `RE-2026-000001` espeja `FA-2026-000106` (`db.js:156-162`).
- **FR-012**: El sistema DEBE dejar la factura original en estado **`rectificada`** al completar la rectificativa (`facturas.js:154`).
- **FR-013**: El sistema DEBE rechazar rectificar una factura ya `rectificada` ("Ya esta rectificada", `facturas.js:132`) o de serie `RE` ("No se rectifica una rectificativa", `facturas.js:133`).

#### Anomalías especificadas tal cual (registrar, no corregir en esta fase)

- **FR-014 (A-03)**: El **alta de factura** ejecuta cabecera y líneas **sin transacción** (`facturas.js:74-99`). Tratamiento: **corrección técnica (D-19)** en la modernización, no en esta fase. Se congela el comportamiento actual.
- **FR-015 (A-04)**: La **rectificativa** también graba **sin transacción**, y un **error al insertar una línea se silencia** (el callback de la línea ignora el error, `facturas.js:151`), de modo que la original puede quedar `rectificada` con una rectificativa incompleta. **BUG HISTÓRICO.** Tratamiento propuesto **D-13** (rechazar todo y avisar, manteniendo el espejo) — **SIMULADA, a ratificar**. Se congela el comportamiento actual.
- **FR-016 (A-13)**: Existe **grabado ×3 y orden de líneas no determinista**: las líneas se insertan en paralelo con `forEach` sin ordenar, y la lectura/impresión depende del orden de `id` (`facturas.js:74-99,141-159`; también `remesa_mensual.js:61-73`). **ACCIDENTAL.** Tratamiento **D-12**: preservar el orden al unificar. Se congela el comportamiento actual.

### Key Entities

- **Factura**: documento con `numero` (identidad legal), `serie` (`FA`/`RE`), `fecha`, `estado` (`emitida`/`cobrada`/`rectificada`), importes ya redondeados (`base`, `iva`, `recargo`, `total`) y `rectifica_a` (número de la factura que rectifica, solo en `RE`). No se borra nunca.
- **Contador**: par `(serie, anyo)` con el campo `ultimo` = último número reservado en esa serie y año. Reales: `FA/2026 = 108`, `RE/2026 = 1` (`db.js:176-177`).
- **Línea**: renglón de una factura con `descripcion`, `cantidad`, `precio`, `tipo_iva` e importes ya redondeados (`base`, `cuota_iva`, `cuota_recargo`). En rectificativas, importes y cantidad negados, descripción prefijada "Rectificación: ".
- **Serie**: `FA` (normal) y `RE` (rectificativa, importes en negativo). Cada serie numera de forma independiente por año.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Partiendo del contador real `FA/2026 = 108`, el 100 % de las facturas `FA` emitidas en 2026 reciben números correlativos consecutivos sin hueco a partir de `FA-2026-000109`.
- **SC-002**: El 100 % de los números generados respetan el formato `SERIE-AAAA-NNNNNN` con 6 dígitos de acolchado (y sin truncar por encima de 6), verificable frente a `test/numeracion.formato.test.js`.
- **SC-003**: La primera factura de cada serie en un año nuevo recibe el número 1 (p. ej. `FA-2027-000001`), reproducible en un test de integración de apertura de año.
- **SC-004**: Toda transición de estado observada corresponde a `emitida → cobrada → rectificada`; ninguna factura llega a otro estado ni se borra, verificable en un test de integración del ciclo de estados.
- **SC-005**: Toda rectificativa `RE` es espejo exacto de su original: la suma de importes original + rectificativa es 0,00 € en `base`, `iva`, `recargo` y `total`, reproducible sobre el caso real `FA-2026-000106` / `RE-2026-000001`.
- **SC-006**: Las anomalías A-02, A-03, A-04, A-13 y A-14 quedan documentadas con su ID, evidencia y tratamiento; ninguna se corrige en esta fase (100 % registradas, 0 % corregidas).

### Cobertura de tests (verificación)

- **Ya cubierto (red pura)**:
  - RN-16 / formato → `test/numeracion.formato.test.js` (incluye el borde de >6 dígitos y el número 0).
- **Hueco a cubrir con tests de integración** (tocan BD `contadores`/`facturas`/`lineas` y quedan **fuera de la red pura**; el golden master **no** cubre el ciclo de estados, ver `test/golden/LEEME.md`):
  - Reserva correlativa y su no-atomicidad (RN-14 / FR-004 / A-02).
  - Apertura de contador de año a cero (RN-15 / FR-002).
  - Transiciones de estado `emitida → cobrada → rectificada`, incluido el cobro silencioso (FR-007/008).
  - Espejo exacto de la rectificativa sin recálculo (FR-010/011/012).
- **Pendiente de test específico**: A-14 (año del sistema vs. `factura.fecha`) se menciona como verificable contra `test/anomalias.test.js`, pero **hoy no tiene test allí**; queda como test nuevo a crear (borde de cambio de ejercicio, Riesgo R15).

## Assumptions

- **A-14 en tests**: el encuadre la sitúa como verificable contra `test/anomalias.test.js`; a fecha de esta spec ese fichero **no** contiene un test de A-14 (cubre A-01, A-10, A-15, A-16, A-21, A-22). Se asume que dicho test es **un hueco a crear**, no una cobertura existente.
- **Alcance de importes**: esta spec **no** especifica cómo se calculan `base/iva/recargo/total` (eso es Specs 001/002/003); solo congela que la rectificativa **niega** los ya grabados sin recalcular.
- **Decisiones firmes vs. simuladas**: D-02 (año de `factura.fecha`) se toma como **firme/CERRADA**; D-13 (tratamiento de A-04) y D-14 (concurrencia = 2 usuarios) se toman como **SIMULADAS**, a ratificar por el negocio antes de actuar sobre ellas. Esta spec congela comportamiento actual con independencia del tratamiento futuro.
- **Prorrateo y vencimiento fuera de alcance**: aunque `remesa_mensual.js` aparece como evidencia de A-13, su lógica de prorrateo (Spec 005) y el vencimiento (Spec 006) quedan fuera.

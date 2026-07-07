# Feature Specification: Cálculo de vencimiento y manejo de fechas

**Feature Branch**: `006-vencimiento-fechas`

**Created**: 2026-07-07

**Status**: Aprobada

**Input**: User description: "Spec de ingeniería inversa que documenta el comportamiento EXISTENTE del cálculo de vencimiento y el manejo de fechas."

## Encuadre

Esta es una **especificación de ingeniería inversa**. No describe una funcionalidad nueva:
formaliza, con evidencia, **lo que GesFact ya hace hoy** al calcular el vencimiento de una
factura y al manipular fechas (`lib/util.js`), para que sirva de **contrato observable** en la
modernización.

Conforme a la constitución (fase "documentar y proteger"): el comportamiento actual es la
especificación aunque contenga defectos; los defectos se **especifican y referencian por su ID**
de anomalía (A-05, A-05b, A-10), **no se corrigen** en esta fase. Las decisiones del negocio
(D-05, D-09) se citan como origen del tratamiento futuro, pero están **SIMULADAS a ratificar** y
**no alteran** el código actual.

Toda regla lleva su evidencia (`fichero:líneas`) y es verificable contra `test/`.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Vencimiento = fecha de factura + días de pago (Priority: P1)

Cuando se emite una factura (alta web o remesa), el sistema calcula la fecha de vencimiento
sumando a la **fecha de la factura** un número de **días de pago**. El resultado se graba en
`facturas.vencimiento` y aparece en la factura impresa que recibe el cliente y la gestoría.

**Why this priority**: El vencimiento es un dato **legal y contable** de cada factura que la
gestoría reconcilia. Es el comportamiento central de esta spec y el que más facturas afecta.

**Independent Test**: Verificable de forma aislada llamando a `util.sumarDias(fecha, dias)` en
`test/util.fechas.test.js` (bloque "sumarDias (RN-18)"), contrastando con los vencimientos
reales grabados en `datos/gesfact.db` (`db.js`), sin tocar producción.

**Acceptance Scenarios**:

1. **Given** FA-2026-000104 con fecha `2026-03-05` y 30 días de pago,
   **When** se calcula el vencimiento, **Then** es `2026-04-04` (`db.js:145`).
2. **Given** FA-2026-000103 con fecha `2026-02-20` y 60 días de pago,
   **When** se calcula el vencimiento, **Then** es `2026-04-21` (`db.js:139`).
3. **Given** una fecha a final de mes `2026-01-31` y 30 días,
   **When** se suma, **Then** el resultado cruza el cambio de mes correctamente: `2026-03-02`
   (`db.js:126`, FA-2026-000101).

---

### User Story 2 - Días de pago por defecto = 30 cuando el cliente no los define (Priority: P2)

Cuando un cliente/contrato no tiene fijado un plazo de pago (`dias_pago` nulo), el sistema aplica
un plazo por defecto de **30 días** para calcular el vencimiento.

**Why this priority**: Es la ruta por defecto que aplica a la mayoría de clientes sin forma de
pago pactada. Determina el vencimiento de un gran volumen de facturas, aunque su valor sea fijo.

**Independent Test**: Verificable comprobando el defecto de configuración (`config.VENCIMIENTO_DIAS`)
y la expresión `dias_pago || 30` de la remesa, reproducidas contra `util.sumarDias` en
`test/util.fechas.test.js`.

**Acceptance Scenarios**:

1. **Given** un cliente con `dias_pago` nulo dado de alta por web,
   **When** se emite la factura, **Then** el plazo aplicado es `config.VENCIMIENTO_DIAS = 30`
   (`config.js:40`; `facturas.js:68`).
2. **Given** un contrato con `dias_pago` nulo en la remesa mensual,
   **When** la remesa emite la factura, **Then** el plazo aplicado es el literal `30`
   (`remesa_mensual.js:60`).

---

### User Story 3 - Anomalías conocidas del vencimiento y las fechas (Priority: P3)

El cálculo de vencimiento arrastra defectos conocidos que se **congelan y documentan**, no se
corrigen: el defecto de plazo está **duplicado** en dos sitios (A-05), la expresión `dias_pago || 30`
convierte el valor `0` ("contado") en 30 días (A-05b), y `sumarDias` tuvo un desfase de un día
por cambio de hora que **no se ha reproducido** (A-10).

**Why this priority**: Registrar estos defectos como comportamiento observable es obligación de
la fase. No cambian el importe, pero sí la fecha de vencimiento, y deben quedar trazados para la
modernización.

**Independent Test**: Verificable en `test/util.fechas.test.js` congelando `sumarDias` sin desfase
reproducible (A-10) y documentando en la spec que el borde `dias_pago = 0` (A-05b) queda sin
caracterizar por no existir hoy factura de contado en los datos.

**Acceptance Scenarios**:

1. **Given** el defecto de plazo definido en `config.VENCIMIENTO_DIAS` (alta web) y como literal
   `30` (remesa), **When** se comparan ambos, **Then** hoy coinciden (30 = 30) y la duplicidad es
   **accidental** (A-05): un cambio futuro en `config` no propagaría a la remesa.
2. **Given** un `dias_pago = 0` (intención "contado"), **When** se evalúa `dias_pago || 30`,
   **Then** el sistema aplica **30 días**, no 0 (A-05b, BUG A SECAS).
3. **Given** un intervalo que cruza el cambio de hora de primavera (último domingo de marzo),
   **When** se llama a `util.sumarDias`, **Then** hoy produce la fecha natural correcta sin
   desfase reproducible; el borde se **congela sin forzarlo** (A-10, incidente marzo 2019).

---

### Edge Cases

- **Fin de mes / fin de año / bisiesto**: `sumarDias` delega el cálculo del calendario en el
  objeto de fecha nativo; cruza correctamente fin de mes (`2026-01-31 + 30 = 2026-03-02`), fin de
  año (`2026-12-31 + 1 = 2027-01-01`) y años bisiestos (`2024-02-28 + 1 = 2024-02-29`).
- **Sumar 0 días**: `dias = 0` devuelve la misma fecha (`2026-03-31 + 0 = 2026-03-31`). Nótese
  que esto es un plazo **explícito** de 0; distinto de A-05b, donde `dias_pago = 0` se transforma
  en 30 **antes** de llamar a `sumarDias`.
- **`dias_pago = 0` (contado)**: por `0 || 30` nunca llega un 0 a `sumarDias` desde la ruta de
  vencimiento; el cliente que quiere contado obtiene 30 días (A-05b).
- **Cambio de hora**: el desfase de A-10 no se reproduce con las entradas actuales; se congela el
  comportamiento correcto de hoy, sin forzar el borde.
- **Fecha vacía / nula en `fechaBonita`**: devuelve cadena vacía `""` (`util.js:29-33`).

## Requirements *(mandatory)*

### Functional Requirements

- **RN-18 · Vencimiento = fecha de factura + días de pago**: El sistema MUST calcular el
  vencimiento como `sumarDias(fecha_factura, dias_pago)`, sumando días naturales a la fecha de la
  factura (`util.sumarDias`, `util.js:20-26`; uso en `facturas.js:69` y `remesa_mensual.js:60`).
  Casos reales: `2026-03-05 + 30 = 2026-04-04` (`db.js:145`); `2026-02-20 + 60 = 2026-04-21`
  (`db.js:139`).
- **RN-19 · Plazo por defecto de 30 días**: Cuando `dias_pago` es nulo/ausente, el sistema MUST
  aplicar **30 días**. En el alta web procede de `config.VENCIMIENTO_DIAS = 30` (`config.js:40`,
  usado en `facturas.js:68`); en la remesa procede del literal `30` en `dias_pago || 30`
  (`remesa_mensual.js:60`).
- **FR-A05 · Defecto duplicado (A-05, ACCIDENTAL)**: El sistema MUST preservar que el plazo por
  defecto está definido en **dos lugares independientes** — `config.VENCIMIENTO_DIAS` (alta web) y
  un literal `30` (remesa) — que hoy coinciden por casualidad. Se documenta como anomalía
  **accidental**; no se unifica en esta fase. D-05 (SIMULADA a ratificar) propone unificar en
  `config`.
- **FR-A05b · `dias_pago = 0` → 30 (A-05b, BUG A SECAS)**: El sistema MUST preservar que, por la
  expresión `dias_pago || 30`, un valor `0` (intención "contado") se convierte en **30 días**
  (`facturas.js:68`, `remesa_mensual.js:60`). Se documenta como bug; no se corrige. D-05
  (SIMULADA a ratificar) fija que `0` = contado y debe respetarse tras unificar en `config`.
- **FR-A10 · Desfase por cambio de hora (A-10, BUG A SECAS)**: El sistema MUST preservar el
  comportamiento actual de `sumarDias`, que usa milisegundos absolutos (`getTime() + dias·86 400 000`)
  y por tanto es sensible teóricamente al cambio de hora (`util.js:20-26`, incidente marzo 2019
  **no reproducido**). Se documenta como bug; D-09 (SIMULADA a ratificar) fija corregirlo "por
  higiene, sin urgencia". El borde se **congela sin forzarlo**.
- **FR-FMT · Formato de fecha para pantalla e impresión**: El sistema MUST convertir `YYYY-MM-DD`
  a `DD/MM/YYYY` en pantalla e impresión, devolviendo `""` para valores vacíos/nulos
  (`util.fechaBonita`, `util.js:29-33`).

### Key Entities *(include if feature involves data)*

- **Factura (`facturas`)**: entre otros campos, `fecha` (fecha de emisión, `YYYY-MM-DD`) y
  `vencimiento` (fecha calculada). El vencimiento se calcula **una vez al emitir** y se persiste;
  no se recalcula al leer.
- **Cliente (`clientes`)**: `dias_pago` (entero, nullable). Nulo → 30 por defecto (RN-19). `0` →
  30 por A-05b.
- **Contrato (`contratos`)**: `dias_pago` usado por la remesa con la misma regla `|| 30`.
- **Configuración (`config.js`)**: `VENCIMIENTO_DIAS = 30`, defecto del alta web (A-05: no
  compartido con la remesa).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El 100 % de las facturas reales usadas como referencia (FA-2026-000104,
  FA-2026-000103, FA-2026-000101) reproducen su `vencimiento` grabado en la BD aplicando RN-18,
  verificado en `test/util.fechas.test.js`.
- **SC-002**: Toda factura sin plazo de pago pactado obtiene exactamente 30 días de vencimiento
  (RN-19), en ambas rutas (alta web y remesa), sin excepción.
- **SC-003**: Las tres anomalías del dominio (A-05, A-05b, A-10) quedan documentadas con su
  evidencia y su decisión (D-05, D-09) SIMULADA a ratificar, y **ninguna** se corrige en esta
  fase (0 cambios en código de producción).
- **SC-004**: `sumarDias` produce el resultado natural correcto para los bordes de fin de mes,
  fin de año y bisiesto verificados en `test/util.fechas.test.js`, sin desfase reproducible en el
  cambio de hora.

## Assumptions

- **D-05 y D-09 están SIMULADAS**: se citan como tratamiento futuro propuesto, pendiente de
  ratificación escrita por el negocio. No autorizan ningún cambio de código en esta fase.
- **A-05b sin caracterización directa**: no consta hoy en `datos/gesfact.db` una factura con
  `dias_pago = 0`, por lo que el borde "contado → 30" se documenta y razona por lectura de código
  (`0 || 30`), no por un caso real congelado. Verificable como test de la expresión, no de un dato.
- **A-10 no reproducible**: el desfase de un día del incidente de marzo de 2019 no se ha logrado
  reproducir con las entradas actuales; el criterio de aceptación congela el comportamiento
  correcto de hoy y no fuerza el borde.
- **El vencimiento se calcula al emitir y se persiste**: cualquier cambio posterior en `dias_pago`
  del cliente no reescribe vencimientos ya grabados.

## Fuera de alcance

- **Vencimiento nulo de la factura rectificativa** → **Spec 004** (numeración y ciclo de vida).
- **IVA / importe por defecto** → **Spec 007**.
- **Rango de fechas del trimestre en el informe (A-11)** → **Spec 008**.

# Especificación de característica: Recargo de equivalencia

**Feature Branch**: `003-recargo-equivalencia`

**Created**: 2026-07-07

**Status**: Draft

**Input**: User description: "Spec de ingeniería inversa: documenta el comportamiento EXISTENTE del recargo de equivalencia. RN-06 tabla por tipo de IVA, RN-07 solo si cliente marcado, RN-08 tipos antiguos conservados, RN-09/A-16 tipo desconocido → recargo 0 en silencio y `===` rechaza `'21'`."

> **Naturaleza de esta especificación (ingeniería inversa).** No describe una característica
> nueva: es la **especificación formal del comportamiento que el sistema YA tiene**, para que
> sirva de contrato durante la modernización. Rige la constitución del proyecto (v1.0.0): el
> **comportamiento observable actual es la especificación** (Principio I), **toda afirmación
> lleva evidencia** (Principio II) y los **hallazgos se registran, no se corrigen** en esta fase
> (Principio III). Cuando aquí se lee "el sistema DEBE", significa "el sistema HACE HOY, y ese
> comportamiento queda congelado hasta que el negocio decida por escrito cambiarlo".

## Alcance

**Dentro de alcance**: el cálculo de la **cuota de recargo de equivalencia** de cada línea de
factura — su tabla de porcentajes por tipo de IVA (incluidos los tipos antiguos latentes), la
condición que la activa (marca del cliente) y su comportamiento ante tipos de IVA no reconocidos.

**Fuera de alcance**:

- El **IVA por defecto** al dar de alta artículos/clientes y su anomalía asociada A-09 →
  **Spec 007**.
- El **redondeo** de la cuota de recargo a 2 decimales (`redondear2`) y sus bordes (anomalía
  A-21) → **Spec 001** (aritmética fiscal). Aquí se asume el redondeo tal como Spec 001 lo
  caracteriza; los ejemplos lo aplican sin redefinirlo.
- El **desglose e impresión** del recargo en el detalle de factura y en informes.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Cliente en recargo de equivalencia factura con su recargo (Priority: P1)

Suministros Hidalgo vende a clientes minoristas acogidos al régimen de recargo de equivalencia
(p. ej. Ferretería El Tornillo). A esos clientes, cada línea de factura debe llevar, además del
IVA, la **cuota de recargo** correspondiente a su tipo de IVA, para que la gestoría reconcilie
el importe céntimo a céntimo.

**Why this priority**: es el motivo de existir de esta regla; sin ella las facturas de los
clientes en recargo son fiscalmente incorrectas y la gestoría las rechaza.

**Independent Test**: verificable de forma aislada calculando la factura de un cliente marcado
con `recargo_equivalencia = 1` y comprobando que cada línea suma su cuota de recargo. Cubierto
por `test/calculo.factura.test.js` (FA-2026-000102) y por el golden master (FA-102).

**Acceptance Scenarios**:

1. **Given** un cliente marcado con recargo y una línea de base 74,00 € al 21 %, **When** se
   calcula la línea, **Then** su cuota de recargo es `74,00 × 5,2/100 = 3,848 → 3,85 €`
   (evidencia: `db.js:133`).
2. **Given** un cliente marcado con recargo y varias líneas al 21 %, **When** se calcula la
   factura completa (FA-2026-000102), **Then** el recargo total es 6,01 € y el total 145,91 €
   (evidencia: `test/calculo.factura.test.js:28-31`; nota A-22 sobre la cabecera grabada).

---

### User Story 2 - Cliente sin recargo no lleva recargo alguno (Priority: P1)

La mayoría de clientes (cafeterías, restaurantes, hoteles) **no** están en recargo de
equivalencia. Sus facturas no deben incluir ninguna cuota de recargo.

**Why this priority**: aplicar recargo a quien no corresponde es un error fiscal simétrico al
anterior; ambos casos son igual de críticos.

**Independent Test**: calcular la factura de un cliente con `recargo_equivalencia = 0` (o cliente
ausente) y comprobar que todas las líneas tienen cuota de recargo 0 y el recargo total es 0.
Cubierto por `test/calculo.factura.test.js:35-50`.

**Acceptance Scenarios**:

1. **Given** un cliente con `recargo_equivalencia = 0` y una línea de 100 € al 21 %, **When** se
   calcula la factura, **Then** el recargo es 0 y el total 121 €.
2. **Given** un cliente ausente (`null`), **When** se calcula la factura, **Then** se trata como
   sin recargo (recargo 0).
3. **Given** los datos iniciales, **When** se factura al cliente 1 (sin recargo), **Then** todas
   sus líneas se graban con `cuota_recargo = 0` (evidencia: `db.js:126-130`); el cliente 2 (con
   recargo) sí lleva recargo en FA-2026-000102 (evidencia: `db.js:132-136`).

---

### User Story 3 - Tipo de IVA desconocido no aporta recargo (comportamiento congelado, A-16) (Priority: P2)

Cuando el tipo de IVA de una línea no está en la tabla reconocida, el sistema devuelve un recargo
de **0 sin ningún aviso**. Además, la comparación es estricta (`===`): un tipo pasado como cadena
(p. ej. `'21'`) se considera desconocido y también da recargo 0.

**Why this priority**: es un comportamiento **frágil ya registrado (A-16)**. En esta fase se
documenta y se congela tal cual; no se corrige. Se prioriza P2 porque hoy ningún dato real
dispara el caso, pero cualquier cambio silencioso alteraría comportamiento observable.

**Independent Test**: llamar al cálculo de recargo con un tipo fuera de tabla y con un tipo en
forma de cadena, y comprobar que ambos dan 0. Cubierto por `test/anomalias.test.js:28-36` (A-16).

**Acceptance Scenarios**:

1. **Given** una línea con tipo de IVA 5 o 25 (no en tabla), **When** se calcula el recargo,
   **Then** el recargo es 0 y **no se emite ningún aviso ni error** (evidencia:
   `services/calculo.js:22`, `test/anomalias.test.js:28-31`).
2. **Given** el tipo de IVA 21 pasado como cadena `'21'`, **When** se calcula el recargo,
   **Then** el recargo es 0 porque la comparación es `===` (evidencia:
   `services/calculo.js:13`, `test/anomalias.test.js:33-36`); el número 21 sí da 5,2.

---

### Edge Cases

- **Tipo de IVA reconocido pero con cliente sin recargo**: la cuota de recargo es 0 aunque el
  tipo sí tenga porcentaje en tabla; manda la marca del cliente (RN-07).
- **Marca del cliente como cadena `'1'`**: la comparación es `== 1` (no `===`), así que la cadena
  `'1'` **sí** activa el recargo (evidencia: `services/calculo.js:49`,
  `test/calculo.factura.test.js:52-60`). Congelado como está.
- **Tipos antiguos (18/16/8/7)**: tienen porcentaje en tabla (RN-08) pero ningún dato real de
  producción los usa; son código latente "por si hay que reabrir ejercicios del Access".
- **Tipo de IVA 0** (exento) o negativo: no está en tabla → recargo 0 en silencio (caso de A-16).

## Requirements *(mandatory)*

### Functional Requirements

- **RN-06 (FR-001) · Tabla de recargo por tipo de IVA vigente**: el sistema DEBE calcular la
  cuota de recargo aplicando, según el tipo de IVA de la línea, los porcentajes: **21 → 5,2 %**,
  **10 → 1,4 %**, **4 → 0,5 %**. La cuota es `base × porcentaje/100` (redondeo según Spec 001).
  Evidencia: `services/calculo.js:12-15`; ejemplo base 74,00 al 21 % → 3,85 € (`db.js:133`).

- **RN-07 (FR-002) · El recargo solo se aplica si el cliente está marcado**: el sistema DEBE
  aplicar recargo **únicamente** cuando el cliente cumple `recargo_equivalencia == 1`; en
  cualquier otro caso (0, ausente/`null`) la cuota de recargo de todas las líneas DEBE ser 0. La
  comparación es débil (`== 1`), de modo que la cadena `'1'` también activa el recargo. Evidencia:
  `services/calculo.js:49`; cliente 1 sin recargo (`db.js:126-130`), cliente 2 con recargo
  (`db.js:97`, `db.js:132-136`).

- **RN-08 (FR-003) · Tipos de IVA antiguos conservados**: el sistema DEBE conservar los
  porcentajes de recargo de los tipos antiguos: **18 → 4 %**, **16 → 4 %**, **8 → 1 %**,
  **7 → 1 %**. Es código latente para poder reabrir ejercicios antiguos del Access; ningún dato
  real actual los usa. Evidencia: `services/calculo.js:18-21`.

- **RN-09 / A-16 (FR-004) · Tipo desconocido → recargo 0 en silencio; `===` rechaza `'21'`**: el
  sistema, ante un tipo de IVA **no presente en la tabla** (RN-06/RN-08), DEBE devolver recargo
  **0 sin emitir aviso ni error**. La comparación del tipo es estricta (`===`), por lo que un
  tipo en forma de cadena (p. ej. `'21'`) se trata como **desconocido** y también da 0. Evidencia:
  `services/calculo.js:13-22`; `test/anomalias.test.js:28-36`.

  - **Clasificación y decisión de negocio**: la anomalía **A-16** queda **clasificada BUG A
    SECAS y CERRADA** por ratificación escrita **D-04 (Puri y Paco, 2026-07-07)**: el negocio
    decide que un tipo de IVA no reconocido **debe rechazarse** (no silenciarse). **Tratamiento en
    esta fase**: se **especifica el comportamiento ACTUAL** (recargo 0 sin aviso; `'21'` tratado
    como desconocido) y se **congela** con test; la corrección (rechazo explícito, aceptar el tipo
    numérico) es trabajo de la **modernización**, **no retroactivo** sobre facturas ya emitidas.

### Key Entities *(include if feature involves data)*

- **Línea de factura**: unidad sobre la que se calcula el recargo. Atributos relevantes: `base`
  (importe base ya redondeado), `tipo_iva` (numérico) y `cuota_recargo` (resultado, ya
  redondeada y grabada). Evidencia: esquema `lineas` y `db.js:124`.
- **Cliente**: portador de la marca `recargo_equivalencia` (0/1) que activa o no el recargo de
  todas sus líneas. Evidencia: esquema `clientes`, `db.js:95-101`.
- **Tabla de recargo por tipo de IVA**: correspondencia tipo → porcentaje, con tipos vigentes
  (RN-06) y antiguos latentes (RN-08); todo tipo fuera de ella → 0 (RN-09/A-16). Evidencia:
  `services/calculo.js:12-23`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: para un cliente en recargo, cada línea al 21 %/10 %/4 % lleva exactamente su cuota
  de recargo al 5,2 %/1,4 %/0,5 % de la base, reconciliable céntimo a céntimo por la gestoría
  (verificado por FA-2026-000102 y golden master FA-102).
- **SC-002**: el 100 % de las líneas de clientes no marcados (o cliente ausente) tienen cuota de
  recargo 0 (verificado por `test/calculo.factura.test.js:35-50`).
- **SC-003**: un tipo de IVA no reconocido produce recargo 0 sin aviso, y el tipo `'21'` (cadena)
  produce 0 mientras el 21 (número) produce 5,2 — comportamiento congelado y detectable ante
  cualquier cambio (verificado por `test/anomalias.test.js:28-36`).
- **SC-004**: cualquier modificación de la tabla de porcentajes, de la condición de activación o
  del tratamiento de tipos desconocidos hace **fallar** al menos un test de caracterización, de
  modo que ningún cambio de este comportamiento pasa inadvertido.

## Assumptions

- El **redondeo** de la cuota de recargo a 2 decimales se rige por la **Spec 001**; aquí se
  aplica sin redefinirlo. El ejemplo `3,848 → 3,85` asume ese redondeo.
- La marca `recargo_equivalencia` es un entero 0/1 en el modelo de datos; la tolerancia a la
  cadena `'1'` (por `== 1`) se documenta como comportamiento actual, no como diseño deseado.
- Ningún dato real de producción usa hoy los tipos antiguos (RN-08) ni dispara el caso de tipo
  desconocido (RN-09/A-16); se congelan por prudencia, no porque se ejerciten en producción.
- Los criterios de aceptación se verifican contra `test/anomalias.test.js` (A-16),
  `test/calculo.factura.test.js` (cliente con recargo) y el golden master (FA-102), sin tocar el
  estado de producción (Principio IV de la constitución).

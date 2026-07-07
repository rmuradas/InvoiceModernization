# Feature Specification: Datos maestros — validación de NIF, IVA por defecto y normalización de importes

**Feature Branch**: `007-datos-maestros-validacion`

**Created**: 2026-07-07

**Status**: Draft

**Input**: User description: "Spec de ingeniería inversa de datos maestros (clientes y artículos): validación de NIF, IVA por defecto y normalización de importes de entrada. No es una feature nueva: es la especificación formal de lo que el sistema YA hace, para que sirva de contrato en la modernización."

---

## Naturaleza de esta especificación *(leer primero)*

Esta **NO** es una especificación de una funcionalidad nueva. Es una **especificación de
ingeniería inversa**: documenta, con evidencia, el **comportamiento observable actual** de GesFact
2.4 en la entrada y validación de datos maestros (clientes y artículos), para que sirva de
**contrato** en una futura modernización.

Rige la [constitución del proyecto](../../.specify/memory/constitution.md): el comportamiento
actual es sagrado (Principio I), toda afirmación lleva evidencia (Principio II) y los hallazgos se
**registran, no se corrigen** (Principio III). Las anomalías referenciadas (A-07, A-08, A-09, A-12)
pertenecen al registro de anomalías; aquí se congelan como contrato, **no** se proponen soluciones
salvo como decisión de negocio citada por acta.

**Estado de las decisiones citadas**: D-06, D-08 y D-11 están marcadas **SIMULADAS — a ratificar**
por el negocio (no proceden de acta real). D-19 es una decisión técnica. Ninguna decisión autoriza
por sí sola cambiar comportamiento observable en esta fase (constitución, Principio I).

---

## User Scenarios & Testing *(mandatory)*

Los "usuarios" aquí son **Marga** (administración, da de alta clientes y artículos) y quien graba
facturas manualmente. Los escenarios describen lo que el sistema **hace hoy** ante esas entradas.

### User Story 1 - Validación de NIF solo por longitud (Priority: P1)

Al dar de alta un cliente, el sistema acepta el NIF/CIF **si y solo si**, tras eliminar espacios y
guiones, la cadena tiene **exactamente 9 caracteres**. No comprueba la letra de control, ni el
formato, ni distingue mayúsculas/minúsculas. El control real de validez lo ejerce **Marga
revisándolo a mano** (control compensatorio, `lib/util.js:42-43`).

**Why this priority**: Es la regla de negocio más visible y la que la modernización más
probablemente querrá endurecer; congelarla como contrato evita que un cambio silencioso rechace
NIF que hoy se aceptan (o acepte los que hoy se rechazan). Cubierta por RN-20 / anomalía **A-12**.

**Independent Test**: Verificable de forma aislada contra `test/util.nif.test.js`, invocando
`validarNIF` con los NIF reales de `datos/gesfact.db` (`db.js:97,101`) y con cadenas de longitud
distinta de 9.

**Acceptance Scenarios**:

1. **Given** el NIF real `70355910k` (letra en minúscula, cliente "Bar Nuevo Siglo", `db.js:101`),
   **When** se valida, **Then** se **acepta** (9 caracteres).
2. **Given** el NIF real `03488812K` (cliente "Ferretería El Tornillo", `db.js:97`),
   **When** se valida, **Then** se **acepta** (9 caracteres).
3. **Given** una cadena sin sentido de 9 caracteres (`XXXXXXXXX`, `123456789`),
   **When** se valida, **Then** se **acepta** (el sistema no comprueba la letra de control).
4. **Given** una cadena de 8 caracteres (p. ej. `B4581239`),
   **When** se valida, **Then** se **rechaza**.
5. **Given** una cadena vacía, `null` o `undefined`,
   **When** se valida, **Then** se **rechaza**.
6. **Given** `123-456-789` (guiones) o `12345 6789` (espacio),
   **When** se valida, **Then** se **acepta**, porque el sistema elimina espacios y guiones
   **antes** de contar los 9 caracteres (`lib/util.js:46`).

---

### User Story 2 - IVA por defecto al no indicar tipo (Priority: P2)

Al dar de alta un **artículo** sin indicar tipo de IVA, el sistema aplica `config.IVA_DEFECTO`
(= 21, `config.js:25`, usado en `routes/articulos.js:16`). Al dar de alta un **contrato** sin
indicar tipo de IVA, el sistema aplica el literal **21** escrito en el código
(`routes/contratos.js:20`), **no** `config.IVA_DEFECTO`. La columna `contratos.tipo_iva` además
tiene `DEFAULT 21` en el esquema (`db.js:46`). Hoy los tres coinciden en 21, por lo que la
duplicación **no produce diferencia observable** (anomalía **A-09**, ACCIDENTAL: 21 = 21).

**Why this priority**: El valor por defecto afecta a cada artículo y contrato que se dé de alta sin
tipo explícito. La duplicación es latente: hoy inocua, pero si un día se cambiara el IVA por
defecto en `config` sin tocar `contratos.js`, artículos y contratos divergirían. Congelarlo
documenta el contrato actual y la latencia.

**Independent Test**: Verificable dando de alta un artículo y un contrato sin tipo de IVA y
comprobando que ambos reciben 21; y por inspección de que `contratos.js:20` usa un literal, no
`config.IVA_DEFECTO`.

**Acceptance Scenarios**:

1. **Given** un alta de artículo **sin** `tipo_iva`, **When** se graba, **Then** el artículo queda
   con `tipo_iva = 21` (procedente de `config.IVA_DEFECTO`).
2. **Given** un alta de contrato **sin** `tipo_iva`, **When** se graba, **Then** el contrato queda
   con `tipo_iva = 21` (procedente del literal en `contratos.js:20`, no de `config`).
3. **Given** el valor actual `config.IVA_DEFECTO = 21` **y** el literal `21` en contratos,
   **When** se comparan, **Then** coinciden y no hay diferencia observable (A-09 ACCIDENTAL).

---

### User Story 3 - Normalización de coma decimal en importes de entrada (Priority: P1)

Al grabar importes tecleados (precio de artículo, cuota de contrato, cantidad y precio de líneas de
factura), el sistema los normaliza con `parseFloat(('' + x).replace(',', '.'))` en tres sitios
independientes (`routes/facturas.js:59-60`, `routes/contratos.js:19`, `routes/articulos.js:19`).
`replace(',', '.')` sustituye **solo la primera coma**. Por eso una entrada con separador de miles
como `1.234,56` se transforma en `1.234.56`, que `parseFloat` lee como **`1.234`** (truncado al
primer punto). Es un **BUG a secas** (anomalía **A-08**), pero es el comportamiento observable
actual y por tanto el contrato.

**Why this priority**: Toca importes reales que la gestoría reconcilia céntimo a céntimo. Cualquier
cambio en la normalización altera salidas sagradas. Debe congelarse con un test dedicado, porque
hoy A-08 vive **inline en las rutas**, no en `lib/util`, y no tiene test propio.

**Independent Test**: Verificable con un test nuevo que congele la transformación inline actual:
la cadena `"1.234,56"` normalizada según `parseFloat(('' + x).replace(',', '.'))` produce `1.234`.

**Acceptance Scenarios**:

1. **Given** el importe tecleado `1234,56` (coma decimal, sin miles),
   **When** se normaliza, **Then** produce `1234.56` (comportamiento correcto en el caso común).
2. **Given** el importe tecleado `1.234,56` (punto de miles + coma decimal),
   **When** se normaliza, **Then** produce **`1.234`** (truncado; solo se sustituye la primera
   coma y `parseFloat` corta en el segundo punto).
3. **Given** el importe tecleado `50` (entero, sin coma),
   **When** se normaliza, **Then** produce `50`.

---

### Edge Cases

- **NIF con caracteres internos raros de longitud 9** (p. ej. `!!!!!!!!!`): se **acepta**, el
  sistema solo cuenta longitud. El control es humano (Marga).
- **Importe con `NaN` en alta de factura**: si `cantidad` o `precio` no parsean, `parseFloat`
  devuelve `NaN` y hoy el alta de factura **no lo valida** antes de calcular
  (`routes/facturas.js:59-62`). Es la anomalía **A-07** (BUG a secas). El comportamiento observable
  actual —propagar `NaN` sin rechazo explícito en ese punto— queda congelado como contrato; su
  corrección es técnica (D-19) y pertenece a una fase posterior. *(Nota: no se define aquí el
  efecto aguas abajo del `NaN` en el cálculo fiscal; eso pertenece a la **Spec 001**.)*
- **Importe negativo tecleado** (p. ej. `-10`): se normaliza y parsea como número negativo; no hay
  validación de signo en la entrada de datos maestros.
- **IVA tecleado con tipo antiguo** (18/16/8/7): se acepta tal cual vía `parseInt`; el defecto 21
  solo aplica cuando **no** se indica tipo.

---

## Requirements *(mandatory)*

Cada requisito describe comportamiento **actual** con su evidencia. "MUST" = "el sistema hoy hace".

### Functional Requirements

- **FR-001** (RN-20 / A-12): El sistema DEBE aceptar un NIF/CIF si y solo si, tras eliminar
  espacios (`\s`) y guiones (`-`), la cadena resultante tiene exactamente 9 caracteres
  (`lib/util.js:44-48`). No comprueba letra de control, formato ni mayúsculas/minúsculas.
- **FR-002** (A-12): El sistema DEBE rechazar como NIF una entrada vacía, `null` o `undefined`
  (`lib/util.js:45`), y cualquier cadena cuya longitud normalizada sea distinta de 9.
- **FR-003** (A-12): El control de validez real del NIF DEBE seguir siendo el **control manual de
  Marga** (`lib/util.js:42-43`), documentado como control compensatorio; la validación automática
  es ACCIDENTAL y no sustituye a la revisión humana.
- **FR-004** (A-09): Al alta de **artículo** sin tipo de IVA, el sistema DEBE aplicar
  `config.IVA_DEFECTO` (= 21) (`routes/articulos.js:16`, `config.js:25`).
- **FR-005** (A-09): Al alta de **contrato** sin tipo de IVA, el sistema DEBE aplicar el literal
  `21` codificado en `routes/contratos.js:20` (no `config.IVA_DEFECTO`), coincidente con el
  `DEFAULT 21` del esquema (`db.js:46`). Hoy los tres valores coinciden en 21, sin diferencia
  observable.
- **FR-006** (A-08): Al grabar un importe tecleado (precio de artículo, cuota de contrato, cantidad
  y precio de línea de factura), el sistema DEBE normalizarlo mediante
  `parseFloat(('' + x).replace(',', '.'))` (`routes/facturas.js:59-60`, `routes/contratos.js:19`,
  `routes/articulos.js:19`), que sustituye **solo la primera coma** por punto.
- **FR-007** (A-08): Como consecuencia de FR-006, el sistema DEBE transformar una entrada con
  separador de miles y coma decimal `1.234,56` en el número **`1.234`** (truncado). Este es el
  comportamiento observable actual y se congela como contrato.
- **FR-008** (A-07): Al alta de factura, el sistema DEBE construir las líneas con
  `cantidad`/`precio` normalizados **sin validar `NaN`** en ese punto (`routes/facturas.js:59-62`);
  el comportamiento observable actual (propagar `NaN` sin rechazo explícito allí) queda congelado.

### Decisiones de negocio referenciadas *(citadas, no ejecutadas en esta fase)*

- **D-06** (SIMULADA — a ratificar): en la práctica no se teclean separadores de miles, por lo que
  A-08 rara vez se manifiesta; la modernización debería extraer un `util.parseImporte` único. **No
  se aplica en esta fase.**
- **D-08** (SIMULADA — a ratificar): unificar el IVA por defecto en `config`, de modo que un cambio
  afecte también a contratos. **No se aplica en esta fase.**
- **D-11** (SIMULADA — a ratificar): basta el control manual de Marga; validar la letra del NIF es
  deseable pero no urgente. **No se aplica en esta fase.**
- **D-19** (técnica): la ausencia de validación de `NaN` (A-07) es una corrección técnica para una
  fase posterior. **No se aplica en esta fase.**

### Key Entities *(include if feature involves data)*

- **Cliente**: entidad maestra dada de alta por administración. Atributo relevante para esta spec:
  `nif` (validado solo por longitud). Ejemplos reales: `70355910k`, `03488812K`, `J45771102`,
  `B45610021` (`db.js:96-101`).
- **Artículo**: entidad maestra con `tipo_iva` (defecto `config.IVA_DEFECTO` = 21) y `precio`
  (normalizado con la coma decimal).
- **Contrato**: entidad maestra con `tipo_iva` (defecto literal 21) y `cuota` (normalizada con la
  coma decimal).
- **Línea de factura (entrada)**: `cantidad` y `precio` tecleados y normalizados en el alta de
  factura; su cálculo fiscal pertenece a la Spec 001.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El 100 % de los NIF reales de `datos/gesfact.db` (`db.js:96-101`) producen el mismo
  veredicto de `validarNIF` que hoy (todos aceptados), verificado por `test/util.nif.test.js`.
- **SC-002**: Toda cadena cuya longitud normalizada (sin espacios ni guiones) sea distinta de 9 es
  rechazada, y toda cadena de longitud 9 es aceptada, sin excepción, verificado por los casos de
  `test/util.nif.test.js`.
- **SC-003**: Un artículo y un contrato dados de alta sin tipo de IVA reciben ambos el valor 21, de
  forma reproducible.
- **SC-004**: La entrada `"1.234,56"` normalizada con la fórmula inline actual produce
  invariablemente `1.234`, congelado por un test dedicado nuevo (hoy inexistente, porque A-08 vive
  inline en las rutas y no en `lib/util`).
- **SC-005**: Ninguna salida observable (importes, IVA aplicado, aceptación/rechazo de NIF) cambia
  respecto al comportamiento actual como resultado de esta especificación (es un contrato, no un
  cambio).

---

## Assumptions

- **Decisiones SIMULADAS**: D-06, D-08 y D-11 no proceden de un acta real; se citan como hipótesis
  a ratificar por el negocio. Si al ratificarlas cambiara su contenido, se actualizará esta spec.
  Su ratificación no autoriza por sí misma a cambiar comportamiento en esta fase.
- **Control compensatorio de Marga**: se asume vigente (testimonio recogido en el comentario
  `lib/util.js:42-43`, firmado "Julian 11/2017"). Debe confirmarse con el negocio que la revisión
  manual de NIF sigue realizándose.
- **No se teclean miles** (base de D-06): se asume, a ratificar, que en la operativa real los
  importes se teclean sin separador de miles, por lo que A-08 rara vez aflora en producción.
- **Alcance de entrada, no de cálculo**: esta spec cubre la **entrada y normalización** del dato
  maestro. El efecto de un `NaN` o de un importe truncado **aguas abajo en el cálculo fiscal**
  pertenece a la Spec 001 y no se especifica aquí.

---

## Fuera de alcance

- **Tabla IVA ↔ recargo de equivalencia** y su cálculo → **Spec 003**.
- **Uso del IVA / precio en el cálculo de la factura** (aritmética fiscal, efecto de `NaN` o
  truncamiento aguas abajo) → **Spec 001**.
- **Baja lógica de cliente y prorrateo de su contrato** → **Spec 005**.
- Endurecer la validación de NIF (letra de control), unificar el IVA por defecto en `config` o
  extraer `util.parseImporte`: son **decisiones de modernización** (D-06/D-08/D-11) de una fase
  posterior, no de esta.

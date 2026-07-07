# Propuesta de partición en specs formales — GesFact 2.4

**Sistema:** GesFact 2.4, facturación en producción de Suministros Hidalgo, S.L. (Illescas, Toledo).
**Fase:** reconocimiento → puerta a especificación formal (ingeniería inversa). *Documentar y proteger,
no mejorar* (`.specify/memory/constitution.md`).
**Fecha:** 2026-07-07.
**Estado de la precondición:** ✅ **la lista de clasificaciones PENDIENTES del
[registro de anomalías](./registro-de-anomalias.md) está VACÍA.** A-01 y A-14 se cerraron en firme en el
[acta del 2026-07-07](./entrevista-negocio.md) (D-01, D-02); **A-15 y A-16 se cerraron por ratificación
escrita del 2026-07-07** (D-03 por Marga/Paco; D-04 por Puri/Paco). Las 22 anomalías tienen clasificación
cerrada.

> **Qué es este documento.** Reparte todo lo reconocido —reglas RN-*, hallazgos H-*, anomalías A-*,
> contradicciones y riesgos— en un conjunto de **specs por dominio de negocio**, y entrega para cada una su
> descripción **lista para lanzar con `/speckit-specify`**. **No ejecuta ningún `/speckit-specify`:** la
> propuesta se revisa y se aprueba antes de invertir.

---

# PARTE 1 — La partición

## Criterio de partición aplicado

- **Por dominio de negocio, nunca por fichero ni por capa.** Un dominio = un conjunto de reglas que el
  negocio decide junto y que puede evolucionar sin arrastrar a los demás. Por eso el "corazón fiscal"
  (`services/calculo.js`) **no** es una sola spec: dentro conviven tres dominios que el negocio decide por
  separado (aritmética de importes, descuentos comerciales, régimen de recargo) y que evolucionan a ritmos
  distintos.
- **Reparto de contradicciones (regla del encargo).** La convención declarada vigente va a la spec del
  dominio **dueño** de la regla; la implementación divergente se referencia como **anomalía** en la spec
  del **camino** que la usa. Se aplica sistemáticamente (ver §"Casos frontera").
- **Tamaño "de una sentada" (~30 min).** Cada spec cabe en una revisión de negocio. Donde el corazón fiscal
  habría dado una spec inabarcable, se divide; donde dos candidatas se citarían mutuamente en más de la
  mitad de sus requisitos, se fusionan (caso de numeración + ciclo de vida, ver §"Casos frontera").
- **Completitud.** Las 21 reglas y las 22 anomalías quedan asignadas. Lo excluido (riesgos puramente
  técnicos sin comportamiento de negocio) se justifica en §"Qué queda fuera".

## Mapa de dominios (8 specs)

| Nº | Spec (dominio) | Módulos que la evidencian | Dueño de negocio |
|----|----------------|---------------------------|------------------|
| 001 | **Aritmética fiscal de la factura** (redondeo, línea a línea, totalización) | `services/calculo.js:26-34,48-88`, `lib/util.js:5-7,51-58`, `views/informe_iva.ejs:5` | Puri (gestoría) + Julián |
| 002 | **Descuento comercial por volumen** | `services/calculo.js:38-43,63-84` | Paco (comercial) + Puri (desglose) |
| 003 | **Recargo de equivalencia** | `services/calculo.js:12-23,29-32,49` | Puri (gestoría) + Paco |
| 004 | **Numeración correlativa y ciclo de vida de la factura** (emitir, cobrar, rectificar) | `lib/numeracion.js`, `routes/facturas.js:41-164` | Puri (gestoría) + asesoría fiscal |
| 005 | **Cuotas de contrato y prorrateo / remesa mensual** | `services/calculo.js:90-102`, `scripts/remesa_mensual.js`, `routes/contratos.js` | Paco (doctrina comercial) + Puri |
| 006 | **Vencimiento y fechas** | `lib/util.js:17-39`, `config.js:39-40`, `scripts/remesa_mensual.js:60` | Marga (operativa) + Puri |
| 007 | **Datos maestros: clientes y artículos** (validación NIF, IVA por defecto, normalización de importes de entrada) | `routes/clientes.js`, `routes/articulos.js`, `routes/contratos.js:19-20`, `lib/util.js:44-48`, `config.js:24-25` | Marga (altas) + Paco |
| 008 | **Informes a la gestoría** (resumen de IVA trimestral, export CSV) | `routes/informes.js`, `views/informe_iva.ejs` | Puri (gestoría) |

**Fuera de las specs de comportamiento** (riesgos técnicos sin regla de negocio, ver §"Qué queda fuera"):
A-17, A-18, A-19, A-20 y los riesgos de infraestructura R10–R14 → van a un **anexo de deuda técnica /
plan de modernización**, no a una spec de comportamiento. A-03, A-04(parcial), A-07 son integridad
transaccional: se especifican como comportamiento actual dentro de su dominio, pero su corrección es
técnica.

---

## Detalle de cada spec

### Spec 001 — Aritmética fiscal de la factura

**Alcance (2-3 frases).** Cómo el sistema convierte cantidades y precios en importes de factura: el
redondeo a 2 decimales "de toda la vida", el cálculo **línea a línea** de base/IVA/recargo, y la
totalización que **suma líneas ya redondeadas** (nunca IVA sobre base total). Es el comportamiento
"sagrado" que la gestoría reconcilia céntimo a céntimo y cuyo cambio en 2019 hizo devolver el trimestre.

**Módulos que la evidencian.** `services/calculo.js:26-34` (`calcularLinea`), `:48-88` (`calcularFactura`,
pasadas y acumuladores), `lib/util.js:5-7` (`redondear2`), `:51-58` (`formatearImporte`).

**Reglas que le pertenecen.** RN-01 (redondeo medio arriba), RN-02 (línea a línea), RN-03 (totales suman
líneas redondeadas), RN-21 (formato de importe español). Hallazgos: H-1 (redondeo no universal en bordes).

**Anomalías que le pertenecen.**
- **A-21** — el redondeo "medio hacia arriba" NO es universal en bordes de coma flotante; la doctrina
  RN-01/H-1 describe mal lo que hace `Math.round`/`toFixed`. **Clasificación:** ACCIDENTAL (latente).
  **Tratamiento:** especificar tal cual (congelado por tests); corregir el *enunciado* de RN-01/H-1.
- **A-22** — las facturas de ejemplo de `db.js` (FA-103, FA-102) no son reproducibles por el motor.
  **Clasificación:** BUG A SECAS (en los datos, no en el motor). **Tratamiento:** especificar el motor tal
  cual (es lo correcto); regenerar datos en modernización (coordina con A-19, dominio 007/anexo).

**Characterization tests que la respaldan.** `test/util.redondeo.test.js` (RN-01 y A-21 congelado),
`test/calculo.linea.test.js` (RN-02, línea a línea), `test/util.formato.test.js` (RN-21, formato español),
`test/calculo.factura.test.js` (RN-03, totalización), `test/anomalias.test.js` (A-21, A-22), y el **golden
master** (caso `03-fa103-no-reproducible`). **Golden master: cubre** la totalización y el caso no
reproducible.

**Dueño natural.** **Puri** (gestoría, reconcilia línea a línea — aviso Julián/Puri mayo 2019,
`calculo.js:3-7`) + **Julián** (autor del redondeo).

---

### Spec 002 — Descuento comercial por volumen

**Alcance.** El descuento por volumen que fideliza a la hostelería: umbrales sobre la **base bruta** con
comparación **estricta** (`>`), aplicado **línea a línea sobre el precio** (no sobre el total) para que la
gestoría lo vea desglosado.

**Módulos que la evidencian.** `services/calculo.js:38-43` (`porcentajeDescuento`), `:53-58` (base bruta),
`:63-84` (segunda pasada: precio con descuento línea a línea).

**Reglas que le pertenecen.** RN-04 (umbral estricto: >1.000 → 2 %, >5.000 → 5 %; 1.000 justo NO
descuenta), RN-05 (descuento al precio, línea a línea, desglosado).

**Anomalías que le pertenecen.** Ninguna anomalía A-* propia. El borde estricto `>` es **regla protegida
INTENCIONAL**, no anomalía (testigos: CÓDIGO + NEGOCIO-doc Paco/Puri 2018 + DATOS FA-105). *Nota:* el
ejemplo canónico de RN-04 (FA-103, "base 1.000 justa") queda invalidado como dato por **A-22** (dominio
001): las líneas de FA-103 suman 1.000,02 bruto, no 1.000. La **regla** sigue viva; el **ejemplo** se
sustituye.

**Characterization tests que la respaldan.** `test/calculo.descuento.test.js` (RN-04: los tres puntos por
los dos lados de cada frontera, 1.000 y 5.000), `test/calculo.factura.test.js` (casos con y sin descuento),
golden master. **Golden master: cubre** el borde estricto vía un caso de base > 1.000.

**Dueño natural.** **Paco** (acuerdo comercial 2018, `calculo.js:38`) + **Puri** (desglose línea a línea,
`calculo.js:63-64`).

---

### Spec 003 — Recargo de equivalencia

**Alcance.** El recargo de equivalencia que se añade a los clientes marcados: porcentaje por tipo de IVA
(21→5,2 %, 10→1,4 %, 4→0,5 %, más tipos antiguos conservados), aplicado sobre la base de cada línea, y solo
si el cliente lo tiene activado.

**Módulos que la evidencian.** `services/calculo.js:12-23` (`recargoPara`, tabla y tipos antiguos),
`:29-32` (aplicación en `calcularLinea`), `:49` (`conRecargo = cliente.recargo_equivalencia == 1`).

**Reglas que le pertenecen.** RN-06 (tabla de recargo por tipo), RN-07 (solo si cliente marcado), RN-08
(tipos antiguos 16/18/7/8 conservados), RN-09 (tipo desconocido → recargo 0). Hallazgo H-2.

**Anomalías que le pertenecen.**
- **A-16** — tipo de IVA desconocido → recargo 0 en silencio; `===` estricto rechaza `'21'` como cadena.
  **Clasificación:** BUG A SECAS (**CERRADA** por ratificación escrita D-04, Puri/Paco 2026-07-07).
  **Tratamiento:** especificar el comportamiento ACTUAL tal cual (recargo 0 silencioso; `'21'` tratado como
  desconocido); en modernización, **corregir** rechazando el tipo no reconocido y arreglando el `===`. No
  retroactivo.

**Characterization tests que la respaldan.** `test/calculo.recargo.test.js` (RN-06/08/09, incluida la
comparación estricta `===`), `test/anomalias.test.js` (A-16), `test/calculo.factura.test.js` (líneas con
recargo, cliente 2). **Golden master: cubre** una factura de cliente con recargo (FA-102).

**Dueño natural.** **Puri** (gestoría, encuadre fiscal del recargo) + **Paco**.

---

### Spec 004 — Numeración correlativa y ciclo de vida de la factura

**Alcance.** Cómo nace, se cobra y se rectifica una factura, y cómo obtiene su número correlativo por serie
y año sin huecos (obligación legal desde la inspección de 2020). Incluye los tres estados (`emitida` →
`cobrada` → `rectificada`), la rectificativa como **espejo exacto sin recalcular** (serie `RE`, signos
invertidos), y que las facturas **no se borran nunca**.

**Módulos que la evidencian.** `lib/numeracion.js` (completo: `siguienteNumero`, `reservar`, `formatear`),
`routes/facturas.js:41-102` (alta), `:105-121` (detalle/cobro), `:124-164` (rectificación).

**Reglas que le pertenecen.** RN-14 (correlativa por serie y año, sin huecos), RN-15 (contador de año nuevo
a cero), RN-16 (formato SERIE-AAAA-NNNNNN), RN-17 (reserva no atómica). Regla protegida "rectificativa =
espejo exacto sin recalcular". Hallazgos H-6, H-7.

**Anomalías que le pertenecen.**
- **A-02** — reserva de número no atómica (posibles duplicados). **Clasificación:** BUG HISTÓRICO CON
  DEPENDIENTES (dependencia legal). **Tratamiento:** especificar el comportamiento actual; corregir con
  reserva atómica en modernización, no retroactivo (D-14, concurrencia real = 2 usuarios).
- **A-03** — alta sin transacción: cabecera y líneas sueltas. **Clasificación:** BUG HISTÓRICO CON
  DEPENDIENTES. **Tratamiento:** corrección técnica (D-19, envolver en transacción).
- **A-04** — rectificativa sin transacción, error de línea silenciado, y marca `rectificada` aun con espejo
  a medias. **Clasificación:** BUG HISTÓRICO CON DEPENDIENTES. **Tratamiento:** especificar comportamiento
  actual; corregir (D-13, rechazar todo y avisar; mantener espejo exacto). Respuesta D-13 SIMULADA
  pendiente de ratificar (afecta al tratamiento, no a la clasificación).
- **A-13** — grabado de factura escrito 3 veces (paralelo/paralelo/secuencial) con integridad y orden de
  líneas divergentes. **Clasificación:** ACCIDENTAL. **Tratamiento:** documentar; unificar preservando
  orden (D-12). *Nota:* A-13 toca también el dominio 005 (la remesa es uno de los tres caminos); su
  **dueño** es este dominio (numeración/grabado) porque el orden de líneas y la integridad transaccional
  son propiedad del ciclo de vida — ver §"Casos frontera".
- **A-14** — numeración toma el año del sistema, no de `factura.fecha`. **Clasificación:** **CERRADA** (año
  de `factura.fecha`, D-02 firme Puri/fiscal). **Tratamiento:** especificar comportamiento actual como bug;
  corregir en modernización, no retroactivo. Riesgo **R15** (convivencia de dos contadores de año) se
  registra aquí.

**Characterization tests que la respaldan.** `test/numeracion.formato.test.js` (RN-16, función pura
`formatear`), `test/anomalias.test.js` (A-14). *Hueco de cobertura acotado:* `siguienteNumero`/`reservar`
(la reserva no atómica de A-02) y el **ciclo de estados** (cobro, espejo de rectificativa) tocan la BD
(tabla `contadores`, `facturas`) y quedan **fuera de la red pura** (ver `test/golden/LEEME.md`); el golden
master **no cubre** el ciclo de estados. **Criterio de aceptación:** la spec debe pedir tests de
integración para reserva correlativa/atómica, transición de estados y espejo de rectificativa; la parte
pura (formato) ya está congelada.

**Dueño natural.** **Puri** (gestoría) + **asesoría fiscal** (correlatividad legal, inspección 2020,
`numeracion.js:3-6`). Rectificativa: **Puri** ("Puri dixit", `facturas.js:126-128`).

---

### Spec 005 — Cuotas de contrato y prorrateo / remesa mensual

**Alcance.** Cómo se facturan las cuotas mensuales de contrato: el lote mensual (`remesa_mensual.js`) que
emite las facturas de verdad, y el prorrateo de altas/bajas a mitad de mes. El negocio decidió **en firme**
(D-01) que el prorrateo oficial es **días reales del mes** y que **el día 31 se cobra**; la fórmula
histórica de 30 días fijos de la pantalla de baja queda desalineada.

**Módulos que la evidencian.** `scripts/remesa_mensual.js` (completo; prorrateo inline `:45-51`, grabado
`:61-73`), `services/calculo.js:90-102` (`calcularProrrateo`, 30 días fijos — histórico), `routes/contratos.js`
(alta/baja, prorrateo de baja `:39`).

**Reglas que le pertenecen.** RN-13 (remesa prorratea sobre días reales — **oficial**), RN-10 (30 días
fijos — **REVOCADA**, histórica), RN-11 (día 31 no se cobra — **REVOCADA**, histórica), RN-12 (prorrateo
negativo → 0 días). Hallazgos H-3, H-9.

**Anomalías que le pertenecen.**
- **A-01** — doble prorrateo divergente (30 fijos vs. días reales). **Clasificación:** **CERRADA** (días
  reales; el día 31 se cobra; D-01 firme Paco/Puri). **Tratamiento:** especificar la fórmula oficial (días
  reales) como comportamiento vigente de la remesa; la de 30 fijos se documenta como histórica a unificar
  en modernización, no retroactivo. Es la **única contradicción con divergencia real en producción**.
- **A-15** — prorrateo negativo → 0 € en silencio; `calcularProrrateo` asume mismo mes. **Clasificación:**
  BUG A SECAS (**CERRADA** por ratificación escrita D-03, Marga/Paco 2026-07-07). **Tratamiento:**
  especificar el comportamiento ACTUAL tal cual (0,00 € silencioso; cálculo sin sentido intermensual); en
  modernización, **corregir** avisando/bloqueando y soportando dos líneas para rango intermensual. No
  retroactivo.

**Contradicciones que le pertenecen.** Contradicción-01 (prorrateo, gravedad Alta), y comparten origen con
este dominio la contradicción-02 (vencimiento por defecto, cuyo **dueño** es 006) y contradicción-03
(grabado, cuyo **dueño** es 004) — ver §"Casos frontera".

**Characterization tests que la respaldan.** `test/calculo.prorrateo.test.js` (congela **las dos**
implementaciones por separado: 30 fijos con tope a 30 y negativo→0, y días reales de la remesa, con su
divergencia A-01/H-3), `test/anomalias.test.js` (A-01, A-15). *Hueco acotado:* la remesa como flujo
end-to-end **no tiene golden master** (emite facturas reales; los tests no tocan producción), pero el
**cálculo** de prorrateo de ambos caminos ya está congelado. **Criterio de aceptación:** verificables
contra `test/calculo.prorrateo.test.js`; añadir test de integración de la remesa solo si se decide en
modernización.

**Dueño natural.** **Paco** (doctrina comercial de prorrateo, `calculo.js:90-93`; decisión D-01) + **Puri**
(gestoría reconcilia).

---

### Spec 006 — Vencimiento y fechas

**Alcance.** Cómo se calcula la fecha de vencimiento (fecha de factura + días de pago) y el valor por
defecto cuando el cliente no tiene forma de pago. Incluye el manejo casero de fechas (`sumarDias`,
`diasDelMes`) del que dependen todos los vencimientos.

**Módulos que la evidencian.** `lib/util.js:17-26` (`sumarDias`), `:36-39` (`diasDelMes`),
`config.js:39-40` (`VENCIMIENTO_DIAS`), `routes/facturas.js:68-69` y `scripts/remesa_mensual.js:60`
(aplicación del defecto).

**Reglas que le pertenecen.** RN-18 (vencimiento = fecha + días de pago), RN-19 (30 días por defecto).
Hallazgos H-4, H-5.

**Anomalías que le pertenecen.**
- **A-05** — vencimiento por defecto duplicado: `config.VENCIMIENTO_DIAS` (alta web) vs. literal `30`
  (remesa). **Clasificación:** ACCIDENTAL (latente). **A-05b** (BUG A SECAS): `dias_pago = 0` → 30 por
  `0 || 30`. **Tratamiento:** documentar duplicidad; unificar en `config` en modernización (D-05, "0" =
  contado). La convención vigente (`config.VENCIMIENTO_DIAS`) es dueña de este dominio; la divergencia de
  la remesa (literal `30`) se referencia aquí como anomalía porque **es** el punto de vencimiento.
- **A-10** — `sumarDias` con posible desfase de un día por cambio de hora (UTC vs. local). **Clasificación:**
  BUG A SECAS (no reproducido). **Tratamiento:** documentar; corregir por higiene (D-09, sin urgencia).

**Contradicciones que le pertenecen.** Contradicción-02 (días de vencimiento por defecto),
contradicción-05 parcial (formato/rangos de fecha — el rango de trimestre `-31` es dueño de 008; el manejo
base de fechas es de 006).

**Characterization tests que la respaldan.** `test/util.fechas.test.js` (`hoy`, `sumarDias`, `fechaBonita`,
`diasDelMes`; RN-18 y el borde H-4/A-10). *Matiz:* `sumarDias` con el borde de cambio de hora **no se ha
reproducido**; el test lo congela como comportamiento actual sin forzar el borde. **Criterio de
aceptación:** verificable contra `test/util.fechas.test.js` con las fechas canónicas (FA-103 venc.
2026-04-21 a 60 días; FA-104 venc. 2026-04-04 a 30 días, `db.js:139,145`).

**Dueño natural.** **Marga** (operativa de vencimientos y quejas de cobro) + **Puri**.

---

### Spec 007 — Datos maestros: clientes y artículos

**Alcance.** El mantenimiento de los datos maestros que alimentan la factura: alta/baja de clientes y
artículos, la validación de NIF (solo por longitud, con control humano de Marga), el IVA por defecto de la
casa, y la normalización "texto español → número" de los importes que se teclean.

**Módulos que la evidencian.** `routes/clientes.js` (alta/baja, validación NIF `:18`), `routes/articulos.js`
(catálogo, IVA defecto `:16`), `routes/contratos.js:19-20` (IVA literal, normalización), `lib/util.js:44-48`
(`validarNIF`), `config.js:24-25` (`IVA_DEFECTO`), `db.js:46` (`DEFAULT 21`).

**Reglas que le pertenecen.** RN-20 (validación NIF solo por longitud). Hallazgo H-8. (La regla del IVA por
defecto no tiene RN propia; se documenta vía A-09.)

**Anomalías que le pertenecen.**
- **A-07** — alta sin validar `NaN` en cantidad/precio. **Clasificación:** BUG A SECAS. **Tratamiento:**
  corrección técnica (D-19).
- **A-08** — normalización de coma decimal copiada ×3, frágil ante el punto de miles. **Clasificación:**
  BUG A SECAS (+ duplicidad). **Tratamiento:** documentar; extraer `util.parseImporte` (D-06, no se teclean
  miles).
- **A-09** — IVA por defecto duplicado: `config.IVA_DEFECTO` (artículos) vs. literal `21` (contratos) y
  `DEFAULT 21` (esquema). **Clasificación:** ACCIDENTAL. **Tratamiento:** documentar; unificar en `config`
  (D-08). Convención vigente (`config.IVA_DEFECTO`) dueña aquí; la divergencia (literal `21`) se referencia
  como anomalía.
- **A-12** — validación de NIF solo por longitud (9 caracteres). **Clasificación:** ACCIDENTAL con control
  compensatorio (Marga revisa). **Tratamiento:** documentar el control humano; validar letra si el negocio
  lo pide (D-11).

**Contradicciones que le pertenecen.** Contradicción-06 (normalización de importes ×3 + IVA por defecto).

**Characterization tests que la respaldan.** `test/util.nif.test.js` (RN-20/A-12: acepta `70355910k`,
rechaza 8 chars). *Hueco acotado:* la normalización de importes `parseFloat(replace(',','.'))` (A-08) vive
inline en las rutas (`facturas.js`, `contratos.js`, `articulos.js`), no en una función pura de `util`, por
lo que **no tiene test dedicado** todavía; el agujero del punto de miles no muerde hoy. **Criterio de
aceptación:** `test/util.nif.test.js` para NIF; añadir un test que congele la triple normalización con un
`1.234,56` que hoy da `1,234` (o especificar `util.parseImporte` al extraerla en modernización).

**Dueño natural.** **Marga** (da de alta y revisa clientes/artículos) + **Paco**.

---

### Spec 008 — Informes a la gestoría

**Alcance.** Las dos salidas que van directas a la gestoría: el resumen de IVA por trimestre (base del
modelo 303) y la exportación CSV del año en el formato acordado con Puri (separador `;`, decimales con
coma, clave de gestoría en la primera línea). El resumen suma **desde las líneas** para que las
rectificativas resten solas.

**Módulos que la evidencian.** `routes/informes.js` (resumen IVA `:17-26`, rango de trimestre `:17-19`,
export CSV `:34-50`), `views/informe_iva.ejs` (acumulador de total `:5`).

**Reglas que le pertenecen.** No introduce RN-* nuevas; **consume** la aritmética de 001 (debe seguir la
misma regla de redondeo) y el formato de 001 (RN-21). Documenta el rango de trimestre y el formato de
export como comportamiento propio.

**Anomalías que le pertenecen.**
- **A-06** — total del informe de IVA sumado en coma flotante **sin** la regla de redondeo sagrada.
  **Clasificación:** ACCIDENTAL (latente, máx. 1 céntimo). **Tratamiento:** documentar; alinear con la
  aritmética de 001 en modernización (D-07). La **convención dueña** (redondeo línea a línea) vive en 001;
  la **divergencia** (acumulador flotante de la vista) se referencia como anomalía **aquí**, en el camino
  que la usa — exactamente el reparto de contradicciones del encargo.
- **A-11** — fin de trimestre fijado a `AAAA-MM-31`, tapado por la comparación textual de SQLite.
  **Clasificación:** BUG A SECAS (latente). **Tratamiento:** documentar; usar último día real del mes antes
  de migrar (D-10).

**Contradicciones que le pertenecen.** Contradicción-04 (totalización sin redondeo sagrado — divergencia
con 001), contradicción-05 (rango de fecha `-31`).

**Characterization tests que la respaldan.** *Hueco:* los informes **no tienen characterization test** hoy;
el golden master **no los cubre**. **Criterio de aceptación:** test que verifique que para el 1T 2026 el
total del informe = 530,00 € por ambos métodos (contradicción-04 §3), y que el rango `2026-06-31` captura
todo junio por la comparación textual.

**Dueño natural.** **Puri** (gestoría; formato de export y modelo 303, `informes.js:32-33`).

---

## Casos frontera (conceptos que podrían caer en dos specs)

| Concepto | Specs candidatas | Recomendación | Criterio aplicado |
|---|---|---|---|
| **A-13 (grabado de factura ×3, orden de líneas)** | 004 (ciclo de vida) vs. 005 (remesa) | **→ 004** | La integridad transaccional y el orden de líneas son propiedad del *ciclo de vida de la factura*, que es dueño del grabado; la remesa es solo uno de los tres caminos. Se **referencia** desde 005. |
| **A-06 (total informe sin redondeo sagrado)** | 001 (aritmética) vs. 008 (informes) | **→ 008 (como anomalía); regla dueña en 001** | Reparto de contradicciones del encargo: la convención vigente (redondeo línea a línea) vive en la spec dueña (001); la divergencia se referencia como anomalía en el camino que la usa (008). |
| **A-05 (vencimiento por defecto duplicado)** | 005 (remesa usa literal 30) vs. 006 (vencimiento) | **→ 006 (dueña); referenciada en 005** | La convención `config.VENCIMIENTO_DIAS` pertenece al dominio de vencimiento; la divergencia de la remesa se cita como anomalía. |
| **A-09 (IVA por defecto duplicado)** | 003 (recargo/IVA) vs. 007 (maestros) | **→ 007** | El *valor por defecto* al dar de alta artículo/contrato es una decisión de datos maestros, no de la aritmética del recargo. La tabla de IVA↔recargo (RN-06) sí es de 003. |
| **RN-21 / formato de importe** | 001 (aritmética) vs. 008 (informes) | **→ 001 (dueña); consumida por 008** | El formato es una propiedad de la representación del importe, transversal; se especifica una vez en 001 y las demás la consumen. |
| **Numeración + ciclo de vida** | ¿dos specs (004a numeración, 004b estados)? | **fusionadas en 004** | Se citarían mutuamente en más de la mitad de sus requisitos (el número se reserva *dentro* del alta; el estado `rectificada` depende del número `RE`); la regla de fusión del encargo obliga a unirlas. Aun así 004 cabe en 30 min. |
| **A-01 revocación RN-10/11** | 005 (prorrateo) vs. memoria histórica | **→ 005** | El comportamiento histórico (30 fijos) se documenta en 005 como memoria de lo que hacía la baja de contrato; no genera spec propia. |

---

## Qué queda fuera de las specs de comportamiento (justificado)

Estas anomalías y riesgos **no describen comportamiento de negocio observable** (no tocan importes, número,
fechas ni textos de la factura): son deuda técnica y seguridad. Van a un **anexo de deuda técnica / plan de
modernización**, no a una spec de dominio. Se listan aquí para que consten como cubiertos:

- **A-17** — `email.enviarFactura` no envía (envío manual real). BUG HISTÓRICO CON DEPENDIENTES (proceso
  externo). No altera la factura; es proceso de entrega (D-15: no reactivar).
- **A-18** — secretos en claro en `config.js` versionado. Seguridad; sin efecto en importes (D-16).
- **A-19** — BD de producción con datos personales en Git. RGPD; sin efecto en importes (D-17). *Enlace:*
  coordina con A-22 (regenerar datos de ejemplo pasándolos por `calcularFactura`).
- **A-20** — deuda de infraestructura (`node_modules` versionado, Node 8, MySQL fantasma). ACCIDENTAL
  (D-18).
- **Riesgos R10–R14** — SMTP obsoleto, `node_modules`, Node 8, MySQL fantasma, `console.log` de email.
  Deuda de infraestructura sin comportamiento de negocio.

**Comprobación de completitud.** RN-01…RN-21: todas asignadas (001: 01,02,03,21 · 002: 04,05 · 003:
06,07,08,09 · 004: 14,15,16,17 · 005: 10,11,12,13 · 006: 18,19 · 007: 20). A-01…A-22: todas asignadas (001:
21,22 · 003: 16 · 004: 02,03,04,13,14 · 005: 01,15 · 006: 05,10 · 007: 07,08,09,12 · 008: 06,11 · anexo:
17,18,19,20). **Ninguna regla ni anomalía queda huérfana.**

---

# PARTE 2 — Descripciones listas para `/speckit-specify`

> Cada bloque es el **input literal** para lanzar la spec inversa correspondiente. **No se ejecuta ninguno**
> hasta aprobación. Todos comparten el encuadre de ingeniería inversa exigido por el encargo.

---

## → `/speckit-specify` para Spec 001 — Aritmética fiscal

**Encuadre.** Spec de ingeniería inversa: documenta el comportamiento EXISTENTE de la **aritmética fiscal
de la factura** en GesFact 2.4. No es una feature nueva: es la especificación formal de lo que el sistema
YA hace, para que sirva de contrato en la modernización.

**Reglas de la spec.**
- Cada requisito describe el comportamiento ACTUAL con su evidencia (`fichero:función` o dato real).
- Las anomalías A-21 y A-22 NO se corrigen ni se omiten: se especifican tal cual funcionan hoy,
  referenciadas por su ID del [registro de anomalías](./registro-de-anomalias.md).
- Los criterios de aceptación son verificables contra `test/`, citando el test cuando exista.
- Toda decisión de negocio se cita por su acta (documento, persona, fecha).

**Alcance (reglas con valores concretos).**
- **RN-01 · Redondeo a 2 decimales, medio hacia arriba.** `redondear2 = Math.round(x*100)/100`
  (`lib/util.js:5-7`). Ejemplo canónico: línea del vaso de FA-2026-000101, `0,44 × 21,60 = 9,504 → 9,50 €`;
  su IVA `9,50 × 21/100 = 1,995 → 2,00 €` (`db.js:130`).
- **RN-02 · Cálculo línea a línea.** base, cuota IVA y cuota recargo se redondean **individualmente**
  (`services/calculo.js:26-34`). Ejemplo: línea de FA-2026-000102, `4 × 18,50 = 74,00`; IVA
  `74,00 × 21/100 = 15,54`; recargo `74,00 × 5,2/100 = 3,848 → 3,85` (`db.js:133`).
- **RN-03 · Totales suman líneas ya redondeadas** (`calculo.js:81-86`). Ejemplo: FA-2026-000102,
  `115,60 + 24,28 + 6,01 = 145,89 €` (`db.js:132`).
- **RN-21 · Formato de importe español** (`util.js:51-58`): `1234.5 → "1.234,50"`; `null → "0,00"`;
  `-122.23 → "-122,23"` (RE-2026-000001, `db.js:160`).
- **A-21 · Redondeo NO universal en bordes** (ACCIDENTAL, latente): `redondear2(0.005)=0.01` pero
  `redondear2(1.005)=1`; `redondear2(-9.505)=-9.51`; `formatearImporte(-0.005)="-0,01"` (`toFixed` ≠
  `Math.round`). Congelado por `test/util.redondeo.test.js`. **Tratamiento acordado:** especificar tal
  cual; corregir el *enunciado* de RN-01/H-1 (describe mal el código).
- **A-22 · Facturas de ejemplo no reproducibles** (BUG A SECAS en datos): FA-103 y FA-102 no las reproduce
  `calcularFactura` (`db.js:139-143,132-136`). **Tratamiento:** especificar el motor tal cual (correcto);
  regenerar datos en modernización (con A-19).

**Criterios de aceptación.** Verificables contra `test/util.redondeo.test.js`, `test/calculo.factura.test.js`,
`test/anomalias.test.js` y el golden master (caso `03-fa103-no-reproducible`).

**Fuera de alcance.** Descuento por volumen → **Spec 002**. Recargo de equivalencia → **Spec 003**. El total
del informe de IVA y su divergencia de redondeo → **Spec 008 (A-06)**.

---

## → `/speckit-specify` para Spec 002 — Descuento por volumen

**Encuadre.** Spec de ingeniería inversa: documenta el comportamiento EXISTENTE del **descuento comercial
por volumen**. No es una feature nueva: es la especificación formal de lo que el sistema YA hace, para que
sirva de contrato en la modernización.

**Reglas de la spec.** Cada requisito con su evidencia; sin anomalías propias (el borde `>` es regla
protegida INTENCIONAL); criterios verificables contra `test/`; decisiones citadas por acta (Paco/Puri
2018).

**Alcance (reglas con valores concretos).**
- **RN-04 · Umbral estricto sobre base bruta** (`calculo.js:38-43,53-58`): base ≤ 1.000 → 0 %; 1.000 <
  base ≤ 5.000 → 2 %; base > 5.000 → 5 %. Comparación `>`: **1.000,00 justo NO descuenta**. Ejemplo con
  descuento: FA-2026-000105, base 2.287,75 → 2 % (`db.js:149`).
- **RN-05 · Descuento al precio, línea a línea** (`calculo.js:63-84`): `precioConDto =
  redondear2(precio × (100−dto)/100)`, se recalcula la línea. Ejemplo: precio 120,00 al 2 % →
  `117,60`; línea `10 × 117,60 = 1.176,00`; IVA `246,96`.
- **Nota de dato:** el ejemplo histórico del borde "1.000 justo" (FA-103) queda invalidado por **A-22**
  (Spec 001): FA-103 suma 1.000,02 bruto, no 1.000. La regla sigue viva; sustituir el ejemplo por uno
  reproducible por el motor.

**Criterios de aceptación.** Verificables contra `test/calculo.factura.test.js` (casos con/sin descuento) y
golden master.

**Fuera de alcance.** El redondeo base → **Spec 001**. El recargo sobre la base con descuento → **Spec 003**.

---

## → `/speckit-specify` para Spec 003 — Recargo de equivalencia

**Encuadre.** Spec de ingeniería inversa: documenta el comportamiento EXISTENTE del **recargo de
equivalencia**. No es una feature nueva: es la especificación formal de lo que el sistema YA hace, para que
sirva de contrato en la modernización.

**Reglas de la spec.** Cada requisito con evidencia; la anomalía A-16 se especifica tal cual funciona hoy
(no se corrige ni se omite), referenciada por su ID; criterios verificables contra `test/`; decisión de
negocio citada por acta (ratificación escrita D-04, Puri/Paco 2026-07-07).

**Alcance (reglas con valores concretos).**
- **RN-06 · Tabla de recargo por tipo de IVA** (`calculo.js:12-15`): 21→5,2 %, 10→1,4 %, 4→0,5 %. Ejemplo:
  base 74,00 al 21 % → `74,00 × 5,2/100 = 3,848 → 3,85 €` (`db.js:133`).
- **RN-07 · Solo si el cliente está marcado** (`conRecargo = cliente.recargo_equivalencia == 1`,
  `calculo.js:49`). Ejemplo: cliente 1 sin recargo → todas las líneas con cuota_recargo 0 (`db.js:126-130`);
  cliente 2 con recargo → FA-102 lleva recargo (`db.js:97`).
- **RN-08 · Tipos antiguos conservados** (`calculo.js:18-21`): 18→4 %, 16→4 %, 8→1 %, 7→1 %. Código latente
  "por si hay que reabrir ejercicios del Access"; ningún dato real los usa.
- **RN-09 / A-16 · Tipo desconocido → recargo 0 en silencio; `===` rechaza `'21'`** (`calculo.js:13-22`).
  **A-16 clasificada BUG A SECAS, CERRADA** por ratificación escrita D-04 (Puri/Paco, 2026-07-07): el
  negocio decide que un tipo no reconocido **debe rechazarse**. **Tratamiento:** especificar el
  comportamiento ACTUAL (recargo 0 sin aviso; `'21'` tratado como desconocido); corregir en modernización,
  no retroactivo.

**Criterios de aceptación.** Verificables contra `test/anomalias.test.js` (A-16),
`test/calculo.factura.test.js` (cliente con recargo), golden master (FA-102).

**Fuera de alcance.** El IVA por defecto al dar de alta → **Spec 007 (A-09)**. El redondeo de la cuota →
**Spec 001**.

---

## → `/speckit-specify` para Spec 004 — Numeración y ciclo de vida de la factura

**Encuadre.** Spec de ingeniería inversa: documenta el comportamiento EXISTENTE de la **numeración
correlativa y el ciclo de vida de la factura** (emitir, cobrar, rectificar). No es una feature nueva: es la
especificación formal de lo que el sistema YA hace, para que sirva de contrato en la modernización.

**Reglas de la spec.** Cada requisito con evidencia; las anomalías A-02, A-03, A-04, A-13, A-14 se
especifican tal cual (no se corrigen ni se omiten), referenciadas por su ID; criterios verificables contra
`test/` (y se piden tests nuevos donde hay hueco); decisiones citadas por acta (D-02 firme; D-13, D-14
SIMULADAS a ratificar para el tratamiento).

**Alcance (reglas con valores concretos).**
- **RN-14 · Correlativa por serie y año, sin huecos** (`numeracion.js:14-36`, comentario legal `:3-6`).
  Contadores reales: `FA/2026 = 108`, `RE/2026 = 1` (`db.js:176-177`) → siguiente `FA-2026-000109`.
- **RN-15 · Año nuevo se abre a cero** (`numeracion.js:18-23`): primera `FA` de 2027 → `FA-2027-000001`.
- **RN-16 · Formato SERIE-AAAA-NNNNNN** (6 dígitos, `numeracion.js:38-42`); >6 dígitos no se trunca.
- **RN-17 / A-02 · Reserva no atómica** (`SELECT` + `UPDATE` sin transacción, `numeracion.js:16,30-32`).
  BUG HISTÓRICO CON DEPENDIENTES. Incidente 02/01: dos facturas con el mismo número. D-14: concurrencia
  real = 2 usuarios; sin duplicados desde 2021.
- **Rectificativa = espejo exacto sin recalcular** (`facturas.js:124-164`): serie `RE`, importes negados de
  la original (`-f.base,-f.iva,-f.recargo,-f.total`), sin recálculo ("Puri dixit", `:126-128`).
  RE-2026-000001 espeja FA-2026-000106 (`db.js:156-162`).
- **Estados** `emitida → cobrada → rectificada` (`db.js:61`); `cobrar` exige `estado='emitida'` en el WHERE
  y redirige sin error aunque no cambie nada; **no hay borrado** (legal).
- **A-03 · Alta sin transacción** (`facturas.js:74-99`): corrección técnica (D-19).
- **A-04 · Rectificativa sin transacción, error de línea silenciado** (`facturas.js:141-160`): BUG
  HISTÓRICO. Tratamiento D-13 (rechazar todo y avisar; mantener espejo) — SIMULADA a ratificar.
- **A-13 · Grabado ×3 y orden de líneas no determinista** (`facturas.js:74-99,141-159`,
  `remesa_mensual.js:61-73`): ACCIDENTAL; preservar orden al unificar (D-12).
- **A-14 · Año del sistema, no de `factura.fecha`** (`numeracion.js:15`): **CERRADA** (D-02, año de
  `factura.fecha`). Especificar comportamiento actual como bug; corregir no retroactivo. **Riesgo R15**:
  convivencia de dos contadores de año en el cambio de ejercicio.

**Criterios de aceptación.** Verificables contra `test/numeracion.formato.test.js` (RN-16, formato) y
`test/anomalias.test.js` (A-14). **Se requieren tests de integración** (hueco: tocan BD y quedan fuera de
la red pura, ver `test/golden/LEEME.md`): reserva correlativa/atómica, apertura de año a cero, transición
de estados, espejo de rectificativa. El golden master NO cubre el ciclo de estados.

**Fuera de alcance.** El cálculo de importes de la factura → **Specs 001/002/003**. El prorrateo de la
remesa → **Spec 005**. El vencimiento → **Spec 006**.

---

## → `/speckit-specify` para Spec 005 — Cuotas de contrato, prorrateo y remesa

**Encuadre.** Spec de ingeniería inversa: documenta el comportamiento EXISTENTE de las **cuotas de contrato,
su prorrateo y la remesa mensual**. No es una feature nueva: es la especificación formal de lo que el
sistema YA hace, para que sirva de contrato en la modernización.

**Reglas de la spec.** Cada requisito con evidencia; A-01 y A-15 se especifican tal cual (no se corrigen ni
se omiten), referenciadas por su ID; RN-10/RN-11 se documentan como comportamiento HISTÓRICO revocado, sin
omitirlo; criterios verificables contra `test/`; decisiones citadas por acta (D-01 firme Paco/Puri; D-03
ratificada por escrito Marga/Paco).

**Alcance (reglas con valores concretos).**
- **RN-13 · Remesa prorratea sobre días reales del mes — OFICIAL** (`remesa_mensual.js:47-51`):
  `importe = redondear2(cuota / diasMes × diasServicio)`, `diasMes` real (28/29/30/31). Ejemplo: cuota
  60,00, servicio 16–30 de julio (31 días) → `60/31×15 = 29,03 €`.
- **RN-10 · 30 días fijos — REVOCADA/HISTÓRICA** (`calculo.js:95-102`, usada por baja de contrato
  `contratos.js:39`): `cuota/30×dias`. Mismo ejemplo → 30,00 €. Divergencia real de 0,97 €.
- **RN-11 · Día 31 no se cobra — REVOCADA/HISTÓRICA** (`calculo.js:99`, tope `dias>30→30`). Decisión D-01:
  **el día 31 SÍ se cobra** (alta 16–31 julio = 16 días).
- **RN-12 / A-15 · Prorrateo negativo → 0 días/0 € en silencio; asume mismo mes** (`calculo.js:96-97,100`).
  **A-15 clasificada BUG A SECAS, CERRADA** por ratificación escrita D-03 (Marga/Paco, 2026-07-07): avisar
  y no permitir grabar cuando "desde" > "hasta"; no cruzar dos meses (dos líneas si hiciera falta).
  **Tratamiento:** especificar el comportamiento ACTUAL (0,00 € silencioso; cálculo sin sentido
  intermensual); corregir en modernización, no retroactivo.
- **A-01 · Doble prorrateo divergente** (`calculo.js:95-102` vs. `remesa_mensual.js:45-51`): **CERRADA**
  (días reales; día 31 se cobra; D-01). Única contradicción con divergencia real en producción. Fórmula
  oficial = la de la remesa; la de 30 fijos, histórica a unificar (no retroactivo).

**Criterios de aceptación.** Verificables contra `test/calculo.prorrateo.test.js` (congela **ambas**
fórmulas: `calcularProrrateo` a 30 fijos con tope a 30 y negativo→0, y el prorrateo inline de la remesa a
días reales, con su divergencia) y `test/anomalias.test.js` (A-01, A-15). La remesa end-to-end NO tiene
golden master (no toca producción); añadir test de integración solo si se decide en modernización.

**Fuera de alcance.** El vencimiento por defecto de la remesa (literal `30`) → **Spec 006 (A-05)**. El
grabado/numeración de las facturas de remesa → **Spec 004 (A-13)**. El cálculo de IVA de la línea →
**Spec 001**.

---

## → `/speckit-specify` para Spec 006 — Vencimiento y fechas

**Encuadre.** Spec de ingeniería inversa: documenta el comportamiento EXISTENTE del **cálculo de
vencimiento y el manejo de fechas**. No es una feature nueva: es la especificación formal de lo que el
sistema YA hace, para que sirva de contrato en la modernización.

**Reglas de la spec.** Cada requisito con evidencia; A-05 (con A-05b) y A-10 se especifican tal cual,
referenciadas por su ID; criterios verificables contra `test/`; decisiones citadas por acta (D-05, D-09
SIMULADAS a ratificar para el tratamiento).

**Alcance (reglas con valores concretos).**
- **RN-18 · Vencimiento = fecha de factura + días de pago** (`util.sumarDias`, `util.js:20-26`). Ejemplos
  reales: FA-104 fecha 2026-03-05 + 30 → 2026-04-04 (`db.js:145`); FA-103 fecha 2026-02-20 + 60 →
  2026-04-21 (`db.js:139`).
- **RN-19 · Defecto 30 días** cuando `dias_pago` es nulo (`config.VENCIMIENTO_DIAS = 30`, `config.js:40`;
  `co.dias_pago || 30`, `remesa_mensual.js:60`).
- **A-05 · Defecto duplicado** `config.VENCIMIENTO_DIAS` (alta web, `facturas.js:68-69`) vs. literal `30`
  (remesa): ACCIDENTAL, hoy 30=30. **A-05b** (BUG A SECAS): `dias_pago = 0` → 30 por `0 || 30`. D-05: "0" =
  contado; unificar en `config`.
- **A-10 · `sumarDias` desfase por cambio de hora** (`util.js:20-26`, incidente marzo 2019 no reproducido):
  BUG A SECAS. D-09: corregir por higiene, sin urgencia.

**Criterios de aceptación.** Verificables contra `test/util.*` con las fechas canónicas (FA-103, FA-104).
El borde de cambio de hora se congela sin forzarlo (no reproducido).

**Fuera de alcance.** El vencimiento nulo de la rectificativa → **Spec 004**. El IVA/importe por defecto →
**Spec 007**. El rango de trimestre del informe → **Spec 008 (A-11)**.

---

## → `/speckit-specify` para Spec 007 — Datos maestros: clientes y artículos

**Encuadre.** Spec de ingeniería inversa: documenta el comportamiento EXISTENTE de los **datos maestros
(clientes y artículos)**: validación de NIF, IVA por defecto y normalización de importes de entrada. No es
una feature nueva: es la especificación formal de lo que el sistema YA hace, para que sirva de contrato en
la modernización.

**Reglas de la spec.** Cada requisito con evidencia; A-07, A-08, A-09, A-12 se especifican tal cual,
referenciadas por su ID; criterios verificables contra `test/`; decisiones citadas por acta (D-06, D-08,
D-11 SIMULADAS a ratificar; D-19 técnica).

**Alcance (reglas con valores concretos).**
- **RN-20 / A-12 · Validación de NIF solo por longitud** (`validarNIF = nif.length === 9`, `util.js:44-48`).
  ACCIDENTAL con control compensatorio (Marga revisa, `util.js:42-43`). Ejemplos reales aceptados:
  `70355910k` (minúscula, `db.js:101`), `03488812K` (`db.js:97`); rechaza 8 caracteres. D-11: basta el
  control manual; validar letra deseable no urgente.
- **A-09 · IVA por defecto duplicado**: `config.IVA_DEFECTO = 21` (artículos, `articulos.js:16`) vs. literal
  `21` (contratos, `contratos.js:20`) y `DEFAULT 21` (`db.js:46`). ACCIDENTAL, 21=21. D-08: unificar en
  `config`, debe afectar a contratos.
- **A-08 · Normalización de coma decimal ×3** (`parseFloat(('' + x).replace(',','.'))` en
  `facturas.js:59-60`, `contratos.js:19`, `articulos.js:19`): BUG A SECAS. `1.234,56` → `1,234` (solo
  sustituye la primera coma). D-06: no se teclean miles; extraer `util.parseImporte`.
- **A-07 · Alta sin validar `NaN`** (`facturas.js:59-62`): BUG A SECAS, corrección técnica (D-19).

**Criterios de aceptación.** Verificables contra `test/util.nif.test.js` (validarNIF con datos reales
`db.js:97,101`). Añadir un test que congele la normalización inline actual con `1.234,56 → 1,234` (A-08 vive
inline en las rutas, no en `util`, por lo que hoy no tiene test dedicado).

**Fuera de alcance.** La tabla IVA↔recargo → **Spec 003**. El uso del IVA/precio en el cálculo → **Spec
001**. La baja lógica de cliente y su prorrateo de contrato → **Spec 005**.

---

## → `/speckit-specify` para Spec 008 — Informes a la gestoría

**Encuadre.** Spec de ingeniería inversa: documenta el comportamiento EXISTENTE de los **informes a la
gestoría** (resumen de IVA trimestral y export CSV). No es una feature nueva: es la especificación formal
de lo que el sistema YA hace, para que sirva de contrato en la modernización.

**Reglas de la spec.** Cada requisito con evidencia; A-06 y A-11 se especifican tal cual, referenciadas por
su ID; criterios verificables contra `test/` (hueco actual: se piden tests nuevos); decisiones citadas por
acta (D-07, D-10 SIMULADAS a ratificar para el tratamiento).

**Alcance (reglas con valores concretos).**
- **Resumen de IVA suma desde las líneas** (`informes.js:23-26`) para que las rectificativas resten solas.
- **Export CSV en formato Puri** (`informes.js:34-50`): separador `;`, decimales con coma, clave
  `SH-CONTA-7731` en la primera línea (`config.js:37`), "formato acordado con Puri en 2019".
- **A-06 · Total del informe sin redondeo sagrado** (`informe_iva.ejs:5`, acumulador flotante sobre
  `SUM()` SQL): ACCIDENTAL, latente (máx. 1 céntimo). La convención dueña (redondeo línea a línea) vive en
  **Spec 001**; la divergencia se especifica aquí como anomalía. Para el 1T 2026 ambos métodos dan
  530,00 € (contradicción-04 §3). D-07: alinear con la aritmética de 001.
- **A-11 · Fin de trimestre `AAAA-MM-31`** (`informes.js:17-19`), tapado por la comparación textual de
  SQLite (`'2026-06-31'` ordena tras `'2026-06-30'`): BUG A SECAS latente. D-10: usar el último día real
  del mes antes de migrar a un motor con fecha estricta.

**Criterios de aceptación.** **Se requieren tests nuevos** (hueco: los informes no tienen characterization
test ni golden master hoy): total del 1T 2026 = 530,00 € por ambos métodos; el rango `2026-06-31` captura
todo junio.

**Fuera de alcance.** La regla de redondeo en sí → **Spec 001**. El formato de importe → **Spec 001
(RN-21)**. Los secretos de `config.js` (clave de export) → **anexo de deuda técnica (A-18)**.

---

# Tabla resumen (spec → reglas → anomalías → dueño → tests)

| Spec | Dominio | Reglas RN-* | Anomalías A-* (clasif.) | Dueño de negocio | Tests / golden master |
|------|---------|-------------|-------------------------|------------------|-----------------------|
| **001** | Aritmética fiscal | 01, 02, 03, 21 (+H-1) | A-21 (ACCIDENTAL), A-22 (BUG datos) | Puri + Julián | `util.redondeo`, `calculo.linea`, `util.formato`, `calculo.factura`, `anomalias`; **GM sí** (fa103) |
| **002** | Descuento por volumen | 04, 05 | — (regla protegida) | Paco + Puri | `calculo.descuento`, `calculo.factura`; **GM sí** |
| **003** | Recargo de equivalencia | 06, 07, 08, 09 (+H-2) | A-16 (BUG A SECAS, cerrada D-04) | Puri + Paco | `calculo.recargo`, `anomalias` (A-16), `calculo.factura`; **GM sí** (fa102) |
| **004** | Numeración + ciclo de vida | 14, 15, 16, 17 (+H-6,H-7) | A-02, A-03, A-04, A-13, A-14 | Puri + fiscal | `numeracion.formato` (RN-16), `anomalias` (A-14); **falta test integración** de reserva/ciclo (tocan BD); **GM no** |
| **005** | Contratos, prorrateo, remesa | 10↯, 11↯, 12, 13 (+H-3,H-9) | A-01 (cerrada D-01), A-15 (BUG, cerrada D-03) | Paco + Puri | `calculo.prorrateo` (ambas fórmulas), `anomalias` (A-01,A-15); **falta remesa e2e**; **GM no** |
| **006** | Vencimiento y fechas | 18, 19 (+H-4,H-5) | A-05/A-05b, A-10 | Marga + Puri | `util.fechas`; **GM no** |
| **007** | Datos maestros (clientes/artículos) | 20 (+H-8) | A-07, A-08, A-09, A-12 | Marga + Paco | `util.nif`; **falta test** normalización importes (A-08, inline); **GM no** |
| **008** | Informes a la gestoría | (consume 001/RN-21) | A-06, A-11 | Puri | **falta test** (informes tocan BD); **GM no** |
| *anexo* | Deuda técnica / seguridad | — | A-17, A-18, A-19, A-20 (+R10–R14) | Julián / Paco / RGPD | (no comportamiento) |

*↯ = regla REVOCADA (histórica), se documenta pero no se especifica como vigente.*

**Cobertura:** 21/21 reglas y 22/22 anomalías asignadas; 4 anomalías de deuda técnica al anexo (justificado
en §"Qué queda fuera"). **Huecos de test señalados** en 004, 005, 007, 008 como criterio de aceptación de
sus specs.

---

**No se ha ejecutado ningún `/speckit-specify`.** Esta propuesta se revisa y se aprueba antes de invertir.
Al aprobarla, el orden natural de escritura es **001 → 002 → 003** (el corazón fiscal, base de todo),
luego **004 → 005** (numeración/ciclo y contratos), y por último **006 → 007 → 008** (soporte y salidas),
dejando el **anexo de deuda técnica** para el plan de modernización.

*Elaborado en fase de reconocimiento a partir de todos los artefactos de `specs/000-reconocimiento/`. Toda
afirmación se apoya en `fichero:líneas` del repositorio, en datos reales de `datos/gesfact.db` o en el acta
de entrevista y sus ratificaciones escritas del 2026-07-07. No se corrige nada (constitución del proyecto).*

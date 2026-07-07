# Reglas de negocio — GesFact 2.4

**Extracción de la lógica de negocio central (criticidad ALTA) del sistema heredado de
Suministros Hidalgo, S.L.**
Fecha: 2026-07-07. Fase: documentar y proteger (ver `.specify/memory/constitution.md`).

Este documento recoge **las reglas de negocio que el sistema aplica hoy**, escritas en
lenguaje de negocio (qué se cobra, qué se permite, qué se calcula, cuándo y cuánto), no como
descripción del código. Cada regla lleva su evidencia (`fichero:líneas`), un ejemplo con
valores concretos calculado ejecutando el código a mano (con datos reales de
`datos/gesfact.db` cuando existen) y una clasificación provisional:

- **INTENCIONAL** — hay señales de decisión deliberada (comentario firmado, coherencia
  interna, testimonio del negocio o factura de ejemplo que lo confirma).
- **ACCIDENTAL** — efecto colateral de cómo está implementado, sin señal de que se buscara.
- **DUDOSA** — indecidible solo desde el código; se marca como **SUPOSICIÓN** y genera
  pregunta al negocio.

**Alcance.** Módulos seleccionados del `mapa-sistema.md`: la lógica de negocio central
obligatoria de criticidad ALTA — `services/calculo.js` (el corazón fiscal) y
`lib/numeracion.js` (numeración correlativa) — junto con la utilidad de la que dependen,
`lib/util.js` (redondeo, fechas, formato, validación). Se incluye además la discrepancia de
prorrateo con `scripts/remesa_mensual.js` porque reimplementa una de estas reglas de otra
forma (RN-13 y hallazgo H-3).

Toda afirmación se apoya en `fichero:líneas`. No se corrige nada.

---

## Índice de reglas

| ID | Regla | Clasificación |
|---|---|---|
| RN-01 | Redondeo a 2 decimales "de toda la vida" (medio arriba) | INTENCIONAL |
| RN-02 | Cálculo de cada línea con redondeo línea a línea | INTENCIONAL |
| RN-03 | Los totales de la factura suman líneas ya redondeadas | INTENCIONAL |
| RN-04 | Descuento por volumen sobre la base bruta, umbral estricto | INTENCIONAL |
| RN-05 | El descuento se aplica al precio, línea a línea (desglosado) | INTENCIONAL |
| RN-06 | Recargo de equivalencia por tipo de IVA (tabla) | INTENCIONAL |
| RN-07 | El recargo solo se aplica si el cliente lo tiene marcado | INTENCIONAL |
| RN-08 | Tipos de IVA antiguos con recargo conservados (16/18/7/8) | INTENCIONAL |
| RN-09 | Tipo de IVA desconocido → recargo 0 | DUDOSA |
| RN-10 | ~~Prorrateo comercial de cuotas: mes de 30 días fijos~~ **REVOCADA (acta D-01, 2026-07-07)** | ~~INTENCIONAL~~ → **comportamiento superado; a corregir** |
| RN-11 | ~~El día 31 no se cobra en el prorrateo comercial~~ **REVOCADA (acta D-01, 2026-07-07)** | ~~INTENCIONAL~~ → **comportamiento superado; a corregir** |
| RN-12 | Prorrateo negativo se corta a 0 días | DUDOSA (respuesta SIMULADA D-03, sin ratificar) |
| RN-13 | La remesa mensual prorratea sobre días reales del mes **← prorrateo OFICIAL (acta D-01)** | INTENCIONAL / **oficial confirmado** |
| RN-14 | Numeración correlativa por serie y año, sin huecos | INTENCIONAL |
| RN-15 | Contador de año nuevo se abre a cero | INTENCIONAL |
| RN-16 | Formato del número de factura: SERIE-AAAA-NNNNNN | INTENCIONAL |
| RN-17 | Reserva de número no atómica (dos pasos sin bloqueo) | ACCIDENTAL |
| RN-18 | Vencimiento = fecha de factura + días de pago | INTENCIONAL |
| RN-19 | Días de pago por defecto cuando el cliente no tiene | INTENCIONAL |
| RN-20 | Validación de NIF solo por longitud (9 caracteres) | ACCIDENTAL |
| RN-21 | Formato de importe español (miles con punto, decimales con coma) | INTENCIONAL |

---

## Cálculo de importes (`services/calculo.js` + `lib/util.js`)

### RN-01 — Redondeo a 2 decimales, "medio hacia arriba"

**Enunciado.** Todo importe monetario del sistema se redondea a 2 decimales (céntimos). El
redondeo es "de toda la vida": el medio céntimo se va hacia arriba (0,005 → 0,01). Este
redondeo es la pieza base sobre la que se apoya todo el cálculo fiscal.

**Ejemplo.** La línea del vaso de la factura real **FA-2026-000101**: cantidad `0,44`,
precio `21,60 €`. El bruto es `0,44 × 21,60 = 9,504`; redondeado a 2 decimales da **9,50 €**
(exactamente el valor grabado en `db.js:130`). El IVA de esa base: `9,50 × 21 / 100 = 1,995`,
que redondea a **2,00 €** (medio céntimo hacia arriba; también el valor grabado).

**Evidencia.** `redondear2` en `lib/util.js:5-7` (`Math.round(x * 100) / 100`). Usada en
todo `services/calculo.js` (líneas 27, 28, 31, 57, 69, 81-83, 86, 101). Dato real:
`datos/gesfact.db` vía `db.js:130`.

**Clasificación.** **INTENCIONAL.** El aviso en cabecera de `calculo.js:3-7` (Julián, mayo
2019) documenta que la forma de redondear es sagrada porque la gestoría reconcilia línea a
línea; el comentario "redondeo a 2 decimales de toda la vida" (`util.js:4`) confirma
deliberación.

> **Matiz técnico (no cambia la regla, pero conviene registrarlo).** `Math.round` redondea
> el medio **hacia +∞**, no "hacia el par" ni "medio hacia afuera". Con importes negativos
> (rectificativas), un valor como `-9,505` redondearía a `-9,50` (hacia +∞), no a `-9,51`.
> **SUPOSICIÓN:** en la práctica las rectificativas invierten signos sin recalcular
> (RN-14 / `facturas.js:124-164`), así que este borde de redondeo con negativos podría no
> llegar a ejecutarse nunca. **Pregunta al negocio:** ¿existe algún flujo que redondee
> importes negativos directamente?

---

### RN-02 — Cálculo de cada línea con redondeo línea a línea

**Enunciado.** Cada línea de factura se calcula por separado y sus tres importes —base,
cuota de IVA y cuota de recargo— se redondean **individualmente** a 2 decimales antes de
sumarse a los totales. La base de la línea es `cantidad × precio` redondeado; la cuota de IVA
es `base × tipo_iva / 100` redondeada; la cuota de recargo (si aplica) es
`base × %recargo / 100` redondeada. El redondeo se aplica sobre la base **ya redondeada**, no
sobre el bruto.

**Ejemplo.** Línea real de **FA-2026-000102** (desengrasante, cliente con recargo): cantidad
`4`, precio `18,50 €`, IVA 21 %.
- Base: `4 × 18,50 = 74,00` → **74,00 €**.
- Cuota IVA: `74,00 × 21 / 100 = 15,54` → **15,54 €**.
- Cuota recargo (21 % → 5,2 %, ver RN-06): `74,00 × 5,2 / 100 = 3,848` → **3,85 €**.

Los tres valores coinciden exactamente con lo grabado en `db.js:133`.

**Evidencia.** `calcularLinea` en `services/calculo.js:26-34`. Dato real: `db.js:133`.

**Clasificación.** **INTENCIONAL.** Es el núcleo del aviso de cabecera (`calculo.js:3-7`):
en mayo de 2019 se probó a redondear sobre la base total y la gestoría (Puri) devolvió todo
el trimestre; se revirtió y "se queda como está".

---

### RN-03 — Los totales de la factura suman líneas ya redondeadas

**Enunciado.** La base, el IVA y el recargo totales de una factura se obtienen **sumando los
importes ya redondeados de cada línea**, redondeando además cada suma parcial acumulada. El
total de la factura es `base + IVA + recargo`, redondeado. Nunca se calcula el IVA total
sobre la base total: se suman las cuotas de línea.

**Ejemplo.** Factura real **FA-2026-000102** (4 líneas, cliente con recargo). Sumando las
bases redondeadas de línea (`74,00 + 28,90 + 10,80 + 1,90 = 115,60`), las cuotas de IVA
(`15,54 + 6,07 + 2,27 + 0,40 = 24,28`) y las de recargo (`3,85 + 1,50 + 0,56 + 0,10 = 6,01`),
el total es `115,60 + 24,28 + 6,01 = 145,89 €`. Coincide con la cabecera grabada en
`db.js:132` (base 115,60; IVA 24,28; recargo 6,01; total 145,89).

**Evidencia.** Bucle acumulador en `services/calculo.js:81-86` (`resultado.base`,
`resultado.iva`, `resultado.recargo` con `redondear2` en cada suma; total en línea 86).
Confirmación cruzada en el informe de IVA, que también suma desde las líneas
(`routes/informes.js:23-26`, citado en `mapa-sistema.md:141-144`). Dato real: `db.js:132-136`.

**Clasificación.** **INTENCIONAL.** Coherente con RN-02 y con el aviso de cabecera; es
justamente lo que hace que la gestoría cuadre línea a línea.

---

### RN-04 — Descuento por volumen sobre la base bruta, con umbral estricto

**Enunciado.** Si la base bruta de la factura (suma de las bases de línea antes de descuento)
**supera** 1.000 € se aplica un 2 % de descuento; si **supera** 5.000 €, un 5 %. La
comparación es **estricta** (`>`): una base de exactamente 1.000,00 € **no** lleva descuento,
y 5.000,00 € justos llevan el 2 %, no el 5 %. Por debajo de 1.000 € no hay descuento.

Tramos exactos:
- base ≤ 1.000,00 € → 0 %
- 1.000,00 € < base ≤ 5.000,00 € → 2 %
- base > 5.000,00 € → 5 %

**Ejemplo (borde real).** Factura real **FA-2026-000103**: base bruta = exactamente
`1.000,00 €` (578,00 + 324,00 + 92,50 + 5,50). Como `1000 > 1000` es falso, **descuento
0 %**, IVA 210,00 y total 1.210,00 € — tal como está grabado en `db.js:139` con la nota
"OJO caso comentado con la gestoria: base 1000 justa NO lleva descuento" (`db.js:138`).

**Segundo ejemplo (con descuento).** Factura real **FA-2026-000105**: base 2.287,75 €
(> 1.000, ≤ 5.000) → 2 %, confirmado por su observación "Descuento volumen 2% aplicado"
(`db.js:149`).

**Evidencia.** `porcentajeDescuento` en `services/calculo.js:39-43`; base bruta acumulada
en `calculo.js:53-58`. Datos reales: `db.js:138-139` y `db.js:149`.

**Clasificación.** **INTENCIONAL.** Comentario "acordado con Paco en 2018 para fidelizar
hostelería" (`calculo.js:38`), y el borde `>` está explícitamente comentado y respaldado por
una factura de ejemplo (`db.js:138-139`). Registrado como borde sensible en
`mapa-sistema.md:303-306`.

---

### RN-05 — El descuento se aplica al precio, línea a línea (desglosado)

**Enunciado.** Cuando hay descuento por volumen (RN-04), no se descuenta del total: se
**rebaja el precio unitario de cada línea** en el porcentaje correspondiente
(`precio × (100 − dto) / 100`, redondeado) y se recalcula la línea entera con ese precio ya
rebajado. Así la factura muestra el descuento desglosado línea a línea (base, IVA y recargo
ya calculados sobre el precio con descuento).

**Ejemplo.** Factura con una línea de cantidad `10`, precio `120,00 €`, IVA 21 %, sin recargo,
y base bruta total que supera 1.000 € (descuento 2 %):
- Precio con descuento: `120,00 × (100 − 2) / 100 = 117,60` → **117,60 €**.
- Base de la línea: `10 × 117,60 = 1.176,00` → **1.176,00 €**.
- Cuota IVA: `1.176,00 × 21 / 100 = 246,96` → **246,96 €**.

El descuento queda incorporado al precio impreso, no como una línea aparte.

**Evidencia.** Segundo bucle en `services/calculo.js:65-84`, en concreto el precio con
descuento en `calculo.js:67-70`.

**Clasificación.** **INTENCIONAL.** Comentario "el descuento se aplica linea a linea para que
la gestoria lo vea desglosado igual (peticion de Puri, 2018)" (`calculo.js:63-64`).

> **Matiz registrado (no es la regla, es un efecto de orden).** El porcentaje de descuento se
> decide sobre la base **bruta** (RN-04, antes de descontar), pero luego se aplica al precio
> y se **vuelve a redondear** la línea. Por el redondeo del precio con descuento
> (`calculo.js:69`), la base final tras descuento puede no ser exactamente
> `base_bruta × (100 − dto) / 100`. Es coherente con RN-02 (redondeo línea a línea) y
> deliberado; se anota solo para dejar claro el orden: **primero** se fija el % con la base
> bruta, **después** se redondea precio y línea.

---

### RN-06 — Recargo de equivalencia por tipo de IVA (tabla)

**Enunciado.** A los clientes en régimen de recargo de equivalencia (RN-07) se les añade,
sobre la base de cada línea, un porcentaje de recargo que depende del tipo de IVA de la línea:

| Tipo de IVA | Recargo de equivalencia |
|---|---|
| 21 % | 5,2 % |
| 10 % | 1,4 % |
| 4 % | 0,5 % |

**Ejemplo.** Base de línea `74,00 €` al 21 %: recargo `74,00 × 5,2 / 100 = 3,848` → **3,85 €**
(línea real de FA-2026-000102, `db.js:133`). Base `28,90 €` al 21 %:
`28,90 × 5,2 / 100 = 1,5028` → **1,50 €** (`db.js:134`).

**Evidencia.** `recargoPara` en `services/calculo.js:12-15` (ramas 21/10/4); aplicación en
`calcularLinea` (`calculo.js:29-32`). Dato real: `db.js:133-136`.

**Clasificación.** **INTENCIONAL.** Los porcentajes coinciden con los legales del recargo de
equivalencia español para esos tipos; documentado como regla delicada en `CLAUDE.md`.

---

### RN-07 — El recargo solo se aplica si el cliente lo tiene marcado

**Enunciado.** El recargo de equivalencia se calcula **solo** si el cliente tiene el
indicador `recargo_equivalencia` a `1`. Para el resto de clientes, la cuota de recargo de
cada línea es 0. La comprobación es por igualdad no estricta (`== 1`).

**Ejemplo.** Cliente 1 (`Cafetería La Parada`, `recargo_equivalencia = 0`, `db.js:96`):
su factura **FA-2026-000101** tiene recargo total 0 (`db.js:126`) y todas las líneas con
`cuota_recargo = 0` (`db.js:127-130`). Cliente 2 (`Ferretería El Tornillo`,
`recargo_equivalencia = 1`, `db.js:97`): su **FA-2026-000102** sí lleva recargo (RN-06).

**Evidencia.** `var conRecargo = cliente && cliente.recargo_equivalencia == 1` en
`services/calculo.js:49`; se pasa a `calcularLinea` y solo entonces se calcula
(`calculo.js:30-32`). Datos reales: `db.js:96-97, 126-136`.

**Clasificación.** **INTENCIONAL.** El campo `recargo_equivalencia` existe en el modelo de
datos precisamente para esto (`CLAUDE.md`, sección modelo de datos).

> **SUPOSICIÓN registrada.** La comparación `== 1` (no `=== 1`) acepta también el string
> `'1'` como verdadero pero rechazaría, p. ej., el valor `true` booleano. Dado que la BD
> guarda 0/1 enteros (`db.js:95-101`), en la práctica no debería haber diferencia.
> **Pregunta al negocio / a verificar:** ¿algún flujo pasa `recargo_equivalencia` como
> booleano o cadena en vez de 0/1? No evidenciado un caso que rompa; se deja anotado.

---

### RN-08 — Tipos de IVA antiguos con recargo conservados (16/18/7/8)

**Enunciado.** Para reabrir ejercicios antiguos, el sistema conserva la tabla de recargo de
equivalencia de tipos de IVA ya derogados: IVA 18 % → recargo 4 %, IVA 16 % → 4 %, IVA 8 % →
1 %, IVA 7 % → 1 %. Ninguna factura ni artículo nuevo usa estos tipos (los actuales son
21/10/4), pero la regla sigue viva en el código.

**Ejemplo.** Una línea histórica hipotética de base `100,00 €` al 16 % en cliente con recargo
daría un recargo de `100,00 × 4 / 100 = 4,00 €`. No hay factura real con estos tipos en
`datos/gesfact.db` (todos los artículos usan 21/10/4, `db.js:105-112`); es código latente.

**Evidencia.** `recargoPara` en `services/calculo.js:18-21`, con el comentario
`calculo.js:16-17` ("tipos antiguos ... no borrar por si hay que reabrir ejercicios viejos
del Access").

**Clasificación.** **INTENCIONAL.** Comentario explícito de conservación; registrado como
"código muerto a propósito" en `mapa-sistema.md:267-269`.

---

### RN-09 — Tipo de IVA desconocido → recargo 0

**Enunciado.** Si una línea llega con un tipo de IVA que no está en la tabla (ni actual
21/10/4 ni antiguo 18/16/8/7), el recargo de equivalencia calculado es **0** (no hay error ni
aviso; la línea sigue calculándose y el IVA se aplica igualmente sobre el tipo que sea).

**Ejemplo.** Una línea al 5 % de IVA (tipo inexistente en la tabla) en cliente con recargo:
`recargoPara(5)` cae en el `return 0` final; recargo de la línea = 0. El IVA sí se calcularía:
base `100,00 × 5 / 100 = 5,00 €`.

**Evidencia.** `return 0` final de `recargoPara` (`services/calculo.js:22`). La comparación
de tipos es estricta (`=== 21`, etc., `calculo.js:13-21`), así que un `21.0`/`'21'` que no
sea exactamente el número 21 también caería aquí.

**Clasificación.** **DUDOSA (respuesta SIMULADA, sin ratificar).** No hay comentario que diga si el 0 es
una decisión (tratar lo desconocido como sin recargo) o un simple fallback. **Pregunta al negocio:**
¿debería un tipo de IVA no reconocido rechazarse en vez de calcular recargo 0 silenciosamente? Además, la
igualdad estricta `===` hace que un tipo de IVA que llegue como cadena (`'21'`) obtenga recargo 0 aunque
sea el 21; a verificar si algún flujo pasa el tipo como texto.

> **Estado tras el acta (2026-07-07, D-04 — [SIMULADA — ratificar]).** El consultor respondió *en nombre
> del negocio* (rechazar el IVA no reconocido; corregir la comparación `===` con `'21'`), pero esa
> respuesta **no es testimonio vivo** y **no cierra** la regla. **Sigue DUDOSA / pendiente de
> ratificación** por Puri/Paco. Ver A-16 del [registro de anomalías](./registro-de-anomalias.md).

---

### RN-10 — Prorrateo comercial de cuotas: mes de 30 días fijos

**Enunciado.** Cuando una cuota mensual de contrato se prorratea (alta o baja a mitad de
mes) mediante el cálculo central `calcularProrrateo`, el mes se considera **siempre de 30
días**, independientemente del mes real. Se cobra `cuota / 30 × días_de_servicio`,
redondeado. Los días de servicio se cuentan como `día_hasta − día_desde + 1` (ambos
inclusive) dentro del **mismo** mes.

**Ejemplo.** Cuota mensual `90,00 €`, servicio del 16 al 30 (15 días): `90 / 30 × 15 = 45,00`
→ **45,00 €**. Del 1 al 15 (15 días): igual, `45,00 €`. Mes completo (1 al 30, 30 días):
`90 / 30 × 30 = 90,00 €`.

**Evidencia.** `calcularProrrateo` en `services/calculo.js:95-102` (`cuota / 30 * dias`).
Lo usa la baja de contrato (`routes/contratos.js:39`, según `mapa-sistema.md:131`).

**Clasificación.** ~~**INTENCIONAL.** Comentario "Se prorratea 'a lo comercial': el mes son
siempre 30 dias ... Asi lo hacia Paco a mano en el Access y asi lo espera la gestoria"
(`calculo.js:90-93`).~~

> **REVOCADA (acta de entrevista 2026-07-07, D-01 — Paco/Puri).** El negocio decidió **en firme** que
> el prorrateo oficial es el de **días reales del mes** (RN-13), no el de 30 días fijos. El comentario
> de `calculo.js:90-93` ("así lo espera la gestoría") queda **superado por decisión viva del propio
> Paco**. RN-10 **deja de ser regla protegida a especificar tal cual**: describe un comportamiento
> **histórico** de la baja de contrato que, en modernización y de forma **no retroactiva**, se unificará
> con RN-13. Se conserva aquí como memoria de lo que hacía el sistema, no como especificación. Ver A-01
> del [registro de anomalías](./registro-de-anomalias.md) y D-01 del [acta](./entrevista-negocio.md).

---

### RN-11 — El día 31 no se cobra en el prorrateo comercial

**Enunciado.** En el prorrateo comercial (RN-10), como el mes son 30 días fijos, si el
periodo de servicio abarca 31 días (mes completo de 31 días) se **topa a 30**: el día 31 no
se cobra. Un mes de 31 días facturado entero cobra lo mismo que uno de 30.

**Ejemplo.** Cuota `90,00 €`, servicio del 1 al 31 (31 días naturales): `dias = 31`, se topa
a 30, `90 / 30 × 30 = 90,00 €`. El día 31 se pierde por diseño; el cliente paga la cuota
íntegra, no 31/30 de ella.

**Evidencia.** `if (dias > 30) dias = 30;` en `services/calculo.js:99`, con el comentario en
línea "meses de 31: el dia 31 no se cobra".

**Clasificación.** ~~**INTENCIONAL.** Comentario explícito y coherente con la lógica comercial
de 30 días de RN-10.~~ Registrado en `mapa-sistema.md:307-308`.

> **REVOCADA (acta de entrevista 2026-07-07, D-01 — Paco/Puri).** El negocio decidió **en firme** que
> **el día 31 SÍ se cobra** como un día más (alta 16–31 julio = 16 días facturados). "Topar a 30 / el
> día 31 no se cobra" **deja de ser comportamiento oficial**. Como RN-10, se conserva como memoria del
> comportamiento histórico de la baja de contrato; se corrige en modernización, no retroactivo. Ver A-01
> del registro de anomalías y D-01 del acta.

---

### RN-12 — Prorrateo negativo se corta a 0 días

**Enunciado.** Si en el prorrateo comercial el día "hasta" es anterior al día "desde" (los
días de servicio salen negativos), el número de días se fuerza a **0** y el importe
prorrateado es 0,00 €.

**Ejemplo.** `desde` día 20, `hasta` día 10 → `dias = 10 − 20 + 1 = −9`, se corrige a 0 →
`90 / 30 × 0 = 0,00 €`.

**Evidencia.** `if (dias < 0) dias = 0;` en `services/calculo.js:100`.

**Clasificación.** **DUDOSA (respuesta SIMULADA, sin ratificar).** No hay comentario. Podría ser una
guarda deliberada contra fechas invertidas o un parche defensivo. **Pregunta al negocio:** cuando desde
> hasta (¿error de captura?), ¿lo correcto es cobrar 0 € silenciosamente o debería avisarse? Nótese
además que la función asume `desde` y `hasta` **en el mismo mes** (solo mira el día, `calculo.js:96-97`);
un periodo a caballo entre dos meses daría un cálculo sin sentido.

> **Estado tras el acta (2026-07-07, D-03 — [SIMULADA — ratificar]).** En la reunión el consultor
> respondió *en nombre del negocio* (avisar y no permitir grabar; no cruzar dos meses, emitir dos líneas
> si hiciera falta), pero esa respuesta **no es testimonio vivo** y **no cierra** la regla. **Sigue
> DUDOSA / pendiente de ratificación** por Marga/Paco. Ver A-15 del registro de anomalías.

---

### RN-13 — La remesa mensual prorratea sobre días reales del mes (cálculo distinto)

**Enunciado.** El lote mensual de cuotas de contrato (`scripts/remesa_mensual.js`) prorratea
de forma **distinta** al cálculo central (RN-10): usa los **días reales del mes** facturado,
no 30 fijos. Cobra `cuota / días_reales_del_mes × días_de_servicio`, redondeado. Para el
mismo periodo, la remesa y la baja de contrato pueden dar importes diferentes.

**Ejemplo (misma cuota, resultados distintos).** Contrato de `60,00 €`, servicio del 16 al 30
de un mes de 31 días (p. ej. julio):
- **Remesa mensual (RN-13):** días del mes = 31, días de servicio = `30 − 16 + 1 = 15` →
  `60 / 31 × 15 = 29,032…` → **29,03 €**.
- **Prorrateo central (RN-10):** `60 / 30 × 15 = 30,00` → **30,00 €**.

Diferencia de 0,97 € en el mismo supuesto. (Contrato real análogo: alta del lavavasos a mitad
de mes, `db.js:118`, cuota 60,00 €.)

**Evidencia.** `scripts/remesa_mensual.js:47-51` (`diasMes = util.diasDelMes(primerDia)`;
`importe = cuota / diasMes * diasServicio`) frente a `services/calculo.js:95-102` (30 fijos).
`diasDelMes` en `lib/util.js:36-39`.

**Clasificación.** **INTENCIONAL — y confirmada como el prorrateo OFICIAL (acta 2026-07-07, D-01).**
La coexistencia con RN-10 fue el hallazgo H-3 (dos métodos para lo mismo); el negocio (Paco/Puri) resolvió
**en firme** que la fórmula correcta es esta, la de **días reales del mes**, y que **el día 31 se cobra**.
RN-10/RN-11 quedan revocadas y a unificar con RN-13 en modernización (no retroactivo). Registrado en
`mapa-sistema.md:290-293`. **Pregunta al negocio: RESUELTA** — ver A-01 del [registro de anomalías](./registro-de-anomalias.md)
y D-01 del [acta](./entrevista-negocio.md).

---

## Numeración de facturas (`lib/numeracion.js`)

### RN-14 — Numeración correlativa por serie y año, sin huecos

**Enunciado.** Cada factura recibe un número correlativo dentro de su serie y su año: el
sistema toma el último número usado de ese `(serie, año)` y asigna el siguiente
(`último + 1`). La numeración debe ser **correlativa y sin huecos** por obligación legal; por
eso las facturas **no se borran nunca**: un error se corrige emitiendo una rectificativa en la
serie `RE` y una factura nueva. El año que decide el contador es el **año natural actual del
sistema** (fecha de ejecución), no la fecha que lleve la factura.

**Ejemplo.** Con el contador real de `FA` en 2026 = 108 (`db.js:176`), la siguiente factura
`FA` de 2026 será `FA-2026-000109`. La serie `RE` va por su cuenta: contador 2026 = 1
(`db.js:177`), la siguiente rectificativa será `RE-2026-000002`. Las series no comparten
numeración.

**Evidencia.** `siguienteNumero` / `reservar` en `lib/numeracion.js:14-36`; año actual en
`numeracion.js:15` (`new Date().getFullYear()`). Comentario legal `numeracion.js:3-6`. Datos
reales de contadores: `db.js:176-177`.

**Clasificación.** **INTENCIONAL.** Comentario "IMPORTANTE (legal): la numeracion tiene que
ser correlativa y sin huecos ... desde la inspeccion de 2020 las facturas NO SE BORRAN NUNCA"
(`numeracion.js:3-6`).

> **Matiz registrado.** El año se toma de la **fecha del sistema al grabar**
> (`new Date().getFullYear()`), no de `factura.fecha`. La remesa mensual factura "el mes que
> acaba de terminar" (`remesa_mensual.js:5`), que normalmente cae en el mismo año; pero una
> remesa de diciembre lanzada en enero tomaría el contador del año nuevo. **SUPOSICIÓN /
> pregunta al negocio:** ¿es correcto que una factura con fecha de diciembre grabada en enero
> use la numeración del año siguiente? No evidenciado que ocurra; se anota.

---

### RN-15 — El contador de un año nuevo se abre a cero

**Enunciado.** La primera vez que se pide número para una serie en un año que aún no tiene
contador, el sistema abre ese contador a 0 y asigna el número 1. Cada serie arranca su
correlativo en 1 cada año.

**Ejemplo.** Primera factura `FA` de 2027 (sin contador previo para `('FA', 2027)`): se crea
el contador a 0 y se emite `FA-2027-000001`.

**Evidencia.** Rama `if (!fila)` en `lib/numeracion.js:18-23` (INSERT a 0 y luego
`reservar(..., 0, cb)` que devuelve 1).

**Clasificación.** **INTENCIONAL.** Comentario "año nuevo: se abre contador a cero"
(`numeracion.js:19`). Coherente con la correlatividad legal por año de RN-14.

---

### RN-16 — Formato del número de factura: SERIE-AAAA-NNNNNN

**Enunciado.** El número de factura se compone como `SERIE-AÑO-SECUENCIAL`, con el secuencial
**rellenado con ceros a la izquierda hasta 6 dígitos**. Si el secuencial superara los 6
dígitos (más de 999.999 facturas de una serie en un año), no se trunca: se imprime tal cual,
con más dígitos.

**Ejemplo.** Serie `FA`, año 2026, número 109 → `FA-2026-000109`. Número 1 → `FA-2026-000001`.
Número 1.000.000 (hipotético) → `FA-2026-1000000` (7 dígitos, sin recorte).

**Evidencia.** `formatear` en `lib/numeracion.js:38-42` (`while (s.length < 6) s = '0' + s`).

**Clasificación.** **INTENCIONAL.** El acolchado a 6 es coherente con los números reales
grabados (`FA-2026-000101`, etc., `db.js:126`). El comportamiento con >6 dígitos es un borde
teórico, no un caso previsto.

---

### RN-17 — La reserva de número no es atómica (dos usuarios a la vez pueden repetir número)

**Enunciado.** El sistema **no garantiza** número único si dos facturas se graban
simultáneamente: primero lee el último número y luego, en un paso aparte, graba
`último + 1`, sin bloqueo entre ambos. Dos usuarios que graben a la vez pueden leer el mismo
"último" y obtener el mismo número, produciendo un duplicado (que violaría la correlatividad
sin huecos de RN-14).

**Ejemplo.** Marga y Julián graban una factura `FA` en el mismo instante: ambos leen
`ultimo = 108`, ambos calculan `109`, ambos emiten `FA-2026-000109`. Es exactamente el
incidente descrito por el autor: "el 2 de enero salieron dos facturas con el mismo numero
porque Marga y yo grabamos a la vez".

**Evidencia.** Lectura en `lib/numeracion.js:16` (`SELECT ultimo`) y escritura separada en
`numeracion.js:30-32` (`UPDATE contadores SET ultimo = ?`), sin transacción ni bloqueo entre
ambas. Comentario del incidente en `numeracion.js:8-10`.

**Clasificación.** **ACCIDENTAL.** Es una limitación conocida de la implementación, no una
regla deseada; el propio autor la documenta como problema ("no ha vuelto a pasar (creo)").
Registrada como anomalía en `mapa-sistema.md:287-289` y en `CLAUDE.md`. **No se corrige en
esta fase.**

---

## Fechas y validación (`lib/util.js`)

### RN-18 — Vencimiento = fecha de factura + días de pago

**Enunciado.** La fecha de vencimiento de una factura se calcula sumando a la fecha de la
factura los días de pago acordados con el cliente. La suma se hace en días naturales.

**Ejemplo.** Factura real **FA-2026-000104** con fecha `2026-03-05` y cliente 4
(`Panadería Hnos. Cifuentes`, sin `dias_pago` → 30 por defecto, RN-19): vencimiento
`2026-04-04` (`db.js:145`), que es 30 días naturales después. Factura **FA-2026-000103**,
cliente 5 con `dias_pago = 60` (`db.js:100`): fecha `2026-02-20`, vencimiento `2026-04-21`
(`db.js:139`), 60 días después.

**Evidencia.** `sumarDias` en `lib/util.js:20-26`; uso en la remesa
(`remesa_mensual.js:60`, `util.sumarDias(fecha, co.dias_pago || 30)`). Datos reales:
`db.js:139, 145`.

**Clasificación.** **INTENCIONAL.** Es el uso normal del vencimiento; coincide con las fechas
reales grabadas.

> **Hallazgo asociado (H-4): desfase de un día no reproducido.** `sumarDias` calcula por
> milisegundos (`new Date(fecha).getTime() + dias * 86.400.000 ms`, `util.js:21`). Al parsear
> `'YYYY-MM-DD'` como **UTC** y luego leer `getDate()` en hora **local**, un cambio de horario
> de verano/invierno dentro del intervalo puede correr la fecha un día. El propio autor lo
> anota: "en marzo de 2019 el vencimiento de una factura salio un dia menos ... creo que fue
> por el cambio de hora, no he conseguido reproducirlo" (`util.js:17-19`). Afecta a los
> vencimientos de todas las facturas. **Se registra, no se corrige** (`mapa-sistema.md:294-296`).

---

### RN-19 — Días de pago por defecto cuando el cliente no los tiene

**Enunciado.** Si el cliente no tiene definida forma de pago (`dias_pago` vacío/nulo), el
vencimiento se calcula a **30 días** por defecto.

**Ejemplo.** Cliente 1 (`Cafetería La Parada`, `dias_pago = null`, `db.js:96`): sus facturas
vencen a 30 días de la fecha de emisión. En la remesa, `co.dias_pago || 30`
(`remesa_mensual.js:60`) sustituye el nulo por 30.

**Evidencia.** `co.dias_pago || 30` en `scripts/remesa_mensual.js:60`; constante
`VENCIMIENTO_DIAS: 30` en `config.js:40` (fuente documentada del valor por defecto, aunque la
remesa use el literal `30`). Datos reales: `db.js:96, 99, 101` (clientes con `dias_pago`
nulo).

**Clasificación.** **INTENCIONAL.** El campo `dias_pago` NULL con caída a un valor por
defecto está documentado en `CLAUDE.md` (modelo de datos) y hay constante dedicada en
`config.js:39-40`.

> **Hallazgo menor (H-5): discrepancia comentario/código.** El valor por defecto vive en dos
> sitios: la constante `config.VENCIMIENTO_DIAS = 30` (`config.js:40`) y el literal `30`
> incrustado en `remesa_mensual.js:60` (`co.dias_pago || 30`). La remesa **no lee la
> constante**, usa el número a mano. Coinciden hoy (ambos 30), pero si algún día se cambiara
> `VENCIMIENTO_DIAS` en `config.js`, la remesa seguiría con 30. Se registra como riesgo de
> desincronización; **no se corrige.**
>
> **SUPOSICIÓN adicional:** con `co.dias_pago || 30`, un cliente con `dias_pago = 0`
> (pago al contado) obtendría 30 días, porque `0 || 30 === 30`. No hay cliente así en los
> datos reales (`db.js:96-101`); a verificar con negocio si "0 días" es un caso posible.

---

### RN-20 — La validación de NIF solo comprueba la longitud (9 caracteres)

**Enunciado.** Un NIF/CIF se considera válido si, tras quitar espacios y guiones, tiene
**exactamente 9 caracteres**. No se comprueba la letra de control ni el formato (letras vs.
dígitos), ni se normaliza mayúsculas/minúsculas. Cualquier cadena de 9 caracteres pasa.

**Ejemplo.** `'70355910k'` (cliente real 6, `Bar Nuevo Siglo`, `db.js:101`, con la letra en
**minúscula**) se acepta: 9 caracteres → válido. También pasaría `'XXXXXXXXX'` o
`'123456789'`. En cambio `'B4581239'` (8 caracteres) se rechazaría.

**Evidencia.** `validarNIF` en `lib/util.js:44-48` (`return nif.length === 9`). Dato real de
NIF dudoso aceptado: `db.js:101`.

**Clasificación.** **ACCIDENTAL** (respecto a lo que "debería" validar un NIF), pero con
**reconocimiento explícito**: el propio autor lo marca como pendiente y justifica por qué se
dejó así — "TODO Julian 11/2017: falta comprobar la letra, de momento con la longitud vale
porque los da de alta Marga y los mira ella" (`util.js:42-43`). Registrada como anomalía en
`mapa-sistema.md:297-299`. **No se corrige en esta fase.**

---

### RN-21 — Formato de importe español (miles con punto, decimales con coma)

**Enunciado.** Los importes que se muestran e imprimen se presentan en formato español: dos
decimales obligatorios, coma como separador decimal y punto como separador de miles. Los
valores nulos, indefinidos o no numéricos se muestran como `0,00`. El signo negativo se
antepone a todo.

**Ejemplo.** `1234.5` → `"1.234,50"`; `9.5` → `"9,50"`; `-122.23` (total de la rectificativa
real RE-2026-000001, `db.js:160`) → `"-122,23"`; `null` → `"0,00"`.

**Evidencia.** `formatearImporte` en `lib/util.js:51-58`. Dato real de importe negativo:
`db.js:160`.

**Clasificación.** **INTENCIONAL.** Es el formato de importe que ve la gestoría
(`mapa-sistema.md:87`); coherente con el separador `;` y decimales con coma del CSV de
exportación (`routes/informes.js`, `mapa-sistema.md:143-144`).

---

## Hallazgos (discrepancias y bordes registrados, no corregidos)

Resumen de lo que, además de las reglas, merece pregunta o vigilancia. Todo se **registra,
no se corrige** (constitución).

| ID | Hallazgo | Regla afectada | Evidencia |
|---|---|---|---|
| H-1 | `Math.round` redondea el medio hacia +∞; efecto no comprobado en importes negativos | RN-01 | `util.js:5-7` |
| H-2 | Tipo de IVA desconocido o pasado como cadena (`'21'`) da recargo 0 en silencio (`===`) | RN-09 | `calculo.js:13-22` |
| H-3 | **Dos prorrateos distintos:** 30 días fijos (baja de contrato) vs. días reales (remesa) | RN-10, RN-13 | `calculo.js:95-102` vs. `remesa_mensual.js:47-51` |
| H-4 | `sumarDias` con posible desfase de un día por cambio de hora (UTC vs. local) | RN-18 | `util.js:17-26` |
| H-5 | Valor por defecto de vencimiento duplicado: `config.VENCIMIENTO_DIAS` vs. literal `30` en la remesa; y `dias_pago = 0` caería a 30 | RN-19 | `config.js:40`, `remesa_mensual.js:60` |
| H-6 | Numeración no atómica: duplicado posible con dos grabaciones simultáneas | RN-14, RN-17 | `numeracion.js:8-10, 16, 30-32` |
| H-7 | Numeración toma el año de la fecha del sistema, no de `factura.fecha` | RN-14 | `numeracion.js:15` |
| H-8 | Validación de NIF solo por longitud; acepta letra en minúscula y cadenas sin sentido | RN-20 | `util.js:44-48`, `db.js:101` |
| H-9 | `calcularProrrateo` asume desde/hasta en el mismo mes (solo mira el día) | RN-10, RN-12 | `calculo.js:96-97` |

### Preguntas abiertas al negocio (derivadas de las SUPOSICIONES)

> Estado tras el [acta de entrevista del 2026-07-07](./entrevista-negocio.md): las preguntas 1 y 4 se
> **resolvieron en firme**; las 2, 3 y 5 tienen **respuesta simulada del consultor pendiente de
> ratificación** (no cuentan como cerradas); la 6 sigue abierta.

1. ~~**(H-3, RN-13)** ¿Cuál es el prorrateo que espera la gestoría: mes de 30 días fijos o días
   reales del mes?~~ **RESUELTA (acta D-01, Paco/Puri):** días reales del mes; el día 31 se cobra.
   RN-10/RN-11 revocadas; RN-13 es la oficial.
2. **(H-2, RN-09)** ¿Un tipo de IVA no reconocido debe calcular recargo 0 o rechazarse?
   **Respuesta SIMULADA (acta D-04): rechazar. Pendiente de ratificación** por Puri/Paco (A-16).
3. **(H-5, RN-19)** ¿Existe algún cliente de "pago al contado" (`dias_pago = 0`)? Con la
   lógica actual pasaría a 30 días. **Respuesta SIMULADA (acta D-05): no existe hoy; "0" debe ser
   contado. Pendiente de ratificación** por Marga/Paco + arqueología de datos (A-05).
4. ~~**(H-7, RN-14)** ¿Es correcto que una factura con fecha de diciembre grabada en enero use
   la numeración del año nuevo?~~ **RESUELTA (acta D-02, Puri/fiscal):** no; manda el año de
   `factura.fecha`. (A-14.)
5. **(RN-12, H-9)** Cuando en un prorrateo "desde" es posterior a "hasta", ¿cobrar 0 € en
   silencio o avisar? **Respuesta SIMULADA (acta D-03): avisar y no grabar; no cruzar meses.
   Pendiente de ratificación** por Marga/Paco (A-15).
6. **(H-1, RN-01)** ¿Hay algún flujo que redondee importes negativos directamente (fuera de
   las rectificativas que copian signos sin recalcular)? **Sigue abierta** (no tocada por el acta).

---

*Extraído en fase de reconocimiento a partir de los módulos de lógica de negocio central de
criticidad ALTA (`services/calculo.js`, `lib/numeracion.js`) y su utilidad dependiente
(`lib/util.js`), más la discrepancia de prorrateo de `scripts/remesa_mensual.js`. Toda
afirmación se apoya en `fichero:líneas` del repositorio o en datos reales de
`datos/gesfact.db`. Las suposiciones se marcan como SUPOSICIÓN y se convierten en preguntas.
No se corrige nada.*

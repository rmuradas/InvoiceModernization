# Acta de entrevista de negocio — GesFact 2.4

**Sistema:** GesFact 2.4, facturación en producción de Suministros Hidalgo, S.L. (Illescas, Toledo).
**Fase:** reconocimiento — *documentar y proteger, no corregir* (`.specify/memory/constitution.md`).
**Fecha de la reunión:** 2026-07-07.
**Consultor:** (reconocimiento e ingeniería inversa).
**Interlocutores del negocio previstos:** Paco (gerente / doctrina comercial), Puri (gestoría),
Marga (administración), Julián (técnico/despliegue), asesorías fiscal y RGPD, Manoli (correo).

> **Aviso de método (constitución).** Esta acta consolida el guion de la entrevista que abrían las
> clasificaciones **PENDIENTES** y **DUDOSAS** del [registro de anomalías](./registro-de-anomalias.md),
> las [contradicciones](./contradiccion-00-indice.md) y las preguntas abiertas de la
> [memoria histórica](./memoria-historica.md) / [reglas de negocio](./reglas-de-negocio.md).
>
> Las respuestas de las **preguntas 1 y 2** las dio el interlocutor en la reunión. A partir de la
> pregunta 3, por indicación del negocio, el consultor **respondió en su nombre con el criterio más
> lógico y coherente** con lo ya decidido. Esas respuestas se marcan **[SIMULADA — ratificar]** y
> **no** son testimonio de negocio vivo válido hasta que la persona responsable las confirme por
> escrito. Mientras tanto, las anomalías afectadas quedan **PENDIENTE DE RATIFICACIÓN**, no cerradas.
> Nada de lo aquí acordado se aplica al código en esta fase (documentar y proteger).

---

## 1. Resumen ejecutivo

- Se resolvieron las **4 clasificaciones PENDIENTES** (A-01, A-14, A-15, A-16) y se recogió decisión
  para las anomalías con "decisión de negocio pendiente" (A-02 a A-20).
- **Solo A-01 y A-14 tienen respuesta firme del negocio** en esta reunión. El resto son respuestas
  simuladas por el consultor, a ratificar.
- **Decisión de mayor impacto (A-01):** el prorrateo oficial es **días reales del mes** y **el día 31
  sí se cobra**. Esto **cambia** el comportamiento observable de la pantalla de baja de contrato
  (hoy 30 días fijos, día 31 no se cobra) → deja de ser regla protegida y pasa a corrección en
  modernización.
- **Segunda decisión firme (A-14):** la numeración debe ir por el **año de la fecha de la factura**,
  no por el año de grabación. También cambia comportamiento actual.
- Ambas decisiones firmes exigen, antes de tocar nada, un **conteo de facturas históricas afectadas**
  (arqueología de datos aún no realizada) y son **no retroactivas** (numeración sin huecos, no se
  reescriben facturas emitidas).

---

## 2. Decisiones firmes del negocio (respuesta en reunión)

### D-01 · Prorrateo de cuotas de contrato → **días reales del mes; el día 31 se cobra** (A-01)

**Dirigida a:** Paco (doctrina comercial) con Puri (gestoría).
**Pregunta.** ¿El prorrateo oficial es 30 días fijos (pantalla de baja) o días reales del mes
(remesa)? ¿Se cobra el día 31?
**Ejemplo planteado.** Cuota 60,00 €, servicio 16–30 de julio (31 días): A) 30 fijos = 30,00 € vs.
B) días reales = 60/31×15 = 29,03 € (−0,97 €). Alta 16–31 julio (16 días) con B = 60/31×16 = 30,97 €.
**Respuesta del negocio.** **B) días reales del mes.** Y **sí**, el **día 31 se cobra** como un día
más (16–31 julio = 16 días facturados). Se abandona la doctrina "topar a 30 / el día 31 no se cobra".
**Decisión.** El prorrateo oficial es la fórmula de la remesa (`cuota / díasRealesMes × díasServicio`,
`scripts/remesa_mensual.js:47-51`). La fórmula de 30 días fijos con tope a 30
(`services/calculo.js:95-102`, usada por la baja de contrato `routes/contratos.js:39`) queda
**desalineada** y a unificar en modernización.
**Consecuencias / cautelas.**
- **RN-10 y RN-11 dejan de ser "regla protegida a especificar tal cual"**: el mes de 30 días fijos y
  "el día 31 no se cobra" ya **no** son el comportamiento oficial. Actualizar su clasificación.
- **No retroactivo:** las facturas de baja ya emitidas con la fórmula A no se reescriben.
- **Dato pendiente (arqueología):** contar cuántas facturas históricas de baja de contrato salieron
  con la fórmula A (30 fijos) para dimensionar el desfase ya reconciliado por la gestoría.
- Unificar en **una sola** función de prorrateo (la de días reales) preservando el redondeo a 2
  decimales (RN-01).

### D-02 · Numeración por **año de la fecha de la factura** (A-14)

**Dirigida a:** Puri (gestoría) con visto bueno de asesoría fiscal.
**Pregunta.** ¿Es correcto que una factura fechada en diciembre pero grabada en enero use la
numeración del año nuevo?
**Ejemplo planteado.** Remesa de dic-2026 lanzada el 3-ene-2027: hoy saldría `FA-2027-000001` con
fecha de diciembre 2026.
**Respuesta del negocio.** El número **debe ir por el año de la fecha de la factura** (dic-2026 →
`FA-2026-...`).
**Decisión.** El año del contador se toma de **`factura.fecha`**, no de
`new Date().getFullYear()` (`lib/numeracion.js:15`). Es un **cambio de comportamiento** → A-14 pasa
de PENDIENTE a **corregir en modernización** con decisión escrita.
**Consecuencias / cautelas.**
- **No retroactivo.** **Dato pendiente:** verificar que ninguna factura histórica quedara "cruzada"
  (fecha de un año, número de otro). Si la hubiera, es hecho consumado a documentar, no a reescribir
  (correlatividad sin huecos, RN-14 / A-02).
- **Tensión a vigilar (anotada en reunión):** al facturar dic-2026 en enero, el contador de
  `('FA', 2026)` debe seguir vivo para cerrar diciembre aunque ya exista el de 2027. Convivencia de
  dos contadores de año en la misma sesión de trabajo.

---

## 3. Decisiones simuladas por el consultor (**[SIMULADA — ratificar]**)

> A partir de aquí, respuestas emitidas por el consultor con el criterio más lógico, a confirmar por
> la persona responsable. **No cierran la anomalía**; la dejan *pendiente de ratificación*.

### D-03 · Prorrateo con fechas invertidas → **avisar, no facturar 0 € en silencio** (A-15)
**Responsable:** Marga / Paco. **[SIMULADA — ratificar]**
Cuando "desde" es posterior a "hasta" (error de tecleo), el sistema **debe avisar y no permitir
grabar**, en vez de facturar 0,00 € en silencio (`services/calculo.js:100`). Además, un periodo de
prorrateo **no debe cruzar dos meses** (la función solo mira el día, `calculo.js:96-97`); si hiciera
falta cubrir dos meses, se emiten dos líneas. **No retroactivo.**

### D-04 · Tipo de IVA no reconocido → **rechazar, no recargo 0 silencioso** (A-16)
**Responsable:** Puri / Paco. **[SIMULADA — ratificar]**
Un tipo de IVA fuera de la tabla (vigentes 21/10/4; antiguos conservados 18/16/8/7) **debe
rechazarse**, no calcular recargo 0 en silencio (`services/calculo.js:22`). También corregir la
comparación estricta que rechaza `'21'` como cadena (`calculo.js:13-21`).

### D-05 · Vencimiento por defecto y pago al contado (A-05 / A-05b)
**Responsable:** Marga / Paco. **[SIMULADA — ratificar]**
- **No existe** hoy cliente de pago al contado (`dias_pago = 0`).
- Si en el futuro lo hubiera, "0 días" debe significar **contado**, no caer a 30
  (`co.dias_pago || 30`, `remesa_mensual.js:60`, es un bug: `0 || 30 === 30`).
- Si se cambia el plazo por defecto en `config.VENCIMIENTO_DIAS`, **debe afectar también a la
  remesa** (que hoy usa el literal `30`). Unificar leyendo `config`.

### D-06 · Importes con separador de miles (A-08)
**Responsable:** Marga. **[SIMULADA — ratificar]**
**No** se teclean importes con separador de miles (`1.234,56`); las líneas rara vez superan 1.000 €.
El agujero (`replace(',', '.')` solo sustituye la primera coma, ×3 rutas) es **latente**; corregir en
modernización extrayendo un único `util.parseImporte` robusto.

### D-07 · Total del informe de IVA con la aritmética de redondeo sagrada (A-06)
**Responsable:** Puri. **[SIMULADA — ratificar]**
El total del informe de IVA **debe seguir exactamente la misma aritmética de redondeo línea a línea**
que las facturas (`services/calculo.js:81-86`), no el acumulado en coma flotante de la vista
(`views/informe_iva.ejs:5`). Alinear en modernización; hoy no diverge (mismo número).

### D-08 · IVA por defecto también en contratos (A-09)
**Responsable:** Paco / gestoría. **[SIMULADA — ratificar]**
Si se cambia el IVA por defecto de la casa, **debe afectar también a los contratos**; unificar en
`config.IVA_DEFECTO` (hoy literal `21` en `routes/contratos.js:20` y `DEFAULT 21` en `db.js:46`).

### D-09 · Desfase de vencimiento por cambio de hora (A-10)
**Responsable:** Marga. **[SIMULADA — ratificar]**
**No** se ha vuelto a detectar ningún vencimiento descuadrado desde 2019; **no hay factura concreta**
para reproducir. Corregir el manejo de fechas (`lib/util.js:20-26`) por higiene, sin urgencia.

### D-10 · Fin de trimestre del informe → **último día real del mes** (A-11)
**Responsable:** Puri. **[SIMULADA — ratificar]**
El rango del trimestre debe usar el **último día real del mes**, no `AAAA-MM-31`
(`routes/informes.js:17-19`). Imperativo **antes** de cualquier migración a un motor con tipo fecha
estricto (hoy lo tapa la comparación textual de SQLite).

### D-11 · Validación de NIF (A-12)
**Responsable:** Marga / Paco. **[SIMULADA — ratificar]**
De momento **basta el control manual de Marga** (revisa las altas). Validar la letra de control es
deseable pero no urgente; documentar el control humano como mecanismo vigente
(`lib/util.js:44-48`).

### D-12 · Orden de líneas en la factura impresa (A-13)
**Responsable:** Marga / Puri. **[SIMULADA — ratificar]**
El **orden de líneas sí importa**: debe respetar el orden de captura. Nadie ha reclamado, pero al
unificar el grabado (hoy triple e inconsistente) hay que **preservar el orden**.

### D-13 · Fallo al rectificar → **rechazar todo y avisar** (A-04)
**Responsable:** Julián / Puri. **[SIMULADA — ratificar]**
Ante fallo al grabar una rectificativa, **rechazar toda la operación** y avisar; nunca grabar un abono
a medias en silencio ni marcar la original como `rectificada` si falla el espejo
(`routes/facturas.js:141-160`). Mantener intacta la regla **"rectificativa = espejo exacto sin
recalcular"** (Puri).

### D-14 · Reserva de número no atómica (A-02)
**Responsable:** Julián / asesoría fiscal. **[SIMULADA — ratificar]**
El duplicado **no ha reaparecido** desde 2021; hoy graban a la vez como mucho **Marga y Julián**.
Hacer atómica la reserva en modernización (transacción / bloqueo, `lib/numeracion.js:16,30-32`) **sin**
alterar la numeración ya emitida. Coordinar con A-03 (que un rollback no deje el contador avanzado).

### D-15 · Envío de facturas por correo (A-17)
**Responsable:** Marga / Manoli. **[SIMULADA — ratificar]**
**No reactivar** el envío automático por ahora; el envío manual desde el Outlook de Marga funciona.
Documentar el envío manual como proceso vigente; reactivar solo por decisión posterior hablando antes
con Manoli.

### D-16 · Secretos en `config.js` (A-18)
**Responsable:** Julián / Puri. **[SIMULADA — ratificar]**
La clave SMTP obsoleta **se puede rotar**. La clave de exportación de gestoría **`SH-CONTA-7731` sigue
viva y no se toca** sin avisar a Puri. Sacar secretos a variables de entorno / fichero fuera de
control de versiones **sin renombrar** `config.js` (se copia a mano a `\\SERVIDOR\gesfact`).

### D-17 · BD real y datos personales en Git (A-19)
**Responsable:** Paco / asesoría RGPD. **[SIMULADA — ratificar]**
**Autorizado** sacar `datos/gesfact.db` del repo, añadir `.gitignore` y sustituir por datos de ejemplo
anonimizados. La purga del histórico de Git se decide con la asesoría RGPD.

### D-18 · Deuda de infraestructura (A-20)
**Responsable:** Julián. **[SIMULADA — ratificar]**
**Autorizado** archivar `datos/migracion_mysql_2018.sql` (migración fantasma nunca ejecutada), sacar
`node_modules/` del control de versiones y declarar `engines` en `package.json`.

### D-19 · A-03 y A-07 (correcciones técnicas sin decisión de negocio)
**Responsable:** Julián.
- **A-03:** envolver alta de cabecera+líneas en transacción (`routes/facturas.js:74-99`).
- **A-07:** validar `NaN` en cantidad/precio antes de calcular (`routes/facturas.js:59-62`).
No requieren decisión de negocio salvo la constancia escrita del cambio de comportamiento ante error.

---

## 4. Condiciones, prohibiciones e información nueva recogida (aunque no se preguntara)

- **[Prohibición]** Ninguna corrección es **retroactiva**: las facturas emitidas no se reescriben
  (numeración correlativa sin huecos, obligación legal desde inspección 2020).
- **[Prohibición]** La regla **"rectificativa = espejo exacto, sin recalcular"** (Puri) se mantiene
  intacta pase lo que pase (D-13).
- **[Prohibición]** No renombrar ni mover `config.js` mientras el despliegue a `\\SERVIDOR\gesfact`
  sea manual (D-16).
- **[Prohibición]** No tocar la clave de exportación de gestoría `SH-CONTA-7731` sin avisar a Puri
  (D-16).
- **[Condición]** Toda corrección de comportamiento (D-01, D-02, D-03, D-04, D-13, D-14) requiere
  **decisión escrita** antes de aplicarse, y solo en fase de modernización.
- **[Condición]** Antes de unificar el prorrateo (D-01) y antes de tocar la numeración (D-02) hay que
  **contar las facturas históricas afectadas** (arqueología de datos aún no realizada).
- **[Información nueva]** Con D-01, las reglas **RN-10 y RN-11 dejan de ser "reglas protegidas a
  especificar tal cual"**; hay que reclasificarlas en `reglas-de-negocio.md` y en la tabla de reglas
  protegidas del `registro-de-anomalias.md`.
- **[Información nueva]** Con D-02, surge la convivencia de dos contadores de año en la misma sesión
  (cerrar diciembre del año viejo mientras corre el nuevo); vigilar al implementar.
- **[Información nueva]** Concurrencia real de grabado hoy: como máximo **dos usuarios** (Marga y
  Julián) (D-14).

---

## 5. Estado de las clasificaciones tras la reunión

| ID | Antes | Después | Estado |
|----|-------|---------|--------|
| A-01 | PENDIENTE | Días reales + día 31 se cobra; RN-10/11 dejan de ser protegidas | **Cerrada (firme)** |
| A-14 | PENDIENTE | Numeración por año de `factura.fecha` | **Cerrada (firme)** |
| A-15 | PENDIENTE | Avisar / no grabar; no cruzar meses | **Pendiente de ratificación** |
| A-16 | PENDIENTE | Rechazar IVA no reconocido | **Pendiente de ratificación** |
| A-02, A-04, A-05, A-06, A-08–A-13, A-17–A-20 | Decisión pendiente | Ver D-05..D-18 | **Pendiente de ratificación** |
| A-03, A-07 | Técnica | Ver D-19 | Corrección técnica en modernización |

---

## 6. Acuerdos y próximos pasos

1. **Ratificar por escrito** las decisiones **[SIMULADA]** (D-03 a D-18) con cada responsable antes de
   convertirlas en especificación.
2. **Arqueología de datos** (pendiente, la que falta según el registro de anomalías):
   - Nº de facturas históricas de baja de contrato con fórmula A (30 fijos) — dimensiona D-01.
   - Comprobar facturas con año de número ≠ año de fecha — dimensiona D-02.
   - Confirmar que no existe cliente con `dias_pago = 0` — respalda D-05.
3. **Reclasificar RN-10 y RN-11** en `reglas-de-negocio.md` a la luz de D-01.
4. Ninguna corrección se aplica en esta fase (documentar y proteger). Las decisiones firmes solo se
   implementan en modernización, con decisión escrita y de forma **no retroactiva**.

---

## 7. Pendiente para próxima ronda

> Esta sección **es la agenda de la próxima conversación con el negocio.** Se nutre de: (a) lo que quedó
> sin respuesta concluyente en esta reunión (todas las **[SIMULADA — ratificar]**), (b) las preguntas
> nuevas que surgieron al propagar el acta a los registros, y (c) preguntas antiguas de la memoria
> histórica que ninguna decisión de esta reunión ha tocado. Mientras tenga entradas, el reconocimiento
> **no** está listo para pasar a specs formales.

### 7.1 Ratificaciones pendientes (respuestas simuladas por el consultor, sin valor de testimonio vivo)

Cada responsable debe **confirmar o corregir por escrito** la propuesta del consultor. Solo entonces se
cierra la anomalía correspondiente.

| Decisión | Anomalía | Responsable | Qué ratificar |
|---|---|---|---|
| D-03 | A-15 | Marga / Paco | Fechas invertidas: avisar y no grabar (hoy factura 0 € en silencio); no cruzar dos meses |
| D-04 | A-16 | Puri / Paco | IVA no reconocido: rechazar (no recargo 0 silencioso); corregir `===` que rechaza `'21'` |
| D-05 | A-05 / A-05b | Marga / Paco | "0 días" = contado; el defecto de vencimiento debe unificarse (`config`) también en la remesa |
| D-06 | A-08 | Marga | No se teclean importes con separador de miles; agujero latente, unificar `util.parseImporte` |
| D-07 | A-06 | Puri | Total del informe de IVA con la misma aritmética de redondeo línea a línea que las facturas |
| D-08 | A-09 | Paco / gestoría | El IVA por defecto debe afectar también a los contratos (unificar `config.IVA_DEFECTO`) |
| D-09 | A-10 | Marga | Sin vencimientos descuadrados desde 2019; corregir fechas por higiene, sin urgencia |
| D-10 | A-11 | Puri | Fin de trimestre = último día real del mes (no `-31`), antes de migrar a fecha estricta |
| D-11 | A-12 | Marga / Paco | Basta el control manual de Marga; validar letra de NIF, deseable no urgente |
| D-12 | A-13 | Marga / Puri | El orden de líneas importa; preservar el orden de captura al unificar el grabado |
| D-13 | A-04 | Julián / Puri | Fallo al rectificar: rechazar todo y avisar; mantener "espejo exacto sin recalcular" |
| D-14 | A-02 | Julián / fiscal | Reserva atómica en modernización; concurrencia real = 2 usuarios; sin duplicados desde 2021 |
| D-15 | A-17 | Marga / Manoli | No reactivar el envío automático; documentar el envío manual como proceso vigente |
| D-16 | A-18 | Julián / Puri | Rotar clave SMTP; `SH-CONTA-7731` viva (no tocar sin Puri); secretos fuera de VCS sin renombrar `config.js` |
| D-17 | A-19 | Paco / RGPD | Sacar `gesfact.db` del repo + `.gitignore` + datos anonimizados; purga del histórico con la asesoría RGPD |
| D-18 | A-20 | Julián | Archivar `migracion_mysql_2018.sql`; sacar `node_modules/` de VCS; declarar `engines` |

### 7.2 Arqueología de datos pendiente (dimensiona lo ya decidido; no bloquea la clasificación)

1. Nº de facturas históricas de baja de contrato emitidas con la fórmula A (30 días fijos) — dimensiona
   el desfase de D-01 ya reconciliado por la gestoría.
2. Facturas históricas con **año de número ≠ año de fecha** (contador "cruzado") — dimensiona D-02; si
   las hay, son hecho consumado a documentar, no a reescribir.
3. Confirmar que **no existe** ningún cliente con `dias_pago = 0` (pago al contado) — respalda D-05.

### 7.3 Preguntas nuevas surgidas al propagar el acta

- **(Numeración, técnica-fiscal)** Con D-02, al cerrar diciembre del año viejo en enero conviven dos
  contadores de año en la misma sesión (`('FA', viejo)` y `('FA', nuevo)`). ¿Cómo debe comportarse el
  sistema si en esa ventana se emiten a la vez una factura de cada año? (Registrado como **R15** en el
  registro de riesgos; a resolver al implementar, con Puri / asesoría fiscal.)
- **(RGPD)** ¿Se purga el histórico de Git de `datos/gesfact.db` o basta con sacarlo de aquí en adelante?
  Decisión que D-17 deja explícitamente a la asesoría RGPD.

### 7.4 Preguntas antiguas aún abiertas (no tocadas por esta reunión, siguen en la memoria histórica)

- ¿Existe todavía el Access original de GesFact 1.x y se considera fuente de verdad para reabrir
  ejercicios antiguos, o es archivo muerto? ([memoria-historica.md](./memoria-historica.md), 2017.)
- ¿Dónde está el `LEEME.txt` que referencia `db.js:4`? ¿Sigue vigente algún plan de migración a MySQL, o
  se descarta formalmente? (Relacionado con D-18/A-20.)
- ¿Hay acta o requerimiento documentado de la inspección de 2020 que citar como fuente legal de la
  numeración sin huecos?
- ¿Quién desinstaló `nodemailer` en 2023 y consta el aviso de seguridad concreto? (Relevante solo si se
  decidiera reactivar el correo — hoy D-15 dice que no.)

---

*Acta levantada en fase de reconocimiento. Las respuestas de las preguntas 1 y 2 (D-01, D-02) son
testimonio de negocio de la reunión del 2026-07-07; las demás (D-03..D-18) son respuestas simuladas
por el consultor, marcadas **[SIMULADA — ratificar]**, y no constituyen testimonio de negocio vivo
hasta su confirmación por la persona responsable. Toda afirmación técnica se apoya en `fichero:líneas`
del repositorio y en datos reales de `datos/gesfact.db`.*

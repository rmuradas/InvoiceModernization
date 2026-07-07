# Registro de anomalías — GesFact 2.4

**Sistema:** GesFact 2.4, facturación en producción de Suministros Hidalgo, S.L. (Illescas, Toledo).
**Fase:** reconocimiento — *documentar y proteger, no corregir* (`.specify/memory/constitution.md`).
**Fecha:** 2026-07-07.

Este documento **consolida** en un único registro todos los hallazgos del reconocimiento y la
ingeniería inversa. Cada anomalía tiene una entrada (A-01, A-02…) con descripción, evidencia por
testigos, clasificación final, dependientes, tratamiento acordado y decisión de negocio pendiente.
**No se corrige nada:** el comportamiento observable de hoy es la especificación.

## Fuentes consolidadas (recorridas todas)

- Reglas clasificadas en [reglas-de-negocio.md](./reglas-de-negocio.md) (RN-01…RN-21, H-1…H-9).
- Contradicciones [01](./contradiccion-01-prorrateo.md)–[06](./contradiccion-06-normalizacion-numerica-y-iva-defecto.md) e [índice](./contradiccion-00-indice.md).
- Riesgos [registro-riesgos.md](./registro-riesgos.md) (R1…R14).
- Discrepancias comentario-vs-código y "no tocar" de [memoria-historica.md](./memoria-historica.md).

> **Aviso de método sobre las dos fuentes de cierre citadas en el encargo.** El encargo nombra
> `entrevista-negocio.md` (respuestas del negocio) y una *arqueología de datos* (consultas resueltas
> sobre `datos/gesfact.db`) como las fuentes que "permiten cerrar clasificaciones".
> **Estado a 2026-07-07:** ya existe el [acta de entrevista](./entrevista-negocio.md). De ella **solo
> las respuestas a las preguntas 1 y 2 son testimonio de negocio vivo firme** (D-01 → A-01, D-02 →
> A-14): esas dos anomalías se **cierran**. El resto de respuestas del acta (D-03..D-18) son
> **simuladas por el consultor** y marcadas **[SIMULADA — ratificar]**: no son testimonio vivo válido y
> **no cierran** su anomalía (quedan *pendiente de ratificación*). La **arqueología de datos sigue sin
> realizarse**; hace falta para *dimensionar* lo ya decidido (A-01, A-14), no para decidirlo. Por eso la
> lista PENDIENTE (al final) **no queda vacía**: conserva A-15 y A-16 (a ratificar) y es la agenda de la
> próxima conversación con el negocio.

## Convención de testigos (para la regla innegociable de clasificación)

Se distinguen **tres testigos**, tal y como exige la constitución (toda afirmación necesita
evidencia: código, dato real o testimonio del negocio con nombre y fecha):

| Testigo | Qué es | Estado en esta fase |
|---|---|---|
| **CÓDIGO** | El comportamiento existe y se cita `fichero:líneas`. | Disponible. |
| **DATOS** | Consulta y resultado sobre `datos/gesfact.db` que confirma el comportamiento. | Disponible **solo** donde ya se calculó a mano en `reglas-de-negocio.md`; no hay arqueología nueva. |
| **NEGOCIO (doc)** | Comentario firmado en el código, con **actor y fecha**, que narra la decisión o el incidente (p. ej. "AVISO Julián mayo 2019"). Es testimonio de negocio **fosilizado en el código**. | Disponible donde el comentario existe. |
| **NEGOCIO (vivo)** | Respuesta de entrevista al negocio (Paco, Marga, Puri…). | **Parcial** (acta 2026-07-07): firme solo para A-01 (D-01) y A-14 (D-02); el resto del acta es respuesta simulada del consultor **[SIMULADA — ratificar]**, que **no cuenta como testigo vivo** hasta su ratificación escrita. |

**Regla innegociable aplicada:** nada se clasifica **INTENCIONAL** sin **al menos dos de los tres
testigos** a favor (CÓDIGO cuenta como uno; NEGOCIO-doc cuenta como testigo de negocio; DATOS como
otro). Cuando lo único a favor es CÓDIGO (el comportamiento existe pero no hay ni dato que lo
respalde como querido ni comentario que lo justifique), la clasificación queda **PENDIENTE** con la
pregunta exacta que la desbloquea. Un comentario que **reconoce** una limitación ("TODO", "no ha
vuelto a pasar (creo)") **no** es testigo de intención a favor: es prueba de que el comportamiento
es **ACCIDENTAL / BUG conocido**.

## Clasificaciones posibles

- **INTENCIONAL** — decisión deliberada con ≥2 testigos; es una **anomalía positiva / regla
  protegida** (comportamiento sagrado que la gestoría reconcilia).
- **ACCIDENTAL** — efecto colateral de la implementación, sin señal de que se buscara.
- **BUG HISTÓRICO CON DEPENDIENTES** — comportamiento incorrecto respecto a lo "esperable", pero del
  que **ya dependen** documentos emitidos, procesos externos o la propia reconciliación de la
  gestoría; corregirlo rompería a alguien.
- **BUG A SECAS** — incorrecto y sin dependientes identificados; latente.
- **PENDIENTE** — falta testigo (negocio vivo o dato) para cerrar; se anota la pregunta.

---

# Anomalías (ordenadas por impacto económico, de mayor a menor)

El impacto económico se estima por el efecto directo sobre importes facturados / reconciliados por
la gestoría. Encabezan las que **tocan el dinero de una factura**; cierran las de seguridad,
infraestructura y presentación que no alteran importes.

---

## A-01 — Doble prorrateo divergente de cuotas de contrato (30 días fijos vs. días reales del mes)

**Descripción.** El prorrateo de una cuota mensual de contrato está implementado **dos veces con
algoritmos distintos**: la baja de contrato usa mes comercial de 30 días fijos (día 31 no se cobra)
y la remesa mensual —la que factura de verdad— usa los días reales del mes; para un alta/baja a
mitad de un mes que no tenga 30 días, dan importes distintos.

**Evidencia.**
- **CÓDIGO:** [services/calculo.js:95-102](../../services/calculo.js#L95-L102) (`cuota/30*dias`, tope a 30) usado por [routes/contratos.js:39](../../routes/contratos.js#L39); frente a [scripts/remesa_mensual.js:45-56](../../scripts/remesa_mensual.js#L45-L56) (`cuota/diasMes*dias`, `diasMes` real). La remesa **no llama** a `calcularProrrateo` (verificado por búsqueda; único consumidor externo es la baja de contrato).
- **DATOS:** contratos reales [db.js:115-120](../../db.js#L115-L120). Divergencia cuantificada en [contradiccion-01 §3](./contradiccion-01-prorrateo.md): febrero ≈ +7 % en la remesa, meses de 31 días ≈ −3 %. Ej.: cuota 60 €, 15 días en marzo → A=30,00 € vs. B=29,03 € (−0,97 €); servicio 1–30 en mes de 31 días → A=90,00 € vs. B=87,10 € (−2,90 €).
- **NEGOCIO (doc):** el comentario de `calcularProrrateo` afirma la doctrina de la casa ("el mes son siempre 30 días… así lo hacía Paco a mano en el Access y así lo espera la gestoría", [calculo.js:90-93](../../services/calculo.js#L90-L93)). La remesa (Roberto, becario, 2021) **no** documenta por qué usa días reales.
- **NEGOCIO (vivo):** [acta de entrevista 2026-07-07, D-01](./entrevista-negocio.md) — Paco (doctrina comercial) con Puri (gestoría). Pregunta 1 respondida **en reunión** (testimonio firme, no simulado): el prorrateo oficial es **B) días reales del mes** y **el día 31 SÍ se cobra** como un día más. Se abandona la doctrina "topar a 30 / el día 31 no se cobra" del comentario-doc.

**Clasificación final (revisada 2026-07-07): CERRADA — el prorrateo oficial es días reales del mes; el día 31 se cobra.**
El testigo que faltaba (NEGOCIO vivo) ya se produjo. La fórmula oficial es la de la remesa
(`cuota / díasRealesMes × díasServicio`, [remesa_mensual.js:47-51](../../scripts/remesa_mensual.js#L47-L51)); la de 30 días fijos con tope a 30
([calculo.js:95-102](../../services/calculo.js#L95-L102), usada por la baja de contrato [routes/contratos.js:39](../../routes/contratos.js#L39)) queda **desalineada** y a unificar en modernización.

> **Registro del cambio de clasificación (no sobrescrito):** hasta 2026-07-07 esta anomalía estuvo
> **PENDIENTE** por falta de testigo de negocio vivo (solo CÓDIGO + NEGOCIO-doc contradictorio con la
> práctica real). El acta de 2026-07-07 (D-01) aporta ese testigo con nombre (Paco/Puri) y fecha, y la
> desbloquea. Consecuencia colateral: **la "regla protegida" RN-10/RN-11 (mes de 30 días fijos, día 31
> no se cobra) deja de ser comportamiento oficial** y pasa a corrección en modernización (ver tabla de
> reglas protegidas, más abajo, y `reglas-de-negocio.md`).

**Dependientes.** La **gestoría (Puri)**, que reconcilia; **administración (Marga)**, que emite a
mano la factura de baja con el número que sugiere la pantalla (importe de la fórmula A) mientras la
remesa graba con la fórmula B; **todas las facturas de cuota ya emitidas por la remesa** en meses
distintos de 30 días con prorrateo parcial usan la fórmula B.

**Tratamiento acordado.** **Documentar sin especificar** hasta decisión escrita. En modernización,
unificar en **una sola** fórmula; la corrección **no puede ser retroactiva** sobre facturas ya
emitidas (numeración sin huecos, no se reescriben). Precaución: antes de unificar, listar cuántas
facturas históricas de remesa cayeron en prorrateo parcial de mes ≠ 30 para dimensionar el desfase
ya reconciliado.

**Decisión de negocio: RESUELTA (acta 2026-07-07, D-01).** Prorrateo oficial = días reales del mes;
el día 31 se cobra. **Responsable que la dio:** Paco (doctrina comercial) con visto bueno de Puri
(gestoría). **Cautelas heredadas del acta:** (a) **no retroactivo** — las facturas de baja ya emitidas
con la fórmula A no se reescriben; (b) **dato de arqueología pendiente** — contar cuántas facturas
históricas de baja de contrato salieron con la fórmula A (30 fijos) para dimensionar el desfase ya
reconciliado por la gestoría; (c) unificar en **una sola** función de prorrateo preservando el
redondeo a 2 decimales (RN-01). La corrección solo se aplica en modernización, con decisión escrita.

---

## A-02 — Reserva de número de factura no atómica (posibles números duplicados)

**Descripción.** Al numerar una factura, el sistema **lee** el último número y en un paso separado
**escribe** `último+1`, sin transacción ni bloqueo; dos grabaciones simultáneas pueden obtener el
mismo número y romper la correlatividad sin huecos exigida legalmente.

**Evidencia.**
- **CÓDIGO:** `SELECT ultimo` en [lib/numeracion.js:16](../../lib/numeracion.js#L16) y `UPDATE … SET ultimo` en [numeracion.js:30-32](../../lib/numeracion.js#L30-L32), en callbacks distintos sin transacción.
- **NEGOCIO (doc):** el propio autor narra el incidente — "el 2 de enero salieron dos facturas con el mismo numero porque Marga y yo grabamos a la vez… no ha vuelto a pasar (creo)" ([numeracion.js:8-10](../../lib/numeracion.js#L8-L10)). Este testimonio **confirma que es un defecto**, no una decisión.
- **DATOS:** no reproducido en `datos/gesfact.db` (contadores coherentes hoy, [db.js:176-177](../../db.js#L176-L177)).

**Clasificación final: BUG HISTÓRICO CON DEPENDIENTES.** Es un defecto reconocido por el autor (no
intencional), pero pende de la **obligación legal** de numeración correlativa sin huecos (inspección
2020): un duplicado ya emitido no se puede "deshacer" borrando. La corrección afecta a un
comportamiento con dependencia legal directa.

**Dependientes.** Obligación legal de correlatividad (inspección 2020); cualquier factura duplicada
ya emitida sería un hecho consumado a documentar, no a borrar. Usuarios concurrentes: Marga y Julián.

**Tratamiento acordado.** **Corregir en fase de modernización** con precaución máxima: hacer atómica
la reserva (transacción / `INSERT … RETURNING` / bloqueo) **sin** alterar la numeración ya emitida.
**No retroactivo:** los números pasados quedan como están; si existiera un duplicado histórico, se
regulariza según criterio fiscal, no se reescribe.

**Decisión de negocio pendiente (parcialmente respondida, resto SIMULADO).** ¿Cuántos usuarios graban
facturas simultáneamente hoy y ha reaparecido el duplicado desde 2021? La corrección exige decisión escrita
por ser cambio de comportamiento. **Responsable:** Julián/Marga (operativa) + asesoría fiscal (encuadre legal).

> **Acta 2026-07-07, D-14 (Julián / asesoría fiscal) — [SIMULADA — ratificar]:** el duplicado **no ha
> reaparecido** desde 2021; hoy graban a la vez como mucho **dos usuarios (Marga y Julián)**. Propuesta:
> hacer atómica la reserva en modernización (transacción / bloqueo, [numeracion.js:16,30-32](../../lib/numeracion.js#L16-L32))
> **sin** alterar la numeración ya emitida, coordinando con A-03 (que un rollback no deje el contador
> avanzado). Testimonio recogido en reunión pero **pendiente de ratificación escrita**; no cierra la
> decisión. El dato de concurrencia real (máx. 2 usuarios) queda como información nueva de la reunión.

---

## A-03 — Alta de factura sin transacción: cabecera y líneas se graban sueltas

**Descripción.** El alta manual inserta la cabecera y luego las líneas en operaciones sueltas sin
transacción; un fallo a mitad deja una factura sin líneas o con líneas incompletas cuyos totales no
cuadran, o un número "quemado".

**Evidencia.**
- **CÓDIGO:** [routes/facturas.js:74-99](../../routes/facturas.js#L74-L99): `siguienteNumero` reserva el número, luego `INSERT` cabecera, luego `forEach` de `INSERT` de líneas **en paralelo**, sin transacción.
- **NEGOCIO (doc):** comentario que reconoce el problema y su apaño manual — "si falla una a mitad ya se apañó en su día a mano en la BD" ([facturas.js:81-82](../../routes/facturas.js#L81-L82)).
- **DATOS:** no hay factura descuadrada detectada en los datos actuales.

**Clasificación final: BUG HISTÓRICO CON DEPENDIENTES.** Reconocido y ya materializado alguna vez
("se apañó a mano"); pende de la integridad fiscal (totales que la gestoría reconcilia) y de la
numeración ya consumida.

**Dependientes.** Gestoría (cuadre de totales); numeración (número quemado = posible hueco). Facturas
históricas reparadas a mano.

**Tratamiento acordado.** **Corregir en modernización** envolviendo cabecera+líneas en una
transacción. **No retroactivo.** Precaución: al introducir transacción, revisar que un rollback no
deje el contador avanzado (coordinar con A-02).

**Decisión de negocio pendiente.** Ninguna de negocio (es corrección técnica); requiere decisión
escrita por ser cambio de comportamiento en caso de error. **Responsable:** Julián. **Acta 2026-07-07,
D-19:** confirmada como corrección técnica (envolver alta de cabecera+líneas en transacción,
[facturas.js:74-99](../../routes/facturas.js#L74-L99)); solo exige constancia escrita del cambio de
comportamiento ante error.

---

## A-04 — Rectificativa sin transacción y con error de línea silenciado

**Descripción.** La rectificación inserta la RE, copia las líneas espejo **en paralelo** y solo en el
último callback marca la original como `rectificada`; los errores de los `INSERT` de línea **no se
capturan**, de modo que un abono puede quedar a medias sin aviso y aun así marcar la original.

**Evidencia.**
- **CÓDIGO:** [routes/facturas.js:141-160](../../routes/facturas.js#L141-L160); el callback de línea es `function ()` sin parámetro de error ([facturas.js:151](../../routes/facturas.js#L151)); el `UPDATE … estado='rectificada'` ([facturas.js:154](../../routes/facturas.js#L154)) va en el último callback. Copia del patrón de A-03 pero **perdiendo** la captura de error (ver [contradiccion-03 §1.B](./contradiccion-03-grabado-factura-y-lineas.md)).
- **DATOS:** rectificativa real `RE-2026-000001` con importes en negativo ([db.js:160](../../db.js#L160)); no consta descuadre.

**Clasificación final: BUG HISTÓRICO CON DEPENDIENTES.** Incorrecto (ignora errores) y toca el IVA
que la gestoría reconcilia; la restricción "rectificativa = espejo exacto, no recalcular" (Puri) es
la regla protegida sobre la que se apoya.

**Dependientes.** Gestoría (IVA de abonos); regla "espejo exacto" de Puri ([facturas.js:126-128](../../routes/facturas.js#L126-L128)); rectificativas ya emitidas.

**Tratamiento acordado.** **Corregir en modernización**: transacción + captura de error de línea +
no marcar `rectificada` si falla el espejo. **No retroactivo.** Precaución: mantener intacta la regla
de espejo exacto sin recálculo.

**Decisión de negocio pendiente (SIMULADA, no ratificada).** Ante fallo al rectificar, ¿rechazar todo o
grabar y avisar? (hoy graba incompleto en silencio). **Responsable:** Julián + Puri.

> **Acta 2026-07-07, D-13 (Julián / Puri) — [SIMULADA — ratificar]:** ante fallo al grabar una
> rectificativa, **rechazar toda la operación** y avisar; nunca grabar un abono a medias en silencio ni marcar
> la original como `rectificada` si falla el espejo ([facturas.js:141-160](../../routes/facturas.js#L141-L160)).
> Mantener intacta la regla protegida **"rectificativa = espejo exacto sin recalcular"** (Puri). Propuesta
> recogida en reunión pero **pendiente de ratificación escrita**; no cierra la decisión.

---

## A-05 — Vencimiento por defecto duplicado: `config.VENCIMIENTO_DIAS` vs. literal `30` en la remesa

**Descripción.** El "vencimiento por defecto cuando el cliente no tiene forma de pago" se lee de
`config.VENCIMIENTO_DIAS` en el alta manual pero está **escrito a mano como `30`** en la remesa (que
ni siquiera importa `config`); hoy coinciden (ambos 30), pero cambiar el parámetro afectaría solo a
la mitad del sistema.

**Evidencia.**
- **CÓDIGO:** [routes/facturas.js:68-69](../../routes/facturas.js#L68-L69) (`config.VENCIMIENTO_DIAS`) vs. [scripts/remesa_mensual.js:60](../../scripts/remesa_mensual.js#L60) (`co.dias_pago || 30`); la remesa no hace `require('../config')` ([remesa_mensual.js:9-12](../../scripts/remesa_mensual.js#L9-L12)). Constante en [config.js:39-40](../../config.js#L39-L40).
- **DATOS:** clientes con `dias_pago = NULL` (1, 2, 4, 6) que caerían al defecto; con valor explícito (3, 5 = 60 días) no divergen ([db.js:96-101](../../db.js#L96-L101)).

**Clasificación final: ACCIDENTAL** (duplicidad latente). No hay señal de que se **quisiera** duplicar
el número; es un atajo del becario. Hoy no diverge.

**Sub-anomalía A-05b (BUG A SECAS):** con `co.dias_pago || 30`, un cliente con `dias_pago = 0` (pago
al contado) obtendría 30 días porque `0 || 30 === 30`. No hay cliente así en datos ([db.js:96-101](../../db.js#L96-L101)).

**Dependientes.** Nadie identificado hoy (30=30). Si se toca `config`, divergirían las cuotas de
remesa de clientes sin `dias_pago`.

**Tratamiento acordado.** **Documentar sin especificar** la duplicidad; **corregir en modernización**
haciendo que la remesa lea `config.VENCIMIENTO_DIAS`. Retroactividad no aplica (no cambia importes ya
emitidos, solo fechas de vencimiento futuras). Para A-05b, decidir semántica de `0`.

**Decisión de negocio pendiente (SIMULADA, no ratificada).** (a) Si se cambia el plazo por defecto, ¿debe
afectar también a la remesa? (b) ¿Existe algún cliente de "pago al contado" (`dias_pago = 0`)?
**Responsable:** Marga (operativa de clientes) / Paco.

> **Acta 2026-07-07, D-05 (Marga / Paco) — [SIMULADA — ratificar]:** (i) **no existe** hoy cliente de pago
> al contado (`dias_pago = 0`) — a confirmar con arqueología de datos; (ii) si en el futuro lo hubiera, "0
> días" debe significar **contado**, no caer a 30 (`co.dias_pago || 30`, [remesa_mensual.js:60](../../scripts/remesa_mensual.js#L60),
> es el bug A-05b: `0 || 30 === 30`); (iii) si se cambia `config.VENCIMIENTO_DIAS`, **debe afectar también a
> la remesa** (hoy usa el literal `30`), unificando la lectura de `config`. Propuesta recogida en reunión
> pero **pendiente de ratificación escrita**; no cierra la decisión.

---

## A-06 — Total del informe de IVA sumado sin la regla de redondeo "sagrada"

**Descripción.** El total general del informe de IVA se acumula en coma flotante en la plantilla EJS
**sin** `redondear2` en cada suma —justo lo contrario de la regla blindada de las facturas— y solo se
redondea al formatear; hoy da el mismo número, pero podría desviarse un céntimo en un borde de coma
flotante, el tipo exacto de descuadre que en 2019 hizo devolver el trimestre.

**Evidencia.**
- **CÓDIGO:** acumulador JS sin redondeo en [views/informe_iva.ejs:5](../../views/informe_iva.ejs#L5), sobre `SUM()` de SQL ([routes/informes.js:23-25](../../routes/informes.js#L23-L25)); frente a la regla canónica de re-redondeo por suma en [services/calculo.js:81-86](../../services/calculo.js#L81-L86).
- **NEGOCIO (doc):** el aviso "NO CAMBIAR LA FORMA DE REDONDEAR… Puri devolvió todo el trimestre" ([calculo.js:3-7](../../services/calculo.js#L3-L7)) define la regla que el informe **no** respeta.
- **DATOS:** para el 1T 2026 ambos métodos dan `530,00 €` idéntico ([contradiccion-04 §3](./contradiccion-04-totalizacion-y-redondeo.md)); **no diverge con los datos actuales**.

**Clasificación final: ACCIDENTAL.** Convención distinta introducida "a lo rápido" en la vista, sin
intención de romper la regla; latente (máx. 1 céntimo, borde de coma flotante).

**Dependientes.** Gestoría, que revisa el total del informe a mano antes del modelo 303
([views/informe_iva.ejs:16](../../views/informe_iva.ejs#L16)) y cuadraría un céntimo sin acta.

**Tratamiento acordado.** **Documentar sin especificar**; en modernización, someter el total del
informe a la **misma** aritmética de redondeo que las facturas. Sin retroactividad (recalcular un
informe da el mismo número hoy).

**Decisión de negocio pendiente (SIMULADA, no ratificada).** ¿Debe el total del informe seguir exactamente
la aritmética de redondeo de las facturas que la gestoría reconcilia? **Responsable:** Puri (gestoría).

> **Acta 2026-07-07, D-07 (Puri) — [SIMULADA — ratificar]:** el total del informe de IVA **debe seguir
> exactamente la misma aritmética de redondeo línea a línea** que las facturas ([calculo.js:81-86](../../services/calculo.js#L81-L86)),
> no el acumulado en coma flotante de la vista ([informe_iva.ejs:5](../../views/informe_iva.ejs#L5)). Alinear
> en modernización; hoy no diverge (mismo número). Propuesta recogida en reunión pero **pendiente de
> ratificación escrita**; no cierra la decisión.

---

## A-07 — Alta de factura sin validar cantidades ni precios (`parseFloat` sin comprobar `NaN`)

**Descripción.** El alta convierte cantidad y precio con `parseFloat` sin verificar `NaN`; una fila
con cantidad/precio no numérico propaga `NaN` a `calcularLinea` y puede grabar una factura con
importe basura que descuadra totales e informes.

**Evidencia.**
- **CÓDIGO:** [routes/facturas.js:59-62](../../routes/facturas.js#L59-L62) (`parseFloat` sin validar), que llega a [services/calculo.js:27](../../services/calculo.js#L27).
- **DATOS:** no hay factura con `NaN` en los datos actuales.

**Clasificación final: BUG A SECAS.** Incorrecto y sin dependientes identificados; latente porque
quien teclea (Marga) mete números válidos.

**Dependientes.** Nadie identificado.

**Tratamiento acordado.** **Corregir en modernización** validando entrada antes de calcular. No
retroactivo (validación de entrada futura).

**Decisión de negocio pendiente.** Ninguna de negocio. **Responsable:** Julián. **Acta 2026-07-07, D-19:**
confirmada como corrección técnica (validar `NaN` en cantidad/precio antes de calcular,
[facturas.js:59-62](../../routes/facturas.js#L59-L62)); solo exige constancia escrita del cambio de
comportamiento ante error.

---

## A-08 — Normalización de importes con coma decimal repetida ×3 y frágil ante el punto de miles

**Descripción.** La conversión "texto español → número" (`parseFloat(('' + x).replace(',', '.'))`)
está copiada idéntica en tres rutas; `replace` solo sustituye la primera coma, así que un importe con
separador de miles español (`1.234,56`) se interpreta como `1,234 €` en las tres por igual.

**Evidencia.**
- **CÓDIGO:** [routes/facturas.js:59-60](../../routes/facturas.js#L59-L60), [routes/contratos.js:19](../../routes/contratos.js#L19), [routes/articulos.js:19](../../routes/articulos.js#L19). No existe `util.parseImporte`.
- **DATOS:** los importes reales rara vez superan 1.000 € por línea y se teclean sin punto de miles, por eso no ha mordido (ver [contradiccion-06 A.4](./contradiccion-06-normalizacion-numerica-y-iva-defecto.md)).

**Clasificación final: BUG A SECAS** (con duplicidad asociada). El agujero del punto de miles es
incorrecto; sin dependientes (no se usa ese formato). La triple copia es duplicidad a documentar.

**Dependientes.** Nadie identificado.

**Tratamiento acordado.** **Corregir en modernización** extrayendo una única `util.parseImporte`
robusta. No retroactivo.

**Decisión de negocio pendiente (SIMULADA, no ratificada).** ¿Se teclean alguna vez importes con separador
de miles (`1.234,56`)? **Responsable:** Marga.

> **Acta 2026-07-07, D-06 (Marga) — [SIMULADA — ratificar]:** **no** se teclean importes con separador de
> miles (`1.234,56`); las líneas rara vez superan 1.000 €. El agujero (`replace(',', '.')` solo sustituye la
> primera coma, ×3 rutas) es **latente**; corregir en modernización extrayendo un único `util.parseImporte`
> robusto. Propuesta recogida en reunión pero **pendiente de ratificación escrita**; no cierra la decisión.

---

## A-09 — IVA por defecto duplicado: `config.IVA_DEFECTO` vs. literal `21` (y `DEFAULT 21` en el esquema)

**Descripción.** El IVA por defecto se lee de `config.IVA_DEFECTO` al alta de artículo, pero está
fijado como literal `21` al alta de contrato y como `DEFAULT 21` en la tabla; cambiar el parámetro
afectaría solo a los artículos.

**Evidencia.**
- **CÓDIGO:** [routes/articulos.js:16](../../routes/articulos.js#L16) (config) vs. [routes/contratos.js:20](../../routes/contratos.js#L20) (`|| 21`) y [db.js:46](../../db.js#L46) (`DEFAULT 21`). Constante en [config.js:24-25](../../config.js#L24-L25).
- **DATOS:** quien da de alta un contrato siempre indica el IVA, así que el defecto casi nunca entra.

**Clasificación final: ACCIDENTAL** (duplicidad latente). Sin señal de duplicación querida; hoy no
diverge (21=21).

**Dependientes.** Nadie identificado hoy.

**Tratamiento acordado.** **Documentar sin especificar**; en modernización unificar en
`config.IVA_DEFECTO`. No retroactivo.

**Decisión de negocio pendiente (SIMULADA, no ratificada).** Si se cambia el IVA por defecto de la casa,
¿debe afectar también a los contratos? **Responsable:** Paco / gestoría.

> **Acta 2026-07-07, D-08 (Paco / gestoría) — [SIMULADA — ratificar]:** si se cambia el IVA por defecto de la
> casa, **debe afectar también a los contratos**; unificar en `config.IVA_DEFECTO` (hoy literal `21` en
> [contratos.js:20](../../routes/contratos.js#L20) y `DEFAULT 21` en [db.js:46](../../db.js#L46)). Propuesta
> recogida en reunión pero **pendiente de ratificación escrita**; no cierra la decisión.

---

## A-10 — `sumarDias` con posible desfase de un día por cambio de hora (UTC vs. local)

**Descripción.** El cálculo de vencimiento suma milisegundos sobre `Date` parseando `YYYY-MM-DD` como
UTC y leyendo la fecha en local; un cambio de horario dentro del intervalo puede correr la fecha de
vencimiento un día. Afecta a los vencimientos de todas las facturas.

**Evidencia.**
- **CÓDIGO:** [lib/util.js:20-26](../../lib/util.js#L20-L26) (`getTime() + dias*86400000`, reformateo local).
- **NEGOCIO (doc):** "en marzo de 2019 el vencimiento… salió un día menos… creo que fue por el cambio de hora, no he conseguido reproducirlo" ([util.js:17-19](../../lib/util.js#L17-L19)). Testimonio que lo marca como **fallo sospechado, no reproducido**.
- **DATOS:** los vencimientos reales grabados coinciden con el cálculo esperado ([db.js:139, 145](../../db.js#L139-L145)); no reproducido.

**Clasificación final: BUG A SECAS** (no reproducido). Incorrecto en potencia, sin dependiente
identificado que exija el desfase; la fecha impresa afectada sería un caso puntual.

**Dependientes.** Nadie identificado (ninguna factura concreta señalada).

**Tratamiento acordado.** **Corregir en modernización** con manejo de fechas robusto (sin
milisegundos/zona). No retroactivo. Precaución: verificar que ninguna factura histórica dependa del
desfase antes de tocar.

**Decisión de negocio pendiente (SIMULADA, no ratificada).** ¿Se ha vuelto a detectar algún vencimiento
descuadrado? ¿Hay factura concreta para reproducir? **Responsable:** Marga (quien vería la queja de cobro).

> **Acta 2026-07-07, D-09 (Marga) — [SIMULADA — ratificar]:** **no** se ha vuelto a detectar ningún
> vencimiento descuadrado desde 2019; **no hay factura concreta** para reproducir. Corregir el manejo de
> fechas ([util.js:20-26](../../lib/util.js#L20-L26)) por higiene, sin urgencia. Propuesta recogida en
> reunión pero **pendiente de ratificación escrita**; no cierra la decisión.

---

## A-11 — Fin de trimestre del informe fijado a `-31`, tapado por comparación textual de SQLite

**Descripción.** El informe de IVA construye el fin de trimestre como `AAAA-MM-31` siempre, incluso
para meses sin día 31 (`2026-06-31`, `2026-09-31`); hoy captura todo el mes solo porque SQLite
compara fechas como texto y `'…-31'` ordena tras `'…-30'`.

**Evidencia.**
- **CÓDIGO:** [routes/informes.js:17-19](../../routes/informes.js#L17-L19) (`hasta = anyo+'-MM-31'`), filtro textual [informes.js:23-25](../../routes/informes.js#L23-L25).
- **DATOS:** funciona para 1T–4T de 2026 por la propiedad textual (ver [contradiccion-05 §3.1](./contradiccion-05-formato-y-rangos-de-fecha.md)).

**Clasificación final: BUG A SECAS** (latente, tapado por el motor). Incorrecto conceptualmente pero
sin efecto hoy; se rompería si se migrara a `DATE` real / MySQL (volcado de migración existe pero sin
uso).

**Dependientes.** Nadie identificado; el resultado del informe es correcto hoy.

**Tratamiento acordado.** **Corregir en modernización** usando el último día real del mes; imperativo
**antes** de cualquier migración a un motor con tipo fecha estricto. No retroactivo.

**Decisión de negocio pendiente (SIMULADA, no ratificada).** ¿Se da por bueno el `-31` o el rango debe usar
el último día real del mes? **Responsable:** Puri (define el trimestre del modelo 303).

> **Acta 2026-07-07, D-10 (Puri) — [SIMULADA — ratificar]:** el rango del trimestre debe usar el **último día
> real del mes**, no `AAAA-MM-31` ([informes.js:17-19](../../routes/informes.js#L17-L19)). Imperativo **antes**
> de cualquier migración a un motor con tipo fecha estricto (hoy lo tapa la comparación textual de SQLite).
> Propuesta recogida en reunión pero **pendiente de ratificación escrita**; no cierra la decisión.

---

## A-12 — Validación de NIF/CIF solo por longitud (9 caracteres)

**Descripción.** Un NIF/CIF se acepta si tiene 9 caracteres tras quitar espacios/guiones; no se
comprueba letra de control ni formato, y se aceptan letras en minúscula y cadenas sin sentido.

**Evidencia.**
- **CÓDIGO:** [lib/util.js:44-48](../../lib/util.js#L44-L48) (`return nif.length === 9`).
- **NEGOCIO (doc):** decisión reconocida y justificada — "TODO Julian 11/2017: falta comprobar la letra, de momento con la longitud vale porque los da de alta Marga y los mira ella" ([util.js:42-43](../../lib/util.js#L42-L43)). Es un **control humano deliberado** (Marga revisa), aunque marcado como TODO.
- **DATOS:** NIF reales con letra en minúscula que pasan: `70355910k` ([db.js:101](../../db.js#L101)), `03488812K` ([db.js:97](../../db.js#L97)).

**Clasificación final: ACCIDENTAL con control compensatorio.** La laxitud es un efecto de la
implementación mínima; el testimonio-doc justifica **por qué se dejó** (revisión manual de Marga),
lo que la hace tolerada, no querida como regla. No llega a INTENCIONAL porque el propio comentario la
marca como pendiente ("falta comprobar la letra").

**Dependientes.** Control manual de Marga; NIF ya grabados en minúscula/laxos.

**Tratamiento acordado.** **Corregir en modernización** (validar letra de control) **solo si el
negocio lo pide**; de lo contrario, documentar el control humano como el mecanismo vigente. No
retroactivo sobre NIF ya grabados sin re-verificación manual.

**Decisión de negocio pendiente (SIMULADA, no ratificada).** ¿Se quiere validación real de NIF/CIF o el
control de Marga sigue bastando? **Responsable:** Marga / Paco.

> **Acta 2026-07-07, D-11 (Marga / Paco) — [SIMULADA — ratificar]:** de momento **basta el control manual de
> Marga** (revisa las altas). Validar la letra de control es deseable pero no urgente; documentar el control
> humano como mecanismo vigente ([util.js:44-48](../../lib/util.js#L44-L48)). Propuesta recogida en reunión
> pero **pendiente de ratificación escrita**; no cierra la decisión.

---

## A-13 — Grabado de factura escrito tres veces con criterios de orden e integridad distintos

**Descripción.** "Grabar cabecera + líneas" existe en tres bloques que no comparten código: alta web
(paralelo, captura error → HTTP 500), rectificativa (paralelo, **ignora** error), remesa (secuencial,
`process.exit(1)` aborta el lote). Además, el orden de líneas en pantalla no está garantizado en los
caminos en paralelo.

**Evidencia.**
- **CÓDIGO:** A [routes/facturas.js:74-99](../../routes/facturas.js#L74-L99), B [facturas.js:141-159](../../routes/facturas.js#L141-L159), C [scripts/remesa_mensual.js:61-73](../../scripts/remesa_mensual.js#L61-L73). Detalle en [contradiccion-03](./contradiccion-03-grabado-factura-y-lineas.md). El detalle imprimible relee con `ORDER BY id` ([facturas.js:109](../../routes/facturas.js#L109)), luego el orden depende de qué `INSERT` termina antes.
- **DATOS:** el orden histórico "sale bien" porque los datos se cargaron con `db.prepare` secuencial en `cargarDatosIniciales`, **no** por el camino de producción.

**Clasificación final: ACCIDENTAL** (duplicidad + orden no determinista). Consecuencia de que cada
camino nació en un momento distinto sin unificar; la política de integridad inconsistente no es
querida. Solapa con A-03 (integridad del alta) y A-04 (rectificativa); aquí se registra la
**duplicidad estructural** y el **orden de líneas**.

**Dependientes.** Factura impresa (orden de líneas visible); nadie ha reclamado por el orden.

**Tratamiento acordado.** **Documentar sin especificar** la triple implementación; en modernización,
extraer una única `grabarFactura(cabecera, líneas, cb)` transaccional que **preserve el orden de
líneas**. No retroactivo.

**Decisión de negocio pendiente (SIMULADA, no ratificada).** ¿Importa el orden de líneas en la factura
impresa? **Responsable:** Marga / Puri (quien mira la factura).

> **Acta 2026-07-07, D-12 (Marga / Puri) — [SIMULADA — ratificar]:** el **orden de líneas sí importa**: debe
> respetar el orden de captura. Nadie ha reclamado, pero al unificar el grabado (hoy triple e inconsistente)
> hay que **preservar el orden**. Propuesta recogida en reunión pero **pendiente de ratificación escrita**;
> no cierra la decisión.

---

## A-14 — Numeración toma el año de la fecha del sistema, no de `factura.fecha`

**Descripción.** El año del contador se toma de `new Date().getFullYear()` (fecha de ejecución), no
de la fecha de la factura; una remesa de diciembre lanzada en enero tomaría el contador del año nuevo.

**Evidencia.**
- **CÓDIGO:** [lib/numeracion.js:15](../../lib/numeracion.js#L15). La remesa factura "el mes que acaba de terminar" ([remesa_mensual.js:5](../../scripts/remesa_mensual.js#L5)).
- **DATOS:** no evidenciado que haya ocurrido (contadores coherentes, [db.js:176-177](../../db.js#L176-L177)).
- **NEGOCIO (vivo):** [acta de entrevista 2026-07-07, D-02](./entrevista-negocio.md) — Puri (gestoría) con visto bueno de asesoría fiscal. Pregunta 2 respondida **en reunión** (testimonio firme, no simulado): el número **debe ir por el año de la fecha de la factura** (dic-2026 → `FA-2026-...`), no por el año de grabación.

**Clasificación final (revisada 2026-07-07): CERRADA — la numeración debe ir por el año de `factura.fecha`, no por el año del sistema.**
El testigo que faltaba (NEGOCIO vivo) ya se produjo. El comportamiento actual (`new Date().getFullYear()`,
[numeracion.js:15](../../lib/numeracion.js#L15)) es **incorrecto** frente a la decisión de negocio → deja de
ser comportamiento a especificar tal cual y pasa a corrección en modernización con decisión escrita.

> **Registro del cambio de clasificación (no sobrescrito):** hasta 2026-07-07 esta anomalía estuvo
> **PENDIENTE** con solo CÓDIGO a favor (sin comentario ni dato que dijera qué año manda). El acta de
> 2026-07-07 (D-02, Puri + asesoría fiscal) la desbloquea: manda el año de `factura.fecha`.

**Dependientes.** Correlatividad legal por año; ninguna factura concreta identificada.

**Tratamiento acordado.** **Corregir en modernización**: tomar el año del contador de `factura.fecha` en
vez de `new Date().getFullYear()` ([numeracion.js:15](../../lib/numeracion.js#L15)). **No retroactivo.**
**Tensión a vigilar (anotada en el acta):** al facturar dic-2026 en enero, el contador de `('FA', 2026)`
debe seguir vivo para cerrar diciembre aunque ya exista el de 2027 → convivencia de dos contadores de año
en la misma sesión de trabajo (ver riesgo nuevo en `registro-riesgos.md`).

**Decisión de negocio: RESUELTA (acta 2026-07-07, D-02).** Manda el año de la fecha de la factura.
**Responsable que la dio:** Puri (gestoría) con visto bueno de asesoría fiscal. **Dato de arqueología
pendiente:** verificar que ninguna factura histórica quedara "cruzada" (fecha de un año, número de otro);
si la hubiera, es hecho consumado a documentar, no a reescribir (correlatividad sin huecos, RN-14 / A-02).

---

## A-15 — Prorrateo negativo se corta a 0 € en silencio; `calcularProrrateo` asume mismo mes

**Descripción.** Si en el prorrateo comercial "hasta" es anterior a "desde", los días salen negativos
y se fuerzan a 0 → importe 0,00 € sin aviso; además la función solo mira el **día** (`split('-')[2]`),
así que asume desde/hasta en el **mismo mes** y un periodo a caballo entre meses daría un cálculo sin
sentido.

**Evidencia.**
- **CÓDIGO:** `if (dias < 0) dias = 0;` [services/calculo.js:100](../../services/calculo.js#L100); solo usa el día en [calculo.js:96-97](../../services/calculo.js#L96-L97).
- **DATOS:** no evidenciado un caso que lo dispare.

**Clasificación final: PENDIENTE (con respuesta SIMULADA, no ratificada).** Sin comentario: la guarda a 0
podría ser defensiva deliberada o un parche. Solo CÓDIGO a favor; el "cobrar 0 en silencio vs. avisar" es
decisión de negocio. **Sigue PENDIENTE:** en la reunión de 2026-07-07 el consultor respondió *en nombre
del negocio* (D-03) pero **no es testimonio de negocio vivo válido** hasta ratificación escrita de Marga/Paco.

> **Propuesta SIMULADA a ratificar (acta 2026-07-07, D-03 — NO cierra la anomalía):** cuando "desde" es
> posterior a "hasta" (error de tecleo), el sistema debería **avisar y no permitir grabar**, en vez de
> facturar 0,00 € en silencio ([calculo.js:100](../../services/calculo.js#L100)); y un periodo de prorrateo
> **no debería cruzar dos meses** (la función solo mira el día, [calculo.js:96-97](../../services/calculo.js#L96-L97)):
> si hiciera falta cubrir dos meses, se emitirían dos líneas. **[SIMULADA — ratificar por Marga/Paco]**.

**Dependientes.** Nadie identificado.

**Tratamiento acordado.** **Documentar sin especificar** hasta ratificación; en modernización, decidir si
se avisa y si se soporta rango intermensual. No retroactivo.

**Decisión de negocio pendiente (SIGUE ABIERTA).** Cuando "desde" es posterior a "hasta" (¿error de
captura?), ¿cobrar 0 € en silencio o avisar? ¿Puede un periodo cruzar dos meses? **Responsable:** Marga /
Paco. **Estado:** respuesta simulada por el consultor (D-03), **pendiente de ratificación**; permanece en
la agenda de la próxima ronda.

---

## A-16 — Tipo de IVA desconocido → recargo 0 en silencio; comparación estricta rechaza `'21'`

**Descripción.** Si una línea llega con un tipo de IVA fuera de la tabla, el recargo de equivalencia
es 0 sin error ni aviso; además, la comparación es estricta (`===`), de modo que un tipo pasado como
cadena (`'21'`) también obtendría recargo 0 aunque sea el 21.

**Evidencia.**
- **CÓDIGO:** `return 0` final de `recargoPara` ([services/calculo.js:22](../../services/calculo.js#L22)); comparaciones `=== 21`… ([calculo.js:13-21](../../services/calculo.js#L13-L21)).
- **DATOS:** todos los artículos usan 21/10/4 ([db.js:105-112](../../db.js#L105-L112)); no hay tipo fuera de tabla en datos reales.

**Clasificación final: PENDIENTE (con respuesta SIMULADA, no ratificada).** No hay señal de si el 0 es
decisión (tratar lo desconocido como sin recargo) o fallback. Solo CÓDIGO a favor. **Sigue PENDIENTE:** en
la reunión de 2026-07-07 el consultor respondió *en nombre del negocio* (D-04) pero **no es testimonio de
negocio vivo válido** hasta ratificación escrita de Puri/Paco.

> **Propuesta SIMULADA a ratificar (acta 2026-07-07, D-04 — NO cierra la anomalía):** un tipo de IVA fuera
> de la tabla (vigentes 21/10/4; antiguos conservados 18/16/8/7) debería **rechazarse**, no calcular recargo
> 0 en silencio ([calculo.js:22](../../services/calculo.js#L22)); y corregir la comparación estricta que
> rechaza `'21'` como cadena ([calculo.js:13-21](../../services/calculo.js#L13-L21)). **[SIMULADA — ratificar
> por Puri/Paco]**.

**Dependientes.** Nadie identificado.

**Tratamiento acordado.** **Documentar sin especificar** hasta ratificación; en modernización, decidir si un
IVA no reconocido se rechaza en vez de calcular recargo 0. No retroactivo.

**Decisión de negocio pendiente (SIGUE ABIERTA).** ¿Un tipo de IVA no reconocido debe rechazarse o calcular
recargo 0? **Responsable:** Puri / Paco. **Estado:** respuesta simulada por el consultor (D-04), **pendiente
de ratificación**; permanece en la agenda de la próxima ronda.

---

## A-17 — `email.enviarFactura` no envía nada pero el flujo actúa como si enviara

**Descripción.** El envío de facturas por correo está fuera de servicio desde 2022; `enviarFactura`
solo hace `console.log`, pero el alta lo invoca como si enviara y luego redirige, dando falsa
sensación de envío. Las facturas se mandan a mano desde el Outlook de Marga.

**Evidencia.**
- **CÓDIGO:** [services/email.js:11-29](../../services/email.js#L11-L29) (solo `console.log`); invocación en [routes/facturas.js:93](../../routes/facturas.js#L93).
- **NEGOCIO (doc):** "FUERA DE SERVICIO desde 2022: Arsys cambió el servidor… se están enviando A MANO desde el Outlook de Marga… Hablar con Manoli" ([email.js:3-6](../../services/email.js#L3-L6)).

**Clasificación final: BUG HISTÓRICO CON DEPENDIENTES** (proceso externo). No es querido, pero la
operativa actual **depende** del envío manual de Marga; "arreglarlo" reactivando el correo cambia un
proceso humano en marcha.

**Dependientes.** Marga (envío manual), Manoli (contacto para reactivar). Proceso de entrega al
cliente.

**Tratamiento acordado.** **Documentar sin especificar**; reactivación **solo** por decisión de
negocio, hablando antes con Manoli y con proveedor/credenciales actuales. No retroactivo.

**Decisión de negocio pendiente (SIMULADA, no ratificada).** ¿Se desea reactivar el envío automático y con
qué proveedor? **Responsable:** Marga / Manoli.

> **Acta 2026-07-07, D-15 (Marga / Manoli) — [SIMULADA — ratificar]:** **no reactivar** el envío automático
> por ahora; el envío manual desde el Outlook de Marga funciona. Documentar el envío manual como proceso
> vigente; reactivar solo por decisión posterior hablando antes con Manoli. Propuesta recogida en reunión pero
> **pendiente de ratificación escrita**; no cierra la decisión.

---

## A-18 — Credenciales y secretos en claro en `config.js` versionado

**Descripción.** El fichero versionado `config.js` contiene contraseña SMTP, clave de exportación de
la gestoría y datos fiscales en texto plano; cualquiera con acceso al repo los obtiene.

**Evidencia.**
- **CÓDIGO/repo:** [config.js:33](../../config.js#L33) (`clave: 'Hidalgo2019!'`), [config.js:37](../../config.js#L37) (`CLAVE_EXPORT_GESTORIA: 'SH-CONTA-7731'`); `config.js` en `git ls-files`.
- **NEGOCIO (doc):** la clave SMTP está obsoleta (correo roto desde 2022, [config.js:27-28](../../config.js#L27-L28)); la clave de exportación **sí está viva** (formato acordado con Puri, [config.js:36-37](../../config.js#L36-L37), "no cambiar").

**Clasificación final: BUG HISTÓRICO CON DEPENDIENTES.** Riesgo de seguridad real; pero `config.js`
**no se puede renombrar/mover** porque se copia a mano al servidor `\\SERVIDOR\gesfact`
([config.js:2-3](../../config.js#L2-L3)) y la clave de gestoría está en uso.

**Dependientes.** Despliegue manual a `\\SERVIDOR\gesfact`; gestoría (clave de exportación viva).

**Tratamiento acordado.** **Corregir en modernización** sacando secretos a variables de entorno /
fichero fuera de control de versiones, **sin** renombrar `config.js` mientras el despliegue manual lo
exija. Rotar la clave SMTP obsoleta; coordinar la clave de gestoría con Puri antes de tocarla. No
retroactivo (rotación es acción operativa).

**Decisión de negocio pendiente (SIMULADA, no ratificada).** ¿Se puede rotar la clave SMTP? ¿Sigue
`SH-CONTA-7731` siendo la que espera la gestoría? **Responsable:** Julián (despliegue) + Puri (clave export).

> **Acta 2026-07-07, D-16 (Julián / Puri) — [SIMULADA — ratificar]:** la clave SMTP obsoleta **se puede
> rotar**. La clave de exportación de gestoría **`SH-CONTA-7731` sigue viva y no se toca** sin avisar a Puri.
> Sacar secretos a variables de entorno / fichero fuera de control de versiones **sin renombrar** `config.js`
> (se copia a mano a `\\SERVIDOR\gesfact`). Propuesta recogida en reunión pero **pendiente de ratificación
> escrita**; no cierra la decisión.

---

## A-19 — Base de datos de producción con datos personales versionada en Git, sin `.gitignore`

**Descripción.** `datos/gesfact.db` (con NIF, direcciones y emails de clientes reales) está en el
repositorio; no existe `.gitignore`, así que cada clon lleva una copia de datos personales (riesgo
RGPD).

**Evidencia.**
- **repo:** `datos/gesfact.db` en `git ls-files`; datos reales en [db.js:96-101](../../db.js#L96-L101); no hay `.gitignore`.

**Clasificación final: BUG HISTÓRICO CON DEPENDIENTES.** Riesgo RGPD real; pero la BD versionada es
hoy el mecanismo de datos de ejemplo/arranque, y hay advertencia de "no tocar datos iniciales"
([db.js:91-92](../../db.js#L91-L92)).

**Dependientes.** Datos iniciales usados como referencia por administración; autopoblado de arranque.

**Tratamiento acordado.** **Corregir en modernización**: separar datos reales del repo, añadir
`.gitignore`, sustituir por datos de ejemplo anonimizados. Precaución RGPD: purgar histórico si se
decide. No retroactivo sin decisión sobre el histórico de Git.

**Decisión de negocio pendiente (SIMULADA, no ratificada).** ¿Autorización para sacar la BD real del repo y
anonimizar los datos de ejemplo? **Responsable:** Paco (responsable de datos) / asesoría RGPD.

> **Acta 2026-07-07, D-17 (Paco / asesoría RGPD) — [SIMULADA — ratificar]:** **autorizado** sacar
> `datos/gesfact.db` del repo, añadir `.gitignore` y sustituir por datos de ejemplo anonimizados. La purga del
> histórico de Git se decide con la asesoría RGPD. Propuesta recogida en reunión pero **pendiente de
> ratificación escrita** (y de la consulta a la asesoría RGPD); no cierra la decisión.

---

## A-20 — Deuda de infraestructura: `node_modules` versionado, Node 8 fijado, migración MySQL fantasma

**Descripción.** Conjunto de deuda de infraestructura sin impacto en importes: `node_modules/` completo
(incluido binario nativo) versionado; instrucción de instalar Node 8 (fin de vida) sin `engines`; y
referencias a una migración a MySQL que nunca se ejecutó (volcado desfasado conservado "por si acaso").

**Evidencia.**
- **repo/CÓDIGO:** `node_modules/…/node_sqlite3.node` en `git ls-files` (R11); [LEEME.txt](../../LEEME.txt) paso 1 "Node 8" sin `engines` en `package.json` (R12); [config.js:19](../../config.js#L19) + `datos/migracion_mysql_2018.sql` sin uso (R13).
- **NEGOCIO (doc):** el volcado MySQL es "de PRUEBA… NUNCA SE LLEGÓ A EJECUTAR… esquema desfasado" ([migracion_mysql_2018.sql:1-3](../../datos/migracion_mysql_2018.sql#L1-L3)).

**Clasificación final: ACCIDENTAL** (deuda técnica acumulada). Ninguna decisión deliberada de negocio;
sin efecto en importes.

**Dependientes.** Nadie identificado; el volcado MySQL puede confundir a un mantenedor haciéndole creer
que hay migración viva.

**Tratamiento acordado.** **Corregir/limpiar en modernización**: sacar `node_modules` del control de
versiones, declarar `engines`, archivar el volcado MySQL. No retroactivo.

**Decisión de negocio pendiente (SIMULADA, no ratificada).** ¿Se puede archivar/eliminar
`migracion_mysql_2018.sql`? **Responsable:** Julián.

> **Acta 2026-07-07, D-18 (Julián) — [SIMULADA — ratificar]:** **autorizado** archivar
> `migracion_mysql_2018.sql` (migración fantasma nunca ejecutada), sacar `node_modules/` del control de
> versiones y declarar `engines` en `package.json`. Propuesta recogida en reunión pero **pendiente de
> ratificación escrita**; no cierra la decisión.

---

# Tabla resumen

| ID | Anomalía (breve) | Clasificación | Tratamiento | Decisión pendiente |
|----|------------------|---------------|-------------|--------------------|
| A-01 | Doble prorrateo divergente (30 fijo vs. días reales) | **CERRADA** (días reales; día 31 se cobra) | Unificar en modernización (no retro) | **Resuelta** — acta D-01 (Paco/Puri) |
| A-02 | Reserva de número no atómica | BUG HISTÓRICO C/DEP. | Corregir (no retro) | Sí — Julián/fiscal |
| A-03 | Alta de factura sin transacción | BUG HISTÓRICO C/DEP. | Corregir (no retro) | Escrita (técnica) |
| A-04 | Rectificativa sin transacción, error silenciado | BUG HISTÓRICO C/DEP. | Corregir (no retro) | Sí — Julián/Puri |
| A-05 | Vencimiento defecto duplicado (`config` vs. `30`) | ACCIDENTAL (+A-05b BUG) | Documentar; corregir | Sí — Marga/Paco |
| A-06 | Total informe IVA sin redondeo sagrado | ACCIDENTAL | Documentar; alinear | Sí — Puri |
| A-07 | Alta sin validar `NaN` en cantidad/precio | BUG A SECAS | Corregir | No (técnica) |
| A-08 | Normalización coma decimal ×3, punto de miles | BUG A SECAS | Corregir (extraer util) | Sí — Marga |
| A-09 | IVA defecto duplicado (`config` vs. `21`/schema) | ACCIDENTAL | Documentar; unificar | Sí — Paco/gestoría |
| A-10 | `sumarDias` desfase por cambio de hora | BUG A SECAS (no repro) | Corregir | Sí — Marga |
| A-11 | Fin de trimestre `-31` tapado por SQLite textual | BUG A SECAS (latente) | Corregir antes de migrar | Sí — Puri |
| A-12 | Validación NIF solo por longitud | ACCIDENTAL c/control manual | Corregir si se pide | Sí — Marga/Paco |
| A-13 | Grabado de factura ×3, orden no determinista | ACCIDENTAL | Documentar; unificar | Sí — Marga/Puri |
| A-14 | Numeración por año del sistema, no de la factura | **CERRADA** (año de `factura.fecha`) | Corregir en modernización (no retro) | **Resuelta** — acta D-02 (Puri/fiscal) |
| A-15 | Prorrateo negativo → 0 € en silencio; asume mismo mes | **PENDIENTE** (respuesta SIMULADA) | Documentar sin especificar | **Sigue abierta** — D-03 sin ratificar (Marga/Paco) |
| A-16 | IVA desconocido → recargo 0 silencioso; `===` | **PENDIENTE** (respuesta SIMULADA) | Documentar sin especificar | **Sigue abierta** — D-04 sin ratificar (Puri/Paco) |
| A-17 | `enviarFactura` no envía; envío manual real | BUG HISTÓRICO C/DEP. | Documentar; reactivar si se pide | Sí — Marga/Manoli |
| A-18 | Secretos en claro en `config.js` versionado | BUG HISTÓRICO C/DEP. | Corregir sin renombrar config | Sí — Julián/Puri |
| A-19 | BD de producción con datos personales en Git | BUG HISTÓRICO C/DEP. | Corregir (RGPD) | Sí — Paco/RGPD |
| A-20 | Deuda infra (`node_modules`, Node 8, MySQL fantasma) | ACCIDENTAL | Limpiar | Sí — Julián |

**Reglas protegidas (anomalías positivas, INTENCIONAL) que NO aparecen como fila de bug** pero se
listan aquí para que consten como comportamiento sagrado a **especificar tal cual** en las specs
formales, con sus ≥2 testigos (CÓDIGO + NEGOCIO-doc, y DATOS donde aplica):

| Regla | Testigos | Tratamiento |
|---|---|---|
| Redondeo línea a línea; totales suman líneas ya redondeadas (RN-01/02/03) | CÓDIGO + NEGOCIO-doc (Julián/Puri, mayo 2019) + DATOS (FA-2026-000102) | Especificar tal cual (sagrada) |
| Descuento por volumen sobre base bruta, umbral estricto `>` (RN-04/05) | CÓDIGO + NEGOCIO-doc (Paco/Puri 2018) + DATOS (FA-2026-000103/105) | Especificar tal cual |
| Recargo de equivalencia por tipo de IVA, solo si cliente marcado (RN-06/07) | CÓDIGO + DATOS (db.js:96-97, 126-136) + legal | Especificar tal cual |
| Tipos de IVA antiguos conservados 16/18/7/8 (RN-08) | CÓDIGO + NEGOCIO-doc (comentario "reabrir ejercicios") | Especificar tal cual |
| ~~Prorrateo comercial 30 días, día 31 no se cobra (RN-10/11)~~ **← REVOCADA (acta D-01, 2026-07-07)** | CÓDIGO + NEGOCIO-doc (Paco/Access), **contradicho por NEGOCIO vivo (Paco/Puri)** | **YA NO es regla protegida:** el negocio decidió días reales y que el día 31 se cobra. Reclasificar en `reglas-de-negocio.md`; corregir en modernización, no especificar tal cual |
| Numeración correlativa sin huecos, no borrar facturas (RN-14/15/16) | CÓDIGO + NEGOCIO-doc (inspección 2020) | Especificar tal cual (legal) |
| Rectificativa = espejo exacto sin recalcular | CÓDIGO + NEGOCIO-doc (Puri) | Especificar tal cual |
| Formato de importe español; vencimiento = fecha + días (RN-18/19/21) | CÓDIGO + DATOS (db.js:139,145,160) | Especificar tal cual |

---

# Clasificaciones PENDIENTES (agenda de la próxima conversación con el negocio)

> Esta lista **debe quedar VACÍA antes de escribir las specs formales.** Mientras tenga entradas, es
> exactamente el guion de la próxima entrevista. Cada una está bloqueada por falta de **testigo de
> negocio vivo** y/o **veredicto de datos** (la arqueología aún no realizada).
>
> **Actualización tras el acta de 2026-07-07.** La reunión **cerró A-01 y A-14** (preguntas 1 y 2,
> respondidas en firme por Paco/Puri y Puri/asesoría fiscal). **A-15 y A-16 siguen PENDIENTES**: en la
> reunión el consultor respondió *en nombre del negocio* con el criterio más lógico (D-03, D-04), pero
> esas respuestas están marcadas **[SIMULADA — ratificar]** y **no constituyen testimonio de negocio
> vivo** hasta su confirmación por escrito. Por tanto **no salen de la agenda**: quedan como preguntas a
> ratificar, con la propuesta del consultor ya sobre la mesa.

| # | Anomalía | Pregunta exacta que la desbloquea | Responsable | Testigo que falta |
|---|----------|-----------------------------------|-------------|-------------------|
| ~~1~~ | ~~**A-01**~~ | **CERRADA** en acta 2026-07-07 (D-01): días reales del mes; el día 31 se cobra. Pendiente solo el dato de arqueología (nº de facturas de baja con fórmula A) para dimensionar, no para decidir. | — | — (resuelta) |
| ~~2~~ | ~~**A-14**~~ | **CERRADA** en acta 2026-07-07 (D-02): manda el año de `factura.fecha`. Pendiente solo el dato de arqueología (facturas con año de número ≠ año de fecha). | — | — (resuelta) |
| 1 | **A-15** | Cuando "desde" es posterior a "hasta" en un prorrateo, ¿cobrar 0 € en silencio o avisar? ¿Puede un periodo cruzar dos meses? | Marga + Paco | **Ratificación** de la respuesta SIMULADA D-03 (propuesta: avisar/no grabar; no cruzar meses) |
| 2 | **A-16** | ¿Un tipo de IVA no reconocido debe rechazarse o calcular recargo 0 silenciosamente? | Puri + Paco | **Ratificación** de la respuesta SIMULADA D-04 (propuesta: rechazar; corregir `===` con `'21'`) |

**Además**, aunque su clasificación de bug ya está cerrada, estas anomalías **tienen decisión de
negocio pendiente** que debe resolverse antes de especificar su tratamiento definitivo (no bloquean la
clasificación, pero sí el "especificar tal cual" vs. "corregir"): A-02, A-04, A-05, A-06, A-08, A-09,
A-10, A-11, A-12, A-13, A-17, A-18, A-19, A-20. **Tras el acta de 2026-07-07, todas ellas tienen una
respuesta SIMULADA del consultor (D-05..D-18) pendiente de ratificación escrita** (ver el bloque
correspondiente en cada anomalía y la tabla resumen). A-03 y A-07 son correcciones técnicas (D-19),
sin decisión de negocio.

**Agenda de la próxima ronda con el negocio, en dos bloques:**
1. **Ratificar por escrito** las respuestas [SIMULADA] con cada responsable (D-03..D-18). Solo entonces
   A-15 y A-16 podrán cerrarse y el resto podrá pasar de "documentar" a su tratamiento definitivo.
2. **Arqueología de datos** sobre `datos/gesfact.db` (aún no realizada), que dimensiona lo ya decidido:
   - Nº de facturas históricas de baja de contrato con fórmula A (30 fijos) — dimensiona A-01/D-01.
   - Facturas con año de número ≠ año de fecha — dimensiona A-14/D-02.
   - Confirmar que no existe cliente con `dias_pago = 0` — respalda A-05/D-05.

---

*Consolidado en fase de reconocimiento a partir de las fuentes de `specs/000-reconocimiento/`.
Toda afirmación se apoya en `fichero:líneas` del repositorio, en datos reales de `datos/gesfact.db` o
en el testimonio del [acta de entrevista del 2026-07-07](./entrevista-negocio.md). Actualizado tras esa
acta: **A-01 y A-14 quedan cerradas** con testimonio de negocio vivo firme (D-01, D-02); **A-15 y A-16
siguen PENDIENTES** porque su respuesta en el acta es simulada por el consultor y está a ratificar; el
resto de anomalías tiene una respuesta simulada (D-05..D-18) igualmente pendiente de ratificación. La
**arqueología de datos** sigue sin realizarse (dimensiona lo decidido, no lo decide). No se corrige nada
(constitución del proyecto).*

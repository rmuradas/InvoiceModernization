# Memoria histórica de GesFact 2.4

Cronología reconstruida **a partir de los comentarios del código fuente**
(no de git ni de la base de datos, salvo donde se indica). Cada entrada cita
`fichero:línea` como evidencia. Todo lo que no está respaldado por un dato real
se marca como **SUPOSICIÓN** y se convierte en pregunta al negocio, conforme a
la constitución del proyecto.

Personas que aparecen en los comentarios:

- **Julián** — autor principal / mantenedor histórico (firma la mayoría de los avisos, 2017–2021).
- **Paco** — negocio; decidía cálculos "a mano" en el Access y acordó el descuento por volumen.
- **Marga** — administración; graba clientes/facturas, lanza la remesa, envía facturas a mano.
- **Puri** — gestoría externa; reconcilia las facturas y fija el formato de exportación.
- **Roberto** — becario; añadió el script de remesa mensual y el autorrelleno de líneas (2021).
- **Manoli** — persona de contacto para el correo/SMTP (a consultar antes de reactivar el email).

---

## Cronología

### 2017 — Reescritura de GesFact 1.x (Access) a Node

- **Qué pasó:** GesFact 2.0 es la reescritura en Node del antiguo GesFact 1.x, que
  era un Access. Parte de `lib/util.js` procede directamente de aquella versión.
- **Implicados:** Julián.
- **Evidencia:** [server.js:7](../../server.js#L7) («v2.0 (2017): reescritura del gesfact 1.x (Access) en node»); [lib/util.js:2](../../lib/util.js#L2) («algunas vienen del gesfact 1.x en Access, cuidado al tocar»).
- **Pregunta al negocio:** ¿Existe todavía el Access original de GesFact 1.x y sus datos? ¿Se considera fuente de verdad para reabrir ejercicios antiguos, o solo archivo muerto?

### Noviembre 2017 — Validación de NIF incompleta (anomalía conocida)

- **Qué pasó / se decidió:** `validarNIF` solo comprueba la longitud (9 caracteres),
  no la letra. Se dejó así deliberadamente porque los NIF los da de alta y revisa
  Marga a mano. (En `datos/gesfact.db` hay NIF de ejemplo con letra en minúscula,
  p. ej. `70355910k`, que pasarían esta validación laxa — ver `db.js:101`.)
- **Implicados:** Julián (decisión), Marga (control manual).
- **Evidencia:** [lib/util.js:42-43](../../lib/util.js#L42-L43) («TODO Julian 11/2017: falta comprobar la letra... con la longitud vale porque los da de alta Marga»).
- **Pregunta al negocio:** ¿Se quiere una validación real de NIF/CIF (letra de control) o el control humano de Marga sigue siendo suficiente y no debe tocarse?

### 2018 — Descuento por volumen para fidelizar hostelería

- **Qué se decidió:** Descuento por volumen sobre la base de la factura: >1.000 € → 2%,
  >5.000 € → 5% (comparación estricta `>`; 1.000 € justos **no** descuentan). Acordado
  con Paco. A petición de Puri, el descuento se aplica **línea a línea sobre el precio**
  para que la gestoría lo vea desglosado.
- **Implicados:** Paco (acuerdo comercial), Puri (forma de desglose).
- **Evidencia:** [services/calculo.js:36-43](../../services/calculo.js#L36-L43) (umbrales y «acordado con Paco en 2018»); [services/calculo.js:63-64](../../services/calculo.js#L63-L64) («peticion de Puri, 2018»). Caso de frontera documentado en datos: [db.js:138-139](../../db.js#L138-L139) («base 1000 justa NO lleva descuento»).
- **Pregunta al negocio:** ¿Siguen vigentes los umbrales (1.000/5.000) y porcentajes (2%/5%) en 2026? ¿El límite estricto en 1.000 € exactos es intencionado o debería ser `>=`?

### Marzo 2018 — De ficheros JSON a SQLite

- **Qué pasó:** Se migró el almacenamiento de ficheros `.json` a SQLite porque los
  datos se corrompían cuando Marga y Julián grababan a la vez. La migración prevista
  a MySQL quedó pendiente.
- **Implicados:** Julián, Marga.
- **Evidencia:** [db.js:2-4](../../db.js#L2-L4) («Julian 03/2018: pasamos de ficheros .json a sqlite... La migracion a MySQL... quedo pendiente»); [server.js:6](../../server.js#L6).
- **Pregunta al negocio:** ¿Se referencia un `LEEME.txt` que no está en el repositorio (ver db.js:4)? ¿Dónde está? ¿Sigue vigente el plan de migrar a MySQL o se descarta?

### Octubre 2018 — Volcado de prueba para migración a MySQL (trabajo abandonado)

- **Qué pasó:** Julián preparó un volcado SQL de prueba para migrar a MySQL en el
  "servidor nuevo". **Nunca se ejecutó en producción.** El esquema está desfasado
  (le faltan recargo de equivalencia y rectificativas). Se conserva "por si acaso".
- **Implicados:** Julián.
- **Evidencia:** [datos/migracion_mysql_2018.sql:1-3](../../datos/migracion_mysql_2018.sql#L1-L3) («volcado de PRUEBA... NUNCA SE LLEGO A EJECUTAR... El esquema esta desfasado»).
- **Pregunta al negocio:** ¿Se puede archivar/eliminar definitivamente este SQL, o hay obligación de conservarlo? Confirma que no es fuente de verdad de nada.

### Marzo 2019 — Vencimiento con un día de desfase (anomalía sin reproducir)

- **Qué pasó:** En marzo de 2019 el vencimiento de una factura salió un día menos.
  Julián sospecha del cambio de hora (horario de verano) en `sumarDias`, que suma
  milisegundos sobre `Date`. No se consiguió reproducir. Sigue sin corregir.
- **Implicados:** Julián.
- **Evidencia:** [lib/util.js:17-20](../../lib/util.js#L17-L20) («TODO: en marzo de 2019 el vencimiento... salio un dia menos... por el cambio de hora, no he conseguido reproducirlo»).
- **Pregunta al negocio:** ¿Se ha vuelto a detectar algún vencimiento descuadrado? ¿Hay factura concreta afectada que podamos usar para reproducir el fallo?

### Mayo 2019 — Redondeo línea a línea: NO CAMBIAR (incidente con la gestoría)

- **Qué pasó:** Julián cambió el redondeo para calcular sobre la base total en lugar
  de línea a línea. La gestoría (Puri) **devolvió todo el trimestre** por descuadre.
  Se revirtió: cada línea redondea a 2 decimales por separado y los totales suman
  líneas ya redondeadas. Regla marcada como intocable en cabecera del fichero.
- **Implicados:** Julián (cambio y reversión), Puri (rechazo del trimestre).
- **Evidencia:** [services/calculo.js:3-7](../../services/calculo.js#L3-L7) («AVISO (Julian, mayo 2019): NO CAMBIAR LA FORMA DE REDONDEAR... Puri (gestoria) devolvio todo el trimestre. Se queda como esta»).
- **Pregunta al negocio:** Ninguna acción; confirmar solo que la gestoría sigue reconciliando línea a línea y que esta regla no debe tocarse bajo ningún concepto.

### 2019 — Informes de IVA y exportación a la gestoría (v2.3)

- **Qué pasó / se decidió:** Se añadieron el resumen de IVA por trimestre (base del
  modelo 303, que remata la gestoría) y la exportación CSV. El formato del CSV lo
  acordó Puri: separador `;`, decimales con coma, y la clave de gestoría en la primera
  línea.
- **Implicados:** Puri (formato de exportación).
- **Evidencia:** [server.js:5](../../server.js#L5) («v2.3 (2019): informes de iva y export gestoria»); [routes/informes.js:32-33](../../routes/informes.js#L32-L33) («formato acordado con Puri en 2019»); [routes/informes.js:13](../../routes/informes.js#L13).
- **Pregunta al negocio:** ¿La clave de exportación `SH-CONTA-7731` (config.js:37) sigue siendo la que espera la gestoría? ¿El rango de trimestre usa `-31` como tope de mes fijo aunque el mes no tenga 31 días (informes.js:19); es correcto para la gestoría?

### 2020 — Inspección: numeración correlativa sin huecos, no borrar facturas

- **Qué pasó / se decidió:** A raíz de una inspección en 2020 se estableció como
  obligación legal que la numeración sea correlativa y sin huecos por serie y año.
  Desde entonces **las facturas no se borran nunca**: un error se corrige con una
  rectificativa en serie `RE` y se emite una factura nueva.
- **Implicados:** (Inspección; ejecutado por Julián en el código.)
- **Evidencia:** [lib/numeracion.js:3-6](../../lib/numeracion.js#L3-L6) («desde la inspeccion de 2020 las facturas NO SE BORRAN NUNCA»).
- **Pregunta al negocio:** ¿Hay algún requisito documentado de la inspección de 2020 (acta, requerimiento) que debamos citar como fuente en la especificación?

### Enero 2021 — Números de factura duplicados por grabación concurrente (anomalía)

- **Qué pasó:** El 2 de enero salieron dos facturas con el mismo número porque Marga
  y Julián grabaron a la vez. Julián puso "último+1 leyendo justo antes de grabar" y
  anota que "no ha vuelto a pasar (creo)". La reserva de número **sigue sin ser
  atómica** (`SELECT` y `UPDATE` separados en `siguienteNumero`/`reservar`).
- **Implicados:** Julián, Marga.
- **Evidencia:** [lib/numeracion.js:8-10](../../lib/numeracion.js#L8-L10) («Julian 01/2021: el 2 de enero salieron dos facturas con el mismo numero... no ha vuelto a pasar (creo)»); mecanismo no atómico en [lib/numeracion.js:14-36](../../lib/numeracion.js#L14-L36).
- **Pregunta al negocio:** Dado el riesgo legal de números duplicados, ¿cuántos usuarios graban facturas simultáneamente hoy? ¿Ha reaparecido el problema desde 2021? (La corrección exigiría decisión escrita: es cambio de comportamiento.)

### Verano 2021 — Script de remesa mensual de cuotas (v2.4)

- **Qué pasó:** Roberto (becario) añadió `scripts/remesa_mensual.js` para generar las
  facturas de cuotas de contrato sin meterlas a mano. Se lanza el día 1 desde el
  ordenador de Marga.
- **Implicados:** Roberto (autor), Marga (quien lo ejecuta).
- **Evidencia:** [scripts/remesa_mensual.js:6-7](../../scripts/remesa_mensual.js#L6-L7) («Lo añadio Roberto (becario) en verano de 2021...»); [server.js:4](../../server.js#L4); recordatorio operativo en [views/index.ejs:9](../../views/index.ejs#L9) («la remesa... se lanza el día 1 desde el ordenador de Marga»).
- **Pregunta al negocio:** ⚠️ Discrepancia de cálculo detectada: el prorrateo del script usa **los días reales del mes** (`scripts/remesa_mensual.js:47-51`), mientras que `calculo.calcularProrrateo` usa **30 días fijos** (`services/calculo.js:95-101`). Son dos cálculos distintos para "lo mismo". ¿Cuál es el correcto para la gestoría? ¿Se ha comparado alguna vez el resultado de ambos en una baja a mitad de mes?
- **RESUELTA (acta 2026-07-07, D-01):** el oficial es el del script (**días reales del mes**, con el día
  31 cobrado). La fórmula de 30 días fijos de `calcularProrrateo` queda desalineada y a unificar en
  modernización. Ver [entrada de julio 2026](#julio-2026--entrevista-de-negocio-doctrina-de-prorrateo-y-de-numeración-revisión-de-reglas) y A-01 del registro de anomalías.

### 2021 — Autorrelleno de líneas de factura

- **Qué pasó:** Roberto añadió el JS que autorrellena precio e IVA al elegir un
  artículo del desplegable; antes se copiaba a mano del listado.
- **Implicados:** Roberto.
- **Evidencia:** [public/js/factura.js:1-2](../../public/js/factura.js#L1-L2) («Roberto 2021; antes se copiaba a mano del listado de articulos»).
- **Pregunta al negocio:** Sin acción. (Confirmar que el desplegable sigue casando por descripción exacta, factura.js:7.)

### 2022 — El envío de facturas por correo deja de funcionar (trabajo abandonado)

- **Qué pasó:** Arsys cambió el servidor de correo y dejó de autenticar. Desde
  entonces las facturas se envían **a mano** desde el Outlook de Marga (imprimiendo la
  vista a PDF con el navegador). `enviarFactura` solo hace `console.log`.
- **Implicados:** Marga (envío manual), Manoli (contacto para reactivar).
- **Evidencia:** [services/email.js:3-6](../../services/email.js#L3-L6) («FUERA DE SERVICIO desde 2022: Arsys cambio el servidor... se estan enviando A MANO desde el Outlook de Marga... Hablar con Manoli»); [config.js:27-28](../../config.js#L27-L28).
- **Pregunta al negocio:** ¿Se desea reactivar el envío automático de facturas? Si es así, ¿con qué proveedor y credenciales actuales? (Ojo: `config.js:33` contiene una clave SMTP en texto plano, probablemente caducada — anomalía de seguridad a registrar.)

### 2023 — Desinstalación de `nodemailer`

- **Qué pasó:** Se desinstaló `nodemailer` porque "daba un aviso de seguridad". El
  código de envío quedó comentado.
- **Implicados:** (No firmado; presumiblemente Julián.) **SUPOSICIÓN** sobre la autoría.
- **Evidencia:** [services/email.js:8](../../services/email.js#L8) («desinstalado en 2023, daba un aviso de seguridad»).
- **Pregunta al negocio:** ¿Quién realizó esta desinstalación y consta el aviso de seguridad concreto? Relevante si se decide reactivar el correo.

### Julio 2026 — Entrevista de negocio: doctrina de prorrateo y de numeración (revisión de reglas)

- **Qué se decidió (testimonio firme de reunión):** en la entrevista del 2026-07-07 el negocio
  **revocó dos comportamientos** que hasta entonces se documentaban como "reglas de la casa":
  1. **Prorrateo (D-01, Paco con Puri):** se abandona la doctrina histórica de Paco de "el mes son
     siempre 30 días / el día 31 no se cobra". El prorrateo oficial pasa a ser **días reales del mes**
     (la fórmula que ya usaba la remesa) y **el día 31 sí se cobra**. Esto **contradice** el comentario
     fosilizado en `calculo.js:90-93` ("así lo hacía Paco a mano en el Access y así lo espera la
     gestoría"): la doctrina del Access queda superada por decisión viva del propio Paco.
  2. **Numeración (D-02, Puri con asesoría fiscal):** el año del contador debe tomarse de la **fecha de
     la factura**, no del año de grabación (`new Date().getFullYear()`). Una remesa de diciembre lanzada
     en enero debe numerar en el año viejo.
- **Implicados:** Paco (doctrina comercial), Puri (gestoría), asesoría fiscal.
- **Naturaleza:** son las **únicas dos respuestas firmes** del acta; el resto de decisiones (D-03..D-18)
  son **simuladas por el consultor** y están pendientes de ratificación (ver acta). Nada se aplica en
  esta fase (documentar y proteger); las correcciones son **no retroactivas** y para modernización.
- **Evidencia:** [entrevista-negocio.md, D-01 y D-02](./entrevista-negocio.md); código afectado
  [services/calculo.js:90-93,95-102](../../services/calculo.js#L90-L102),
  [scripts/remesa_mensual.js:47-51](../../scripts/remesa_mensual.js#L47-L51),
  [lib/numeracion.js:15](../../lib/numeracion.js#L15).
- **Pregunta al negocio:** ninguna sobre estas dos (resueltas). Queda **arqueología de datos** para
  dimensionar el impacto histórico (facturas de baja con la fórmula vieja; facturas con año de número ≠
  año de fecha) — ver acta §6.2.

---

## Advertencias "no tocar" recopiladas (con su motivo)

| Advertencia | Motivo declarado | Evidencia |
|---|---|---|
| NO CAMBIAR la forma de redondear (línea a línea) | La gestoría devolvió todo el trimestre en 2019 | [services/calculo.js:3-7](../../services/calculo.js#L3-L7) |
| Rectificativa = espejo exacto, NO recalcular | «Puri dixit» | [routes/facturas.js:126-128](../../routes/facturas.js#L126-L128) |
| No borrar facturas; numeración sin huecos | Obligación legal tras inspección 2020 | [lib/numeracion.js:3-6](../../lib/numeracion.js#L3-L6) |
| No borrar tipos de IVA antiguos (18/16/8/7) | Por si hay que reabrir ejercicios viejos del Access | [services/calculo.js:16-17](../../services/calculo.js#L16-L17) |
| NO RENOMBRAR `config.js` | Se copia a mano al servidor `\\SERVIDOR\gesfact` | [config.js:2-3](../../config.js#L2-L3) |
| No tocar datos iniciales | Administración los usa de referencia | [db.js:91-92](../../db.js#L91-L92) |
| `lib/util.js`: cuidado, viene del Access | Código heredado de GesFact 1.x | [lib/util.js:2](../../lib/util.js#L2) |
| Clave de exportación gestoría: no cambiar | Formato acordado con la gestoría | [config.js:36-37](../../config.js#L36-L37) |
| Hablar con Manoli antes de reactivar el correo | SMTP roto desde 2022 | [services/email.js:6](../../services/email.js#L6), [config.js:27-28](../../config.js#L27-L28) |

## Trabajos abandonados / deuda declarada

- **Migración a MySQL** — planificada en 2018, volcado de prueba nunca ejecutado, esquema desfasado. [db.js:2-4](../../db.js#L2-L4), [datos/migracion_mysql_2018.sql:1-3](../../datos/migracion_mysql_2018.sql#L1-L3), [config.js:19](../../config.js#L19).
- **Envío de facturas por email** — fuera de servicio desde 2022, código comentado, dependencia desinstalada. [services/email.js](../../services/email.js).
- **Partir `routes/facturas.js`** — «algún día habría que partirlo. "Algún día".» [routes/facturas.js:2-3](../../routes/facturas.js#L2-L3).
- **Fichero `LEEME.txt` referenciado pero ausente** del repositorio. [db.js:4](../../db.js#L4).

## Anomalías conocidas registradas (no corregir en esta fase)

1. **Reserva de número no atómica** → posibles duplicados. [lib/numeracion.js:14-36](../../lib/numeracion.js#L14-L36).
2. **`validarNIF` solo comprueba longitud**, no la letra. [lib/util.js:44-48](../../lib/util.js#L44-L48).
3. **`sumarDias` con posible desfase de un día** (cambio de hora), no reproducido. [lib/util.js:20-26](../../lib/util.js#L20-L26).
4. **Dos prorrateos distintos** (30 días fijos vs. días reales del mes). [services/calculo.js:95-101](../../services/calculo.js#L95-L101) vs. [scripts/remesa_mensual.js:47-51](../../scripts/remesa_mensual.js#L47-L51).
5. **Grabación de líneas de factura sin transacción**: si falla una línea a mitad, la factura queda incompleta («se apañó a mano en su día»). [routes/facturas.js:81-98](../../routes/facturas.js#L81-L98).
6. **Clave SMTP en texto plano** en `config.js`, fichero que se copia a mano a un recurso de red. [config.js:33](../../config.js#L33).

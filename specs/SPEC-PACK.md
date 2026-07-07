# Spec Pack — GesFact 2.4 (Suministros Hidalgo, S.L.)

**Documento de entrada única al paquete de reconocimiento y especificación.**
**Fecha:** 2026-07-07. **Fase:** documentar y proteger, no mejorar (`.specify/memory/constitution.md`).

Este documento es la portada del paquete: por dónde empezar según quién seas. El gerente lee la
sección 1. El responsable de la modernización lee las secciones 2 y 4. Quien vaya a trabajar el
código entra por el índice de la sección 3.

---

## 1. Resumen ejecutivo para el gerente

*Una página, sin tecnicismos.*

**Qué es GesFact.** El programa con el que la empresa emite sus facturas todos los días. Lleva años
en marcha, factura dinero real y la gestoría cuadra sus resultados céntimo a céntimo. Nadie había
escrito hasta ahora **qué hace exactamente** ni **por qué**; el conocimiento vivía en la cabeza de
las personas y en comentarios sueltos dentro del programa.

**Qué se ha hecho.** Se ha auditado el programa entero sin cambiar ni un importe. El resultado es un
paquete de documentación que deja por escrito, con pruebas, cómo factura hoy la empresa: las reglas
de cálculo, los descuentos, el IVA, la numeración de facturas y los informes para la gestoría. Se
ha entrevistado al negocio (Paco, Marga, Puri) para cerrar las dudas importantes y se han instalado
**alarmas automáticas** que avisan si algún día la facturación empieza a dar un resultado distinto.

**Qué se ha descubierto (las cuatro cosas con dinero de por medio).** Son comportamientos frágiles
que **hoy no cuestan dinero** pero podrían costarlo. Ninguno se ha tocado: se corrigen, si el
negocio lo decide, en la siguiente fase.

1. **Dos formas distintas de partir una cuota mensual** (dar de alta o de baja un contrato a mitad
   de mes). La pantalla calcula "el mes son 30 días"; el proceso mensual automático calcula los días
   reales del mes. En febrero o en meses de 31 días, **el mismo contrato sale con importe distinto
   según por dónde se emita**. Ejemplo: una cuota de 60 € por medio mes de marzo sale **30,00 € por
   pantalla y 29,03 € por el proceso automático** — casi un euro de diferencia por factura. El
   negocio ya ha decidido (reunión del 07/07/2026) que la buena es la de días reales.

2. **Los ejemplos de prueba que traía el programa no cuadran con su propio cálculo.** Al recalcular
   dos facturas de ejemplo, salen importes distintos de los que estaban grabados a mano: una factura
   "de 1.000 €" en realidad suma **1.000,02 €** y por tanto le tocaría un descuento del 2 %
   (**1.185,82 €** en vez de los 1.210,00 € grabados). No afecta a ninguna factura real de cliente
   —solo a los datos de demostración—, pero demuestra que el que "mentía" era el ejemplo, no el
   cálculo.

3. **La regla de redondeo no es tan exacta como se creía.** Se daba por hecho que "medio céntimo
   siempre sube". Al ejecutarlo, hay números concretos donde **no sube** (por cómo el ordenador
   guarda los decimales). Hoy no ha afectado a ninguna factura real, pero es exactamente el tipo de
   descuadre de un céntimo que en 2019 hizo a la gestoría devolver un trimestre entero.

4. **El total del informe de IVA para la gestoría se suma con una regla distinta** a la de las
   facturas. Hoy da el mismo número, pero podría desviarse un céntimo en un caso límite — el mismo
   riesgo de descuadre del punto anterior, en el papel que la gestoría revisa antes del modelo 303.

**Qué protección se ha instalado.** Una batería de **63 pruebas automáticas** que funcionan como una
alarma: si alguien cambia el programa y la facturación empieza a dar aunque sea **un céntimo**
distinto, la alarma salta al instante. Antes, ese cambio habría llegado a la gestoría sin que nadie
lo notara. La alarma se dispara con un solo comando (`npm test`) y hoy está toda en verde.

**Qué decisiones tiene pendientes el negocio.** Las clasificaciones ya están todas cerradas; lo que
queda es **ratificar por escrito** un conjunto de acuerdos tomados de palabra, para poder pasar de
"documentar" a "corregir" en la modernización. Recomendación:

| Tema | Recomendación |
|---|---|
| Unificar la forma de partir la cuota (punto 1) | Adoptar días reales del mes, **sin recalcular** las facturas ya emitidas. Ya decidido; falta ejecutar en modernización. |
| Redondeo exacto y total del informe de IVA (puntos 3 y 4) | Alinear ambos con la regla sagrada de las facturas. Riesgo de 1 céntimo; corregir con calma pero antes de cualquier migración. |
| Seguridad y datos personales (contraseñas y BD de clientes en el repositorio) | Sacar contraseñas y datos reales fuera del código. Es lo más urgente en términos de riesgo (RGPD / seguridad), aunque no toca importes. |
| Ratificación de los acuerdos de la entrevista | Convocar una segunda ronda breve para firmar lo hablado el 07/07/2026. Desbloquea toda la modernización. |

---

## 2. Inventario de riesgos priorizado

*Consolidado de [registro-riesgos.md](000-reconocimiento/registro-riesgos.md) (R1–R15) y del
[registro de anomalías](000-reconocimiento/registro-de-anomalias.md) (A-01…A-22). Ordenado por
impacto × probabilidad. Cada línea: impacto en una frase y recomendación para la modernización.*

| Riesgo / Anomalía | Impacto de negocio (una frase) | Recomendación para modernización |
|---|---|---|
| **R1 · A-18** — Secretos en claro en `config.js` versionado (contraseña SMTP, clave de exportación de gestoría) | Cualquiera con acceso al repositorio obtiene contraseñas y la clave que valida los ficheros de la gestoría | Sacar secretos a variables de entorno **sin renombrar** `config.js` (se copia a mano al servidor); rotar la SMTP; coordinar la de gestoría con Puri. |
| **R2 · A-19** — BD de producción con datos personales de clientes versionada, sin `.gitignore` | Fuga de datos personales (RGPD): cada copia del repositorio lleva NIF, direcciones y correos reales | Sacar `datos/gesfact.db` del control de versiones, añadir `.gitignore`, sustituir por datos de ejemplo anonimizados; decidir la purga del histórico con asesoría RGPD. |
| **R3 · A-02** — Reserva de número de factura no atómica | Dos usuarios grabando a la vez pueden emitir el mismo número, rompiendo la correlatividad legal (inspección 2020) | Hacer atómica la reserva (transacción/bloqueo) **sin** alterar la numeración emitida; coordinar con R4/R15. Concurrencia real hoy: máx. 2 usuarios. |
| **R15** — Convivencia de dos contadores de año al numerar por fecha de factura | Al facturar diciembre en enero podría saltarse la correlatividad de uno de los dos ejercicios | Riesgo **futuro**, solo al aplicar la corrección A-14; gestionar los dos contadores de año en el cambio de ejercicio. |
| **R6 · A-01** — Doble prorrateo divergente (30 días fijos vs. días reales) | El mismo contrato prorratea distinto según se emita por pantalla o por el lote mensual (≈ 1 € por factura) | Unificar en una sola fórmula (días reales, ya decidido), **no retroactiva**; medir antes cuántas facturas históricas usaron la fórmula vieja. |
| **R4 · A-03** — Alta de factura sin transacción (cabecera y líneas sueltas) | Un fallo a mitad deja una factura descuadrada o un número "quemado"; requiere reparación manual | Envolver cabecera + líneas en transacción; cuidar que un rollback no deje el contador avanzado. |
| **R5 · A-04** — Rectificativa sin transacción y con error de línea silenciado | Un abono puede quedar a medias descuadrando el IVA que la gestoría reconcilia | Transacción + captura de error; no marcar `rectificada` si falla el espejo; mantener "espejo exacto sin recalcular". |
| **A-06** — Total del informe de IVA sumado sin la regla de redondeo sagrada | Podría desviarse un céntimo en el papel que la gestoría revisa antes del modelo 303 | Someter el total del informe a la misma aritmética de redondeo que las facturas. |
| **A-21** — El redondeo "medio hacia arriba" no es universal (bordes de coma flotante) | Descuadre latente de 1 céntimo si una factura cae justo en un borde; la doctrina escrita describe mal el código | Corregir el enunciado de la doctrina; decidir si se pasa a aritmética de céntimos enteros. Congelado por tests. |
| **A-22** — Facturas de ejemplo de `db.js` no reproducibles por el motor | Solo datos de demostración; invalida ejemplos citados en la doctrina, no facturas reales | Regenerar los datos de ejemplo **pasándolos por el motor** al anonimizar (coordina con A-19). El motor no se toca. |
| **A-14** — Numeración por año del sistema, no de la fecha de la factura | Una remesa de diciembre lanzada en enero tomaría el contador del año nuevo | Tomar el año de `factura.fecha`; ya decidido. Gestionar R15. |
| **A-05 / A-09** — Vencimiento e IVA por defecto duplicados (`config` vs. literal) | Cambiar un parámetro de la casa afectaría solo a la mitad del sistema | Unificar la lectura de `config`; resolver la semántica de `dias_pago = 0` (contado). Hoy no divergen. |
| **R7 · A-10** — Manejo de fechas casero sensible a zona horaria | Un vencimiento puede salir un día desplazado en cambios de hora | Manejo de fechas robusto (sin milisegundos/zona). No reproducido desde 2019. |
| **R8 · A-12** — Validación de NIF/CIF solo por longitud | Se aceptan NIF fiscalmente inválidos que la gestoría puede rechazar | Validar la letra de control si el negocio lo pide; hoy hay control manual compensatorio (Marga). |
| **R9 · A-07** — Alta sin validar `NaN` en cantidad/precio | Una factura con importe basura podría grabarse y descuadrar informes | Validar la entrada antes de calcular (corrección técnica). |
| **A-08** — Normalización de coma decimal duplicada ×3, frágil ante el punto de miles | Un importe con separador de miles (`1.234,56`) se leería mal en tres rutas por igual | Extraer un único `util.parseImporte` robusto. Hoy no se teclean miles. |
| **A-11** — Fin de trimestre fijado a `-31`, tapado por la comparación textual de SQLite | Correcto hoy; se rompería al migrar a un motor con tipo fecha estricto | Usar el último día real del mes **antes** de cualquier migración. |
| **A-13** — Grabado de factura escrito tres veces, orden de líneas no determinista | El orden de líneas de la factura impresa depende de qué inserción termina antes | Extraer un único `grabarFactura` transaccional que preserve el orden de captura. |
| **A-17 · R14** — `enviarFactura` no envía; el flujo actúa como si enviara | Falsa sensación de envío; las facturas se mandan a mano desde el Outlook de Marga | Documentar el envío manual como proceso vigente; reactivar solo por decisión, hablando antes con Manoli. |
| **R10** — Contraseña SMTP obsoleta conservada | Credencial expuesta sin utilidad (correo roto desde 2022) | Rotar/eliminar. |
| **A-20 · R11–R13** — Deuda de infraestructura (`node_modules` versionado, Node 8 fijado, migración MySQL fantasma) | Repositorio inflado y frágil; confusión sobre una migración que nunca existió | Sacar `node_modules` del control de versiones, declarar `engines`, archivar el volcado MySQL. |

> **Lectura rápida:** encabezan seguridad y datos personales (R1–R2, probabilidad alta); siguen los
> riesgos transaccionales y de numeración con impacto fiscal directo (R3–R6, R15); cierran
> validaciones, fechas e infraestructura sin efecto sobre importes. Ninguno se corrige en esta fase.

---

## 3. Índice comentado del paquete

Todo el material vive en [specs/](.). El bloque de reconocimiento está en
[specs/000-reconocimiento/](000-reconocimiento/); las especificaciones formales, en las carpetas
`001`…`008`.

### 3.1 Mapa del sistema y contexto

| Documento | Qué encontrarás |
|---|---|
| [mapa-sistema.md](000-reconocimiento/mapa-sistema.md) | Arquitectura del programa: routers, servicios y librerías, con el papel de cada fichero. |
| [flujo-factura.md](000-reconocimiento/flujo-factura.md) | El recorrido de una factura de principio a fin, marcando dónde "dos caminos hacen lo mismo con código distinto". |
| [reglas-de-negocio.md](000-reconocimiento/reglas-de-negocio.md) | Glosario y catálogo de reglas (RN-01…RN-21) e hipótesis (H-1…H-9), cada una con evidencia. Es el diccionario del paquete. |
| [memoria-historica.md](000-reconocimiento/memoria-historica.md) | La historia del programa contada por sus propios comentarios firmados (Julián, Roberto, Paco): incidentes, "no tocar" y decisiones fosilizadas. |

### 3.2 Las contradicciones y la entrevista de negocio

| Documento | Qué encontrarás |
|---|---|
| [contradiccion-00-indice.md](000-reconocimiento/contradiccion-00-indice.md) | Índice de los seis conceptos de negocio implementados más de una vez, con su gravedad. |
| contradiccion-01…06 | Un documento por contradicción (prorrateo, vencimiento por defecto, grabado, totalización/redondeo, fechas, normalización/IVA), con el cálculo que las diferencia. |
| [entrevista-negocio.md](000-reconocimiento/entrevista-negocio.md) | Acta de la reunión del 07/07/2026 (decisiones D-01…D-19). D-01/D-02 en firme; D-03/D-04 ratificadas por escrito; el resto pendiente de firma. |

### 3.3 Las especificaciones formales (con su trazabilidad)

El sistema se especifica en **ocho** documentos por dominio, todos con estado **Aprobada** (07/07/2026).
Cada uno lleva su checklist de requisitos en `checklists/requirements.md`.

> **Nota de método (discrepancia con el encargo).** El encargo de este spec pack hablaba de "las tres
> specs". El paquete real contiene **ocho** especificaciones aprobadas — la partición por dominio
> ratificada en [propuesta-particion-specs.md](000-reconocimiento/propuesta-particion-specs.md) y en
> el commit `d06fb4b`. Se documenta el estado real (ocho), no el del encargo, conforme a la
> constitución (toda afirmación con evidencia; lo no evidenciado se marca, no se inventa).

| Spec | Dominio | Reglas y anomalías principales que blinda |
|---|---|---|
| [001-aritmetica-fiscal-factura](001-aritmetica-fiscal-factura/spec.md) | Aritmética fiscal de la factura | Redondeo línea a línea sagrado (RN-01/02/03); A-06, A-21, A-22. |
| [002-descuento-volumen](002-descuento-volumen/spec.md) | Descuento comercial por volumen | Descuento sobre base bruta, umbral estricto `>` (RN-04/05). |
| [003-recargo-equivalencia](003-recargo-equivalencia/spec.md) | Recargo de equivalencia | Recargo por tipo de IVA solo si el cliente está marcado (RN-06/07); A-16. |
| [004-numeracion-ciclo-vida-factura](004-numeracion-ciclo-vida-factura/spec.md) | Numeración correlativa y ciclo de vida | Correlatividad sin huecos, rectificativa espejo (RN-14/15/16); A-02, A-03, A-04, A-14. |
| [005-cuotas-contrato-prorrateo-remesa](005-cuotas-contrato-prorrateo-remesa/spec.md) | Cuotas de contrato, prorrateo y remesa | Doble prorrateo (A-01); A-15; grabado de la remesa (A-13). |
| [006-vencimiento-fechas](006-vencimiento-fechas/spec.md) | Vencimiento y manejo de fechas | Vencimiento = fecha + días (RN-19/21); A-05, A-10, A-11. |
| [007-datos-maestros-validacion](007-datos-maestros-validacion/spec.md) | Datos maestros y validación | Validación de NIF (A-12), IVA por defecto (A-09), normalización de importes (A-07, A-08). |
| [008-informes-gestoria](008-informes-gestoria/spec.md) | Informes a la gestoría | Resumen de IVA trimestral y export CSV; A-06, A-11. |

### 3.4 Registros y suite de tests

| Documento / carpeta | Qué encontrarás |
|---|---|
| [registro-de-anomalias.md](000-reconocimiento/registro-de-anomalias.md) | El registro maestro: A-01…A-22, cada una con evidencia, clasificación, dependientes, tratamiento y decisión pendiente. Incluye la tabla de reglas protegidas. |
| [registro-riesgos.md](000-reconocimiento/registro-riesgos.md) | Riesgos R1…R15 ordenados por impacto × probabilidad. |
| [propuesta-particion-specs.md](000-reconocimiento/propuesta-particion-specs.md) | Justificación de por qué el sistema se parte en ocho specs. |
| [test/](../test/) | La suite de caracterización: **63 pruebas** en 12 ficheros más un **golden master** de 13 casos ([test/golden/](../test/golden/)). |

**Instrucciones de ejecución de la suite.** Desde la raíz del proyecto:

```bash
npm test                          # ejecuta las 63 pruebas de caracterización (node --test)
npm run test:golden:regenerar     # regenera el golden master SOLO tras un cambio consciente y aprobado
```

`npm test` debe salir **todo en verde** (a fecha de hoy: `pass 63`, `fail 0`). Cualquier fallo
significa que el comportamiento observable de la facturación ha cambiado: es la alarma disparándose.
El golden master ([test/golden/factura-master.json](../test/golden/factura-master.json)) guarda la
salida "sagrada" del motor; **no se regenera** salvo decisión escrita del negocio, porque regenerarlo
es aceptar el nuevo comportamiento como bueno.

---

## 4. Estado de la red de seguridad: qué está congelado y qué no

La red de caracterización **congela el motor de cálculo**: la aritmética que la gestoría reconcilia
céntimo a céntimo está protegida por las 63 pruebas y el golden master. Concretamente, están
congelados:

- El **cálculo de línea, factura y totales** con el redondeo línea a línea sagrado (`services/calculo.js`),
  incluidos los bordes de coma flotante de A-21 y la no-reproducibilidad de A-22.
- El **descuento por volumen** sobre base bruta con umbral estricto.
- El **recargo de equivalencia** por tipo de IVA, incluido el 0 silencioso ante tipo desconocido (A-16).
- El **prorrateo** en sus dos variantes divergentes (A-01) y el corte a 0 € en silencio (A-15).
- El **formato de importes, el redondeo, las fechas y la validación de NIF** de `lib/util.js`.
- La **numeración correlativa** por serie y año (`lib/numeracion.js`), incluido el año tomado del sistema (A-14).

**Qué NO está cubierto todavía — primera tarea de la siguiente fase.** La red actual prueba el motor
**por dentro** (funciones de cálculo), pero **no** ejercita el sistema **de punta a punta**. Quedan
explícitamente **fuera de la red de seguridad** y son la **primera tarea de la fase de modernización**,
**antes de tocar nada**:

1. **Las rutas HTTP** (`routes/facturas.js`, `contratos.js`, `articulos.js`, `clientes.js`,
   `informes.js`): alta de factura, cobro, rectificación, detalle imprimible e informes se sirven por
   Express + EJS y **no tienen caracterización end-to-end**. Aquí viven A-03, A-04, A-07 y A-13
   (grabado sin transacción, errores silenciados, orden de líneas).
2. **La remesa mensual end-to-end** (`scripts/remesa_mensual.js`): el lote que factura de verdad las
   cuotas de contrato reimplementa prorrateo, vencimiento y grabado por su cuenta (A-01, A-05, A-13) y
   **solo está cubierto a nivel de fórmula**, no ejecutando el script completo sobre una base de datos.

Hasta que estas dos superficies tengan su propia red de caracterización, **cualquier cambio en las
rutas o en la remesa se hace a ciegas**. Blindarlas es el requisito previo a la primera corrección de
la modernización.

---

*Paquete consolidado en fase de reconocimiento (constitución del proyecto: documentar y proteger, no
mejorar). Toda afirmación se apoya en `fichero:líneas`, en datos reales de `datos/gesfact.db` o en el
[acta de entrevista del 07/07/2026](000-reconocimiento/entrevista-negocio.md). No se ha corregido
ningún comportamiento.*

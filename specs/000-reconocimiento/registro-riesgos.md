# Registro de riesgos — GesFact 2.4

**Fase:** reconocimiento (documentar y proteger, no corregir).
**Fecha:** 2026-07-07.
**Alcance:** deuda técnica y riesgos **visibles** en el código y el repositorio, con evidencia.

> Conforme a la constitución del proyecto, este documento **solo registra**. No se
> propone ni se aplica ninguna corrección. Los importes, redondeos, numeración y textos
> observados hoy son la especificación; los comportamientos frágiles se anotan como
> anomalías. Toda afirmación cita `fichero:líneas` o un dato real.

## Cómo leer la tabla

- **Impacto de negocio:** consecuencia en una frase si el riesgo se materializa.
- **Probabilidad:** estimación de que "muerda" en la operativa real (alta / media / baja).
- **Orden:** de mayor a menor **impacto × probabilidad**.

| ID | Descripción | Evidencia | Impacto de negocio (una frase) | Probabilidad |
|----|-------------|-----------|--------------------------------|--------------|
| R1 | Credenciales y secretos en claro dentro del código versionado: contraseña SMTP, clave de exportación de la gestoría y datos fiscales de la empresa | [config.js:33](../../config.js#L33) (`clave: 'Hidalgo2019!'`), [config.js:37](../../config.js#L37) (`CLAVE_EXPORT_GESTORIA: 'SH-CONTA-7731'`); `config.js` aparece en `git ls-files` | Cualquiera con acceso al repositorio obtiene contraseñas reutilizables y la clave que valida los ficheros que recibe la gestoría | alta |
| R2 | Base de datos de producción con datos reales de clientes versionada en Git, sin `.gitignore` | `datos/gesfact.db` (36 KB, NIF, direcciones y emails de clientes reales, ver [db.js:96-101](../../db.js#L96-L101)) aparece en `git ls-files`; no existe fichero `.gitignore` en el repo | Fuga de datos personales de clientes (RGPD) y de facturación al distribuir o clonar el repositorio; cada clon lleva una copia de los datos | alta |
| R3 | Reserva de número de factura no atómica: lectura del contador y escritura en pasos separados sin transacción ni bloqueo (condición de carrera lectura-modificación-escritura) | [lib/numeracion.js:16-35](../../lib/numeracion.js#L16-L35): `SELECT ultimo` y luego `UPDATE ... SET ultimo = ?` en callbacks distintos; comentario propio [lib/numeracion.js:8-10](../../lib/numeracion.js#L8-L10) narra dos facturas con el mismo número el 02/01 | Dos usuarios grabando a la vez pueden emitir facturas con número duplicado, rompiendo la correlatividad legal exigida desde la inspección de 2020 | media |
| R4 | Alta de factura sin transacción: cabecera y líneas se insertan en operaciones sueltas; el número ya se consumió antes de insertar | [routes/facturas.js:71-99](../../routes/facturas.js#L71-L99): `siguienteNumero` reserva número, luego `INSERT` cabecera, luego `forEach` de `INSERT` de líneas sin envolver en transacción; comentario [routes/facturas.js:81-82](../../routes/facturas.js#L81-L82) reconoce "si falla una a mitad ya se apañó a mano" | Un fallo a mitad deja una factura sin líneas o con líneas incompletas cuyos totales no cuadran, o un número "quemado" sin factura (hueco); requiere reparación manual en la BD | media |
| R5 | Rectificación sin transacción y con estado final dependiente del último callback: inserta la RE, copia N líneas y solo entonces marca la original como `rectificada`; los errores de los `INSERT` de líneas se ignoran | [routes/facturas.js:141-160](../../routes/facturas.js#L141-L160): los callbacks de `INSERT` de líneas ([:151](../../routes/facturas.js#L151)) no comprueban error; el `UPDATE ... estado='rectificada'` ([:154](../../routes/facturas.js#L154)) va en el último callback | Un abono puede quedar a medias (RE emitida pero original no marcada, o líneas espejo incompletas), descuadrando el IVA que la gestoría reconcilia | media |
| R6 | Dos cálculos de prorrateo distintos y divergentes para el mismo concepto | [services/calculo.js:95-102](../../services/calculo.js#L95-L102) usa mes fijo de 30 días (`cuota/30*dias`, día 31 no se cobra); [scripts/remesa_mensual.js:47-51](../../scripts/remesa_mensual.js#L47-L51) usa los días reales del mes (`cuota/diasMes*dias`). El comentario de `calculo.js` afirma "el mes son siempre 30 días… así lo espera la gestoría", pero la remesa no lo respeta | El importe prorrateado de una cuota difiere según se calcule por pantalla (baja de contrato) o por el lote mensual, para el mismo contrato y mes | media |
| R7 | Manejo de fechas casero basado en milisegundos, sensible a zona horaria / cambio de hora | [lib/util.js:20-26](../../lib/util.js#L20-L26): `sumarDias` hace `new Date(fecha).getTime() + dias*86400000` y reformatea con `getMonth/getDate` locales; comentario [lib/util.js:18-19](../../lib/util.js#L18-L19) narra un vencimiento con "un día menos" no reproducido | Un vencimiento puede salir un día desplazado en cambios de hora, alterando la fecha de cobro impresa en la factura | baja |
| R8 | Validación de NIF/CIF incompleta (solo longitud, no letra de control) | [lib/util.js:44-48](../../lib/util.js#L44-L48): `validarNIF` solo comprueba `length === 9`; comentario [lib/util.js:42-43](../../lib/util.js#L42-L43) lo reconoce. Datos reales con NIF en minúscula: [db.js:101](../../db.js#L101) (`70355910k`), [db.js:97](../../db.js#L97) (`03488812K`) | Se aceptan NIF fiscalmente inválidos en factura; errores de identificación fiscal que la gestoría puede rechazar | baja |
| R9 | Alta de factura sin validar cantidades ni precios: `parseFloat` sin comprobar `NaN` | [routes/facturas.js:59-62](../../routes/facturas.js#L59-L62): `parseFloat(...)` de cantidad y precio sin verificar resultado antes de calcular; una fila con cantidad/precio no numérico produce `NaN` que se propaga a `calcularLinea` ([services/calculo.js:27](../../services/calculo.js#L27)) | Una factura con importe `NaN`/basura puede grabarse en la BD y descuadrar totales e informes de IVA | baja |
| R10 | Contraseña SMTP obsoleta y credencial de servicio muerto conservada en config | [config.js:27-34](../../config.js#L27-L34): correo "dejó de funcionar en 2022"; el módulo de envío está desactivado ([services/email.js:11-29](../../services/email.js#L11-L29)) pero la clave sigue en el fichero versionado | Credencial expuesta sin utilidad operativa; superficie de fuga sin contrapartida funcional | baja |
| R11 | `node_modules/` completo versionado en Git (dependencia binaria y árbol de terceros dentro del repo) | `git ls-files` lista cientos de rutas bajo `node_modules/`, incluido el binario nativo `node_modules/sqlite3/build/Release/node_sqlite3.node` | Repositorio inflado y frágil; el binario nativo versionado puede no coincidir con el SO/Node de destino, y se arrastran terceros sin control de avisos de seguridad | baja |
| R12 | Instrucción de instalación fija Node 8 (fin de vida desde 2019), sin dependencia declarada de versión | [LEEME.txt](../../LEEME.txt) paso 1: "Instalar node 8 desde nodejs.org (la versión LTS)"; `package.json` no declara `engines` | Se despliega sobre un runtime sin soporte de seguridad; incompatibilidades al reinstalar en un equipo con Node moderno | baja |
| R13 | Discrepancia comentario/código en el estado de la migración a MySQL | [config.js:19](../../config.js#L19) y [LEEME.txt](../../LEEME.txt) mencionan una migración a MySQL "pendiente"; el volcado `datos/migracion_mysql_2018.sql` está versionado pero sin uso (CLAUDE.md lo confirma como histórico) | Confusión operativa: un mantenedor puede creer que hay una ruta de migración viva que no existe, y tocar/borrar un artefacto inerte | baja |
| R14 | Comentario promete envío de factura pero el código solo hace `console.log` | [services/email.js:11-29](../../services/email.js#L11-L29): `enviarFactura` no envía nada; en el alta de factura [routes/facturas.js:93](../../routes/facturas.js#L93) se invoca como si enviara y luego se redirige | Falsa sensación de que la factura se ha enviado por correo cuando en realidad hay que mandarla a mano; posible factura no entregada al cliente | baja |

## Notas de método

- El orden refleja impacto × probabilidad estimados: R1–R2 (fuga de secretos y datos
  reales, probabilidad alta) encabezan; siguen los riesgos transaccionales y de
  concurrencia sobre la numeración/importes (R3–R6, impacto fiscal directo con
  probabilidad media); cierran validaciones, fechas y deuda de infraestructura (R7–R14).
- Varias entradas (R3, R4, R7, R8) coinciden con anomalías ya señaladas por comentarios
  del propio código; se registran aquí con su evidencia, **sin corregirlas**, según la
  fase actual del proyecto.
- Pendiente de confirmar con el negocio (SUPOSICIÓN, convertir en pregunta): si la
  divergencia de prorrateo de **R6** ya ha producido descuadres reales reconciliados por
  la gestoría, o si una de las dos fórmulas es la "oficial".

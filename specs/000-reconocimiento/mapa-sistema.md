# Mapa del sistema — GesFact 2.4

**Reconocimiento inicial del sistema heredado de Suministros Hidalgo, S.L.**
Fecha: 2026-07-07. Fase: documentar y proteger (ver `.specify/memory/constitution.md`).

Este documento describe **lo que el sistema hace hoy**, con evidencia (`fichero:líneas`).
No propone cambios. Los comportamientos frágiles se registran como anomalías, no se corrigen.

---

## 1. Módulos y ficheros relevantes

### Arranque y configuración

#### `server.js`
- **Responsabilidad de negocio:** enciende el programa y muestra el panel de inicio con los
  cuatro números que administración mira cada mañana (facturas totales, cuántas están
  pendientes de cobro, cuánto dinero se debe y cuántos clientes hay activos).
- **Depende de:** `express`, `body-parser`, `db.js`, `config.js`, y los cinco routers
  (`server.js:9-12`, `server.js:38-42`). Arranca el servidor **solo después** de que la
  base de datos esté lista (`server.js:44-55`).
- **Quién depende de él:** es el punto de entrada; no lo llama nadie más (`npm start` →
  `node server.js`, `package.json:7`).
- **Criticidad: ALTA.** Sin él no hay programa. Además el dashboard filtra el importe pendiente
  solo de serie `FA` (`server.js:24`), un dato de negocio que administración usa como cifra
  de cobros pendientes.

#### `config.js`
- **Responsabilidad de negocio:** guarda los datos de la empresa que salen impresos en cada
  factura, dónde está el fichero de datos, el IVA por defecto, la clave que exige la gestoría
  para el fichero de exportación y los días de pago por defecto.
- **Depende de:** nada (solo exporta un objeto).
- **Quién depende de él:** `server.js`, `db.js`, `services/email.js`, `routes/facturas.js`,
  `routes/articulos.js`, `routes/informes.js` (todos hacen `require('./config')` o
  `require('../config')`).
- **Criticidad: ALTA.** Los datos de empresa se imprimen en documentos fiscales
  (`config.js:8-17`) y la clave de exportación (`config.js:37`) debe coincidir con lo que espera
  la gestoría. Contiene además credenciales SMTP en claro (`config.js:29-34`) de un correo que
  ya no funciona. El comentario ordena **no renombrar** el fichero (`config.js:2-3`).

#### `db.js`
- **Responsabilidad de negocio:** abre el archivo de datos, crea las tablas la primera vez y,
  si no hay clientes, rellena el sistema con los datos de ejemplo que administración usa de
  referencia (clientes, artículos, contratos y el histórico de facturas de 2026).
- **Depende de:** `sqlite3`, `fs`, `path`, `config.js` (`db.js:6-9`).
- **Quién depende de él:** **todo el mundo que toca datos** — los cinco routers,
  `lib/numeracion.js`, `scripts/remesa_mensual.js` y `server.js`. Exporta la instancia `db`
  directamente además de `db.inicializar` (`db.js:183-184`).
- **Criticidad: ALTA.** Define el esquema completo y contiene la carga de datos iniciales, que
  incluye facturas históricas con importes cerrados (`db.js:126-171`) y los contadores de
  numeración de partida (`db.js:176-177`).

### Lógica de negocio (el corazón fiscal)

#### `services/calculo.js`
- **Responsabilidad de negocio:** calcula los importes de cada factura — base, IVA, recargo de
  equivalencia, descuento por volumen y total — y prorratea las cuotas de contrato cuando un
  alta o baja cae a mitad de mes.
- **Depende de:** `lib/util.js` para el redondeo (`calculo.js:9`).
- **Quién depende de él:** `routes/facturas.js` (alta de factura), `routes/contratos.js`
  (prorrateo al dar de baja) y `scripts/remesa_mensual.js` (remesa mensual).
- **Criticidad: ALTA (la más alta del sistema).** Aquí está el **redondeo línea a línea** que la
  gestoría reconcilia céntimo a céntimo (`calculo.js:1-7, 26-34`), el descuento por volumen con
  comparación estricta `>` (`calculo.js:39-43`), los porcentajes de recargo por tipo de IVA
  (`calculo.js:12-23`) y el prorrateo "a lo comercial" de 30 días fijos (`calculo.js:95-102`).
  Cualquier cambio aquí altera comportamiento observable que reconcilia la gestoría.

#### `lib/numeracion.js`
- **Responsabilidad de negocio:** asigna a cada factura su número correlativo por serie y año
  (`FA-2026-000123`), sin huecos, como exige la ley desde la inspección de 2020.
- **Depende de:** `db.js` (tabla `contadores`, `numeracion.js:12`).
- **Quién depende de él:** `routes/facturas.js` (alta y rectificativa) y
  `scripts/remesa_mensual.js`.
- **Criticidad: ALTA.** La correlatividad sin huecos es una obligación legal
  (`numeracion.js:3-6`). El propio código documenta que la reserva de número **no es atómica**
  (`numeracion.js:8-10`, ver Anomalías).

#### `lib/util.js`
- **Responsabilidad de negocio:** utilidades sueltas que usa medio sistema — redondear a dos
  decimales, dar la fecha de hoy, sumar días para el vencimiento, poner fechas e importes
  "bonitos" para pantalla e impresión, contar los días de un mes y validar el NIF.
- **Depende de:** nada.
- **Quién depende de él:** `calculo.js`, `numeracion.js` (indirecto vía formato no; directo no),
  `routes/facturas.js`, `routes/clientes.js`, `routes/contratos.js`, `routes/informes.js`,
  `scripts/remesa_mensual.js`. Es el módulo con más dependientes.
- **Criticidad: ALTA.** `redondear2` (`util.js:5-7`) es la pieza sobre la que se apoya todo el
  cálculo fiscal. `formatearImporte` (`util.js:51-58`) produce los importes que ve la gestoría.
  Contiene dos anomalías conocidas: `sumarDias` con desfase no reproducido (`util.js:17-26`) y
  `validarNIF` que solo comprueba longitud (`util.js:41-48`).

### Rutas (interfaz web)

#### `routes/facturas.js`
- **Responsabilidad de negocio:** todo lo que se hace con una factura desde el navegador:
  listarlas y filtrarlas por estado, crear una factura nueva línea a línea, ver/imprimir el
  detalle, marcarla como cobrada y rectificarla entera (abono).
- **Depende de:** `db.js`, `lib/util.js`, `services/calculo.js`, `lib/numeracion.js`,
  `services/email.js`, `config.js` (`facturas.js:5-12`).
- **Quién depende de él:** `server.js` lo monta en `/facturas` (`server.js:41`).
- **Criticidad: ALTA.** Es el router más grande y el que crea documentos fiscales. La
  rectificativa se genera **invirtiendo signos sin recalcular**, para que sea espejo exacto de la
  original (`facturas.js:124-164`). El alta graba las líneas una a una sin transacción
  (`facturas.js:81-99`, ver Zonas oscuras).

#### `routes/clientes.js`
- **Responsabilidad de negocio:** dar de alta clientes, listarlos y darlos de baja (baja lógica,
  no se borran).
- **Depende de:** `db.js`, `lib/util.js` (para validar NIF, `clientes.js:4-6, 18`).
- **Quién depende de él:** `server.js` en `/clientes` (`server.js:38`).
- **Criticidad: MEDIA.** Alimenta los datos maestros que aparecen en facturas (incluido
  `recargo_equivalencia` y `dias_pago`, que afectan al cálculo), pero no ejecuta aritmética
  fiscal. La baja es reversible en la práctica (solo pone `activo = 0`, `clientes.js:32-37`).

#### `routes/articulos.js`
- **Responsabilidad de negocio:** mantener el catálogo de artículos y servicios (referencia,
  precio sin IVA, tipo de IVA, unidad) que se ofrecen al montar una factura.
- **Depende de:** `db.js`, `config.js` (IVA por defecto, `articulos.js:5-6, 16`).
- **Quién depende de él:** `server.js` en `/articulos` (`server.js:39`).
- **Criticidad: MEDIA.** Es un maestro de apoyo: el precio y el IVA del artículo se copian a la
  línea de factura al elegirlo, pero el importe definitivo lo fija quien edita la factura, no el
  artículo.

#### `routes/contratos.js`
- **Responsabilidad de negocio:** gestionar las cuotas mensuales (alquileres de máquinas,
  mantenimientos): darlas de alta, listarlas y darlas de baja calculando el prorrateo del último
  mes.
- **Depende de:** `db.js`, `lib/util.js`, `services/calculo.js` (`contratos.js:5-7`).
- **Quién depende de él:** `server.js` en `/contratos` (`server.js:40`).
- **Criticidad: MEDIA.** No emite facturas por sí mismo (eso lo hace `remesa_mensual.js`), pero
  al dar de baja calcula un importe de prorrateo que administración factura luego a mano
  (`contratos.js:31-42`). **Aviso:** aquí el prorrateo usa `calculo.calcularProrrateo` (30 días
  fijos), distinto del cálculo del script de remesa (ver Zonas oscuras).

#### `routes/informes.js`
- **Responsabilidad de negocio:** producir el resumen de IVA por trimestre (base para el modelo
  303 que termina la gestoría) y exportar el CSV de facturas del año en el formato que la gestoría
  acordó.
- **Depende de:** `db.js`, `lib/util.js`, `config.js` (clave de exportación, `informes.js:5-7,
  40`).
- **Quién depende de él:** `server.js` en `/informes` (`server.js:42`).
- **Criticidad: ALTA.** Sus salidas van directas a la gestoría. El resumen de IVA suma **desde
  las líneas** para que las rectificativas resten solas (`informes.js:23-26`), y el CSV lleva la
  clave pactada en la primera línea, `;` como separador y decimales con coma
  (`informes.js:34-50`).

### Envío de correo

#### `services/email.js`
- **Responsabilidad de negocio:** *(históricamente)* enviar la factura por correo al cliente.
  **Hoy no envía nada:** solo escribe un aviso por consola de que la factura queda pendiente de
  enviar a mano (`email.js:26-28`).
- **Depende de:** `config.js` (SMTP, aunque ya no lo usa de verdad, `email.js:9`).
- **Quién depende de él:** `routes/facturas.js` lo llama al grabar una factura nueva
  (`facturas.js:93`).
- **Criticidad: BAJA.** Está **fuera de servicio desde 2022** (`email.js:3-6`), `nodemailer`
  desinstalado y el código real comentado (`email.js:8, 12-25`). No afecta al cálculo ni a la
  contabilidad; las facturas se envían a mano desde Outlook.

### Lote / procesos por lotes

#### `scripts/remesa_mensual.js`
- **Responsabilidad de negocio:** generar de golpe, cada día 1, las facturas de las cuotas de
  todos los contratos activos del mes que acaba de terminar, prorrateando altas y bajas que caen
  a mitad de mes.
- **Depende de:** `db.js`, `lib/util.js`, `services/calculo.js`, `lib/numeracion.js`
  (`remesa_mensual.js:9-12`).
- **Quién depende de él:** se lanza a mano (`node scripts/remesa_mensual.js YYYY-MM`,
  `remesa_mensual.js:3`); no lo importa nadie.
- **Criticidad: ALTA.** Emite facturas reales que consumen numeración correlativa. **Ojo:**
  prorratea sobre los **días reales del mes** (`remesa_mensual.js:47-51`), no sobre 30 fijos como
  `calculo.calcularProrrateo`. Son dos cálculos de prorrateo distintos conviviendo (ver Zonas
  oscuras).

### Vistas y estáticos

- **`views/*.ejs`** — pantallas del programa. `cabecera.ejs` y `pie.ejs` son parciales comunes;
  el resto se corresponde 1:1 con un `res.render` (verificado: `index`, `clientes`, `articulos`,
  `contratos`, `facturas`, `factura_nueva`, `factura_detalle`, `informes`, `informe_iva`).
  **Criticidad: MEDIA** — `factura_detalle.ejs` es la vista imprimible que se convierte a PDF y
  se manda al cliente, así que su contenido es documento fiscal.
- **`public/css/estilos.css`** — estilos. **Criticidad: BAJA.**
- **`public/js/factura.js`** — autorrellena precio e IVA al elegir un artículo del desplegable en
  el alta de factura (`factura.js:1-15`). **Criticidad: BAJA** (comodidad; el cálculo real es de
  servidor).

---

## 2. Diagrama de dependencias (texto)

```
                          ┌──────────────┐
                          │  server.js   │  (arranque + dashboard)
                          └──────┬───────┘
                 monta routers   │   inicializa
        ┌────────────┬───────────┼───────────┬─────────────┐
        ▼            ▼           ▼            ▼             ▼
  clientes.js   articulos.js  contratos.js  facturas.js  informes.js
        │            │           │            │             │
        │            │           │            │             │
        └─────┬──────┴─────┬─────┴──────┬─────┴──────┬──────┘
              ▼            ▼            ▼            ▼
           util.js    config.js    calculo.js   numeracion.js   email.js
              ▲            ▲            │            │              │
              │            │           ▼            ▼              ▼
              └────────────┴────────  util.js      db.js       config.js
                                       (redondeo)  (contadores)

  db.js  ──requiere──▶ config.js, sqlite3, fs, path
  (todos los routers, numeracion, calculo(vía util) y remesa usan db.js)

  scripts/remesa_mensual.js ──▶ db.js, util.js, calculo.js, numeracion.js
      (proceso por lotes, fuera del servidor web)

  Estáticos:  factura_nueva.ejs ──▶ public/js/factura.js
  Vistas EJS renderizadas por los routers (factura_detalle.ejs = doc. imprimible)
```

Resumen de acoplamiento:
- **`db.js`** y **`util.js`** son los nodos con más dependientes (casi todo el sistema).
- **`calculo.js`** es el nodo más crítico por *impacto*, aunque tenga pocos dependientes.
- **`config.js`** es transversal (empresa, BD, clave de gestoría).
- **`email.js`** es una hoja muerta funcionalmente (se invoca pero no hace nada).

---

## 3. Tecnologías y versiones reales

Deducidas de `package.json` y del código, **no del `LEEME.txt`** (que está desactualizado:
manda instalar Node 8 y presenta la migración a MySQL como pendiente, `LEEME.txt:5, 11-13, 20`).

| Tecnología | Versión declarada | Evidencia |
|---|---|---|
| Node.js | Runtime (sin versión fijada en `package.json`; `LEEME.txt:5` dice "node 8", desfasado) | `package.json`, estilo `var`/callbacks en todo el código |
| Express | `^4.22.2` | `package.json:14`, `require('express')` en `server.js:9` y routers |
| EJS | `^3.1.10` | `package.json:13`, `app.set('view engine', 'ejs')` `server.js:16` |
| body-parser | `^1.20.5` | `package.json:12`, `server.js:10, 17` |
| sqlite3 | `^5.1.7` | `package.json:15`, `db.js:8, 15` |

Detalles reales del stack:
- **Base de datos: SQLite** en fichero local `./datos/gesfact.db` (`config.js:20`, `db.js:15`).
  **No hay MySQL en producción**: `datos/migracion_mysql_2018.sql` es un volcado de prueba de 5
  líneas que "nunca se llegó a ejecutar" y tiene el esquema desfasado (cabecera del propio SQL).
- **Estilo de código: pre-ES6.** `var`, `function` clásicas, callbacks anidados con
  `if (err) return res.status(...)`, SQL en cadenas concatenadas. Sin promesas, async/await,
  TypeScript ni ORM.
- **Sin frameworks de test, sin linter, sin build.** El único script npm es `start`
  (`package.json:6-8`).
- **`nodemailer` NO es dependencia:** figura desinstalado y comentado (`email.js:8`,
  no aparece en `package.json`).
- **Envío de correo (SMTP Arsys):** configurado en `config.js:29-34` pero fuera de servicio
  desde 2022 (`config.js:27-28`, `email.js:3-6`).

---

## 4. Zonas oscuras

Todo lo que existe en el proyecto y **no encaja limpiamente** en el mapa funcional: código
muerto, ficheros huérfanos, funcionalidades a medias y comportamientos frágiles documentados.
Se **registran**, no se corrigen (constitución).

### Código muerto / desactivado
- **`services/email.js` — envío de correo fuera de servicio.** Toda la lógica real está comentada
  (`email.js:12-25`); `enviarFactura` solo hace `console.log` (`email.js:26-28`). `nodemailer`
  desinstalado (`email.js:8`). Se sigue invocando desde `facturas.js:93` pero no produce efecto.
- **Credenciales SMTP en `config.js`.** Host, usuario y **clave en claro** (`config.js:29-34`)
  de una cuenta cuyo servicio dejó de funcionar en 2022. Código muerto con dato sensible.
- **Tipos de IVA antiguos (18/16/8/7) en `calculo.js:18-21`.** Ramas de recargo conservadas "por
  si hay que reabrir ejercicios viejos del Access". No las alcanza ningún flujo actual (los
  artículos y líneas nuevos usan 21/10/4), pero se conservan a propósito.

### Ficheros huérfanos
- **`datos/migracion_mysql_2018.sql`.** Volcado de prueba de la migración a MySQL que **nunca se
  ejecutó**; esquema desfasado (le faltan recargo y rectificativas, según su propia cabecera). No
  lo referencia ningún código. Se guarda "por si acaso".
- **`LEEME.txt` desactualizado.** Última actualización 11/03/2019 (`LEEME.txt:20`). Presenta como
  pendientes cosas que ya se decidieron de otra forma (MySQL "sin prisa, sqlite va bien") e
  instrucciones de instalación con Node 8. **No usar como fuente de verdad.**

### Funcionalidades a medias
- **Módulo de albaranes.** Roberto lo empezó en 2021 y quedó a medias "en su ordenador"
  (`LEEME.txt:15-16`). **No existe en este repositorio** ningún fichero de albaranes: es una
  funcionalidad ausente, no incompleta en el código.
- **Migración a MySQL.** Declarada pendiente en `config.js:19` y `LEEME.txt:11-13`, pero de facto
  abandonada; el sistema corre sobre SQLite.

### Comportamientos frágiles / anomalías conocidas (registrar, no corregir)
- **Numeración no atómica** (`lib/numeracion.js:8-10, 14-36`). Se lee el último número y se graba
  `último+1` en dos pasos sin bloqueo; dos usuarios grabando a la vez pueden obtener el mismo
  número. Documentado por el propio autor ("no ha vuelto a pasar (creo)").
- **Dos cálculos de prorrateo distintos conviviendo.**
  `calculo.calcularProrrateo` usa **30 días fijos** (`calculo.js:95-102`) y lo usa la baja de
  contrato (`contratos.js:39`); en cambio `scripts/remesa_mensual.js:47-51` prorratea sobre los
  **días reales del mes**. Para el mismo periodo pueden dar importes distintos.
- **`sumarDias` con desfase de un día no reproducido** (`lib/util.js:17-26`). Cálculo de
  vencimiento por milisegundos; el autor sospecha del cambio de hora. Afecta a las fechas de
  vencimiento de todas las facturas.
- **`validarNIF` solo comprueba la longitud** (`lib/util.js:41-48`): acepta cualquier cadena de 9
  caracteres, sin verificar la letra de control. Los datos de ejemplo incluyen NIF con formato
  dudoso (p. ej. `70355910k` en minúscula, `db.js:101`).
- **Alta y rectificación de factura sin transacción** (`facturas.js:81-99, 147-159`). Las líneas
  se graban una a una; si falla una a mitad, la cabecera ya está grabada. El comentario admite
  que "se apañó a mano en la bd" en su día (`facturas.js:81-82`).
- **Descuento por volumen con umbral estricto** (`calculo.js:39-43`). Con `>` exacto, una base de
  1.000,00 € justos **no** lleva descuento (caso comentado con la gestoría y con factura de
  ejemplo que lo refleja, `db.js:138-139`). No es un bug, pero es un borde sensible que conviene
  no "arreglar".
- **Prorrateo: el día 31 no se cobra** (`calculo.js:99`). Efecto de tope a 30 días; los meses de
  31 días pierden un día de cuota por diseño ("a lo comercial").

---

*Elaborado en fase de reconocimiento. Toda afirmación se apoya en `fichero:líneas` del propio
repositorio. Lo que no se pudo evidenciar (p. ej. el módulo de albaranes, que no está en el
repo) se marca explícitamente como ausente.*

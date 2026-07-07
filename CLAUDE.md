# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Qué es esto

GesFact 2.4 es el programa de facturación **en producción** de Suministros Hidalgo, S.L.
(Illescas, Toledo). Es un sistema **heredado** escrito en Node.js (estilo pre-ES6:
`var`, callbacks anidados, sin promesas ni async/await) sobre Express + EJS + SQLite.
Factura dinero real y la gestoría reconcilia sus resultados **céntimo a céntimo**.

## Restricción que prevalece sobre todo: la constitución

Antes de tocar nada, lee `.specify/memory/constitution.md`. Es vinculante y la fase actual
del proyecto es **documentar y proteger, no mejorar**. En la práctica:

- **El comportamiento observable actual es la especificación**, aunque parezca un bug.
  Importes, redondeos, numeración, textos e informes NO se cambian sin decisión escrita del
  negocio. Un bug encontrado **se registra como anomalía, no se corrige**.
- **Cero dependencias nuevas y cero refactors**. No instalar paquetes, no renombrar/mover/
  "limpiar" código de producción. Las únicas dependencias son `express`, `ejs`, `body-parser`,
  `sqlite3`.
- **Tests de caracterización solo con el runner nativo `node:test`** (sin frameworks externos).
  Describen lo que el sistema **hace hoy**, no lo que debería hacer. Ningún test puede tocar el
  estado de producción ni servicios externos vivos.
- **Toda afirmación necesita evidencia**: cita `fichero:líneas`, un dato real de
  `datos/gesfact.db`, o testimonio del negocio con nombre y fecha. Lo no evidenciado se marca
  como **SUPOSICIÓN** y se convierte en pregunta al negocio.
- **Todo en español de España** (código, comentarios, tests, commits, comunicación).

## Comandos

```bash
npm install                              # instalar (requiere compilar sqlite3 nativo)
node server.js                           # arrancar en http://localhost:3000
npm start                                # equivalente a lo anterior
node scripts/remesa_mensual.js 2026-06   # generar facturas de cuotas de contrato del mes YYYY-MM
```

No hay linter ni suite de tests configurada todavía. Los tests de caracterización que se
escriban usan `node:test` y se ejecutan con `node --test`.

La base de datos `datos/gesfact.db` se **autocrea y autopobla** con datos de ejemplo la primera
vez que se arranca si la tabla `clientes` está vacía (ver `db.js:cargarDatosIniciales`). No
existe migración a MySQL: `datos/migracion_mysql_2018.sql` es un volcado histórico sin uso.

## Arquitectura

Servidor Express monolítico. `server.js` monta el dashboard (`/`) y cinco routers. Cada router
habla directamente con SQLite y renderiza plantillas EJS; la lógica de negocio vive en
`services/` y `lib/`.

- `server.js` — arranque, dashboard, montaje de routers. Llama a `db.inicializar(cb)` **antes**
  de `app.listen`.
- `config.js` — datos de empresa, ruta de BD, IVA por defecto, credenciales SMTP (correo roto
  desde 2022) y clave de exportación de gestoría. Se copia a mano al servidor de oficina;
  **no renombrar**.
- `db.js` — abre SQLite, crea el esquema (`CREATE TABLE IF NOT EXISTS`) y carga datos iniciales.
  Exporta la instancia `db` directamente + `db.inicializar`.
- `routes/` — `clientes`, `articulos`, `contratos`, `facturas`, `informes`. `facturas.js` es el
  más grande (listado, alta, detalle imprimible, cobro, rectificación).
- `services/calculo.js` — **el corazón fiscal**. Toda la aritmética de facturas.
- `lib/numeracion.js` — numeración correlativa por serie y año.
- `lib/util.js` — redondeo, fechas, formato de importes, validación de NIF.
- `services/email.js` — envío de facturas **fuera de servicio** (código comentado, `nodemailer`
  desinstalado). `enviarFactura` solo hace `console.log`. Las facturas se envían a mano.
- `scripts/remesa_mensual.js` — script CLI de lote mensual de cuotas de contrato.
- `views/` (EJS) y `public/` (CSS + un JS de autorrelleno de líneas de factura).

### Modelo de datos (SQLite)

`clientes`, `articulos`, `contratos`, `facturas`, `lineas`, `contadores`. Claves y matices que
importan:

- `clientes.recargo_equivalencia` (0/1): activa el recargo de equivalencia en el cálculo.
- `clientes.dias_pago` NULL → usa `config.VENCIMIENTO_DIAS` (30).
- `articulos.tipo_iva` / `lineas.tipo_iva`: 21 / 10 / 4 (y tipos antiguos 18/16/8/7 conservados).
- `facturas.estado`: `emitida` → `cobrada` → `rectificada`. `serie`: `FA` (normal), `RE`
  (rectificativa, importes en negativo). `contadores` guarda el último número por `(serie, año)`.
- `lineas`: cada línea guarda su `base`, `cuota_iva` y `cuota_recargo` **ya redondeadas**.

## Reglas de negocio delicadas (no alterar sin decisión escrita)

Estas son las salidas "sagradas" que la gestoría reconcilia. Cualquier cambio aquí altera
comportamiento observable:

- **Redondeo línea a línea** (`services/calculo.js`, aviso en cabecera). Cada línea redondea a 2
  decimales por separado; los totales suman las líneas ya redondeadas. NO redondear sobre la base
  total: cambiarlo en 2019 hizo que la gestoría devolviera todo el trimestre.
- **Descuento por volumen** aplicado **línea a línea sobre el precio** (no sobre el total), para
  que quede desglosado: >1.000 € → 2%, >5.000 € → 5% (comparación estricta `>`, 1.000 justo no
  descuenta).
- **Recargo de equivalencia** por tipo de IVA: 21→5,2%, 10→1,4%, 4→0,5% (más tipos antiguos).
- **Prorrateo "a lo comercial"**: mes de 30 días fijos, `cuota/30 * días`, con matiz de que el
  día 31 no se cobra. Ojo: `calculo.calcularProrrateo` usa 30 fijo, pero
  `scripts/remesa_mensual.js` prorratea sobre `diasDelMes` reales — **son dos cálculos distintos**.
- **Numeración correlativa sin huecos** (obligación legal desde inspección de 2020). Las facturas
  **no se borran nunca**: un error se corrige con una rectificativa en serie `RE` que es espejo
  exacto (signos invertidos, sin recalcular) y se emite una nueva.

### Anomalías conocidas (registrar, no corregir)

Comentarios en el propio código señalan comportamientos frágiles ya conocidos, p. ej.: la reserva
de número no es atómica (posibles números duplicados si dos usuarios graban a la vez,
`lib/numeracion.js`), la validación de NIF solo comprueba longitud (`lib/util.js:validarNIF`), y
`sumarDias` tuvo un desfase de un día no reproducido. Si encuentras más, van al registro de
anomalías con evidencia; **no se arreglan en esta fase**.

## Estilo de código

Imita el código existente: `var`, `function` clásicas, callbacks anidados con `if (err) return
res.status(...)`, SQL en cadenas concatenadas, comentarios en español (a menudo firmados con
nombre y fecha). No introduzcas ES6+, promesas, TypeScript ni utilidades nuevas.

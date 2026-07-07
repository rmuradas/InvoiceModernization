# Registro de contradicciones (duplicidad de conceptos de negocio) — GesFact 2.4

**Fase:** reconocimiento (documentar y proteger, no corregir).
**Fecha:** 2026-07-07.
**Alcance:** conceptos de negocio (un cálculo, validación, formato o transformación)
**implementados más de una vez** en el código, con evidencia. No se decide cuál implementación
es la correcta ni se corrige nada: cada contradicción termina como entrada del registro de
anomalías y como pregunta del guion de entrevista al negocio (constitución del proyecto).

> **Cómo se buscó:** siguiendo las pistas del encargo — los puntos que
> [flujo-factura.md §7](./flujo-factura.md) marca como "dos caminos hacen lo mismo con código
> distinto"; funciones de nombre parecido en módulos distintos; lógica *inline* en scripts/jobs
> que reimplementa lo que ya existe en la aplicación; y validaciones repetidas con criterios
> diferentes. Búsquedas de `parseFloat`/`replace`/`redondear`/`prorrat`/`dias`/`iva` sobre todo
> el árbol (excluyendo `node_modules/`).

## Índice

| # | Contradicción | Concepto duplicado | ¿Divergen HOY con datos reales? | Gravedad | Riesgo relacionado |
|---|---------------|--------------------|--------------------------------|----------|--------------------|
| [01](./contradiccion-01-prorrateo.md) | **Prorrateo de cuota de contrato** | Importe prorrateado de un mes | **Sí** (febrero y meses de 31 días, en prorrateo parcial) | **Alta** | R6 |
| [02](./contradiccion-02-vencimiento-por-defecto.md) | Días de vencimiento por defecto | `dias_pago || DEFECTO` | No (hoy 30=30); divergen si se cambia `config` | Media (latente) | — |
| [03](./contradiccion-03-grabado-factura-y-lineas.md) | Grabar factura + líneas | Persistencia cabecera+líneas | Sí en orden de líneas y ante error de `INSERT` | Media | R4, R5 |
| [04](./contradiccion-04-totalizacion-y-redondeo.md) | Totalizar sumando importes | Regla de redondeo al sumar | No con datos actuales; convención distinta (riesgo de 1 céntimo) | Media (convención) | (relacionada con la regla sagrada de `calculo.js`) |
| [05](./contradiccion-05-formato-y-rangos-de-fecha.md) | Formato y rangos de fecha | Nombre de mes, primer/último día del periodo | No (bug del `-31` tapado por comparación textual de SQLite) | Baja | R7 (familia de fechas) |
| [06](./contradiccion-06-normalizacion-numerica-y-iva-defecto.md) | Normalización de importes con coma + IVA por defecto | `parseFloat(replace(',','.'))` ×3; IVA defecto (config vs. literal) | No con los usos actuales; agujero común (punto de miles) y defecto divergible | Baja (latente) | R9 (parseo sin validar) |

## Patrón transversal (lo que casi todas comparten)

Cinco de las seis contradicciones responden al **mismo patrón histórico**: cuando se añadió
funcionalidad nueva —sobre todo la **remesa mensual de Roberto (becario, verano 2021)** y los
**informes (v2.3, 2019)**— se **reimplementó *inline*** lógica que **ya existía** en los
módulos compartidos (`services/calculo.js`, `lib/util.js`, `config.js`), en vez de reutilizarla:

- El prorrateo ya estaba en `calculo.calcularProrrateo`; la remesa lo reescribió → **01**.
- El vencimiento por defecto ya estaba en `config.VENCIMIENTO_DIAS`; la remesa lo hardcodeó → **02**.
- El grabado de factura ya existía en `routes/facturas.js`; la remesa lo reescribió en secuencial → **03**.
- La regla de redondeo estaba blindada en `calculo.js`; el informe de IVA totaliza sin ella → **04**.
- El formateo de fechas está en `lib/util.js`; `nombreMes` y los rangos viven fuera → **05**.
- La conversión de coma decimal se copió literal en tres rutas; no se extrajo a `util` → **06**.

El síntoma común es que estas duplicidades **hoy casi nunca divergen** —porque los valores por
defecto coinciden (30=30, 21=21), porque el caso que las separa es infrecuente (prorrateo
parcial en un mes que no tiene 30 días), o porque un detalle del motor las tapa (SQLite compara
fechas como texto)—. Por eso han convivido sin dar la cara. La única con **divergencia real y
observable con datos de producción** es la **01 (prorrateo)**.

## Reglas de este registro (constitución)

- No se marca ninguna implementación como "la correcta": es decisión **escrita del negocio**.
- No se corrige nada en esta fase. Cada ficha aporta evidencia (`fichero:líneas`), ejemplos con
  datos reales de `datos/gesfact.db` cuando aplica, y termina con la(s) pregunta(s) para la
  entrevista.
- Lo no verificado con el negocio se marca como **SUPOSICIÓN** dentro de cada ficha.

# Golden master del cálculo fiscal — LEEME

## Qué es esto

`factura-master.json` es la **fotografía congelada** de lo que hoy produce el corazón
fiscal del sistema (`services/calculo.js:calcularFactura`) para un juego **fijo** de 12
casos de factura (`casos.js`). Es una red de seguridad: si algún día el cálculo de
importes cambia —un redondeo, un umbral de descuento, un porcentaje de recargo—, el test
`test/golden.test.js` lo detecta señalando **el caso y el campo exactos** que han variado.

Los 12 casos, entre todos, ejercitan las reglas y anomalías principales del
[reconocimiento](../../specs/000-reconocimiento/):

| Caso | Qué ejercita |
|---|---|
| `01-sin-recargo-basica` | Redondeo línea a línea, IVA 21/10 mezclado (RN-01/02/03) |
| `02-con-recargo` | Recargo de equivalencia al 21% (RN-06/07). **Diverge de db.js** (A-22) |
| `03-base-1000-justa` | Umbral de descuento estricto: 1.000 justo NO descuenta (RN-04). **A-22** |
| `04-iva-reducido-4` | IVA 4% con recargo 0,5% (RN-06) |
| `05-descuento-2pct` | Descuento 2% línea a línea sobre el precio, IVA mezclado (RN-04/05) |
| `06-descuento-5pct` | Tramo superior de descuento: base > 5.000 → 5% (RN-04) |
| `07-recargo-multitipo` | Los tres tipos de recargo vigentes a la vez (RN-06) |
| `08-iva-antiguo-16` | Tipo de IVA antiguo 16% conservado (RN-08, código latente) |
| `09-iva-desconocido` | IVA 5% fuera de tabla → recargo 0 en silencio (RN-09, A-16) |
| `10-redondeo-fino` | Cantidades fraccionarias en bordes de coma flotante (RN-01, A-21) |
| `11-una-linea-cero` | Línea con cantidad 0 (borde: cero) |
| `12-vacia` | Factura sin líneas (borde: vacío) |

> **Importante — el master congela el MOTOR, no db.js.** Varias facturas de ejemplo de
> `datos/gesfact.db` se grabaron con importes ajustados a mano que el motor de hoy **no
> reproduce** (diferencias de 1 céntimo por redondeo, anomalía **A-22**). El master
> refleja lo que `calcularFactura` **produce hoy**, que es lo que esta red debe proteger.

## Cuándo DEBE regenerarse

**Casi nunca.** El master solo se regenera cuando el cambio en el cálculo está
**autorizado por escrito por el negocio** (constitución: "los importes no se cambian sin
decisión escrita del negocio"). Ejemplos que lo justificarían:

- El negocio decide unificar el prorrateo (acta D-01) y eso toca `calcularFactura`.
- El negocio decide corregir el redondeo o un umbral de descuento.

Si el test del golden falla y **no** hay decisión de negocio detrás, **es una regresión**:
se arregla el código (o se revierte el cambio), **no** el master.

Nunca se regenera el master "para que el test pase". Eso borraría la evidencia de un
cambio de comportamiento en dinero real que la gestoría reconcilia.

## Cómo se regenera (solo con decisión documentada)

```bash
node test/golden/generar.js
```

Esto reescribe `factura-master.json` con la salida actual del código, claves ordenadas y
formato estable. Después:

1. Revisa el `git diff` del master **línea a línea**: cada cambio debe corresponder a la
   decisión de negocio que lo autoriza.
2. Enlaza en el commit el acta o decisión escrita que lo respalda.
3. Ejecuta `npm test` y confirma verde.

## Cómo se ejecuta

```bash
npm test            # toda la red de caracterización, incluido el golden
node --test test/   # equivalente
```

`casos.js` (entradas) y `generar.js` (motor de generación/comparación) **no** deben
editarse para "arreglar" un fallo: editarlos cambia la fotografía. Se tocan solo para
**añadir** cobertura nueva (más casos), regenerando el master a continuación de forma
consciente.

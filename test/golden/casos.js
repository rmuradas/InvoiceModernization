// test/golden/casos.js
// Juego FIJO de casos de entrada del GOLDEN MASTER del flujo central de negocio
// (el calculo fiscal de una factura: services/calculo.js:calcularFactura).
// Ver flujo-factura.md §4. Entre todos ejercitan las reglas y anomalias
// principales. NO editar los casos salvo decision de negocio documentada:
// cambiarlos cambia el master (ver LEEME.md).
//
// Cada caso: { id, descripcion, cliente, lineas }.

module.exports = [
  {
    id: '01-sin-recargo-basica',
    descripcion: 'FA-2026-000101: cliente sin recargo, mezcla de IVA 21/10, sin descuento (RN-02/03)',
    cliente: { recargo_equivalencia: 0 },
    lineas: [
      { descripcion: 'Alquiler máquina café (enero)', cantidad: 1, precio: 90.00, tipoIva: 21 },
      { descripcion: 'Café en grano 1kg', cantidad: 2, precio: 11.95, tipoIva: 10 },
      { descripcion: 'Azúcar 10kg', cantidad: 1, precio: 9.80, tipoIva: 10 },
      { descripcion: 'Vaso caña (caja)', cantidad: 0.44, precio: 21.60, tipoIva: 21 }
    ]
  },
  {
    id: '02-con-recargo',
    descripcion: 'FA-2026-000102: cliente CON recargo de equivalencia al 21% (RN-06/07)',
    cliente: { recargo_equivalencia: 1 },
    lineas: [
      { descripcion: 'Desengrasante 10L', cantidad: 4, precio: 18.50, tipoIva: 21 },
      { descripcion: 'Plato llano', cantidad: 1, precio: 28.90, tipoIva: 21 },
      { descripcion: 'Vaso caña', cantidad: 0.5, precio: 21.60, tipoIva: 21 },
      { descripcion: 'Portes', cantidad: 0.32, precio: 6.00, tipoIva: 21 }
    ]
  },
  {
    id: '03-fa103-no-reproducible',
    descripcion: 'FA-2026-000103 (db.js:140-143): sus lineas suman 1.000,02 bruto, NO 1.000; el motor descuenta 2% (A-22)',
    cliente: { recargo_equivalencia: 0 },
    lineas: [
      { descripcion: 'Plato llano', cantidad: 20, precio: 28.90, tipoIva: 21 },
      { descripcion: 'Vaso caña', cantidad: 15, precio: 21.60, tipoIva: 21 },
      { descripcion: 'Desengrasante', cantidad: 5, precio: 18.50, tipoIva: 21 },
      { descripcion: 'Portes', cantidad: 0.92, precio: 6.00, tipoIva: 21 }
    ]
  },
  {
    id: '03b-base-1000-exacta',
    descripcion: 'Base bruta EXACTAMENTE 1.000,00 € (500+300+200) -> NO descuenta (RN-04 borde estricto)',
    cliente: { recargo_equivalencia: 0 },
    lineas: [
      { descripcion: 'Bloque A', cantidad: 1, precio: 500.00, tipoIva: 21 },
      { descripcion: 'Bloque B', cantidad: 1, precio: 300.00, tipoIva: 21 },
      { descripcion: 'Bloque C', cantidad: 1, precio: 200.00, tipoIva: 21 }
    ]
  },
  {
    id: '04-iva-reducido-4',
    descripcion: 'FA-2026-000104: IVA reducido al 4% con recargo 0,5% (RN-06)',
    cliente: { recargo_equivalencia: 1 },
    lineas: [
      { descripcion: 'Harina panificable 25kg', cantidad: 8, precio: 14.20, tipoIva: 4 },
      { descripcion: 'Aceite oliva 5L', cantidad: 1.41, precio: 27.45, tipoIva: 4 }
    ]
  },
  {
    id: '05-descuento-2pct',
    descripcion: 'FA-2026-000105: base > 1.000 -> descuento 2% linea a linea, IVA mezclado (RN-04/05)',
    cliente: { recargo_equivalencia: 0 },
    lineas: [
      { descripcion: 'Mantenimiento cámaras', cantidad: 1, precio: 145.00, tipoIva: 21 },
      { descripcion: 'Aceite oliva 5L', cantidad: 24, precio: 27.45, tipoIva: 4 },
      { descripcion: 'Café en grano 1kg', cantidad: 30, precio: 11.95, tipoIva: 10 },
      { descripcion: 'Plato llano', cantidad: 40, precio: 28.90, tipoIva: 21 },
      { descripcion: 'Portes', cantidad: 2.87, precio: 6.00, tipoIva: 21 }
    ]
  },
  {
    id: '06-descuento-5pct',
    descripcion: 'Base > 5.000 -> descuento 5% (RN-04, tramo superior)',
    cliente: { recargo_equivalencia: 0 },
    lineas: [
      { descripcion: 'Lote grande A', cantidad: 100, precio: 45.00, tipoIva: 21 },
      { descripcion: 'Lote grande B', cantidad: 50, precio: 30.00, tipoIva: 10 }
    ]
  },
  {
    id: '07-recargo-multitipo',
    descripcion: 'Recargo con los tres tipos vigentes a la vez: 21/10/4 (RN-06 tabla completa)',
    cliente: { recargo_equivalencia: 1 },
    lineas: [
      { descripcion: 'General 21%', cantidad: 3, precio: 33.33, tipoIva: 21 },
      { descripcion: 'Reducido 10%', cantidad: 7, precio: 12.10, tipoIva: 10 },
      { descripcion: 'Superreducido 4%', cantidad: 2, precio: 8.75, tipoIva: 4 }
    ]
  },
  {
    id: '08-iva-antiguo-16',
    descripcion: 'Tipo de IVA antiguo 16% con recargo 4% conservado (RN-08, codigo latente)',
    cliente: { recargo_equivalencia: 1 },
    lineas: [
      { descripcion: 'Ejercicio viejo al 16%', cantidad: 1, precio: 100.00, tipoIva: 16 }
    ]
  },
  {
    id: '09-iva-desconocido',
    descripcion: 'Tipo de IVA 5% fuera de tabla -> IVA se aplica, recargo 0 en silencio (RN-09, A-16)',
    cliente: { recargo_equivalencia: 1 },
    lineas: [
      { descripcion: 'Tipo raro 5%', cantidad: 1, precio: 100.00, tipoIva: 5 }
    ]
  },
  {
    id: '10-redondeo-fino',
    descripcion: 'Cantidades fraccionarias que fuerzan bordes de redondeo linea a linea (RN-01/02, A-21)',
    cliente: { recargo_equivalencia: 1 },
    lineas: [
      { descripcion: 'Fraccion 1', cantidad: 0.333, precio: 3.015, tipoIva: 21 },
      { descripcion: 'Fraccion 2', cantidad: 7, precio: 0.165, tipoIva: 10 },
      { descripcion: 'Fraccion 3', cantidad: 1.005, precio: 100.00, tipoIva: 4 }
    ]
  },
  {
    id: '11-una-linea-cero',
    descripcion: 'Linea con cantidad 0 mezclada con linea normal (borde: cero)',
    cliente: { recargo_equivalencia: 0 },
    lineas: [
      { descripcion: 'Regalo (0 uds)', cantidad: 0, precio: 50.00, tipoIva: 21 },
      { descripcion: 'Normal', cantidad: 2, precio: 25.00, tipoIva: 21 }
    ]
  },
  {
    id: '12-vacia',
    descripcion: 'Factura sin lineas (borde: vacio)',
    cliente: { recargo_equivalencia: 1 },
    lineas: []
  }
];

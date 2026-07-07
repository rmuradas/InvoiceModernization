# Checklist de calidad de especificación: Descuento comercial por volumen

**Propósito**: validar la completitud y calidad de la especificación antes de pasar a planificación
**Creado**: 2026-07-07
**Feature**: [spec.md](../spec.md)

## Calidad del contenido

- [x] Sin detalles de implementación que no sean evidencia (la spec es de ingeniería inversa: las citas `fichero:líneas` son evidencia obligatoria por Principio II, no fuga de implementación)
- [x] Centrada en el valor de negocio (descuento comercial reconciliado por la gestoría)
- [x] Redactada para interlocutores de negocio (gestoría, administración)
- [x] Todas las secciones obligatorias completadas

## Completitud de requisitos

- [x] No quedan marcadores [NEEDS CLARIFICATION]
- [x] Los requisitos son verificables e inequívocos (cada RN cita evidencia y test)
- [x] Los criterios de éxito son medibles (contra `test/` y golden master)
- [x] Los criterios de éxito son verificables sin conocer la implementación interna
- [x] Todos los escenarios de aceptación están definidos
- [x] Los casos límite están identificados (borde 1.000/5.000, base ≤ 0, A-22)
- [x] El alcance está claramente acotado (fuera: Spec 001 redondeo, Spec 003 recargo)
- [x] Dependencias y suposiciones identificadas

## Preparación de la característica

- [x] Todos los requisitos funcionales tienen criterios de aceptación claros
- [x] Los escenarios de usuario cubren los flujos primarios (sin dto, 2 %, 5 %, borde estricto)
- [x] La característica cumple los resultados medibles definidos en Success Criteria
- [x] No hay fuga de detalles de implementación fuera de la evidencia trazable

## Notas

- Spec de ingeniería inversa bajo constitución v1.0.0: el comportamiento actual ES la especificación.
- No introduce anomalías propias; el borde estricto `>` es regla protegida INTENCIONAL (acta Paco/Puri 2018).
- Dos notas de dato remiten a registros existentes (A-22 en Spec 001; discrepancia de cabecera de FA-2026-000105), sin abrir corrección.
- Todos los valores numéricos citados están verificados contra `test/calculo.descuento.test.js`, `test/calculo.factura.test.js` y `test/golden/factura-master.json`.

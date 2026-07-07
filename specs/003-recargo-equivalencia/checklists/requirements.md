# Specification Quality Checklist: Recargo de equivalencia

**Purpose**: Validar la completitud y calidad de la especificación antes de planificar
**Created**: 2026-07-07
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

> Nota: por ser una spec de **ingeniería inversa**, las citas de evidencia (`fichero:líneas`)
> son un requisito de la constitución (Principio II), no fugas de implementación. El QUÉ y el
> PORQUÉ (contrato fiscal reconciliable por la gestoría) dominan; el código se cita como prueba
> del comportamiento congelado, no como diseño propuesto.

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

## Notes

- Los cuatro requisitos (RN-06…RN-09) están anclados a evidencia de código y a tests de
  caracterización existentes (`test/anomalias.test.js`, `test/calculo.factura.test.js`, golden
  master FA-102).
- A-16 se especifica **tal cual funciona hoy** (recargo 0 sin aviso; `'21'` rechazado por `===`)
  y se referencia por su ID; la decisión de negocio (BUG A SECAS, CERRADA) queda citada por acta
  D-04 (Puri/Paco, 2026-07-07). La corrección corresponde a la modernización, no a esta fase.
- Fronteras con otras specs explícitas: IVA por defecto → Spec 007 (A-09); redondeo de la cuota →
  Spec 001.

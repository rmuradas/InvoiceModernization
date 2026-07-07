# Specification Quality Checklist: Aritmética fiscal de la factura (ingeniería inversa)

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-07-07
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

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

- **Naturaleza especial (ingeniería inversa).** Esta spec documenta comportamiento **existente**, no
  una feature nueva. Por diseño y por mandato de la constitución del proyecto, cita evidencia de
  código (`fichero:función`) y de datos (`datos/gesfact.db`). Esas referencias **no** son "fugas de
  implementación" en el sentido prohibido: son la **evidencia obligatoria** que convierte la spec en
  contrato de comportamiento. Los requisitos y criterios de éxito se mantienen redactados desde el
  valor de negocio (reconciliación céntimo a céntimo de la gestoría) y son verificables sin conocer
  la implementación interna.
- Los criterios de aceptación son verificables contra `test/util.redondeo.test.js`,
  `test/calculo.linea.test.js`, `test/calculo.factura.test.js`, `test/util.formato.test.js`,
  `test/anomalias.test.js` y `test/golden.test.js` (caso `03-fa103-no-reproducible`).
- Las anomalías A-21 y A-22 se especifican **tal cual** (comportamiento actual) y se referencian por
  su ID del [registro de anomalías](../../000-reconocimiento/registro-de-anomalias.md); no se
  corrigen en esta fase.
- Frontera explícita: descuento por volumen → Spec 002; recargo de equivalencia → Spec 003; total
  del informe de IVA (A-06) → Spec 008.

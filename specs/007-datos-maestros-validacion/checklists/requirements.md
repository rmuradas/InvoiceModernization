# Specification Quality Checklist: Datos maestros — validación de NIF, IVA por defecto y normalización de importes

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

- **Naturaleza especial**: esta es una spec de *ingeniería inversa* (contrato del comportamiento
  actual), no una feature nueva. Rige la constitución del proyecto (Principios I–III): el
  comportamiento se congela con evidencia, no se corrige.
- **Referencias a código como evidencia**: la spec cita `fichero:líneas` (p. ej. `util.js:44-48`,
  `articulos.js:16`, `facturas.js:59-62`). Esto es evidencia obligatoria (constitución, Principio
  II), no filtración de detalle de implementación; es intrínseco al carácter de contrato.
- **Decisiones SIMULADAS**: D-06, D-08, D-11 marcadas como *a ratificar* por el negocio; ninguna se
  ejecuta en esta fase. D-19 es técnica.
- **Test nuevo requerido**: SC-004 exige congelar A-08 (`"1.234,56" → 1.234`) con un test dedicado,
  hoy inexistente porque la normalización vive inline en las rutas, no en `lib/util`.
- Items marked incomplete require spec updates before `/speckit-clarify` or `/speckit-plan`.

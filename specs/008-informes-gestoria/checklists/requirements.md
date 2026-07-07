# Specification Quality Checklist: Informes a la gestoría — resumen de IVA trimestral y export CSV

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-07-07
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

> Nota: por tratarse de una **spec de ingeniería inversa** (constitución, Principio I), la
> especificación **cita evidencia de código** (`fichero:líneas`) como prueba del comportamiento
> actual. Esto es un requisito de la constitución (Principio II: evidencia obligatoria), no una fuga
> de detalle de implementación: las citas documentan *qué hace hoy el sistema*, no *cómo debería
> construirse una feature nueva*.

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

- Items marked incomplete require spec updates before `/speckit-clarify` or `/speckit-plan`
- **Decisiones SIMULADAS pendientes de ratificar**: D-07 (alinear total del informe con el redondeo
  de la Spec 001) y D-10 (usar el último día real del mes antes de migrar). Ninguna autoriza cambios
  en esta fase; su ratificación por el negocio (Puri) es requisito previo para pasar de "documentar"
  a su tratamiento definitivo.
- **Hueco de tests confirmado**: no existe `test/informes.*` hoy. Los criterios SC-001..SC-005
  exigen **tests de caracterización nuevos** (`node:test`) sobre BD aislada.

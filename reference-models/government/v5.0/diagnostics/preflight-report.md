# Preflight Report Template

## Package

- Model family: government
- Source version: 5.0
- Package version: 0.1.0

## Checks

- [ ] ConceptType names unique (case-insensitive)
- [ ] ConceptType PartOf graph valid (no invalid cycles)
- [ ] ConceptType ReferenceTo semantics valid
- [ ] Concept root names unique where no-ID imports rely on rootConceptName
- [ ] No ambiguous `name + conceptTypeName + rootConceptName` matches
- [ ] All `partOfName` targets resolve in scope
- [ ] All `referenceToName` targets resolve in scope
- [ ] All `partOrder` values are integers >= 1 when present

## Risk log

- Potential many-to-many loss points:
- Potential naming collision points:
- Potential semantic drift points:

## Outcome

- Status: pending
- Recommended action:

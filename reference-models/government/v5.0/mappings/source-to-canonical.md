# Source to Canonical Mapping (Government v5.0)

## Source artifacts

- Government Reference Model v5.0.xlsx
- Government Reference Model v5.0.pdf
- Working extraction: grm_v5.txt

## Core mapping decisions

### Capability Map

- Source capability entries map to ConceptType: `Capability`.
- Level/tier values are currently preserved in description text where needed.
- Parent-child hierarchy maps through `partOfName`.

### Value Stream Inventory

- Value stream names map to ConceptType: `Value Stream`.
- Stage names map to ConceptType: `Value Stream Stage`.
- Stage-to-stream containment uses `partOfName` with `rootConceptName` set to the stream.

### Information Map

- Information concept names map to ConceptType: `Information Concept`.
- Category/type/state are represented by child concepts:
  - `Information Concept Type`
  - `Information Concept State`
- Related information concepts are represented via bridge concepts:
  - ConceptType `Information Concept Link`
  - `referenceToName` points to related concept.

### Stakeholder Map

- Stakeholder entries map to ConceptType: `Stakeholder`.

## Generalization notes for BAG model families

- Preserve source naming by default.
- Introduce canonical renaming only when collision or clarity issues are documented.
- Keep mapping rules declarative and versioned with package artifacts.

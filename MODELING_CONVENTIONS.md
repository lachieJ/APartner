# Modeling Conventions

## Purpose

This guide defines how to model consistently in the Analysis Partner metamodel, especially the boundary between **ConceptType** and **Concept** so imports do not drift into instance data.

## Scope

Applies to:

- Concept type design
- CSV preparation for ConceptType import
- Review and approval of proposed model structures

## Core Layers

### 1) ConceptType (type layer)

A reusable class/category label that should remain stable across agencies, teams, and reporting periods.

Examples:

- `Outcome`
- `Program`
- `Service`
- `Capability Domain`

### 2) Concept (instance layer)

A specific member of a ConceptType in a specific business context.

Examples:

- Outcome 1: Improve veteran wellbeing
- Program 1.1: Community grants
- Digital Services Program (FY2026–27)

### 3) Attribute (property layer)

A property of a Concept (or occasionally a ConceptType) used for qualifiers, identifiers, or measures.

Examples:

- `pbs_code = 1.1`
- `fiscal_year = 2026-27`
- `owner = Service Delivery Group`

## Decision Rules

Use these rules before creating a new ConceptType.

1. **Reusability test**  
   If the label should work across many organizations and years, it is likely a ConceptType.
2. **Enumeration test**  
   If the label includes numbering/versioning (for example `1`, `1.1`, `2026-27`), it is usually Concept or Attribute, not ConceptType.
3. **Specificity test**  
   If the label points to one concrete thing in one context, it is Concept, not ConceptType.
4. **Durability test**  
   If the term is expected to remain valid despite policy-cycle changes, it is more likely ConceptType.

## Naming Conventions for ConceptType

- Use singular nouns (for example `Program`, not `Programs`).
- Use stable business-language categories.
- Avoid local abbreviations unless they are standard and widely understood.
- Avoid embedding numbers, dates, or environment-specific qualifiers in names.

## Relationship Conventions

### `partOfName`

Use `partOfName` to express structural containment/decomposition between ConceptTypes.

- Allowed: self decomposition (`PartOf = self`) where semantically valid.
- Not allowed: multi-node cycles.

### `referenceToName`

Use `referenceToName` to express non-hierarchical dependency/reference between ConceptTypes.

- Must not self-reference.
- Must not create reference cycles.

### `partOrder`

Use for sibling display/order under a shared parent ConceptType.

- Integer only
- `>= 1`
- Only valid when `partOfName` is set

## Anti-Drift Rules (Type vs Instance)

Treat the following as **drift indicators** in ConceptType CSVs:

- Labels containing numbering patterns: `Outcome 1`, `Program 1.1`
- Labels containing period/version markers: `2026-27`, `v2`
- Labels containing organization-specific names when a generic type exists

Preferred correction pattern:

- Replace `Outcome 1`, `Outcome 2` with `Outcome`
- Replace `Program 1.1`, `Program 1.2` with `Program`
- Move identifiers (for example `1.1`) into Concept/Attribute layer

## CSV Import Review Checklist (ConceptType)

Before importing, confirm:

- [ ] Every row name is a reusable type label (not an instance)
- [ ] No row name encodes local numbering, year, or version
- [ ] `partOrder` is blank or an integer `>= 1`
- [ ] `partOrder` is only set when `partOfName` is present
- [ ] `referenceToName` is not self-referential
- [ ] Terms are singular and consistently named

## Examples

### Good ConceptType rows

- `Outcome`
- `Program`
- `Service Channel`
- `Capability Domain`

### Not ConceptType rows

- `Outcome 1`
- `Program 1.1`
- `Service Channel FY2026`
- `Department X Program`

## Governance Recommendation

For any proposed new ConceptType, require a lightweight review with two explicit checks:

1. Is this reusable across contexts and time?
2. Could this be better represented as Concept + Attribute instead?

If either answer indicates instance specificity, do not add as ConceptType.

# Reference Model Import Capability (Generalized)

## Purpose

Define a reusable import capability for standard **Business Architecture Guild (BAG)** reference models (not only Government Reference Model v5.0), including:

- ConceptType (metamodel) import
- Concept (instance/model) import
- Repeatable validation, versioning, and rollback-ready packaging

## Scope

This capability is designed to support BAG-style model families such as:

- Government
- Banking
- Insurance
- Healthcare
- Cross-industry model packs

## Design Principles

1. **Package-first**: import artifacts are treated as versioned packages.
2. **Type-before-instance**: ConceptTypes load and validate before Concepts.
3. **Deterministic identity**: prefer name-based imports with explicit scope resolution.
4. **Root-scoped safety**: enforce uniqueness using `(concept_type_id, root_concept_id, lower(name))`.
5. **Auditable operations**: every bulk remediation or corrective operation is logged.
6. **Composable domains**: capability, value stream, information, stakeholder, and organization packs can be loaded independently.

## Canonical Import Contracts

### ConceptType CSV

Use the existing ConceptType import contract for metamodel loading.

### Concept CSV

Use the current model import contract:

`conceptId,name,description,conceptTypeName,rootConceptId,rootConceptName,partOfConceptId,partOfName,partOrder,referenceToConceptId,referenceToName`

Notes:

- `conceptId` and `rootConceptId` are optional.
- No-ID imports are supported when names resolve uniquely in scope.
- `rootConceptName` is used to resolve root scope when `rootConceptId` is omitted.

## Package Structure (Recommended)

Each release is a folder with explicit ordering metadata.

```text
reference-models/
  <model-family>/
    <version>/
      package.json
      01-concept-types.csv
      02-concepts-capability.csv
      03-concepts-value-stream.csv
      04-concepts-information.csv
      05-concepts-organization.csv
      06-concepts-stakeholder.csv
      mappings/
        source-to-canonical.md
      diagnostics/
        preflight-report.md
```

`package.json` should include:

- model family (`government`, `banking`, etc.)
- source version (`GRM v5.0`, etc.)
- package version (`1.0.0` style)
- load order
- compatibility notes

## Import Pipeline

### Phase 0: Source ingestion

- Ingest source artifacts (`.xlsx`, `.pdf`, optional `.csv`).
- Normalize column names and whitespace.
- Generate canonical intermediate files.

### Phase 1: Metamodel import

- Load ConceptTypes first.
- Validate `PartOf` and `ReferenceTo` ConceptType relationships.
- Reject cyclic or invalid type graph definitions.

### Phase 2: Core concept imports

- Load root concepts for each domain.
- Load decomposition children using `partOfName` + root scope.
- Load references using `referenceToName` + root scope.

### Phase 3: Cross-map and relationship enrichment

For BAG models that contain many-to-many mappings:

- Use bridge ConceptTypes where needed (for example, explicit relation concepts).
- Avoid forcing many-to-many semantics into single `reference_to` fields.

### Phase 4: Validation gates

- Ambiguous root resolution
- Missing parent/reference targets
- Type mismatch (PartOf/ReferenceTo)
- PartOf cycle checks
- Duplicate-name detection in same root scope

### Phase 5: Post-import diagnostics and remediation

- Run diagnostics.
- Normalize sibling order where needed.
- Record remediation audit entries.

## Mapping Patterns for BAG Models

### Capability maps

- Use hierarchical ConceptTypes/Concepts based on map levels.
- Preserve level metadata in descriptions or a future attribute layer.

### Value streams

- Model value streams as roots.
- Model stages as children (`partOfName = <Value Stream>`).
- Keep stage-specific metadata in descriptions now; move to attributes when available.

### Information maps

- Model information concepts as roots in an information domain.
- Encode category/type/state semantics as:
  - either dedicated ConceptTypes
  - or bridge/relationship concepts for multi-valued cases.

## Versioning Strategy

Treat each imported BAG package as immutable:

- New source revision => new package version
- Never overwrite prior package artifacts
- Keep migration notes in `mappings/source-to-canonical.md`

Use model versioning primitives (where enabled) to support:

- snapshot before import
- rollback on failed acceptance
- release tagging

## Operational Risks

1. **Semantic drift across BAG releases**
   - Mitigation: explicit mapping files and package versioning.
2. **Name collisions in root scope**
   - Mitigation: preflight ambiguity checks + optional explicit IDs.
3. **Many-to-many compression loss**
   - Mitigation: bridge concept pattern for relationship-heavy sections.
4. **Large-batch partial failures**
   - Mitigation: domain-segmented load order and failure CSV export.

## Opportunities

- Reuse one import capability across all BAG vertical reference models.
- Faster bootstrap of architecture repositories in new domains.
- Consistent governance and QA via shared package and validation standards.
- Better comparability across model families through a canonical import contract.

## Implementation Backlog (Suggested)

1. Create a `reference-models` package loader convention.
2. Add preflight command for root/name ambiguity and unresolved relations.
3. Add source parser adapters (`xlsx`, optional `pdf` extraction helpers).
4. Add relationship bridge templates for many-to-many mappings.
5. Add package manifest validation and load-order checks.
6. Add snapshot/rollback hooks for production imports.

## Immediate Next Step

Pilot with one model family (Government) using this generalized package format, then reuse unchanged pipeline for the next BAG family to validate portability.

# Government Reference Model v5.0 Package

This package is the first generalized pilot for importing Business Architecture Guild reference models into Analysis Partner.

## Import order

1. `01-concept-types.csv`
2. `02-concepts-capability.csv`
3. `03-concepts-value-stream.csv`
4. `04-concepts-information.csv`
5. `05-concepts-stakeholder.csv`

## Notes

- Start with small slices and expand.
- Keep names source-aligned unless a canonical mapping says otherwise.
- Use no-ID imports by default with `rootConceptName` to scope matching.
- For ambiguous roots, provide `rootConceptId` explicitly.

## Regenerate from workbook

```bash
/home/office/Dev/APartner/.venv/bin/python scripts/build_reference_model_package.py \
	--source-xlsx "/home/office/Dev/APartner/Government Reference Model v5.0.xlsx" \
	--out-dir /home/office/Dev/APartner/reference-models/government/v5.0
```

The generator reads the workbook tabs for capability, value stream, information, and stakeholder maps and rewrites the package CSVs.

## Validate package preflight

```bash
/home/office/Dev/APartner/.venv/bin/python scripts/validate_reference_model_package.py \
	--package-dir /home/office/Dev/APartner/reference-models/government/v5.0
```

Use this before import to catch duplicate identities, ambiguous roots for `rootConceptName` resolution, invalid `PartOf`/`ReferenceTo` semantics, and unresolved in-package links.

For CI-quality gates, fail on warnings as well:

```bash
/home/office/Dev/APartner/.venv/bin/python scripts/validate_reference_model_package.py \
	--package-dir /home/office/Dev/APartner/reference-models/government/v5.0 \
	--strict
```

Current expectation for this package: strict preflight is CI-gated and should pass with zero warnings and zero errors.

## Current scope

This package currently includes workbook-derived baseline rows for:

- Capability hierarchy
- Value stream and value stream stages
- Information concept roots and related-concept links
- Stakeholder concepts

Use the `diagnostics/preflight-report.md` checklist before importing into shared environments.

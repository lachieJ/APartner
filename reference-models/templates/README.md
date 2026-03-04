# Reference Model Templates

This folder contains reusable CSV templates for importing standardized reference models.

## Files

- `concepts-import-template.csv`: canonical concept import header supporting no-ID imports with `rootConceptName`.

## Usage

1. Copy the template to a model-family/version package folder.
2. Populate rows in load order (roots before children/references).
3. Import via Concepts CSV import.
4. Export failures and remediate ambiguous/missing targets.

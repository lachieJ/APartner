#!/usr/bin/env python3
import argparse
import csv
import json
from dataclasses import dataclass
from pathlib import Path

CONCEPT_TYPE_HEADER = ['name', 'description', 'partOfName', 'partOrder', 'referenceToName']
CONCEPT_HEADER = [
    'conceptId',
    'name',
    'description',
    'conceptTypeName',
    'rootConceptId',
    'rootConceptName',
    'partOfConceptId',
    'partOfName',
    'partOrder',
    'referenceToConceptId',
    'referenceToName',
]


def normalize(value: str | None) -> str:
    return (value or '').strip()


def key(value: str | None) -> str:
    return normalize(value).lower()


@dataclass
class ConceptTypeRow:
    name: str
    part_of_name: str
    reference_to_name: str


@dataclass
class ConceptRow:
    source_file: str
    row_number: int
    name: str
    concept_type_name: str
    root_concept_name: str
    part_of_name: str
    part_order: str
    reference_to_name: str

    @property
    def identity(self) -> tuple[str, str, str]:
        return (key(self.concept_type_name), key(self.root_concept_name), key(self.name))

    @property
    def is_root(self) -> bool:
        return normalize(self.part_of_name) == ''


def read_csv_rows(path: Path) -> list[list[str]]:
    with path.open(newline='', encoding='utf-8') as handle:
        return list(csv.reader(handle))


def validate_headers(rows: list[list[str]], expected_header: list[str], path: Path, errors: list[str]) -> None:
    if not rows:
        errors.append(f'{path}: file is empty')
        return

    header = rows[0]
    if header != expected_header:
        errors.append(
            f"{path}: header mismatch. Expected {','.join(expected_header)} but got {','.join(header)}"
        )


def load_concept_types(package_dir: Path, errors: list[str]) -> dict[str, ConceptTypeRow]:
    path = package_dir / '01-concept-types.csv'
    if not path.exists():
        errors.append(f'{path}: missing required file')
        return {}

    rows = read_csv_rows(path)
    validate_headers(rows, CONCEPT_TYPE_HEADER, path, errors)

    concept_types: dict[str, ConceptTypeRow] = {}
    for idx, row in enumerate(rows[1:], start=2):
        if len(row) != len(CONCEPT_TYPE_HEADER):
            errors.append(f'{path}:{idx}: expected {len(CONCEPT_TYPE_HEADER)} columns, got {len(row)}')
            continue

        name, _description, part_of_name, part_order, reference_to_name = [normalize(v) for v in row]
        if not name:
            errors.append(f'{path}:{idx}: name is required')
            continue

        if part_order and (not part_order.isdigit() or int(part_order) < 1):
            errors.append(f'{path}:{idx}: partOrder must be a whole number greater than 0')

        k = key(name)
        if k in concept_types:
            errors.append(f'{path}:{idx}: duplicate ConceptType name (case-insensitive): {name}')
            continue

        concept_types[k] = ConceptTypeRow(
            name=name,
            part_of_name=part_of_name,
            reference_to_name=reference_to_name,
        )

    return concept_types


def load_package_manifest(package_dir: Path) -> list[Path]:
    manifest_path = package_dir / 'package.json'
    if manifest_path.exists():
        data = json.loads(manifest_path.read_text(encoding='utf-8'))
        load_order = data.get('loadOrder', [])
        concept_files = [
            package_dir / item
            for item in load_order
            if item.endswith('.csv') and item != '01-concept-types.csv'
        ]
        if concept_files:
            return concept_files

    return sorted(
        file
        for file in package_dir.glob('0*-concepts-*.csv')
        if file.name != '01-concept-types.csv'
    )


def load_concepts(package_dir: Path, errors: list[str]) -> list[ConceptRow]:
    concept_files = load_package_manifest(package_dir)
    rows: list[ConceptRow] = []

    for path in concept_files:
        if not path.exists():
            errors.append(f'{path}: missing concept file in load order')
            continue

        raw = read_csv_rows(path)
        validate_headers(raw, CONCEPT_HEADER, path, errors)

        for idx, row in enumerate(raw[1:], start=2):
            if len(row) != len(CONCEPT_HEADER):
                errors.append(f'{path}:{idx}: expected {len(CONCEPT_HEADER)} columns, got {len(row)}')
                continue

            (
                _concept_id,
                name,
                _description,
                concept_type_name,
                _root_concept_id,
                root_concept_name,
                _part_of_concept_id,
                part_of_name,
                part_order,
                _reference_to_concept_id,
                reference_to_name,
            ) = [normalize(v) for v in row]

            if not name:
                errors.append(f'{path}:{idx}: name is required')
                continue

            if not concept_type_name:
                errors.append(f'{path}:{idx}: conceptTypeName is required')
                continue

            if part_order:
                if not part_order.isdigit() or int(part_order) < 1:
                    errors.append(f'{path}:{idx}: partOrder must be a whole number greater than 0')
                if not part_of_name:
                    errors.append(f'{path}:{idx}: partOrder requires partOfName or partOfConceptId')

            rows.append(
                ConceptRow(
                    source_file=path.name,
                    row_number=idx,
                    name=name,
                    concept_type_name=concept_type_name,
                    root_concept_name=root_concept_name,
                    part_of_name=part_of_name,
                    part_order=part_order,
                    reference_to_name=reference_to_name,
                )
            )

    return rows


def validate_cross_references(
    concept_types: dict[str, ConceptTypeRow],
    concepts: list[ConceptRow],
    errors: list[str],
    warnings: list[str],
) -> None:
    def expected_root_type_name(concept_type_name: str) -> str:
        current_name = normalize(concept_type_name)
        visited: set[str] = set()

        while current_name and key(current_name) not in visited:
            visited.add(key(current_name))
            current = concept_types.get(key(current_name))
            if not current or not normalize(current.part_of_name):
                return current_name

            if key(current.part_of_name) == key(current_name):
                return current_name

            current_name = normalize(current.part_of_name)

        return normalize(concept_type_name)

    concept_index: dict[tuple[str, str, str], list[ConceptRow]] = {}
    for concept in concepts:
        concept_index.setdefault(concept.identity, []).append(concept)

    for identity, duplicates in concept_index.items():
        if len(duplicates) > 1:
            sample = duplicates[0]
            errors.append(
                f"{sample.source_file}:{sample.row_number}: duplicate concept identity in package "
                f"(conceptTypeName={sample.concept_type_name}, rootConceptName={sample.root_concept_name or '<blank>'}, name={sample.name})"
            )

    root_concepts = [concept for concept in concepts if concept.is_root]
    root_by_name: dict[str, list[ConceptRow]] = {}
    for root in root_concepts:
        root_by_name.setdefault(key(root.name), []).append(root)

    for concept in concepts:
        concept_type = concept_types.get(key(concept.concept_type_name))
        if not concept_type:
            errors.append(
                f'{concept.source_file}:{concept.row_number}: conceptTypeName not found in 01-concept-types.csv: {concept.concept_type_name}'
            )
            continue

        if concept.root_concept_name:
            root_matches = root_by_name.get(key(concept.root_concept_name), [])
            scoped_root_type_name = expected_root_type_name(concept.concept_type_name)
            scoped_root_matches = [
                match for match in root_matches if key(match.concept_type_name) == key(scoped_root_type_name)
            ]

            if len(scoped_root_matches) == 1:
                pass
            elif len(scoped_root_matches) > 1:
                errors.append(
                    f"{concept.source_file}:{concept.row_number}: rootConceptName '{concept.root_concept_name}' is ambiguous in expected root ConceptType '{scoped_root_type_name}'"
                )
            elif len(root_matches) == 0:
                errors.append(
                    f"{concept.source_file}:{concept.row_number}: rootConceptName '{concept.root_concept_name}' not found among package roots"
                )
            elif len(root_matches) > 1:
                errors.append(
                    f"{concept.source_file}:{concept.row_number}: rootConceptName '{concept.root_concept_name}' is ambiguous across package roots"
                )

        if concept.part_of_name:
            expected_parent_type = normalize(concept_type.part_of_name)
            if not expected_parent_type:
                errors.append(
                    f'{concept.source_file}:{concept.row_number}: partOfName provided but ConceptType does not allow PartOf relationships'
                )
            else:
                parent_candidates = [
                    candidate
                    for candidate in concepts
                    if key(candidate.concept_type_name) == key(expected_parent_type)
                    and key(candidate.name) == key(concept.part_of_name)
                    and (
                        not concept.root_concept_name
                        or key(candidate.root_concept_name or candidate.name) == key(concept.root_concept_name)
                    )
                ]
                if len(parent_candidates) == 0:
                    errors.append(
                        f"{concept.source_file}:{concept.row_number}: partOfName target '{concept.part_of_name}' not found in expected ConceptType '{expected_parent_type}'"
                    )
                elif len(parent_candidates) > 1:
                    errors.append(
                        f"{concept.source_file}:{concept.row_number}: partOfName target '{concept.part_of_name}' is ambiguous in expected ConceptType '{expected_parent_type}'"
                    )

        if concept.reference_to_name:
            expected_reference_type = normalize(concept_type.reference_to_name)
            if not expected_reference_type:
                errors.append(
                    f'{concept.source_file}:{concept.row_number}: referenceToName provided but ConceptType does not allow ReferenceTo relationships'
                )
            else:
                reference_candidates = [
                    candidate
                    for candidate in concepts
                    if key(candidate.concept_type_name) == key(expected_reference_type)
                    and key(candidate.name) == key(concept.reference_to_name)
                    and (
                        not concept.root_concept_name
                        or key(candidate.root_concept_name or candidate.name) == key(concept.root_concept_name)
                    )
                ]
                if len(reference_candidates) == 0:
                    global_reference_candidates = [
                        candidate
                        for candidate in concepts
                        if key(candidate.concept_type_name) == key(expected_reference_type)
                        and key(candidate.name) == key(concept.reference_to_name)
                    ]
                    if len(global_reference_candidates) == 1:
                        pass
                    elif len(global_reference_candidates) > 1:
                        errors.append(
                            f"{concept.source_file}:{concept.row_number}: referenceToName target '{concept.reference_to_name}' is ambiguous across roots in expected ConceptType '{expected_reference_type}'"
                        )
                    else:
                        warnings.append(
                            f"{concept.source_file}:{concept.row_number}: referenceToName '{concept.reference_to_name}' not found in package for expected ConceptType '{expected_reference_type}' (may exist in target workspace)"
                        )
                elif len(reference_candidates) > 1:
                    errors.append(
                        f"{concept.source_file}:{concept.row_number}: referenceToName target '{concept.reference_to_name}' is ambiguous in expected ConceptType '{expected_reference_type}'"
                    )


def main() -> int:
    parser = argparse.ArgumentParser(description='Validate reference model package CSVs before import.')
    parser.add_argument('--package-dir', required=True, help='Path to model package directory.')
    parser.add_argument(
        '--strict',
        action='store_true',
        help='Fail when warnings are present (useful for CI quality gates).',
    )
    args = parser.parse_args()

    package_dir = Path(args.package_dir).resolve()
    if not package_dir.exists() or not package_dir.is_dir():
        print(f'Package directory does not exist: {package_dir}')
        return 2

    errors: list[str] = []
    warnings: list[str] = []

    concept_types = load_concept_types(package_dir, errors)
    concepts = load_concepts(package_dir, errors)

    if concept_types and concepts:
        validate_cross_references(concept_types, concepts, errors, warnings)

    print(f'Validated package: {package_dir}')
    print(f'- mode: {"strict" if args.strict else "standard"}')
    print(f'- concept types: {len(concept_types)}')
    print(f'- concept rows: {len(concepts)}')
    print(f'- warnings: {len(warnings)}')
    print(f'- errors: {len(errors)}')

    if warnings:
        print('\nWarnings:')
        for warning in warnings[:50]:
            print(f'- {warning}')
        if len(warnings) > 50:
            print(f'- ... and {len(warnings) - 50} more warning(s)')

    if errors:
        print('\nErrors:')
        for error in errors[:100]:
            print(f'- {error}')
        if len(errors) > 100:
            print(f'- ... and {len(errors) - 100} more error(s)')
        return 1

    if args.strict and warnings:
        print('\nStrict mode failed due to warnings.')
        return 1

    print('\nPackage validation passed.')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())

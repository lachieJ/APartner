#!/usr/bin/env python3
import csv
import sys
from pathlib import Path

EXPECTED_HEADER = [
    'name',
    'description',
    'partOfName',
    'partOrder',
    'referenceToName',
]


def validate_file(path: Path) -> list[str]:
    errors: list[str] = []

    try:
        with path.open(newline='', encoding='utf-8') as handle:
            reader = csv.reader(handle)
            rows = list(reader)
    except Exception as exc:
        return [f'{path}: could not read file ({exc})']

    if not rows:
        return [f'{path}: file is empty']

    header = rows[0]
    if header != EXPECTED_HEADER:
        errors.append(
            f"{path}: header mismatch. Expected {','.join(EXPECTED_HEADER)} but got {','.join(header)}"
        )

    for row_index, row in enumerate(rows[1:], start=2):
        if len(row) != 5:
            errors.append(f'{path}:{row_index}: expected 5 columns, got {len(row)}')
            continue

        name, _description, part_of_name, part_order, reference_to_name = [item.strip() for item in row]

        if not name:
            errors.append(f'{path}:{row_index}: name is required')

        if part_order:
            if not part_order.isdigit() or int(part_order) < 1:
                errors.append(f'{path}:{row_index}: partOrder must be a whole number greater than 0')
            if not part_of_name:
                errors.append(f'{path}:{row_index}: partOrder requires partOfName')

        if reference_to_name and not part_of_name:
            errors.append(f'{path}:{row_index}: referenceToName requires partOfName')

    return errors


def main() -> int:
    args = sys.argv[1:]
    if not args:
        print('Usage: python3 scripts/validate_concept_type_csv.py <csv-file-or-glob> [more ...]')
        return 2

    files: list[Path] = []
    root = Path.cwd()

    for arg in args:
        if any(ch in arg for ch in ['*', '?', '[']):
            files.extend(sorted(root.glob(arg)))
        else:
            files.append(root / arg)

    unique_files: list[Path] = []
    seen: set[Path] = set()
    for file in files:
        resolved = file.resolve()
        if resolved in seen:
            continue
        seen.add(resolved)
        unique_files.append(file)

    if not unique_files:
        print('No files matched.')
        return 2

    all_errors: list[str] = []
    for file in unique_files:
        if not file.exists():
            all_errors.append(f'{file}: file does not exist')
            continue
        if file.suffix.lower() != '.csv':
            all_errors.append(f'{file}: not a .csv file')
            continue

        all_errors.extend(validate_file(file))

    if all_errors:
        print('CSV validation failed:')
        for error in all_errors:
            print(f'- {error}')
        return 1

    print(f'CSV validation passed for {len(unique_files)} file(s).')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())

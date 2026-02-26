# One-Page Fillable Web App Brief

- **Project Name: Analysis Partner Prototype  
- **Owner: Lachlan Ryan  
- **Date: 21 Feb 2026  
- **Version: G0.1**  

## Overview
- **Purpose: Provides ability to define, model and evaluate the business architecture of an enterprise using a simple generic metamodel.  
- **For: Business architects supporting business initiatives   
- **What problem does it solve: Provides a structured repository of business concepts.
- **Primary business goal: To evaluate the current state of an enterprise and guide its development 

## MVP Scope
- **Core feature 1: Create, update, delete metamodels for Value Chain, Value Stream, Capability, Information, Organisation
- **Core feature 2: Create/update/delete enterprise models for Value Chain, Value Stream, Capability, Information, Organisation validated against the metamodel.
- **Core feature 3: Enable Evaluate model elements  
- **Out of scope (for now): Model versioning  

## User Journey
- **Entry point (how users arrive): Provided link to application  
- **Authentication (if any): User details and role recorded, Email supplied with link to log in 
- **Primary action user completes: Create model 
- **Success state shown to user: Model view  

## Technical Snapshot
- **Frontend: React  
- **Backend: Supabase  
- **Database: Postgres  
- **Third-party APIs/services: N/A  
- **Hosting/deployment target: Vercel (recommended) with Supabase backend  

## React Hosting Approach (Metamodel Component)

- **Recommended platform: Vercel** for static React hosting, global CDN delivery, and preview deployments per pull request.
- **Alternative platforms:** Netlify or Cloudflare Pages with the same deployment model.
- **Data/security boundary:** React host serves static assets only; business data remains in Supabase/Postgres (AU-hosted).

### Environment Setup

- **Dev:** local React app + Supabase dev project.
- **Staging:** Vercel staging deployment + Supabase staging project.
- **Prod:** Vercel production deployment + Supabase production project.
- **Client environment variables:** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (no service role keys in frontend).

### Deployment Flow

1. Developer pushes branch and opens PR.
2. Vercel creates preview deployment automatically.
3. Smoke test metamodel flows: create/update/delete ConceptType and cycle/decomposition validation.
4. Merge to main triggers production build and deploy.
5. Monitor runtime errors and API latency; rollback to previous deployment if needed.

### Operational Controls

- Use branch protection and required checks before merge.
- Keep Supabase RLS as the source of authorization control.
- Enable HTTP security headers and enforce HTTPS.
- Maintain separate secrets per environment and rotate on schedule.

## Quality Requirements
- **Performance target: max 3 second response all operations 
- **Security requirements: Australian hosted, log in protected, analyst has own shareable view.   
- **Accessibility baseline: WCAG 2.1  
- **Browser/device support: TBA  

## Delivery
- **Target launch date: 12/9/26  
- **Milestone 1: Metamodel beta 1
- **Milestone 2: Metamodel beta 2, Modeling beta 1  
- **Milestone 3: Modeling beta 2, evaluation beta 1  
- **Team (PM/Design/Dev/QA): Lachie  

## Success Metrics
- **KPI 1: Generic metamodel depiction with zero invalid structures (except allowed self-decomposition). 
No invalid cycle structures (direct `PartOf` self-decomposition is allowed)
Data integrity rules enforced
- **KPI 2: 100% model conformance with metamodel
- **KPI 3: TBA 

## Risks & Dependencies
- **Top risk: Navigation complexity  
- **Mitigation: Generic metamodel and model depictions  
- **External dependency: N/A  

## Metamodel Data Model (ConceptType)

### Entity: ConceptType

| Field | Type | Required | Description |
|---|---|---|---|
| Id | UUID (PK) | Yes | Unique identifier for the concept type. |
| Name | TEXT | Yes | Business name of the concept type. Must be unique (case-insensitive). |
| Description | TEXT | No | Optional definition/notes for the concept type. |
| PartOfConceptTypeId | UUID (FK -> ConceptType.Id) | No | Parent concept type in a containment/composition hierarchy. |
| PartOrder | INTEGER | No | Sibling order within the selected parent concept type; positive integer when set. |
| ReferenceToConceptTypeId | UUID (FK -> ConceptType.Id) | No | Optional pointer to another concept type that this concept type references. |
| CreatedAt | TIMESTAMPTZ | Yes | Audit field. |
| UpdatedAt | TIMESTAMPTZ | Yes | Audit field. |

### Business Rules

1. A concept type may reference another concept type only if it is part of a concept type:
	 - `ReferenceToConceptTypeId IS NOT NULL` requires `PartOfConceptTypeId IS NOT NULL`.
2. Self-link rules:
	 - `PartOfConceptTypeId = Id` is allowed to represent decomposition (e.g., Capability is part of Capability).
	 - `ReferenceToConceptTypeId != Id` (self-reference is not allowed for references).
3. No cycles are allowed in either graph, except direct self-decomposition in `PartOfConceptTypeId`:
	 - `PartOfConceptTypeId` must be acyclic for multi-node paths (e.g., `A -> B -> A` is invalid).
	 - `ReferenceToConceptTypeId` chain must be acyclic.
4. Ordering rules:
	 - `PartOrder` is optional.
	 - If provided, `PartOrder` must be an integer >= 1.
	 - `PartOrder` can only be set when `PartOfConceptTypeId` is set.

### Recommended SQL Constraints (Postgres)

```sql
create table concept_type (
	id uuid primary key default gen_random_uuid(),
	name text not null,
	description text,
	part_of_concept_type_id uuid references concept_type(id) on delete restrict,
	part_order integer,
	reference_to_concept_type_id uuid references concept_type(id) on delete restrict,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),

	constraint uq_concept_type_name unique (name),
	constraint chk_reference_requires_partof
		check (
			reference_to_concept_type_id is null
			or part_of_concept_type_id is not null
		),
	constraint chk_not_self_reference
		check (
			reference_to_concept_type_id is null
			or reference_to_concept_type_id <> id
		),
	constraint chk_part_order_positive
		check (part_order is null or part_order >= 1),
	constraint chk_part_order_requires_partof
		check (part_order is null or part_of_concept_type_id is not null)
);

create unique index uq_concept_type_name_ci
	on concept_type (lower(name));
```

### Cycle Prevention (Trigger-based)

`CHECK` constraints cannot detect multi-row graph cycles. Use triggers with recursive CTE checks on insert/update.

```sql
create or replace function concept_type_prevent_cycles()
returns trigger
language plpgsql
as $$
declare
	cycle_found boolean;
begin
	-- PART-OF cycle check
	if new.part_of_concept_type_id is not null
	   and new.part_of_concept_type_id <> new.id then
		with recursive walk(id) as (
			select new.part_of_concept_type_id
			union all
			select c.part_of_concept_type_id
			from concept_type c
			join walk w on c.id = w.id
			where c.part_of_concept_type_id is not null
		)
		select exists(select 1 from walk where id = new.id) into cycle_found;

		if cycle_found then
			raise exception 'PartOfConceptTypeId cycle detected for ConceptType %', new.id;
		end if;
	end if;

	-- REFERENCE cycle check
	if new.reference_to_concept_type_id is not null then
		with recursive walk(id) as (
			select new.reference_to_concept_type_id
			union all
			select c.reference_to_concept_type_id
			from concept_type c
			join walk w on c.id = w.id
			where c.reference_to_concept_type_id is not null
		)
		select exists(select 1 from walk where id = new.id) into cycle_found;

		if cycle_found then
			raise exception 'ReferenceToConceptTypeId cycle detected for ConceptType %', new.id;
		end if;
	end if;

	return new;
end;
$$;

create trigger trg_concept_type_prevent_cycles
before insert or update of part_of_concept_type_id, reference_to_concept_type_id
on concept_type
for each row
execute function concept_type_prevent_cycles();
```

### Notes for Supabase/Postgres

- Keep FK delete behavior as `RESTRICT` to avoid accidental graph damage.
- Apply updates inside transactions when changing multiple related concept types.
- If high write volume is expected, index both relationship columns:
	- `create index ix_concept_type_part_of on concept_type(part_of_concept_type_id);`
	- `create index ix_concept_type_part_of_order on concept_type(part_of_concept_type_id, part_order);`
	- `create index ix_concept_type_reference_to on concept_type(reference_to_concept_type_id);`

### Validation Examples (Valid vs Invalid)

Assume these existing concept types:

| Id | Name |
|---|---|
| `A` | Enterprise |
| `B` | Capability |
| `C` | Process |
| `D` | Information |

#### Valid

| Id | Name | PartOfConceptTypeId | ReferenceToConceptTypeId | Why valid |
|---|---|---|---|---|
| `E` | Capability Map | `A` | `NULL` | Part-of relationship, no cycle. |
| `F` | Process Step | `C` | `D` | Reference is allowed because `PartOfConceptTypeId` is not null. |
| `G` | Capability Owner | `B` | `NULL` | Simple child concept, no reference. |
| `B` | Capability | `B` | `NULL` | Allowed self-decomposition (`Capability` part of `Capability`). |

#### Invalid

| Case | Id | PartOfConceptTypeId | ReferenceToConceptTypeId | Why invalid |
|---|---|---|---|---|
| Reference without PartOf | `H` | `NULL` | `D` | Violates: reference requires part-of. |
| Self reference | `B` | `A` | `B` | Violates: self reference not allowed. |
| Part-of cycle | `A` -> `B`, `B` -> `C`, `C` -> `A` | N/A | N/A | Violates: cycle in `PartOfConceptTypeId`. |
| Reference cycle | `A` -> `B`, `B` -> `C`, `C` -> `A` | all have non-null `PartOfConceptTypeId` | N/A | Violates: cycle in `ReferenceToConceptTypeId`. |

#### Quick Rule Check Logic

For each insert/update of a concept type:

1. If `PartOrder` is set, ensure it is a whole number >= 1 and `PartOfConceptTypeId` is set.
2. If `ReferenceToConceptTypeId` is set, ensure `PartOfConceptTypeId` is set.
3. Ensure `ReferenceToConceptTypeId` does not point to the same `Id`.
4. For `PartOfConceptTypeId`, allow direct self-decomposition, but reject all other cycles.
5. Walk ancestors/follow references recursively and reject when the current `Id` is reached.

### API Contract (MVP)

#### POST /api/concept-types

Create a concept type.

Request body:

```json
{
	"name": "Capability",
	"description": "What the enterprise must be able to do",
	"partOfConceptTypeId": "uuid-or-null",
	"partOrder": 1,
	"referenceToConceptTypeId": "uuid-or-null"
}
```

Success response (`201 Created`):

```json
{
	"id": "uuid",
	"name": "Capability",
	"description": "What the enterprise must be able to do",
	"partOfConceptTypeId": "uuid-or-null",
	"partOrder": 1,
	"referenceToConceptTypeId": "uuid-or-null",
	"createdAt": "2026-02-22T10:15:00Z",
	"updatedAt": "2026-02-22T10:15:00Z"
}
```

Validation/business error (`400 Bad Request`):

```json
{
	"error": {
		"code": "REFERENCE_REQUIRES_PART_OF",
		"message": "ReferenceToConceptTypeId requires PartOfConceptTypeId.",
		"details": {
			"partOfConceptTypeId": null,
			"referenceToConceptTypeId": "uuid"
		}
	}
}
```

#### PATCH /api/concept-types/{id}

Update one or more fields.

Request body (partial):

```json
{
	"name": "Capability v2",
	"description": "Updated description",
	"partOfConceptTypeId": "uuid-or-null",
	"partOrder": 2,
	"referenceToConceptTypeId": "uuid-or-null"
}
```

Success response (`200 OK`):

```json
{
	"id": "uuid",
	"name": "Capability v2",
	"description": "Updated description",
	"partOfConceptTypeId": "uuid-or-null",
	"partOrder": 2,
	"referenceToConceptTypeId": "uuid-or-null",
	"createdAt": "2026-02-22T10:15:00Z",
	"updatedAt": "2026-02-22T10:20:00Z"
}
```

Not found (`404 Not Found`):

```json
{
	"error": {
		"code": "CONCEPT_TYPE_NOT_FOUND",
		"message": "ConceptType not found.",
		"details": {
			"id": "uuid"
		}
	}
}
```

### Standard Validation Error Codes

| Code | HTTP | Trigger |
|---|---|---|
| `VALIDATION_FAILED` | 400 | Missing/invalid input format (e.g., blank name, invalid UUID). |
| `DUPLICATE_NAME` | 409 | `Name` already exists (case-insensitive). |
| `PART_OF_NOT_FOUND` | 400 | `PartOfConceptTypeId` does not exist. |
| `PART_ORDER_INVALID` | 400 | `PartOrder` is provided but is not an integer >= 1. |
| `PART_ORDER_REQUIRES_PART_OF` | 400 | `PartOrder` is set while `PartOfConceptTypeId` is null. |
| `REFERENCE_TO_NOT_FOUND` | 400 | `ReferenceToConceptTypeId` does not exist. |
| `REFERENCE_REQUIRES_PART_OF` | 400 | `ReferenceToConceptTypeId` set while `PartOfConceptTypeId` is null. |
| `REFERENCE_SELF_REFERENCE` | 400 | `ReferenceToConceptTypeId == Id`. |
| `PART_OF_CYCLE_DETECTED` | 409 | Cycle detected in `PartOfConceptTypeId` chain. |
| `REFERENCE_CYCLE_DETECTED` | 409 | Cycle detected in `ReferenceToConceptTypeId` chain. |

### Service-layer Validation Order

Recommended order before DB write:

1. Validate payload shape and primitive formats.
2. Resolve target row (`PATCH`) and foreign keys (`PartOf`, `ReferenceTo`).
3. Enforce `PartOrder` validity (`>=1`) and `PartOrder` requires `PartOf`.
4. Enforce `ReferenceTo` requires `PartOf`.
5. Enforce `ReferenceTo` is not self-linked.
6. Allow `PartOf` self-decomposition; run cycle checks for all other `PartOf` and all `ReferenceTo` paths.
7. Execute write in a transaction and return canonical row.

### Delete Behavior

#### DELETE /api/concept-types/{id}

Delete a concept type only when it has no dependents.

Success response (`204 No Content`)

- Empty body.

Not found (`404 Not Found`):

```json
{
	"error": {
		"code": "CONCEPT_TYPE_NOT_FOUND",
		"message": "ConceptType not found.",
		"details": {
			"id": "uuid"
		}
	}
}
```

Restricted by dependencies (`409 Conflict`):

```json
{
	"error": {
		"code": "CONCEPT_TYPE_IN_USE",
		"message": "ConceptType cannot be deleted because dependent records exist.",
		"details": {
			"id": "uuid",
			"dependentPartOfCount": 2,
			"dependentReferenceToCount": 1
		}
	}
}
```

Dependency definition for `CONCEPT_TYPE_IN_USE`:

- At least one row has `part_of_concept_type_id = {id}`; or
- At least one row has `reference_to_concept_type_id = {id}`.

Implementation note:

- Keep DB foreign keys as `ON DELETE RESTRICT` and map FK violations to `CONCEPT_TYPE_IN_USE`.

### Read Contracts

#### GET /api/concept-types/{id}

Return one concept type with optional linked display fields.

Success response (`200 OK`):

```json
{
	"id": "uuid",
	"name": "Process Step",
	"description": "Atomic process activity",
	"partOfConceptTypeId": "uuid",
	"partOrder": 3,
	"partOfConceptTypeName": "Process",
	"referenceToConceptTypeId": "uuid",
	"referenceToConceptTypeName": "Information",
	"createdAt": "2026-02-22T10:15:00Z",
	"updatedAt": "2026-02-22T10:20:00Z"
}
```

Not found (`404 Not Found`):

```json
{
	"error": {
		"code": "CONCEPT_TYPE_NOT_FOUND",
		"message": "ConceptType not found.",
		"details": {
			"id": "uuid"
		}
	}
}
```

#### GET /api/concept-types

List concept types.

Query parameters (all optional):

- `q` (string): case-insensitive contains search on `name`.
- `partOfConceptTypeId` (uuid): filter to children of a given parent.
- `referenceToConceptTypeId` (uuid): filter by reference target.
- `limit` (int, default `50`, max `200`).
- `offset` (int, default `0`).
- `sort` (`name|partOrder|createdAt|updatedAt`, default `name`).
- `order` (`asc|desc`, default `asc`).

Success response (`200 OK`):

```json
{
	"items": [
		{
			"id": "uuid",
			"name": "Capability",
			"description": "What the enterprise must be able to do",
			"partOfConceptTypeId": "uuid-or-null",
			"partOrder": 1,
			"partOfConceptTypeName": "Enterprise",
			"referenceToConceptTypeId": "uuid-or-null",
			"referenceToConceptTypeName": "Information",
			"createdAt": "2026-02-22T10:15:00Z",
			"updatedAt": "2026-02-22T10:20:00Z"
		}
	],
	"page": {
		"limit": 50,
		"offset": 0,
		"count": 1,
		"total": 143
	}
}
```

Validation/business error (`400 Bad Request`):

```json
{
	"error": {
		"code": "VALIDATION_FAILED",
		"message": "One or more query parameters are invalid.",
		"details": {
			"limit": "must be between 1 and 200",
			"sort": "must be one of: name, partOrder, createdAt, updatedAt"
		}
	}
}
```

Read consistency note:

- `partOfConceptTypeName` and `referenceToConceptTypeName` are derived display fields from joined `concept_type` rows.

## Shape Model Overlay (Constrained Views)

### Purpose

The Shape Model overlays the core metamodel to define:

- constrained editing/validation rules (cardinality, required links, uniqueness), and
- view/navigation semantics (how users browse and maintain instance concepts),

without changing the base semantics of `PartOf` and `ReferenceTo`.

### Design Principle

- Core metamodel (`ConceptType`) defines structural semantics based on independent existence and references.
- Shape model defines contextual constraints and view behavior for specific use cases/reports.
- Multiple shapes can be applied to the same metamodel.

### Minimal Shape Schema

| Entity | Key fields | Purpose |
|---|---|---|
| `shape` | `id`, `name`, `description`, `status`, `version` | Logical container for a constrained view of the metamodel. |
| `shape_node` | `id`, `shape_id`, `concept_type_id`, `label`, `is_root` | Includes a concept type in a shape and defines display semantics. |
| `shape_edge` | `id`, `shape_id`, `from_shape_node_id`, `to_shape_node_id`, `edge_kind`, `path_concept_type_id`, `inverse_label` | Declares a navigable relationship in the shape based on `PartOf` or `ReferenceTo`. |
| `shape_constraint` | `id`, `shape_edge_id`, `min_occurs`, `max_occurs`, `is_required`, `is_unique_within_parent` | Enforces cardinality and rule constraints for a shape edge. |

`edge_kind` values:

- `PART_OF`
- `REFERENCE_TO`

`max_occurs` may be `NULL` to represent many (`*`).

### Validation Semantics

1. Instance data must always satisfy core metamodel integrity rules.
2. If a shape is selected, instance data must also satisfy shape constraints.
3. Shape violations are returned as validation errors (not schema errors).

### Example (Owning Enterprise)

Base metamodel pattern:

- `Value Stream` has part `Owning Enterprise`.
- `Owning Enterprise` references `Enterprise`.

Shape constraints:

- For `Value Stream -> Owning Enterprise` (`PART_OF`): `min_occurs = 1`, `max_occurs = 1`.
- For `Owning Enterprise -> Enterprise` (`REFERENCE_TO`): `min_occurs = 1`, `max_occurs = 1`.

Shape view behavior:

- On `Enterprise`, show inverse related `Value Streams` as one-to-many (`0..*`).
- On `Value Stream`, editing enforces exactly one owning enterprise.

### When to Introduce Relation Types

Do not add a separate `RelationType` in MVP if shape edges are sufficient for constraints and UX.
Introduce `RelationType` later only if multiple semantically distinct references between the same concept types must be governed independently at the core model level.

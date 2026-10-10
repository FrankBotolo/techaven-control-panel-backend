# Current State

Last updated: 2026-10-10 (Africa/Blantyre)
Repository/workspace: `techaven_backend`
Branch: `main`
Checkpoint commit: documentation baseline is the commit containing this file; pre-change checkpoint was `ccc3dd4`
Working tree: clean before this documentation change; verify with `git status` at session start

## Project in One Paragraph

This repository contains an ES-module Node.js/Express API backed by MySQL through Sequelize. It serves customer, seller, administrator, courier, payment, subscription, notification, and supporting endpoints under `/api`, plus a health endpoint and a small Expo mobile-client scaffold. `server.js` starts the shared database connection, background subscription-expiry work, Airtel token warmup, and HTTP server.

## Current Objective

No active implementation task established; awaiting the next task. The persistent agent-state and documentation navigation baseline has been established.

## Current Phase / Status

- Verified: application entry point, central route registry, model registry/associations, package scripts, documentation inventory, and Git baseline.
- Needs verification: runtime behavior against a configured MySQL instance and third-party integrations.

## Completed and Stable

- Root working protocol: `AGENTS.md`.
- Codebase navigation index: `docs/COMPONENT_MAP.md`.
- Documentation authority decision: `docs/DECISIONS.md#d-001--documentation-authority-and-precedence`.

## In Progress

- Nothing recorded.

## Active Spec / Task Context

- No active feature specification.

## Documentation Authority / Approval

- Inventory: 16 pre-existing Markdown files were inventoried by path and heading; dependency and generated trees were excluded. See `docs/COMPONENT_MAP.md#documentation-index`.
- Frontend/mobile authority: no approved frontend requirements document; `mobile-app/README.md` is reference only.
- Backend authority: `API_DOCUMENTATION.md` is primary. `docs/AIRTEL_WEBHOOK.md`, `docs/OWNER_REGISTRATION.md`, and `docs/SUBSCRIPTION_PACKAGES.md` are authoritative only within their named areas.
- Approval evidence and precedence: user selected the proposed tiered-authority option on 2026-10-10; see `docs/DECISIONS.md`.
- Conflicts: overlapping API documents and Chiwaya/Techaven/TecHaven naming remain unresolved. Two subscription documents formerly referenced by the README are absent.

## Module Boundaries / Failure Isolation

- `server.js` owns process startup, global middleware, `/api` mounting, error/404 handling, schedulers, and shutdown.
- `routes/index.js` is the public API route registry; route modules delegate to controllers, which use models, services, and utilities.
- `models/index.js` owns the shared Sequelize model registry and associations; `config/database.js` owns the connection.
- Startup requires successful database authentication. A database failure prevents the HTTP server and background jobs from starting. Database and other shared infrastructure remain cross-module failure risks.
- Airtel, PayChangu, email, and SMS integrations have focused adapters/utilities but require environment configuration and external systems. Their fallback and retry behavior must be verified per task.
- There is no configured automated test runner. `scripts/test-*` files are credential- or integration-dependent utilities, not an isolated automated suite.

## Working Set — Start Here

- `AGENTS.md` — permanent workflow and authority rules.
- `docs/COMPONENT_MAP.md` — task ownership and navigation.
- `docs/DECISIONS.md` — approved authority and unresolved decisions.
- `API_DOCUMENTATION.md` — primary backend contract when an API task is requested.

## Other Relevant Paths — On Demand

- `server.js` — startup, middleware ordering, global failure behavior, or health checks.
- `routes/index.js` — route ownership and API mounting.
- `models/index.js` — model registration and associations.
- `database/migrations/` — database evolution and compatibility evidence.
- `mobile-app/src/api/client.js` — bundled mobile API client integration.

## Decisions / Constraints

- Existing documentation remains in place; no archival or consolidation has been approved.
- Do not resolve product naming or documentation contradictions by inference.
- Preserve public behavior unless a task explicitly requests a contract change.

## Known Issues / Risks / Unresolved Questions

- The repository uses Chiwaya, Techaven, and TecHaven names; the canonical product name is not established.
- Several documents overlap and may describe different implementation periods.
- `SUBSCRIPTION_API.md` and `docs/SUBSCRIPTION_ACCESS_ARCHITECTURE.md` are referenced in older documentation text but do not exist in this checkout.
- Runtime checks depend on a database, credentials, or third-party services and have not been run for this documentation baseline.

## Verification

- Documentation baseline: path/link checks, `git diff --check`, and Git status review are required at its commit checkpoint.
- Not run: application startup, migrations, database operations, and external integration scripts because this is documentation-only work and those checks require configured dependencies.

## Chunk Progress / Commit Checkpoints

- Plan: documentation baseline implemented as one focused chunk.
- Push authorization: not authorized; keep commits local.
- Next chunk: none established.
- Remaining blockers: explicit task requirements are needed before application changes.

## Next Concrete Actions

1. Read the authority record and use the component map to locate the next requested change.
2. Reconcile only the documentation relevant to that task, preserving unresolved conflicts.
3. Add focused automated tests when changing behavior in a module that currently lacks coverage.

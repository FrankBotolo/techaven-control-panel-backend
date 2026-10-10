# Durable Decisions

Record only decisions supported by explicit approval or durable project evidence. Unresolved matters remain unresolved rather than being converted into assumptions.

## D-001 — Documentation authority and precedence

Status: Accepted

Date or source: User approval on 2026-10-10 (selected proposed option 1, “Tiered authority”)

Context: The repository contains overlapping backend, mobile, setup, and feature Markdown from different implementation periods. The README uses “Chiwaya,” other files use “Techaven” or “TecHaven,” and some documents reference files absent from the checkout. Treating every document as equally authoritative would create ambiguous requirements.

Decision:

1. Higher-priority platform instructions remain binding, and the user's current explicit directions govern the current task.
2. `API_DOCUMENTATION.md` is the primary backend API contract.
3. `docs/AIRTEL_WEBHOOK.md`, `docs/OWNER_REGISTRATION.md`, and `docs/SUBSCRIPTION_PACKAGES.md` are authoritative only for their focused areas. Within those areas, use the focused document alongside the primary contract and ask the user to resolve material conflicts.
4. All other Markdown, including `mobile-app/README.md`, remains reference material pending explicit approval.
5. Implementation, migrations, and executable checks describe observed behavior and compatibility constraints; they do not silently supersede approved intended requirements.
6. Existing documentation will remain in place until a separate review establishes safe consolidation or archival.

Rationale: This preserves the most comprehensive API document and the maintained focused integration documents without turning older summaries or setup notes into competing specifications.

Consequences: Agents must flag conflicts instead of choosing silently. Frontend/mobile requirements remain unapproved. Product naming remains unresolved. Missing documents must not be reconstructed from references alone.

Related files: `AGENTS.md`, `docs/CURRENT_STATE.md`, `docs/COMPONENT_MAP.md`, `API_DOCUMENTATION.md`

## D-002 — Canonical product name

Status: Proposed / unresolved

Date or source: Documentation inventory on 2026-10-10

Context: Repository documentation and package metadata use Chiwaya, Techaven, and TecHaven.

Decision: No canonical product name has been approved. Preserve existing names unless a task explicitly establishes the desired name and migration scope.

Rationale: Renaming could affect public documentation, clients, environment setup, database names, and branding beyond this documentation-state task.

Consequences: The inconsistency remains visible and must not be “fixed” opportunistically.

Related files: `README.md`, `package.json`, `API_DOCUMENTATION.md`, `mobile-app/README.md`

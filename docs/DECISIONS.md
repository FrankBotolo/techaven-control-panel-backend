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

## D-003 — Additive catalogue marketplace API v2

Status: Accepted

Date or source: User-approved implementation plan on 2026-10-10

Context: The legacy `products` table combines canonical product facts with seller price, stock, media, and shop ownership. Migrating it in place would break current clients and risk production data.

Decision: Keep MySQL and all v1 product contracts. Introduce canonical brands/devices/variants/colors and seller listings beneath `/api/v2`. Use MySQL JSON, keep quantity on seller listings, require condition evidence images, enforce one active offer per shop/variant/color/condition, and stage uncertain legacy matches for administrator review. TechAPI is a normalized, attributed import source rather than the runtime schema.

Rationale: An additive version permits catalogue ownership and multi-seller offers without destructive migration or silent response changes.

Consequences: V1 and v2 coexist until a separately approved retirement. Reviews, favorites, banners, and legacy promotions remain v1 concepts. Deployments must apply ordered v2 migrations before serving v2 traffic.

Related files: `docs/CATALOGUE_API_V2.md`, `routes/v2/`, `database/migrations-js/`

## D-004 � Customer authentication API v2

Status: Accepted

Source: User-approved implementation plan, 2026-10-12.

Customer storefront authentication supports Google and email/password beneath `/api/v2/auth`. Existing accounts and v1 APIs are preserved. V2 uses fifteen-minute access JWTs and thirty-day absolute, revocable sessions with rotated HttpOnly refresh cookies; storefront access tokens remain in memory. Google email matches require the existing password before linking, and new identities are customers only. Seller/admin/delivery-agent and Strapi admin flows remain separate. The full contract and configuration are in `docs/AUTH_API_V2.md`. Live Google verification depends on creating the OAuth web client; verification/recovery delivery requires configured SMTP.

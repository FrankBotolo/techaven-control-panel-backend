# Customer authentication API v2

Approved scope: user implementation request, 2026-10-12. Existing customers and commerce records are reused. V1 routes and seller/admin/delivery-agent flows remain available. Strapi admin authentication is separate.

## Session contract

All endpoints use `{ success, message, data }`. Errors additionally include a stable `code` and optional `fields`. Auth responses are `Cache-Control: no-store`.

Successful sign-in/verification/refresh returns:

```json
{ "access_token": "<access JWT>", "token_type": "Bearer", "expires_in": 900, "user": { "id": 1, "role": "customer" } }
```

The actual user DTO also includes name, email, phone number, avatar, verification state, shop ID, points, creation date and membership date. No password or refresh token is returned in JSON.

- Access JWT: HS256, issuer `techaven-auth-v2`, audience `techaven-storefront`, claims `id`, `sid`, `type: access`, `version: 2`; lifetime 15 minutes.
- Refresh token: 32 random bytes, opaque; SHA-256 hashes stored in MySQL. Each refresh consumes the previous token and issues a new cookie in one transaction.
- Session expiry is absolute at 30 days, not extended by refresh. Reusing any consumed token revokes the entire session. Consumed hashes remain until session expiry so reuse can be detected.
- Cookie `techaven_refresh_v2`: host-only, HttpOnly, SameSite=Lax, Path=/api/v2/auth. Secure by default and always Secure for HTTPS origins. Non-Secure is allowed only when explicitly enabled for an allowed HTTP development origin.
- Logout revokes the current session and clears the cookie. Password reset revokes all v2 sessions for that customer. Shared auth middleware checks session/account status on every v2 authenticated request, including existing commerce endpoints.
- V1 access-token behavior remains compatible; explicit refresh-type bearer tokens are rejected. V1 stateless sessions are not migrated or revoked by a v2 password reset.

## Endpoints

Every POST requires an exact allowed `Origin` header. Cookies are forwarded by the storefront same-origin `/api` proxy. `/me` requires the access JWT as a Bearer token.

| Method and path under `/api/v2/auth` | Body / behavior |
| --- | --- |
| POST `/register` | `full_name`, `email`, `password`, optional `phone_number`. New passwords: at least 12 characters, maximum 72 UTF-8 bytes. Role is always customer. Existing registration cannot replace account credentials. Sends a signup code to eligible unverified accounts. |
| POST `/login` | `email`, `password`. Requires active customer with verified email. Existing legacy passwords can still be used. |
| POST `/verify-otp` | `email`, `otp`, `type: signup`. Verifies email and issues a session. |
| POST `/resend-otp` | `email`, `type: signup` or `password_reset`. Generic eligibility response. |
| POST `/forgot-password` | `email`. Generic eligibility response, including provider delivery failure. |
| POST `/reset-password` | `email`, `otp`, `new_password`. Updates password, verifies email and revokes all v2 sessions. Does not sign in automatically. |
| POST `/google/challenge` | Empty JSON object. Returns `challenge_id`, `nonce`, `client_id`. Challenge expires after five minutes. |
| POST `/google` | `id_token`, `challenge_id`, `nonce`. Verifies Google token and consumes the nonce. Returns a session or `{ link_required: true, linking_challenge }`. |
| POST `/google/link` | `linking_challenge`, `password`. Requires existing account password; single-use challenge expires after five minutes. Returns a session with the same customer ID. |
| POST `/refresh` | Empty JSON object; reads HttpOnly cookie. Rotates refresh token and returns a fresh access JWT/user. |
| POST `/logout` | Empty JSON object; reads cookie. Idempotent for an absent/unknown cookie. Database failure is reported instead of claiming logout succeeded. |
| GET `/me` | Bearer access JWT; returns the current customer DTO. |

Verification codes are six cryptographically random digits, expire after ten minutes and permit five failed attempts. Issuing a new code invalidates previous codes for that user/type. Failed email delivery invalidates the newly generated code. V1's verification format/lifetime is unchanged.

Rate limits are shared database counters: 60 auth POST attempts per IP per 15 minutes (excluding refresh/logout), 10 login/verification/reset attempts per email per 15 minutes, three registration/code requests per email per ten minutes. Configure trusted proxy IPs/CIDRs explicitly when deployed behind a reverse proxy; arbitrary forwarded headers are not trusted.

Google identities are matched by verified subject first. A matching email does not merge accounts automatically: the existing password must be confirmed. No-password matches require password recovery; conflicting identities, inactive accounts and non-customer roles are rejected. The Google library verifies signature, issuer, expiry and audience; service validation additionally requires nonce, subject and verified email. New Google customers do not require a phone number until a commerce flow needs one.

Stable errors include `VALIDATION_ERROR`, `INVALID_CREDENTIALS`, `EMAIL_UNVERIFIED`, `ACCOUNT_UNAVAILABLE`, `SESSION_INVALID`, `ACCESS_EXPIRED`, `CHALLENGE_INVALID`, `RATE_LIMITED`, `ORIGIN_FORBIDDEN`, `DELIVERY_UNAVAILABLE`, `GOOGLE_UNAVAILABLE`, `GOOGLE_TOKEN_INVALID`, `GOOGLE_IDENTITY_CONFLICT`, `ACCOUNT_RECOVERY_REQUIRED`, `AUTH_UNAVAILABLE` and `REGISTRATION_UNAVAILABLE`.

## Environment and migration

Backend configuration:

- `AUTH_V2_JWT_SECRET`: unique random secret, at least 32 characters. Required to issue/verify v2 sessions; no fallback. Store outside source control.
- `AUTH_V2_ALLOWED_ORIGINS`: comma-separated exact browser origins, without trailing slash. Explicitly include each approved localhost, HTTPS tunnel or production origin.
- `AUTH_V2_ALLOW_HTTP`: false by default; enable only for local HTTP development. HTTPS cookies remain Secure.
- `GOOGLE_CLIENT_ID`: Google OAuth web client ID; must match the button's client ID. No client secret is needed for this Google Identity Services ID-token flow.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM_EMAIL`: existing email provider configuration, required for verification/recovery delivery.
- `TRUST_PROXY`: optional comma-separated trusted reverse-proxy IPs/CIDRs. Do not set `true` or a blanket forwarded-header trust policy.

Frontend configuration:

- Browser requests always use the same-origin `/api` proxy. They no longer use the browser's `VITE_TECHAVEN_API_URL` to send credentials across origins.
- `VITE_TECHAVEN_SERVER_API_URL`: backend address reachable from the frontend server, e.g. `http://host.docker.internal:8000` for local Docker, or a private HTTPS backend address for deployment. It is a build-time setting, not a credential.
- Vite development uses existing `TECHAVEN_PROXY_TARGET`; production forwards API requests in the existing server entry. Both must reach the same backend. Keep authenticated requests uncached.

Run the additive auth migration after the existing users table exists:

```sh
node scripts/run-migrations.js up --only=202610120001-create-auth-v2.js
node scripts/run-migrations.js status --only=202610120001-create-auth-v2.js
```

The explicit `--only` option is necessary on this local database because earlier catalogue tables were bootstrapped without migration ledger entries. It does not mark those older migrations applied. Do not run the entire historical migration chain against the seeded database until that separate ledger issue is reconciled.

Normal fresh installs with an accurate ledger can run the full ordered migration chain. The auth migration creates only four additive tables: sessions, refresh hashes, challenges and rate counters. It does not reset users or commerce records.

Run `node scripts/cleanup-auth-v2.js` as an operator maintenance job daily. It removes auth rows expired more than one day ago, retains all active sessions and keeps consumed refresh hashes until session expiry. No cleanup scheduler is installed automatically.

## Google Cloud setup

1. Create/select a Google Cloud project and configure the OAuth consent screen for Techaven. Use only Google identity/profile/email sign-in; no Gmail access is needed. While the app is in testing, add intended Google test users.
2. Create an OAuth client with application type **Web application**.
3. Add exact authorised JavaScript origins: `http://localhost:3001`, `https://fleta-noncontinuable-freya.ngrok-free.dev`, and the eventual HTTPS production storefront origin. Add `http://127.0.0.1:3001` only if it is used. Ordinary LAN HTTP is suitable for password testing, not Google's HTTPS-origin requirement.
4. Put the web client ID in backend `GOOGLE_CLIENT_ID`; restart/recreate the backend. Ensure all storefront origins are also in `AUTH_V2_ALLOWED_ORIGINS`, and the ngrok hostname remains explicitly allowed by Vite. Changing the tunnel hostname requires updating both configurations and Google Cloud.
5. The storefront obtains the public client ID from `/google/challenge`. No frontend Google secret/configuration is required. The SDK uses an explicit popup button, without One Tap or automatic sign-in; no redirect callback URL is used in this flow.
6. Test a new Google customer, returning sign-in, password confirmation for an existing account, cancellation, logout/reload and an inactive account. Record results without copying ID tokens, cookies or passwords into logs.

References: [Google web-client setup](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid), [server verification](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token).

## Verification and rollout

- Backend unit tests cover secure defaults and additive migration behavior. MySQL integration tests cover customer endpoints, challenge replay/attempt limits, Google payload failures/linking, role restrictions, refresh rotation/reuse/concurrency, revocation and v1 access compatibility. Google and email provider calls are controlled test doubles, not live external calls.
- Frontend tests cover restoration, shared refresh, expiry renewal, transient network failures, confirmed rejection, logout races, bounded retries, safe redirects, Google button/linking fallback and basket ownership.
- Production build and direct requests through the built production proxy verify cookie forwarding, login, refresh, profile, logout/revocation and origin rejection.
- Desktop/mobile browser checks verify email sign-in, page reload restoration, authenticated Galaxy A05 basket insertion/clearing, logout, signup fields and keyboard-accessible password recovery. Temporary test customer/basket records were removed.
- Local backend/frontend are running with the additive migration and an ignored generated v2 secret. Existing v1 users and seeded shops/listings remain unchanged. Google remains unavailable until its web client is configured; email provider setup must be verified before enabling new-customer verification delivery.
- Do not describe live Google sign-in as verified until the web client is created and those checks are run. Existing unrelated frontend TypeScript diagnostics remain outside this auth work; the production build passes.

# Vahan AI — secure RC-first verification with public partner access

Vahan AI is a Next.js application with two separated experiences: a secured administrator/agent workspace and a no-login public partner lookup at `/partner`. Both use the same server-only Surepass RC V2 adapter. The public partner page returns only an allowlisted set of non-owner vehicle fields; owner name and other personal details remain unavailable on that public path. Provider credentials stay on the server.

## Included in this rebuild

- Mobile-responsive admin and public partner web apps with English, Hindi and Marathi labels.
- WhatsApp share action that opens a pre-filled partner invitation message; the sender chooses the contact and confirms sending.
- Installable partner PWA with an Add to Home Screen flow and no-cache service worker (vehicle/API data is never cached).
- No-login partner route at `/partner`, separate from the secured admin route.
- Public RC API requires explicit lawful-purpose confirmation, Upstash limits of 3 checks per 5 minutes and 5 checks per India calendar day per public IP/network, and fails closed when the limiter is unavailable. The daily quota resets at 12:00 AM IST.
- Public responses exclude owner name, address, mobile, chassis, engine and verification score.
- Registration-first lookup with optional chassis/engine cross-check inputs.
- Browser voice input for the registration number where Web Speech API is supported.
- Supabase email/password login and server-side session verification.
- Production allowlist for approved agent email addresses.
- Zod request validation, same-origin checking, body-size limit and no-store responses.
- Shared Upstash rate limits: 20 lookups per user per 10 minutes and 200 per rolling day.
- Server-only Surepass adapter, HTTPS validation, production sandbox guard and registration mismatch check.
- Unit tests and GitHub Actions for lint, type-check, test and production build.

## Environment variables

Configure these values in your deployment provider. Do not commit real values to Git.

Select the RC provider with `VEHICLE_PROVIDER` (`surepass` is the default; `eko` enables Eko's Vehicle & RC UAT adapter). Eko requires server-side `EKO_DEVELOPER_KEY`, `EKO_ACCESS_KEY`, and `EKO_INITIATOR_ID`. In Preview, the adapter defaults to Eko's documented UAT base URL `https://staging.eko.in/ekoapi/v3`. It signs each request server-side using Eko's documented timestamped HMAC scheme. Do not put any Eko credential in a `NEXT_PUBLIC_*` variable. Eko production activation must use a production URL and credentials issued/approved by Eko; the staging host is rejected when the app runs in Production.

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public publishable key; alternatively use `NEXT_PUBLIC_SUPABASE_ANON_KEY` for an older Supabase project |
| `ALLOWED_AGENT_EMAILS` | Comma-separated approved agent emails; mandatory in production |
| `VEHICLE_API_BASE_URL` | Surepass base URL confirmed for the selected environment |
| `VEHICLE_API_KEY` | Server-side Surepass bearer token |
| `APP_MODE` | `sandbox` during testing; `production` for a live deployment |
| `UPSTASH_REDIS_REST_URL` | Upstash REST endpoint |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash REST token |

The sandbox base URL in `.env.example` is for development only. Surepass must supply/confirm the correct live production URL and activate live API access. The app deliberately fails closed in production if the provider URL, live mode, credentials, agent allowlist, or rate limiter is missing.

## Setup on Supabase

1. Create or select the Vahan AI Supabase project.
2. Enable email/password sign-in.
3. Disable public sign-ups. Create agent accounts from the Supabase admin interface instead.
4. Copy the project URL and public publishable key into Vercel environment variables.
5. Set the production Site URL and allowed redirect URL to the deployed Vahan AI domain.
6. Add the agent's exact sign-in email to the server-side `ALLOWED_AGENT_EMAILS` variable.

Never use a Supabase service-role key in browser code or as a `NEXT_PUBLIC_*` variable.

## Setup on Upstash

1. Create a Redis database in Upstash.
2. Copy its REST URL and REST token into Vercel.
3. Do not enable production traffic until both values are set. Production requests are denied when the rate-limit service is not configured or cannot be reached.

## Setup Surepass

1. Obtain live RC V2 access and the official production endpoint from Surepass.
2. Put its live base URL in `VEHICLE_API_BASE_URL` and its production bearer token in `VEHICLE_API_KEY`.
3. Set `APP_MODE=production` in Vercel's Production environment.
4. Never put the token in client code, a public variable, README, screenshot or chat.

## Run locally

Use Node.js 22 or a supported newer LTS release.

```sh
npm install
npm run dev
```

For validation:

```sh
npm run lint
npm run typecheck
npm test
npm run build
```

## Vercel deployment

1. Open the Vahan AI Vercel project and go to Settings → Environment Variables.
2. Add the variables above to the appropriate Preview and Production environments. Preview should use sandbox credentials; Production must use approved live credentials.
3. Deploy the rebuild branch as a Preview deployment first.
4. Verify the login page, unauthenticated API rejection, rate-limit behavior, and an approved test vehicle lookup.
5. Merge the reviewed rebuild pull request only after all CI checks pass.
6. Configure Production variables, deploy the new main commit and complete a real authenticated smoke test.

A green build does not confirm that external credentials are valid. Live production readiness requires a real lookup against Surepass's approved production endpoint.

## Public partner sharing and mobile installation

1. Share the deployed `/partner` URL with partners. The Share on WhatsApp button opens WhatsApp with a pre-filled message; the user selects a recipient and sends it.
2. On Android Chrome, use the Install app/Add to Home screen action. On iPhone, open the link in Safari, tap Share, then Add to Home Screen.
3. The partner route does not require a Supabase account. In this no-login beta, the five-per-day quota is enforced per public IP/network, not per verified person; partners sharing one office/home Wi-Fi share the quota, and changing networks can change the IP bucket. For reliable person-wise quotas and partner identity, add mobile OTP registration in the later Android app. The route requires affirmative lawful-purpose confirmation and server-side Upstash rate limiting.
4. In Vercel Settings → Deployment Protection, Vercel Authentication can protect Preview URLs separately from Vahan AI application authentication. For a shareable Preview test, turn off Require Log In for Preview only (or create a deployment-specific shareable bypass link). Do not disable protection across Production deployment URLs. The Vercel setting does not replace application/API security.

## Privacy and scope

The public route displays only the allowlisted fields returned by the provider, and does not invent a confidence score. Owner name, address, mobile, chassis, engine and verification score are not returned on the anonymous partner API. Owner-related data must be used only with proper authorization and a lawful purpose. Reverse lookups for private mobile numbers, PAN details or personal addresses are not included in this MVP; they require separate, documented authorization and compliant data sources.

## Public partner rollout checklist

- [ ] Preview deployment uses the `rebuild/vahan-ai-clean` branch and is publicly reachable (or has a deployment-specific shareable link).
- [ ] Upstash Redis REST URL/token are configured in Preview and Production for anonymous rate limiting.
- [ ] `/partner` opens on a mobile browser without requiring Vercel or Supabase login.
- [ ] WhatsApp share opens with the correct `/partner` URL.
- [ ] Android Add to Home Screen and iPhone Safari Add to Home Screen are tested.
- [ ] Public API returns only allowlisted non-owner vehicle fields.
- [ ] Public IP limit is 3 per 5 minutes and 5 per India calendar day; midnight IST reset and fail-closed behavior are verified.
- [ ] Explain to pilot partners that one shared Wi-Fi/network shares the same free quota.

## Production checklist

- [ ] Supabase Auth configured; public sign-ups disabled.
- [ ] Approved agent accounts created and their emails added to `ALLOWED_AGENT_EMAILS`.
- [ ] Upstash Redis REST URL/token set in Production.
- [ ] Surepass live RC V2 access activated.
- [ ] Official live HTTPS endpoint and live bearer token configured server-side.
- [ ] `APP_MODE=production` set in Production.
- [ ] CI and production build pass.
- [ ] Live sign-in, unauthorized access rejection, rate limit and valid RC lookup verified.

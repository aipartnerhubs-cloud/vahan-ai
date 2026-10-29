# Vahan AI — RC-first vehicle verification

Vahan AI is a Next.js App Router application that retrieves vehicle RC data from the configured Surepass RC V2 API. Provider calls are made from the server; the browser must never receive the Surepass credential.

## Request and authentication flow

1. An approved agent signs in on `/login` with Supabase Auth email/password.
2. `middleware.ts` validates the Supabase session and refreshes auth cookies. Unauthenticated page requests are redirected to `/login`; unauthenticated API requests are rejected.
3. `POST /api/rc` independently checks the session, same-origin browser requests, request size, and input schema.
4. A durable Upstash Redis rate limiter enforces per-user lookup quotas before contacting Surepass.
5. `lib/vehicle-service.ts` calls Surepass with a server-side Bearer credential and normalizes the response.
6. RC responses are marked no-store. Logs intentionally omit credentials, upstream bodies, and owner data.

## Required environment variables

Configure these in the hosting provider's environment settings. Do not commit real values to GitHub, and never share secrets in chat.

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase public publishable key; alternatively use `NEXT_PUBLIC_SUPABASE_ANON_KEY` for an older project |
| `VEHICLE_API_BASE_URL` | Official Surepass API base URL for the selected environment |
| `VEHICLE_API_KEY` | Surepass bearer credential; remains server-side only |
| `APP_MODE` | `sandbox` for development or `production` for a live deployment |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST endpoint for durable rate limiting |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST token; server-side only |

The template in `.env.example` illustrates the expected names. Do not copy placeholder values into production. In a production deployment/runtime, the app rejects a missing provider URL, a non-HTTPS URL, a sandbox hostname, or an `APP_MODE` other than `production`. Vercel Preview can use `APP_MODE=sandbox` with an explicitly configured sandbox URL. The exact live Surepass base URL must come from your approved Surepass account documentation; this repository does not guess it.

## Supabase Auth setup

1. Create or select a Supabase project.
2. Copy the project URL and public publishable key into the hosting settings as shown above. Do not use a service-role key in the browser or in any `NEXT_PUBLIC_*` variable.
3. Enable email/password sign-in.
4. Disable public sign-ups so only accounts created/invited by your administrator can access the app. Do not expose a public registration flow.
5. Create the intended agent accounts in Supabase Auth and set their credentials using the normal Supabase admin workflow.
6. Add the production URL to the allowed Site URL / redirect configuration in Supabase.
7. Redeploy after setting the environment variables.

If Supabase is not configured, the app redirects to a setup/login screen and every API request fails closed with HTTP 503. This is intentional: an unconfigured app must not expose the RC lookup endpoint.

## Upstash rate-limit setup

Create a Redis database in Upstash and configure `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` in the production environment. The current limits are 20 RC lookups per user per rolling 10 minutes and 200 per user per rolling day. Limits are stored in Redis so they are shared across serverless instances. If the limit service is absent or unavailable in production, the endpoint fails closed instead of making an unmetered provider call.

## Surepass provider setup

For local development, the service defaults to the sandbox base URL if `VEHICLE_API_BASE_URL` is omitted. Production never uses that fallback. Set `APP_MODE=production`, an approved HTTPS live base URL, and the real server-side token in the hosting environment. Never prefix the provider credential with `NEXT_PUBLIC_`.

## Run and validate

Use Node.js 22 or a version supported by the configured Next.js release.

```bash
npm install
npm run lint
npx tsc --noEmit
npm test
npm run build
```

GitHub Actions runs the same checks on pushes and pull requests. A CI pass validates the code in the runner; it does not prove that production credentials are valid or that the deployed provider API is reachable.

## Deployment checklist

- [ ] Set Supabase URL and public key in production environment settings.
- [ ] Disable public Supabase sign-ups and provision agent accounts.
- [ ] Set the official live Surepass base URL, server-side bearer credential, and `APP_MODE=production`.
- [ ] Configure Upstash Redis URL/token.
- [ ] Confirm all environment variables are assigned to the correct Vercel environment (Production, not only Preview).
- [ ] Run CI and review build/dependency warnings.
- [ ] Deploy, then verify sign-in, rejected unauthenticated RC requests, rate limiting, and a legitimate test RC lookup.
- [ ] Rotate provider credentials immediately if they were ever exposed in logs, chat, client code, or a committed file.

## Security boundaries and limitations

- Supabase's public publishable/anon key is designed for browser use; the Surepass bearer credential and Upstash token are not.
- This application deliberately has no public sign-up screen. Account lifecycle and access provisioning are an administrator responsibility.
- Rate limiting is per authenticated Supabase user; if you need contractual or per-agent quotas, persist usage and billing records separately.
- Do not treat owner/vehicle details as public data. Restrict access, retention, logs, and exports according to your purpose and applicable obligations.
- Live deployment is not complete until the required hosting secrets are configured and a real production smoke test succeeds.

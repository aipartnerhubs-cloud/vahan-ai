# Vahan AI — clean RC-first vehicle verification

Vahan AI is a Next.js application for authenticated vehicle-registration lookups through an approved Surepass RC V2 account. It starts with vehicle registration number lookup; a document upload is not required for the first lookup. Provider credentials stay on the server.

## Included in this rebuild

- Mobile-responsive web app with English, Hindi and Marathi labels.
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

## Privacy and scope

The app displays only fields returned by the configured provider, and it does not invent a confidence score. Owner-related data must be used only with proper authorization and a lawful purpose. Reverse lookups for private mobile numbers, PAN details or personal addresses are not included in this MVP; they require separate, documented authorization and compliant data sources.

## Production checklist

- [ ] Supabase Auth configured; public sign-ups disabled.
- [ ] Approved agent accounts created and their emails added to `ALLOWED_AGENT_EMAILS`.
- [ ] Upstash Redis REST URL/token set in Production.
- [ ] Surepass live RC V2 access activated.
- [ ] Official live HTTPS endpoint and live bearer token configured server-side.
- [ ] `APP_MODE=production` set in Production.
- [ ] CI and production build pass.
- [ ] Live sign-in, unauthorized access rejection, rate limit and valid RC lookup verified.

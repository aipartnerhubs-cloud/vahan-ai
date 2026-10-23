# Vahan AI

**RC-first vehicle information and verification MVP for India.**

## First working increment

- Next.js App Router + TypeScript foundation
- Registration-number input validation using Zod
- Demo lookup API: `POST /api/verify`
- Three illustrative sample records
- Transparent per-check status and printable report
- Server-only configuration and adapter contract for future vehicle-data providers
- Sandbox integration placeholders for RC V2, RC TEXT, and OCR Vehicle RC

**Not connected to any official vehicle database yet.** Demo data is illustrative and must not be used for real vehicle, RC, ownership, legal, lending, or insurance decisions.

## Run locally

Requirements: Node.js 20.9+ and npm.

```bash
npm install
npm run dev
```

Open http://localhost:3000. Try `MH12AB1234`, `DL8CAF1234`, or `KA03MN2024`.

## API example

```bash
curl -X POST http://localhost:3000/api/verify \
  -H 'Content-Type: application/json' \
  -d '{"registrationNumber":"MH12AB1234"}'
```

Invalid JSON and invalid-format registration numbers return HTTP 400. A valid-format number with no demo match is not evidence that a real vehicle is invalid.

## Sandbox provider setup

Copy `.env.example` to `.env.local` only when configuring your sandbox. Set the base URL, secret, and exact endpoint paths from the provider's official documentation:

- `VEHICLE_API_BASE_URL`
- `VEHICLE_API_KEY`
- `VEHICLE_API_RC_V2_PATH`
- `VEHICLE_API_RC_TEXT_PATH`
- `VEHICLE_API_OCR_RC_PATH`

Do not invent endpoint paths or authentication headers. The screenshot of API access confirms product access but does not specify the HTTP contracts, so the three live API calls are not yet wired. Never use `NEXT_PUBLIC_*` for API secrets and never commit credentials.

## Planned next steps

1. Confirm provider documentation and exact request/response formats for RC V2, RC TEXT, and OCR Vehicle RC.
2. Implement server-side provider adapters with timeouts, response validation, safe error handling, and upload size/type restrictions for OCR.
3. Add tests and CI.
4. Add Supabase migrations, row-level security, authentication, and audit history only when persistence is needed.
5. Deploy and configure secrets through the hosting provider.


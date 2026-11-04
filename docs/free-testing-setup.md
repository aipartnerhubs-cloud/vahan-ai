# VAHAN AI — Free Testing Setup

## Current integration baseline

The existing RC endpoint is `POST /api/rc`. The existing vehicle service currently calls Surepass RC V2 directly. Do not switch production traffic until a provider adapter is implemented, tested, and configured in the deployment environment.

## 1. Mockoon (zero-cost logic testing)

1. Install Mockoon Desktop or use its supported hosted/runtime option.
2. Create a local environment with `POST /api/rc`.
3. Use the scenarios in `test-fixtures/rc/mockoon-scenarios.json` as response fixtures.
4. Mark every response visibly as synthetic. Never use synthetic fixtures for customer decisions, insurance quotations, or claim assessments.
5. Exercise valid, expired-insurance, not-found, and upstream-unavailable cases.
6. Keep the Mockoon URL server-side in an environment variable. Do not expose provider credentials in browser code.

## 2. StampMitra RC sandbox

Documented contract:
- Base URL: `https://api-b2b.stampmitra.in`
- Method/path: `POST /v1/verify/rc`
- Body: `{ "vehicleNumber": "MH12AB1234" }`
- Auth: `Authorization: Bearer <sk_test_...>`
- Required scope: `verification.rc.read`
- Sandbox: free; 10 requests/minute and 200/day per organisation.

Create a sandbox account at https://developer.stampmitra.in/, create a key with the RC read scope, and store it only as `STAMPMITRA_API_KEY` in Vercel Environment Variables. Never commit the key or send it to the browser. StampMitra's sensitive RC scope may require backend IP/CIDR allowlisting; check the dashboard and deployment egress constraints before live calls.

The adapter must normalize the documented response keys (for example `regNo`, `registrationStatus`, `ownerName`, `vehicleManufacturerName`, `model`, `insuranceUpto`) into VAHAN AI's existing VehicleResult shape. It must preserve provider reference IDs for audit and must not invent missing fields.

## 3. API Setu transport sandbox

Start at https://sandbox.api-setu.in and the MoRTH transport collection at https://directory.apisetu.gov.in/api-collection/transport. Select the exact Registration of Vehicles / Vehicle Insurance Certificate / Fitness / Challan API that your use case is eligible to test. Record its published API ID, request schema, authentication, subscription/consent requirements, response schema, and sandbox test credentials before writing an adapter.

Do not guess a URL, payload, token format, or assume that an API collection listing grants production access. Keep this integration disabled until the selected API's published contract and authorization are available.

## 4. Separate insurance claim-history module

The claims API is deliberately separate from RC lookup. Until an authorized insurer/claims-data source is connected, it returns:
- status: `not_connected`
- records: `[]`
- a clear message that claim history is unavailable.

Do not derive claims from RC insurance validity, policy number, owner count, service history, or challan data. Do not create sample claim amounts, dates, insurers, or statuses. A future adapter must document its source, legal access basis, customer consent/purpose, supported fields, freshness, and audit/reference ID.

## 5. Deployment configuration checklist

Add secrets only in Vercel Project → Settings → Environment Variables:
- `VEHICLE_PROVIDER` (future values: `mockoon`, `stampmitra`, `apisetu`; do not set until corresponding adapter is merged)
- `MOCKOON_RC_URL` (server-side only)
- `STAMPMITRA_API_KEY` (sandbox key only during testing)
- API Setu credentials only after the selected API's official onboarding.

Never put secrets in `NEXT_PUBLIC_*` variables. Keep Surepass disabled while testing alternatives so no accidental paid calls occur.

## 6. Acceptance tests before production

- Mock fixtures are visibly synthetic and cannot be confused with verified provider data.
- Registration number is normalized and validated server-side.
- Provider response registration number matches the requested number.
- Missing fields remain unavailable; no inferred owner/insurance/claim fields.
- 400, 401, 403, 429, 5xx, timeout and malformed JSON are handled safely.
- Claim endpoint returns no records while no authorized claims provider is configured.
- Provider source and request/reference ID are auditable without logging API keys or unnecessary personal data.
- Run `npm test` and `npm run build`; inspect the resulting CI/deployment before promoting.


## Implemented StampMitra adapter

The preview branch now supports `VEHICLE_PROVIDER=stampmitra` and calls:
- `POST https://api-b2b.stampmitra.in/v1/verify/rc`
- JSON body: `{ "vehicleNumber": "..." }`
- Header: `Authorization: Bearer <STAMPMITRA_API_KEY>`
- Required key scope: `verification.rc.read`

The adapter maps only documented RC fields and stores the returned `referenceId`. It does not infer fuel, fitness, insurer, policy number, ownership history, challans, or claims history. `insuranceUpto` is shown as the date returned by the RC record, not as insurer-confirmed coverage.

For the documented StampMitra sandbox fixtures, use:
- `SB00SA0001` — synthetic active RC
- `SB00SA0002` — synthetic not-found/invalid result
- `SB00SA0004` — synthetic expired RC

These identifiers are accepted only when `VEHICLE_PROVIDER=stampmitra`; they are not accepted by the Surepass provider path. The UI labels StampMitra results as sandbox sample data.

For the branch-specific Vercel Preview deployment, set:
- `STAMPMITRA_API_KEY` = the sandbox key (Secret, Preview, branch `feature/free-testing-stack`)
- `VEHICLE_PROVIDER` = `stampmitra` (Config, Preview, branch `feature/free-testing-stack`)

Do not set `VEHICLE_PROVIDER=stampmitra` in Production. The default provider remains Surepass.

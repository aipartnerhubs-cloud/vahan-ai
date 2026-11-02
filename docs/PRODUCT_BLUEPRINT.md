# Vahan AI — Product Blueprint

## Product direction
Build Vahan AI as a mobile-first vehicle intelligence and insurance operations application for authorized insurance partners. The no-login public partner lookup remains a separate, deliberately limited entry point. The secured Partner Workspace is the full application.

This blueprint is a product plan, not a claim that every listed service is already live.

## Access tiers
1. **Public partner lookup** — no account, basic provider-returned vehicle fields only, explicit lawful-purpose confirmation, five attempts per IP/network per India calendar day in the beta. This is not identity-verified per-person access.
2. **Authenticated partner** — Supabase sign-in, approved partner account, user-level rate limits, access only to fields allowed by provider contract and the recorded purpose/consent.
3. **RM/Admin** — future role-based console for partner onboarding, provider settings, limits, wallet ledger, support, usage and audit trails. Admin privileges must be enforced server-side, not only hidden in the UI.

## Main app navigation
- Overview
- Vehicle RC lookup
- RC search history
- Insurance details
- Challan status
- Insurance renewal workspace
- PDF reports
- Wallet and transactions
- Driving licence verification
- PAN verification
- Address verification
- IRDAI agent verification
- Partner support
- Profile, privacy and account controls

Only connected modules should be enabled. The dashboard may show planned modules, but must not imply an unconnected API is working.

## RC report sections
- Registration and vehicle status
- Vehicle class, maker, model, variant, fuel, capacity and seating, where supplied
- Registration date, RTO, fitness and PUC validity, where supplied
- Insurance insurer and validity fields, only where returned by the contracted source
- Financier/hypothecation, permit and tax information, only where available and authorized
- Owner identity/address fields in a separately permissioned section only when the provider agreement, lawful purpose and consent/authorization allow it
- Source, provider reference, lookup timestamp, data freshness and missing-field notices

Never guess missing values or convert an insurer/expiry field into a claim about full policy coverage. RC information alone does not provide complete policy wording, IDV, premium, add-ons or claim status.

## Insurance workflow
1. Start from the RC record.
2. Confirm customer/vehicle match and record the customer authorization.
3. Upload an existing policy or retrieve permitted insurer data through an authorized integration.
4. Extract policy number, insurer, dates, IDV, coverage, add-ons and NCB only from the actual policy/source.
5. Prepare quotes through authorized insurer/broking integrations.
6. Present payment links and renewal reminders only after the quote/transaction provider is configured.
7. Keep the issued policy document and transaction status in the customer's permitted record.

## PDF export
- Vahan AI branded report and report ID
- Field-level source and "not supplied" labels
- Generated date/time and lawful-purpose/consent reference where applicable
- Default redaction for personal identifiers; elevated export permission for any approved PII
- Secure, expiring share links; do not expose personal reports through public static URLs
- Audit who generated or downloaded a report

## Wallet and commercial model
- Provider cost and partner charge are configurable; never hard-code another app's price.
- Immutable ledger for recharge, debit, reversal, tax and invoice references.
- Do not debit partners for failed lookups; define retry/refund rules and idempotency.
- Separate public beta quota from future paid partner plans.

## Provider architecture
Use server-side adapters behind one normalized schema. Keep provider credentials out of browser code and logs. A provider switch must be an explicit configuration choice with provider-specific consent, purpose, contracts and field permissions. Do not fan out personal-data requests to multiple providers without authorization.

Potential provider evaluation: Surepass, HyperVerge, IDfy and Eko. Compare sandbox availability, supported fields, per-call cost, response accuracy, allowed use, production onboarding, uptime/SLA, deletion/retention, incident contacts and IP allowlisting. Provider API documentation describes technical capability; it does not itself establish our legal entitlement to every field.

## Privacy and security gates
- Separate public and authenticated APIs.
- Explicit and auditable purpose/consent before any personal-data lookup.
- Field-level access controls and least privilege.
- Encrypt provider secrets and stored reports; never expose them in browser-visible public environment variables.
- No public owner/mobile/PAN/address reverse search.
- Rate limiting, idempotency, abuse monitoring and fail-closed behavior.
- Short retention by default; documented deletion and retention exceptions.
- Admin and provider actions written to immutable audit logs.
- CERT-In empanelled security audit and required authority/provider approvals before production access to protected transport data.

MoRTH's 18 August 2025 National Transport Repository policy describes approval, purpose-specific data access, security audit, IP whitelisting and PII masking controls. Full personal data should not be assumed available merely because a commercial app advertises it.

## Delivery phases
### Phase 0 — foundation
- Separate public and authenticated entry points.
- Stable login/session flow and role model.
- Provider adapter, normalized RC output and reliable error handling.
- Daily quota, audit logs, health checks and CI/build gates.

### Phase 1 — usable partner MVP
- Dashboard and responsive sidebar/mobile navigation.
- RC lookup and search history.
- Field-level RC report.
- Branded PDF with personal data redacted by default.
- Partner profile, support and basic usage ledger.

### Phase 2 — insurance operations
- Policy upload/OCR and policy detail report.
- Insurance renewals and expiry reminders.
- Authorized insurer quote, payment and policy-issuance integrations.
- Partner wallet, recharge, invoices and refunds.

### Phase 3 — verification suite
- Challan, DL, PAN, address and IRDAI checks only after individual provider onboarding and permission review.
- Owner history only where legally permitted.
- RM/admin console and configurable partner plans.

### Phase 4 — Play Store release
- Production provider agreements and verified live credentials.
- Security and privacy review; privacy policy, in-app disclosures, consent, Data safety declarations and account/data deletion.
- Device testing, crash monitoring, backups, support process and store listing assets.
- Internal testing first, then closed testing and production access according to the account-specific Play Console requirements.

## Release rule
Do not publish to Play Store just because the UI is complete. Release only when each feature shown as live has a working production API, tested error and rate-limit paths, correct access controls, support coverage and clear data handling.

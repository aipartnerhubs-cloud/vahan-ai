# Vahan AI — Product Blueprint

## Product direction
Build Vahan AI as an independent, mobile-first Vehicle Intelligence application for authorized insurance partners and permitted customer use. It may offer a cleaner, faster experience for vehicle information, but it must not describe itself as a Government of India/NIC replacement or imply affiliation with NextGen mParivahan. Keep the no-login public partner lookup separate and deliberately limited; the secured Partner Workspace is the full application.

Positioning: **Vahan AI — Advanced Vehicle Intelligence & Partner Services**. Use Vahan AI branding, not the mParivahan name or government marks. This blueprint is a product plan, not a claim that every listed service is already live.

## Access tiers
1. **Public partner lookup** — no account, basic provider-returned vehicle fields only, explicit lawful-purpose confirmation, five attempts per IP/network per India calendar day in the beta. This is not identity-verified per-person access.
2. **Authenticated partner** — Supabase sign-in, approved partner account, user-level rate limits, access only to fields allowed by provider contract and the recorded purpose/consent.
3. **RM/Admin** — future role-based console for partner onboarding, provider settings, limits, wallet ledger, support, usage and audit trails. Admin privileges must be enforced server-side, not only hidden in the UI.

## Main app navigation
- Overview
- Vehicle RC lookup
- RC search history
- Owner and address details (permission-gated)
- Vehicle owner history (permission-gated)
- Fitness, PUC and permit status
- Challan and blacklist status
- Previous policy details
- Vehicle claim history (permission-gated)
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
- Owner name, father/spouse relation if provided, ownership serial number, owner count, present/permanent address, mobile number and ownership history only in a separately permissioned authenticated report when the provider contract, NTR/MoRTH approval (where required), lawful purpose and customer authorization allow it. Keep these fields off the anonymous public lookup.
- Source, provider reference, lookup timestamp, data freshness and missing-field notices

Never guess missing values or convert an insurer/expiry field into a claim about full policy coverage. RC information alone does not provide complete policy wording, IDV, premium, add-ons or claim status.

## Previous policy and claims — intentionally focused scope
Vahan AI's insurance screen should stay focused on the **previous/current policy record** and **claim history**. Do not expand it into a large quote/coverage comparison screen in this product phase.

### Previous policy details
- Insurer name, policy number, policy start/end or validity dates, policy type (TP / package / standalone OD), and policy status when verified.
- Store the uploaded policy schedule/renewal notice as the primary supporting document; extract IDV, NCB, add-ons or coverage wording only when they are explicitly present on that document or returned by the authorized insurer API.
- RC/NTR and common RC APIs may return insurer name, policy number and validity, but that does not prove the full policy wording, IDV, add-ons, NCB or claims record.

### Vehicle claim history
The claim screen may show claim number, insurer, claim/intimation date, date of loss, claim type/cause, status (intimated / under survey / approved / rejected / settled), estimated/approved/paid amount, surveyor/garage where supplied, settlement/repudiation date and reason, and NCB impact where verified. Each entry must show source and last-updated date.

**Important source limitation:** MoRTH's NTR shareable vehicle data lists insurance validity, insurer company name and policy number, but not a general vehicle-claims-history dataset. The Insurance Information Bureau (IIB) has insurer-facing motor policy/claims-history tools (including SUDARSHANA/VCHVS); any integration for Vahan AI must be confirmed with IIB/insurer and approved for this application and business role. Do not assume a public unrestricted claims API exists. Until such access is approved, accept a customer-provided claim statement/settlement letter or retrieve claims through that customer's insurer with documented authorization. Do not label an empty search as "No claims" unless an authorized source explicitly confirms that result.

IRDAI's 2025 information-maintenance regulations require insurers to keep detailed records of claims intimated and prescribe claims records that insurance intermediaries maintain when they serviced/processed the claim. This supports keeping a Vahan AI claim record for cases our authorized intermediary workflow actually handled; it does not grant access to every insurer's entire historical database.

## PDF export
- Vahan AI branded RC/owner/policy/claims report and report ID
- Field-level source and "not supplied" labels; show whether claim data is provider-verified or customer-document-derived
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

MoRTH's 18 August 2025 National Transport Repository policy lists vehicle-owner datasets (including name, address, mobile and owner history) but says PII is masked for API recipients except specifically approved full-access entities. Private-sector access is subject to MoRTH approval and customer consent; the policy also calls for CERT-In-empanelled security audit, IP whitelisting, application-specific credentials, access logs and annual renewal. Full personal data must therefore remain locked until the exact data access and use are approved.

The same policy lists the shareable insurance fields as validity, company name and policy number. It does not list claims history as a standard NTR vehicle field. For claims, evaluate IIB's insurer-facing SUDARSHANA/VCHVS service or an insurer's authorized claims API instead.

## Delivery phases
### Phase 0 — foundation
- Separate public and authenticated entry points.
- Stable login/session flow and role model.
- Provider adapter, normalized RC output and reliable error handling.
- Daily quota, audit logs, health checks and CI/build gates.

### Phase 1 — usable vehicle intelligence MVP
- Dashboard and responsive sidebar/mobile navigation.
- RC lookup, search history, fitness/PUC/permit and challan modules as provider coverage permits.
- RC report and source-labelled report history.
- Branded PDF with personal data redacted by default.
- Partner profile, support and basic usage ledger.

### Phase 2 — owner and previous-policy data
- Owner details, address and owner history only after the data recipient has the required source-specific access and customer authorization.
- Previous policy summary from approved source fields, policy upload/OCR and secure PDF document storage.

### Phase 3 — claim history and verification suite
- Evaluate IIB SUDARSHANA/VCHVS or an insurer-authorized claims API; obtain written eligibility, API/portal terms, allowed display fields and purpose approval before implementation.
- Until approval, allow the customer/agent to upload claim intimation, survey, approval, repudiation or settlement documents and show them as document-derived, not as an industry-wide claim search.
- DL, PAN, address and IRDAI checks only after individual provider onboarding and permission review.
- RM/admin console and configurable partner plans.

### Phase 4 — Play Store release
- Production provider agreements and verified live credentials.
- Security and privacy review; privacy policy, in-app disclosures, consent, Data safety declarations and account/data deletion.
- Device testing, crash monitoring, backups, support process and store listing assets.
- Internal testing first, then closed testing and production access according to the account-specific Play Console requirements.

## Release rule
Do not publish to Play Store just because the UI is complete. Release only when each feature shown as live has a working production API, tested error and rate-limit paths, correct access controls, support coverage and clear data handling.

/**
 * Separate insurance-claim-history boundary.
 *
 * RC providers are not treated as insurance-claims sources. Until an
 * authorized insurer/claims-data provider is configured, this module
 * returns an explicit unavailable state and never invents claim records.
 */

export type ClaimsHistoryStatus = 'not_connected' | 'available' | 'no_records';

export type InsuranceClaimRecord = {
  claimId: string;
  insurerName?: string;
  claimDate?: string;
  claimStatus?: string;
  claimAmount?: number;
  currency?: string;
  source: string;
};

export type ClaimsHistoryResult = {
  status: ClaimsHistoryStatus;
  records: InsuranceClaimRecord[];
  message: string;
  source: string | null;
};

export async function getInsuranceClaimsHistory(
  _registrationNumber: string
): Promise<ClaimsHistoryResult> {
  // Intentionally no RC-field fallback and no fabricated/sample claims.
  // Add a provider adapter here only after legal access, consent, and
  // a documented claims API contract have been approved.
  return {
    status: 'not_connected',
    records: [],
    message:
      'Insurance claim history is a separate service and is not connected yet. No claim records were supplied.',
    source: null,
  };
}

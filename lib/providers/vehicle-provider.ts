export type ProviderCheckStatus = "verified" | "not_found" | "needs_review" | "unavailable";

export type VehicleLookupResult = {
  status: ProviderCheckStatus;
  source: string;
  checkedAt: string;
  registrationNumber: string;
  fields: Record<string, string | number | boolean | null>;
  message: string;
};

/** Implement this contract only after confirming the provider's documented request/response schema. */
export interface VehicleProvider {
  lookupRegistration(registrationNumber: string): Promise<VehicleLookupResult>;
}

export class ProviderNotConfiguredError extends Error {
  constructor(message = "The official vehicle-data provider has not been configured.") {
    super(message);
    this.name = "ProviderNotConfiguredError";
  }
}

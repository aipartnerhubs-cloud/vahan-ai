import type { VehicleResult } from '@/lib/vehicle-service';

export type PublicVehicleResult = Omit<VehicleResult, 'ownerName' | 'verificationScore' | 'warnings'>;

/**
 * Allowlist only generic vehicle fields for no-login partner access.
 * Never expose owner name, address, mobile, chassis, engine or confidence score.
 */
export function toPublicVehicleResult(result: VehicleResult): PublicVehicleResult {
  return {
    registrationNumber: result.registrationNumber,
    status: result.status,
    make: result.make,
    model: result.model,
    fuelType: result.fuelType,
    registrationDate: result.registrationDate,
    insuranceStatus: result.insuranceStatus,
    fitnessStatus: result.fitnessStatus,
    source: result.source,
  };
}

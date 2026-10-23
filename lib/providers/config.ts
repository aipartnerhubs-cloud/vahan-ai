/** Server-only provider configuration. Never expose these values to client components. */
function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing server environment variable: ${name}`);
  return value;
}

export type ProviderName = "rc-v2" | "rc-text" | "ocr-vehicle-rc";

export function getProviderConfig() {
  return {
    baseUrl: required("VEHICLE_API_BASE_URL").replace(/\\/$/, ""),
    apiKey: required("VEHICLE_API_KEY"),
    // Endpoint paths must be set to the exact values documented by the API provider.
    endpoints: {
      rcV2: required("VEHICLE_API_RC_V2_PATH"),
      rcText: required("VEHICLE_API_RC_TEXT_PATH"),
      ocrVehicleRc: required("VEHICLE_API_OCR_RC_PATH")
    }
  };
}

export function providerEndpoint(path: string, baseUrl: string) {
  if (!path.startsWith("/") || path.startsWith("//")) {
    throw new Error("Provider endpoint paths must be absolute paths beginning with a single slash.");
  }
  return new URL(path, baseUrl).toString();
}

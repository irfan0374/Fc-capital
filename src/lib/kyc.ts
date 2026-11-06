export type KycKind = "front" | "back" | "selfie" | "addressProof";
export const kycKinds: KycKind[] = ["front", "back", "selfie", "addressProof"];
export const kycLabels: Record<KycKind, string> = {
  front: "Document · front",
  back: "Document · back",
  selfie: "Selfie",
  addressProof: "Proof of address",
};
export type KycStatus = {
  documentType: string;
  country: string;
  captured: Partial<Record<KycKind, boolean>>;
};
export function documentOptions(country: string) {
  return country === "United Arab Emirates"
    ? ["Emirates ID", "Passport", "Driving licence"]
    : ["Passport", "National ID", "Driving licence"];
}
export const needsBack = (documentType: string) => documentType !== "Passport";
export function requiredKinds(documentType: string): KycKind[] {
  return needsBack(documentType)
    ? ["front", "back", "selfie", "addressProof"]
    : ["front", "selfie", "addressProof"];
}
export const cameraKinds = (documentType: string) =>
  requiredKinds(documentType).filter((k) => k !== "addressProof");
export const KYC_STORAGE = "fc-capital-kyc";
export const MAX_KYC_BYTES = 4 * 1024 * 1024;

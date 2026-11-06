import { z } from "zod";
import { documentOptions, needsBack } from "./kyc";
export const STORAGE = "fc-capital-demo-v1";
export type Application = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  country: string;
  contactConsent: boolean;
  marketing: boolean;
  code: string;
  dob: string;
  nationality: string;
  birthplace: string;
  address: string;
  city: string;
  postal: string;
  taxCountry: string;
  tin: string;
  noTin: boolean;
  tinReason: string;
  usPerson: string;
  pep: string;
  employment: string;
  occupation: string;
  income: string;
  netWorth: string;
  liquidAssets: string;
  deposit: string;
  source: string;
  sourceOther: string;
  purpose: string;
  experience: string;
  frequency: string;
  tradeSize: string;
  qualification: string;
  quiz0: string;
  quiz1: string;
  quiz2: string;
  quiz3: string;
  quiz4: string;
  account: string;
  currency: string;
  documentType: string;
  identity: boolean;
  identityBack: boolean;
  selfie: boolean;
  addressProof: boolean;
  accuracy: boolean;
  risk: boolean;
  terms: boolean;
};
export const empty: Application = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  country: "",
  contactConsent: false,
  marketing: false,
  code: "",
  dob: "",
  nationality: "",
  birthplace: "",
  address: "",
  city: "",
  postal: "",
  taxCountry: "",
  tin: "",
  noTin: false,
  tinReason: "",
  usPerson: "",
  pep: "",
  employment: "",
  occupation: "",
  income: "",
  netWorth: "",
  liquidAssets: "",
  deposit: "",
  source: "",
  sourceOther: "",
  purpose: "",
  experience: "",
  frequency: "",
  tradeSize: "",
  qualification: "",
  quiz0: "",
  quiz1: "",
  quiz2: "",
  quiz3: "",
  quiz4: "",
  account: "Standard",
  currency: "USD",
  documentType: "Passport",
  identity: false,
  identityBack: false,
  selfie: false,
  addressProof: false,
  accuracy: false,
  risk: false,
  terms: false,
};
export const sample: Partial<Application> = {
  firstName: "Alex",
  lastName: "Morgan",
  email: "alex.morgan@example.com",
  phone: "+971 50 000 0000",
  country: "United Arab Emirates",
  dob: "1990-06-15",
  nationality: "United Kingdom",
  birthplace: "London",
  address: "123 Example Avenue",
  city: "Dubai",
  postal: "00000",
  taxCountry: "United Arab Emirates",
  noTin: true,
  tinReason: "Sample applicant has no tax identification number",
  usPerson: "No",
  pep: "No",
  employment: "Employed",
  occupation: "Designer",
  income: "$25,000–$75,000",
  netWorth: "$75,000–$250,000",
  liquidAssets: "$25,000–$75,000",
  deposit: "Under $25,000",
  source: "Employment income",
  purpose: "Portfolio diversification",
  experience: "1–3 years",
  frequency: "Monthly",
  tradeSize: "Under $1,000",
  qualification: "No",
  quiz0: "Losses as well as gains",
  quiz1: "Your position may be closed",
  quiz2: "It may execute at a different price",
  quiz3: "The difference between buy and sell prices",
  quiz4: "Funds available for your open positions",
};
const required = z.string().trim().min(1, "Please complete this field.");
const yes = z.boolean().refine(Boolean, "Please confirm before continuing.");
export function schemaFor(step: number, data: Application) {
  switch (step) {
    case 0:
      return z.object({
        firstName: required.max(80),
        lastName: required.max(80),
        email: z.string().trim().email("Enter a valid email address."),
        phone: z
          .string()
          .regex(/^\+?[\d\s()-]{7,22}$/, "Enter a valid phone number."),
        country: required,
        contactConsent: yes,
      });
    case 1:
      return z.object({
        code: z
          .string()
          .regex(
            /^246810$/,
            "Use demo code 246810 to verify this sample email.",
          ),
      });
    case 2:
      return z.object({
        dob: required.refine((v) => {
          const d = new Date(v + "T00:00:00");
          const cutoff = new Date();
          cutoff.setFullYear(cutoff.getFullYear() - 18);
          return !isNaN(d.getTime()) && d <= cutoff && d.getFullYear() > 1900;
        }, "Enter a valid date of birth (18 or older for this demo)."),
        nationality: required,
        birthplace: required,
        address: required,
        city: required,
        taxCountry: required,
        tin: data.noTin ? z.string() : required,
        tinReason: data.noTin ? required : z.string(),
        usPerson: required,
        pep: required,
      });
    case 3:
      return z.object({
        employment: required,
        occupation: ["Employed", "Self-employed"].includes(data.employment)
          ? required
          : z.string(),
        income: required,
        netWorth: required,
        liquidAssets: required,
        deposit: required,
        source: required,
        sourceOther: data.source === "Other" ? required : z.string(),
        purpose: required,
      });
    case 4:
      return z.object({
        experience: required,
        frequency: required,
        tradeSize: required,
        qualification: required,
        quiz0: required,
        quiz1: required,
        quiz2: required,
        quiz3: required,
        quiz4: required,
      });
    case 5:
      return z.object({
        account: z.enum(["Standard", "Raw"]),
        currency: z.literal("USD"),
      });
    case 6:
      return z.object({
        documentType: z
          .string()
          .refine(
            (v) => documentOptions(data.country).includes(v),
            "Choose a document accepted for your country.",
          ),
        identity: z.boolean().refine(Boolean, "Photograph your document."),
        identityBack: needsBack(data.documentType)
          ? z.boolean().refine(Boolean, "Photograph the back of your document.")
          : z.boolean(),
        selfie: z.boolean().refine(Boolean, "Take your selfie."),
        addressProof: z
          .boolean()
          .refine(Boolean, "Upload your proof of address."),
      });
    default:
      return z.object({ accuracy: yes, risk: yes, terms: yes });
  }
}
export const questions = [
  {
    q: "What can leverage amplify?",
    a: [
      "Losses as well as gains",
      "Only potential profits",
      "Neither profits nor losses",
    ],
  },
  {
    q: "What can happen if your margin falls below the required level?",
    a: [
      "Your position may be closed",
      "Your funds are guaranteed",
      "Nothing changes",
    ],
  },
  {
    q: "What can happen to a stop-loss order during a price gap?",
    a: [
      "It may execute at a different price",
      "It always guarantees your chosen price",
      "It cancels every open position",
    ],
  },
  {
    q: "What is the spread?",
    a: [
      "The difference between buy and sell prices",
      "A guaranteed return",
      "An account password",
    ],
  },
  {
    q: "What does available margin relate to?",
    a: [
      "Funds available for your open positions",
      "A guaranteed monthly income",
      "A fixed interest payment",
    ],
  },
];
export function readDraft() {
  try {
    const raw = sessionStorage.getItem(STORAGE);
    if (!raw) return null;
    const value = JSON.parse(raw);
    if (
      !value ||
      typeof value !== "object" ||
      !value.data ||
      typeof value.data !== "object"
    )
      return null;
    const data = { ...empty };
    for (const key of Object.keys(empty) as (keyof Application)[]) {
      if (typeof value.data[key] === typeof empty[key])
        Object.assign(data, { [key]: value.data[key] });
    }
    return {
      data,
      step: Number.isInteger(value.step)
        ? Math.max(0, Math.min(7, value.step))
        : 0,
      verified: typeof value.verified === "string" ? value.verified : "",
    };
  } catch {
    return null;
  }
}

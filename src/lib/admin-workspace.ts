import { sample, type Application } from "./demo";
import { kycLabels } from "./kyc";
export type ReviewStatus =
  "Pending review" | "Needs information" | "Approved" | "Rejected";
export type DocReview = { status: "Approved" | "Rejected"; reason?: string };
export type ReviewApplication = {
  id: string;
  reference: string;
  name: string;
  email: string;
  country: string;
  account: string;
  submitted: string;
  status: ReviewStatus;
  notes: string[];
  history: string[];
  demo: boolean;
  data: Partial<Application>;
  documents: {
    id: string;
    kind: string;
    href: string;
    image: boolean;
    reviewable: boolean;
  }[];
  reviews: Partial<Record<string, DocReview>>;
};
export const reviewStatuses: ReviewStatus[] = [
  "Pending review",
  "Needs information",
  "Approved",
  "Rejected",
];
const demoRows = [
  {
    id: "FC-APP-9042",
    name: "Alexander Vance",
    email: "alexander.vance@example.com",
    country: "United Kingdom",
    account: "Standard",
    submitted: "2026-10-29",
    status: "Pending review",
    notes: [],
    history: ["Application received"],
  },
  {
    id: "FC-APP-9038",
    name: "Elena Rivera",
    email: "elena.rivera@example.com",
    country: "United Arab Emirates",
    account: "Raw",
    submitted: "2026-10-28",
    status: "Needs information",
    notes: [],
    history: ["Application received", "Additional information requested"],
  },
  {
    id: "FC-APP-8991",
    name: "Marcus Taylor",
    email: "marcus.taylor@example.com",
    country: "Singapore",
    account: "Raw",
    submitted: "2026-10-27",
    status: "Approved",
    notes: [],
    history: ["Application received", "Review completed"],
  },
  {
    id: "FC-APP-8954",
    name: "Sophia Laurent",
    email: "sophia.laurent@example.com",
    country: "United Kingdom",
    account: "Standard",
    submitted: "2026-10-26",
    status: "Pending review",
    notes: [],
    history: ["Application received"],
  },
];
export const demoApplications: ReviewApplication[] = demoRows.map((r) => {
  const [firstName, lastName] = r.name.split(" ");
  return {
    ...r,
    reference: r.id,
    status: r.status as ReviewStatus,
    demo: true,
    documents: (["front", "back", "selfie", "addressProof"] as const).map(
      (id) => ({
        id,
        kind: kycLabels[id],
        href: "",
        image: true,
        reviewable: true,
      }),
    ),
    reviews:
      r.status === "Approved"
        ? Object.fromEntries(
            ["front", "back", "selfie", "addressProof"].map((k) => [
              k,
              { status: "Approved" as const },
            ]),
          )
        : {},
    data: {
      ...sample,
      firstName,
      lastName,
      email: r.email,
      country: r.country,
      taxCountry: r.country,
      account: r.account,
      currency: "USD",
    },
  };
});
export const detailGroups: {
  title: string;
  fields: [keyof Application, string][];
}[] = [
  {
    title: "Contact & personal information",
    fields: [
      ["email", "Email"],
      ["phone", "Phone"],
      ["country", "Country of residence"],
      ["dob", "Date of birth"],
      ["nationality", "Nationality"],
      ["birthplace", "Place of birth"],
      ["address", "Address"],
      ["city", "City"],
      ["postal", "Postal code"],
      ["contactConsent", "Contact consent"],
      ["marketing", "Marketing emails"],
    ],
  },
  {
    title: "Tax & declarations",
    fields: [
      ["taxCountry", "Tax residency"],
      ["tin", "Tax identification number"],
      ["noTin", "No TIN"],
      ["tinReason", "Reason for no TIN"],
      ["usPerson", "US person"],
      ["pep", "Politically exposed person"],
    ],
  },
  {
    title: "Financial profile",
    fields: [
      ["employment", "Employment"],
      ["occupation", "Occupation"],
      ["income", "Annual income"],
      ["netWorth", "Net worth"],
      ["liquidAssets", "Liquid assets"],
      ["deposit", "Expected deposit"],
      ["source", "Source of funds"],
      ["sourceOther", "Other source"],
      ["purpose", "Purpose of account"],
    ],
  },
  {
    title: "Trading experience & knowledge check",
    fields: [
      ["experience", "Trading experience"],
      ["frequency", "Trading frequency"],
      ["tradeSize", "Typical trade size"],
      ["qualification", "Relevant qualification"],
      ["quiz0", "Leverage amplifies"],
      ["quiz1", "Margin below required level"],
      ["quiz2", "Stop-loss during a gap"],
      ["quiz3", "Spread"],
      ["quiz4", "Available margin"],
    ],
  },
  {
    title: "Account & confirmations",
    fields: [
      ["account", "Account"],
      ["currency", "Base currency"],
      ["documentType", "Identity document type"],
      ["accuracy", "Confirmed accuracy"],
      ["risk", "Accepted risk warning"],
      ["terms", "Accepted terms"],
    ],
  },
];

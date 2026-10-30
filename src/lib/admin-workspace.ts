export type ReviewStatus =
  | "Pending review"
  | "Needs information"
  | "Approved"
  | "Rejected";
export type ReviewApplication = {
  id: string;
  name: string;
  email: string;
  country: string;
  account: string;
  submitted: string;
  status: ReviewStatus;
  notes: string[];
  history: string[];
};
export const reviewStatuses: ReviewStatus[] = [
  "Pending review",
  "Needs information",
  "Approved",
  "Rejected",
];
export const applications: ReviewApplication[] = [
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
  {
    id: "FC-APP-8910",
    name: "Karan Patel",
    email: "karan.patel@example.com",
    country: "India",
    account: "Standard",
    submitted: "2026-10-25",
    status: "Needs information",
    notes: [],
    history: ["Application received"],
  },
  {
    id: "FC-APP-8845",
    name: "David Morgan",
    email: "david.morgan@example.com",
    country: "United Arab Emirates",
    account: "Standard",
    submitted: "2026-10-24",
    status: "Rejected",
    notes: [],
    history: ["Application received", "Review completed"],
  },
];

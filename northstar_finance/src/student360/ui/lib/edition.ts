export type Student360Edition =
  | "us_demo"
  | "mortarcaps_apac"
  | "northstar_finance";

const raw = import.meta.env.VITE_STUDENT360_EDITION;
const editionId: Student360Edition =
  raw === "mortarcaps_apac"
    ? "mortarcaps_apac"
    : raw === "northstar_finance"
      ? "northstar_finance"
      : "us_demo";

const isUsDemo = editionId === "us_demo";
const isNorthstar = editionId === "northstar_finance";

// northstar_finance is a US-scale edition (USD, 4.0 GPA, "College") rebranded
// for the Northstar University Office of Finance demo.
const usScale = isUsDemo || isNorthstar;

export const edition = {
  id: editionId,
  isUsDemo,
  isNorthstar,
  universityName: isNorthstar
    ? "Northstar University"
    : isUsDemo
      ? "Pacific State University"
      : "Demo University",
  locale: usScale ? "en-US" : "en-AU",
  currencySuffix: usScale ? "USD" : "AUD",
  defaultAnnualTuition: usScale ? 25000 : 30000,
  gpaScaleLabel: usScale ? "US 4.0 scale" : "Australian 7.0 scale",
  orgUnitLabel: usScale ? "College" : "Faculty",
  orgUnitLabelPlural: usScale ? "Colleges" : "Faculties",
  orgUnitLabelPluralLower: usScale ? "colleges" : "faculties",
  creditsLabel: usScale ? "credit hours" : "credit points",
  creditsAbbreviation: usScale ? "cr" : "cp",
  firstGenLabel: usScale ? "First-generation" : "First-in-family",
  continuingGenerationLabel: usScale
    ? "Continuing-generation"
    : "Continuing-family",
  governanceStandard: usScale
    ? "FERPA / institutional PII policy"
    : "MortarCAPS Higher Learning Data Standard",
  nationalIdLabel: isNorthstar ? "Student ID" : usScale ? "SSN" : "National ID (TFN)",
  advisorOrgUnit: isNorthstar
    ? "College of Business"
    : usScale
      ? "College of Science"
      : "Faculty of Science",
  supportEmail: isNorthstar
    ? "finance@northstar.edu"
    : isUsDemo
      ? "studentsuccess@pacificstate.edu"
      : "studentsuccess@uni.edu.au",
  leadershipLabel: isNorthstar
    ? "VP of Finance / CFO View"
    : isUsDemo
      ? "Provost View"
      : "DVC / Provost View",
} as const;

export function shortOrgUnit(value: string | null | undefined): string {
  return (value ?? "")
    .replace("Faculty of ", "")
    .replace("College of ", "");
}

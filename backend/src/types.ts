export type Confidence = "high" | "medium" | "low" | "unknown";
export type OverlapLevel = "high" | "medium" | "low" | "none";
export type Severity = "high" | "medium" | "low";
export type SupportStatus = "supported" | "unsupported" | "ai-reasoning-only";

/**
 * Every extracted field is one of three states, never silently blended:
 * - explicit: the researcher directly stated this.
 * - inferred: not stated, but conservatively implied by the wording — must carry a reason.
 * - unknown: genuinely can't be determined from the input. value is always null here.
 */
export type FieldStatus = "explicit" | "inferred" | "unknown";

export interface IdeaField {
  value: string | null;
  status: FieldStatus;
  /** Only ever populated for status "inferred" — the wording that justified the inference. */
  reason: string | null;
}

export const CONTRIBUTION_DIMENSIONS = [
  "methodological",
  "theoretical",
  "empirical",
  "dataset",
  "contextual",
  "population",
  "evaluation",
  "application",
  "integration",
  "replication",
] as const;
export type ContributionDimensionType = (typeof CONTRIBUTION_DIMENSIONS)[number];

export interface StructuredIdea {
  researchQuestion: IdeaField;
  domain: IdeaField;
  problem: IdeaField;
  method: IdeaField;
  population: IdeaField;
  data: IdeaField;
  context: IdeaField;
  outcome: IdeaField;
  claimedContribution: string | null;
  contributionDimensions: {
    dimension: ContributionDimensionType | string;
    value: string;
    importance: Confidence;
  }[];
  searchQueries: string[];
}

export interface NormalizedPaper {
  paperId: string; // internal-safe id, always the Semantic Scholar paperId
  title: string;
  authors: string[];
  year: number | null;
  venue: string | null;
  abstract: string | null;
  doi: string | null;
  citationCount: number | null;
  url: string | null;
  retrievalQuery: string | null;
}

export interface ClosestWorkItem {
  index: number; // index into the retrieved paper array
  relevanceReason: string;
  overlap: {
    problem: OverlapLevel;
    method: OverlapLevel;
    data: OverlapLevel;
    context: OverlapLevel;
    evaluation: OverlapLevel;
  };
  difference: string;
}

export interface ContributionMapRow {
  dimension: string;
  proposedValue: string;
  overlapLevel: OverlapLevel;
  note: string;
  /** Papers backing this overlap rating, if any. Empty means no evidence was linked — say so in the UI, don't hide it. */
  supportingPaperIndices: number[];
}

export interface NoveltyCollision {
  summary: string;
  similar: string[];
  different: string[];
  potentialImplication: string;
  severity: Severity;
  supportingPaperIndices: number[];
}

export interface ReviewerObjection {
  objection: string;
  severity: Severity;
  reason: string;
  supportingPaperIndices: number[];
  supportStatus: SupportStatus;
}

export interface RefinementSuggestion {
  currentWeakness: string;
  whatNeedsToChange: string;
  possibleResearchQuestion: string;
  whatWouldEstablishContribution: string;
}

export interface PotentialContribution {
  establishedInLiterature: string;
  possibleDifferentiation: string;
  butWhatMustBeProven: string;
  claimsToAvoid: string[];
  refinedContributionStatement: string;
}

/**
 * The single underlying judgment ORBIIS produces. Displayed two ways in the UI:
 * a short label in the top-of-page summary, and the fuller decision-oriented
 * framing (with reason + disclaimer) in the closing "Research decision" section.
 * Intentionally one field, not two, so the two displays can never disagree.
 */
export type ResearchDecision = "proceed" | "refine" | "rethink" | "insufficient_evidence";

export interface AnalysisResult {
  structuredIdea: StructuredIdea;
  retrievedPapers: NormalizedPaper[];
  closestWork: ClosestWorkItem[];
  contributionMap: ContributionMapRow[];
  potentialDifferentiation: string;
  collisions: NoveltyCollision[];
  reviewerObjections: ReviewerObjection[];
  refinements: RefinementSuggestion[];
  potentialContribution: PotentialContribution;
  researchDecision: ResearchDecision;
  researchDecisionReason: string;
  /** One or two sentences — the single most important weakness found. Drives the top-of-page summary. */
  biggestIssue: string;
  /** One concrete next step the researcher should take before proceeding. Drives the top-of-page summary. */
  whatToInvestigateNext: string;
}

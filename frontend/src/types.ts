export type OverlapLevel = "high" | "medium" | "low" | "none";
export type Severity = "high" | "medium" | "low";
export type SupportStatus = "supported" | "unsupported" | "ai-reasoning-only";
export type Confidence = "high" | "medium" | "low" | "unknown";
export type FieldStatus = "explicit" | "inferred" | "unknown";

export interface IdeaField {
  value: string | null;
  status: FieldStatus;
  reason: string | null;
}

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
  contributionDimensions: { dimension: string; value: string; importance: Confidence }[];
  searchQueries: string[];
}

export interface NormalizedPaper {
  paperId: string;
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
  index: number;
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
  biggestIssue: string;
  whatToInvestigateNext: string;
}

export interface StressTestResponse {
  sessionId: string;
  ideaId: string;
  version: number;
  result: AnalysisResult;
}

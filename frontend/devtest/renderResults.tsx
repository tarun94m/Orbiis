/** @jsxImportSource react */
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import Results from "../src/pages/Results";
import { AnalysisResult, StressTestResponse } from "../src/types";

function baseResult(overrides: Partial<AnalysisResult> = {}): AnalysisResult {
  return {
    structuredIdea: {
      researchQuestion: { value: "Does X improve Y?", status: "explicit", reason: null },
      domain: { value: "ML", status: "inferred", reason: "The wording uses ML terminology." },
      problem: { value: "Problem statement", status: "explicit", reason: null },
      method: { value: "Method X", status: "explicit", reason: null },
      population: { value: null, status: "unknown", reason: null },
      data: { value: null, status: "unknown", reason: null },
      context: { value: null, status: "unknown", reason: null },
      outcome: { value: "Outcome Z", status: "inferred", reason: "The idea states the goal is to achieve Z." },
      claimedContribution: "Claimed contribution text",
      contributionDimensions: [{ dimension: "methodological", value: "Method X", importance: "high" }],
      searchQueries: ["method x domain y"],
    },
    retrievedPapers: [
      {
        paperId: "p1",
        title: "Paper One: A Study",
        authors: ["A. Author", "B. Author"],
        year: 2023,
        venue: "Venue A",
        abstract: "An abstract about paper one.",
        doi: "10.1/abc",
        citationCount: 12,
        url: "https://example.com/p1",
        retrievalQuery: "q1",
      },
      {
        paperId: "p2",
        title: "Paper Two: Another Study",
        authors: ["C. Author"],
        year: 2021,
        venue: null,
        abstract: null,
        doi: null,
        citationCount: null,
        url: null,
        retrievalQuery: "q2",
      },
    ],
    closestWork: [
      {
        index: 0,
        relevanceReason: "Shares method and domain.",
        overlap: { problem: "high", method: "medium", data: "low", context: "none", evaluation: "medium" },
        difference: "Different population.",
      },
    ],
    contributionMap: [
      { dimension: "Method", proposedValue: "Method X", overlapLevel: "medium", note: "Some overlap", supportingPaperIndices: [0] },
      { dimension: "Evaluation", proposedValue: "Cross-domain eval", overlapLevel: "low", note: "Less represented", supportingPaperIndices: [] },
    ],
    potentialDifferentiation: "Cross-domain evaluation appears less represented.",
    collisions: [
      {
        summary: "Similar method applied to a related domain.",
        similar: ["Same core method"],
        different: ["Different domain"],
        potentialImplication: "Novelty claim may be too broad.",
        severity: "high",
        supportingPaperIndices: [0],
      },
    ],
    reviewerObjections: [
      {
        objection: "A reviewer may argue the method is already established.",
        severity: "high",
        reason: "Paper one covers a very similar method.",
        supportingPaperIndices: [0],
        supportStatus: "supported",
      },
      {
        objection: "The evaluation protocol may be seen as insufficiently rigorous.",
        severity: "medium",
        reason: "No paper in the retrieved set directly evaluates this combination.",
        supportingPaperIndices: [],
        supportStatus: "ai-reasoning-only",
      },
    ],
    refinements: [
      {
        currentWeakness: "The population is unspecified.",
        whatNeedsToChange: "Narrow to a specific population.",
        possibleResearchQuestion: "Does X improve Y specifically for population P?",
        whatWouldEstablishContribution: "A controlled comparison against paper one's method on population P.",
      },
    ],
    potentialContribution: {
      establishedInLiterature: "Method X applied to domain A is established.",
      possibleDifferentiation: "Applying method X to a new evaluation context is less represented.",
      butWhatMustBeProven: "That the new context poses a problem existing methods do not solve.",
      claimsToAvoid: ["This is the first application of X to Y."],
      refinedContributionStatement: "A narrower, bounded contribution statement.",
    },
    researchDecision: "refine",
    researchDecisionReason: "One high-severity collision was found alongside a literature-backed objection.",
    biggestIssue: "The core method largely overlaps with existing work in a related domain.",
    whatToInvestigateNext: "Read Paper One closely and compare its evaluation protocol to yours.",
    ...overrides,
  };
}

function wrap(id: string, response: StressTestResponse) {
  return (
    <MemoryRouter initialEntries={[{ pathname: `/idea/${id}`, state: { response } }]}>
      <Routes>
        <Route path="/idea/:id" element={<Results />} />
      </Routes>
    </MemoryRouter>
  );
}

const cases: { name: string; result: AnalysisResult }[] = [
  { name: "full / overlap case", result: baseResult() },
  {
    name: "no-overlap case (no collisions, no closest work)",
    result: baseResult({ closestWork: [], collisions: [], researchDecision: "proceed" }),
  },
  {
    name: "AI-only objections only",
    result: baseResult({
      reviewerObjections: [
        {
          objection: "The claim may be too broad.",
          severity: "medium",
          reason: "General reasoning, no direct paper support.",
          supportingPaperIndices: [],
          supportStatus: "ai-reasoning-only",
        },
      ],
    }),
  },
  {
    name: "literature-backed objections only",
    result: baseResult({
      reviewerObjections: [
        {
          objection: "Already evaluated in a similar setting.",
          severity: "high",
          reason: "Paper one covers this.",
          supportingPaperIndices: [0],
          supportStatus: "supported",
        },
      ],
    }),
  },
  {
    name: "missing/unknown research fields",
    result: baseResult({
      structuredIdea: {
        researchQuestion: { value: null, status: "unknown", reason: null },
        domain: { value: null, status: "unknown", reason: null },
        problem: { value: null, status: "unknown", reason: null },
        method: { value: null, status: "unknown", reason: null },
        population: { value: null, status: "unknown", reason: null },
        data: { value: null, status: "unknown", reason: null },
        context: { value: null, status: "unknown", reason: null },
        outcome: { value: null, status: "unknown", reason: null },
        claimedContribution: null,
        contributionDimensions: [],
        searchQueries: [],
      },
    }),
  },
  {
    name: "no evidence at all (empty retrieved papers)",
    result: baseResult({ retrievedPapers: [], closestWork: [], collisions: [], reviewerObjections: [] }),
  },
  {
    name: "insufficient_evidence decision",
    result: baseResult({ researchDecision: "insufficient_evidence", researchDecisionReason: "Too few papers retrieved." }),
  },
  {
    name: "rethink decision (high collision)",
    result: baseResult({ researchDecision: "rethink" }),
  },
];

let failures = 0;
for (const c of cases) {
  try {
    const html = renderToStaticMarkup(
      wrap("test-id", { sessionId: "s1", ideaId: "test-id", version: 1, result: c.result })
    );
    const hasBanned = /\bnovel\b|\bnovelty confirmed\b|\bunique contribution\b|\bno collision\b/i.test(html);
    console.log(`[OK] ${c.name} — ${html.length} chars${hasBanned ? " ⚠️ BANNED WORD FOUND" : ""}`);
  } catch (err) {
    failures++;
    console.error(`[FAIL] ${c.name}:`, (err as Error).message);
  }
}

if (failures > 0) {
  console.error(`\n${failures} case(s) failed.`);
  process.exit(1);
} else {
  console.log("\nAll smoke test cases rendered without throwing.");
}

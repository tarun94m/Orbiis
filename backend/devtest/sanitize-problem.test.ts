import { sanitizeStructuredIdea } from "../src/pipeline/1-decompose";

let failures = 0;
function assert(cond: boolean, msg: string) {
  if (!cond) {
    failures++;
    console.error(`[FAIL] ${msg}`);
  } else {
    console.log(`[OK] ${msg}`);
  }
}

function minimalRaw(problem: any) {
  return {
    researchQuestion: { value: null, status: "unknown", reason: null },
    domain: { value: null, status: "unknown", reason: null },
    problem,
    method: { value: null, status: "unknown", reason: null },
    population: { value: null, status: "unknown", reason: null },
    data: { value: null, status: "unknown", reason: null },
    context: { value: null, status: "unknown", reason: null },
    outcome: { value: null, status: "unknown", reason: null },
    claimedContribution: null,
    contributionDimensions: [],
    searchQueries: ["q"],
  };
}

// This test exercises the sanitization/coercion layer only — it does NOT call the
// live AI. It confirms that IF the model returns the shapes described in the spec's
// examples, the sanitizer preserves/enforces them correctly. It does not prove the
// model will actually produce these shapes for real input — that requires running
// against the live Gemini API, which this environment cannot do.

// Spec Example 1 — explicit problem embedded in a "because" clause
const r1 = sanitizeStructuredIdea(
  minimalRaw({
    value: "Product designers make early-stage decisions without access to manufacturing information.",
    status: "explicit",
    reason: null,
  })
);
assert(r1.problem.status === "explicit", "Example 1: problem stays explicit");
assert(
  r1.problem.value === "Product designers make early-stage decisions without access to manufacturing information.",
  "Example 1: value preserved verbatim"
);
assert(r1.problem.reason === null, "Example 1: explicit status has no reason");

// AI incorrectly attaches a reason to an explicit field — sanitizer must still null it out
const r1b = sanitizeStructuredIdea(
  minimalRaw({
    value: "Designers lack access to real-time manufacturing information.",
    status: "explicit",
    reason: "This is explicitly stated.",
  })
);
assert(r1b.problem.status === "explicit", "Example 1b: explicit status preserved");
assert(r1b.problem.reason === null, "Example 1b: reason forced to null on explicit status even though AI supplied one");

// Spec Example 3 — inferred problem, must carry a reason
const r3 = sanitizeStructuredIdea(
  minimalRaw({
    value: "Uncertainty in early-stage design decision-making",
    status: "inferred",
    reason:
      "The input explicitly refers to improving design decisions under uncertainty, which suggests uncertainty is the challenge being investigated.",
  })
);
assert(r3.problem.status === "inferred", "Example 3: inferred status preserved");
assert(r3.problem.value === "Uncertainty in early-stage design decision-making", "Example 3: inferred value preserved");
assert(!!r3.problem.reason, "Example 3: inferred reason preserved");

// Spec Example 4 — unknown, value null
const r4 = sanitizeStructuredIdea(minimalRaw({ value: null, status: "unknown", reason: null }));
assert(r4.problem.status === "unknown", "Example 4: unknown status preserved");
assert(r4.problem.value === null, "Example 4: unknown value is null");

// Invariant fuzz: model claims "explicit" but gives an empty value — must be forced to unknown/null
const r5 = sanitizeStructuredIdea(minimalRaw({ value: "", status: "explicit", reason: null }));
assert(r5.problem.status === "unknown", "Invariant: empty value forces status to unknown regardless of claimed status");
assert(r5.problem.value === null, "Invariant: empty value forces value to null");

// Invariant fuzz: model marks status "unknown" but still supplies a stray value — value must still be nulled
const r6 = sanitizeStructuredIdea(minimalRaw({ value: "some stray text", status: "unknown", reason: null }));
assert(r6.problem.status === "unknown", "Invariant: status unknown is respected");
assert(r6.problem.value === null, "Invariant: unknown status forces value to null even if a stray value was supplied");

if (failures > 0) {
  console.error(`\n${failures} assertion(s) failed.`);
  process.exit(1);
} else {
  console.log("\nAll sanitizeStructuredIdea problem-field assertions passed.");
}

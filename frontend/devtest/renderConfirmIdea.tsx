/** @jsxImportSource react */
import { renderToStaticMarkup } from "react-dom/server";
import { ConfirmIdea } from "../src/components/ConfirmIdea";
import { StructuredIdea } from "../src/types";

const cases: { name: string; idea: StructuredIdea }[] = [
  {
    name: "mixed explicit/inferred/unknown",
    idea: {
      researchQuestion: { value: "Does X improve Y?", status: "explicit", reason: null },
      domain: { value: "ML", status: "inferred", reason: "The wording uses ML terminology." },
      problem: { value: null, status: "unknown", reason: null },
      method: { value: null, status: "unknown", reason: null },
      population: { value: null, status: "unknown", reason: null },
      data: { value: null, status: "unknown", reason: null },
      context: { value: "automotive manufacturing", status: "inferred", reason: "Stated as the setting." },
      outcome: { value: "defect reduction", status: "inferred", reason: "Stated as the goal." },
      claimedContribution: "A claimed contribution",
      contributionDimensions: [],
      searchQueries: ["x y"],
    },
  },
  {
    name: "all unknown (the reported bug case)",
    idea: {
      researchQuestion: { value: null, status: "unknown", reason: null },
      domain: { value: "Product Realization", status: "inferred", reason: "Terminology used." },
      problem: { value: null, status: "unknown", reason: null },
      method: { value: null, status: "unknown", reason: null },
      population: { value: null, status: "unknown", reason: null },
      data: { value: null, status: "unknown", reason: null },
      context: { value: null, status: "unknown", reason: null },
      outcome: { value: null, status: "unknown", reason: null },
      claimedContribution: null,
      contributionDimensions: [],
      searchQueries: ["product realization"],
    },
  },
  {
    name: "all explicit, no reasons",
    idea: {
      researchQuestion: { value: "Q", status: "explicit", reason: null },
      domain: { value: "D", status: "explicit", reason: null },
      problem: { value: "P", status: "explicit", reason: null },
      method: { value: "M", status: "explicit", reason: null },
      population: { value: "Pop", status: "explicit", reason: null },
      data: { value: "Data", status: "explicit", reason: null },
      context: { value: "C", status: "explicit", reason: null },
      outcome: { value: "O", status: "explicit", reason: null },
      claimedContribution: "CC",
      contributionDimensions: [],
      searchQueries: ["q"],
    },
  },
];

let failures = 0;
for (const c of cases) {
  try {
    const html = renderToStaticMarkup(
      <ConfirmIdea original={c.idea} onConfirm={() => {}} onBack={() => {}} submitting={false} />
    );
    console.log(`[OK] ${c.name} — ${html.length} chars`);
  } catch (err) {
    failures++;
    console.error(`[FAIL] ${c.name}:`, (err as Error).message);
  }
}

if (failures > 0) {
  console.error(`\n${failures} case(s) failed.`);
  process.exit(1);
} else {
  console.log("\nAll ConfirmIdea smoke test cases rendered without throwing.");
}

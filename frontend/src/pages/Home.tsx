import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { runDecompose, runStressTest } from "../api";
import { StructuredIdea } from "../types";
import { ConfirmIdea } from "../components/ConfirmIdea";

type Stage = "input" | "decomposing" | "confirm" | "running";

export default function Home() {
  const [idea, setIdea] = useState("");
  const [abstract, setAbstract] = useState("");
  const [stage, setStage] = useState<Stage>("input");
  const [error, setError] = useState<string | null>(null);
  const [structuredIdea, setStructuredIdea] = useState<StructuredIdea | null>(null);
  const [runStage, setRunStage] = useState(0);
  const navigate = useNavigate();

  const runStages = [
    "Searching Semantic Scholar for related work…",
    "Hunting for potential novelty collisions…",
    "Drafting reviewer objections…",
    "Assembling the assessment…",
  ];

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (idea.trim().length < 10) {
      setError("Say a bit more about the idea — at least a sentence or two.");
      return;
    }
    setError(null);
    setStage("decomposing");
    try {
      const res = await runDecompose({ rawInput: idea, rawAbstract: abstract || undefined });
      setStructuredIdea(res.structuredIdea);
      setStage("confirm");
    } catch (err: any) {
      setError(err?.message || "Could not understand this idea. Please try again.");
      setStage("input");
    }
  }

  async function handleConfirm(edited: StructuredIdea) {
    setError(null);
    setStage("running");

    let i = 0;
    const timer = setInterval(() => {
      i = Math.min(i + 1, runStages.length - 1);
      setRunStage(i);
    }, 3200);

    try {
      const res = await runStressTest({ rawInput: idea, rawAbstract: abstract || undefined, structuredIdea: edited });
      navigate(`/idea/${res.ideaId}`, { state: { response: res } });
    } catch (err: any) {
      setError(err?.message || "The stress test failed. Please try again.");
      setStage("confirm");
    } finally {
      clearInterval(timer);
      setRunStage(0);
    }
  }

  return (
    <main className="home">
      <section className="hero">
        <svg className="fault-line" viewBox="0 0 960 90" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 45 L120 45 L145 20 L165 68 L190 45 L340 45 L365 12 L390 78 L415 45 L560 45 L588 25 L610 60 L636 45 L780 45 L804 15 L828 72 L852 45 L960 45" />
        </svg>
        <p className="eyebrow">before you spend six months on this</p>
        <h1>
          Before you commit to a research idea,
          <br />
          <span className="hero-emph">try to break it.</span>
        </h1>
        <p className="hero-sub">
          Stress-test your proposed research contribution against the literature. Find existing work, potential
          novelty collisions, reviewer objections, and ways to strengthen your research question.
        </p>
      </section>

      {(stage === "input" || stage === "decomposing") && (
        <section className="input-panel">
          <form onSubmit={handleSubmit}>
            <label htmlFor="idea">What are you planning to research?</label>
            <textarea
              id="idea"
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              placeholder="I want to investigate whether explainable AI improves operator trust in predictive maintenance systems."
              rows={5}
              disabled={stage === "decomposing"}
            />

            <label htmlFor="abstract" className="optional-label">
              Research question / abstract / proposal <span>(optional)</span>
            </label>
            <textarea
              id="abstract"
              value={abstract}
              onChange={(e) => setAbstract(e.target.value)}
              placeholder="Paste more detail if you have it — a draft abstract, hypothesis, or proposal excerpt."
              rows={3}
              disabled={stage === "decomposing"}
            />

            {error && <p className="form-error">{error}</p>}

            <button type="submit" disabled={stage === "decomposing"}>
              {stage === "decomposing" ? "Reading your idea…" : "Stress-test my idea"}
            </button>
          </form>

          <div className="what-happens">
            <p className="what-happens-title">Orbiis will:</p>
            <ul>
              <li>reconstruct your proposed contribution — and show you what it inferred vs. what you stated</li>
              <li>search relevant research on Semantic Scholar</li>
              <li>identify the closest existing work</li>
              <li>challenge your novelty claim</li>
              <li>suggest possible refinements</li>
            </ul>
          </div>
        </section>
      )}

      {(stage === "confirm" || stage === "running") && structuredIdea && (
        <>
          <ConfirmIdea
            original={structuredIdea}
            onConfirm={handleConfirm}
            onBack={() => setStage("input")}
            submitting={stage === "running"}
          />
          {error && <p className="form-error confirm-error">{error}</p>}
          {stage === "running" && <p className="stage-indicator confirm-stage-indicator">{runStages[runStage]}</p>}
        </>
      )}
    </main>
  );
}

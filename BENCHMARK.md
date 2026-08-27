# ORBIIS Benchmark Worksheet

Use this to run the manual benchmark. Don't skip straight to the "record failures"
table — actually paste each idea into the running app, read the full report, and
judge it the way a skeptical advisor would.

## Scoring rubric (fill in after each run)

| Column | How to judge it |
|---|---|
| **Important papers found?** | Yes / Partial / No — did section 3 (Closest Existing Work) surface the papers *you* already knew were the obvious comparison points? If you don't know the field well enough to judge this, that's a valid result too — note it. |
| **False collisions** | Count: how many entries in section 4 (Novelty Collisions) are actually weak or wrong — same keywords, different problem, or a stretch? |
| **Missed overlaps** | Count: how many real, close prior-art papers do you know of that Orbiis did NOT flag as a collision or closest work? |
| **Useful refinement?** | Yes / No — after reading section 7, did your own sense of the idea change? Would you actually adjust the proposal based on it, or is it generic advice that could apply to any idea? |
| **Changed understanding?** | The real metric. Yes / No / Partially — before vs. after reading the full report, do you see the idea differently? |

## 10 research ideas to run

Deliberately mixed: some sit in well-established areas (should trigger real
collisions), some are narrower combinations (should show partial overlap), and
none were chosen because they'd make Orbiis look good. Swap in your own domain's
real proposals if you have them — that's a stronger test than any list I give you.

1. **ML / predictive maintenance** (the example from the spec — a fair baseline)
   > I want to investigate whether explainable AI improves operator trust in predictive maintenance systems.

2. **LLM hallucination detection** (crowded area — good collision-detection stress test)
   > I want to develop a method for detecting hallucinated citations in LLM-generated academic text using retrieval-augmented verification.

3. **Federated learning + healthcare** (active, well-covered area)
   > I want to study whether federated learning can preserve diagnostic accuracy while protecting patient privacy in multi-hospital chest X-ray classification.

4. **HCI / VR exposure therapy** (established clinical + HCI intersection)
   > I want to test whether VR-based exposure therapy is more effective than traditional exposure therapy for treating social anxiety in adolescents.

5. **Soft robotics** (narrower, more technical — tests whether it can find niche mechanical-engineering literature)
   > I want to design a soft robotic gripper using pneumatic actuation that can adapt its grip force to fragile, irregularly shaped produce for automated harvesting.

6. **Gut microbiome + mental health** (currently very active, likely to surface strong collisions)
   > I want to investigate whether specific gut microbiome compositions are associated with treatment-resistant depression.

7. **Low-resource NLP** (tests whether it finds specific-language literature, not just generic NLP)
   > I want to build a part-of-speech tagger for a low-resource Bantu language using cross-lingual transfer from a related high-resource language.

8. **Algorithmic hiring bias** (heavily studied — should be a hard test of "what's actually left")
   > I want to audit whether resume-screening algorithms exhibit racial bias when trained on historical hiring data, and propose a debiasing method.

9. **Materials science / perovskite solar cells** (technical, narrow, tests abstract-level relevance filtering)
   > I want to investigate whether a specific encapsulation layer improves the long-term moisture stability of perovskite solar cells under real-world humidity cycling.

10. **Education / personalized learning with LLMs** (broad claim, likely to get "too broad" pushback — good test of the reviewer-attack feature)
    > I want to show that LLM-powered personalized tutoring improves learning outcomes more than traditional one-size-fits-all instruction.

## Fill in as you go

| # | Idea | Important papers found? | False collisions | Missed overlaps | Useful refinement? | Changed understanding? |
|---|------|--------------------------|-------------------|-------------------|----------------------|---------------------------|
| 1 |      |                          |                   |                   |                      |                            |
| 2 |      |                          |                   |                   |                      |                            |
| 3 |      |                          |                   |                   |                      |                            |
| 4 |      |                          |                   |                   |                      |                            |
| 5 |      |                          |                   |                   |                      |                            |
| 6 |      |                          |                   |                   |                      |                            |
| 7 |      |                          |                   |                   |                      |                            |
| 8 |      |                          |                   |                   |                      |                            |
| 9 |      |                          |                   |                   |                      |                            |
| 10|      |                          |                   |                   |                      |                            |

## Then: compare against AnswerThis and ChatGPT

For 3-4 of the ideas above, run the same input through:
- **ChatGPT** (or Claude/Gemini directly, no tools) — ask it to assess novelty and find related work.
- **AnswerThis** (or similar literature tool) — run its standard search/summarize flow.

Ask the same question of each output: *did this change my understanding of what
I should do next, and can I trust the papers it showed me are real?* A plain LLM
answer will often produce fluent-sounding "related work" that's fabricated or
generic — that's the gap Orbiis is supposed to close. If Orbiis's report isn't
clearly better on that specific axis (not on the number of features), the product
doesn't have a wedge yet.

## What to watch for while reading each report

- Does section 2 (contribution map) actually distinguish dimensions, or does
  everything come back "medium overlap" regardless of input (a sign the model
  isn't discriminating)?
- Do section 4 collisions cite papers whose abstracts you can verify actually
  support the claim, or does the reasoning stretch past what the abstract says?
- Are section 5 objections specific to this idea, or could they be pasted onto
  any proposal in the field ("more evaluation is needed" is not a real objection)?
- Does section 7's refined contribution statement say something narrower and
  more falsifiable than the original idea, or is it just a rewording?

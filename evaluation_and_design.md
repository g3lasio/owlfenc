# Owl Fenc: DeepSearch Engine Evaluation & Universal Estimator Design

## 1. Executive Summary
The current DeepSearch engine in Owl Fenc relies on a fragmented architecture that attempts to patch AI limitations with hardcoded logic (`expertContractorService.ts`, `multiIndustryExpertService.ts`). While it uses Claude 3.7 Sonnet for initial parsing, it falls back to rigid dictionaries for pricing and validation. This limits its ability to truly act as a "Universal Expert Estimator" across all trades.

To achieve the user's vision of a super-advanced, reasoning-capable engine that understands all trades, codes, and legal regulations, we must pivot from a "hardcoded validation" approach to a "pure reasoning" approach powered by Claude 3 Opus (the most capable reasoning model).

## 2. Audit of Current Architecture
The current system (`deepSearchService.ts`) works as follows:
1. **Initial AI Pass:** Claude 3.7 Sonnet parses the project description and attempts to generate a JSON list of materials.
2. **Hardcoded Validation:** The result is passed through `materialValidationService.ts`, which checks against rigid lists of required materials (e.g., fencing *must* have boards).
3. **Hardcoded Pricing:** The result is enriched by `expertContractorService.ts`, which looks up prices in a static dictionary (`materialDatabase`). If a material isn't in the dictionary, it guesses or fails.
4. **Fallback:** If Anthropic fails, it falls back to GPT-4o.

**Why this falls short of the user's vision:**
- **Rigidity:** It cannot handle edge cases or trades not explicitly programmed into the dictionaries (e.g., specialized plumbing or electrical).
- **Lack of True Reasoning:** It doesn't reason about building codes, legal requirements, or structural integrity; it just matches keywords to formulas.
- **Fragmentation:** The logic is spread across 5 different services, making it brittle and hard to maintain.

## 3. Design of the Universal Expert Estimator Engine (Claude 3 Opus)
To build the "super-advanced" engine, we will consolidate the logic into a single, powerful orchestrator powered by **Claude 3 Opus** (`claude-3-opus-20240229`). Opus will handle the reasoning, code compliance, and material calculation natively, without relying on static dictionaries.

### 3.1. Core Principles
- **Pure AI Reasoning:** Rely on Opus's vast knowledge of construction trades, building codes (IRC, IBC, NEC, UPC), and material science.
- **Dynamic Pricing:** Instead of static dictionaries, the AI will estimate current market prices based on geographic location and historical data, providing a realistic range.
- **Holistic Understanding:** The AI will output not just materials, but also labor, required permits, code compliance notes, and potential risks.

### 3.2. Prompt Architecture
The new system prompt for Claude 3 Opus will be structured as follows:

```markdown
You are the ultimate Master Contractor and Universal Estimator AI. You possess encyclopedic knowledge of ALL construction trades (plumbing, electrical, roofing, HVAC, concrete, framing, fencing, etc.), including local building codes (IRC, IBC, NEC, UPC), safety regulations, and legal compliance.

Your task is to analyze the provided project description and generate a surgically precise, comprehensive estimate.

You must reason through the project step-by-step:
1. Trade Identification & Scope: What trades are involved? What is the true scope?
2. Code & Legal Compliance: What permits are required? What building codes apply?
3. Structural/Technical Reasoning: What is the correct methodology to execute this work safely and durably?
4. Material Calculation: Calculate exact quantities using professional formulas, including standard waste factors (e.g., 10% for drywall, 5% for concrete).
5. Labor Estimation: Estimate realistic labor hours based on industry standards.

Output your analysis in the specified JSON format.
```

### 3.3. Implementation Plan
1. **Create `universalEstimatorService.ts`:** A new service that replaces `deepSearchService`, `expertContractorService`, `multiIndustryExpertService`, and `precisionQuantityCalculationService`.
2. **Update API Routes:** Modify `/api/deepsearch/materials-only` and `/api/labor-deepsearch/combined` to route through the new `universalEstimatorService`.
3. **Remove Legacy Code:** Deprecate and remove the old, fragmented services to clean up the codebase.

## 4. Conclusion
By leveraging Claude 3 Opus and removing the rigid, hardcoded validation layers, we can deliver the highly intelligent, reasoning-capable engine the user requested. This engine will dynamically adapt to any trade, ensuring code compliance and precise estimations without the need for constant patching.

# Owl Fenc: Universal Intelligence Engine (Opus 4.7 Level)

## 1. Vision: The "God-Mode" Estimator
The current DeepSearch system is a patched, rule-based script that relies on static dictionaries and rigid logic. It fails when presented with complex, multi-disciplinary, or highly specialized projects. 

The goal is to replace this entirely with a **Universal Intelligence Engine**. This engine will not rely on hardcoded materials or formulas. Instead, it will use the absolute highest level of reasoning available (referencing the capability level of Opus 4.7) to analyze, deconstruct, and estimate *any* project, from a simple leaky faucet to a full-scale commercial high-rise development.

## 2. Core Philosophy: Pure Reasoning over Rigid Rules
- **No Hardcoded Dictionaries:** The engine will not look up "pine board" in a JSON file. It will *know* what a pine board costs based on its vast training data, adjusted by the user's geographic location and current market trends.
- **Transcend Construction:** The engine must be capable of estimating software development, event planning, manufacturing, or any other industry, simply by applying first-principles reasoning.
- **Code & Legal Compliance:** The engine will natively understand and apply local building codes (IBC, NEC, UPC), labor laws, and permit requirements, warning the user of legal or structural risks.
- **Strict Adherence to User Settings:** The engine will mathematically apply the exact profit margins, tax rates, overhead, and target prices defined by the contractor in their settings.

## 3. Architecture of the Universal Engine

### 3.1. The Central Orchestrator
We will create a single, unified service: `UniversalIntelligenceEngine.ts`. This service will replace:
- `deepSearchService.ts`
- `expertContractorService.ts`
- `multiIndustryExpertService.ts`
- `materialValidationService.ts`
- `precisionQuantityCalculationService.ts`

### 3.2. The "Opus 4.7" Prompt Matrix
The system prompt will be the most advanced, multi-layered instruction set in the codebase. It will force the AI into a "God-Mode" reasoning state.

**Phase 1: Deconstruction & Contextualization**
- Identify the industry, scale, and complexity of the project.
- Identify the geographic location and apply regional cost multipliers and legal constraints.

**Phase 2: First-Principles Engineering & Planning**
- Break the project down into logical phases (e.g., Demolition, Rough-in, Finishing).
- Identify structural, technical, or legal dependencies (e.g., "Requires a licensed electrician to pull a permit for the 200A panel upgrade").

**Phase 3: Micro-Calculation (Materials & Labor)**
- Calculate materials using professional, trade-specific formulas (e.g., calculating voltage drop for long wire runs, or cubic yards of concrete with a 5% waste factor).
- Estimate labor hours based on realistic, professional productivity rates, adjusted for project complexity.

**Phase 4: Financial Application**
- Apply the user's specific financial settings (profit margin, overhead, tax rate).

### 3.3. The Data Structure (JSON Output)
The engine will output a highly structured, comprehensive JSON object:

```json
{
  "projectAnalysis": {
    "industry": "string",
    "complexityLevel": "1-10",
    "executiveSummary": "string",
    "legalAndCodeRequirements": ["string"],
    "structuralRisks": ["string"]
  },
  "phases": [
    {
      "phaseName": "string",
      "materials": [
        {
          "name": "string",
          "exactSpecification": "string",
          "quantity": "number",
          "unit": "string",
          "unitCost": "number",
          "totalCost": "number",
          "reasoning": "string (Why this exact material and quantity?)"
        }
      ],
      "labor": [
        {
          "role": "string",
          "hours": "number",
          "hourlyRate": "number",
          "totalCost": "number",
          "reasoning": "string"
        }
      ]
    }
  ],
  "financials": {
    "rawMaterialCost": "number",
    "rawLaborCost": "number",
    "subtotal": "number",
    "appliedTaxes": "number",
    "appliedOverhead": "number",
    "appliedProfitMargin": "number",
    "grandTotal": "number"
  }
}
```

## 4. Implementation Strategy

1. **Create the Engine:** Build `UniversalIntelligenceEngine.ts` using the Anthropic SDK, pointing to the most advanced available model (`claude-3-opus-20240229` or equivalent highest-tier model).
2. **Draft the Master Prompt:** Write the multi-layered prompt matrix described above.
3. **Route Integration:** Connect `/api/deepsearch/combined` directly to this new engine.
4. **Testing:** Run extreme tests:
   - *Test A (Simple):* "Fix a leaky sink in a 1-bed apartment."
   - *Test B (Complex):* "Build a 5,000 sqft custom home in Malibu, CA, including smart home wiring, solar, and a negative-edge pool."
   - *Test C (Non-Construction):* "Develop a custom CRM software for a real estate agency."
5. **Deprecation:** Once validated, completely remove the legacy "Frankenstein" services.

## 5. Conclusion
This architecture moves Owl Fenc from a "script that guesses materials" to a true **Artificial Intelligence Partner**. It will reason better than a human estimator, calculate faster, and never be limited by a hardcoded dictionary.

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * UNIVERSAL INTELLIGENCE ENGINE — Owl Fenc
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * This service is the single source of truth for ALL estimate generation.
 * It replaces: deepSearchService, expertContractorService,
 *              multiIndustryExpertService, materialValidationService,
 *              precisionQuantityCalculationService.
 *
 * Core Philosophy:
 *  - PURE AI REASONING: No hardcoded dictionaries, no rigid validation rules.
 *  - UNIVERSAL SCOPE: Handles ANY project — construction, cleaning, software,
 *    landscaping, event planning, or any other industry. If someone needs to
 *    charge for work, this engine can estimate it.
 *  - STRICT FINANCIAL FIDELITY: Mathematically applies the contractor's exact
 *    profit margin, overhead, tax rate, and flat-rate settings.
 *  - SUPERIOR REASONING: Uses the most capable reasoning model available
 *    (claude-opus-4-7 → claude-sonnet-4-20250514 → claude-haiku-4-5-20251001)
 *    to think through each project like a seasoned professional with 40+ years of cross-industry experience.
 *
 * Model: claude-opus-4-7 (most powerful model, released Apr 16 2026 — verified in LeadPrime)
 *        Fallback 1: claude-sonnet-4-20250514 (excellent reasoning + tool use)
 *        Fallback 2: claude-haiku-4-5-20251001 (fast last resort)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// ─── Model Configuration ─────────────────────────────────────────────────────
// DEFINITIVE model list — verified from LeadPrime aiModels.ts (same Anthropic account, Apr 2026):
//   claude-opus-4-7           → NEWEST, most powerful (released Apr 16 2026) | 1M ctx | 128k output
//   claude-sonnet-4-20250514  → Excellent reasoning + tool use | 1M ctx
//   claude-haiku-4-5-20251001 → Fast, cheap | 200k ctx
//
// DEPRECATED (return 404 from API — DO NOT USE):
//   claude-3-7-sonnet-20250219, claude-3-5-sonnet-20241022, claude-sonnet-4-5, claude-sonnet-4-6
const PRIMARY_MODEL   = 'claude-opus-4-7';            // Most powerful — ideal for complex estimates
const FALLBACK_MODEL  = 'claude-sonnet-4-20250514';   // Excellent fallback
const FALLBACK2_MODEL = 'claude-haiku-4-5-20251001';  // Fast last resort

// ─── Type Definitions ─────────────────────────────────────────────────────────

export interface UniversalMaterialItem {
  id: string;
  name: string;
  description: string;
  category: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  specifications?: string;
  reasoning?: string;
}

export interface UniversalLaborItem {
  id: string;
  name: string;
  description: string;
  category: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalCost: number;
  skillLevel?: string;
  estimatedHours?: number;
  reasoning?: string;
}

export interface UniversalFinancials {
  rawMaterialsCost: number;
  rawLaborCost: number;
  rawSubtotal: number;
  overheadPercent: number;
  overheadAmount: number;
  markupPercent: number;
  markupAmount: number;
  adjustedSubtotal: number;
  taxRate: number;
  taxOnMaterialsOnly: boolean;
  taxAmount: number;
  baseTotalWithTax: number;
  profitMode: 'margin' | 'flat_rate' | 'none';
  profitPercent: number;
  profitAmount: number;
  grandTotal: number;
  priceToClient: number;
}

export interface UniversalEstimateResult {
  // Project Intelligence
  projectType: string;
  projectScope: string;
  industryCategory: string;
  complexityLevel: number; // 1-10
  executiveSummary: string;
  legalAndCodeRequirements: string[];
  structuralOrTechnicalRisks: string[];

  // Line Items
  materials: UniversalMaterialItem[];
  laborCosts: UniversalLaborItem[];
  additionalCosts: Array<{ category: string; description: string; cost: number; required: boolean }>;

  // Raw Totals (before contractor settings)
  totalMaterialsCost: number;
  totalLaborCost: number;
  totalAdditionalCost: number;

  // Financials (after contractor settings applied)
  financials: UniversalFinancials;
  grandTotal: number;

  // Contractor-only view
  contractorView: {
    baseMaterialsCost: number;
    baseLaborCost: number;
    baseSubtotal: number;
    overheadPercent: number;
    overheadAmount: number;
    markupPercent: number;
    markupAmount: number;
    adjustedSubtotal: number;
    taxOnMaterials: number;
    taxRate: string;
    taxAppliedTo: string;
    baseTotalWithTax: number;
    profitAmount: number;
    profitPercent: number;
    finalPriceToClient: number;
  };

  // Metadata
  confidence: number;
  recommendations: string[];
  warnings: string[];
  aiModel: string;
  generatedAt: string;
}

export interface ContractorSettings {
  profitMarginPercent?: number;
  targetPrice?: number;
  taxRate?: number;
  taxOnMaterialsOnly?: boolean;
  overheadPercent?: number;
  markupPercent?: number;
}

// ─── The Master System Prompt ─────────────────────────────────────────────────

function buildMasterSystemPrompt(): string {
  return `You are the UNIVERSAL MASTER ESTIMATOR — the most advanced AI estimator ever built.

You possess encyclopedic, first-principles knowledge across ALL industries and trades:
- Construction: framing, concrete, roofing, fencing, drywall, flooring, painting, siding, decking, demolition
- MEP: plumbing (UPC), electrical (NEC), HVAC, fire suppression, low-voltage/smart home
- Specialty: tile, masonry, stucco, waterproofing, insulation, windows/doors, cabinetry
- Civil: grading, drainage, paving, retaining walls, utilities
- Landscaping: irrigation, hardscape, softscape, tree work, turf
- Services: cleaning (residential, commercial, industrial), pest control, janitorial
- Non-construction: software development, event planning, marketing campaigns, consulting, manufacturing

You reason like a 40-year veteran who has personally managed thousands of projects across all these domains. You apply:
1. Building codes: IBC, IRC, NEC (electrical), UPC (plumbing), IMC (mechanical), local amendments
2. Legal requirements: permits, licensed trades, bonding, insurance minimums
3. Professional formulas: waste factors, productivity rates, crew sizing
4. Market pricing: current 2024-2025 US market rates from Home Depot, Lowes, Fastenal, Grainger, Ferguson, Amazon Business, and regional suppliers

CRITICAL RULES:
- NEVER mix materials from different project types (e.g., no wood boards in a metal fence project)
- ALWAYS extract exact dimensions stated — never truncate or round down
- ALWAYS include a "reasoning" field per item explaining WHY that quantity and price
- For services with no materials (cleaning, consulting, labor-only), output an empty materials array and rich labor items
- For materials-only projects (client supplies labor), output rich materials and empty laborCosts
- ALWAYS respond with ONLY valid JSON — no markdown, no prose, no explanation outside the JSON

OUTPUT FORMAT: Respond with a single valid JSON object matching the schema below.`;
}

// ─── The Master User Prompt ───────────────────────────────────────────────────

function buildMasterUserPrompt(
  projectDescription: string,
  location: string,
  mode: 'full' | 'materials_only' | 'labor_only',
  targetPrice?: number
): string {
  const { locationContext, multiplier } = resolveLocation(location);

  const modeInstructions = {
    full: 'Generate BOTH materials AND laborCosts. This is a full estimate.',
    materials_only: 'Generate ONLY materials. Set laborCosts to an empty array [].',
    labor_only: 'Generate ONLY laborCosts (services/labor items). Set materials to an empty array []. For each labor item, treat unitPrice as the rate per unit (e.g., per sqft, per hour, per unit).',
  };

  // Flat-rate / negotiated-price instructions injected when contractor has a pre-agreed price
  const flatRateBlock = (targetPrice && targetPrice > 0) ? `
## FLAT RATE / NEGOTIATED PRICE MODE
The contractor has ALREADY AGREED on a total price of $${targetPrice.toFixed(2)} with the client.
Your job is NOT to price the project from scratch — your job is to JUSTIFY that price with a
professional, itemized breakdown that adds up to exactly $${targetPrice.toFixed(2)}.

Rules:
1. Generate realistic, professional items (materials + labor) for this project type.
2. Price each item at fair market rates for the location.
3. After generating items, mentally calculate the raw subtotal.
4. Scale ALL unitPrice and totalPrice/totalCost values proportionally so that:
   rawMaterialsCost + rawLaborCost + rawAdditionalCost = $${targetPrice.toFixed(2)}
   (i.e., the scaling factor = $${targetPrice.toFixed(2)} / rawSubtotal)
5. Round individual items naturally — do NOT show the scaling factor in descriptions.
6. The result must look like a professional estimate that a client would accept,
   not a list of inflated or deflated numbers.
7. In the "reasoning" field of each item, explain WHY this item is needed for the project
   (not that prices were scaled).
` : '';

  return `## PROJECT TO ESTIMATE
"${projectDescription}"

## LOCATION CONTEXT
${locationContext}
Price Multiplier: ${multiplier}x (apply to ALL base prices)

## ANALYSIS MODE
${modeInstructions[mode]}
${flatRateBlock}

## YOUR REASONING PROCESS (think step by step before outputting JSON):

**STEP 1 — INDUSTRY & SCOPE DETECTION**
What industry/trade is this? What is the true scope? Is this materials-only, labor-only, or both?
Complexity level 1-10? (1 = change a lightbulb, 10 = build a skyscraper)

**STEP 2 — LEGAL & CODE COMPLIANCE**
What permits are required? What codes apply (NEC, UPC, IBC, etc.)?
Are there licensed trade requirements? Any structural or safety risks?

**STEP 3 — DIMENSION EXTRACTION**
Extract ALL stated dimensions precisely. Parse commas in numbers ("2,500 sqft" = 2500).
If dimensions are unclear, make a conservative professional estimate and note it in warnings.

**STEP 4 — MATERIAL CALCULATION (if applicable)**
Use the correct professional formula for this specific project type.
Apply appropriate waste factors (e.g., 10% for drywall, 5% for concrete, 10% for flooring).
Include ONLY materials that become permanent parts of the project or consumables used in the work.
EXCLUDE: tools, equipment rentals, safety gear.

**STEP 5 — LABOR CALCULATION (if applicable)**
Use realistic productivity rates and crew sizing for this trade.
For service businesses (cleaning, consulting, etc.), price per the industry-standard unit.

**STEP 6 — PRICING**
Apply the ${multiplier}x location multiplier to all base prices.
Use current 2024-2025 US market rates.

## JSON RESPONSE SCHEMA
{
  "projectType": "string (roofing|fencing|plumbing|electrical|hvac|concrete|drywall|flooring|painting|landscaping|cleaning|decking|siding|framing|demolition|masonry|software|consulting|event|other)",
  "industryCategory": "string (construction|mep|services|non-construction|mixed)",
  "projectScope": "string (1-2 sentence description of the full scope)",
  "complexityLevel": 1,
  "executiveSummary": "string (professional summary of what this project entails)",
  "legalAndCodeRequirements": ["string"],
  "structuralOrTechnicalRisks": ["string"],
  "materials": [
    {
      "id": "mat_001",
      "name": "string",
      "description": "string (brand, grade, spec)",
      "category": "string",
      "quantity": 0,
      "unit": "string (sqft|lf|piece|gallon|bag|roll|sheet|lb|ton|each|cy|sf|lf|hr)",
      "unitPrice": 0.00,
      "totalPrice": 0.00,
      "specifications": "string",
      "reasoning": "string (why this exact quantity and price)"
    }
  ],
  "laborCosts": [
    {
      "id": "lab_001",
      "name": "string",
      "description": "string",
      "category": "string",
      "quantity": 0,
      "unit": "string (sqft|lf|hour|day|unit|project|each)",
      "unitPrice": 0.00,
      "totalCost": 0.00,
      "skillLevel": "string (general|skilled|licensed|specialist)",
      "estimatedHours": 0,
      "reasoning": "string (why this rate and quantity)"
    }
  ],
  "additionalCosts": [
    {
      "category": "string (delivery|permit|disposal|equipment_rental|other)",
      "description": "string",
      "cost": 0.00,
      "required": true
    }
  ],
  "recommendations": ["string"],
  "warnings": ["string"],
  "confidence": 0.90
}`;
}

// ─── Location Resolution ──────────────────────────────────────────────────────

function resolveLocation(location?: string): { locationContext: string; multiplier: number } {
  if (!location || location.trim().length === 0) {
    return { locationContext: 'United States (national average pricing)', multiplier: 1.00 };
  }

  const loc = location.toLowerCase();

  const stateMap: Array<{ patterns: RegExp[]; label: string; mult: number }> = [
    { patterns: [/\bcalifornia\b/, /\bca\b/], label: 'California — Premium market (+20%)', mult: 1.20 },
    { patterns: [/\bnew york\b/, /\bny\b/], label: 'New York — High cost market (+15%)', mult: 1.15 },
    { patterns: [/\bhawaii\b/, /\bhi\b/], label: 'Hawaii — Island premium (+40%)', mult: 1.40 },
    { patterns: [/\balaska\b/, /\bak\b/], label: 'Alaska — Remote premium (+40%)', mult: 1.40 },
    { patterns: [/\bmassachusetts\b/, /\bma\b/], label: 'Massachusetts — High cost (+17%)', mult: 1.17 },
    { patterns: [/\bnew jersey\b/, /\bnj\b/], label: 'New Jersey — High cost (+12%)', mult: 1.12 },
    { patterns: [/\bconnecticut\b/, /\bct\b/], label: 'Connecticut — High cost (+12%)', mult: 1.12 },
    { patterns: [/\bwashington\b/, /\bwa\b/], label: 'Washington — Moderate-high (+12%)', mult: 1.12 },
    { patterns: [/\bcolorado\b/, /\bco\b/], label: 'Colorado — Growing market (+10%)', mult: 1.10 },
    { patterns: [/\boregon\b/, /\bor\b/], label: 'Oregon — Moderate (+7%)', mult: 1.07 },
    { patterns: [/\bflorida\b/, /\bfl\b/], label: 'Florida — Moderate (+7%)', mult: 1.07 },
    { patterns: [/\billinois\b/, /\bil\b/], label: 'Illinois — Moderate (+7%)', mult: 1.07 },
    { patterns: [/\bvirginia\b/, /\bva\b/], label: 'Virginia — Moderate (+7%)', mult: 1.07 },
    { patterns: [/\bnevada\b/, /\bnv\b/], label: 'Nevada — Moderate (+5%)', mult: 1.05 },
    { patterns: [/\bpennsylvania\b/, /\bpa\b/], label: 'Pennsylvania — Moderate (+5%)', mult: 1.05 },
    { patterns: [/\btexas\b/, /\btx\b/], label: 'Texas — Base rate', mult: 1.00 },
    { patterns: [/\bariz/, /\baz\b/], label: 'Arizona — Base rate', mult: 1.00 },
    { patterns: [/\bmichigan\b/, /\bmi\b/], label: 'Michigan — Base rate', mult: 1.00 },
    { patterns: [/\bgeorgia\b/, /\bga\b/], label: 'Georgia — Competitive (-5%)', mult: 0.95 },
    { patterns: [/\bnorth carolina\b/, /\bnc\b/], label: 'North Carolina — Competitive (-5%)', mult: 0.95 },
    { patterns: [/\bsouth carolina\b/, /\bsc\b/], label: 'South Carolina — Low cost (-8%)', mult: 0.92 },
    { patterns: [/\btennessee\b/, /\btn\b/], label: 'Tennessee — Low cost (-8%)', mult: 0.92 },
    { patterns: [/\bohio\b/, /\boh\b/], label: 'Ohio — Low cost (-8%)', mult: 0.92 },
    { patterns: [/\bmissouri\b/, /\bmo\b/], label: 'Missouri — Low cost (-8%)', mult: 0.92 },
    { patterns: [/\barkansas\b/, /\bar\b/], label: 'Arkansas — Low cost (-10%)', mult: 0.90 },
    { patterns: [/\bmississippi\b/, /\bms\b/], label: 'Mississippi — Low cost (-10%)', mult: 0.90 },
  ];

  for (const state of stateMap) {
    if (state.patterns.some(p => p.test(loc))) {
      return {
        locationContext: `${location} | ${state.label}`,
        multiplier: state.mult,
      };
    }
  }

  return {
    locationContext: `${location} | Regional pricing (national average applied)`,
    multiplier: 1.00,
  };
}

// ─── Financial Calculator ─────────────────────────────────────────────────────

function applyContractorFinancials(
  rawMaterialsCost: number,
  rawLaborCost: number,
  rawAdditionalCost: number,
  settings: ContractorSettings
): UniversalFinancials {
  const overheadPercent = settings.overheadPercent ?? 0;
  const markupPercent = settings.markupPercent ?? 0;
  const taxRate = (settings.taxRate ?? 0) / 100;
  const taxOnMaterialsOnly = settings.taxOnMaterialsOnly ?? true;
  const profitMarginPercent = settings.profitMarginPercent ?? 0;
  const targetPrice = settings.targetPrice ?? 0;

  const rawSubtotal = rawMaterialsCost + rawLaborCost + rawAdditionalCost;

  // Apply overhead
  const overheadAmount = rawSubtotal * (overheadPercent / 100);
  const afterOverhead = rawSubtotal + overheadAmount;

  // Apply markup
  const markupAmount = afterOverhead * (markupPercent / 100);
  const adjustedSubtotal = afterOverhead + markupAmount;

  // Apply tax
  const taxBase = taxOnMaterialsOnly ? rawMaterialsCost : adjustedSubtotal;
  const taxAmount = taxBase * taxRate;
  const baseTotalWithTax = adjustedSubtotal + taxAmount;

  // Apply profit
  let profitMode: 'margin' | 'flat_rate' | 'none' = 'none';
  let profitAmount = 0;
  let profitPercent = 0;
  let grandTotal = baseTotalWithTax;

  if (targetPrice > 0) {
    profitMode = 'flat_rate';
    profitAmount = targetPrice - baseTotalWithTax;
    profitPercent = baseTotalWithTax > 0 ? (profitAmount / baseTotalWithTax) * 100 : 0;
    grandTotal = targetPrice;
  } else if (profitMarginPercent > 0) {
    profitMode = 'margin';
    profitAmount = baseTotalWithTax * (profitMarginPercent / 100);
    profitPercent = profitMarginPercent;
    grandTotal = baseTotalWithTax + profitAmount;
  }

  const round = (n: number) => Math.round(n * 100) / 100;

  return {
    rawMaterialsCost: round(rawMaterialsCost),
    rawLaborCost: round(rawLaborCost),
    rawSubtotal: round(rawSubtotal),
    overheadPercent,
    overheadAmount: round(overheadAmount),
    markupPercent,
    markupAmount: round(markupAmount),
    adjustedSubtotal: round(adjustedSubtotal),
    taxRate: taxRate * 100,
    taxOnMaterialsOnly,
    taxAmount: round(taxAmount),
    baseTotalWithTax: round(baseTotalWithTax),
    profitMode,
    profitPercent: round(profitPercent),
    profitAmount: round(profitAmount),
    grandTotal: round(grandTotal),
    priceToClient: round(grandTotal),
  };
}

// ─── JSON Parser ──────────────────────────────────────────────────────────────

function extractJSON(text: string): string | null {
  // Try direct parse first
  const trimmed = text.trim();
  if (trimmed.startsWith('{')) {
    try { JSON.parse(trimmed); return trimmed; } catch (_) {}
  }

  // Extract from markdown code blocks
  const codeBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    try { JSON.parse(codeBlockMatch[1]); return codeBlockMatch[1]; } catch (_) {}
  }

  // Find first { to last }
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const candidate = trimmed.slice(firstBrace, lastBrace + 1);
    try { JSON.parse(candidate); return candidate; } catch (_) {}
  }

  return null;
}

// ─── Main Engine Class ────────────────────────────────────────────────────────

export class UniversalIntelligenceEngine {
  private async callClaude(
    systemPrompt: string,
    userPrompt: string,
    maxTokens: number = 8000
  ): Promise<{ text: string; modelUsed: string }> {
    const isModelError = (e: any) =>
      e.status === 404 || e.status === 400 ||
      e.status === 402 || // Payment Required — model not available on current plan
      e.status === 403 || // Forbidden — model access denied
      e.status === 529 || // Anthropic overloaded
      e.message?.includes('model') ||
      e.message?.includes('not found') ||
      e.message?.includes('does not exist') ||
      e.message?.includes('payment') ||
      e.message?.includes('billing') ||
      e.message?.includes('access') ||
      e.message?.includes('unavailable');

    const callModel = async (model: string) => {
      const response = await anthropic.messages.create({
        model,
        max_tokens: maxTokens,
        temperature: 0.1,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      });
      const content = response.content[0];
      if (content.type !== 'text') throw new Error('Non-text response from Claude');
      return content.text;
    };

    // Tier 1 — Claude Opus 4.7 (most capable)
    try {
      const text = await callModel(PRIMARY_MODEL);
      console.log(`✅ [UIE] Using ${PRIMARY_MODEL}`);
      return { text, modelUsed: PRIMARY_MODEL };
    } catch (e1: any) {
      if (!isModelError(e1)) throw e1;
      console.warn(`⚠️ [UIE] ${PRIMARY_MODEL} unavailable, trying ${FALLBACK_MODEL}`);
    }

    // Tier 2 — Claude Sonnet 4.6
    try {
      const text = await callModel(FALLBACK_MODEL);
      console.log(`✅ [UIE] Using fallback ${FALLBACK_MODEL}`);
      return { text, modelUsed: FALLBACK_MODEL };
    } catch (e2: any) {
      if (!isModelError(e2)) throw e2;
      console.warn(`⚠️ [UIE] ${FALLBACK_MODEL} unavailable, trying ${FALLBACK2_MODEL}`);
    }

    // Tier 3 — Claude Haiku 4.5 (last resort)
    const text = await callModel(FALLBACK2_MODEL);
    console.log(`✅ [UIE] Using last-resort ${FALLBACK2_MODEL}`);
    return { text, modelUsed: FALLBACK2_MODEL };
  }

  /**
   * Main entry point — generates a full estimate for any project.
   *
   * @param projectDescription  Natural language description of the project
   * @param location            Optional location string (city, state, zip)
   * @param mode                'full' | 'materials_only' | 'labor_only'
   * @param settings            Contractor's financial settings (tax, margin, etc.)
   */
  async estimate(
    projectDescription: string,
    location: string = '',
    mode: 'full' | 'materials_only' | 'labor_only' = 'full',
    settings: ContractorSettings = {}
  ): Promise<UniversalEstimateResult> {
    console.log(`🧠 [UIE] Starting Universal Intelligence Engine`, {
      mode,
      location: location || 'national average',
      description: projectDescription.substring(0, 120),
    });

    const systemPrompt = buildMasterSystemPrompt();
    const userPrompt = buildMasterUserPrompt(projectDescription, location, mode, settings.targetPrice);

    let rawText: string;
    let modelUsed = PRIMARY_MODEL;

    try {
      const result = await this.callClaude(systemPrompt, userPrompt, 10000);
      rawText = result.text;
      modelUsed = result.modelUsed;
    } catch (err: any) {
      console.error(`❌ [UIE] All Claude models failed:`, err.message);
      throw new Error(`Universal Intelligence Engine failed: ${err.message}`);
    }

    // Parse JSON
    const jsonStr = extractJSON(rawText);
    if (!jsonStr) {
      throw new Error('UIE: Could not extract valid JSON from AI response');
    }

    let parsed: any;
    try {
      parsed = JSON.parse(jsonStr);
    } catch (e) {
      throw new Error('UIE: JSON parse error after extraction');
    }

    // Normalize arrays
    const materials: UniversalMaterialItem[] = (parsed.materials || []).map((m: any, i: number) => ({
      id: m.id || `mat_${String(i + 1).padStart(3, '0')}`,
      name: m.name || 'Unknown Material',
      description: m.description || '',
      category: m.category || 'general',
      quantity: Number(m.quantity) || 0,
      unit: m.unit || 'each',
      unitPrice: Number(m.unitPrice) || 0,
      totalPrice: Number(m.totalPrice) || Number(m.quantity) * Number(m.unitPrice) || 0,
      specifications: m.specifications || '',
      reasoning: m.reasoning || '',
    }));

    const laborCosts: UniversalLaborItem[] = (parsed.laborCosts || []).map((l: any, i: number) => ({
      id: l.id || `lab_${String(i + 1).padStart(3, '0')}`,
      name: l.name || 'Unknown Labor',
      description: l.description || '',
      category: l.category || 'labor',
      quantity: Number(l.quantity) || 0,
      unit: l.unit || 'hour',
      unitPrice: Number(l.unitPrice) || 0,
      totalCost: Number(l.totalCost) || Number(l.quantity) * Number(l.unitPrice) || 0,
      skillLevel: l.skillLevel || 'skilled',
      estimatedHours: Number(l.estimatedHours) || 0,
      reasoning: l.reasoning || '',
    }));

    const additionalCosts = (parsed.additionalCosts || []).map((a: any) => ({
      category: a.category || 'other',
      description: a.description || '',
      cost: Number(a.cost) || 0,
      required: Boolean(a.required),
    }));

    // ── Flat-rate server-side safety net ────────────────────────────────────
    // If the contractor set a negotiated price, scale ALL item prices so that
    // the raw subtotal equals targetPrice EXACTLY before applying financials.
    // This guarantees the final total matches the agreed price even if the AI
    // scaling was slightly off.
    const targetPrice = settings.targetPrice ?? 0;
    if (targetPrice > 0) {
      const rawSubtotalBeforeScale =
        materials.reduce((s, m) => s + m.totalPrice, 0) +
        laborCosts.reduce((s, l) => s + l.totalCost, 0) +
        additionalCosts.reduce((s: number, a: { cost: number }) => s + a.cost, 0);

      if (rawSubtotalBeforeScale > 0) {
        const scalingFactor = targetPrice / rawSubtotalBeforeScale;
        // Scale materials
        materials.forEach(m => {
          m.unitPrice  = Math.round(m.unitPrice  * scalingFactor * 100) / 100;
          m.totalPrice = Math.round(m.totalPrice * scalingFactor * 100) / 100;
        });
        // Scale labor
        laborCosts.forEach(l => {
          l.unitPrice = Math.round(l.unitPrice * scalingFactor * 100) / 100;
          l.totalCost = Math.round(l.totalCost * scalingFactor * 100) / 100;
        });
        // Scale additional costs
        additionalCosts.forEach((a: { cost: number }) => {
          a.cost = Math.round(a.cost * scalingFactor * 100) / 100;
        });
      }
    }

    // Calculate raw totals
    const totalMaterialsCost = materials.reduce((s, m) => s + m.totalPrice, 0);
    const totalLaborCost = laborCosts.reduce((s, l) => s + l.totalCost, 0);
    const totalAdditionalCost = additionalCosts.reduce((s: number, a: { cost: number }) => s + a.cost, 0);

    // Apply contractor financial settings
    const financials = applyContractorFinancials(
      totalMaterialsCost,
      totalLaborCost,
      totalAdditionalCost,
      settings
    );

    // Build contractor view
    const contractorView = {
      baseMaterialsCost: Math.round(totalMaterialsCost * 100) / 100,
      baseLaborCost: Math.round(totalLaborCost * 100) / 100,
      baseSubtotal: Math.round((totalMaterialsCost + totalLaborCost + totalAdditionalCost) * 100) / 100,
      overheadPercent: financials.overheadPercent,
      overheadAmount: financials.overheadAmount,
      markupPercent: financials.markupPercent,
      markupAmount: financials.markupAmount,
      adjustedSubtotal: financials.adjustedSubtotal,
      taxOnMaterials: financials.taxAmount,
      taxRate: `${financials.taxRate.toFixed(2)}%`,
      taxAppliedTo: financials.taxOnMaterialsOnly ? 'materials_only' : 'full_subtotal',
      baseTotalWithTax: financials.baseTotalWithTax,
      profitAmount: financials.profitAmount,
      profitPercent: financials.profitPercent,
      finalPriceToClient: financials.grandTotal,
    };

    console.log(`✅ [UIE] Estimate complete`, {
      projectType: parsed.projectType,
      materials: materials.length,
      labor: laborCosts.length,
      grandTotal: financials.grandTotal,
      model: modelUsed,
    });

    return {
      projectType: parsed.projectType || 'general',
      projectScope: parsed.projectScope || projectDescription.substring(0, 200),
      industryCategory: parsed.industryCategory || 'construction',
      complexityLevel: Number(parsed.complexityLevel) || 5,
      executiveSummary: parsed.executiveSummary || parsed.projectScope || '',
      legalAndCodeRequirements: parsed.legalAndCodeRequirements || [],
      structuralOrTechnicalRisks: parsed.structuralOrTechnicalRisks || [],
      materials,
      laborCosts,
      additionalCosts,
      totalMaterialsCost: Math.round(totalMaterialsCost * 100) / 100,
      totalLaborCost: Math.round(totalLaborCost * 100) / 100,
      totalAdditionalCost: Math.round(totalAdditionalCost * 100) / 100,
      financials,
      grandTotal: financials.grandTotal,
      contractorView,
      confidence: Math.min(1, Math.max(0, Number(parsed.confidence) || 0.85)),
      recommendations: parsed.recommendations || [],
      warnings: parsed.warnings || [],
      aiModel: modelUsed,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Converts a UniversalEstimateResult into the legacy DeepSearchResult format
   * so existing frontend code continues to work without modification.
   */
  toLegacyFormat(result: UniversalEstimateResult): any {
    return {
      projectType: result.projectType,
      projectScope: result.projectScope,
      materials: result.materials.map(m => ({
        id: m.id,
        name: m.name,
        description: m.description,
        category: m.category,
        quantity: m.quantity,
        unit: m.unit,
        unitPrice: m.unitPrice,
        totalPrice: m.totalPrice,
        supplier: 'Home Depot / Lowes / Regional',
        sku: 'TBD',
        specifications: m.specifications,
      })),
      laborCosts: result.laborCosts.map(l => ({
        id: l.id,
        name: l.name,
        description: l.description,
        category: l.category,
        quantity: l.quantity,
        unit: l.unit,
        unitPrice: l.unitPrice,
        totalCost: l.totalCost,
        skillLevel: l.skillLevel,
        complexity: result.complexityLevel >= 7 ? 'high' : result.complexityLevel >= 4 ? 'medium' : 'low',
        estimatedTime: l.estimatedHours ? `${l.estimatedHours}h` : 'TBD',
        includes: [],
      })),
      additionalCosts: result.additionalCosts,
      totalMaterialsCost: result.totalMaterialsCost,
      totalLaborCost: result.totalLaborCost,
      totalAdditionalCost: result.totalAdditionalCost,
      taxAmount: result.financials.taxAmount,
      taxRate: result.financials.taxRate / 100,
      taxAppliedTo: result.financials.taxOnMaterialsOnly ? 'materials_only' : 'full_subtotal',
      baseSubtotal: result.financials.rawSubtotal,
      baseTotalWithTax: result.financials.baseTotalWithTax,
      grandTotal: result.grandTotal,
      profitMargin: result.financials.profitMode !== 'none' ? {
        mode: result.financials.profitMode,
        profitPercent: result.financials.profitPercent,
        profitAmount: result.financials.profitAmount,
        baseCost: result.financials.baseTotalWithTax,
        priceToClient: result.grandTotal,
        scalingFactor: result.financials.baseTotalWithTax > 0
          ? result.grandTotal / result.financials.baseTotalWithTax
          : 1,
      } : null,
      contractorView: result.contractorView,
      confidence: result.confidence,
      recommendations: [
        result.executiveSummary,
        ...result.legalAndCodeRequirements.map(r => `📋 ${r}`),
        ...result.recommendations,
      ].filter(Boolean),
      warnings: [
        ...result.structuralOrTechnicalRisks.map(r => `⚠️ ${r}`),
        ...result.warnings,
      ].filter(Boolean),
    };
  }
}

// Singleton export
export const universalIntelligenceEngine = new UniversalIntelligenceEngine();

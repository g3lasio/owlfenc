/**
 * estimateFormatter.ts — Shared utility for estimate data formatting
 *
 * Single source of truth for:
 *  - Contractor full address assembly (street + city, state, zip)
 *  - Financial totals display logic (discount, tax, overhead/markup visibility)
 *  - Project description sanitization
 *
 * Used by:
 *  - server/puppeteer-pdf-service.ts  (PDF generation)
 *  - client/src/pages/SharedEstimate.tsx  (web view)
 *  - client/src/pages/EstimatesWizard.tsx (share URL data assembly)
 */

// ─── Address helpers ──────────────────────────────────────────────────────────

export interface ContractorAddress {
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
}

/**
 * Returns a single-line full address string.
 * e.g. "123 Main St, Austin, TX 78701"
 */
export function buildFullAddress(c: ContractorAddress): string {
  const street = c.address?.trim() || '';
  const cityStateZip = [c.city, c.state, c.zipCode]
    .map((v) => v?.trim())
    .filter(Boolean)
    .join(', ');
  return [street, cityStateZip].filter(Boolean).join(', ');
}

// ─── Financial display helpers ────────────────────────────────────────────────

export interface EstimateFinancials {
  subtotal: number;
  tax?: number;
  taxRate?: number;
  total: number;
  discountAmount?: number;
  discountName?: string;
  /** Pricing strategy: 'A' = simple, 'B' = overhead/markup visible */
  pricingStrategy?: 'A' | 'B' | string;
  overheadAmount?: number;
  markupAmount?: number;
  operationalCostsAmount?: number;
}

export interface FinancialDisplayRows {
  showDiscount: boolean;
  showTax: boolean;
  showOverhead: boolean;
  showMarkup: boolean;
  showOperational: boolean;
}

export function getFinancialDisplayRows(f: EstimateFinancials): FinancialDisplayRows {
  const isStrategyB = f.pricingStrategy === 'B';
  return {
    showDiscount: (f.discountAmount ?? 0) > 0,
    showTax: (f.tax ?? 0) > 0 && (f.taxRate ?? 0) > 0,
    showOverhead: isStrategyB && (f.overheadAmount ?? 0) > 0,
    showMarkup: isStrategyB && (f.markupAmount ?? 0) > 0,
    showOperational: isStrategyB && (f.operationalCostsAmount ?? 0) > 0,
  };
}

// ─── Project description helpers ─────────────────────────────────────────────

/**
 * Returns the first line of a project description, stripped of markdown bold
 * markers, up to maxLength characters.
 */
export function getProjectDescriptionTitle(
  description: string | undefined,
  maxLength = 120
): string {
  if (!description) return 'Construction Services';
  return description
    .split('\n')[0]
    .replace(/\*\*/g, '')
    .trim()
    .substring(0, maxLength);
}

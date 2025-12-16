/**
 * Partial Lien Waiver Template - Premium Legal Edition
 * Version 2.1 - Jurisdiction-Aware
 * 
 * Generic Partial Lien Waiver with strong, lender-friendly language.
 * Automatically adapts legal language based on project jurisdiction.
 * Designed to pass lender review without hesitation.
 * 
 * Single signature: Contractor/Claimant only
 * 
 * State Support:
 * - GENERIC: Default for most states (strong, lender-friendly)
 * - STATUTORY: CA, TX, AZ, NV (state-mandated language)
 * - SEMI-STRUCTURED: FL, GA, NC, SC, TN (generic + state notice)
 */

import { templateRegistry, TemplateData, ContractorBranding } from '../registry';
import { formatDate, formatCurrency } from '../shared/baseLayout';
import { 
  detectJurisdictionForLienWaiver, 
  getLienWaiverOverlay, 
  validateStatutoryRequirements,
  type LienWaiverOverlayData,
  type OverlayType
} from '../overlays/lienWaiverOverlays';

function generatePartialLienWaiverHTML(data: TemplateData, branding: ContractorBranding): string {
  const contractorName = branding.companyName || data.contractor.name || 'Contractor';
  const contractorAddress = branding.address || data.contractor.address || '';
  const contractorLicense = branding.licenseNumber || data.contractor.license || '';
  const contractorPhone = branding.phone || data.contractor.phone || '';
  const contractorEmail = branding.email || data.contractor.email || '';

  const currentDate = formatDate();
  
  const lienWaiver = data.lienWaiver || {
    paymentAmount: data.financials.total * 0.3,
    paymentDate: currentDate,
    paymentPeriod: 'Progress Payment',
    throughDate: currentDate,
    isFinal: false,
    remainingBalance: data.financials.total * 0.7,
  };

  const throughDate = lienWaiver.throughDate || currentDate;
  const ownerName = lienWaiver.ownerName || data.client.name;
  const payingParty = lienWaiver.payingParty || data.client.name;
  const paymentMethodText = lienWaiver.paymentMethod === 'ach' ? 'ACH transfer' :
                            lienWaiver.paymentMethod === 'wire' ? 'wire transfer' :
                            lienWaiver.paymentMethod === 'check' ? 'check' : 'payment';
  const paymentRefText = lienWaiver.paymentReference ? ` (Ref: ${lienWaiver.paymentReference})` : '';

  // Jurisdiction Detection - Automatic, no user input required
  // Extracts state from addresses for fallback chain: project → contract → company → GENERIC
  const STATE_NAME_MAP: Record<string, string> = {
    'california': 'CA', 'texas': 'TX', 'arizona': 'AZ', 'nevada': 'NV',
    'florida': 'FL', 'georgia': 'GA', 'north carolina': 'NC', 'south carolina': 'SC',
    'tennessee': 'TN', 'new york': 'NY', 'new jersey': 'NJ', 'pennsylvania': 'PA',
    'ohio': 'OH', 'illinois': 'IL', 'michigan': 'MI', 'washington': 'WA',
    'oregon': 'OR', 'colorado': 'CO', 'massachusetts': 'MA', 'virginia': 'VA',
    'maryland': 'MD', 'connecticut': 'CT', 'utah': 'UT', 'louisiana': 'LA',
    'alabama': 'AL', 'kentucky': 'KY', 'missouri': 'MO', 'minnesota': 'MN',
    'wisconsin': 'WI', 'indiana': 'IN', 'iowa': 'IA', 'kansas': 'KS',
    'arkansas': 'AR', 'mississippi': 'MS', 'oklahoma': 'OK', 'new mexico': 'NM',
    'nebraska': 'NE', 'idaho': 'ID', 'montana': 'MT', 'wyoming': 'WY',
    'hawaii': 'HI', 'alaska': 'AK', 'maine': 'ME', 'vermont': 'VT',
    'new hampshire': 'NH', 'rhode island': 'RI', 'delaware': 'DE',
    'west virginia': 'WV', 'north dakota': 'ND', 'south dakota': 'SD'
  };

  const extractStateFromBrandingAddress = (address: string): string | undefined => {
    if (!address) return undefined;
    const normalizedAddress = address.toLowerCase();
    
    // Check full state names first
    for (const [stateName, stateCode] of Object.entries(STATE_NAME_MAP)) {
      if (normalizedAddress.includes(stateName)) {
        return stateCode;
      }
    }
    
    // Common patterns: "City, ST 12345" or "City, State" or just "CA"
    const stateMatch = address.match(/,\s*([A-Z]{2})\s*\d{5}/i) || 
                      address.match(/,\s*([A-Z]{2})$/i) ||
                      address.match(/\b([A-Z]{2})\b/);
    return stateMatch ? stateMatch[1].toUpperCase() : undefined;
  };

  const jurisdiction = detectJurisdictionForLienWaiver({
    projectLocation: data.project.location,
    contractLocation: data.client.address || undefined, // Contract/client location as second priority
    companyState: branding.address ? extractStateFromBrandingAddress(branding.address) : undefined
  });
  
  const overlay = getLienWaiverOverlay(jurisdiction.stateCode);
  const isStatutory = overlay.overlayType === 'STATUTORY';
  const isSemiStructured = overlay.overlayType === 'SEMI_STRUCTURED';
  
  // Validate statutory requirements if applicable
  if (isStatutory) {
    const validation = validateStatutoryRequirements(jurisdiction.stateCode, {
      claimantName: contractorName,
      ownerName: ownerName,
      projectLocation: data.project.location,
      throughDate: formatDate(throughDate),
      paymentAmount: formatCurrency(lienWaiver.paymentAmount)
    });
    
    if (!validation.valid) {
      console.warn(`⚠️ [LIEN-WAIVER] Statutory validation failed for ${jurisdiction.stateCode}:`, validation.missingFields);
    }
  }

  // Prepare overlay data for state-specific content
  const overlayData: LienWaiverOverlayData = {
    claimantName: contractorName,
    claimantAddress: contractorAddress,
    claimantLicense: contractorLicense,
    ownerName: ownerName,
    customerName: payingParty,
    projectLocation: data.project.location,
    throughDate: formatDate(throughDate),
    paymentAmount: formatCurrency(lienWaiver.paymentAmount),
    paymentReference: lienWaiver.paymentReference,
    paymentMethod: paymentMethodText,
    exceptions: lienWaiver.exceptions,
    documentDate: currentDate
  };

  // Generate jurisdiction-specific legal body - ALL overlays now use the overlay's waiverBodyHTML
  // STATUTORY: Full state-specific language
  // SEMI_STRUCTURED: Generic + state compliance notice
  // GENERIC: Base lender-friendly language
  const overlayLegalBody = overlay.waiverBodyHTML(overlayData);
  
  // Jurisdiction badge for document header
  const jurisdictionBadge = jurisdiction.stateCode !== 'GENERIC' 
    ? `<div class="jurisdiction-badge" style="display: inline-block; margin-left: 12px; padding: 3px 10px; background: ${isStatutory ? '#fef3c7' : '#dbeafe'}; border: 1px solid ${isStatutory ? '#f59e0b' : '#3b82f6'}; font-size: 8pt; text-transform: uppercase; letter-spacing: 0.5px; color: ${isStatutory ? '#92400e' : '#1e40af'}; border-radius: 3px;">${jurisdiction.stateName}${isStatutory ? ' Statutory Form' : ''}</div>`
    : '';

  return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Conditional Waiver and Release Upon Progress Payment</title>
    <style>
        @page {
            size: 8.5in 11in;
            margin: 0.6in 0.75in;
        }
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: 'Times New Roman', Georgia, serif;
            font-size: 11pt;
            line-height: 1.45;
            color: #1a1a1a;
            background: #fff;
        }
        
        /* Premium Header */
        .document-header {
            text-align: center;
            padding-bottom: 20px;
            margin-bottom: 20px;
            border-bottom: 3px double #2c3e50;
        }
        .document-title {
            font-size: 16pt;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 2px;
            color: #1a1a1a;
            margin-bottom: 6px;
        }
        .document-subtitle {
            font-size: 12pt;
            font-weight: bold;
            color: #34495e;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .document-type-badge {
            display: inline-block;
            margin-top: 10px;
            padding: 4px 16px;
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            font-size: 9pt;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: #6c757d;
        }
        
        /* Legal Notice Box */
        .legal-notice {
            border: 2px solid #c0392b;
            background: linear-gradient(to bottom, #fdf2f2, #fff);
            padding: 12px 16px;
            margin: 18px 0;
        }
        .legal-notice-header {
            font-size: 10pt;
            font-weight: bold;
            text-transform: uppercase;
            color: #c0392b;
            letter-spacing: 1px;
            margin-bottom: 6px;
        }
        .legal-notice-text {
            font-size: 9.5pt;
            color: #333;
            line-height: 1.5;
            text-align: justify;
        }
        
        /* Summary Grid */
        .summary-section {
            margin: 22px 0;
        }
        .summary-grid {
            display: table;
            width: 100%;
            border-collapse: collapse;
        }
        .summary-row {
            display: table-row;
        }
        .summary-label {
            display: table-cell;
            width: 180px;
            padding: 8px 12px 8px 0;
            font-weight: bold;
            font-size: 10pt;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #34495e;
            vertical-align: top;
            border-bottom: 1px solid #ecf0f1;
        }
        .summary-value {
            display: table-cell;
            padding: 8px 0;
            font-size: 11pt;
            border-bottom: 1px solid #ecf0f1;
        }
        
        /* Payment Amount Box */
        .payment-box {
            margin: 24px 0;
            border: 2px solid #2c3e50;
            background: #f8f9fa;
        }
        .payment-box-header {
            background: #2c3e50;
            color: white;
            padding: 10px 16px;
            font-size: 10pt;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 1px;
            text-align: center;
        }
        .payment-box-content {
            padding: 16px;
            text-align: center;
        }
        .payment-amount {
            font-size: 22pt;
            font-weight: bold;
            color: #2c3e50;
            margin: 8px 0;
        }
        .payment-through-date {
            font-size: 10pt;
            color: #555;
            margin-top: 8px;
        }
        .payment-through-date strong {
            color: #2c3e50;
        }
        .remaining-balance {
            margin-top: 12px;
            padding-top: 12px;
            border-top: 1px dashed #ccc;
            font-size: 10pt;
            color: #666;
        }
        
        /* Legal Body */
        .legal-body {
            margin: 24px 0;
        }
        .legal-paragraph {
            text-align: justify;
            margin-bottom: 14px;
            font-size: 11pt;
            line-height: 1.6;
        }
        .legal-paragraph strong {
            color: #1a1a1a;
        }
        
        /* Conditional Section */
        .conditional-section {
            margin: 24px 0;
            padding: 16px;
            background: #f8f9fa;
            border-left: 4px solid #2c3e50;
        }
        .conditional-header {
            font-size: 11pt;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: #2c3e50;
            margin-bottom: 12px;
        }
        .conditional-item {
            display: flex;
            align-items: flex-start;
            margin: 8px 0;
            font-size: 10pt;
            line-height: 1.5;
        }
        .conditional-check {
            width: 18px;
            height: 18px;
            min-width: 18px;
            border: 1.5px solid #2c3e50;
            background: #fff;
            margin-right: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 11pt;
            color: #2c3e50;
            font-weight: bold;
        }
        
        /* Exceptions Section */
        .exceptions-section {
            margin: 20px 0;
            padding: 14px;
            border: 1px solid #e0e0e0;
            background: #fafafa;
        }
        .exceptions-header {
            font-size: 10pt;
            font-weight: bold;
            text-transform: uppercase;
            margin-bottom: 8px;
            color: #555;
        }
        .exceptions-content {
            font-size: 10pt;
            min-height: 40px;
            color: #333;
        }
        .no-exceptions {
            color: #888;
            font-style: italic;
        }
        
        /* Signature Section */
        .signature-section {
            margin-top: 36px;
            page-break-inside: avoid;
        }
        .signature-header {
            font-size: 11pt;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: #2c3e50;
            padding-bottom: 8px;
            border-bottom: 2px solid #2c3e50;
            margin-bottom: 20px;
        }
        .signature-block {
            max-width: 400px;
        }
        .signer-company {
            font-size: 11pt;
            font-weight: bold;
            color: #1a1a1a;
            margin-bottom: 4px;
        }
        .signer-label {
            font-size: 9pt;
            color: #666;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .signature-line {
            border-bottom: 1px solid #1a1a1a;
            height: 36px;
            margin: 24px 0 4px 0;
        }
        .signature-fields {
            margin-top: 20px;
        }
        .signature-field-row {
            display: flex;
            margin: 10px 0;
            align-items: baseline;
        }
        .signature-field-label {
            width: 100px;
            font-size: 9pt;
            font-weight: bold;
            text-transform: uppercase;
            color: #555;
        }
        .signature-field-line {
            flex: 1;
            border-bottom: 1px solid #999;
            margin-left: 10px;
        }
        
        /* Footer */
        .document-footer {
            margin-top: 40px;
            padding-top: 16px;
            border-top: 1px solid #ddd;
            text-align: center;
        }
        .footer-brand {
            font-size: 8pt;
            color: #888;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .footer-legal {
            font-size: 7.5pt;
            color: #aaa;
            margin-top: 4px;
        }
    </style>
</head>
<body>

<div class="document-header">
    <div class="document-title">Conditional Waiver and Release</div>
    <div class="document-subtitle">Upon Progress Payment</div>
    <div style="display: flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: 8px;">
        <div class="document-type-badge">Partial Lien Waiver</div>
        ${jurisdictionBadge}
    </div>
</div>

<div class="legal-notice">
    <div class="legal-notice-header">Notice to Property Owner and Paying Party</div>
    <div class="legal-notice-text">
        This document waives the claimant's lien, stop payment notice, and payment bond rights 
        through the date specified below, effective only upon actual receipt and clearance of the 
        stated payment. Rights for work or materials furnished after the through date are expressly 
        reserved. Before any recipient relies on this document, verification of payment is recommended.
    </div>
</div>

<div class="summary-section">
    <div class="summary-grid">
        <div class="summary-row">
            <span class="summary-label">Claimant</span>
            <span class="summary-value">${contractorName}${contractorLicense ? ` (Lic. #${contractorLicense})` : ''}</span>
        </div>
        ${contractorAddress ? `
        <div class="summary-row">
            <span class="summary-label">Claimant Address</span>
            <span class="summary-value">${contractorAddress}</span>
        </div>
        ` : ''}
        <div class="summary-row">
            <span class="summary-label">Customer / Paying Party</span>
            <span class="summary-value">${payingParty}</span>
        </div>
        <div class="summary-row">
            <span class="summary-label">Owner</span>
            <span class="summary-value">${ownerName}</span>
        </div>
        <div class="summary-row">
            <span class="summary-label">Job Location</span>
            <span class="summary-value">${data.project.location}</span>
        </div>
    </div>
</div>

<div class="payment-box">
    <div class="payment-box-header">Progress Payment Amount</div>
    <div class="payment-box-content">
        <div class="payment-amount">${formatCurrency(lienWaiver.paymentAmount)}</div>
        <div class="payment-through-date">
            For labor, services, equipment, and materials furnished through <strong>${formatDate(throughDate)}</strong>
        </div>
        ${lienWaiver.paymentReference ? `
        <div style="font-size: 9pt; color: #666; margin-top: 6px;">
            Payment Reference: ${paymentMethodText}${paymentRefText}
        </div>
        ` : ''}
        ${lienWaiver.remainingBalance !== undefined && lienWaiver.remainingBalance > 0 ? `
        <div class="remaining-balance">
            Remaining Contract Balance: <strong>${formatCurrency(lienWaiver.remainingBalance)}</strong>
        </div>
        ` : ''}
    </div>
</div>

<!-- JURISDICTION-AWARE LEGAL BODY: ${overlay.overlayType} - ${jurisdiction.stateName} -->
<!-- Note: All overlays (GENERIC, SEMI_STRUCTURED, STATUTORY) contain complete self-contained content -->
<!-- including conditional language, reservations, exceptions, and legal notices -->
${overlayLegalBody}

<div class="signature-section">
    <div class="signature-header">Claimant Signature</div>
    
    <div class="signature-block">
        <div class="signer-company">${contractorName}</div>
        <div class="signer-label">Claimant / Contractor</div>
        
        <div class="signature-line"></div>
        <div class="signer-label">Authorized Signature</div>
        
        <div class="signature-fields">
            <div class="signature-field-row">
                <span class="signature-field-label">Print Name</span>
                <span class="signature-field-line"></span>
            </div>
            <div class="signature-field-row">
                <span class="signature-field-label">Title</span>
                <span class="signature-field-line"></span>
            </div>
            <div class="signature-field-row">
                <span class="signature-field-label">Date</span>
                <span class="signature-field-line"></span>
            </div>
        </div>
    </div>
</div>

<div class="document-footer">
    <div class="footer-brand">Powered by Mervin AI</div>
    <div class="footer-legal">This document was generated using professional legal document automation.</div>
</div>

</body>
</html>`;
}

templateRegistry.register({
  id: 'lien-waiver-partial',
  name: 'lien-waiver-partial',
  displayName: 'Partial Lien Waiver',
  description: 'Conditional waiver releasing lien rights for progress payments received. Automatically adapts to state-specific requirements.',
  category: 'document',
  subcategory: 'legal',
  status: 'active',
  templateVersion: '2.1',
  signatureType: 'single',
  includesSignaturePlaceholders: true,
  supportsJurisdictionOverlay: true,
  requiredFields: [
    'client.name',
    'contractor.name',
    'project.location',
    'financials.total',
    'lienWaiver.paymentAmount',
    'lienWaiver.throughDate',
  ],
  optionalFields: [
    'lienWaiver.paymentDate',
    'lienWaiver.remainingBalance',
    'lienWaiver.paymentMethod',
    'lienWaiver.paymentReference',
    'lienWaiver.exceptions',
    'lienWaiver.ownerName',
    'lienWaiver.payingParty',
  ],
  priority: 40,
  icon: 'FileCheck',
  generateHTML: generatePartialLienWaiverHTML,
});

/**
 * Unified Lien Waiver Template - Premium Legal Edition
 * Version 3.0 - Unified Partial/Final with Jurisdiction-Awareness
 * 
 * Single template handling both Partial (Progress) and Final lien waivers.
 * Automatically adapts legal language based on:
 * - Waiver Type: partial (conditional) vs final (unconditional)
 * - Jurisdiction: State-specific statutory forms where required
 * 
 * Single signature: Contractor/Claimant only
 * 
 * Waiver Types:
 * - PARTIAL: Conditional release for progress payments, requires throughDate
 * - FINAL: Unconditional full release upon final payment
 * 
 * State Support:
 * - GENERIC: Default for most states (strong, lender-friendly)
 * - STATUTORY: CA, TX, AZ, NV (state-mandated language)
 * - SEMI_STRUCTURED: FL, GA, NC, SC, TN (generic + state notice)
 */

import { templateRegistry, TemplateData, ContractorBranding } from '../registry';
import { formatDate, formatCurrency } from '../shared/baseLayout';
import { 
  detectJurisdictionForLienWaiver, 
  getLienWaiverOverlay,
  getFinalLienWaiverOverlay,
  validateStatutoryRequirements,
  type LienWaiverOverlayData,
  type OverlayType
} from '../overlays/lienWaiverOverlays';

type WaiverType = 'partial' | 'final';

function generateUnifiedLienWaiverHTML(data: TemplateData, branding: ContractorBranding): string {
  const contractorName = branding.companyName || data.contractor.name || 'Contractor';
  const contractorAddress = branding.address || data.contractor.address || '';
  const contractorLicense = branding.licenseNumber || data.contractor.license || '';
  const contractorPhone = branding.phone || data.contractor.phone || '';
  const contractorEmail = branding.email || data.contractor.email || '';

  const currentDate = formatDate();
  
  const lienWaiver = data.lienWaiver || {
    paymentAmount: data.financials.total,
    paymentDate: currentDate,
    paymentPeriod: 'Payment',
    throughDate: currentDate,
    waiverType: 'partial' as WaiverType,
    isFinal: false,
    remainingBalance: 0,
  };

  const waiverType: WaiverType = lienWaiver.waiverType || (lienWaiver.isFinal ? 'final' : 'partial');
  const isFinalWaiver = waiverType === 'final';
  
  const throughDate = lienWaiver.throughDate || currentDate;
  const ownerName = lienWaiver.ownerName || data.client.name;
  const payingParty = lienWaiver.payingParty || data.client.name;
  const paymentMethodText = lienWaiver.paymentMethod === 'ach' ? 'ACH transfer' :
                            lienWaiver.paymentMethod === 'wire' ? 'wire transfer' :
                            lienWaiver.paymentMethod === 'check' ? 'check' : 'payment';
  const paymentRefText = lienWaiver.paymentReference ? ` (Ref: ${lienWaiver.paymentReference})` : '';

  // Jurisdiction Detection - Automatic, no user input required
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
    
    for (const [stateName, stateCode] of Object.entries(STATE_NAME_MAP)) {
      if (normalizedAddress.includes(stateName)) {
        return stateCode;
      }
    }
    
    const stateMatch = address.match(/,\s*([A-Z]{2})\s*\d{5}/i) || 
                      address.match(/,\s*([A-Z]{2})$/i) ||
                      address.match(/\b([A-Z]{2})\b/);
    return stateMatch ? stateMatch[1].toUpperCase() : undefined;
  };

  const jurisdiction = detectJurisdictionForLienWaiver({
    projectLocation: data.project.location,
    contractLocation: data.client.address || undefined,
    companyState: branding.address ? extractStateFromBrandingAddress(branding.address) : undefined
  });
  
  // Get appropriate overlay based on waiver type
  const overlay = isFinalWaiver 
    ? getFinalLienWaiverOverlay(jurisdiction.stateCode)
    : getLienWaiverOverlay(jurisdiction.stateCode);
    
  const isStatutory = overlay.overlayType === 'STATUTORY';
  const isSemiStructured = overlay.overlayType === 'SEMI_STRUCTURED';
  
  // Validate statutory requirements if applicable
  if (isStatutory) {
    const validation = validateStatutoryRequirements(jurisdiction.stateCode, {
      claimantName: contractorName,
      ownerName: ownerName,
      projectLocation: data.project.location,
      throughDate: isFinalWaiver ? 'N/A - Final Payment' : formatDate(throughDate),
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
    throughDate: isFinalWaiver ? 'Final Payment - All Work' : formatDate(throughDate),
    paymentAmount: formatCurrency(lienWaiver.paymentAmount),
    paymentReference: lienWaiver.paymentReference,
    paymentMethod: paymentMethodText,
    exceptions: isFinalWaiver ? undefined : lienWaiver.exceptions,
    documentDate: currentDate,
    isFinal: isFinalWaiver
  };

  const overlayLegalBody = overlay.waiverBodyHTML(overlayData);
  
  // Document titles and badges based on waiver type
  const documentTitle = isFinalWaiver 
    ? 'Unconditional Waiver and Release'
    : 'Conditional Waiver and Release';
  const documentSubtitle = isFinalWaiver 
    ? 'Upon Final Payment'
    : 'Upon Progress Payment';
  const typeBadgeText = isFinalWaiver ? 'Final Lien Waiver' : 'Partial Lien Waiver';
  const typeBadgeColor = isFinalWaiver ? '#059669' : '#3b82f6';
  
  // Jurisdiction badge
  const jurisdictionBadge = jurisdiction.stateCode !== 'GENERIC' 
    ? `<div class="jurisdiction-badge" style="display: inline-block; margin-left: 12px; padding: 3px 10px; background: ${isStatutory ? '#fef3c7' : '#dbeafe'}; border: 1px solid ${isStatutory ? '#f59e0b' : '#3b82f6'}; font-size: 8pt; text-transform: uppercase; letter-spacing: 0.5px; color: ${isStatutory ? '#92400e' : '#1e40af'}; border-radius: 3px;">${jurisdiction.stateName}${isStatutory ? ' Statutory Form' : ''}</div>`
    : '';

  // Payment box header text
  const paymentBoxHeader = isFinalWaiver ? 'Final Payment Amount' : 'Progress Payment Amount';
  
  // Legal notice text based on waiver type
  const legalNoticeText = isFinalWaiver
    ? `This document waives and releases ALL lien, stop payment notice, and payment bond rights 
       for all labor, services, equipment, and materials furnished to this project. This is a 
       complete and final release effective upon receipt of the stated payment.`
    : `This document waives the claimant's lien, stop payment notice, and payment bond rights 
       through the date specified below, effective only upon actual receipt and clearance of the 
       stated payment. Rights for work or materials furnished after the through date are expressly 
       reserved. Before any recipient relies on this document, verification of payment is recommended.`;

  return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${documentTitle} ${documentSubtitle}</title>
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
            border-bottom: 3px double ${isFinalWaiver ? '#059669' : '#2c3e50'};
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
            color: ${isFinalWaiver ? '#059669' : '#34495e'};
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .document-type-badge {
            display: inline-block;
            margin-top: 10px;
            padding: 4px 16px;
            background: ${isFinalWaiver ? '#ecfdf5' : '#f8f9fa'};
            border: 1px solid ${isFinalWaiver ? '#059669' : '#dee2e6'};
            font-size: 9pt;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: ${isFinalWaiver ? '#059669' : '#6c757d'};
        }
        ${isFinalWaiver ? `
        .final-release-badge {
            display: inline-block;
            margin-left: 8px;
            padding: 4px 12px;
            background: #059669;
            color: white;
            font-size: 8pt;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            border-radius: 3px;
        }
        ` : ''}
        
        /* Legal Notice Box */
        .legal-notice {
            border: 2px solid ${isFinalWaiver ? '#059669' : '#c0392b'};
            background: linear-gradient(to bottom, ${isFinalWaiver ? '#ecfdf5' : '#fdf2f2'}, #fff);
            padding: 12px 16px;
            margin: 18px 0;
        }
        .legal-notice-header {
            font-size: 10pt;
            font-weight: bold;
            text-transform: uppercase;
            color: ${isFinalWaiver ? '#059669' : '#c0392b'};
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
            border: 2px solid ${isFinalWaiver ? '#059669' : '#2c3e50'};
            background: ${isFinalWaiver ? '#f0fdf4' : '#f8f9fa'};
        }
        .payment-box-header {
            background: ${isFinalWaiver ? '#059669' : '#2c3e50'};
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
            color: ${isFinalWaiver ? '#059669' : '#2c3e50'};
            margin: 8px 0;
        }
        .payment-through-date {
            font-size: 10pt;
            color: #555;
            margin-top: 8px;
        }
        .payment-through-date strong {
            color: ${isFinalWaiver ? '#059669' : '#2c3e50'};
        }
        ${!isFinalWaiver ? `
        .remaining-balance {
            margin-top: 12px;
            padding-top: 12px;
            border-top: 1px dashed #ccc;
            font-size: 10pt;
            color: #666;
        }
        ` : `
        .final-payment-note {
            margin-top: 12px;
            padding-top: 12px;
            border-top: 1px solid #059669;
            font-size: 11pt;
            font-weight: bold;
            color: #059669;
        }
        `}
        
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
            border-left: 4px solid ${isFinalWaiver ? '#059669' : '#2c3e50'};
        }
        .conditional-header {
            font-size: 11pt;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: ${isFinalWaiver ? '#059669' : '#2c3e50'};
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
            border: 1.5px solid ${isFinalWaiver ? '#059669' : '#2c3e50'};
            background: #fff;
            margin-right: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 11pt;
            color: ${isFinalWaiver ? '#059669' : '#2c3e50'};
            font-weight: bold;
        }
        
        /* Exceptions Section (Partial only) */
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
        
        /* Final Waiver Declarations */
        .declarations-section {
            margin: 24px 0;
            padding: 16px;
            background: #f0fdf4;
            border: 1px solid #059669;
            border-radius: 4px;
        }
        .declarations-header {
            font-size: 11pt;
            font-weight: bold;
            text-transform: uppercase;
            color: #059669;
            margin-bottom: 12px;
        }
        .declaration-item {
            display: flex;
            align-items: flex-start;
            margin: 8px 0;
            font-size: 10pt;
            line-height: 1.5;
        }
        .declaration-check {
            color: #059669;
            font-weight: bold;
            margin-right: 10px;
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
            color: ${isFinalWaiver ? '#059669' : '#2c3e50'};
            padding-bottom: 8px;
            border-bottom: 2px solid ${isFinalWaiver ? '#059669' : '#2c3e50'};
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
    <div class="document-title">${documentTitle}</div>
    <div class="document-subtitle">${documentSubtitle}</div>
    <div style="display: flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: 8px;">
        <div class="document-type-badge">${typeBadgeText}</div>
        ${isFinalWaiver ? '<span class="final-release-badge">✓ Full Release</span>' : ''}
        ${jurisdictionBadge}
    </div>
</div>

<div class="legal-notice">
    <div class="legal-notice-header">${isFinalWaiver ? 'Final Release Notice' : 'Notice to Property Owner and Paying Party'}</div>
    <div class="legal-notice-text">
        ${legalNoticeText}
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
    <div class="payment-box-header">${paymentBoxHeader}</div>
    <div class="payment-box-content">
        <div class="payment-amount">${formatCurrency(lienWaiver.paymentAmount)}</div>
        ${isFinalWaiver ? `
        <div class="final-payment-note">
            FULL AND FINAL PAYMENT FOR ALL WORK PERFORMED
        </div>
        ` : `
        <div class="payment-through-date">
            For labor, services, equipment, and materials furnished through <strong>${formatDate(throughDate)}</strong>
        </div>
        `}
        ${lienWaiver.paymentReference ? `
        <div style="font-size: 9pt; color: #666; margin-top: 6px;">
            Payment Reference: ${paymentMethodText}${paymentRefText}
        </div>
        ` : ''}
        ${!isFinalWaiver && lienWaiver.remainingBalance !== undefined && lienWaiver.remainingBalance > 0 ? `
        <div class="remaining-balance">
            Remaining Contract Balance: <strong>${formatCurrency(lienWaiver.remainingBalance)}</strong>
        </div>
        ` : ''}
    </div>
</div>

<!-- JURISDICTION-AWARE LEGAL BODY: ${overlay.overlayType} - ${jurisdiction.stateName} - ${waiverType.toUpperCase()} -->
${overlayLegalBody}

${isFinalWaiver ? `
<div class="declarations-section">
    <div class="declarations-header">Claimant Declarations</div>
    <div class="declaration-item">
        <span class="declaration-check">✓</span>
        <span>All work has been completed in accordance with the contract documents.</span>
    </div>
    <div class="declaration-item">
        <span class="declaration-check">✓</span>
        <span>All materials and labor have been fully paid for by the Claimant.</span>
    </div>
    <div class="declaration-item">
        <span class="declaration-check">✓</span>
        <span>All subcontractors and suppliers have been paid in full.</span>
    </div>
    <div class="declaration-item">
        <span class="declaration-check">✓</span>
        <span>There are no outstanding claims or disputes related to this project.</span>
    </div>
    <div class="declaration-item">
        <span class="declaration-check">✓</span>
        <span>This constitutes full and final payment for all work performed.</span>
    </div>
</div>
` : ''}

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
  id: 'lien-waiver',
  name: 'lien-waiver',
  displayName: 'Lien Waiver',
  description: 'Conditional or unconditional waiver releasing lien rights. Supports both progress payments (partial) and final payments. Automatically adapts to state-specific requirements.',
  category: 'document',
  subcategory: 'legal',
  status: 'active',
  templateVersion: '3.0',
  signatureType: 'single',
  includesSignaturePlaceholders: true,
  supportsJurisdictionOverlay: true,
  requiredFields: [
    'client.name',
    'contractor.name',
    'project.location',
    'financials.total',
    'lienWaiver.paymentAmount',
    'lienWaiver.waiverType',
  ],
  optionalFields: [
    'lienWaiver.throughDate',
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
  generateHTML: generateUnifiedLienWaiverHTML,
});

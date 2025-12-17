/**
 * Change Order Agreement Template
 * Version 2.0 - Harvey Specter Litigation-Ready Standard
 * 
 * This template generates court-ready Change Order documents with:
 * - Professional legal language suitable for litigation
 * - Consistent "Powered by Mervin AI" branding
 * - Clean date formatting (no ISO timestamps)
 * - Airtight scope → cost → timeline attribution
 */

import { templateRegistry, TemplateData, ContractorBranding } from '../registry';

/**
 * Formats a date string or Date object to clean legal format
 * Converts ISO timestamps like "2025-11-26T23:36:42.540Z" to "November 26, 2025"
 */
function formatLegalDate(dateInput: string | Date | undefined): string {
  if (!dateInput) {
    return new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }
  
  try {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(date.getTime())) {
      return String(dateInput);
    }
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  } catch {
    return String(dateInput);
  }
}

function generateChangeOrderHTML(data: TemplateData, branding: ContractorBranding): string {
  const contractorName = branding.companyName || data.contractor.name || 'Contractor';
  const contractorAddress = branding.address || data.contractor.address || '';
  const contractorPhone = branding.phone || data.contractor.phone || '';
  const contractorEmail = branding.email || data.contractor.email || '';
  const contractorLicense = branding.licenseNumber || data.contractor.license || '';

  const currentDate = formatLegalDate(new Date());

  const changeOrder = data.changeOrder || {
    originalContractDate: currentDate,
    originalContractId: 'N/A',
    changeDescription: data.project.description,
    additionalCost: 0,
    revisedTotal: data.financials.total,
    newCompletionDate: data.project.endDate,
  };

  const formattedOriginalContractDate = formatLegalDate(changeOrder.originalContractDate);
  const formattedNewCompletionDate = changeOrder.newCompletionDate ? formatLegalDate(changeOrder.newCompletionDate) : null;
  const hasTimelineChange = !!formattedNewCompletionDate;

  return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Change Order Agreement</title>
    <style>
        @page {
            size: 8.5in 11in;
            margin: 0.75in 0.75in 1in 0.75in;
            @bottom-center {
                content: "Powered by Mervin AI";
                font-family: 'Arial', sans-serif;
                font-size: 9pt;
                color: #666;
            }
        }
        body {
            font-family: 'Times New Roman', Georgia, serif;
            font-size: 11.5pt;
            line-height: 1.5;
            margin: 0;
            padding: 0;
            color: #1a1a1a;
        }
        .header-section {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 3px solid #1a1a1a;
            padding-bottom: 20px;
        }
        .contract-title {
            font-size: 20pt;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 2px;
            margin: 0 0 8px 0;
            color: #000;
        }
        .contract-subtitle {
            font-size: 11pt;
            color: #333;
            margin-top: 5px;
            font-style: italic;
        }
        .section-header {
            font-size: 12pt;
            font-weight: bold;
            margin: 28px 0 12px 0;
            text-transform: uppercase;
            letter-spacing: 1px;
            border-bottom: 2px solid #333;
            padding-bottom: 6px;
            color: #000;
        }
        .info-grid {
            display: table;
            width: 100%;
            margin: 20px 0;
            border-collapse: collapse;
        }
        .info-row {
            display: table-row;
        }
        .info-label {
            display: table-cell;
            width: 200px;
            font-weight: bold;
            padding: 8px 0;
            vertical-align: top;
        }
        .info-value {
            display: table-cell;
            padding: 8px 0;
        }
        .parties-section {
            display: flex;
            justify-content: space-between;
            margin: 25px 0;
            gap: 30px;
        }
        .party-column {
            flex: 1;
            padding: 15px;
            border: 1px solid #ccc;
            background: #fafafa;
        }
        .party-title {
            font-weight: bold;
            font-size: 12pt;
            margin-bottom: 12px;
            text-transform: uppercase;
            letter-spacing: 1px;
            border-bottom: 1px solid #999;
            padding-bottom: 6px;
        }
        .party-column div {
            margin: 4px 0;
        }
        .change-box {
            border: 2px solid #1a1a1a;
            padding: 20px;
            margin: 20px 0;
            background: #f8f8f8;
        }
        .change-box p {
            margin: 0;
            text-align: justify;
            line-height: 1.6;
        }
        .numbered-section {
            margin: 14px 0;
            text-align: justify;
            line-height: 1.6;
        }
        .section-number {
            font-weight: bold;
            margin-right: 10px;
        }
        .financial-summary {
            margin: 25px 0;
            border: 2px solid #1a1a1a;
            padding: 20px;
        }
        .financial-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px dotted #999;
        }
        .financial-row:last-child {
            border-bottom: none;
            font-weight: bold;
            font-size: 13pt;
            padding-top: 15px;
            margin-top: 10px;
            border-top: 2px solid #333;
        }
        .signature-section {
            margin-top: 50px;
            page-break-inside: avoid;
        }
        .signature-grid {
            display: flex;
            justify-content: space-between;
            margin-top: 35px;
            gap: 40px;
        }
        .signature-column {
            flex: 1;
        }
        .signature-line {
            border-bottom: 1px solid #000;
            height: 45px;
            margin: 25px 0 8px 0;
        }
        .signature-label {
            margin: 6px 0;
            font-size: 10.5pt;
        }
        .date-line {
            border-bottom: 1px solid #000;
            width: 160px;
            display: inline-block;
            margin-left: 10px;
        }
        .legal-notice {
            margin-top: 30px;
            padding: 15px;
            background: #f0f0f0;
            border-left: 4px solid #333;
            font-size: 10pt;
            line-height: 1.5;
        }
        .footer-branding {
            text-align: center;
            font-family: 'Arial', sans-serif;
            font-size: 9pt;
            color: #888;
            letter-spacing: 0.5px;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
        }
    </style>
</head>
<body>

<div class="header-section">
    <h1 class="contract-title">Change Order Agreement</h1>
    <p class="contract-subtitle">Formal Amendment to Original Contract</p>
</div>

<div class="info-grid">
    <div class="info-row">
        <span class="info-label">Change Order Date:</span>
        <span class="info-value">${currentDate}</span>
    </div>
    <div class="info-row">
        <span class="info-label">Original Contract Date:</span>
        <span class="info-value">${formattedOriginalContractDate}</span>
    </div>
    <div class="info-row">
        <span class="info-label">Original Contract ID:</span>
        <span class="info-value">${changeOrder.originalContractId}</span>
    </div>
    <div class="info-row">
        <span class="info-label">Project Location:</span>
        <span class="info-value">${data.project.location}</span>
    </div>
</div>

<div class="parties-section">
    <div class="party-column">
        <div class="party-title">Client</div>
        <div><strong>${data.client.name}</strong></div>
        <div>${data.client.address}</div>
        ${data.client.phone ? `<div>Phone: ${data.client.phone}</div>` : ''}
        ${data.client.email ? `<div>Email: ${data.client.email}</div>` : ''}
    </div>
    <div class="party-column">
        <div class="party-title">Contractor</div>
        <div><strong>${contractorName}</strong></div>
        ${contractorAddress ? `<div>${contractorAddress}</div>` : ''}
        ${contractorPhone ? `<div>Phone: ${contractorPhone}</div>` : ''}
        ${contractorEmail ? `<div>Email: ${contractorEmail}</div>` : ''}
        ${contractorLicense ? `<div>License No.: ${contractorLicense}</div>` : ''}
    </div>
</div>

<div class="section-header">Description of Change</div>
<div class="change-box">
    <p>${changeOrder.changeDescription}</p>
</div>

<div class="section-header">Financial Adjustment</div>
<div class="financial-summary">
    <div class="financial-row">
        <span>Original Contract Amount:</span>
        <span>$${((changeOrder as any).originalTotal || (data.financials.total - changeOrder.additionalCost)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
    </div>
    <div class="financial-row">
        <span>Change Order Amount (${changeOrder.additionalCost >= 0 ? 'Addition' : 'Credit'}):</span>
        <span>${changeOrder.additionalCost >= 0 ? '+' : '-'}$${Math.abs(changeOrder.additionalCost).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
    </div>
    <div class="financial-row">
        <span>Revised Contract Total:</span>
        <span>$${(changeOrder.revisedTotal || data.financials.total).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
    </div>
</div>

<div class="section-header">Schedule Impact</div>
${hasTimelineChange ? `
<p class="numbered-section">
    The parties hereby agree that the project completion date shall be revised to <strong>${formattedNewCompletionDate}</strong>. This adjustment is directly attributable to the scope modifications set forth in this Change Order.
</p>
` : `
<p class="numbered-section">
    The parties acknowledge and agree that the modifications set forth in this Change Order shall have <strong>no impact on the original project completion date</strong>. The Contractor shall complete all work, including the scope of this Change Order, within the timeframe established in the Original Contract.
</p>
`}

<div class="section-header">Terms and Conditions</div>

<p class="numbered-section">
    <span class="section-number">1.</span> <strong>Binding Effect.</strong> Upon execution by both parties, this Change Order shall constitute a binding amendment to the Original Contract dated ${formattedOriginalContractDate}. The terms herein shall be enforceable to the same extent as the Original Contract.
</p>

<p class="numbered-section">
    <span class="section-number">2.</span> <strong>Preservation of Original Terms.</strong> All terms, conditions, warranties, and provisions of the Original Contract shall remain in full force and effect, except as expressly modified by this Change Order. In the event of any conflict between the Original Contract and this Change Order, the terms of this Change Order shall govern.
</p>

<p class="numbered-section">
    <span class="section-number">3.</span> <strong>Payment Terms.</strong> Payment for work performed under this Change Order shall be due and payable upon completion of the change order scope, unless the parties have agreed otherwise in writing. The Client's failure to remit payment within the agreed timeframe shall constitute a material breach of this Agreement.
</p>

<p class="numbered-section">
    <span class="section-number">4.</span> <strong>Authorization Required.</strong> Contractor shall not commence any work described in this Change Order until this document has been duly executed by both parties. Any work performed prior to execution shall be at the Contractor's sole risk and expense.
</p>

${hasTimelineChange ? '' : `
<p class="numbered-section">
    <span class="section-number">5.</span> <strong>Schedule Contingency.</strong> Notwithstanding the foregoing, should circumstances arise during execution that materially affect the Contractor's ability to complete the work within the original timeframe, the Contractor shall promptly notify the Client in writing. Any schedule adjustment resulting from such circumstances shall require a separate written amendment signed by both parties.
</p>
`}

<div class="legal-notice">
    <strong>Notice:</strong> This Change Order, together with the Original Contract and any prior amendments, constitutes the entire agreement between the parties with respect to the subject matter hereof. No modification, amendment, or waiver of any provision of this Change Order shall be effective unless set forth in a writing signed by both parties.
</div>

<div class="signature-section">
    <div class="section-header">Authorization and Acceptance</div>
    <p>By affixing their signatures below, both parties acknowledge that they have read, understand, and agree to be bound by the terms of this Change Order Agreement.</p>
    
    <div class="signature-grid">
        <div class="signature-column">
            <div class="signature-line"></div>
            <div class="signature-label"><strong>Client Signature</strong></div>
            <div class="signature-label">${data.client.name}</div>
            <div class="signature-label">Date: <span class="date-line"></span></div>
        </div>
        <div class="signature-column">
            <div class="signature-line"></div>
            <div class="signature-label"><strong>Contractor Signature</strong></div>
            <div class="signature-label">${contractorName}</div>
            <div class="signature-label">Date: <span class="date-line"></span></div>
        </div>
    </div>
</div>

<div class="footer-branding">Powered by Mervin AI</div>

</body>
</html>`;
}

templateRegistry.register({
  id: 'change-order',
  name: 'change-order',
  displayName: 'Change Order Agreement',
  description: 'Formal amendment to modify scope, cost, or timeline of an existing contract',
  category: 'document',
  subcategory: 'amendment',
  status: 'active',
  templateVersion: '2.0',
  signatureType: 'dual',
  dataSource: 'contract',
  includesSignaturePlaceholders: true,
  requiredFields: [
    'client.name',
    'client.address',
    'contractor.name',
    'project.location',
    'project.description',
    'financials.total',
  ],
  optionalFields: [
    'changeOrder.originalContractDate',
    'changeOrder.originalContractId',
    'changeOrder.additionalCost',
    'changeOrder.revisedTotal',
    'changeOrder.newCompletionDate',
  ],
  priority: 10,
  icon: 'FileEdit',
  generateHTML: generateChangeOrderHTML,
});

/**
 * Change Order Agreement Template
 * Version 1.0
 */

import { templateRegistry, TemplateData, ContractorBranding } from '../registry';

function generateChangeOrderHTML(data: TemplateData, branding: ContractorBranding): string {
  const contractorName = branding.companyName || data.contractor.name || 'Contractor';
  const contractorAddress = branding.address || data.contractor.address || '';
  const contractorPhone = branding.phone || data.contractor.phone || '';
  const contractorEmail = branding.email || data.contractor.email || '';
  const contractorLicense = branding.licenseNumber || data.contractor.license || '';

  const currentDate = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  const changeOrder = data.changeOrder || {
    originalContractDate: currentDate,
    originalContractId: 'N/A',
    changeDescription: data.project.description,
    additionalCost: 0,
    revisedTotal: data.financials.total,
    newCompletionDate: data.project.endDate,
  };

  return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Change Order Agreement</title>
    <style>
        @page {
            size: 8.5in 11in;
            margin: 0.75in;
        }
        body {
            font-family: 'Times New Roman', serif;
            font-size: 12pt;
            line-height: 1.4;
            margin: 0;
            padding: 0;
            color: #000;
        }
        .header-section {
            text-align: center;
            margin-bottom: 25px;
            border-bottom: 2px solid #333;
            padding-bottom: 15px;
        }
        .contract-title {
            font-size: 18pt;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin: 0;
        }
        .contract-subtitle {
            font-size: 11pt;
            color: #555;
            margin-top: 5px;
        }
        .section-header {
            font-size: 12pt;
            font-weight: bold;
            margin: 20px 0 10px 0;
            text-transform: uppercase;
            border-bottom: 1px solid #ccc;
            padding-bottom: 5px;
        }
        .info-grid {
            display: table;
            width: 100%;
            margin: 15px 0;
        }
        .info-row {
            display: table-row;
        }
        .info-label {
            display: table-cell;
            width: 180px;
            font-weight: bold;
            padding: 5px 0;
        }
        .info-value {
            display: table-cell;
            padding: 5px 0;
        }
        .parties-section {
            display: flex;
            justify-content: space-between;
            margin: 20px 0;
        }
        .party-column {
            flex: 1;
            padding: 0 15px;
        }
        .party-title {
            font-weight: bold;
            font-size: 13pt;
            margin-bottom: 10px;
        }
        .change-box {
            border: 1px solid #333;
            padding: 15px;
            margin: 20px 0;
            background: #f9f9f9;
        }
        .numbered-section {
            margin: 12px 0;
            text-align: justify;
        }
        .section-number {
            font-weight: bold;
            margin-right: 8px;
        }
        .financial-summary {
            margin: 20px 0;
            border: 1px solid #333;
            padding: 15px;
        }
        .financial-row {
            display: flex;
            justify-content: space-between;
            padding: 5px 0;
            border-bottom: 1px dotted #ccc;
        }
        .financial-row:last-child {
            border-bottom: none;
            font-weight: bold;
            font-size: 13pt;
            padding-top: 10px;
        }
        .signature-section {
            margin-top: 40px;
            page-break-inside: avoid;
        }
        .signature-grid {
            display: flex;
            justify-content: space-between;
            margin-top: 30px;
        }
        .signature-column {
            flex: 1;
            margin: 0 15px;
        }
        .signature-line {
            border-bottom: 1px solid #000;
            height: 50px;
            margin: 20px 0 5px 0;
        }
        .signature-label {
            margin: 5px 0;
            font-size: 11pt;
        }
        .date-line {
            border-bottom: 1px solid #000;
            width: 150px;
            display: inline-block;
            margin-left: 10px;
        }
    </style>
</head>
<body>

<div class="header-section">
    <h1 class="contract-title">CHANGE ORDER AGREEMENT</h1>
    <p class="contract-subtitle">Amendment to Original Contract</p>
</div>

<div class="info-grid">
    <div class="info-row">
        <span class="info-label">Change Order Date:</span>
        <span class="info-value">${currentDate}</span>
    </div>
    <div class="info-row">
        <span class="info-label">Original Contract Date:</span>
        <span class="info-value">${changeOrder.originalContractDate}</span>
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
        <div class="party-title">CLIENT</div>
        <div><strong>${data.client.name}</strong></div>
        <div>${data.client.address}</div>
        ${data.client.phone ? `<div>Phone: ${data.client.phone}</div>` : ''}
        ${data.client.email ? `<div>Email: ${data.client.email}</div>` : ''}
    </div>
    <div class="party-column">
        <div class="party-title">CONTRACTOR</div>
        <div><strong>${contractorName}</strong></div>
        ${contractorAddress ? `<div>${contractorAddress}</div>` : ''}
        ${contractorPhone ? `<div>Phone: ${contractorPhone}</div>` : ''}
        ${contractorLicense ? `<div>License: ${contractorLicense}</div>` : ''}
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
        <span>$${((changeOrder as any).originalTotal || (data.financials.total - changeOrder.additionalCost)).toLocaleString()}</span>
    </div>
    <div class="financial-row">
        <span>Change Order Amount (${changeOrder.additionalCost >= 0 ? 'Addition' : 'Deduction'}):</span>
        <span>${changeOrder.additionalCost >= 0 ? '+' : ''}$${changeOrder.additionalCost.toLocaleString()}</span>
    </div>
    <div class="financial-row">
        <span>REVISED CONTRACT TOTAL:</span>
        <span>$${(changeOrder.revisedTotal || data.financials.total).toLocaleString()}</span>
    </div>
</div>

${changeOrder.newCompletionDate ? `
<div class="section-header">Schedule Adjustment</div>
<p class="numbered-section">
    The project completion date is hereby revised to: <strong>${changeOrder.newCompletionDate}</strong>
</p>
` : ''}

<div class="section-header">Terms and Conditions</div>

<p class="numbered-section">
    <span class="section-number">1.</span> This Change Order, when signed by both parties, becomes a binding amendment to the Original Contract.
</p>

<p class="numbered-section">
    <span class="section-number">2.</span> All terms and conditions of the Original Contract remain in full force and effect except as specifically modified by this Change Order.
</p>

<p class="numbered-section">
    <span class="section-number">3.</span> Payment for this Change Order work shall be due upon completion of the change order scope, unless otherwise specified.
</p>

<p class="numbered-section">
    <span class="section-number">4.</span> Work shall not commence on this Change Order until this document has been signed by both parties.
</p>

<p class="numbered-section">
    <span class="section-number">5.</span> The Contractor reserves the right to adjust project timeline proportionally to the scope of additional work.
</p>

<div class="signature-section">
    <div class="section-header">Authorization</div>
    <p>By signing below, both parties agree to the changes described in this Change Order Agreement.</p>
    
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
  templateVersion: '1.0',
  signatureType: 'dual',
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

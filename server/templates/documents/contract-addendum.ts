/**
 * Contract Addendum Template
 * Version 1.0
 */

import { templateRegistry, TemplateData, ContractorBranding } from '../registry';

function generateContractAddendumHTML(data: TemplateData, branding: ContractorBranding): string {
  const contractorName = branding.companyName || data.contractor.name || 'Contractor';
  const contractorAddress = branding.address || data.contractor.address || '';
  const contractorLicense = branding.licenseNumber || data.contractor.license || '';

  const currentDate = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  const addendum = data.addendum || {
    originalContractDate: currentDate,
    originalContractId: 'N/A',
    modifications: [data.project.description],
    effectiveDate: currentDate,
  };

  return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Contract Addendum</title>
    <style>
        @page {
            size: 8.5in 11in;
            margin: 0.75in;
        }
        body {
            font-family: 'Times New Roman', serif;
            font-size: 12pt;
            line-height: 1.5;
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
        .section-header {
            font-size: 12pt;
            font-weight: bold;
            margin: 20px 0 10px 0;
            text-transform: uppercase;
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
        .reference-box {
            border: 1px solid #333;
            padding: 15px;
            margin: 20px 0;
            background: #f5f5f5;
        }
        .modification-item {
            margin: 15px 0;
            padding: 10px 15px;
            border-left: 3px solid #333;
            background: #fafafa;
        }
        .modification-number {
            font-weight: bold;
            color: #333;
        }
        .numbered-section {
            margin: 12px 0;
            text-align: justify;
        }
        .section-number {
            font-weight: bold;
            margin-right: 8px;
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
        .effective-date-box {
            text-align: center;
            padding: 15px;
            border: 2px solid #333;
            margin: 20px 0;
            font-size: 14pt;
        }
    </style>
</head>
<body>

<div class="header-section">
    <h1 class="contract-title">CONTRACT ADDENDUM</h1>
    <p>Supplemental Terms and Modifications</p>
</div>

<div class="reference-box">
    <p><strong>Original Contract Date:</strong> ${addendum.originalContractDate}</p>
    <p><strong>Original Contract Reference:</strong> ${addendum.originalContractId}</p>
    <p><strong>Project Location:</strong> ${data.project.location}</p>
</div>

<div class="parties-section">
    <div class="party-column">
        <div class="party-title">CLIENT</div>
        <div><strong>${data.client.name}</strong></div>
        <div>${data.client.address}</div>
    </div>
    <div class="party-column">
        <div class="party-title">CONTRACTOR</div>
        <div><strong>${contractorName}</strong></div>
        ${contractorAddress ? `<div>${contractorAddress}</div>` : ''}
        ${contractorLicense ? `<div>License: ${contractorLicense}</div>` : ''}
    </div>
</div>

<div class="section-header">Recitals</div>
<p class="numbered-section">
    WHEREAS, the parties entered into a contract dated ${addendum.originalContractDate} for construction services at ${data.project.location}; and
</p>
<p class="numbered-section">
    WHEREAS, the parties now wish to modify certain terms and conditions of said contract;
</p>
<p class="numbered-section">
    NOW, THEREFORE, in consideration of the mutual covenants herein, the parties agree as follows:
</p>

<div class="section-header">Modifications to Original Contract</div>
${addendum.modifications.map((mod, index) => `
<div class="modification-item">
    <span class="modification-number">Modification ${index + 1}:</span>
    <p>${mod}</p>
</div>
`).join('')}

<div class="section-header">General Provisions</div>

<p class="numbered-section">
    <span class="section-number">1.</span> <strong>Integration.</strong> This Addendum is hereby incorporated into and made a part of the Original Contract. In the event of any conflict between the terms of this Addendum and the Original Contract, the terms of this Addendum shall prevail.
</p>

<p class="numbered-section">
    <span class="section-number">2.</span> <strong>Remaining Terms.</strong> Except as specifically modified by this Addendum, all other terms and conditions of the Original Contract shall remain in full force and effect.
</p>

<p class="numbered-section">
    <span class="section-number">3.</span> <strong>Entire Agreement.</strong> The Original Contract, together with this Addendum, constitutes the entire agreement between the parties with respect to the subject matter hereof.
</p>

<p class="numbered-section">
    <span class="section-number">4.</span> <strong>Counterparts.</strong> This Addendum may be executed in counterparts, each of which shall be deemed an original, but all of which together shall constitute one and the same instrument.
</p>

<div class="effective-date-box">
    <strong>EFFECTIVE DATE:</strong> ${addendum.effectiveDate}
</div>

<div class="signature-section">
    <div class="section-header">Signatures</div>
    <p>IN WITNESS WHEREOF, the parties have executed this Addendum as of the date first written above.</p>
    
    <div class="signature-grid">
        <div class="signature-column">
            <div class="signature-line"></div>
            <div class="signature-label"><strong>Client Signature</strong></div>
            <div class="signature-label">${data.client.name}</div>
            <div class="signature-label">Date: _______________</div>
        </div>
        <div class="signature-column">
            <div class="signature-line"></div>
            <div class="signature-label"><strong>Contractor Signature</strong></div>
            <div class="signature-label">${contractorName}</div>
            <div class="signature-label">Date: _______________</div>
        </div>
    </div>
</div>

</body>
</html>`;
}

templateRegistry.register({
  id: 'contract-addendum',
  name: 'contract-addendum',
  displayName: 'Contract Addendum',
  description: 'Supplemental document to add or modify terms in an existing contract',
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
  ],
  optionalFields: [
    'addendum.originalContractDate',
    'addendum.originalContractId',
    'addendum.modifications',
    'addendum.effectiveDate',
  ],
  priority: 20,
  icon: 'FilePlus',
  generateHTML: generateContractAddendumHTML,
});

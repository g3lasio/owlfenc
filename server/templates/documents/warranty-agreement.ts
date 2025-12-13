/**
 * Warranty Agreement Template
 * Version 1.0
 */

import { templateRegistry, TemplateData, ContractorBranding } from '../registry';

function generateWarrantyAgreementHTML(data: TemplateData, branding: ContractorBranding): string {
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

  const warranty = data.warranty || {
    warrantyPeriod: '1 Year',
    warrantyStartDate: currentDate,
    warrantyEndDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }),
    coveredItems: [
      'Workmanship and materials installed by Contractor',
      'Structural integrity of completed work',
      'Proper function of installed systems',
    ],
    exclusions: [
      'Normal wear and tear',
      'Damage caused by Owner or third parties',
      'Acts of nature or force majeure',
      'Modifications made without Contractor approval',
    ],
  };

  return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Warranty Agreement</title>
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
        .warranty-icon {
            font-size: 36pt;
        }
        .contract-title {
            font-size: 20pt;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 2px;
            margin: 10px 0 5px 0;
        }
        .subtitle {
            font-size: 11pt;
            color: #555;
        }
        .section-header {
            font-size: 13pt;
            font-weight: bold;
            margin: 25px 0 10px 0;
            text-transform: uppercase;
            color: #333;
            border-bottom: 1px solid #ddd;
            padding-bottom: 5px;
        }
        .parties-section {
            display: flex;
            justify-content: space-between;
            margin: 20px 0;
        }
        .party-box {
            flex: 1;
            margin: 0 10px;
            padding: 15px;
            border: 1px solid #ddd;
        }
        .party-title {
            font-weight: bold;
            font-size: 11pt;
            color: #555;
            text-transform: uppercase;
            margin-bottom: 8px;
        }
        .project-info {
            margin: 20px 0;
            padding: 15px;
            background: #f5f5f5;
            border-left: 4px solid #333;
        }
        .info-row {
            display: flex;
            margin: 8px 0;
        }
        .info-label {
            width: 150px;
            font-weight: bold;
        }
        .info-value {
            flex: 1;
        }
        .warranty-period-box {
            text-align: center;
            margin: 25px 0;
            padding: 20px;
            border: 2px solid #1565c0;
            background: #e3f2fd;
        }
        .period-label {
            font-size: 11pt;
            color: #555;
            text-transform: uppercase;
        }
        .period-value {
            font-size: 24pt;
            font-weight: bold;
            color: #1565c0;
            margin: 10px 0;
        }
        .dates-row {
            display: flex;
            justify-content: center;
            gap: 40px;
            margin-top: 10px;
            font-size: 11pt;
        }
        .coverage-section {
            margin: 20px 0;
        }
        .coverage-box {
            margin: 15px 0;
            padding: 15px;
        }
        .covered-box {
            background: #e8f5e9;
            border-left: 4px solid #2e7d32;
        }
        .excluded-box {
            background: #ffebee;
            border-left: 4px solid #c62828;
        }
        .coverage-title {
            font-weight: bold;
            font-size: 12pt;
            margin-bottom: 10px;
        }
        .coverage-item {
            margin: 8px 0;
            padding-left: 20px;
            position: relative;
        }
        .covered-box .coverage-item:before {
            content: "✓";
            position: absolute;
            left: 0;
            color: #2e7d32;
            font-weight: bold;
        }
        .excluded-box .coverage-item:before {
            content: "✗";
            position: absolute;
            left: 0;
            color: #c62828;
            font-weight: bold;
        }
        .terms-section {
            margin: 20px 0;
        }
        .term-item {
            margin: 12px 0;
            text-align: justify;
        }
        .term-number {
            font-weight: bold;
            margin-right: 8px;
        }
        .claim-process {
            margin: 20px 0;
            padding: 15px;
            background: #fff8e1;
            border: 1px solid #ffc107;
        }
        .claim-title {
            font-weight: bold;
            margin-bottom: 10px;
        }
        .claim-step {
            margin: 8px 0;
            padding-left: 25px;
        }
        .signature-section {
            margin-top: 40px;
            page-break-inside: avoid;
        }
        .signature-grid {
            display: flex;
            justify-content: space-between;
            margin-top: 25px;
        }
        .signature-column {
            flex: 1;
            margin: 0 15px;
        }
        .signature-line {
            border-bottom: 1px solid #000;
            height: 45px;
            margin: 15px 0 5px 0;
        }
        .signature-label {
            margin: 3px 0;
            font-size: 10pt;
        }
    </style>
</head>
<body>

<div class="header-section">
    <div class="warranty-icon">🛡️</div>
    <h1 class="contract-title">Warranty Agreement</h1>
    <p class="subtitle">Workmanship and Materials Guarantee</p>
</div>

<div class="parties-section">
    <div class="party-box">
        <div class="party-title">Property Owner</div>
        <div><strong>${data.client.name}</strong></div>
        <div>${data.client.address}</div>
        ${data.client.phone ? `<div>${data.client.phone}</div>` : ''}
        ${data.client.email ? `<div>${data.client.email}</div>` : ''}
    </div>
    <div class="party-box">
        <div class="party-title">Contractor</div>
        <div><strong>${contractorName}</strong></div>
        ${contractorAddress ? `<div>${contractorAddress}</div>` : ''}
        ${contractorPhone ? `<div>${contractorPhone}</div>` : ''}
        ${contractorLicense ? `<div>License: ${contractorLicense}</div>` : ''}
    </div>
</div>

<div class="project-info">
    <div class="info-row">
        <span class="info-label">Project Location:</span>
        <span class="info-value">${data.project.location}</span>
    </div>
    <div class="info-row">
        <span class="info-label">Work Performed:</span>
        <span class="info-value">${data.project.description}</span>
    </div>
    <div class="info-row">
        <span class="info-label">Contract Value:</span>
        <span class="info-value">$${data.financials.total.toLocaleString()}</span>
    </div>
</div>

<div class="warranty-period-box">
    <div class="period-label">Warranty Period</div>
    <div class="period-value">${warranty.warrantyPeriod}</div>
    <div class="dates-row">
        <span><strong>Start:</strong> ${warranty.warrantyStartDate}</span>
        <span><strong>End:</strong> ${warranty.warrantyEndDate}</span>
    </div>
</div>

<div class="coverage-section">
    <div class="section-header">Warranty Coverage</div>
    
    <div class="coverage-box covered-box">
        <div class="coverage-title">COVERED ITEMS:</div>
        ${warranty.coveredItems.map(item => `
        <div class="coverage-item">${item}</div>
        `).join('')}
    </div>
    
    <div class="coverage-box excluded-box">
        <div class="coverage-title">EXCLUSIONS (NOT COVERED):</div>
        ${warranty.exclusions.map(item => `
        <div class="coverage-item">${item}</div>
        `).join('')}
    </div>
</div>

<div class="terms-section">
    <div class="section-header">Warranty Terms & Conditions</div>
    
    <div class="term-item">
        <span class="term-number">1.</span>
        <strong>Scope of Warranty.</strong> Contractor warrants that all work performed and materials installed are free from defects in workmanship and materials for the warranty period specified above.
    </div>
    
    <div class="term-item">
        <span class="term-number">2.</span>
        <strong>Remedy.</strong> If a defect covered by this warranty is discovered during the warranty period, Contractor agrees to repair or replace the defective work at no additional cost to Owner, within a reasonable timeframe.
    </div>
    
    <div class="term-item">
        <span class="term-number">3.</span>
        <strong>Notification.</strong> Owner must notify Contractor in writing of any warranty claim within 30 days of discovering the defect.
    </div>
    
    <div class="term-item">
        <span class="term-number">4.</span>
        <strong>Inspection.</strong> Contractor reserves the right to inspect any claimed defect before proceeding with warranty repair.
    </div>
    
    <div class="term-item">
        <span class="term-number">5.</span>
        <strong>Limitation.</strong> This warranty is the sole and exclusive warranty provided. Contractor's liability under this warranty shall not exceed the original contract price.
    </div>
</div>

<div class="claim-process">
    <div class="claim-title">📋 HOW TO MAKE A WARRANTY CLAIM:</div>
    <div class="claim-step">1. Contact Contractor at ${contractorPhone || contractorEmail || 'the contact information above'}</div>
    <div class="claim-step">2. Provide a written description of the issue</div>
    <div class="claim-step">3. Allow Contractor reasonable access to inspect</div>
    <div class="claim-step">4. Contractor will schedule repairs within 14 business days</div>
</div>

<div class="signature-section">
    <div class="section-header">Agreement & Acknowledgment</div>
    <p>By signing below, both parties acknowledge receipt of this Warranty Agreement and agree to its terms.</p>
    
    <div class="signature-grid">
        <div class="signature-column">
            <div class="signature-line"></div>
            <div class="signature-label"><strong>Property Owner</strong></div>
            <div class="signature-label">${data.client.name}</div>
            <div class="signature-label">Date: _______________</div>
        </div>
        <div class="signature-column">
            <div class="signature-line"></div>
            <div class="signature-label"><strong>Contractor</strong></div>
            <div class="signature-label">${contractorName}</div>
            <div class="signature-label">Date: _______________</div>
        </div>
    </div>
</div>

</body>
</html>`;
}

templateRegistry.register({
  id: 'warranty-agreement',
  name: 'warranty-agreement',
  displayName: 'Warranty Agreement',
  description: 'Formal warranty document detailing coverage terms and claim procedures',
  category: 'document',
  subcategory: 'warranty',
  status: 'active',
  templateVersion: '1.0',
  signatureType: 'dual',
  requiredFields: [
    'client.name',
    'client.address',
    'contractor.name',
    'project.description',
    'project.location',
    'financials.total',
  ],
  optionalFields: [
    'warranty.warrantyPeriod',
    'warranty.warrantyStartDate',
    'warranty.warrantyEndDate',
    'warranty.coveredItems',
    'warranty.exclusions',
  ],
  priority: 70,
  icon: 'Shield',
  generateHTML: generateWarrantyAgreementHTML,
});

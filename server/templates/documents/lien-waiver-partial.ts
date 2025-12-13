/**
 * Partial Lien Waiver Template
 * Version 1.0
 */

import { templateRegistry, TemplateData, ContractorBranding } from '../registry';

function generatePartialLienWaiverHTML(data: TemplateData, branding: ContractorBranding): string {
  const contractorName = branding.companyName || data.contractor.name || 'Contractor';
  const contractorAddress = branding.address || data.contractor.address || '';
  const contractorLicense = branding.licenseNumber || data.contractor.license || '';

  const currentDate = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  const lienWaiver = data.lienWaiver || {
    paymentAmount: data.financials.total * 0.3,
    paymentDate: currentDate,
    paymentPeriod: 'Progress Payment',
    throughDate: currentDate,
    isFinal: false,
    remainingBalance: data.financials.total * 0.7,
  };

  return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Partial Lien Waiver</title>
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
            margin-bottom: 30px;
        }
        .contract-title {
            font-size: 18pt;
            font-weight: bold;
            text-transform: uppercase;
            margin: 0 0 5px 0;
        }
        .subtitle {
            font-size: 14pt;
            color: #333;
            border-bottom: 2px solid #333;
            padding-bottom: 10px;
        }
        .warning-box {
            border: 2px solid #d32f2f;
            background: #ffebee;
            padding: 15px;
            margin: 20px 0;
            text-align: center;
        }
        .warning-title {
            font-weight: bold;
            color: #d32f2f;
            font-size: 11pt;
            text-transform: uppercase;
        }
        .warning-text {
            font-size: 10pt;
            color: #333;
            margin-top: 5px;
        }
        .info-section {
            margin: 25px 0;
        }
        .info-row {
            display: flex;
            margin: 10px 0;
            border-bottom: 1px dotted #ccc;
            padding-bottom: 5px;
        }
        .info-label {
            width: 200px;
            font-weight: bold;
        }
        .info-value {
            flex: 1;
        }
        .legal-text {
            text-align: justify;
            margin: 20px 0;
            line-height: 1.6;
        }
        .amount-box {
            border: 2px solid #333;
            padding: 20px;
            margin: 25px 0;
            text-align: center;
        }
        .amount-label {
            font-size: 11pt;
            color: #555;
            text-transform: uppercase;
        }
        .amount-value {
            font-size: 20pt;
            font-weight: bold;
            margin: 10px 0;
        }
        .remaining-note {
            font-size: 11pt;
            color: #666;
            margin-top: 10px;
        }
        .conditions-section {
            margin: 25px 0;
            padding: 15px;
            background: #f5f5f5;
        }
        .conditions-title {
            font-weight: bold;
            margin-bottom: 10px;
        }
        .condition-item {
            margin: 8px 0;
            padding-left: 20px;
        }
        .signature-section {
            margin-top: 40px;
            page-break-inside: avoid;
        }
        .signature-block {
            margin: 30px 0;
        }
        .signature-line {
            border-bottom: 1px solid #000;
            width: 300px;
            height: 40px;
            margin: 15px 0 5px 0;
        }
        .signature-label {
            margin: 3px 0;
            font-size: 10pt;
        }
        .notary-section {
            margin-top: 40px;
            padding: 20px;
            border: 1px solid #ccc;
        }
        .notary-title {
            font-weight: bold;
            text-align: center;
            margin-bottom: 15px;
        }
    </style>
</head>
<body>

<div class="header-section">
    <h1 class="contract-title">PARTIAL LIEN WAIVER</h1>
    <p class="subtitle">Conditional Waiver and Release Upon Progress Payment</p>
</div>

<div class="warning-box">
    <div class="warning-title">⚠️ Important Notice</div>
    <div class="warning-text">
        This document waives the claimant's lien, stop payment notice, and payment bond rights to the extent and through the date specified below, 
        effective only upon receipt of actual payment.
    </div>
</div>

<div class="info-section">
    <div class="info-row">
        <span class="info-label">Property Owner:</span>
        <span class="info-value">${data.client.name}</span>
    </div>
    <div class="info-row">
        <span class="info-label">Property Address:</span>
        <span class="info-value">${data.project.location}</span>
    </div>
    <div class="info-row">
        <span class="info-label">Claimant (Contractor):</span>
        <span class="info-value">${contractorName}</span>
    </div>
    ${contractorAddress ? `
    <div class="info-row">
        <span class="info-label">Contractor Address:</span>
        <span class="info-value">${contractorAddress}</span>
    </div>
    ` : ''}
    ${contractorLicense ? `
    <div class="info-row">
        <span class="info-label">License Number:</span>
        <span class="info-value">${contractorLicense}</span>
    </div>
    ` : ''}
    <div class="info-row">
        <span class="info-label">Through Date:</span>
        <span class="info-value">${lienWaiver.throughDate}</span>
    </div>
</div>

<div class="amount-box">
    <div class="amount-label">Payment Amount Being Waived</div>
    <div class="amount-value">$${lienWaiver.paymentAmount.toLocaleString()}</div>
    <div class="remaining-note">
        Remaining Contract Balance: $${(lienWaiver.remainingBalance || 0).toLocaleString()}
    </div>
</div>

<div class="legal-text">
    <p>
        Upon receipt of a check from <strong>${data.client.name}</strong> in the sum of 
        <strong>$${lienWaiver.paymentAmount.toLocaleString()}</strong> payable to <strong>${contractorName}</strong>, 
        and when the check has been properly endorsed and has been paid by the bank on which it is drawn, 
        this document becomes effective to release any mechanic's lien, stop payment notice, or bond right 
        the undersigned has on the job of <strong>${data.client.name}</strong> located at 
        <strong>${data.project.location}</strong> to the following extent:
    </p>
    <p>
        This release covers a progress payment for labor, services, equipment, or materials furnished to that job 
        through <strong>${lienWaiver.throughDate}</strong> only and does not cover any retention, 
        pending modifications and changes, or items furnished after that date.
    </p>
</div>

<div class="conditions-section">
    <div class="conditions-title">CONDITIONS:</div>
    <div class="condition-item">✓ This waiver is CONDITIONAL upon actual receipt and clearance of payment.</div>
    <div class="condition-item">✓ Rights to lien for work performed AFTER ${lienWaiver.throughDate} are expressly RESERVED.</div>
    <div class="condition-item">✓ This waiver does not cover retention amounts or pending change orders.</div>
    <div class="condition-item">✓ Before any recipient of this document relies on it, said party should verify evidence of payment.</div>
</div>

<div class="signature-section">
    <p><strong>CLAIMANT'S SIGNATURE:</strong></p>
    
    <div class="signature-block">
        <div class="signature-line"></div>
        <div class="signature-label"><strong>${contractorName}</strong></div>
        <div class="signature-label">Authorized Signature</div>
    </div>
    
    <div class="info-row">
        <span class="info-label">Printed Name:</span>
        <span class="info-value">_________________________________</span>
    </div>
    <div class="info-row">
        <span class="info-label">Title:</span>
        <span class="info-value">_________________________________</span>
    </div>
    <div class="info-row">
        <span class="info-label">Date:</span>
        <span class="info-value">${currentDate}</span>
    </div>
</div>

<div class="notary-section">
    <div class="notary-title">NOTARY ACKNOWLEDGMENT (If Required)</div>
    <p>State of _________________ County of _________________</p>
    <p>On _____________, before me, _________________________________, Notary Public,</p>
    <p>personally appeared _________________________________, who proved to me on the basis of satisfactory evidence to be the person(s) whose name(s) is/are subscribed to the within instrument and acknowledged to me that he/she/they executed the same in his/her/their authorized capacity(ies).</p>
    <p style="margin-top: 30px;">
        _________________________________ (Seal)<br>
        Notary Public
    </p>
</div>

</body>
</html>`;
}

templateRegistry.register({
  id: 'lien-waiver-partial',
  name: 'lien-waiver-partial',
  displayName: 'Partial Lien Waiver',
  description: 'Conditional waiver releasing lien rights for progress payments received',
  category: 'document',
  subcategory: 'legal',
  status: 'active',
  templateVersion: '1.0',
  signatureType: 'single',
  requiredFields: [
    'client.name',
    'contractor.name',
    'project.location',
    'financials.total',
  ],
  optionalFields: [
    'lienWaiver.paymentAmount',
    'lienWaiver.paymentDate',
    'lienWaiver.throughDate',
    'lienWaiver.remainingBalance',
  ],
  priority: 40,
  icon: 'FileCheck',
  generateHTML: generatePartialLienWaiverHTML,
});

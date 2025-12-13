/**
 * Final Lien Waiver Template
 * Version 1.0
 */

import { templateRegistry, TemplateData, ContractorBranding } from '../registry';

function generateFinalLienWaiverHTML(data: TemplateData, branding: ContractorBranding): string {
  const contractorName = branding.companyName || data.contractor.name || 'Contractor';
  const contractorAddress = branding.address || data.contractor.address || '';
  const contractorLicense = branding.licenseNumber || data.contractor.license || '';

  const currentDate = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  const lienWaiver = data.lienWaiver || {
    paymentAmount: data.financials.total,
    paymentDate: currentDate,
    isFinal: true,
  };

  return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Final Lien Waiver</title>
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
            border-bottom: 3px solid #2e7d32;
            padding-bottom: 10px;
        }
        .final-badge {
            display: inline-block;
            background: #2e7d32;
            color: white;
            padding: 5px 15px;
            font-size: 11pt;
            font-weight: bold;
            text-transform: uppercase;
            margin-top: 10px;
        }
        .warning-box {
            border: 2px solid #2e7d32;
            background: #e8f5e9;
            padding: 15px;
            margin: 20px 0;
            text-align: center;
        }
        .warning-title {
            font-weight: bold;
            color: #2e7d32;
            font-size: 12pt;
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
            border: 3px solid #2e7d32;
            padding: 20px;
            margin: 25px 0;
            text-align: center;
            background: #f1f8e9;
        }
        .amount-label {
            font-size: 11pt;
            color: #555;
            text-transform: uppercase;
        }
        .amount-value {
            font-size: 22pt;
            font-weight: bold;
            color: #2e7d32;
            margin: 10px 0;
        }
        .final-note {
            font-size: 12pt;
            font-weight: bold;
            color: #2e7d32;
            margin-top: 10px;
        }
        .declarations-section {
            margin: 25px 0;
            padding: 15px;
            background: #fafafa;
            border: 1px solid #ddd;
        }
        .declarations-title {
            font-weight: bold;
            margin-bottom: 10px;
            font-size: 13pt;
        }
        .declaration-item {
            margin: 10px 0;
            padding-left: 25px;
            position: relative;
        }
        .declaration-item:before {
            content: "✓";
            position: absolute;
            left: 5px;
            color: #2e7d32;
            font-weight: bold;
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
    <h1 class="contract-title">FINAL LIEN WAIVER</h1>
    <p class="subtitle">Unconditional Waiver and Release Upon Final Payment</p>
    <span class="final-badge">✓ FINAL RELEASE</span>
</div>

<div class="warning-box">
    <div class="warning-title">✓ Complete & Final Release</div>
    <div class="warning-text">
        This document waives and releases ALL lien, stop payment notice, and payment bond rights 
        for all labor, services, equipment, and materials furnished to this project.
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
</div>

<div class="amount-box">
    <div class="amount-label">Final Payment Amount</div>
    <div class="amount-value">$${lienWaiver.paymentAmount.toLocaleString()}</div>
    <div class="final-note">FULL AND FINAL PAYMENT</div>
</div>

<div class="legal-text">
    <p>
        The undersigned has been paid in full for all labor, services, equipment, or materials 
        furnished to <strong>${data.client.name}</strong> on the job located at 
        <strong>${data.project.location}</strong> and hereby does waive and release any right to 
        a mechanic's lien, stop payment notice, or any right against a labor and material bond 
        on the job to the following extent:
    </p>
    <p>
        <strong>This document covers the final payment for all work done and materials supplied 
        to the above-referenced property.</strong> This waiver and release does not cover any 
        retention that remains unpaid, disputed claims, or extra work that may be authorized 
        after the date of this document.
    </p>
</div>

<div class="declarations-section">
    <div class="declarations-title">CLAIMANT DECLARATIONS:</div>
    <div class="declaration-item">All work has been completed in accordance with the contract documents.</div>
    <div class="declaration-item">All materials and labor have been fully paid for by the Claimant.</div>
    <div class="declaration-item">All subcontractors and suppliers have been paid in full.</div>
    <div class="declaration-item">There are no outstanding claims or disputes related to this project.</div>
    <div class="declaration-item">This constitutes full and final payment for all work performed.</div>
</div>

<div class="legal-text">
    <p>
        <strong>WARNING:</strong> This is an unconditional waiver. It is effective upon execution 
        and delivery, regardless of whether payment has been received. Before signing, the claimant 
        should verify receipt of payment.
    </p>
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
  id: 'lien-waiver-final',
  name: 'lien-waiver-final',
  displayName: 'Final Lien Waiver',
  description: 'Unconditional waiver releasing ALL lien rights upon final payment',
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
  ],
  priority: 50,
  icon: 'FileCheck2',
  generateHTML: generateFinalLienWaiverHTML,
});

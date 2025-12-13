/**
 * Certificate of Completion Template
 * Version 1.0
 */

import { templateRegistry, TemplateData, ContractorBranding } from '../registry';

function generateCertificateCompletionHTML(data: TemplateData, branding: ContractorBranding): string {
  const contractorName = branding.companyName || data.contractor.name || 'Contractor';
  const contractorAddress = branding.address || data.contractor.address || '';
  const contractorPhone = branding.phone || data.contractor.phone || '';
  const contractorLicense = branding.licenseNumber || data.contractor.license || '';

  const currentDate = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  const completion = data.completion || {
    completionDate: currentDate,
    punchListItems: [],
    punchListCompleted: true,
    finalInspectionPassed: true,
    inspectionDate: currentDate,
  };

  return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Certificate of Completion</title>
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
        .certificate-border {
            border: 3px double #1a237e;
            padding: 40px;
            margin: 20px 0;
        }
        .header-section {
            text-align: center;
            margin-bottom: 30px;
        }
        .certificate-icon {
            font-size: 48pt;
            color: #1a237e;
        }
        .contract-title {
            font-size: 24pt;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 3px;
            color: #1a237e;
            margin: 15px 0 5px 0;
        }
        .subtitle {
            font-size: 12pt;
            color: #555;
            font-style: italic;
        }
        .certification-text {
            text-align: center;
            font-size: 13pt;
            margin: 30px 0;
            line-height: 1.8;
        }
        .project-details {
            margin: 25px 0;
            padding: 20px;
            background: #f5f5f5;
            border-left: 4px solid #1a237e;
        }
        .detail-row {
            display: flex;
            margin: 10px 0;
        }
        .detail-label {
            width: 180px;
            font-weight: bold;
            color: #333;
        }
        .detail-value {
            flex: 1;
        }
        .parties-section {
            display: flex;
            justify-content: space-between;
            margin: 25px 0;
        }
        .party-box {
            flex: 1;
            margin: 0 10px;
            padding: 15px;
            border: 1px solid #ddd;
            text-align: center;
        }
        .party-title {
            font-weight: bold;
            color: #1a237e;
            font-size: 11pt;
            text-transform: uppercase;
            margin-bottom: 10px;
        }
        .status-section {
            margin: 25px 0;
        }
        .status-row {
            display: flex;
            align-items: center;
            margin: 10px 0;
            padding: 10px 15px;
            background: #e8f5e9;
            border-radius: 5px;
        }
        .status-check {
            width: 25px;
            height: 25px;
            border: 2px solid #2e7d32;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-right: 15px;
            color: #2e7d32;
            font-weight: bold;
        }
        .completion-date-box {
            text-align: center;
            margin: 30px 0;
            padding: 20px;
            border: 2px solid #1a237e;
            background: #e8eaf6;
        }
        .date-label {
            font-size: 11pt;
            color: #555;
            text-transform: uppercase;
        }
        .date-value {
            font-size: 18pt;
            font-weight: bold;
            color: #1a237e;
            margin-top: 5px;
        }
        .declaration-section {
            margin: 25px 0;
            text-align: justify;
        }
        .signature-section {
            margin-top: 40px;
        }
        .signature-grid {
            display: flex;
            justify-content: space-between;
            margin-top: 30px;
        }
        .signature-column {
            flex: 1;
            margin: 0 20px;
            text-align: center;
        }
        .signature-line {
            border-bottom: 1px solid #000;
            height: 50px;
            margin: 20px auto 5px auto;
            width: 80%;
        }
        .signature-label {
            margin: 5px 0;
            font-size: 10pt;
        }
        .seal-placeholder {
            text-align: center;
            margin: 30px 0;
            padding: 20px;
            border: 1px dashed #ccc;
            color: #999;
            font-size: 10pt;
        }
    </style>
</head>
<body>

<div class="certificate-border">
    <div class="header-section">
        <div class="certificate-icon">🏆</div>
        <h1 class="contract-title">Certificate of Completion</h1>
        <p class="subtitle">Official Documentation of Project Completion</p>
    </div>

    <div class="certification-text">
        <p>This is to certify that the construction project described below has been completed 
        in accordance with the terms and specifications of the contract between the parties.</p>
    </div>

    <div class="project-details">
        <div class="detail-row">
            <span class="detail-label">Project Location:</span>
            <span class="detail-value">${data.project.location}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Project Type:</span>
            <span class="detail-value">${data.project.type}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Scope of Work:</span>
            <span class="detail-value">${data.project.description}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Contract Amount:</span>
            <span class="detail-value">$${data.financials.total.toLocaleString()}</span>
        </div>
    </div>

    <div class="parties-section">
        <div class="party-box">
            <div class="party-title">Property Owner</div>
            <div><strong>${data.client.name}</strong></div>
            <div>${data.client.address}</div>
        </div>
        <div class="party-box">
            <div class="party-title">Contractor</div>
            <div><strong>${contractorName}</strong></div>
            ${contractorAddress ? `<div>${contractorAddress}</div>` : ''}
            ${contractorLicense ? `<div>License: ${contractorLicense}</div>` : ''}
        </div>
    </div>

    <div class="status-section">
        <div class="status-row">
            <div class="status-check">✓</div>
            <div>All work has been completed in accordance with the contract specifications</div>
        </div>
        <div class="status-row">
            <div class="status-check">✓</div>
            <div>Punch list items have been addressed and completed</div>
        </div>
        <div class="status-row">
            <div class="status-check">✓</div>
            <div>Final inspection passed${completion.inspectionDate ? ` on ${completion.inspectionDate}` : ''}</div>
        </div>
        <div class="status-row">
            <div class="status-check">✓</div>
            <div>Work site has been cleaned and restored</div>
        </div>
    </div>

    <div class="completion-date-box">
        <div class="date-label">Date of Substantial Completion</div>
        <div class="date-value">${completion.completionDate}</div>
    </div>

    <div class="declaration-section">
        <p>
            The undersigned hereby certify that the work described above has been completed 
            substantially in accordance with the contract documents, and that the project is 
            ready for final acceptance and occupancy by the Owner. Any warranty periods 
            specified in the contract shall commence as of the date of this certificate.
        </p>
    </div>

    <div class="signature-section">
        <div class="signature-grid">
            <div class="signature-column">
                <div class="signature-line"></div>
                <div class="signature-label"><strong>Owner Acceptance</strong></div>
                <div class="signature-label">${data.client.name}</div>
                <div class="signature-label">Date: _______________</div>
            </div>
            <div class="signature-column">
                <div class="signature-line"></div>
                <div class="signature-label"><strong>Contractor Certification</strong></div>
                <div class="signature-label">${contractorName}</div>
                <div class="signature-label">Date: _______________</div>
            </div>
        </div>
    </div>

    <div class="seal-placeholder">
        [OFFICIAL SEAL / STAMP]
    </div>
</div>

</body>
</html>`;
}

templateRegistry.register({
  id: 'certificate-completion',
  name: 'certificate-completion',
  displayName: 'Certificate of Completion',
  description: 'Official certification that project work has been substantially completed',
  category: 'document',
  subcategory: 'completion',
  status: 'active',
  templateVersion: '1.0',
  signatureType: 'dual',
  requiredFields: [
    'client.name',
    'client.address',
    'contractor.name',
    'project.type',
    'project.description',
    'project.location',
    'financials.total',
  ],
  optionalFields: [
    'completion.completionDate',
    'completion.punchListItems',
    'completion.punchListCompleted',
    'completion.finalInspectionPassed',
    'completion.inspectionDate',
  ],
  priority: 60,
  icon: 'Award',
  generateHTML: generateCertificateCompletionHTML,
});

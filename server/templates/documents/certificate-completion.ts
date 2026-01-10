/**
 * Certificate of Final Completion Template
 * Version 3.0 - Legal Defense Grade
 * 
 * This template generates court-ready Certificate of Final Completion documents with:
 * - Professional legal language suitable for litigation and legal disputes
 * - Comprehensive completion certification and warranty documentation
 * - Unique document ID for traceability and authenticity
 * - Contract reference number for legal linkage
 * - Complete contractor license information with warnings
 * - Accurate project duration calculations
 * - Closeout documentation tracking
 * - Consistent "Powered by Chyrris Technologies" branding
 * - Clean date formatting and impeccable pagination
 * - Robust content for legal defense and final payment authorization
 */

import { templateRegistry, TemplateData, ContractorBranding } from '../registry';
import { randomUUID } from 'crypto';

/**
 * Formats a date string or Date object to clean legal format
 * Converts ISO timestamps to "Month DD, YYYY" format
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

/**
 * Calculates project duration in days
 */
function calculateProjectDuration(startDate: string | Date | undefined, endDate: string | Date | undefined): number {
  if (!startDate || !endDate) return 0;
  
  try {
    const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
    const end = typeof endDate === 'string' ? new Date(endDate) : endDate;
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  } catch {
    return 0;
  }
}

/**
 * Calculates warranty end date (1 year from completion by default)
 */
function calculateWarrantyEndDate(completionDate: string | Date | undefined, warrantyMonths: number = 12): string {
  if (!completionDate) {
    const date = new Date();
    date.setMonth(date.getMonth() + warrantyMonths);
    return formatLegalDate(date);
  }
  
  try {
    const date = typeof completionDate === 'string' ? new Date(completionDate) : completionDate;
    date.setMonth(date.getMonth() + warrantyMonths);
    return formatLegalDate(date);
  } catch {
    return 'N/A';
  }
}

function generateCertificateCompletionHTML(data: TemplateData, branding: ContractorBranding): string {
  // Generate unique document ID for traceability
  const documentId = data.documentId || randomUUID().substring(0, 13).toUpperCase();
  
  // Contract reference number from linked contract
  const contractReferenceNumber = data.linkedContractId || data.contractId || 'N/A';
  
  // Contractor information from branding (single source of truth)
  const contractorName = branding.companyName || data.contractor.name || 'Contractor';
  const contractorAddress = branding.address || data.contractor.address || '';
  const contractorPhone = branding.phone || data.contractor.phone || '';
  const contractorEmail = branding.email || data.contractor.email || '';
  const contractorLicense = branding.licenseNumber || data.contractor.license || '';
  
  // License warning if missing
  const licenseWarning = !contractorLicense ? 
    '<div style="background: #FEF2F2; border: 2px solid #DC2626; padding: 12px; margin: 20px 0; border-radius: 4px;">' +
    '<p style="color: #DC2626; font-weight: bold; margin: 0 0 8px 0;">⚠️ WARNING: No Contractor License Number</p>' +
    '<p style="color: #991B1B; margin: 0; font-size: 12px;">Working without a valid contractor license may be illegal in your jurisdiction and can invalidate this contract. Please update your profile with your license number immediately.</p>' +
    '</div>' : '';

  const currentDate = formatLegalDate(new Date());

  // Completion data with comprehensive defaults
  const completion = data.completion || {
    projectStartDate: data.project.startDate || currentDate,
    projectCompletionDate: data.project.endDate || currentDate,
    dateOfAcceptance: currentDate,
    punchListCompleted: true,
    finalInspectionPassed: true,
    finalInspectionDate: currentDate,
    siteCleanedAndRestored: true,
    warrantyDurationMonths: 12,
    warrantyTerms: 'Standard one-year warranty covering workmanship and materials against defects.',
    certificateOfOccupancyNumber: '',
    asBuiltDrawingsDelivered: false,
    omManualsDelivered: false,
    manufacturerWarrantiesDelivered: false,
    staffTrainingCompleted: false,
    allSubcontractorsPaid: true,
    retainageReleaseAuthorized: true,
    additionalNotes: ''
  };

  // Format dates
  const formattedStartDate = formatLegalDate(completion.projectStartDate);
  const formattedCompletionDate = formatLegalDate(completion.projectCompletionDate);
  const formattedAcceptanceDate = formatLegalDate(completion.dateOfAcceptance);
  const formattedInspectionDate = formatLegalDate(completion.finalInspectionDate);
  const formattedIssuanceDate = currentDate;
  
  // Calculate project duration
  const projectDuration = calculateProjectDuration(completion.projectStartDate, completion.projectCompletionDate);
  
  // Calculate warranty dates
  const warrantyStartDate = formattedAcceptanceDate;
  const warrantyEndDate = calculateWarrantyEndDate(completion.dateOfAcceptance, completion.warrantyDurationMonths || 12);

  // Financial information
  const totalCost = data.financials?.total || 0;
  const formattedTotalCost = totalCost.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  
  // Contract reference
  const contractId = data.contractId || 'N/A';
  const projectName = data.project?.name || 'Construction Project';
  const projectLocation = data.project?.location || '';
  const projectType = data.project?.type || 'Construction';
  const projectDescription = data.project?.description || '';

  return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Certificate of Final Completion</title>
    <style>
        @page {
            size: 8.5in 11in;
            margin: 0.75in 0.75in 1in 0.75in;
            @bottom-center {
                content: "Powered by Chyrris Technologies";
                font-family: 'Arial', sans-serif;
                font-size: 9pt;
                color: #666;
            }
        }
        body {
            font-family: 'Times New Roman', Georgia, serif;
            font-size: 11.5pt;
            line-height: 1.6;
            margin: 0;
            padding: 0;
            color: #1a1a1a;
        }
        
        /* Header Section */
        .header-section {
            text-align: center;
            margin-bottom: 35px;
            border-bottom: 3px solid #1a1a1a;
            padding-bottom: 20px;
        }
        .contract-title {
            font-size: 22pt;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 3px;
            margin: 0 0 8px 0;
            color: #000;
        }
        .contract-subtitle {
            font-size: 11pt;
            color: #444;
            font-style: italic;
            margin: 5px 0;
        }
        .document-id {
            font-size: 10pt;
            color: #666;
            margin-top: 10px;
            font-family: 'Courier New', monospace;
        }
        
        /* Section Styling */
        .section {
            margin: 25px 0;
            page-break-inside: avoid;
        }
        .section-title {
            font-size: 13pt;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 1px;
            border-bottom: 2px solid #333;
            padding-bottom: 5px;
            margin-bottom: 15px;
            color: #000;
        }
        
        /* Certification Box */
        .certification-box {
            border: 3px double #1a1a1a;
            padding: 25px;
            margin: 20px 0;
            background: #f9f9f9;
            text-align: center;
        }
        .certification-text {
            font-size: 12pt;
            line-height: 1.8;
            font-weight: 500;
        }
        
        /* Project Details Table */
        .details-table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
        }
        .details-table td {
            padding: 10px;
            border: 1px solid #ddd;
            vertical-align: top;
        }
        .details-table .label-cell {
            width: 35%;
            font-weight: bold;
            background: #f5f5f5;
            color: #333;
        }
        .details-table .value-cell {
            width: 65%;
        }
        
        /* Parties Section */
        .parties-grid {
            display: flex;
            justify-content: space-between;
            margin: 20px 0;
            gap: 20px;
        }
        .party-box {
            flex: 1;
            border: 2px solid #333;
            padding: 20px;
            background: #fafafa;
        }
        .party-title {
            font-size: 12pt;
            font-weight: bold;
            text-transform: uppercase;
            color: #000;
            margin-bottom: 12px;
            border-bottom: 1px solid #666;
            padding-bottom: 5px;
        }
        .party-info {
            font-size: 10.5pt;
            line-height: 1.5;
        }
        .party-info div {
            margin: 5px 0;
        }
        
        /* Completion Checklist */
        .checklist {
            margin: 15px 0;
        }
        .checklist-item {
            display: flex;
            align-items: flex-start;
            margin: 12px 0;
            padding: 10px;
            background: #f0f8f0;
            border-left: 4px solid #2e7d32;
        }
        .checklist-icon {
            width: 24px;
            height: 24px;
            border: 2px solid #2e7d32;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-right: 12px;
            flex-shrink: 0;
            color: #2e7d32;
            font-weight: bold;
            font-size: 14pt;
        }
        .checklist-text {
            flex: 1;
            font-size: 11pt;
        }
        
        /* Date Highlight Box */
        .date-highlight {
            text-align: center;
            margin: 20px 0;
            padding: 20px;
            border: 3px solid #1a1a1a;
            background: #e8eaf6;
        }
        .date-label {
            font-size: 10pt;
            color: #555;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 5px;
        }
        .date-value {
            font-size: 18pt;
            font-weight: bold;
            color: #1a237e;
        }
        
        /* Warranty Box */
        .warranty-box {
            border: 2px solid #1565c0;
            padding: 20px;
            margin: 20px 0;
            background: #e3f2fd;
        }
        .warranty-title {
            font-size: 12pt;
            font-weight: bold;
            color: #0d47a1;
            margin-bottom: 10px;
        }
        .warranty-content {
            font-size: 10.5pt;
            line-height: 1.6;
        }
        
        /* Legal Declaration */
        .legal-declaration {
            margin: 25px 0;
            padding: 20px;
            border: 1px solid #ccc;
            background: #fafafa;
            text-align: justify;
            font-size: 10.5pt;
            line-height: 1.7;
        }
        .legal-declaration p {
            margin: 12px 0;
        }
        
        /* Signature Section */
        .signature-section {
            margin-top: 40px;
            page-break-inside: avoid;
        }
        .signature-grid {
            display: flex;
            justify-content: space-between;
            margin-top: 30px;
            gap: 30px;
        }
        .signature-block {
            flex: 1;
            text-align: center;
        }
        .signature-line {
            border-bottom: 2px solid #000;
            height: 50px;
            margin: 20px auto 8px auto;
            width: 85%;
        }
        .signature-label {
            margin: 5px 0;
            font-size: 10pt;
            font-weight: bold;
        }
        .signature-name {
            font-size: 10pt;
            color: #333;
        }
        .signature-date {
            font-size: 9pt;
            color: #666;
            margin-top: 8px;
        }
        
        /* Footer Branding */
        .footer-branding {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            font-size: 9pt;
            color: #666;
        }
        
        /* Professional Seal Placeholder */
        .seal-section {
            text-align: center;
            margin: 30px 0;
            padding: 25px;
            border: 2px dashed #999;
            background: #f5f5f5;
        }
        .seal-text {
            font-size: 10pt;
            color: #777;
            font-style: italic;
        }
    </style>
</head>
<body>

<!-- HEADER SECTION -->
<div class="header-section">
    <h1 class="contract-title">Certificate of Final Completion</h1>
    <p class="contract-subtitle">Official Documentation of Project Completion and Final Acceptance</p>
    <div class="document-id">Document ID: ${documentId} | Issued: ${formattedIssuanceDate}</div>
</div>

<!-- CERTIFICATION STATEMENT -->
<div class="certification-box">
    <p class="certification-text">
        This Certificate of Final Completion hereby certifies that the construction project described herein 
        has been completed in full accordance with the terms, specifications, and requirements of the contract 
        between the parties. All work has been inspected, approved, and accepted by the Property Owner.
    </p>
</div>

<!-- SECTION I: PROJECT INFORMATION -->
<div class="section">
    <h2 class="section-title">I. Project Information</h2>
    <table class="details-table">
        <tr>
            <td class="label-cell">Project Name</td>
            <td class="value-cell">${projectName}</td>
        </tr>
        <tr>
            <td class="label-cell">Project Location</td>
            <td class="value-cell">${projectLocation}</td>
        </tr>
        <tr>
            <td class="label-cell">Project Type</td>
            <td class="value-cell">${projectType}</td>
        </tr>
        <tr>
            <td class="label-cell">Scope of Work</td>
            <td class="value-cell">${projectDescription}</td>
        </tr>
        <tr>
            <td class="label-cell">Contract Reference Number</td>
            <td class="value-cell"><strong>${contractReferenceNumber}</strong></td>
        </tr>
        <tr>
            <td class="label-cell">Total Contract Amount</td>
            <td class="value-cell"><strong>${formattedTotalCost}</strong></td>
        </tr>
    </table>
</div>

<!-- SECTION II: PARTIES TO THE CONTRACT -->
<div class="section">
    <h2 class="section-title">II. Parties to the Contract</h2>
    <div class="parties-grid">
        <div class="party-box">
            <div class="party-title">Property Owner</div>
            <div class="party-info">
                <div><strong>${data.client.name}</strong></div>
                <div>${data.client.address || ''}</div>
                ${data.client.phone ? `<div>Phone: ${data.client.phone}</div>` : ''}
                ${data.client.email ? `<div>Email: ${data.client.email}</div>` : ''}
            </div>
        </div>
        <div class="party-box">
            <div class="party-title">Licensed Contractor</div>
            <div class="party-info">
                <div><strong>${contractorName}</strong></div>
                ${contractorAddress ? `<div>${contractorAddress}</div>` : ''}
                ${contractorPhone ? `<div>Phone: ${contractorPhone}</div>` : ''}
                ${contractorEmail ? `<div>Email: ${contractorEmail}</div>` : ''}
                ${contractorLicense ? `<div><strong>License #: ${contractorLicense}</strong></div>` : ''}
            </div>
        </div>
    </div>
    ${licenseWarning}
</div>

<!-- SECTION III: PROJECT TIMELINE -->
<div class="section">
    <h2 class="section-title">III. Project Timeline</h2>
    <table class="details-table">
        <tr>
            <td class="label-cell">Project Start Date</td>
            <td class="value-cell">${formattedStartDate}</td>
        </tr>
        <tr>
            <td class="label-cell">Project Completion Date</td>
            <td class="value-cell">${formattedCompletionDate}</td>
        </tr>
        <tr>
            <td class="label-cell">Total Project Duration</td>
            <td class="value-cell">${projectDuration} days</td>
        </tr>
        <tr>
            <td class="label-cell">Final Inspection Date</td>
            <td class="value-cell">${formattedInspectionDate}</td>
        </tr>
        <tr>
            <td class="label-cell">Date of Owner Acceptance</td>
            <td class="value-cell"><strong>${formattedAcceptanceDate}</strong></td>
        </tr>
        <tr>
            <td class="label-cell">Certificate Issuance Date</td>
            <td class="value-cell">${formattedIssuanceDate}</td>
        </tr>
    </table>
</div>

<!-- SECTION IV: CERTIFICATION OF COMPLETION -->
<div class="section">
    <h2 class="section-title">IV. Certification of Completion</h2>
    <div class="checklist">
        <div class="checklist-item">
            <div class="checklist-icon">✓</div>
            <div class="checklist-text">
                <strong>All Contracted Work Completed:</strong> All work specified in the contract documents, 
                including drawings, specifications, and approved change orders, has been completed in full 
                accordance with the contract requirements.
            </div>
        </div>
        <div class="checklist-item">
            <div class="checklist-icon">✓</div>
            <div class="checklist-text">
                <strong>Punch List Items Completed:</strong> All punch list items identified during the 
                pre-final inspection have been addressed, corrected, and completed to the satisfaction 
                of the Property Owner.
            </div>
        </div>
        <div class="checklist-item">
            <div class="checklist-icon">✓</div>
            <div class="checklist-text">
                <strong>Final Inspection Passed:</strong> The project has undergone and successfully passed 
                final inspection${completion.finalInspectionDate ? ` on ${formattedInspectionDate}` : ''}. 
                All applicable building codes, regulations, and permit requirements have been met.
            </div>
        </div>
        <div class="checklist-item">
            <div class="checklist-icon">✓</div>
            <div class="checklist-text">
                <strong>Work Site Cleaned and Restored:</strong> The work site has been thoroughly cleaned, 
                all debris and construction materials have been removed, and the property has been restored 
                to a clean and usable condition.
            </div>
        </div>
        ${completion.certificateOfOccupancyNumber ? `
        <div class="checklist-item">
            <div class="checklist-icon">✓</div>
            <div class="checklist-text">
                <strong>Certificate of Occupancy Obtained:</strong> Certificate of Occupancy #${completion.certificateOfOccupancyNumber} 
                has been issued by the Authority Having Jurisdiction (AHJ), authorizing the use and occupancy of the completed structure.
            </div>
        </div>
        ` : ''}
    </div>
</div>

<!-- SECTION V: CLOSEOUT DOCUMENTATION -->
<div class="section">
    <h2 class="section-title">V. Closeout Documentation</h2>
    <div class="checklist">
        ${completion.asBuiltDrawingsDelivered ? `
        <div class="checklist-item">
            <div class="checklist-icon">✓</div>
            <div class="checklist-text">
                <strong>As-Built Drawings Delivered:</strong> Complete and accurate as-built drawings 
                reflecting all changes and modifications made during construction have been delivered to the Owner.
            </div>
        </div>
        ` : ''}
        ${completion.omManualsDelivered ? `
        <div class="checklist-item">
            <div class="checklist-icon">✓</div>
            <div class="checklist-text">
                <strong>Operation & Maintenance Manuals Delivered:</strong> Comprehensive O&M manuals 
                for all installed systems, equipment, and materials have been provided to the Owner.
            </div>
        </div>
        ` : ''}
        ${completion.manufacturerWarrantiesDelivered ? `
        <div class="checklist-item">
            <div class="checklist-icon">✓</div>
            <div class="checklist-text">
                <strong>Manufacturer Warranties Delivered:</strong> All applicable manufacturer warranties 
                and guarantees for materials, equipment, and systems have been transferred to the Owner.
            </div>
        </div>
        ` : ''}
        ${completion.staffTrainingCompleted ? `
        <div class="checklist-item">
            <div class="checklist-icon">✓</div>
            <div class="checklist-text">
                <strong>Staff Training Completed:</strong> Training has been provided to the Owner's 
                personnel on the operation and maintenance of all relevant systems and equipment.
            </div>
        </div>
        ` : ''}
    </div>
</div>

<!-- SECTION VI: FINANCIAL CERTIFICATION -->
<div class="section">
    <h2 class="section-title">VI. Financial Certification</h2>
    <div class="checklist">
        ${completion.allSubcontractorsPaid ? `
        <div class="checklist-item">
            <div class="checklist-icon">✓</div>
            <div class="checklist-text">
                <strong>All Subcontractors and Suppliers Paid:</strong> The Contractor hereby certifies 
                that all subcontractors, suppliers, and laborers have been paid in full for work performed 
                and materials supplied for this project, and no outstanding liens or claims exist.
            </div>
        </div>
        ` : ''}
        ${completion.retainageReleaseAuthorized ? `
        <div class="checklist-item">
            <div class="checklist-icon">✓</div>
            <div class="checklist-text">
                <strong>Retainage Release Authorized:</strong> Upon execution of this Certificate of Final 
                Completion, the Owner hereby authorizes the release of all retained funds (retainage) to 
                the Contractor, constituting final payment under the contract.
            </div>
        </div>
        ` : ''}
    </div>
    <table class="details-table" style="margin-top: 20px;">
        <tr>
            <td class="label-cell">Total Contract Amount</td>
            <td class="value-cell"><strong>${formattedTotalCost}</strong></td>
        </tr>
        <tr>
            <td class="label-cell">Final Payment Status</td>
            <td class="value-cell">Authorized upon execution of this certificate</td>
        </tr>
    </table>
</div>

<!-- SECTION VII: WARRANTY INFORMATION -->
<div class="section">
    <h2 class="section-title">VII. Warranty Information</h2>
    <div class="warranty-box">
        <div class="warranty-title">Contractor's Warranty Period</div>
        <div class="warranty-content">
            <p><strong>Warranty Start Date:</strong> ${warrantyStartDate}</p>
            <p><strong>Warranty End Date:</strong> ${warrantyEndDate}</p>
            <p><strong>Warranty Duration:</strong> ${completion.warrantyDurationMonths || 12} months from the Date of Owner Acceptance</p>
            <p><strong>Warranty Coverage:</strong></p>
            <p>${completion.warrantyTerms || 'Standard one-year warranty covering workmanship and materials against defects. The Contractor warrants that all work performed and materials supplied are free from defects and conform to the contract specifications. Any defects discovered during the warranty period shall be corrected by the Contractor at no additional cost to the Owner.'}</p>
        </div>
    </div>
</div>

${completion.additionalNotes ? `
<!-- SECTION VIII: ADDITIONAL NOTES -->
<div class="section">
    <h2 class="section-title">VIII. Additional Notes and Remarks</h2>
    <div class="legal-declaration">
        <p>${completion.additionalNotes}</p>
    </div>
</div>
` : ''}

<!-- LEGAL DECLARATION -->
<div class="section">
    <h2 class="section-title">${completion.additionalNotes ? 'IX' : 'VIII'}. Legal Declaration and Acceptance</h2>
    <div class="legal-declaration">
        <p>
            <strong>CONTRACTOR'S CERTIFICATION:</strong> The undersigned Contractor hereby certifies that 
            the work described in this Certificate of Final Completion has been completed in substantial 
            accordance with the contract documents, including all drawings, specifications, and approved 
            modifications. The Contractor further certifies that all work has been performed in a workmanlike 
            manner, in compliance with all applicable building codes, regulations, and industry standards.
        </p>
        <p>
            <strong>OWNER'S ACCEPTANCE:</strong> The undersigned Property Owner hereby acknowledges and 
            accepts the completed work as described in this Certificate. The Owner confirms that the project 
            has been inspected and found to be satisfactory and in accordance with the contract requirements. 
            This acceptance constitutes the Owner's authorization for final payment to the Contractor.
        </p>
        <p>
            <strong>FINAL PAYMENT AUTHORIZATION:</strong> Upon execution of this Certificate of Final 
            Completion by both parties, the Owner agrees to make final payment to the Contractor in the 
            amount specified in the contract, including the release of any retained funds (retainage). 
            This final payment shall constitute full and complete satisfaction of all obligations under 
            the contract, except for the Contractor's warranty obligations as specified herein.
        </p>
        <p>
            <strong>COMMENCEMENT OF WARRANTY:</strong> The warranty period specified in Section VII of 
            this Certificate shall commence on the Date of Owner Acceptance (${formattedAcceptanceDate}) 
            and shall continue for the duration specified, unless otherwise stated in the contract documents.
        </p>
        <p>
            <strong>LEGAL EFFECT:</strong> This Certificate of Final Completion constitutes a legally 
            binding document and may be used as evidence in any legal proceedings related to the project, 
            including but not limited to disputes regarding completion, payment, warranty claims, or 
            contractual obligations.
        </p>
    </div>
</div>

<!-- SIGNATURE SECTION -->
<div class="signature-section">
    <h2 class="section-title">${completion.additionalNotes ? 'X' : 'IX'}. Signatures and Execution</h2>
    <div class="signature-grid">
        <div class="signature-block">
            <div class="signature-line"></div>
            <div class="signature-label">PROPERTY OWNER</div>
            <div class="signature-name">${data.client.name}</div>
            <div class="signature-date">Date: _______________</div>
        </div>
        <div class="signature-block">
            <div class="signature-line"></div>
            <div class="signature-label">LICENSED CONTRACTOR</div>
            <div class="signature-name">${contractorName}</div>
            ${contractorLicense ? `<div class="signature-date">License #: ${contractorLicense}</div>` : ''}
            <div class="signature-date">Date: _______________</div>
        </div>
    </div>
</div>

<!-- PROFESSIONAL SEAL SECTION -->
<div class="seal-section">
    <div class="seal-text">
        [SPACE RESERVED FOR OFFICIAL CONTRACTOR SEAL OR STAMP]
    </div>
</div>

<!-- FOOTER BRANDING -->
<div class="footer-branding">
    This Certificate of Final Completion was generated using Owl Fenc<br>
    <strong>Powered by Chyrris Technologies</strong><br>
    Professional Construction Document Management System
</div>

</body>
</html>`;
}

// Register template with template registry
templateRegistry.register({
  id: 'certificate-completion',
  name: 'certificate-completion',
  displayName: 'Certificate of Final Completion',
  description: 'Official certification that project work has been fully completed, inspected, and accepted. Authorizes final payment and commences warranty period.',
  category: 'document',
  subcategory: 'completion',
  status: 'active',
  templateVersion: '2.0',
  signatureType: 'dual',
  dataSource: 'contract',
  requiredFields: [
    'client.name',
    'client.address',
    'contractor.name',
    'project.name',
    'project.type',
    'project.description',
    'project.location',
    'financials.total',
  ],
  optionalFields: [
    'completion.projectStartDate',
    'completion.projectCompletionDate',
    'completion.dateOfAcceptance',
    'completion.punchListCompleted',
    'completion.finalInspectionPassed',
    'completion.finalInspectionDate',
    'completion.siteCleanedAndRestored',
    'completion.warrantyDurationMonths',
    'completion.warrantyTerms',
    'completion.certificateOfOccupancyNumber',
    'completion.asBuiltDrawingsDelivered',
    'completion.omManualsDelivered',
    'completion.manufacturerWarrantiesDelivered',
    'completion.staffTrainingCompleted',
    'completion.allSubcontractorsPaid',
    'completion.retainageReleaseAuthorized',
    'completion.additionalNotes',
  ],
  priority: 60,
  icon: 'Award',
  generateHTML: generateCertificateCompletionHTML,
});

/**
 * Shared Base Layout for Legal Defense Document Templates
 * 
 * Provides reusable HTML structure, styles, and components for all document templates.
 * This reduces code duplication and ensures consistent styling across templates.
 * 
 * Version 1.0
 */

import { TemplateData, ContractorBranding } from '../registry';

export interface DocumentConfig {
  title: string;
  subtitle?: string;
  documentType: 'contract' | 'document' | 'certificate';
  showLegalNotice?: boolean;
  signatureType: 'none' | 'single' | 'dual';
}

export function extractContractorInfo(data: TemplateData, branding: ContractorBranding) {
  return {
    name: branding.companyName || data.contractor.name || 'Contractor',
    address: branding.address || data.contractor.address || '',
    phone: branding.phone || data.contractor.phone || '',
    email: branding.email || data.contractor.email || '',
    license: branding.licenseNumber || data.contractor.license || '',
  };
}

export function formatDate(date?: string): string {
  if (!date) {
    return new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }
  return new Date(date).toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

export function getBaseStyles(): string {
  return `
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
    .numbered-section {
      margin: 12px 0;
      text-align: justify;
    }
    .section-number {
      font-weight: bold;
      margin-right: 8px;
    }
    .legal-text {
      font-size: 11pt;
      text-align: justify;
      margin: 15px 0;
    }
    .highlight-box {
      border: 1px solid #333;
      padding: 15px;
      margin: 20px 0;
      background: #f9f9f9;
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
      border-top: 1px solid #000;
      margin-top: 40px;
      padding-top: 5px;
    }
    .signature-label {
      font-size: 10pt;
      color: #555;
    }
    .date-line {
      border-top: 1px solid #000;
      margin-top: 20px;
      padding-top: 5px;
      width: 150px;
    }
    .legal-footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #ccc;
      font-size: 9pt;
      color: #666;
      text-align: center;
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
  `;
}

export function generateHeader(config: DocumentConfig): string {
  return `
    <div class="header-section">
      <h1 class="contract-title">${config.title}</h1>
      ${config.subtitle ? `<p class="contract-subtitle">${config.subtitle}</p>` : ''}
    </div>
  `;
}

export function generatePartiesSection(
  contractorInfo: ReturnType<typeof extractContractorInfo>,
  clientName: string,
  clientAddress: string,
  clientPhone?: string,
  clientEmail?: string
): string {
  return `
    <div class="parties-section">
      <div class="party-column">
        <div class="party-title">CONTRACTOR</div>
        <div>${contractorInfo.name}</div>
        ${contractorInfo.address ? `<div>${contractorInfo.address}</div>` : ''}
        ${contractorInfo.phone ? `<div>Phone: ${contractorInfo.phone}</div>` : ''}
        ${contractorInfo.email ? `<div>Email: ${contractorInfo.email}</div>` : ''}
        ${contractorInfo.license ? `<div>License: ${contractorInfo.license}</div>` : ''}
      </div>
      <div class="party-column">
        <div class="party-title">CLIENT</div>
        <div>${clientName}</div>
        ${clientAddress ? `<div>${clientAddress}</div>` : ''}
        ${clientPhone ? `<div>Phone: ${clientPhone}</div>` : ''}
        ${clientEmail ? `<div>Email: ${clientEmail}</div>` : ''}
      </div>
    </div>
  `;
}

export function generateDualSignatureSection(): string {
  return `
    <div class="signature-section">
      <div class="section-header">SIGNATURES</div>
      <p class="legal-text">
        By signing below, both parties acknowledge that they have read, understood, and agree to 
        all terms and conditions set forth in this document.
      </p>
      <div class="signature-grid">
        <div class="signature-column">
          <div class="signature-line">
            <div class="signature-label">Contractor Signature</div>
          </div>
          <div class="date-line">
            <div class="signature-label">Date</div>
          </div>
        </div>
        <div class="signature-column">
          <div class="signature-line">
            <div class="signature-label">Client Signature</div>
          </div>
          <div class="date-line">
            <div class="signature-label">Date</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function generateSingleSignatureSection(signerType: 'contractor' | 'client' = 'contractor'): string {
  const label = signerType === 'contractor' ? 'Contractor' : 'Client';
  return `
    <div class="signature-section">
      <div class="section-header">SIGNATURE</div>
      <p class="legal-text">
        By signing below, the ${label.toLowerCase()} acknowledges that they have read, understood, and agree to 
        all terms and conditions set forth in this document.
      </p>
      <div style="max-width: 400px;">
        <div class="signature-line">
          <div class="signature-label">${label} Signature</div>
        </div>
        <div class="date-line">
          <div class="signature-label">Date</div>
        </div>
      </div>
    </div>
  `;
}

export function generateLegalFooter(): string {
  return `
    <div class="legal-footer">
      <p>This document is legally binding upon execution by all parties.</p>
      <p>Generated by Mervin AI Legal Defense System</p>
    </div>
  `;
}

export function wrapDocument(
  config: DocumentConfig,
  styles: string,
  content: string
): string {
  const signatureSection = config.signatureType === 'dual' 
    ? generateDualSignatureSection()
    : config.signatureType === 'single'
    ? generateSingleSignatureSection()
    : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${config.title}</title>
  <style>
    ${getBaseStyles()}
    ${styles}
  </style>
</head>
<body>
  ${generateHeader(config)}
  ${content}
  ${signatureSection}
  ${config.showLegalNotice ? generateLegalFooter() : ''}
</body>
</html>`;
}

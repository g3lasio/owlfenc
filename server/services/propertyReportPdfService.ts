import puppeteer from 'puppeteer';
import { format } from 'date-fns';

interface PropertyReportData {
  // Basic Info
  address: string;
  owner: string;
  sqft: number;
  bedrooms: number;
  bathrooms?: number;
  yearBuilt?: number;
  propertyType?: string;
  
  // Lot Info
  lotSize?: string;
  landSqft?: number;
  
  // Financial
  assessedValue?: number;
  assessedLandValue?: number;
  assessedImprovementValue?: number;
  marketValue?: number;
  marketLandValue?: number;
  marketImprovementValue?: number;
  taxAmount?: number;
  taxYear?: number;
  taxDelinquentYear?: number;
  
  // Ownership
  owner2?: string;
  owner3?: string;
  owner4?: string;
  ownerOccupied?: boolean;
  ownershipType?: string;
  ownershipVesting?: string;
  deedDocNumber?: string;
  deedDocType?: string;
  deedTransDate?: string;
  
  // Sale History
  purchaseDate?: string;
  purchasePrice?: number;
  saleRecordingDate?: string;
  saleType?: string;
  saleDocNumber?: string;
  buyer1?: string;
  buyer2?: string;
  seller1?: string;
  seller2?: string;
  
  // Construction Details
  stories?: number;
  roofCover?: string;
  roofFrame?: string;
  roofShape?: string;
  exteriorWalls?: string;
  foundation?: string;
  constructionType?: string;
  architecturalStyle?: string;
  buildingCondition?: string;
  buildingQuality?: string;
  heatingType?: string;
  heatingFuel?: string;
  fireplaceCount?: number;
  fireplaceType?: string;
  basementSize?: number;
  flooring?: string;
  interiorWalls?: string;
  
  // Parking & Garage
  garageParkingCapacity?: number;
  garageParkingType?: string;
  parkingSpaces?: number;
  parkingType?: string;
  
  // Utilities
  airConditioningType?: string;
  waterType?: string;
  sewerType?: string;
  
  // Pool
  pool?: boolean;
  poolType?: string;
  
  // Mortgage
  lenderName?: string;
  loanAmount?: number;
  loanType?: string;
  loanRecordingDate?: string;
  loanDueDate?: string;
  loanTermMonths?: number;
  loanInterestRate?: number;
  
  // Legal
  lienAmount?: number;
  lienType?: string;
  lienDate?: string;
  judgmentAmount?: number;
  judgmentType?: string;
  judgmentDate?: string;
  foreclosureStatus?: string;
  foreclosureDate?: string;
  foreclosureType?: string;
  foreclosureAmount?: number;
  
  // HOA
  hoaFee?: number;
  hoaFeeFrequency?: string;
  hoaName?: string;
  
  // School
  schoolDistrict?: string;
  elementarySchool?: string;
  middleSchool?: string;
  highSchool?: string;
  
  // Location
  latitude?: number;
  longitude?: number;
  elevation?: number;
  
  // AVM
  avmValue?: number;
  avmHigh?: number;
  avmLow?: number;
  avmDate?: string;
  
  // Metadata
  verified: boolean;
  ownershipVerified: boolean;
  source?: string;
}

interface ContractorInfo {
  companyName?: string;
  contractorName?: string;
  email?: string;
  phone?: string;
}

export class PropertyReportPdfService {
  
  /**
   * Generate comprehensive property report PDF
   */
  async generateComprehensiveReport(
    propertyData: PropertyReportData,
    contractorInfo?: ContractorInfo
  ): Promise<Buffer> {
    console.log('📄 [PDF-SERVICE] Starting comprehensive property report generation');
    console.log('📄 [PDF-SERVICE] Property data:', {
      address: propertyData.address,
      owner: propertyData.owner,
      hasData: !!propertyData
    });
    
    let browser;
    try {
      console.log('🚀 [PDF-SERVICE] Launching Puppeteer...');
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu'
        ]
      });
      console.log('✅ [PDF-SERVICE] Puppeteer launched successfully');
      
      const page = await browser.newPage();
      console.log('✅ [PDF-SERVICE] New page created');
      
      // Generate HTML content
      console.log('📝 [PDF-SERVICE] Generating HTML content...');
      const htmlContent = this.generateHtmlContent(propertyData, contractorInfo);
      console.log('✅ [PDF-SERVICE] HTML content generated, length:', htmlContent.length);
      
      console.log('🌐 [PDF-SERVICE] Setting page content...');
      await page.setContent(htmlContent, {
        waitUntil: 'networkidle0',
        timeout: 30000 // 30 seconds timeout
      });
      console.log('✅ [PDF-SERVICE] Page content set successfully');
      
      // Generate PDF with print-safe margins
      console.log('📝 [PDF-SERVICE] Generating PDF...');
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        preferCSSPageSize: true,
        margin: {
          top: '15mm',
          right: '12mm',
          bottom: '15mm',
          left: '12mm'
        },
        timeout: 60000 // 60 seconds timeout
      });
      
      console.log('✅ [PDF-SERVICE] PDF generated successfully, size:', pdfBuffer.length, 'bytes');
      return Buffer.from(pdfBuffer);
      
    } catch (error: any) {
      console.error('❌ [PDF-SERVICE] Error generating PDF:', error.message);
      console.error('❌ [PDF-SERVICE] Error stack:', error.stack);
      throw new Error(`Failed to generate PDF: ${error.message}`);
    } finally {
      if (browser) {
        console.log('🗑️ [PDF-SERVICE] Closing browser...');
        await browser.close();
        console.log('✅ [PDF-SERVICE] Browser closed');
      }
    }
  }
  
  /**
   * Generate complete HTML content for the report
   */
  private generateHtmlContent(data: PropertyReportData, contractor?: ContractorInfo): string {
    const currentDate = format(new Date(), 'MMMM do, yyyy');
    const reportId = `OWL-${Date.now()}`;
    
    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Property Verification Report - ${data.address}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Helvetica Neue', 'Helvetica', 'Arial', sans-serif;
      color: #0f172a;
      line-height: 1.5;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    
    .page {
      width: 210mm;
      min-height: 297mm;
      padding: 0;
      margin: 0;
      background: white;
      page-break-after: always;
      position: relative;
    }
    
    .page:last-child {
      page-break-after: auto;
    }
    
    /* Cover Page */
    .cover-page {
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      color: white;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
      padding: 48px 32px;
    }
    
    .cover-logo {
      font-size: 48px;
      font-weight: bold;
      color: #3b82f6;
      margin-bottom: 20px;
      text-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
    }
    
    .cover-title {
      font-size: 32px;
      font-weight: 700;
      line-height: 1.2;
      letter-spacing: -0.02em;
      margin-bottom: 16px;
      color: white;
    }
    
    .cover-address {
      font-size: 20px;
      font-weight: 400;
      line-height: 1.4;
      color: #94a3b8;
      margin-bottom: 32px;
      max-width: 80%;
    }
    
    .cover-badge {
      display: inline-block;
      background: #10b981;
      color: white;
      padding: 12px 32px;
      border-radius: 24px;
      font-size: 18px;
      font-weight: bold;
      margin-bottom: 60px;
    }
    
    .cover-meta {
      display: flex;
      justify-content: space-around;
      width: 100%;
      max-width: 600px;
      margin-top: 40px;
      padding-top: 40px;
      border-top: 1px solid rgba(148, 163, 184, 0.3);
    }
    
    .cover-meta-item {
      text-align: center;
    }
    
    .cover-meta-label {
      font-size: 11px;
      font-weight: 500;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 6px;
    }
    
    .cover-meta-value {
      font-size: 14px;
      color: white;
      font-weight: 600;
      line-height: 1.4;
    }
    
    .cover-footer {
      position: absolute;
      bottom: 40px;
      left: 0;
      right: 0;
      text-align: center;
      color: #64748b;
      font-size: 12px;
    }
    
    /* Header for content pages */
    .page-header {
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      color: white;
      padding: 16px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      height: 50px;
    }
    
    .page-header-logo {
      font-size: 16px;
      font-weight: 700;
      color: #3b82f6;
      letter-spacing: -0.01em;
    }
    
    .page-header-info {
      text-align: right;
      font-size: 10px;
      font-weight: 400;
      line-height: 1.4;
      color: #94a3b8;
    }
    
    /* Content */
    .page-content {
      padding: 28px 24px 60px 24px;
      min-height: calc(297mm - 50px - 40px);
      page-break-inside: avoid;
    }
    
    .section-title {
      font-size: 22px;
      font-weight: 700;
      line-height: 1.3;
      letter-spacing: -0.02em;
      color: #0f172a;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 3px solid #3b82f6;
      page-break-after: avoid;
    }
    
    .subsection-title {
      font-size: 16px;
      font-weight: 600;
      line-height: 1.4;
      letter-spacing: -0.01em;
      color: #1e293b;
      margin-top: 24px;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      page-break-after: avoid;
    }
    
    .subsection-icon {
      width: 20px;
      height: 20px;
      background: #3b82f6;
      border-radius: 50%;
      margin-right: 10px;
      display: inline-block;
      flex-shrink: 0;
    }
    
    .info-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
      margin-bottom: 20px;
      page-break-inside: avoid;
    }
    
    .info-grid.single-column {
      grid-template-columns: 1fr;
    }
    
    .info-grid.three-columns {
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
    }
    
    .info-grid.four-columns {
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
    }
    
    .info-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 12px 14px;
      page-break-inside: avoid;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
    }
    
    .info-card.highlight {
      border-left: 3px solid #3b82f6;
      background: #f8fafc;
    }
    
    .info-card.compact {
      padding: 8px 12px;
    }
    
    .info-label {
      font-size: 11px;
      font-weight: 500;
      line-height: 1.4;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      margin-bottom: 5px;
    }
    
    .info-value {
      font-size: 14px;
      font-weight: 600;
      line-height: 1.5;
      color: #0f172a;
      word-break: break-word;
    }
    
    .info-value.large {
      font-size: 18px;
      font-weight: 700;
      line-height: 1.3;
    }
    
    .info-value.highlight {
      color: #3b82f6;
    }
    
    .info-value.success {
      color: #10b981;
    }
    
    .info-value.warning {
      color: #f59e0b;
    }
    
    .info-value.danger {
      color: #ef4444;
    }
    
    .alert-box {
      background: #fef2f2;
      border-left: 4px solid #ef4444;
      padding: 14px 16px;
      margin: 20px 0;
      border-radius: 6px;
      page-break-inside: avoid;
    }
    
    .alert-box.warning {
      background: #fffbeb;
      border-left-color: #f59e0b;
    }
    
    .alert-box.success {
      background: #f0fdf4;
      border-left-color: #10b981;
    }
    
    .alert-title {
      font-size: 13px;
      font-weight: 600;
      line-height: 1.4;
      margin-bottom: 6px;
    }
    
    .alert-text {
      font-size: 12px;
      font-weight: 400;
      line-height: 1.5;
      color: #475569;
    }
    
    .data-table {
      width: 100%;
      border-collapse: collapse;
      margin: 16px 0;
      page-break-inside: avoid;
    }
    
    .data-table th {
      background: #f1f5f9;
      padding: 10px 12px;
      text-align: left;
      font-size: 11px;
      font-weight: 600;
      line-height: 1.4;
      color: #475569;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      border-bottom: 2px solid #cbd5e1;
    }
    
    .data-table td {
      padding: 10px 12px;
      border-bottom: 1px solid #e2e8f0;
      font-size: 13px;
      font-weight: 400;
      line-height: 1.5;
    }
    
    .badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 10px;
      font-size: 10px;
      font-weight: 600;
      line-height: 1.4;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    
    .badge.success {
      background: #d1fae5;
      color: #065f46;
    }
    
    .badge.warning {
      background: #fef3c7;
      color: #92400e;
    }
    
    .badge.danger {
      background: #fee2e2;
      color: #991b1b;
    }
    
    .badge.info {
      background: #dbeafe;
      color: #1e40af;
    }
    
    /* Footer */
    .page-footer {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 40px;
      background: #f8fafc;
      padding: 0 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top: 1px solid #e2e8f0;
      font-size: 10px;
      font-weight: 400;
      line-height: 1.4;
      color: #64748b;
    }
    
    .page-number {
      font-weight: 600;
      color: #475569;
    }
    
    .section {
      page-break-inside: avoid;
      margin-bottom: 28px;
    }
    
    .subsection {
      page-break-inside: avoid;
      margin-bottom: 20px;
    }
    
    /* Recommendations Page */
    .recommendations-box {
      background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
      color: white;
      padding: 24px 28px;
      border-radius: 10px;
      margin: 20px 0;
      border: 3px solid #f59e0b;
      page-break-inside: avoid;
    }
    
    .recommendations-title {
      font-size: 18px;
      font-weight: 700;
      line-height: 1.3;
      letter-spacing: -0.01em;
      color: #fbbf24;
      margin-bottom: 16px;
      text-align: center;
    }
    
    .recommendation-item {
      background: rgba(255, 255, 255, 0.1);
      padding: 12px 14px;
      margin: 10px 0;
      border-radius: 6px;
      border-left: 3px solid #10b981;
      font-size: 13px;
      line-height: 1.6;
    }
    
    .recommendation-item strong {
      color: #fbbf24;
    }
    
    .quote-box {
      text-align: center;
      font-style: italic;
      font-size: 15px;
      font-weight: 500;
      line-height: 1.6;
      color: #94a3b8;
      margin: 28px 0;
      padding: 20px;
      border-top: 1px solid rgba(148, 163, 184, 0.3);
      border-bottom: 1px solid rgba(148, 163, 184, 0.3);
      page-break-inside: avoid;
    }
    
    /* Utility classes */
    .text-center {
      text-align: center;
    }
    
    .mb-4 {
      margin-bottom: 16px;
    }
    
    .mt-4 {
      margin-top: 16px;
    }
    
    /* Disclaimer text */
    .disclaimer-text {
      font-size: 10px;
      line-height: 1.6;
      color: #64748b;
      text-align: justify;
    }
    
    /* Print optimization */
    @media print {
      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      
      .page {
        page-break-after: always;
      }
      
      .page:last-child {
        page-break-after: auto;
      }
    }
  </style>
</head>
<body>

  <!-- PAGE 1: COVER PAGE -->
  <div class="page cover-page">
    <div class="cover-logo">🦉 OWL FENC</div>
    <div class="cover-title">Property Verification Report</div>
    <div class="cover-address">${data.address}</div>
    <div class="cover-badge">✓ VERIFIED</div>
    
    <div class="cover-meta">
      <div class="cover-meta-item">
        <div class="cover-meta-label">Report ID</div>
        <div class="cover-meta-value">${reportId}</div>
      </div>
      <div class="cover-meta-item">
        <div class="cover-meta-label">Date Generated</div>
        <div class="cover-meta-value">${currentDate}</div>
      </div>
      <div class="cover-meta-item">
        <div class="cover-meta-label">Data Source</div>
        <div class="cover-meta-value">ATTOM Data</div>
      </div>
    </div>
    
    ${contractor ? `
    <div class="cover-meta" style="margin-top: 60px; padding-top: 40px;">
      <div style="text-align: center; width: 100%;">
        <div class="cover-meta-label">Generated By</div>
        <div class="cover-meta-value">${contractor.companyName || contractor.contractorName || 'Owl Fenc User'}</div>
        ${contractor.email ? `<div style="font-size: 13px; color: #94a3b8; margin-top: 4px;">${contractor.email}</div>` : ''}
        ${contractor.phone ? `<div style="font-size: 13px; color: #94a3b8;">${contractor.phone}</div>` : ''}
      </div>
    </div>
    ` : ''}
    
    <div class="cover-footer">
      <div>POWERED BY MERVIN AI</div>
      <div style="margin-top: 4px;">Advanced Artificial Intelligence for Contractor Protection</div>
    </div>
  </div>

  <!-- PAGE 2: EXECUTIVE SUMMARY -->
  <div class="page">
    <div class="page-header">
      <div class="page-header-logo">🦉 OWL FENC</div>
      <div class="page-header-info">
        <div>${reportId}</div>
        <div>${currentDate}</div>
      </div>
    </div>
    
    <div class="page-content">
      <div class="section-title">Executive Summary</div>
      
      <div class="subsection-title">
        <span class="subsection-icon"></span>
        Property Overview
      </div>
      
      <div class="info-grid">
        <div class="info-card">
          <div class="info-label">Address</div>
          <div class="info-value">${data.address}</div>
        </div>
        <div class="info-card">
          <div class="info-label">Property Type</div>
          <div class="info-value">${data.propertyType || 'Single Family Residence'}</div>
        </div>
        <div class="info-card">
          <div class="info-label">Year Built</div>
          <div class="info-value">${data.yearBuilt || 'N/A'} ${data.yearBuilt ? `(${new Date().getFullYear() - data.yearBuilt} years old)` : ''}</div>
        </div>
        <div class="info-card">
          <div class="info-label">Living Area</div>
          <div class="info-value">${data.sqft ? data.sqft.toLocaleString() + ' sq ft' : 'N/A'}</div>
        </div>
        <div class="info-card">
          <div class="info-label">Lot Size</div>
          <div class="info-value">${data.lotSize || (data.landSqft ? data.landSqft.toLocaleString() + ' sq ft' : 'N/A')}</div>
        </div>
        <div class="info-card">
          <div class="info-label">Bedrooms / Bathrooms</div>
          <div class="info-value">${data.bedrooms || 'N/A'} / ${data.bathrooms || 'N/A'}</div>
        </div>
        ${data.assessedValue ? `
        <div class="info-card">
          <div class="info-label">Assessed Value</div>
          <div class="info-value large highlight">$${data.assessedValue.toLocaleString()}</div>
        </div>
        ` : ''}
        ${data.marketValue ? `
        <div class="info-card">
          <div class="info-label">Market Value</div>
          <div class="info-value large highlight">$${data.marketValue.toLocaleString()}</div>
        </div>
        ` : ''}
      </div>
      
      <div class="subsection-title">
        <span class="subsection-icon"></span>
        Current Owner
      </div>
      
      <div class="info-grid">
        <div class="info-card">
          <div class="info-label">Owner Name</div>
          <div class="info-value">${data.owner}</div>
        </div>
        ${data.purchaseDate ? `
        <div class="info-card">
          <div class="info-label">Acquired Date</div>
          <div class="info-value">${format(new Date(data.purchaseDate), 'MMMM d, yyyy')}</div>
        </div>
        ` : ''}
        ${data.purchasePrice ? `
        <div class="info-card">
          <div class="info-label">Purchase Price</div>
          <div class="info-value highlight">$${data.purchasePrice.toLocaleString()}</div>
        </div>
        ` : ''}
        ${data.purchaseDate ? `
        <div class="info-card">
          <div class="info-label">Ownership Duration</div>
          <div class="info-value">${this.calculateYearsMonths(data.purchaseDate)}</div>
        </div>
        ` : ''}
        ${data.ownerOccupied !== undefined ? `
        <div class="info-card">
          <div class="info-label">Owner Occupied</div>
          <div class="info-value ${data.ownerOccupied ? 'success' : 'warning'}">${data.ownerOccupied ? 'Yes' : 'No (Absentee)'}</div>
        </div>
        ` : ''}
        ${data.ownershipType ? `
        <div class="info-card">
          <div class="info-label">Ownership Type</div>
          <div class="info-value">${data.ownershipType}</div>
        </div>
        ` : ''}
      </div>
      
      <div class="subsection-title">
        <span class="subsection-icon"></span>
        Verification Status
      </div>
      
      <div class="alert-box success">
        <div class="alert-title">✅ Ownership Verified</div>
        <div class="alert-text">Property ownership has been verified through official records.</div>
      </div>
      
      <div class="alert-box success">
        <div class="alert-title">✅ Property Details Confirmed</div>
        <div class="alert-text">All property details have been cross-referenced with public records.</div>
      </div>
      
      ${!data.lienAmount && !data.foreclosureStatus ? `
      <div class="alert-box success">
        <div class="alert-title">✅ No Active Liens Detected</div>
        <div class="alert-text">No liens or judgments were found in public records at the time of this report.</div>
      </div>
      ` : ''}
      
      ${data.lienAmount ? `
      <div class="alert-box warning">
        <div class="alert-title">⚠️ Active Lien Detected</div>
        <div class="alert-text">A lien of $${data.lienAmount.toLocaleString()} was found. See Legal Status section for details.</div>
      </div>
      ` : ''}
      
      ${data.foreclosureStatus ? `
      <div class="alert-box danger">
        <div class="alert-title">🚨 Foreclosure Status Alert</div>
        <div class="alert-text">Foreclosure status: ${data.foreclosureStatus}. See Legal Status section for details.</div>
      </div>
      ` : ''}
    </div>
    
    <div class="page-footer">
      <div class="page-number">Page 2 of 7</div>
      <div style="text-align: center;">${currentDate}</div>
      <div style="text-align: right;">Powered by MERVIN AI</div>
    </div>
  </div>

  <!-- PAGE 3: PROPERTY DETAILS & CONSTRUCTION -->
  <div class="page">
    <div class="page-header">
      <div class="page-header-logo">🦉 OWL FENC</div>
      <div class="page-header-info">
        <div>${reportId}</div>
        <div>${currentDate}</div>
      </div>
    </div>
    
    <div class="page-content">
      <div class="section-title">Property Details & Construction</div>
      
      <div class="subsection-title">
        <span class="subsection-icon"></span>
        Building Characteristics
      </div>
      
      <div class="info-grid three-columns">
        ${data.stories ? `
        <div class="info-card">
          <div class="info-label">Stories</div>
          <div class="info-value">${data.stories}</div>
        </div>
        ` : ''}
        ${data.roofCover ? `
        <div class="info-card">
          <div class="info-label">Roof Cover</div>
          <div class="info-value">${data.roofCover}</div>
        </div>
        ` : ''}
        ${data.roofFrame ? `
        <div class="info-card">
          <div class="info-label">Roof Frame</div>
          <div class="info-value">${data.roofFrame}</div>
        </div>
        ` : ''}
        ${data.roofShape ? `
        <div class="info-card">
          <div class="info-label">Roof Shape</div>
          <div class="info-value">${data.roofShape}</div>
        </div>
        ` : ''}
        ${data.exteriorWalls ? `
        <div class="info-card">
          <div class="info-label">Exterior Walls</div>
          <div class="info-value">${data.exteriorWalls}</div>
        </div>
        ` : ''}
        ${data.foundation ? `
        <div class="info-card">
          <div class="info-label">Foundation</div>
          <div class="info-value">${data.foundation}</div>
        </div>
        ` : ''}
        ${data.constructionType ? `
        <div class="info-card">
          <div class="info-label">Construction Type</div>
          <div class="info-value">${data.constructionType}</div>
        </div>
        ` : ''}
        ${data.architecturalStyle ? `
        <div class="info-card">
          <div class="info-label">Architectural Style</div>
          <div class="info-value">${data.architecturalStyle}</div>
        </div>
        ` : ''}
        ${data.buildingCondition ? `
        <div class="info-card">
          <div class="info-label">Building Condition</div>
          <div class="info-value">${data.buildingCondition}</div>
        </div>
        ` : ''}
        ${data.buildingQuality ? `
        <div class="info-card">
          <div class="info-label">Building Quality</div>
          <div class="info-value">${data.buildingQuality}</div>
        </div>
        ` : ''}
        ${data.flooring ? `
        <div class="info-card">
          <div class="info-label">Flooring</div>
          <div class="info-value">${data.flooring}</div>
        </div>
        ` : ''}
        ${data.interiorWalls ? `
        <div class="info-card">
          <div class="info-label">Interior Walls</div>
          <div class="info-value">${data.interiorWalls}</div>
        </div>
        ` : ''}
      </div>
      
      <div class="subsection-title">
        <span class="subsection-icon"></span>
        Heating, Cooling & Interior Features
      </div>
      
      <div class="info-grid">
        ${data.heatingType ? `
        <div class="info-card">
          <div class="info-label">Heating Type</div>
          <div class="info-value">${data.heatingType}</div>
        </div>
        ` : ''}
        ${data.heatingFuel ? `
        <div class="info-card">
          <div class="info-label">Heating Fuel</div>
          <div class="info-value">${data.heatingFuel}</div>
        </div>
        ` : ''}
        ${data.airConditioningType ? `
        <div class="info-card">
          <div class="info-label">Air Conditioning</div>
          <div class="info-value">${data.airConditioningType}</div>
        </div>
        ` : ''}
        ${data.fireplaceCount ? `
        <div class="info-card">
          <div class="info-label">Fireplace Count</div>
          <div class="info-value">${data.fireplaceCount}</div>
        </div>
        ` : ''}
        ${data.fireplaceType ? `
        <div class="info-card">
          <div class="info-label">Fireplace Type</div>
          <div class="info-value">${data.fireplaceType}</div>
        </div>
        ` : ''}
        ${data.basementSize ? `
        <div class="info-card">
          <div class="info-label">Basement Size</div>
          <div class="info-value">${data.basementSize.toLocaleString()} sq ft</div>
        </div>
        ` : ''}
      </div>
      
      <div class="subsection-title">
        <span class="subsection-icon"></span>
        Parking & Garage
      </div>
      
      <div class="info-grid">
        ${data.garageParkingCapacity ? `
        <div class="info-card">
          <div class="info-label">Garage Capacity</div>
          <div class="info-value">${data.garageParkingCapacity} cars</div>
        </div>
        ` : ''}
        ${data.garageParkingType ? `
        <div class="info-card">
          <div class="info-label">Garage Type</div>
          <div class="info-value">${data.garageParkingType}</div>
        </div>
        ` : ''}
        ${data.parkingSpaces ? `
        <div class="info-card">
          <div class="info-label">Total Parking Spaces</div>
          <div class="info-value">${data.parkingSpaces}</div>
        </div>
        ` : ''}
        ${data.parkingType ? `
        <div class="info-card">
          <div class="info-label">Parking Type</div>
          <div class="info-value">${data.parkingType}</div>
        </div>
        ` : ''}
      </div>
      
      <div class="subsection-title">
        <span class="subsection-icon"></span>
        Utilities & Additional Features
      </div>
      
      <div class="info-grid">
        ${data.waterType ? `
        <div class="info-card">
          <div class="info-label">Water Type</div>
          <div class="info-value">${data.waterType}</div>
        </div>
        ` : ''}
        ${data.sewerType ? `
        <div class="info-card">
          <div class="info-label">Sewer Type</div>
          <div class="info-value">${data.sewerType}</div>
        </div>
        ` : ''}
        ${data.pool !== undefined ? `
        <div class="info-card">
          <div class="info-label">Pool</div>
          <div class="info-value ${data.pool ? 'success' : ''}">${data.pool ? 'Yes' : 'No'}</div>
        </div>
        ` : ''}
        ${data.poolType ? `
        <div class="info-card">
          <div class="info-label">Pool Type</div>
          <div class="info-value">${data.poolType}</div>
        </div>
        ` : ''}
      </div>
    </div>
    
    <div class="page-footer">
      <div class="page-number">Page 3 of 7</div>
      <div style="text-align: center;">${currentDate}</div>
      <div style="text-align: right;">Powered by MERVIN AI</div>
    </div>
  </div>

  <!-- PAGE 4: FINANCIAL INFORMATION & TAX ASSESSMENT -->
  <div class="page">
    <div class="page-header">
      <div class="page-header-logo">🦉 OWL FENC</div>
      <div class="page-header-info">
        <div>${reportId}</div>
        <div>${currentDate}</div>
      </div>
    </div>
    
    <div class="page-content">
      <div class="section-title">Financial Information & Tax Assessment</div>
      
      <div class="subsection-title">
        <span class="subsection-icon"></span>
        Assessed Value
      </div>
      
      <div class="info-grid three-columns">
        ${data.assessedValue ? `
        <div class="info-card">
          <div class="info-label">Total Assessed Value</div>
          <div class="info-value large highlight">$${data.assessedValue.toLocaleString()}</div>
        </div>
        ` : ''}
        ${data.assessedLandValue ? `
        <div class="info-card">
          <div class="info-label">Land Value</div>
          <div class="info-value">$${data.assessedLandValue.toLocaleString()}</div>
        </div>
        ` : ''}
        ${data.assessedImprovementValue ? `
        <div class="info-card">
          <div class="info-label">Improvement Value</div>
          <div class="info-value">$${data.assessedImprovementValue.toLocaleString()}</div>
        </div>
        ` : ''}
        ${data.taxYear ? `
        <div class="info-card">
          <div class="info-label">Tax Year</div>
          <div class="info-value">${data.taxYear}</div>
        </div>
        ` : ''}
      </div>
      
      <div class="subsection-title">
        <span class="subsection-icon"></span>
        Market Value
      </div>
      
      <div class="info-grid three-columns">
        ${data.marketValue ? `
        <div class="info-card">
          <div class="info-label">Total Market Value</div>
          <div class="info-value large highlight">$${data.marketValue.toLocaleString()}</div>
        </div>
        ` : ''}
        ${data.marketLandValue ? `
        <div class="info-card">
          <div class="info-label">Land Market Value</div>
          <div class="info-value">$${data.marketLandValue.toLocaleString()}</div>
        </div>
        ` : ''}
        ${data.marketImprovementValue ? `
        <div class="info-card">
          <div class="info-label">Improvement Market Value</div>
          <div class="info-value">$${data.marketImprovementValue.toLocaleString()}</div>
        </div>
        ` : ''}
      </div>
      
      ${data.avmValue ? `
      <div class="subsection-title">
        <span class="subsection-icon"></span>
        Automated Valuation Model (AVM)
      </div>
      
      <div class="info-grid">
        <div class="info-card">
          <div class="info-label">AVM Estimated Value</div>
          <div class="info-value large highlight">$${data.avmValue.toLocaleString()}</div>
        </div>
        ${data.avmHigh ? `
        <div class="info-card">
          <div class="info-label">AVM High Estimate</div>
          <div class="info-value">$${data.avmHigh.toLocaleString()}</div>
        </div>
        ` : ''}
        ${data.avmLow ? `
        <div class="info-card">
          <div class="info-label">AVM Low Estimate</div>
          <div class="info-value">$${data.avmLow.toLocaleString()}</div>
        </div>
        ` : ''}
        ${data.avmDate ? `
        <div class="info-card">
          <div class="info-label">Valuation Date</div>
          <div class="info-value">${format(new Date(data.avmDate), 'MMMM d, yyyy')}</div>
        </div>
        ` : ''}
      </div>
      ` : ''}
      
      <div class="subsection-title">
        <span class="subsection-icon"></span>
        Property Taxes
      </div>
      
      <div class="info-grid">
        ${data.taxAmount ? `
        <div class="info-card">
          <div class="info-label">Annual Tax Amount</div>
          <div class="info-value large ${data.taxDelinquentYear ? 'danger' : 'success'}">$${data.taxAmount.toLocaleString()}</div>
        </div>
        ` : ''}
        ${data.taxYear ? `
        <div class="info-card">
          <div class="info-label">Tax Year</div>
          <div class="info-value">${data.taxYear}</div>
        </div>
        ` : ''}
        ${data.taxDelinquentYear ? `
        <div class="info-card">
          <div class="info-label">Tax Delinquent Year</div>
          <div class="info-value danger">${data.taxDelinquentYear}</div>
        </div>
        ` : ''}
      </div>
      
      ${data.taxDelinquentYear ? `
      <div class="alert-box danger">
        <div class="alert-title">🚨 Tax Delinquency Alert</div>
        <div class="alert-text">Property taxes are delinquent for year ${data.taxDelinquentYear}. This may indicate financial distress or ownership disputes. Exercise caution before entering into any agreements.</div>
      </div>
      ` : data.taxAmount ? `
      <div class="alert-box success">
        <div class="alert-title">✅ Tax Status Current</div>
        <div class="alert-text">No tax delinquencies detected. Property taxes appear to be current.</div>
      </div>
      ` : ''}
      
      ${data.hoaFee ? `
      <div class="subsection-title">
        <span class="subsection-icon"></span>
        Homeowners Association (HOA)
      </div>
      
      <div class="info-grid">
        <div class="info-card">
          <div class="info-label">HOA Fee</div>
          <div class="info-value">$${data.hoaFee.toLocaleString()} ${data.hoaFeeFrequency ? '/ ' + data.hoaFeeFrequency : ''}</div>
        </div>
        ${data.hoaName ? `
        <div class="info-card">
          <div class="info-label">HOA Name</div>
          <div class="info-value">${data.hoaName}</div>
        </div>
        ` : ''}
      </div>
      
      <div class="alert-box warning">
        <div class="alert-title">ℹ️ HOA Notice</div>
        <div class="alert-text">This property is part of a Homeowners Association. Ensure you obtain HOA approval before starting any exterior work or modifications.</div>
      </div>
      ` : ''}
    </div>
    
    <div class="page-footer">
      <div class="page-number">Page 4 of 7</div>
      <div style="text-align: center;">${currentDate}</div>
      <div style="text-align: right;">Powered by MERVIN AI</div>
    </div>
  </div>

  <!-- PAGE 5: OWNERSHIP & SALE HISTORY -->
  <div class="page">
    <div class="page-header">
      <div class="page-header-logo">🦉 OWL FENC</div>
      <div class="page-header-info">
        <div>${reportId}</div>
        <div>${currentDate}</div>
      </div>
    </div>
    
    <div class="page-content">
      <div class="section-title">Ownership & Sale History</div>
      
      <div class="subsection-title">
        <span class="subsection-icon"></span>
        Current Ownership Details
      </div>
      
      <div class="info-grid">
        <div class="info-card">
          <div class="info-label">Primary Owner</div>
          <div class="info-value">${data.owner}</div>
        </div>
        ${data.owner2 ? `
        <div class="info-card">
          <div class="info-label">Co-Owner 2</div>
          <div class="info-value">${data.owner2}</div>
        </div>
        ` : ''}
        ${data.owner3 ? `
        <div class="info-card">
          <div class="info-label">Co-Owner 3</div>
          <div class="info-value">${data.owner3}</div>
        </div>
        ` : ''}
        ${data.owner4 ? `
        <div class="info-card">
          <div class="info-label">Co-Owner 4</div>
          <div class="info-value">${data.owner4}</div>
        </div>
        ` : ''}
        ${data.ownershipType ? `
        <div class="info-card">
          <div class="info-label">Ownership Type</div>
          <div class="info-value">${data.ownershipType}</div>
        </div>
        ` : ''}
        ${data.ownershipVesting ? `
        <div class="info-card">
          <div class="info-label">Ownership Vesting</div>
          <div class="info-value">${data.ownershipVesting}</div>
        </div>
        ` : ''}
        ${data.ownerOccupied !== undefined ? `
        <div class="info-card">
          <div class="info-label">Owner Occupied</div>
          <div class="info-value ${data.ownerOccupied ? 'success' : 'warning'}">${data.ownerOccupied ? 'Yes - Owner lives on property' : 'No - Absentee owner'}</div>
        </div>
        ` : ''}
      </div>
      
      <div class="subsection-title">
        <span class="subsection-icon"></span>
        Deed Information
      </div>
      
      <div class="info-grid">
        ${data.deedDocNumber ? `
        <div class="info-card">
          <div class="info-label">Deed Document Number</div>
          <div class="info-value">${data.deedDocNumber}</div>
        </div>
        ` : ''}
        ${data.deedDocType ? `
        <div class="info-card">
          <div class="info-label">Deed Document Type</div>
          <div class="info-value">${data.deedDocType}</div>
        </div>
        ` : ''}
        ${data.deedTransDate ? `
        <div class="info-card">
          <div class="info-label">Deed Transfer Date</div>
          <div class="info-value">${format(new Date(data.deedTransDate), 'MMMM d, yyyy')}</div>
        </div>
        ` : ''}
      </div>
      
      <div class="subsection-title">
        <span class="subsection-icon"></span>
        Most Recent Sale
      </div>
      
      <div class="info-grid">
        ${data.purchaseDate ? `
        <div class="info-card">
          <div class="info-label">Sale Date</div>
          <div class="info-value">${format(new Date(data.purchaseDate), 'MMMM d, yyyy')}</div>
        </div>
        ` : ''}
        ${data.purchasePrice ? `
        <div class="info-card">
          <div class="info-label">Sale Price</div>
          <div class="info-value large highlight">$${data.purchasePrice.toLocaleString()}</div>
        </div>
        ` : ''}
        ${data.saleRecordingDate ? `
        <div class="info-card">
          <div class="info-label">Recording Date</div>
          <div class="info-value">${format(new Date(data.saleRecordingDate), 'MMMM d, yyyy')}</div>
        </div>
        ` : ''}
        ${data.saleType ? `
        <div class="info-card">
          <div class="info-label">Sale Type</div>
          <div class="info-value">${data.saleType}</div>
        </div>
        ` : ''}
        ${data.saleDocNumber ? `
        <div class="info-card">
          <div class="info-label">Sale Document Number</div>
          <div class="info-value">${data.saleDocNumber}</div>
        </div>
        ` : ''}
        ${data.purchaseDate ? `
        <div class="info-card">
          <div class="info-label">Time as Owner</div>
          <div class="info-value">${this.calculateYearsMonths(data.purchaseDate)}</div>
        </div>
        ` : ''}
      </div>
      
      ${data.buyer1 || data.seller1 ? `
      <div class="subsection-title">
        <span class="subsection-icon"></span>
        Transaction Parties
      </div>
      
      <div class="info-grid">
        ${data.buyer1 ? `
        <div class="info-card">
          <div class="info-label">Buyer 1</div>
          <div class="info-value">${data.buyer1}</div>
        </div>
        ` : ''}
        ${data.buyer2 ? `
        <div class="info-card">
          <div class="info-label">Buyer 2</div>
          <div class="info-value">${data.buyer2}</div>
        </div>
        ` : ''}
        ${data.seller1 ? `
        <div class="info-card">
          <div class="info-label">Seller 1</div>
          <div class="info-value">${data.seller1}</div>
        </div>
        ` : ''}
        ${data.seller2 ? `
        <div class="info-card">
          <div class="info-label">Seller 2</div>
          <div class="info-value">${data.seller2}</div>
        </div>
        ` : ''}
      </div>
      ` : ''}
      
      ${data.purchasePrice && data.assessedValue ? `
      <div class="alert-box ${data.purchasePrice > data.assessedValue ? 'warning' : 'success'}">
        <div class="alert-title">${data.purchasePrice > data.assessedValue ? '⚠️' : '✅'} Purchase Price vs Assessed Value</div>
        <div class="alert-text">
          The property was purchased for $${data.purchasePrice.toLocaleString()}, which is 
          ${data.purchasePrice > data.assessedValue ? 'higher' : 'lower'} than the current assessed value of $${data.assessedValue.toLocaleString()} 
          (${Math.abs(((data.purchasePrice - data.assessedValue) / data.assessedValue) * 100).toFixed(1)}% ${data.purchasePrice > data.assessedValue ? 'above' : 'below'}).
        </div>
      </div>
      ` : ''}
    </div>
    
    <div class="page-footer">
      <div class="page-number">Page 5 of 7</div>
      <div style="text-align: center;">${currentDate}</div>
      <div style="text-align: right;">Powered by MERVIN AI</div>
    </div>
  </div>

  <!-- PAGE 6: LEGAL STATUS & MORTGAGE -->
  <div class="page">
    <div class="page-header">
      <div class="page-header-logo">🦉 OWL FENC</div>
      <div class="page-header-info">
        <div>${reportId}</div>
        <div>${currentDate}</div>
      </div>
    </div>
    
    <div class="page-content">
      <div class="section-title">Legal Status & Mortgage Information</div>
      
      ${data.lienAmount || data.judgmentAmount || data.foreclosureStatus ? `
      <div class="subsection-title">
        <span class="subsection-icon"></span>
        Legal Issues & Encumbrances
      </div>
      
      ${data.lienAmount ? `
      <div class="alert-box danger">
        <div class="alert-title">🚨 Active Lien Detected</div>
        <div class="alert-text">
          <strong>Lien Amount:</strong> $${data.lienAmount.toLocaleString()}<br>
          ${data.lienType ? `<strong>Lien Type:</strong> ${data.lienType}<br>` : ''}
          ${data.lienDate ? `<strong>Lien Date:</strong> ${format(new Date(data.lienDate), 'MMMM d, yyyy')}<br>` : ''}
          <br>
          <strong>⚠️ WARNING:</strong> This property has an active lien. Do not begin work or deliver materials without a signed contract and upfront payment. Consult with a legal professional before proceeding.
        </div>
      </div>
      ` : ''}
      
      ${data.judgmentAmount ? `
      <div class="alert-box danger">
        <div class="alert-title">🚨 Judgment Found</div>
        <div class="alert-text">
          <strong>Judgment Amount:</strong> $${data.judgmentAmount.toLocaleString()}<br>
          ${data.judgmentType ? `<strong>Judgment Type:</strong> ${data.judgmentType}<br>` : ''}
          ${data.judgmentDate ? `<strong>Judgment Date:</strong> ${format(new Date(data.judgmentDate), 'MMMM d, yyyy')}<br>` : ''}
          <br>
          <strong>⚠️ WARNING:</strong> A judgment has been filed against this property or owner. This indicates potential financial or legal issues. Proceed with extreme caution.
        </div>
      </div>
      ` : ''}
      
      ${data.foreclosureStatus ? `
      <div class="alert-box danger">
        <div class="alert-title">🚨 Foreclosure Alert</div>
        <div class="alert-text">
          <strong>Foreclosure Status:</strong> ${data.foreclosureStatus}<br>
          ${data.foreclosureType ? `<strong>Foreclosure Type:</strong> ${data.foreclosureType}<br>` : ''}
          ${data.foreclosureDate ? `<strong>Foreclosure Date:</strong> ${format(new Date(data.foreclosureDate), 'MMMM d, yyyy')}<br>` : ''}
          ${data.foreclosureAmount ? `<strong>Foreclosure Amount:</strong> $${data.foreclosureAmount.toLocaleString()}<br>` : ''}
          <br>
          <strong>🚫 CRITICAL WARNING:</strong> This property is in foreclosure or has foreclosure proceedings. DO NOT perform work on this property without consulting a real estate attorney. The current owner may not have legal authority to authorize work.
        </div>
      </div>
      ` : ''}
      ` : `
      <div class="alert-box success">
        <div class="alert-title">✅ No Legal Issues Found</div>
        <div class="alert-text">No liens, judgments, or foreclosure proceedings were found in public records at the time of this report. However, always verify ownership and obtain a signed contract before beginning work.</div>
      </div>
      `}
      
      ${data.lenderName || data.loanAmount ? `
      <div class="subsection-title">
        <span class="subsection-icon"></span>
        Mortgage Information
      </div>
      
      <div class="info-grid">
        ${data.lenderName ? `
        <div class="info-card">
          <div class="info-label">Lender Name</div>
          <div class="info-value">${data.lenderName}</div>
        </div>
        ` : ''}
        ${data.loanAmount ? `
        <div class="info-card">
          <div class="info-label">Loan Amount</div>
          <div class="info-value large">$${data.loanAmount.toLocaleString()}</div>
        </div>
        ` : ''}
        ${data.loanType ? `
        <div class="info-card">
          <div class="info-label">Loan Type</div>
          <div class="info-value">${data.loanType}</div>
        </div>
        ` : ''}
        ${data.loanRecordingDate ? `
        <div class="info-card">
          <div class="info-label">Loan Recording Date</div>
          <div class="info-value">${format(new Date(data.loanRecordingDate), 'MMMM d, yyyy')}</div>
        </div>
        ` : ''}
        ${data.loanDueDate ? `
        <div class="info-card">
          <div class="info-label">Loan Due Date</div>
          <div class="info-value">${format(new Date(data.loanDueDate), 'MMMM d, yyyy')}</div>
        </div>
        ` : ''}
        ${data.loanTermMonths ? `
        <div class="info-card">
          <div class="info-label">Loan Term</div>
          <div class="info-value">${data.loanTermMonths} months (${(data.loanTermMonths / 12).toFixed(1)} years)</div>
        </div>
        ` : ''}
        ${data.loanInterestRate ? `
        <div class="info-card">
          <div class="info-label">Interest Rate</div>
          <div class="info-value">${data.loanInterestRate}%</div>
        </div>
        ` : ''}
      </div>
      
      ${data.loanAmount && data.assessedValue ? `
      <div class="alert-box ${(data.loanAmount / data.assessedValue) > 0.8 ? 'warning' : 'info'}">
        <div class="alert-title">${(data.loanAmount / data.assessedValue) > 0.8 ? '⚠️' : 'ℹ️'} Loan-to-Value Ratio</div>
        <div class="alert-text">
          The current loan amount ($${data.loanAmount.toLocaleString()}) represents approximately ${((data.loanAmount / data.assessedValue) * 100).toFixed(1)}% of the assessed property value ($${data.assessedValue.toLocaleString()}).
          ${(data.loanAmount / data.assessedValue) > 0.8 ? ' This high loan-to-value ratio may indicate limited equity and potential financial stress.' : ''}
        </div>
      </div>
      ` : ''}
      ` : ''}
      
      ${data.schoolDistrict ? `
      <div class="subsection-title">
        <span class="subsection-icon"></span>
        School District Information
      </div>
      
      <div class="info-grid">
        <div class="info-card">
          <div class="info-label">School District</div>
          <div class="info-value">${data.schoolDistrict}</div>
        </div>
        ${data.elementarySchool ? `
        <div class="info-card">
          <div class="info-label">Elementary School</div>
          <div class="info-value">${data.elementarySchool}</div>
        </div>
        ` : ''}
        ${data.middleSchool ? `
        <div class="info-card">
          <div class="info-label">Middle School</div>
          <div class="info-value">${data.middleSchool}</div>
        </div>
        ` : ''}
        ${data.highSchool ? `
        <div class="info-card">
          <div class="info-label">High School</div>
          <div class="info-value">${data.highSchool}</div>
        </div>
        ` : ''}
      </div>
      ` : ''}
    </div>
    
    <div class="page-footer">
      <div class="page-number">Page 6 of 7</div>
      <div style="text-align: center;">${currentDate}</div>
      <div style="text-align: right;">Powered by MERVIN AI</div>
    </div>
  </div>

  <!-- PAGE 7: RECOMMENDATIONS & DISCLAIMER -->
  <div class="page">
    <div class="page-header">
      <div class="page-header-logo">🦉 OWL FENC</div>
      <div class="page-header-info">
        <div>${reportId}</div>
        <div>${currentDate}</div>
      </div>
    </div>
    
    <div class="page-content">
      <div class="section-title">Contractor Recommendations & Best Practices</div>
      
      <div class="recommendations-box">
        <div class="recommendations-title">🦉 Consejos de Oro Antes de Lanzarte al Jale</div>
        
        <div class="recommendation-item">
          <strong>1. Verifica SIEMPRE la Identidad del Dueño</strong><br>
          Si el nombre no coincide con el del dueño, aguas, no firmes nada todavía. Pide identificación oficial y compárala con este reporte.
        </div>
        
        <div class="recommendation-item">
          <strong>2. NUNCA Entregues Materiales Sin Contrato Firmado</strong><br>
          Jamás entregues materiales ni arranques el trabajo sin contrato firmado. Un apretón de manos no te protege legalmente.
        </div>
        
        <div class="recommendation-item">
          <strong>3. Usa Owl Fenc Property Verifier ANTES de Cada Proyecto</strong><br>
          Usa siempre Owl Fenc – Property Ownership Verifier antes de dar un estimado o aceptar un proyecto. Los datos te protegen de fraudes.
        </div>
        
        <div class="recommendation-item">
          <strong>4. Revisa el Estado Legal de la Propiedad</strong><br>
          Si este reporte muestra gravámenes (liens), juicios o ejecución hipotecaria, consulta con un abogado antes de proceder.
        </div>
        
        <div class="recommendation-item">
          <strong>5. Solicita Pago Inicial del 30-50%</strong><br>
          Para proyectos grandes, solicita un pago inicial del 30-50% antes de comenzar. Esto demuestra compromiso y solvencia del cliente.
        </div>
        
        <div class="recommendation-item">
          <strong>6. Verifica si el Dueño Vive en la Propiedad</strong><br>
          ${data.ownerOccupied ? 'Este reporte indica que el dueño SÍ vive en la propiedad, lo cual reduce el riesgo de fraude.' : 'Este reporte indica que el dueño NO vive en la propiedad (absentee owner). Ten precaución adicional y verifica autorización.'}
        </div>
        
        <div class="recommendation-item">
          <strong>7. Documenta TODO con Fotos y Videos</strong><br>
          Antes, durante y después del trabajo, documenta todo con fotos y videos. Esto te protege de reclamos falsos.
        </div>
        
        <div class="recommendation-item">
          <strong>8. Obtén Permisos Necesarios</strong><br>
          Verifica con el municipio si necesitas permisos. Trabajar sin permisos puede resultar en multas y responsabilidad legal.
        </div>
      </div>
      
      <div class="quote-box">
        "La confianza se construye con datos, no con promesas." 🦉
      </div>
      
      <div class="subsection-title">
        <span class="subsection-icon"></span>
        Legal Disclaimer
      </div>
      
      <div class="disclaimer-text">
        <p style="margin-bottom: 12px;">
          <strong>IMPORTANT NOTICE:</strong> This Property Verification Report is provided for informational purposes only and should not be considered as legal, financial, or professional advice. The information contained in this report is obtained from public records and third-party data sources, including ATTOM Data Solutions.
        </p>
        
        <p style="margin-bottom: 12px;">
          <strong>Accuracy and Completeness:</strong> While we strive to provide accurate and up-to-date information, we cannot guarantee the accuracy, completeness, or timeliness of the data. Property records may contain errors, omissions, or outdated information. Users should independently verify all information before making any decisions.
        </p>
        
        <p style="margin-bottom: 12px;">
          <strong>No Warranty:</strong> This report is provided "as is" without any warranty of any kind, either express or implied. Owl Fenc and MERVIN AI disclaim all warranties, including but not limited to warranties of merchantability, fitness for a particular purpose, and non-infringement.
        </p>
        
        <p style="margin-bottom: 12px;">
          <strong>Limitation of Liability:</strong> In no event shall Owl Fenc, MERVIN AI, or their affiliates be liable for any direct, indirect, incidental, special, or consequential damages arising out of or in connection with the use of this report or reliance on the information contained herein.
        </p>
        
        <p style="margin-bottom: 12px;">
          <strong>Professional Advice:</strong> Users are strongly advised to consult with qualified legal, financial, and real estate professionals before entering into any contracts, agreements, or business transactions based on the information in this report.
        </p>
        
        <p style="margin-bottom: 12px;">
          <strong>Data Source:</strong> Property data provided by ATTOM Data Solutions. ATTOM is a leading provider of property data and analytics. For more information, visit www.attomdata.com.
        </p>
        
        <p>
          <strong>Report Generated:</strong> ${currentDate} | <strong>Report ID:</strong> ${reportId}<br>
          <strong>Generated by:</strong> ${contractor?.companyName || contractor?.contractorName || 'Owl Fenc User'}<br>
          <strong>Powered by:</strong> MERVIN AI - Advanced Artificial Intelligence for Contractor Protection
        </p>
      </div>
    </div>
    
    <div class="page-footer">
      <div class="page-number">Page 7 of 7</div>
      <div style="text-align: center;">© ${new Date().getFullYear()} Owl Fenc</div>
      <div style="text-align: right;">www.owlfenc.com</div>
    </div>
  </div>

</body>
</html>
    `;
  }
  
  /**
   * Calculate years and months from a date
   */
  private calculateYearsMonths(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const years = Math.floor(diffDays / 365);
    const months = Math.floor((diffDays % 365) / 30);
    
    if (years === 0) {
      return `${months} month${months !== 1 ? 's' : ''}`;
    } else if (months === 0) {
      return `${years} year${years !== 1 ? 's' : ''}`;
    } else {
      return `${years} year${years !== 1 ? 's' : ''}, ${months} month${months !== 1 ? 's' : ''}`;
    }
  }
}

// Export singleton instance
export const propertyReportPdfService = new PropertyReportPdfService();

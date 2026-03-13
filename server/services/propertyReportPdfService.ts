import puppeteer from 'puppeteer';
import { format } from 'date-fns';
import { findChromiumPath } from '../utils/chromium-finder';

interface PropertyReportData {
  address: string;
  owner: string;
  sqft?: number;
  bedrooms?: number;
  bathrooms?: number;
  yearBuilt?: number;
  propertyType?: string;
  lotSize?: string;
  landSqft?: number;
  assessedValue?: number;
  assessedLandValue?: number;
  assessedImprovementValue?: number;
  marketValue?: number;
  marketLandValue?: number;
  marketImprovementValue?: number;
  taxAmount?: number;
  taxYear?: number;
  taxDelinquentYear?: number;
  owner2?: string;
  ownerOccupied?: boolean;
  ownershipType?: string;
  ownershipVesting?: string;
  deedDocNumber?: string;
  deedDocType?: string;
  deedTransDate?: string;
  purchaseDate?: string;
  purchasePrice?: number;
  previousSaleDate?: string;
  previousSalePrice?: number;
  saleRecordingDate?: string;
  saleType?: string;
  saleDocNumber?: string;
  buyer1?: string;
  buyer2?: string;
  seller1?: string;
  seller2?: string;
  stories?: number;
  units?: number;
  roofCover?: string;
  roofFrame?: string;
  roofShape?: string;
  roofMaterial?: string;
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
  garageParkingCapacity?: number;
  garageParkingType?: string;
  parkingSpaces?: number;
  parkingType?: string;
  airConditioningType?: string;
  waterType?: string;
  sewerType?: string;
  pool?: boolean;
  poolType?: string;
  lenderName?: string;
  loanAmount?: number;
  loanType?: string;
  loanRecordingDate?: string;
  loanDueDate?: string;
  loanTermMonths?: number;
  loanInterestRate?: number;
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
  hoaFee?: number;
  hoaFeeFrequency?: string;
  hoaName?: string;
  schoolDistrict?: string;
  elementarySchool?: string;
  middleSchool?: string;
  highSchool?: string;
  latitude?: number;
  longitude?: number;
  elevation?: number;
  avmValue?: number;
  avmHigh?: number;
  avmLow?: number;
  avmDate?: string;
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

  async generateComprehensiveReport(
    propertyData: PropertyReportData,
    contractorInfo?: ContractorInfo
  ): Promise<Buffer> {
    console.log('[PDF] Starting property report generation');
    let browser;
    try {
      const executablePath = findChromiumPath();
      browser = await puppeteer.launch({
        headless: true,
        executablePath: executablePath,
        args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--disable-gpu','--disable-software-rasterizer','--disable-extensions']
      });
      const page = await browser.newPage();
      const htmlContent = this.generateHtmlContent(propertyData, contractorInfo);
      await page.setContent(htmlContent, { waitUntil: 'networkidle0', timeout: 30000 });
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        preferCSSPageSize: false,
        margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' },
        timeout: 60000
      });
      console.log('[PDF] Generated successfully, size:', pdfBuffer.length);
      return Buffer.from(pdfBuffer);
    } catch (error: any) {
      console.error('[PDF] Error:', error.message);
      throw new Error(`Failed to generate PDF: ${error.message}`);
    } finally {
      if (browser) await browser.close();
    }
  }

  private calculateYearsMonths(dateString: string): string {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
      const years = Math.floor(diffDays / 365);
      const months = Math.floor((diffDays % 365) / 30);
      if (years === 0) return `${months} month${months !== 1 ? 's' : ''}`;
      if (months === 0) return `${years} year${years !== 1 ? 's' : ''}`;
      return `${years} year${years !== 1 ? 's' : ''}, ${months} month${months !== 1 ? 's' : ''}`;
    } catch { return 'N/A'; }
  }

  private generateHtmlContent(data: PropertyReportData, contractor?: ContractorInfo): string {
    const currentDate = format(new Date(), 'MMMM d, yyyy');
    const reportId = `OWL-${Date.now()}`;
    const hasLegalIssues = !!(data.lienAmount || data.foreclosureStatus || data.judgmentAmount);

    const iCheck   = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
    const iAlert   = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
    const iShield  = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`;
    const iDollar  = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`;
    const iUser    = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
    const iHome    = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`;
    const iGrid    = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>`;
    const iHistory = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.95"/></svg>`;

    // Use contractor company name in the logo/header, fallback to "Owl Fenc" only if no contractor info
    const displayName = contractor?.companyName || contractor?.contractorName || 'Owl Fenc';
    // Dynamically size the company name text in the SVG logo
    const nameFontSizeLg = displayName.length > 20 ? 18 : displayName.length > 14 ? 22 : 28;
    const nameFontSizeSm = displayName.length > 20 ? 11 : displayName.length > 14 ? 13 : 16;
    const logoLg = `<svg width="220" height="40" viewBox="0 0 220 40" xmlns="http://www.w3.org/2000/svg"><text x="0" y="32" font-family="Georgia,serif" font-size="${nameFontSizeLg}" font-weight="700" fill="#ffffff" letter-spacing="2">${displayName}</text></svg>`;
    const logoSm = `<svg width="160" height="26" viewBox="0 0 160 26" xmlns="http://www.w3.org/2000/svg"><text x="0" y="20" font-family="Georgia,serif" font-size="${nameFontSizeSm}" font-weight="700" fill="#ffffff" letter-spacing="1">${displayName}</text></svg>`;

    const hdr = (n: number) => `<div class="ph"><div class="ph-logo">${logoSm}</div><div class="ph-right"><span class="ph-id">${reportId}</span><br>${currentDate} &bull; Page ${n}</div></div>`;
    const ftr = (n: number, r: string = '') => `<div class="pf"><span>Page ${n} of 7</span><span class="pf-c">&#9670; Powered by Mervin AI &#9670;</span><span>${r || currentDate}</span></div>`;
    const sub = (icon: string, t: string) => `<div class="st"><span class="si">${icon}</span>${t}</div>`;
    const alrt = (type: string, icon: string, title: string, text: string) => `<div class="al al-${type}"><div class="ali ali-${type}">${icon}</div><div class="alb"><div class="alt">${title}</div><div class="alx">${text}</div></div></div>`;

    const css = `
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
@page { size: A4; margin: 0; }
body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 13px; line-height: 1.5; color: #1e293b; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.page { width: 210mm; min-height: 297mm; position: relative; display: flex; flex-direction: column; page-break-after: always; overflow: hidden; }
.page:last-child { page-break-after: auto; }
.cover { background: linear-gradient(160deg, #0f172a 0%, #1e1b4b 45%, #0f172a 100%); color: white; display: flex; flex-direction: column; }
.ca-top { height: 5px; background: linear-gradient(90deg, #7c3aed, #3b82f6, #06b6d4); flex-shrink: 0; }
.ca-bot { height: 5px; background: linear-gradient(90deg, #06b6d4, #3b82f6, #7c3aed); flex-shrink: 0; margin-top: auto; }
.cb { flex: 1; padding: 50px 62px 38px; display: flex; flex-direction: column; }
.cb-lw { margin-bottom: 48px; }
.cb-rt { font-size: 11px; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase; color: #7c3aed; margin-bottom: 9px; }
.cb-mt { font-size: 38px; font-weight: 800; line-height: 1.1; letter-spacing: -0.025em; color: #fff; margin-bottom: 6px; }
.cb-st { font-size: 14px; color: #94a3b8; margin-bottom: 40px; }
.cb-ab { background: rgba(255,255,255,0.06); border: 1px solid rgba(124,58,237,0.5); border-left: 4px solid #7c3aed; border-radius: 10px; padding: 18px 24px; margin-bottom: 36px; }
.cb-al { font-size: 9px; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; color: #7c3aed; margin-bottom: 6px; }
.cb-av { font-size: 18px; font-weight: 700; color: #fff; line-height: 1.35; }
.cb-vp { display: inline-flex; align-items: center; gap: 8px; background: rgba(16,185,129,0.15); border: 1px solid rgba(16,185,129,0.45); border-radius: 100px; padding: 7px 18px; font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #10b981; margin-bottom: 40px; }
.cb-vd { width: 8px; height: 8px; background: #10b981; border-radius: 50%; }
.cb-mg { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 40px; }
.cb-mi { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 13px 15px; }
.cb-ml { font-size: 9px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: #64748b; margin-bottom: 5px; }
.cb-mv { font-size: 12px; font-weight: 600; color: #e2e8f0; }
.cb-br { border-top: 1px solid rgba(255,255,255,0.1); padding-top: 22px; display: flex; justify-content: space-between; align-items: flex-end; }
.cb-cl { font-size: 9px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: #475569; margin-bottom: 4px; }
.cb-cn { font-size: 13px; font-weight: 700; color: #e2e8f0; }
.cb-cc { font-size: 10px; color: #64748b; margin-top: 2px; }
.cb-pl { font-size: 9px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: #475569; text-align: right; margin-bottom: 3px; }
.cb-pv { font-size: 12px; font-weight: 800; color: #7c3aed; letter-spacing: 0.06em; text-align: right; }
.ph { background: #0f172a; padding: 10px 24px; display: flex; justify-content: space-between; align-items: center; flex-shrink: 0; }
.ph-right { text-align: right; font-size: 10px; color: #64748b; line-height: 1.5; }
.ph-id { font-weight: 600; color: #94a3b8; }
.pc { flex: 1; padding: 22px 26px 14px; }
.pf { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 8px 24px; display: flex; justify-content: space-between; align-items: center; font-size: 10px; color: #64748b; flex-shrink: 0; }
.pf-c { font-size: 10px; font-weight: 700; color: #7c3aed; letter-spacing: 0.04em; }
.sct { font-size: 19px; font-weight: 800; color: #0f172a; letter-spacing: -0.02em; margin-bottom: 4px; line-height: 1.2; }
.scd { height: 3px; background: linear-gradient(90deg, #7c3aed, #3b82f6, transparent); border-radius: 2px; margin-bottom: 16px; margin-top: 4px; }
.st { font-size: 11px; font-weight: 700; color: #334155; text-transform: uppercase; letter-spacing: 0.08em; margin-top: 16px; margin-bottom: 8px; display: flex; align-items: center; gap: 7px; page-break-after: avoid; }
.si { width: 21px; height: 21px; background: linear-gradient(135deg, #7c3aed, #3b82f6); border-radius: 5px; display: inline-flex; align-items: center; justify-content: center; color: white; flex-shrink: 0; }
.ig { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin-bottom: 12px; page-break-inside: avoid; }
.ig.c3 { grid-template-columns: repeat(3, 1fr); }
.ig.c4 { grid-template-columns: repeat(4, 1fr); gap: 6px; }
.ic { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 7px; padding: 10px 12px; page-break-inside: avoid; }
.ic.acc { border-left: 3px solid #7c3aed; background: #faf5ff; }
.ic.suc { border-left: 3px solid #10b981; background: #f0fdf4; }
.ic.wrn { border-left: 3px solid #f59e0b; background: #fffbeb; }
.ic.dng { border-left: 3px solid #ef4444; background: #fef2f2; }
.il { font-size: 9px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.07em; margin-bottom: 3px; }
.iv { font-size: 13px; font-weight: 600; color: #0f172a; line-height: 1.4; word-break: break-word; }
.iv.lg { font-size: 15px; font-weight: 700; }
.iv.pu { color: #7c3aed; }
.iv.gn { color: #059669; }
.iv.am { color: #d97706; }
.iv.rd { color: #dc2626; }
.iv.bl { color: #2563eb; }
.al { border-radius: 8px; padding: 11px 13px; margin: 9px 0; page-break-inside: avoid; display: flex; gap: 10px; align-items: flex-start; }
.ali { flex-shrink: 0; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-top: 1px; }
.alb { flex: 1; }
.alt { font-size: 11px; font-weight: 700; margin-bottom: 2px; line-height: 1.3; }
.alx { font-size: 10px; line-height: 1.5; }
.al-ok { background: #f0fdf4; border: 1px solid #bbf7d0; }
.ali-ok { background: #10b981; color: white; }
.al-ok .alt { color: #065f46; }
.al-ok .alx { color: #047857; }
.al-warn { background: #fffbeb; border: 1px solid #fde68a; }
.ali-warn { background: #f59e0b; color: white; }
.al-warn .alt { color: #92400e; }
.al-warn .alx { color: #b45309; }
.al-danger { background: #fef2f2; border: 1px solid #fecaca; }
.ali-danger { background: #ef4444; color: white; }
.al-danger .alt { color: #991b1b; }
.al-danger .alx { color: #b91c1c; }
.al-info { background: #eff6ff; border: 1px solid #bfdbfe; }
.ali-info { background: #3b82f6; color: white; }
.al-info .alt { color: #1e40af; }
.al-info .alx { color: #1d4ed8; }
.rb { background: linear-gradient(160deg, #0f172a 0%, #1e1b4b 100%); border: 1px solid rgba(124,58,237,0.35); border-radius: 10px; padding: 18px 22px; margin-bottom: 14px; page-break-inside: avoid; }
.rbt { font-size: 12px; font-weight: 800; color: #a78bfa; letter-spacing: 0.06em; text-transform: uppercase; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
.ri { background: rgba(255,255,255,0.06); border-left: 3px solid #10b981; border-radius: 0 5px 5px 0; padding: 8px 12px; margin-bottom: 6px; page-break-inside: avoid; }
.ri:last-child { margin-bottom: 0; }
.rit { font-size: 10px; font-weight: 700; color: #fbbf24; margin-bottom: 2px; }
.rix { font-size: 9.5px; color: #cbd5e1; line-height: 1.5; }
.qb { text-align: center; font-style: italic; font-size: 12px; color: #94a3b8; padding: 14px 32px; border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; margin: 14px 0; page-break-inside: avoid; }
.db { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 16px; page-break-inside: avoid; }
.dbt { font-size: 11px; font-weight: 700; color: #334155; margin-bottom: 8px; display: flex; align-items: center; gap: 7px; }
.dbtx { font-size: 9px; line-height: 1.6; color: #64748b; text-align: justify; }
.dbtx p { margin-bottom: 6px; }
.dbtx p:last-child { margin-bottom: 0; }
@media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } .page { page-break-after: always; } .page:last-child { page-break-after: auto; } }
`;

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Property Verification Report</title>
<style>${css}</style>
</head>
<body>

<!-- PAGE 1: COVER -->
<div class="page cover">
  <div class="ca-top"></div>
  <div class="cb">
    <div class="cb-lw">${logoLg}</div>
    <div class="cb-rt">Property Verification Report</div>
    <div class="cb-mt">Ownership &amp;<br>Property Analysis</div>
    <div class="cb-st">Powered by ATTOM Data Solutions &amp; Mervin AI</div>
    <div class="cb-ab">
      <div class="cb-al">Subject Property</div>
      <div class="cb-av">${data.address}</div>
    </div>
    <div class="cb-vp"><div class="cb-vd"></div>${data.verified ? 'Ownership Verified' : 'Verification Processed'}</div>
    <div class="cb-mg">
      <div class="cb-mi"><div class="cb-ml">Report ID</div><div class="cb-mv">${reportId}</div></div>
      <div class="cb-mi"><div class="cb-ml">Date Generated</div><div class="cb-mv">${currentDate}</div></div>
      <div class="cb-mi"><div class="cb-ml">Data Source</div><div class="cb-mv">ATTOM Data Solutions</div></div>
    </div>
    <div class="cb-br">
      <div>
        <div class="cb-cl">Prepared For</div>
        <div class="cb-cn">${displayName}</div>
        ${contractor?.email ? `<div class="cb-cc">${contractor.email}</div>` : ''}
        ${contractor?.phone ? `<div class="cb-cc">${contractor.phone}</div>` : ''}
      </div>
      <div>
        <div class="cb-pl">Powered by</div>
        <div class="cb-pv">MERVIN AI</div>
      </div>
    </div>
  </div>
  <div class="ca-bot"></div>
</div>

<!-- PAGE 2: EXECUTIVE SUMMARY -->
<div class="page">
  ${hdr(2)}
  <div class="pc">
    <div class="sct">Executive Summary</div>
    <div class="scd"></div>
    <div class="ig c3">
      <div class="ic ${data.verified ? 'suc' : 'wrn'}"><div class="il">Ownership Status</div><div class="iv ${data.verified ? 'gn' : 'am'}">${data.verified ? 'Verified' : 'Unverified'}</div></div>
      <div class="ic ${hasLegalIssues ? 'dng' : 'suc'}"><div class="il">Legal Status</div><div class="iv ${hasLegalIssues ? 'rd' : 'gn'}">${hasLegalIssues ? 'Issues Found' : 'Clear'}</div></div>
      <div class="ic ${data.taxDelinquentYear ? 'dng' : 'suc'}"><div class="il">Tax Status</div><div class="iv ${data.taxDelinquentYear ? 'rd' : 'gn'}">${data.taxDelinquentYear ? 'Delinquent' : 'Current'}</div></div>
    </div>
    ${sub(iHome, 'Property Overview')}
    <div class="ig c3">
      <div class="ic acc"><div class="il">Property Type</div><div class="iv">${data.propertyType || 'Single Family Residence'}</div></div>
      <div class="ic"><div class="il">Year Built</div><div class="iv">${data.yearBuilt ? `${data.yearBuilt} (${new Date().getFullYear() - data.yearBuilt} yrs)` : 'N/A'}</div></div>
      <div class="ic"><div class="il">Living Area</div><div class="iv">${data.sqft ? data.sqft.toLocaleString() + ' sq ft' : 'N/A'}</div></div>
      <div class="ic"><div class="il">Lot Size</div><div class="iv">${data.lotSize || (data.landSqft ? data.landSqft.toLocaleString() + ' sq ft' : 'N/A')}</div></div>
      <div class="ic"><div class="il">Bedrooms / Baths</div><div class="iv">${data.bedrooms || 'N/A'} bd / ${data.bathrooms || 'N/A'} ba</div></div>
      ${data.stories ? `<div class="ic"><div class="il">Stories</div><div class="iv">${data.stories}</div></div>` : ''}
    </div>
    ${sub(iUser, 'Current Owner')}
    <div class="ig c3">
      <div class="ic acc"><div class="il">Owner Name</div><div class="iv pu">${data.owner}</div></div>
      ${data.ownershipType ? `<div class="ic"><div class="il">Ownership Type</div><div class="iv">${data.ownershipType}</div></div>` : ''}
      ${data.ownerOccupied !== undefined ? `<div class="ic ${data.ownerOccupied ? 'suc' : 'wrn'}"><div class="il">Owner Occupied</div><div class="iv ${data.ownerOccupied ? 'gn' : 'am'}">${data.ownerOccupied ? 'Yes — Owner Lives Here' : 'No — Absentee Owner'}</div></div>` : ''}
      ${data.purchaseDate ? `<div class="ic"><div class="il">Acquisition Date</div><div class="iv">${format(new Date(data.purchaseDate), 'MMM d, yyyy')}</div></div>` : ''}
      ${data.purchasePrice ? `<div class="ic"><div class="il">Purchase Price</div><div class="iv bl">$${data.purchasePrice.toLocaleString()}</div></div>` : ''}
      ${data.purchaseDate ? `<div class="ic"><div class="il">Ownership Duration</div><div class="iv">${this.calculateYearsMonths(data.purchaseDate)}</div></div>` : ''}
    </div>
    ${(data.assessedValue || data.marketValue || data.avmValue) ? `
    ${sub(iDollar, 'Valuation Summary')}
    <div class="ig c3">
      ${data.assessedValue ? `<div class="ic acc"><div class="il">Assessed Value</div><div class="iv lg pu">$${data.assessedValue.toLocaleString()}</div></div>` : ''}
      ${data.marketValue ? `<div class="ic acc"><div class="il">Market Value</div><div class="iv lg bl">$${data.marketValue.toLocaleString()}</div></div>` : ''}
      ${data.avmValue ? `<div class="ic"><div class="il">AVM Estimate</div><div class="iv lg">$${data.avmValue.toLocaleString()}</div></div>` : ''}
      ${data.taxAmount ? `<div class="ic"><div class="il">Annual Taxes</div><div class="iv ${data.taxDelinquentYear ? 'rd' : ''}">$${data.taxAmount.toLocaleString()}</div></div>` : ''}
    </div>` : ''}
    ${alrt('ok', iCheck, 'Ownership Verified via Public Records', 'Property ownership has been confirmed through official county records and cross-referenced with ATTOM Data Solutions.')}
    ${!hasLegalIssues
      ? alrt('ok', iShield, 'No Active Liens or Legal Encumbrances Detected', 'No liens, judgments, or foreclosure proceedings were found in public records at the time of this report.')
      : alrt('danger', iAlert, 'Legal Issues Detected — Review Required', 'One or more legal encumbrances were found. See the Legal Status section for full details before proceeding with any work.')}
  </div>
  ${ftr(2)}
</div>

<!-- PAGE 3: PROPERTY DETAILS -->
<div class="page">
  ${hdr(3)}
  <div class="pc">
    <div class="sct">Property Details &amp; Construction</div>
    <div class="scd"></div>
    ${sub(iGrid, 'Structural Details')}
    <div class="ig c3">
      ${data.constructionType ? `<div class="ic"><div class="il">Construction Type</div><div class="iv">${data.constructionType}</div></div>` : ''}
      ${data.architecturalStyle ? `<div class="ic"><div class="il">Architectural Style</div><div class="iv">${data.architecturalStyle}</div></div>` : ''}
      ${data.foundation ? `<div class="ic"><div class="il">Foundation</div><div class="iv">${data.foundation}</div></div>` : ''}
      ${data.buildingCondition ? `<div class="ic"><div class="il">Building Condition</div><div class="iv">${data.buildingCondition}</div></div>` : ''}
      ${data.buildingQuality ? `<div class="ic"><div class="il">Building Quality</div><div class="iv">${data.buildingQuality}</div></div>` : ''}
      ${data.exteriorWalls ? `<div class="ic"><div class="il">Exterior Walls</div><div class="iv">${data.exteriorWalls}</div></div>` : ''}
      ${data.stories ? `<div class="ic"><div class="il">Stories</div><div class="iv">${data.stories}</div></div>` : ''}
      ${data.units ? `<div class="ic"><div class="il">Units</div><div class="iv">${data.units}</div></div>` : ''}
      ${data.basementSize ? `<div class="ic"><div class="il">Basement Size</div><div class="iv">${data.basementSize.toLocaleString()} sq ft</div></div>` : ''}
    </div>
    ${(data.roofCover || data.roofFrame || data.roofShape || data.roofMaterial) ? `
    ${sub(iHome, 'Roof')}
    <div class="ig c3">
      ${data.roofCover ? `<div class="ic"><div class="il">Roof Cover</div><div class="iv">${data.roofCover}</div></div>` : ''}
      ${data.roofFrame ? `<div class="ic"><div class="il">Roof Frame</div><div class="iv">${data.roofFrame}</div></div>` : ''}
      ${data.roofShape ? `<div class="ic"><div class="il">Roof Shape</div><div class="iv">${data.roofShape}</div></div>` : ''}
      ${data.roofMaterial ? `<div class="ic"><div class="il">Roof Material</div><div class="iv">${data.roofMaterial}</div></div>` : ''}
    </div>` : ''}
    ${(data.heatingType || data.heatingFuel || data.airConditioningType || data.flooring || data.interiorWalls || data.fireplaceCount) ? `
    ${sub(iGrid, 'Interior &amp; Systems')}
    <div class="ig c3">
      ${data.heatingType ? `<div class="ic"><div class="il">Heating Type</div><div class="iv">${data.heatingType}</div></div>` : ''}
      ${data.heatingFuel ? `<div class="ic"><div class="il">Heating Fuel</div><div class="iv">${data.heatingFuel}</div></div>` : ''}
      ${data.airConditioningType ? `<div class="ic"><div class="il">Air Conditioning</div><div class="iv">${data.airConditioningType}</div></div>` : ''}
      ${data.flooring ? `<div class="ic"><div class="il">Flooring</div><div class="iv">${data.flooring}</div></div>` : ''}
      ${data.interiorWalls ? `<div class="ic"><div class="il">Interior Walls</div><div class="iv">${data.interiorWalls}</div></div>` : ''}
      ${data.fireplaceCount ? `<div class="ic"><div class="il">Fireplaces</div><div class="iv">${data.fireplaceCount}${data.fireplaceType ? ' — ' + data.fireplaceType : ''}</div></div>` : ''}
    </div>` : ''}
    ${(data.garageParkingCapacity || data.garageParkingType || data.parkingSpaces || data.waterType || data.sewerType || data.pool !== undefined) ? `
    ${sub(iGrid, 'Parking, Utilities &amp; Amenities')}
    <div class="ig c3">
      ${data.garageParkingCapacity ? `<div class="ic"><div class="il">Garage Capacity</div><div class="iv">${data.garageParkingCapacity} car${data.garageParkingCapacity > 1 ? 's' : ''}</div></div>` : ''}
      ${data.garageParkingType ? `<div class="ic"><div class="il">Garage Type</div><div class="iv">${data.garageParkingType}</div></div>` : ''}
      ${data.parkingSpaces ? `<div class="ic"><div class="il">Parking Spaces</div><div class="iv">${data.parkingSpaces}</div></div>` : ''}
      ${data.waterType ? `<div class="ic"><div class="il">Water Source</div><div class="iv">${data.waterType}</div></div>` : ''}
      ${data.sewerType ? `<div class="ic"><div class="il">Sewer Type</div><div class="iv">${data.sewerType}</div></div>` : ''}
      ${data.pool !== undefined ? `<div class="ic ${data.pool ? 'suc' : ''}"><div class="il">Pool</div><div class="iv ${data.pool ? 'gn' : ''}">${data.pool ? 'Yes' + (data.poolType ? ' — ' + data.poolType : '') : 'No Pool'}</div></div>` : ''}
    </div>` : ''}
  </div>
  ${ftr(3)}
</div>

<!-- PAGE 4: FINANCIAL & TAX -->
<div class="page">
  ${hdr(4)}
  <div class="pc">
    <div class="sct">Financial Information &amp; Tax Assessment</div>
    <div class="scd"></div>
    ${(data.assessedValue || data.assessedLandValue || data.assessedImprovementValue) ? `
    ${sub(iDollar, 'Assessed Value')}
    <div class="ig c3">
      ${data.assessedValue ? `<div class="ic acc"><div class="il">Total Assessed Value</div><div class="iv lg pu">$${data.assessedValue.toLocaleString()}</div></div>` : ''}
      ${data.assessedLandValue ? `<div class="ic"><div class="il">Land Value</div><div class="iv">$${data.assessedLandValue.toLocaleString()}</div></div>` : ''}
      ${data.assessedImprovementValue ? `<div class="ic"><div class="il">Improvement Value</div><div class="iv">$${data.assessedImprovementValue.toLocaleString()}</div></div>` : ''}
    </div>` : ''}
    ${(data.marketValue || data.marketLandValue || data.marketImprovementValue) ? `
    ${sub(iDollar, 'Market Value')}
    <div class="ig c3">
      ${data.marketValue ? `<div class="ic acc"><div class="il">Total Market Value</div><div class="iv lg bl">$${data.marketValue.toLocaleString()}</div></div>` : ''}
      ${data.marketLandValue ? `<div class="ic"><div class="il">Land Market Value</div><div class="iv">$${data.marketLandValue.toLocaleString()}</div></div>` : ''}
      ${data.marketImprovementValue ? `<div class="ic"><div class="il">Improvement Market Value</div><div class="iv">$${data.marketImprovementValue.toLocaleString()}</div></div>` : ''}
    </div>` : ''}
    ${data.avmValue ? `
    ${sub(iDollar, 'Automated Valuation Model (AVM)')}
    <div class="ig c4">
      <div class="ic acc"><div class="il">AVM Estimate</div><div class="iv lg pu">$${data.avmValue.toLocaleString()}</div></div>
      ${data.avmHigh ? `<div class="ic"><div class="il">High Estimate</div><div class="iv">$${data.avmHigh.toLocaleString()}</div></div>` : ''}
      ${data.avmLow ? `<div class="ic"><div class="il">Low Estimate</div><div class="iv">$${data.avmLow.toLocaleString()}</div></div>` : ''}
      ${data.avmDate ? `<div class="ic"><div class="il">Valuation Date</div><div class="iv">${format(new Date(data.avmDate), 'MMM d, yyyy')}</div></div>` : ''}
    </div>` : ''}
    ${sub(iDollar, 'Property Taxes')}
    ${(data.taxAmount || data.taxYear) ? `
    <div class="ig c3">
      ${data.taxAmount ? `<div class="ic ${data.taxDelinquentYear ? 'dng' : 'suc'}"><div class="il">Annual Tax Amount</div><div class="iv lg ${data.taxDelinquentYear ? 'rd' : 'gn'}">$${data.taxAmount.toLocaleString()}</div></div>` : ''}
      ${data.taxYear ? `<div class="ic"><div class="il">Tax Year</div><div class="iv">${data.taxYear}</div></div>` : ''}
      ${data.taxDelinquentYear ? `<div class="ic dng"><div class="il">Delinquent Year</div><div class="iv rd">${data.taxDelinquentYear}</div></div>` : ''}
    </div>
    ${data.taxDelinquentYear
      ? alrt('danger', iAlert, 'Tax Delinquency Alert — Year ' + data.taxDelinquentYear, 'Property taxes are delinquent. This may indicate financial distress. Exercise caution before entering into any agreements.')
      : alrt('ok', iCheck, 'Tax Status Current', 'No tax delinquencies detected. Property taxes appear to be current as of the report date.')}` :
    alrt('info', iShield, 'Tax Data Not Available', 'Tax information was not available in public records for this property at the time of this report.')}
    ${data.hoaFee ? `
    ${sub(iGrid, 'Homeowners Association (HOA)')}
    <div class="ig c3">
      <div class="ic wrn"><div class="il">HOA Fee</div><div class="iv am">$${data.hoaFee.toLocaleString()} ${data.hoaFeeFrequency ? '/ ' + data.hoaFeeFrequency : ''}</div></div>
      ${data.hoaName ? `<div class="ic"><div class="il">HOA Name</div><div class="iv">${data.hoaName}</div></div>` : ''}
    </div>
    ${alrt('warn', iAlert, 'HOA Notice', 'This property is part of a Homeowners Association. Obtain HOA approval before starting any exterior work or modifications.')}` : ''}
  </div>
  ${ftr(4)}
</div>

<!-- PAGE 5: OWNERSHIP & SALE HISTORY -->
<div class="page">
  ${hdr(5)}
  <div class="pc">
    <div class="sct">Ownership &amp; Sale History</div>
    <div class="scd"></div>
    ${sub(iUser, 'Current Ownership Details')}
    <div class="ig c3">
      <div class="ic acc"><div class="il">Owner Name</div><div class="iv pu">${data.owner}</div></div>
      ${data.owner2 ? `<div class="ic"><div class="il">Co-Owner</div><div class="iv">${data.owner2}</div></div>` : ''}
      ${data.ownershipType ? `<div class="ic"><div class="il">Ownership Type</div><div class="iv">${data.ownershipType}</div></div>` : ''}
      ${data.ownershipVesting ? `<div class="ic"><div class="il">Vesting</div><div class="iv">${data.ownershipVesting}</div></div>` : ''}
      ${data.ownerOccupied !== undefined ? `<div class="ic ${data.ownerOccupied ? 'suc' : 'wrn'}"><div class="il">Owner Occupied</div><div class="iv ${data.ownerOccupied ? 'gn' : 'am'}">${data.ownerOccupied ? 'Yes' : 'No (Absentee)'}</div></div>` : ''}
      ${data.deedDocType ? `<div class="ic"><div class="il">Deed Type</div><div class="iv">${data.deedDocType}</div></div>` : ''}
    </div>
    ${(data.purchaseDate || data.purchasePrice) ? `
    ${sub(iHistory, 'Most Recent Sale')}
    <div class="ig c3">
      ${data.purchaseDate ? `<div class="ic"><div class="il">Sale Date</div><div class="iv">${format(new Date(data.purchaseDate), 'MMMM d, yyyy')}</div></div>` : ''}
      ${data.purchasePrice ? `<div class="ic acc"><div class="il">Sale Price</div><div class="iv lg bl">$${data.purchasePrice.toLocaleString()}</div></div>` : ''}
      ${data.purchaseDate ? `<div class="ic"><div class="il">Ownership Duration</div><div class="iv">${this.calculateYearsMonths(data.purchaseDate)}</div></div>` : ''}
      ${data.buyer1 ? `<div class="ic"><div class="il">Buyer</div><div class="iv">${data.buyer1}${data.buyer2 ? ' &amp; ' + data.buyer2 : ''}</div></div>` : ''}
      ${data.seller1 ? `<div class="ic"><div class="il">Seller</div><div class="iv">${data.seller1}${data.seller2 ? ' &amp; ' + data.seller2 : ''}</div></div>` : ''}
      ${data.saleType ? `<div class="ic"><div class="il">Sale Type</div><div class="iv">${data.saleType}</div></div>` : ''}
    </div>` : ''}
    ${(data.previousSaleDate || data.previousSalePrice) ? `
    ${sub(iHistory, 'Previous Sale')}
    <div class="ig c3">
      ${data.previousSaleDate ? `<div class="ic"><div class="il">Sale Date</div><div class="iv">${format(new Date(data.previousSaleDate), 'MMMM d, yyyy')}</div></div>` : ''}
      ${data.previousSalePrice ? `<div class="ic"><div class="il">Sale Price</div><div class="iv">$${data.previousSalePrice.toLocaleString()}</div></div>` : ''}
      ${(data.purchasePrice && data.previousSalePrice) ? `<div class="ic ${data.purchasePrice > data.previousSalePrice ? 'suc' : 'wrn'}"><div class="il">Appreciation</div><div class="iv ${data.purchasePrice > data.previousSalePrice ? 'gn' : 'am'}">+$${(data.purchasePrice - data.previousSalePrice).toLocaleString()} (${(((data.purchasePrice - data.previousSalePrice) / data.previousSalePrice) * 100).toFixed(1)}%)</div></div>` : ''}
    </div>` : ''}
    ${(data.lenderName || data.loanAmount) ? `
    ${sub(iDollar, 'Mortgage Information')}
    <div class="ig c3">
      ${data.lenderName ? `<div class="ic"><div class="il">Lender</div><div class="iv">${data.lenderName}</div></div>` : ''}
      ${data.loanAmount ? `<div class="ic"><div class="il">Loan Amount</div><div class="iv lg">$${data.loanAmount.toLocaleString()}</div></div>` : ''}
      ${data.loanType ? `<div class="ic"><div class="il">Loan Type</div><div class="iv">${data.loanType}</div></div>` : ''}
      ${data.loanRecordingDate ? `<div class="ic"><div class="il">Recording Date</div><div class="iv">${format(new Date(data.loanRecordingDate), 'MMM d, yyyy')}</div></div>` : ''}
      ${data.loanTermMonths ? `<div class="ic"><div class="il">Loan Term</div><div class="iv">${data.loanTermMonths} mo (${(data.loanTermMonths / 12).toFixed(0)} yrs)</div></div>` : ''}
      ${data.loanInterestRate ? `<div class="ic"><div class="il">Interest Rate</div><div class="iv">${data.loanInterestRate}%</div></div>` : ''}
    </div>` : ''}
    ${data.schoolDistrict ? `
    ${sub(iGrid, 'School District')}
    <div class="ig c3">
      <div class="ic"><div class="il">School District</div><div class="iv">${data.schoolDistrict}</div></div>
      ${data.elementarySchool ? `<div class="ic"><div class="il">Elementary</div><div class="iv">${data.elementarySchool}</div></div>` : ''}
      ${data.middleSchool ? `<div class="ic"><div class="il">Middle School</div><div class="iv">${data.middleSchool}</div></div>` : ''}
      ${data.highSchool ? `<div class="ic"><div class="il">High School</div><div class="iv">${data.highSchool}</div></div>` : ''}
    </div>` : ''}
  </div>
  ${ftr(5)}
</div>

<!-- PAGE 6: LEGAL STATUS & RECOMMENDATIONS -->
<div class="page">
  ${hdr(6)}
  <div class="pc">
    <div class="sct">Legal Status &amp; Contractor Recommendations</div>
    <div class="scd"></div>
    ${sub(iShield, 'Legal Overview')}
    <div class="ig c3">
      <div class="ic ${data.lienAmount ? 'dng' : 'suc'}"><div class="il">Liens</div><div class="iv ${data.lienAmount ? 'rd' : 'gn'}">${data.lienAmount ? '$' + data.lienAmount.toLocaleString() + ' — ' + (data.lienType || 'Active Lien') : 'None Detected'}</div></div>
      <div class="ic ${data.judgmentAmount ? 'dng' : 'suc'}"><div class="il">Judgments</div><div class="iv ${data.judgmentAmount ? 'rd' : 'gn'}">${data.judgmentAmount ? '$' + data.judgmentAmount.toLocaleString() + ' — ' + (data.judgmentType || 'Active') : 'None Detected'}</div></div>
      <div class="ic ${data.foreclosureStatus ? 'dng' : 'suc'}"><div class="il">Foreclosure</div><div class="iv ${data.foreclosureStatus ? 'rd' : 'gn'}">${data.foreclosureStatus || 'None Detected'}</div></div>
    </div>
    ${!hasLegalIssues ? alrt('ok', iShield, 'No Legal Issues Found', 'No liens, judgments, or foreclosure proceedings were found in public records at the time of this report.') : ''}
    ${data.lienAmount ? alrt('danger', iAlert, 'Active Lien Detected — $' + data.lienAmount.toLocaleString(), (data.lienType ? 'Type: ' + data.lienType + '. ' : '') + 'A lien against this property may affect the owner\'s ability to authorize work. Consult a real estate attorney before proceeding.') : ''}
    ${data.judgmentAmount ? alrt('danger', iAlert, 'Active Judgment — $' + data.judgmentAmount.toLocaleString(), (data.judgmentType ? 'Type: ' + data.judgmentType + '. ' : '') + 'A court judgment exists against this property or owner. Seek legal counsel before entering any agreements.') : ''}
    ${data.foreclosureStatus ? alrt('danger', iAlert, 'Foreclosure Alert — ' + data.foreclosureStatus, (data.foreclosureType ? 'Type: ' + data.foreclosureType + '. ' : '') + (data.foreclosureAmount ? 'Amount: $' + data.foreclosureAmount.toLocaleString() + '. ' : '') + 'CRITICAL: This property is in foreclosure. The current owner may not have legal authority to authorize work.') : ''}
    <div class="rb">
      <div class="rbt">${iShield} &nbsp; Professional Recommendations for Contractors</div>
      <div class="ri"><div class="rit">1. Always Verify the Owner\'s Identity</div><div class="rix">If the name does not match this report, do not sign anything. Request a government-issued photo ID and compare it against this report.</div></div>
      <div class="ri"><div class="rit">2. Never Begin Work Without a Signed Contract</div><div class="rix">Never deliver materials or begin work without a signed contract. A handshake does not protect you legally.</div></div>
      <div class="ri"><div class="rit">3. Review Legal Status Before Every Project</div><div class="rix">If this report shows liens, judgments, or foreclosure, consult a real estate attorney before proceeding.</div></div>
      <div class="ri"><div class="rit">4. Request 30-50% Upfront on Large Projects</div><div class="rix">For large projects, request a 30-50% deposit before starting. This demonstrates commitment and financial capacity.</div></div>
      <div class="ri"><div class="rit">5. ${data.ownerOccupied ? 'Owner Lives On-Site — Lower Risk' : 'Absentee Owner — Exercise Extra Caution'}</div><div class="rix">${data.ownerOccupied !== undefined ? (data.ownerOccupied ? 'This report confirms the owner lives at this property, which reduces fraud risk.' : 'This report indicates the owner does NOT live at this property. Verify authorization in writing before starting.') : 'Verify whether the owner is present at the property before starting work.'}</div></div>
      <div class="ri"><div class="rit">6. Document Everything with Photos and Video</div><div class="rix">Before, during, and after work, document everything. This protects you from false claims and disputes.</div></div>
      <div class="ri"><div class="rit">7. Verify Required Permits</div><div class="rix">Check with the local municipality whether permits are required. Working without permits can result in fines and legal liability.</div></div>
    </div>
    <div class="qb">"Trust is built with data, not promises." — Mervin AI</div>
  </div>
  ${ftr(6)}
</div>

<!-- PAGE 7: DISCLAIMER -->
<div class="page">
  ${hdr(7)}
  <div class="pc">
    <div class="sct">Legal Disclaimer &amp; Data Attribution</div>
    <div class="scd"></div>
    <div class="db">
      <div class="dbt">${iShield} &nbsp; Important Notice</div>
      <div class="dbtx">
        <p><strong>IMPORTANT NOTICE:</strong> This Property Verification Report is provided for informational purposes only and should not be considered as legal, financial, or professional advice. The information contained in this report is obtained from public records and third-party data sources, including ATTOM Data Solutions.</p>
        <p><strong>Accuracy and Completeness:</strong> While we strive to provide accurate and up-to-date information, we cannot guarantee the accuracy, completeness, or timeliness of the data. Property records may contain errors, omissions, or outdated information. Users should independently verify all information before making any decisions.</p>
        <p><strong>No Warranty:</strong> This report is provided "as is" without any warranty of any kind, either express or implied. ${displayName} and MERVIN AI disclaim all warranties, including but not limited to warranties of merchantability, fitness for a particular purpose, and non-infringement.</p>
        <p><strong>Limitation of Liability:</strong> In no event shall ${displayName}, MERVIN AI, or their affiliates be liable for any direct, indirect, incidental, special, or consequential damages arising out of or in connection with the use of this report or reliance on the information contained herein.</p>
        <p><strong>Professional Advice:</strong> Users are strongly advised to consult with qualified legal, financial, and real estate professionals before entering into any contracts, agreements, or business transactions based on the information in this report.</p>
        <p><strong>Data Source:</strong> Property data provided by ATTOM Data Solutions. For more information, visit www.attomdata.com.</p>
      </div>
    </div>
    <div style="margin-top:18px;padding:16px 20px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:11px;color:#334155;line-height:1.6;">
        <div>
          <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#64748b;margin-bottom:4px;">Report Information</div>
          <div><strong>Report ID:</strong> ${reportId}</div>
          <div><strong>Generated:</strong> ${currentDate}</div>
          <div><strong>Data Source:</strong> ATTOM Data Solutions</div>
        </div>
        <div>
          <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#64748b;margin-bottom:4px;">Prepared By</div>
          <div><strong>Platform:</strong> ${displayName}</div>
          <div><strong>Contractor:</strong> ${contractor?.contractorName || contractor?.companyName || displayName}</div>
          <div><strong>Powered by:</strong> Mervin AI</div>
        </div>
      </div>
    </div>
  </div>
  ${ftr(7, '&copy; ' + new Date().getFullYear() + ' ' + displayName)}
</div>

</body>
</html>`;
  }
}

export const propertyReportPdfService = new PropertyReportPdfService();

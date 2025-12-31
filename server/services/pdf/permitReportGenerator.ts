// Helper function to safely handle undefined values
function safeValue(value: any, fallback: string = "Not specified"): string {
  if (
    value === null ||
    value === undefined ||
    value === "undefined" ||
    value === ""
  ) {
    return fallback;
  }
  return String(value);
}

// Helper function to check if a value is valid (not undefined/null/empty)
function isValidValue(value: any): boolean {
  return (
    value !== null &&
    value !== undefined &&
    value !== "undefined" &&
    value !== ""
  );
}

export interface CompanyInfo {
  company: string;
  ownerName: string;
  email: string;
  phone: string;
  mobilePhone?: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  license: string;
  website?: string;
  logo?: string;
}

// Helper function for file size formatting
function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export interface BuildingCodeSection {
  section?: string;
  title?: string;
  description?: string;
  summary?: string;
  details?: string | any[] | any;
  requirements?: any[];
  specifications?: any[] | string;
  codeReference?: string;
  codeDetails?: string;
  measurements?: any[] | string;
  installation?: any[] | string;
  materials?: any[] | string;
  complianceNotes?: string;
  violations?: string;
  [key: string]: any; // For dynamic fields from enhanced permit service
}

interface PermitData {
  meta?: {
    projectType: string;
    location: string;
    timestamp: string;
  };
  requiredPermits?: Array<{
    name: string;
    issuingAuthority: string;
    description?: string;
    estimatedTimeline?: string;
    averageCost?: string;
    responsibleParty?: string;
    requiredDocuments?: string[] | string;
    applicationFormUrl?: string;
    website?: string;
    contactPhone?: string;
    submissionMethod?: string;
    requirements?: string;
  }>;
  contactInformation?: Array<{
    department: string;
    phone?: string;
    email?: string;
    address?: string;
    hours?: string;
    website?: string;
  }>;
  buildingCodes?: BuildingCodeSection[];
  process?: any[];
  specialConsiderations?: any[];
  contactInfo?: {
    department?: string;
    phone?: string;
    email?: string;
    address?: string;
    hours?: string;
    website?: string;
    inspector?: string;
    inspectorPhone?: string;
    inspectorEmail?: string;
    onlinePortal?: string;
    emergencyContact?: string;
    schedulingPhone?: string;
  };
  attachedFiles?: Array<{
    id: string;
    name: string;
    size: number;
    type: string;
    uploadDate?: string;
  }>;
  clientInfo?: {
    name?: string;
    address?: string;
    phone?: string;
    email?: string;
    projectType?: string;
  };
  projectDescription?: string;
}

export function generatePermitReportHTML(
  permitData: PermitData,
  companyInfo: CompanyInfo
): string {
  const currentDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const reportId = `RPT-${Date.now().toString().slice(-8)}`;

  // Professional SVG Icons with xmlns for Puppeteer/PDF compatibility
  const icons = {
    chart: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>`,
    building: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18M9 8h1M9 12h1M9 16h1M14 8h1M14 12h1M14 16h1M5 21V5a2 2 0 012-2h10a2 2 0 012 2v16"/></svg>`,
    phone: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/></svg>`,
    email: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>`,
    location: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>`,
    clock: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
    globe: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>`,
    alert: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    file: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`,
    book: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>`,
    refresh: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>`,
    users: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>`,
    clipboard: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>`,
    check: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>`,
    shield: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
    hardhat: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 18a1 1 0 001 1h18a1 1 0 001-1v-2a1 1 0 00-1-1H3a1 1 0 00-1 1v2z"/><path d="M10 15V6.5a2.5 2.5 0 015 0V15"/><path d="M4 15v-3a8 8 0 0116 0v3"/></svg>`,
    calendar: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
    computer: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>`,
    emergency: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
  };

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Permit Analysis Report - ${permitData.meta?.projectType || 'Construction Project'}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: Georgia, 'Times New Roman', 'Liberation Serif', 'DejaVu Serif', 'Nimbus Roman', serif;
            line-height: 1.7;
            color: #1a1a2e;
            background: #ffffff;
            font-size: 11pt;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            color-adjust: exact;
        }

        /* PDF-specific optimizations */
        @media print {
            body { font-size: 10pt; }
            .page-break { page-break-before: always; }
            .no-break { page-break-inside: avoid; }
            .header, .executive-summary, .content-section { 
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
        }

        .report-container {
            max-width: 210mm;
            margin: 0 auto;
            background: white;
        }

        /* Executive Header */
        .header {
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
            color: white;
            padding: 48px 40px;
            position: relative;
        }

        .header::after {
            content: '';
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            height: 4px;
            background: linear-gradient(90deg, #c9a227, #d4af37, #c9a227);
        }

        .header-content {
            position: relative;
            z-index: 2;
        }

        .company-logo {
            width: 56px;
            height: 56px;
            border-radius: 6px;
            margin-bottom: 24px;
            object-fit: cover;
            border: 2px solid rgba(201,162,39,0.5);
        }

        .report-title {
            font-family: Georgia, 'Times New Roman', 'Liberation Serif', 'DejaVu Serif', serif;
            font-size: 32px;
            font-weight: 700;
            margin-bottom: 8px;
            letter-spacing: -0.5px;
            color: #ffffff;
        }

        .report-subtitle {
            font-family: Arial, Helvetica, sans-serif;
            font-size: 14px;
            font-weight: 400;
            color: #c9a227;
            text-transform: uppercase;
            letter-spacing: 2px;
        }

        .report-meta {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 24px;
            margin-top: 32px;
            padding-top: 24px;
            border-top: 1px solid rgba(201,162,39,0.3);
        }

        .meta-item {
            font-family: Arial, Helvetica, sans-serif;
            font-size: 12px;
        }

        .meta-item strong {
            display: block;
            color: #c9a227;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 4px;
        }

        .meta-item span {
            color: #e8e8e8;
            font-size: 13px;
        }

        /* Executive Summary */
        .executive-summary {
            padding: 40px;
            background: #fafbfc;
            border-bottom: 1px solid #e5e7eb;
            page-break-inside: avoid;
        }

        .section-title {
            font-family: Georgia, serif;
            font-size: 22px;
            font-weight: 600;
            color: #1a1a2e;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            gap: 14px;
            padding-bottom: 12px;
            border-bottom: 2px solid #1a1a2e;
        }

        .section-icon {
            width: 36px;
            height: 36px;
            background: linear-gradient(135deg, #1a1a2e, #0f3460);
            border-radius: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #c9a227;
        }
        
        .section-icon svg {
            stroke: #c9a227;
        }

        .summary-stats {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 20px;
            margin-top: 24px;
        }

        .stat-card {
            background: white;
            padding: 24px 20px;
            border-radius: 8px;
            border: 1px solid #e5e7eb;
            text-align: center;
            box-shadow: 0 1px 3px rgba(0,0,0,0.08);
        }

        .stat-number {
            font-family: Georgia, serif;
            font-size: 36px;
            font-weight: 700;
            color: #1a1a2e;
            line-height: 1;
        }

        .stat-label {
            font-family: Arial, Helvetica, sans-serif;
            font-size: 11px;
            color: #6b7280;
            font-weight: 600;
            margin-top: 8px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        /* Content Sections */
        .content-section {
            padding: 40px;
            border-bottom: 1px solid #e5e7eb;
            page-break-inside: avoid;
        }

        .content-section:last-child {
            border-bottom: none;
        }

        /* Permits Section */
        .permit-card {
            background: #ffffff;
            border: 1px solid #d1d5db;
            border-left: 4px solid #1a1a2e;
            padding: 24px;
            margin-bottom: 20px;
            page-break-inside: avoid;
        }

        .permit-header {
            margin-bottom: 20px;
            padding-bottom: 16px;
            border-bottom: 1px solid #e5e7eb;
        }

        .permit-name {
            font-family: Georgia, serif;
            font-size: 18px;
            font-weight: 600;
            color: #1a1a2e;
            margin-bottom: 4px;
        }

        .permit-authority {
            font-family: Arial, Helvetica, sans-serif;
            font-size: 13px;
            color: #6b7280;
            font-weight: 500;
        }

        .permit-details {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 16px;
            margin-bottom: 16px;
        }

        .detail-item {
            background: #f9fafb;
            padding: 14px 16px;
            border-left: 3px solid #c9a227;
        }

        .detail-label {
            font-family: Arial, Helvetica, sans-serif;
            font-size: 10px;
            font-weight: 700;
            color: #6b7280;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 4px;
        }

        .detail-value {
            font-family: Georgia, serif;
            font-size: 13px;
            color: #1a1a2e;
            font-weight: 500;
        }

        .documents-list {
            background: #fffbeb;
            border: 1px solid #fcd34d;
            border-left: 4px solid #c9a227;
            padding: 16px 20px;
            margin-top: 16px;
        }

        .documents-title {
            font-family: Arial, Helvetica, sans-serif;
            font-size: 12px;
            font-weight: 700;
            color: #92400e;
            margin-bottom: 10px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .documents-list ul {
            list-style: none;
            padding: 0;
            margin: 0;
        }

        .documents-list li {
            padding: 6px 0;
            font-size: 13px;
            color: #78350f;
            position: relative;
            padding-left: 20px;
            border-bottom: 1px solid rgba(252,211,77,0.3);
        }
        
        .documents-list li:last-child {
            border-bottom: none;
        }

        .documents-list li::before {
            content: "\\2022";
            position: absolute;
            left: 6px;
            color: #c9a227;
            font-weight: bold;
        }

        /* Contacts Section */
        .contacts-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 20px;
        }

        .contact-card {
            background: #f9fafb;
            border: 1px solid #d1d5db;
            border-top: 3px solid #1a1a2e;
            padding: 24px;
        }

        .contact-name {
            font-family: Georgia, serif;
            font-size: 16px;
            font-weight: 600;
            color: #1a1a2e;
            margin-bottom: 16px;
            padding-bottom: 12px;
            border-bottom: 1px solid #e5e7eb;
        }

        .contact-item {
            display: flex;
            align-items: flex-start;
            gap: 12px;
            margin-bottom: 12px;
            font-size: 13px;
        }

        .contact-icon {
            width: 18px;
            height: 18px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #1a1a2e;
            flex-shrink: 0;
            margin-top: 2px;
        }
        
        .contact-icon svg {
            stroke: #1a1a2e;
        }

        /* Building Codes Section */
        .codes-grid {
            display: grid;
            gap: 16px;
        }

        .code-card {
            background: #ffffff;
            border: 1px solid #d1d5db;
            border-left: 4px solid #059669;
            padding: 20px 24px;
        }

        .code-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
        }

        .code-title {
            font-family: Georgia, serif;
            font-size: 15px;
            font-weight: 600;
            color: #1a1a2e;
        }

        .code-badge {
            font-family: Arial, Helvetica, sans-serif;
            background: #059669;
            color: white;
            padding: 4px 10px;
            font-size: 10px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .code-description {
            font-size: 13px;
            color: #374151;
            margin-bottom: 12px;
            line-height: 1.6;
        }

        .compliance-note {
            background: #ecfdf5;
            border-left: 3px solid #059669;
            padding: 10px 14px;
            font-family: Arial, Helvetica, sans-serif;
            font-size: 12px;
            color: #065f46;
            font-weight: 500;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .compliance-note svg {
            stroke: #059669;
        }

        /* Client & Project Information Styles */
        .client-info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 20px;
        }

        .client-card, .project-description-card {
            background: linear-gradient(135deg, #f0f9ff 0%, #e0f7fa 100%);
            border: 2px solid #0891b2;
            border-radius: 12px;
            padding: 20px;
        }

        .client-section-title {
            font-size: 18px;
            font-weight: 700;
            color: #0c4a6e;
            margin-bottom: 16px;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .client-details {
            display: grid;
            gap: 12px;
        }

        .client-detail-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 0;
            border-bottom: 1px solid #e0f7fa;
        }

        .client-detail-label {
            font-size: 14px;
            font-weight: 600;
            color: #0369a1;
        }

        .client-detail-value {
            font-size: 14px;
            color: #164e63;
            font-weight: 500;
        }

        .project-description-content {
            background: #f8fafc;
            border-radius: 8px;
            padding: 16px;
            border-left: 4px solid #0891b2;
        }

        .project-description-content p {
            font-size: 14px;
            line-height: 1.6;
            color: #374151;
            margin: 0;
        }

        /* Process Information Styles */
        .process-timeline {
            display: grid;
            gap: 16px;
        }

        .process-step {
            background: linear-gradient(135deg, #f0f9ff 0%, #dbeafe 100%);
            border: 1px solid #3b82f6;
            border-radius: 12px;
            padding: 20px;
        }

        .process-step-header {
            display: flex;
            align-items: center;
            gap: 16px;
            margin-bottom: 12px;
        }

        .process-step-number {
            width: 32px;
            height: 32px;
            background: #3b82f6;
            color: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
            font-size: 14px;
        }

        .process-step-title {
            font-size: 16px;
            font-weight: 600;
            color: #1e40af;
            margin: 0;
        }

        .process-step-content {
            padding-left: 48px;
        }

        .process-step-content p {
            font-size: 14px;
            line-height: 1.6;
            color: #374151;
            margin-bottom: 8px;
        }

        .process-timeline-info, .process-requirements {
            background: rgba(59, 130, 246, 0.1);
            border-radius: 6px;
            padding: 8px 12px;
            margin-top: 8px;
            font-size: 13px;
            color: #1e40af;
        }

        /* Enhanced Contact Information Styles */
        .enhanced-contact-grid {
            display: grid;
            gap: 20px;
        }

        .enhanced-contact-card {
            background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
            border: 2px solid #6b7280;
            border-radius: 12px;
            padding: 24px;
        }

        .contact-section-title {
            font-size: 20px;
            font-weight: 700;
            color: #374151;
            margin-bottom: 20px;
            text-align: center;
        }

        .contact-details-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 16px;
            margin-bottom: 20px;
        }

        .contact-detail-item {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px;
            background: white;
            border-radius: 8px;
            border: 1px solid #d1d5db;
        }

        .contact-detail-icon {
            font-size: 20px;
            width: 32px;
            text-align: center;
        }

        .contact-detail-label {
            font-size: 12px;
            font-weight: 600;
            color: #6b7280;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .contact-detail-value {
            font-size: 14px;
            font-weight: 500;
            color: #374151;
        }

        .inspector-section, .portal-section {
            background: #f9fafb;
            border: 1px solid #d1d5db;
            border-radius: 8px;
            padding: 16px;
            margin-top: 16px;
        }

        .inspector-title, .portal-title {
            font-size: 16px;
            font-weight: 600;
            color: #374151;
            margin-bottom: 12px;
        }

        .inspector-details {
            display: grid;
            gap: 8px;
        }

        .inspector-detail {
            font-size: 14px;
            color: #4b5563;
        }

        .portal-link {
            font-size: 14px;
            color: #2563eb;
            font-weight: 500;
            word-break: break-all;
        }

        .additional-contacts {
            background: #f3f4f6;
            border-radius: 8px;
            padding: 16px;
            margin-top: 16px;
        }

        .additional-contact-item {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 8px 0;
            border-bottom: 1px solid #e5e7eb;
        }

        .additional-contact-item:last-child {
            border-bottom: none;
        }

        /* Special Considerations Styles */
        .considerations-container {
            display: grid;
            gap: 16px;
        }

        .consideration-card {
            background: #ffffff;
            border: 1px solid #fbbf24;
            border-left: 4px solid #dc2626;
            padding: 20px 24px;
        }

        .consideration-header {
            display: flex;
            align-items: center;
            gap: 14px;
            margin-bottom: 16px;
            padding-bottom: 12px;
            border-bottom: 1px solid #fef3c7;
        }

        .consideration-icon {
            width: 32px;
            height: 32px;
            background: #fef2f2;
            border: 1px solid #fecaca;
            border-radius: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .consideration-icon svg {
            stroke: #dc2626;
        }

        .consideration-title {
            font-family: Georgia, serif;
            font-size: 15px;
            font-weight: 600;
            color: #1a1a2e;
            margin: 0;
        }

        .consideration-content {
            padding: 0;
        }

        .consideration-category {
            font-family: Arial, Helvetica, sans-serif;
            font-size: 11px;
            font-weight: 700;
            color: #dc2626;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 8px;
        }

        .consideration-requirement {
            font-size: 14px;
            line-height: 1.6;
            color: #1a1a2e;
            margin-bottom: 10px;
        }

        .consideration-spec {
            font-family: Arial, Helvetica, sans-serif;
            font-size: 12px;
            color: #6b7280;
            background: #f9fafb;
            padding: 10px 14px;
            border-left: 3px solid #9ca3af;
            font-style: italic;
        }

        /* Attached Files Styles */
        .attached-files-container {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 16px;
        }

        .attached-file-item {
            background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
            border: 1px solid #cbd5e1;
            border-radius: 12px;
            padding: 16px;
            display: flex;
            align-items: center;
            gap: 16px;
        }

        .file-icon-container {
            width: 48px;
            height: 48px;
            background: #e2e8f0;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
        }

        .file-details {
            flex: 1;
        }

        .file-name {
            font-size: 14px;
            font-weight: 600;
            color: #334155;
            margin-bottom: 4px;
            word-break: break-all;
        }

        .file-meta {
            display: flex;
            gap: 12px;
            font-size: 12px;
            color: #64748b;
        }

        .file-size, .file-date {
            background: #e2e8f0;
            padding: 2px 6px;
            border-radius: 4px;
        }

        /* Footer */
        .footer {
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            color: white;
            padding: 40px;
        }

        .footer-content {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 32px;
            margin-bottom: 24px;
        }

        .footer-section h4 {
            font-family: Arial, Helvetica, sans-serif;
            font-size: 10px;
            font-weight: 700;
            margin-bottom: 8px;
            color: #c9a227;
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        .footer-section p {
            font-family: Georgia, serif;
            font-size: 13px;
            color: #e8e8e8;
            line-height: 1.5;
        }

        .footer-divider {
            height: 1px;
            background: linear-gradient(to right, transparent, rgba(201,162,39,0.5), transparent);
            margin: 24px 0;
        }

        .footer-bottom {
            font-family: Arial, Helvetica, sans-serif;
            font-size: 10px;
            color: #9ca3af;
            text-align: center;
            letter-spacing: 0.5px;
        }

        /* Print Styles */
        @media print {
            body {
                font-size: 12px;
            }

            .report-container {
                box-shadow: none;
                max-width: none;
            }

            .permit-card, .contact-card, .code-card {
                break-inside: avoid;
                page-break-inside: avoid;
            }

            .content-section {
                break-inside: avoid;
                page-break-inside: avoid;
            }
        }

        /* Responsive */
        @media (max-width: 768px) {
            .header, .content-section {
                padding: 20px;
            }

            .summary-stats {
                grid-template-columns: repeat(2, 1fr);
            }

            .contacts-grid {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="report-container">
        <!-- Header -->
        <div class="header">
            <div class="header-content">
                ${companyInfo.logo ? `<img src="${companyInfo.logo}" alt="Company Logo" class="company-logo">` : ""}
                <h1 class="report-title">Permit Analysis Report</h1>
                <p class="report-subtitle">Comprehensive Construction Permit Assessment</p>
                <div class="report-meta">
                    <div class="meta-item">
                        <strong>Project</strong>
                        <span>${permitData.meta?.projectType || "Construction Project"}</span>
                    </div>
                    <div class="meta-item">
                        <strong>Location</strong>
                        <span>${permitData.meta?.location || "Project Location"}</span>
                    </div>
                    <div class="meta-item">
                        <strong>Report ID</strong>
                        <span>${reportId}</span>
                    </div>
                    <div class="meta-item">
                        <strong>Date</strong>
                        <span>${currentDate}</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- Client & Project Information Section -->
        ${
          permitData.clientInfo || permitData.projectDescription
            ? `
        <div class="content-section no-break">
            <h2 class="section-title">
                <div class="section-icon">${icons.users}</div>
                Project & Client Information
            </h2>
            <div class="client-info-grid">
                ${
                  permitData.clientInfo
                    ? `
                    <div class="client-card no-break">
                        <h3 class="client-section-title">Client Information</h3>
                        <div class="client-details">
                            ${
                              permitData.clientInfo.name
                                ? `
                                <div class="client-detail-item">
                                    <div class="client-detail-label">Client Name</div>
                                    <div class="client-detail-value">${permitData.clientInfo.name}</div>
                                </div>
                            `
                                : ""
                            }
                            ${
                              permitData.clientInfo.address
                                ? `
                                <div class="client-detail-item">
                                    <div class="client-detail-label">Project Address</div>
                                    <div class="client-detail-value">${permitData.clientInfo.address}</div>
                                </div>
                            `
                                : ""
                            }
                            ${
                              permitData.clientInfo.phone
                                ? `
                                <div class="client-detail-item">
                                    <div class="client-detail-label">Phone</div>
                                    <div class="client-detail-value">${permitData.clientInfo.phone}</div>
                                </div>
                            `
                                : ""
                            }
                            ${
                              permitData.clientInfo.email
                                ? `
                                <div class="client-detail-item">
                                    <div class="client-detail-label">Email</div>
                                    <div class="client-detail-value">${permitData.clientInfo.email}</div>
                                </div>
                            `
                                : ""
                            }
                            ${
                              permitData.clientInfo.projectType
                                ? `
                                <div class="client-detail-item">
                                    <div class="client-detail-label">Project Type</div>
                                    <div class="client-detail-value">${permitData.clientInfo.projectType}</div>
                                </div>
                            `
                                : ""
                            }
                        </div>
                    </div>
                `
                    : ""
                }
                ${
                  permitData.projectDescription
                    ? `
                    <div class="project-description-card no-break">
                        <h3 class="client-section-title">Project Description</h3>
                        <div class="project-description-content">
                            <p>${permitData.projectDescription}</p>
                        </div>
                    </div>
                `
                    : ""
                }
            </div>
        </div>
        `
            : ""
        }

        <!-- Executive Summary -->
        <div class="executive-summary no-break">
            <h2 class="section-title">
                <div class="section-icon">${icons.chart}</div>
                Executive Summary
            </h2>
            <p style="margin-bottom: 20px; font-size: 16px; color: #475569;">
                This comprehensive permit analysis report provides detailed information about the required permits, 
                building codes, contact information, and compliance requirements for your construction project.
            </p>
            <div class="summary-stats">
                <div class="stat-card no-break">
                    <div class="stat-number">${permitData.requiredPermits?.length || 0}</div>
                    <div class="stat-label">Required Permits</div>
                </div>
                <div class="stat-card no-break">
                    <div class="stat-number">${permitData.contactInformation?.length || 0}</div>
                    <div class="stat-label">Department Contacts</div>
                </div>
                <div class="stat-card no-break">
                    <div class="stat-number">${permitData.buildingCodes?.length || 0}</div>
                    <div class="stat-label">Building Code Sections</div>
                </div>
                <div class="stat-card no-break">
                    <div class="stat-number">${permitData.attachedFiles?.length || 0}</div>
                    <div class="stat-label">Attached Files</div>
                </div>
            </div>
        </div>

        <!-- Required Permits Section -->
        <div class="content-section no-break">
            <h2 class="section-title">
                <div class="section-icon">${icons.building}</div>
                Required Permits
            </h2>
            ${
              permitData.requiredPermits &&
              permitData.requiredPermits.length > 0
                ? permitData.requiredPermits
                    .map(
                      (permit) => `
                    <div class="permit-card no-break">
                        <div class="permit-header">
                            <div>
                                <h3 class="permit-name">${safeValue(permit.name, "Permit Required")}</h3>
                                <p class="permit-authority">${safeValue(permit.issuingAuthority, "Local Building Department")}</p>
                            </div>
                        </div>

                        ${isValidValue(permit.description) ? `<p style="margin-bottom: 16px; color: #64748b;">${safeValue(permit.description)}</p>` : ""}

                        <div class="permit-details">
                            <div class="detail-item">
                                <div class="detail-label">Timeline</div>
                                <div class="detail-value">${safeValue(permit.estimatedTimeline, "Contact department for timeline")}</div>
                            </div>
                            <div class="detail-item">
                                <div class="detail-label">Estimated Cost</div>
                                <div class="detail-value">${safeValue(permit.averageCost, "Contact department for fees")}</div>
                            </div>
                            <div class="detail-item">
                                <div class="detail-label">Responsible Party</div>
                                <div class="detail-value">${safeValue(permit.responsibleParty, "Property owner or contractor")}</div>
                            </div>
                            <div class="detail-item">
                                <div class="detail-label">Submission Method</div>
                                <div class="detail-value">${safeValue(permit.submissionMethod, "In-person or online")}</div>
                            </div>
                        </div>

                        ${
                          isValidValue(permit.requiredDocuments)
                            ? `
                            <div class="documents-list">
                                <div class="documents-title">${icons.clipboard} Required Documents</div>
                                <ul>
                                    ${
                                      Array.isArray(permit.requiredDocuments)
                                        ? permit.requiredDocuments
                                            .filter((doc) => isValidValue(doc))
                                            .map(
                                              (doc) =>
                                                `<li>${safeValue(doc)}</li>`
                                            )
                                            .join("")
                                        : `<li>${safeValue(permit.requiredDocuments)}</li>`
                                    }
                                </ul>
                            </div>
                        `
                            : ""
                        }

                        ${
                          isValidValue(permit.requirements)
                            ? `
                            <div style="margin-top: 16px; padding: 12px; background: #f1f5f9; border-radius: 8px; border-left: 3px solid #667eea;">
                                <strong style="color: #334155; font-size: 14px;">Additional Requirements:</strong>
                                <p style="margin-top: 4px; color: #475569; font-size: 13px;">${safeValue(permit.requirements)}</p>
                            </div>
                        `
                            : ""
                        }
                    </div>
                `
                    )
                    .join("")
                : '<p style="text-align: center; padding: 40px; color: #64748b;">No specific permits required for this project type.</p>'
            }
        </div>

        <!-- Department Contacts Section -->
        <div class="content-section">
            <h2 class="section-title">
                <div class="section-icon">${icons.phone}</div>
                Department Contacts
            </h2>
            <div class="contacts-grid">
                ${
                  permitData.contactInformation &&
                  permitData.contactInformation.length > 0
                    ? permitData.contactInformation
                        .map(
                          (contact) => `
                        <div class="contact-card">
                            <h3 class="contact-name">${contact.department}</h3>
                            ${
                              isValidValue(contact.phone)
                                ? `
                                <div class="contact-item">
                                    <div class="contact-icon">${icons.phone}</div>
                                    <span>${safeValue(contact.phone)}</span>
                                </div>
                            `
                                : ""
                            }
                            ${
                              isValidValue(contact.email)
                                ? `
                                <div class="contact-item">
                                    <div class="contact-icon">${icons.email}</div>
                                    <span>${safeValue(contact.email)}</span>
                                </div>
                            `
                                : ""
                            }
                            ${
                              isValidValue(contact.address)
                                ? `
                                <div class="contact-item">
                                    <div class="contact-icon">${icons.location}</div>
                                    <span>${safeValue(contact.address)}</span>
                                </div>
                            `
                                : ""
                            }
                            ${
                              contact.hours
                                ? `
                                <div class="contact-item">
                                    <div class="contact-icon">${icons.clock}</div>
                                    <span>${contact.hours}</span>
                                </div>
                            `
                                : ""
                            }
                        </div>
                    `
                        )
                        .join("")
                    : permitData.requiredPermits
                      ? permitData.requiredPermits
                          .filter(
                            (permit) => permit.contactPhone || permit.website
                          )
                          .map(
                            (permit) => `
                            <div class="contact-card">
                                <h3 class="contact-name">${permit.issuingAuthority}</h3>
                                ${
                                  isValidValue(permit.contactPhone)
                                    ? `
                                    <div class="contact-item">
                                        <div class="contact-icon">${icons.phone}</div>
                                        <span>${safeValue(permit.contactPhone)}</span>
                                    </div>
                                `
                                    : ""
                                }
                                ${
                                  permit.website
                                    ? `
                                    <div class="contact-item">
                                        <div class="contact-icon">${icons.globe}</div>
                                        <span>${permit.website}</span>
                                    </div>
                                `
                                    : ""
                                }
                            </div>
                        `
                          )
                          .join("")
                      : '<p style="text-align: center; padding: 40px; color: #64748b;">Contact information will be populated automatically.</p>'
                }
            </div>
        </div>

        <!-- Process Information Section -->
        ${
          permitData.process &&
          Array.isArray(permitData.process) &&
          permitData.process.length > 0
            ? `
        <div class="content-section no-break">
            <h2 class="section-title">
                <div class="section-icon">${icons.refresh}</div>
                Permit Process Information
            </h2>
            <div class="process-timeline">
                ${permitData.process
                  .map(
                    (step, idx) => `
                    <div class="process-step no-break">
                        <div class="process-step-header">
                            <div class="process-step-number">${idx + 1}</div>
                            <h4 class="process-step-title">
                                ${typeof step === "string" ? `Step ${idx + 1}` : step.step || step.title || `Step ${idx + 1}`}
                            </h4>
                        </div>
                        <div class="process-step-content">
                            <p>${typeof step === "string" ? step : step.description || step.details || step.step || "Process step details"}</p>
                            ${
                              typeof step === "object" && step.timeline
                                ? `
                                <div class="process-timeline-info">
                                    <strong>Timeline:</strong> ${step.timeline}
                                </div>
                            `
                                : ""
                            }
                            ${
                              typeof step === "object" && step.requirements
                                ? `
                                <div class="process-requirements">
                                    <strong>Requirements:</strong> ${Array.isArray(step.requirements) ? step.requirements.join(", ") : step.requirements}
                                </div>
                            `
                                : ""
                            }
                        </div>
                    </div>
                `
                  )
                  .join("")}
            </div>
        </div>
        `
            : ""
        }

        <!-- Enhanced Building Codes Section - Comprehensive Frontend Data Capture -->
        <div class="content-section">
            <h2 class="section-title">
                <div class="section-icon">${icons.book}</div>
                Project-Specific Building Codes
            </h2>

            ${
              permitData.buildingCodes &&
              Array.isArray(permitData.buildingCodes) &&
              permitData.buildingCodes.length > 0
                ? permitData.buildingCodes
                    .map(
                      (codeSection, idx) => `
                    <div class="building-code-section no-break" style="margin-bottom: 30px;">
                        <div class="code-card">
                            <div class="code-header">
                                <h3 class="code-title">${codeSection.section || codeSection.title || `Building Code Section ${idx + 1}`}</h3>
                                <span class="code-badge">Section ${idx + 1}</span>
                            </div>
                            <p class="code-description">
                                ${codeSection.description || codeSection.summary || "Code section details"}
                            </p>

                            <!-- Enhanced Details Section -->
                            ${
                              codeSection.details
                                ? `
                                <div class="detail-section" style="background: #f8fafc; border-left: 4px solid #10b981; padding: 16px; margin: 16px 0; border-radius: 8px;">
                                    <h4 style="color: #065f46; font-weight: 600; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
                                        ${icons.clipboard} Detailed Requirements
                                    </h4>
                                    ${
                                      typeof codeSection.details === "string"
                                        ? `<p style="color: #374151; line-height: 1.6; white-space: pre-line;">${codeSection.details}</p>`
                                        : Array.isArray(codeSection.details)
                                          ? `<ul style="color: #374151; margin: 0; padding-left: 20px;">
                                                ${codeSection.details
                                                  .map(
                                                    (detail) =>
                                                      `<li style="margin-bottom: 8px;">${typeof detail === "string" ? detail : detail.description || detail.requirement || JSON.stringify(detail)}</li>`
                                                  )
                                                  .join("")}
                                            </ul>`
                                          : `<pre style="color: #374151; background: #f3f4f6; padding: 12px; border-radius: 6px; overflow-x: auto; white-space: pre-wrap;">${JSON.stringify(codeSection.details, null, 2)}</pre>`
                                    }
                                </div>
                            `
                                : ""
                            }

                            <!-- Specific Requirements -->
                            ${
                              codeSection.requirements &&
                              Array.isArray(codeSection.requirements)
                                ? `
                                <div class="detail-section" style="background: #f0fdf4; border-left: 4px solid #22c55e; padding: 16px; margin: 16px 0; border-radius: 8px;">
                                    <h4 style="color: #15803d; font-weight: 600; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
                                        ✅ Specific Requirements
                                    </h4>
                                    <ul style="color: #374151; margin: 0; padding-left: 20px;">
                                        ${codeSection.requirements
                                          .map(
                                            (req) => `
                                            <li style="margin-bottom: 8px;">
                                                ${typeof req === "string" ? req : req.description || req.requirement || JSON.stringify(req)}
                                                ${typeof req === "object" && req.details ? `<div style="margin-left: 16px; margin-top: 4px; font-size: 12px; color: #6b7280; font-style: italic;">${req.details}</div>` : ""}
                                            </li>
                                        `
                                          )
                                          .join("")}
                                    </ul>
                                </div>
                            `
                                : ""
                            }

                            <!-- Technical Specifications -->
                            ${
                              codeSection.specifications
                                ? `
                                <div class="detail-section" style="background: #ecfeff; border-left: 4px solid #06b6d4; padding: 16px; margin: 16px 0; border-radius: 8px;">
                                    <h4 style="color: #0e7490; font-weight: 600; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
                                        Technical Specifications
                                    </h4>
                                    ${
                                      Array.isArray(codeSection.specifications)
                                        ? `<ul style="color: #374151; margin: 0; padding-left: 20px;">
                                            ${codeSection.specifications
                                              .map(
                                                (spec) =>
                                                  `<li style="margin-bottom: 8px;">${typeof spec === "string" ? spec : spec.description || JSON.stringify(spec)}</li>`
                                              )
                                              .join("")}
                                        </ul>`
                                        : `<p style="color: #374151; line-height: 1.6;">${codeSection.specifications}</p>`
                                    }
                                </div>
                            `
                                : ""
                            }

                            <!-- Code References -->
                            ${
                              codeSection.codeReference
                                ? `
                                <div class="detail-section" style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px; margin: 16px 0; border-radius: 8px;">
                                    <h4 style="color: #1d4ed8; font-weight: 600; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
                                        ${icons.book} Code Reference
                                    </h4>
                                    <p style="color: #374151; line-height: 1.6; font-family: 'Courier New', monospace; background: #f8fafc; padding: 8px; border-radius: 4px;">
                                        ${codeSection.codeReference}
                                    </p>
                                    ${
                                      codeSection.codeDetails
                                        ? `
                                        <div style="margin-top: 12px;">
                                            <p style="color: #374151; line-height: 1.6;">${codeSection.codeDetails}</p>
                                        </div>
                                    `
                                        : ""
                                    }
                                </div>
                            `
                                : ""
                            }

                            <!-- Measurements & Dimensions -->
                            ${
                              codeSection.measurements
                                ? `
                                <div class="detail-section" style="background: #fef3e2; border-left: 4px solid #f59e0b; padding: 16px; margin: 16px 0; border-radius: 8px;">
                                    <h4 style="color: #92400e; font-weight: 600; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
                                        Measurements & Dimensions
                                    </h4>
                                    ${
                                      Array.isArray(codeSection.measurements)
                                        ? `<ul style="color: #374151; margin: 0; padding-left: 20px;">
                                            ${codeSection.measurements
                                              .map(
                                                (measurement) =>
                                                  `<li style="margin-bottom: 8px;">${typeof measurement === "string" ? measurement : measurement.description || JSON.stringify(measurement)}</li>`
                                              )
                                              .join("")}
                                        </ul>`
                                        : `<p style="color: #374151; line-height: 1.6;">${codeSection.measurements}</p>`
                                    }
                                </div>
                            `
                                : ""
                            }

                            <!-- Installation Guidelines -->
                            ${
                              codeSection.installation
                                ? `
                                <div class="detail-section" style="background: #f5f3ff; border-left: 4px solid #8b5cf6; padding: 16px; margin: 16px 0; border-radius: 8px;">
                                    <h4 style="color: #5b21b6; font-weight: 600; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
                                        Installation Guidelines
                                    </h4>
                                    ${
                                      Array.isArray(codeSection.installation)
                                        ? `<ul style="color: #374151; margin: 0; padding-left: 20px;">
                                            ${codeSection.installation
                                              .map(
                                                (guideline) =>
                                                  `<li style="margin-bottom: 8px;">${typeof guideline === "string" ? guideline : guideline.description || JSON.stringify(guideline)}</li>`
                                              )
                                              .join("")}
                                        </ul>`
                                        : `<p style="color: #374151; line-height: 1.6;">${codeSection.installation}</p>`
                                    }
                                </div>
                            `
                                : ""
                            }

                            <!-- Material Requirements -->
                            ${
                              codeSection.materials
                                ? `
                                <div class="detail-section" style="background: #fef7ed; border-left: 4px solid #ea580c; padding: 16px; margin: 16px 0; border-radius: 8px;">
                                    <h4 style="color: #9a3412; font-weight: 600; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
                                        Material Requirements
                                    </h4>
                                    ${
                                      Array.isArray(codeSection.materials)
                                        ? `<ul style="color: #374151; margin: 0; padding-left: 20px;">
                                            ${codeSection.materials
                                              .map(
                                                (material) =>
                                                  `<li style="margin-bottom: 8px;">${typeof material === "string" ? material : material.description || JSON.stringify(material)}</li>`
                                              )
                                              .join("")}
                                        </ul>`
                                        : `<p style="color: #374151; line-height: 1.6;">${codeSection.materials}</p>`
                                    }
                                </div>
                            `
                                : ""
                            }

                            <!-- Compliance Notes -->
                            ${
                              codeSection.complianceNotes
                                ? `
                                <div class="detail-section" style="background: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 16px; margin: 16px 0; border-radius: 8px;">
                                    <h4 style="color: #0c4a6e; font-weight: 600; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
                                        Compliance Notes
                                    </h4>
                                    <p style="color: #374151; line-height: 1.6;">${codeSection.complianceNotes}</p>
                                </div>
                            `
                                : ""
                            }

                            <!-- Violations & Penalties -->
                            ${
                              codeSection.violations
                                ? `
                                <div class="detail-section" style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; margin: 16px 0; border-radius: 8px;">
                                    <h4 style="color: #991b1b; font-weight: 600; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
                                        ${icons.alert} Violations & Penalties
                                    </h4>
                                    <p style="color: #374151; line-height: 1.6;">${codeSection.violations}</p>
                                </div>
                            `
                                : ""
                            }

                            <div class="compliance-note">
                                ${icons.check} Compliance verified
                            </div>
                        </div>
                    </div>
                `
                    )
                    .join("")
                : `<div class="text-center py-8">
                    <div class="code-card">
                        <div class="code-header">
                            <h3 class="code-title">California Building Code (CBC)</h3>
                            <span class="code-badge">Title 24, Part 2</span>
                        </div>
                        <p class="code-description">
                            State building standards that apply to all construction projects in California
                        </p>
                        <div class="compliance-note">
                            ${icons.check} Mandatory compliance required for all permits
                        </div>
                    </div>
                    <div class="code-card">
                        <div class="code-header">
                            <h3 class="code-title">${permitData.meta?.location || "Local"} Municipal Code</h3>
                            <span class="code-badge">Local Ordinances</span>
                        </div>
                        <p class="code-description">
                            City-specific building requirements and zoning restrictions
                        </p>
                        <div class="compliance-note">
                            ${icons.check} Local compliance verification required
                        </div>
                    </div>
                </div>`
            }
        </div>
            </div>
        </div>

        <!-- Enhanced Contact Information Section -->
        <div class="content-section no-break">
            <h2 class="section-title">
                <div class="section-icon">${icons.phone}</div>
                Comprehensive Contact Information
            </h2>
            <div class="enhanced-contact-grid">
                ${
                  permitData.contactInfo
                    ? `
                    <div class="enhanced-contact-card no-break">
                        <h3 class="contact-section-title">Municipal Building Department</h3>
                        <div class="contact-details-grid">
                            ${
                              permitData.contactInfo.department
                                ? `
                                <div class="contact-detail-item">
                                    <div class="contact-detail-icon">${icons.building}</div>
                                    <div>
                                        <div class="contact-detail-label">Department</div>
                                        <div class="contact-detail-value">${permitData.contactInfo.department}</div>
                                    </div>
                                </div>
                            `
                                : ""
                            }
                            ${
                              isValidValue(permitData.contactInfo.address)
                                ? `
                                <div class="contact-detail-item">
                                    <div class="contact-detail-icon">${icons.location}</div>
                                    <div>
                                        <div class="contact-detail-label">Address</div>
                                        <div class="contact-detail-value">${safeValue(permitData.contactInfo.address)}</div>
                                    </div>
                                </div>
                            `
                                : ""
                            }
                            ${
                              isValidValue(permitData.contactInfo.phone)
                                ? `
                                <div class="contact-detail-item">
                                    <div class="contact-detail-icon">${icons.phone}</div>
                                    <div>
                                        <div class="contact-detail-label">Phone</div>
                                        <div class="contact-detail-value">${safeValue(permitData.contactInfo.phone)}</div>
                                    </div>
                                </div>
                            `
                                : ""
                            }
                            ${
                              isValidValue(permitData.contactInfo.email)
                                ? `
                                <div class="contact-detail-item">
                                    <div class="contact-detail-icon">${icons.email}</div>
                                    <div>
                                        <div class="contact-detail-label">Email</div>
                                        <div class="contact-detail-value">${safeValue(permitData.contactInfo.email)}</div>
                                    </div>
                                </div>
                            `
                                : ""
                            }
                            ${
                              permitData.contactInfo.hours
                                ? `
                                <div class="contact-detail-item">
                                    <div class="contact-detail-icon">${icons.clock}</div>
                                    <div>
                                        <div class="contact-detail-label">Office Hours</div>
                                        <div class="contact-detail-value">${permitData.contactInfo.hours}</div>
                                    </div>
                                </div>
                            `
                                : ""
                            }
                            ${
                              permitData.contactInfo.website
                                ? `
                                <div class="contact-detail-item">
                                    <div class="contact-detail-icon">${icons.globe}</div>
                                    <div>
                                        <div class="contact-detail-label">Website</div>
                                        <div class="contact-detail-value">${permitData.contactInfo.website}</div>
                                    </div>
                                </div>
                            `
                                : ""
                            }
                        </div>

                        ${
                          isValidValue(permitData.contactInfo.inspector) ||
                          isValidValue(permitData.contactInfo.inspectorPhone) ||
                          isValidValue(permitData.contactInfo.inspectorEmail)
                            ? `
                            <div class="inspector-section">
                                <h4 class="inspector-title">${icons.hardhat} Assigned Inspector</h4>
                                <div class="inspector-details">
                                    ${
                                      isValidValue(
                                        permitData.contactInfo.inspector
                                      )
                                        ? `
                                        <div class="inspector-detail">
                                            <strong>Name:</strong> ${safeValue(permitData.contactInfo.inspector)}
                                        </div>
                                    `
                                        : ""
                                    }
                                    ${
                                      isValidValue(
                                        permitData.contactInfo.inspectorPhone
                                      )
                                        ? `
                                        <div class="inspector-detail">
                                            <strong>Phone:</strong> ${safeValue(permitData.contactInfo.inspectorPhone)}
                                        </div>
                                    `
                                        : ""
                                    }
                                    ${
                                      isValidValue(
                                        permitData.contactInfo.inspectorEmail
                                      )
                                        ? `
                                        <div class="inspector-detail">
                                            <strong>Email:</strong> ${safeValue(permitData.contactInfo.inspectorEmail)}
                                        </div>
                                    `
                                        : ""
                                    }
                                </div>
                            </div>
                        `
                            : ""
                        }

                        ${
                          permitData.contactInfo.onlinePortal
                            ? `
                            <div class="portal-section">
                                <h4 class="portal-title">${icons.computer} Online Portal</h4>
                                <div class="portal-link">${permitData.contactInfo.onlinePortal}</div>
                            </div>
                        `
                            : ""
                        }

                        ${
                          isValidValue(
                            permitData.contactInfo.emergencyContact
                          ) ||
                          isValidValue(permitData.contactInfo.schedulingPhone)
                            ? `
                            <div class="additional-contacts">
                                ${
                                  isValidValue(
                                    permitData.contactInfo.emergencyContact
                                  )
                                    ? `
                                    <div class="additional-contact-item">
                                        <div class="contact-detail-icon">${icons.emergency}</div>
                                        <div>
                                            <div class="contact-detail-label">Emergency Contact</div>
                                            <div class="contact-detail-value">${safeValue(permitData.contactInfo.emergencyContact)}</div>
                                        </div>
                                    </div>
                                `
                                    : ""
                                }
                                ${
                                  isValidValue(
                                    permitData.contactInfo.schedulingPhone
                                  )
                                    ? `
                                    <div class="additional-contact-item">
                                        <div class="contact-detail-icon">${icons.calendar}</div>
                                        <div>
                                            <div class="contact-detail-label">Scheduling Phone</div>
                                            <div class="contact-detail-value">${safeValue(permitData.contactInfo.schedulingPhone)}</div>
                                        </div>
                                    </div>
                                `
                                    : ""
                                }
                            </div>
                        `
                            : ""
                        }
                    </div>
                `
                    : '<p style="text-align: center; padding: 40px; color: #64748b;">Detailed contact information will be populated automatically based on analysis results.</p>'
                }
            </div>
        </div>

        <!-- Special Considerations Section -->
        ${
          permitData.specialConsiderations &&
          Array.isArray(permitData.specialConsiderations) &&
          permitData.specialConsiderations.length > 0
            ? `
        <div class="content-section no-break">
            <h2 class="section-title">
                <div class="section-icon">${icons.alert}</div>
                Special Considerations & Critical Alerts
            </h2>
            <div class="considerations-container">
                ${permitData.specialConsiderations
                  .map(
                    (consideration, idx) => {
                      // Parse consideration object properly
                      if (typeof consideration === "string") {
                        return `
                    <div class="consideration-card no-break">
                        <div class="consideration-header">
                            <div class="consideration-icon">${icons.alert}</div>
                            <h4 class="consideration-title">Critical Alert #${idx + 1}</h4>
                        </div>
                        <div class="consideration-content">
                            <p class="consideration-requirement">${consideration}</p>
                        </div>
                    </div>
                        `;
                      } else {
                        // Handle object with category, requirement, specification
                        const category = consideration.category || consideration.title || `Alert ${idx + 1}`;
                        const requirement = consideration.requirement || consideration.description || consideration.message || "";
                        const specification = consideration.specification || consideration.details || consideration.note || "";
                        return `
                    <div class="consideration-card no-break">
                        <div class="consideration-header">
                            <div class="consideration-icon">${icons.alert}</div>
                            <h4 class="consideration-title">${category}</h4>
                        </div>
                        <div class="consideration-content">
                            ${requirement ? `<p class="consideration-requirement">${requirement}</p>` : ""}
                            ${specification ? `<div class="consideration-spec">${specification}</div>` : ""}
                        </div>
                    </div>
                        `;
                      }
                    }
                  )
                  .join("")}
            </div>
        </div>
        `
            : ""
        }

        <!-- Attached Files Section -->
        ${
          permitData.attachedFiles &&
          Array.isArray(permitData.attachedFiles) &&
          permitData.attachedFiles.length > 0
            ? `
        <div class="content-section no-break">
            <h2 class="section-title">
                <div class="section-icon">${icons.file}</div>
                Attached Project Files
            </h2>
            <div class="attached-files-container">
                ${permitData.attachedFiles
                  .map(
                    (file) => `
                    <div class="attached-file-item no-break">
                        <div class="file-icon-container">
                            ${icons.file}
                        </div>
                        <div class="file-details">
                            <div class="file-name">${file.name}</div>
                            <div class="file-meta">
                                <span class="file-size">${formatFileSize(file.size)}</span>
                                ${file.uploadDate ? `<span class="file-date">Uploaded: ${file.uploadDate}</span>` : ""}
                            </div>
                        </div>
                    </div>
                `
                  )
                  .join("")}
            </div>
        </div>
        `
            : ""
        }

        <!-- Footer -->
        <div class="footer">
            <div class="footer-content">
                <div class="footer-section">
                    <h4>Prepared By</h4>
                    <p>${companyInfo.company || companyInfo.ownerName}</p>
                    <p>${companyInfo.ownerName}</p>
                    ${companyInfo.license ? `<p>License: ${companyInfo.license}</p>` : ""}
                </div>
                <div class="footer-section">
                    <h4>Contact Information</h4>
                    ${companyInfo.phone ? `<p>Phone: ${companyInfo.phone}</p>` : ""}
                    ${companyInfo.email ? `<p>Email: ${companyInfo.email}</p>` : ""}
                    ${companyInfo.website ? `<p>Web: ${companyInfo.website}</p>` : ""}
                </div>
                <div class="footer-section">
                    <h4>Address</h4>
                    <p>${companyInfo.address}</p>
                    <p>${companyInfo.city}, ${companyInfo.state} ${companyInfo.zipCode}</p>
                </div>
            </div>
            <div class="footer-divider"></div>
            <div class="footer-bottom">
                <p>This report was generated on ${currentDate} using advanced permit analysis technology.</p>
                <p>Report ID: ${reportId} | © ${new Date().getFullYear()} ${companyInfo.company || companyInfo.ownerName}. All rights reserved.</p>
            </div>
        </div>
    </div>
</body>
</html>
`;
}

export async function generatePDFReport(
  permitData: PermitData,
  companyInfo: CompanyInfo
): Promise<Blob> {
  try {
    console.log("🔄 [PDF-FRONTEND] Starting PDF generation request...");
    const htmlContent = generatePermitReportHTML(permitData, companyInfo);

    // Call backend PDF generation service
    const response = await fetch("/api/generate-permit-report-pdf", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        htmlContent,
        permitData,
        companyInfo,
      }),
    });

    console.log("📄 [PDF-FRONTEND] Response received:", {
      status: response.status,
      statusText: response.statusText,
      contentType: response.headers.get("Content-Type"),
      contentLength: response.headers.get("Content-Length"),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ [PDF-FRONTEND] Response error:", errorText);
      throw new Error(
        `PDF generation failed: ${response.statusText} - ${errorText}`
      );
    }

    // Verify content type
    const contentType = response.headers.get("Content-Type");
    if (!contentType || !contentType.includes("application/pdf")) {
      console.error("❌ [PDF-FRONTEND] Invalid content type:", contentType);
      throw new Error(
        `Invalid content type: ${contentType}. Expected application/pdf`
      );
    }

    const blob = await response.blob();
    console.log("✅ [PDF-FRONTEND] PDF blob created:", {
      size: blob.size,
      type: blob.type,
    });

    return blob;
  } catch (error) {
    console.error("❌ [PDF-FRONTEND] Error generating PDF report:", error);
    throw error;
  }
}

export function downloadPDFReport(pdfBlob: Blob, permitData: PermitData) {
  const url = URL.createObjectURL(pdfBlob);
  const link = document.createElement("a");
  const fileName = `Permit_Analysis_Report_${permitData.meta?.projectType || "Project"}_${new Date().toISOString().slice(0, 10)}.pdf`;

  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

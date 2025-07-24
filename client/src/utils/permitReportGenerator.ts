import jsPDF from 'jspdf';

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
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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

export function generatePermitReportHTML(permitData: PermitData, companyInfo: CompanyInfo): string {
  const currentDate = new Date().toLocaleDateString();
  const reportId = `RPT-${Date.now().toString().slice(-8)}`;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Permit Analysis Report</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            line-height: 1.6;
            color: #2d3748;
            background: #ffffff;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            color-adjust: exact;
        }
        
        /* PDF-specific optimizations */
        @media print {
            body { 
                font-size: 12px; 
                -webkit-print-color-adjust: exact;
            }
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
            box-shadow: 0 0 20px rgba(0,0,0,0.1);
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }
        
        /* Header */
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px;
            position: relative;
            overflow: hidden;
        }
        
        .header::before {
            content: '';
            position: absolute;
            top: 0;
            right: 0;
            width: 100px;
            height: 100px;
            background: rgba(255,255,255,0.1);
            border-radius: 50%;
            transform: translate(30px, -30px);
        }
        
        .header-content {
            position: relative;
            z-index: 2;
        }
        
        .company-logo {
            width: 60px;
            height: 60px;
            border-radius: 8px;
            margin-bottom: 20px;
            object-fit: cover;
            border: 2px solid rgba(255,255,255,0.3);
        }
        
        .report-title {
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 8px;
            text-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .report-subtitle {
            font-size: 16px;
            opacity: 0.9;
            font-weight: 400;
        }
        
        .report-meta {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 20px;
            padding-top: 20px;
            border-top: 1px solid rgba(255,255,255,0.2);
        }
        
        .meta-item {
            font-size: 14px;
            opacity: 0.8;
        }
        
        /* Executive Summary */
        .executive-summary {
            padding: 40px;
            background: linear-gradient(to right, #f8fafc, #e2e8f0);
            border-left: 4px solid #667eea;
            page-break-inside: avoid;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }
        
        .section-title {
            font-size: 24px;
            font-weight: 600;
            color: #2d3748;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            gap: 12px;
        }
        
        .section-icon {
            width: 32px;
            height: 32px;
            background: linear-gradient(135deg, #667eea, #764ba2);
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 16px;
        }
        
        .summary-stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-top: 20px;
        }
        
        .stat-card {
            background: white;
            padding: 20px;
            border-radius: 12px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            border: 1px solid #e2e8f0;
        }
        
        .stat-number {
            font-size: 32px;
            font-weight: 700;
            color: #667eea;
            line-height: 1;
        }
        
        .stat-label {
            font-size: 14px;
            color: #64748b;
            font-weight: 500;
            margin-top: 4px;
        }
        
        /* Content Sections */
        .content-section {
            padding: 40px;
            border-bottom: 1px solid #e2e8f0;
            page-break-inside: avoid;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }
        
        .content-section:last-child {
            border-bottom: none;
        }
        
        /* Permits Section */
        .permit-card {
            background: white;
            border: 2px solid #e2e8f0;
            border-radius: 12px;
            padding: 24px;
            margin-bottom: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
            page-break-inside: avoid;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }
        
        .permit-card:hover {
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            transform: translateY(-1px);
        }
        
        .permit-header {
            display: flex;
            justify-content: between;
            align-items: flex-start;
            margin-bottom: 16px;
            padding-bottom: 16px;
            border-bottom: 1px solid #f1f5f9;
        }
        
        .permit-name {
            font-size: 20px;
            font-weight: 600;
            color: #1e293b;
            margin-bottom: 4px;
        }
        
        .permit-authority {
            font-size: 14px;
            color: #64748b;
            font-weight: 500;
        }
        
        .permit-details {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 16px;
            margin-bottom: 16px;
        }
        
        .detail-item {
            background: #f8fafc;
            padding: 12px;
            border-radius: 8px;
            border-left: 3px solid #667eea;
        }
        
        .detail-label {
            font-size: 12px;
            font-weight: 600;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 4px;
        }
        
        .detail-value {
            font-size: 14px;
            color: #2d3748;
            font-weight: 500;
        }
        
        .documents-list {
            background: #fef7f0;
            border: 1px solid #fed7aa;
            border-radius: 8px;
            padding: 16px;
            margin-top: 16px;
        }
        
        .documents-title {
            font-size: 14px;
            font-weight: 600;
            color: #ea580c;
            margin-bottom: 8px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .documents-list ul {
            list-style: none;
            padding: 0;
        }
        
        .documents-list li {
            padding: 4px 0;
            font-size: 13px;
            color: #9a3412;
            position: relative;
            padding-left: 16px;
        }
        
        .documents-list li::before {
            content: "•";
            position: absolute;
            left: 0;
            color: #ea580c;
            font-weight: bold;
        }
        
        /* Contacts Section */
        .contacts-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
        }
        
        .contact-card {
            background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
            border: 1px solid #0ea5e9;
            border-radius: 12px;
            padding: 20px;
        }
        
        .contact-name {
            font-size: 18px;
            font-weight: 600;
            color: #0c4a6e;
            margin-bottom: 16px;
        }
        
        .contact-item {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 8px;
            font-size: 14px;
        }
        
        .contact-icon {
            width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #0ea5e9;
        }
        
        /* Building Codes Section */
        .codes-grid {
            display: grid;
            gap: 16px;
        }
        
        .code-card {
            background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
            border: 1px solid #22c55e;
            border-radius: 12px;
            padding: 20px;
        }
        
        .code-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
        }
        
        .code-title {
            font-size: 16px;
            font-weight: 600;
            color: #14532d;
        }
        
        .code-badge {
            background: #22c55e;
            color: white;
            padding: 4px 8px;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 500;
        }
        
        .code-description {
            font-size: 14px;
            color: #166534;
            margin-bottom: 12px;
        }
        
        .compliance-note {
            background: rgba(34, 197, 94, 0.1);
            border-left: 3px solid #22c55e;
            padding: 8px 12px;
            border-radius: 4px;
            font-size: 13px;
            color: #14532d;
            font-weight: 500;
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
            background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
            border: 2px solid #f59e0b;
            border-radius: 12px;
            padding: 20px;
        }
        
        .consideration-header {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 12px;
        }
        
        .consideration-number {
            font-size: 24px;
        }
        
        .consideration-title {
            font-size: 16px;
            font-weight: 600;
            color: #92400e;
            margin: 0;
        }
        
        .consideration-content {
            background: rgba(251, 191, 36, 0.2);
            border-radius: 8px;
            padding: 12px;
            border-left: 4px solid #f59e0b;
        }
        
        .consideration-content p {
            font-size: 14px;
            line-height: 1.6;
            color: #78350f;
            margin: 0;
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
            background: #1e293b;
            color: white;
            padding: 30px 40px;
            text-align: center;
        }
        
        .footer-content {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 20px;
        }
        
        .footer-section h4 {
            font-size: 14px;
            font-weight: 600;
            margin-bottom: 8px;
            color: #e2e8f0;
        }
        
        .footer-section p {
            font-size: 12px;
            color: #94a3b8;
            line-height: 1.4;
        }
        
        .footer-divider {
            height: 1px;
            background: linear-gradient(to right, transparent, #475569, transparent);
            margin: 20px 0;
        }
        
        .footer-bottom {
            font-size: 11px;
            color: #64748b;
            text-align: center;
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
                ${companyInfo.logo ? `<img src="${companyInfo.logo}" alt="Company Logo" class="company-logo">` : ''}
                <h1 class="report-title">Permit Analysis Report</h1>
                <p class="report-subtitle">Comprehensive Construction Permit Assessment</p>
                <div class="report-meta">
                    <div class="meta-item">
                        <strong>Project:</strong> ${permitData.meta?.projectType || 'Construction Project'}
                    </div>
                    <div class="meta-item">
                        <strong>Location:</strong> ${permitData.meta?.location || 'Project Location'}
                    </div>
                    <div class="meta-item">
                        <strong>Report ID:</strong> ${reportId}
                    </div>
                    <div class="meta-item">
                        <strong>Date:</strong> ${currentDate}
                    </div>
                </div>
            </div>
        </div>

        <!-- Client & Project Information Section -->
        ${permitData.clientInfo || permitData.projectDescription ? `
        <div class="content-section no-break">
            <h2 class="section-title">
                <div class="section-icon">👥</div>
                Project & Client Information
            </h2>
            <div class="client-info-grid">
                ${permitData.clientInfo ? `
                    <div class="client-card no-break">
                        <h3 class="client-section-title">Client Information</h3>
                        <div class="client-details">
                            ${permitData.clientInfo.name ? `
                                <div class="client-detail-item">
                                    <div class="client-detail-label">Client Name</div>
                                    <div class="client-detail-value">${permitData.clientInfo.name}</div>
                                </div>
                            ` : ''}
                            ${permitData.clientInfo.address ? `
                                <div class="client-detail-item">
                                    <div class="client-detail-label">Project Address</div>
                                    <div class="client-detail-value">${permitData.clientInfo.address}</div>
                                </div>
                            ` : ''}
                            ${permitData.clientInfo.phone ? `
                                <div class="client-detail-item">
                                    <div class="client-detail-label">Phone</div>
                                    <div class="client-detail-value">${permitData.clientInfo.phone}</div>
                                </div>
                            ` : ''}
                            ${permitData.clientInfo.email ? `
                                <div class="client-detail-item">
                                    <div class="client-detail-label">Email</div>
                                    <div class="client-detail-value">${permitData.clientInfo.email}</div>
                                </div>
                            ` : ''}
                            ${permitData.clientInfo.projectType ? `
                                <div class="client-detail-item">
                                    <div class="client-detail-label">Project Type</div>
                                    <div class="client-detail-value">${permitData.clientInfo.projectType}</div>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                ` : ''}
                ${permitData.projectDescription ? `
                    <div class="project-description-card no-break">
                        <h3 class="client-section-title">Project Description</h3>
                        <div class="project-description-content">
                            <p>${permitData.projectDescription}</p>
                        </div>
                    </div>
                ` : ''}
            </div>
        </div>
        ` : ''}

        <!-- Executive Summary -->
        <div class="executive-summary no-break">
            <h2 class="section-title">
                <div class="section-icon">📊</div>
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
                <div class="section-icon">🏛️</div>
                Required Permits
            </h2>
            ${permitData.requiredPermits && permitData.requiredPermits.length > 0 ? 
                permitData.requiredPermits.map(permit => `
                    <div class="permit-card no-break">
                        <div class="permit-header">
                            <div>
                                <h3 class="permit-name">${permit.name}</h3>
                                <p class="permit-authority">${permit.issuingAuthority}</p>
                            </div>
                        </div>
                        
                        ${permit.description ? `<p style="margin-bottom: 16px; color: #64748b;">${permit.description}</p>` : ''}
                        
                        <div class="permit-details">
                            ${permit.estimatedTimeline ? `
                                <div class="detail-item">
                                    <div class="detail-label">Timeline</div>
                                    <div class="detail-value">${permit.estimatedTimeline}</div>
                                </div>
                            ` : ''}
                            ${permit.averageCost ? `
                                <div class="detail-item">
                                    <div class="detail-label">Estimated Cost</div>
                                    <div class="detail-value">${permit.averageCost}</div>
                                </div>
                            ` : ''}
                            ${permit.responsibleParty ? `
                                <div class="detail-item">
                                    <div class="detail-label">Responsible Party</div>
                                    <div class="detail-value">${permit.responsibleParty}</div>
                                </div>
                            ` : ''}
                            ${permit.submissionMethod ? `
                                <div class="detail-item">
                                    <div class="detail-label">Submission Method</div>
                                    <div class="detail-value">${permit.submissionMethod}</div>
                                </div>
                            ` : ''}
                        </div>
                        
                        ${permit.requiredDocuments ? `
                            <div class="documents-list">
                                <div class="documents-title">📋 Required Documents</div>
                                <ul>
                                    ${Array.isArray(permit.requiredDocuments) 
                                        ? permit.requiredDocuments.map(doc => `<li>${doc}</li>`).join('')
                                        : `<li>${permit.requiredDocuments}</li>`
                                    }
                                </ul>
                            </div>
                        ` : ''}
                        
                        ${permit.requirements ? `
                            <div style="margin-top: 16px; padding: 12px; background: #f1f5f9; border-radius: 8px; border-left: 3px solid #667eea;">
                                <strong style="color: #334155; font-size: 14px;">Additional Requirements:</strong>
                                <p style="margin-top: 4px; color: #475569; font-size: 13px;">${permit.requirements}</p>
                            </div>
                        ` : ''}
                    </div>
                `).join('')
                : '<p style="text-align: center; padding: 40px; color: #64748b;">No specific permits required for this project type.</p>'
            }
        </div>

        <!-- Department Contacts Section -->
        <div class="content-section">
            <h2 class="section-title">
                <div class="section-icon">📞</div>
                Department Contacts
            </h2>
            <div class="contacts-grid">
                ${permitData.contactInformation && permitData.contactInformation.length > 0 ? 
                    permitData.contactInformation.map(contact => `
                        <div class="contact-card">
                            <h3 class="contact-name">${contact.department}</h3>
                            ${contact.phone ? `
                                <div class="contact-item">
                                    <div class="contact-icon">📞</div>
                                    <span>${contact.phone}</span>
                                </div>
                            ` : ''}
                            ${contact.email ? `
                                <div class="contact-item">
                                    <div class="contact-icon">📧</div>
                                    <span>${contact.email}</span>
                                </div>
                            ` : ''}
                            ${contact.address ? `
                                <div class="contact-item">
                                    <div class="contact-icon">📍</div>
                                    <span>${contact.address}</span>
                                </div>
                            ` : ''}
                            ${contact.hours ? `
                                <div class="contact-item">
                                    <div class="contact-icon">🕒</div>
                                    <span>${contact.hours}</span>
                                </div>
                            ` : ''}
                        </div>
                    `).join('')
                    : permitData.requiredPermits ? 
                        permitData.requiredPermits.filter(permit => permit.contactPhone || permit.website).map(permit => `
                            <div class="contact-card">
                                <h3 class="contact-name">${permit.issuingAuthority}</h3>
                                ${permit.contactPhone ? `
                                    <div class="contact-item">
                                        <div class="contact-icon">📞</div>
                                        <span>${permit.contactPhone}</span>
                                    </div>
                                ` : ''}
                                ${permit.website ? `
                                    <div class="contact-item">
                                        <div class="contact-icon">🌐</div>
                                        <span>${permit.website}</span>
                                    </div>
                                ` : ''}
                            </div>
                        `).join('')
                        : '<p style="text-align: center; padding: 40px; color: #64748b;">Contact information will be populated automatically.</p>'
                }
            </div>
        </div>

        <!-- Process Information Section -->
        ${permitData.process && Array.isArray(permitData.process) && permitData.process.length > 0 ? `
        <div class="content-section no-break">
            <h2 class="section-title">
                <div class="section-icon">🔄</div>
                Permit Process Information
            </h2>
            <div class="process-timeline">
                ${permitData.process.map((step, idx) => `
                    <div class="process-step no-break">
                        <div class="process-step-header">
                            <div class="process-step-number">${idx + 1}</div>
                            <h4 class="process-step-title">
                                ${typeof step === "string" ? `Step ${idx + 1}` : step.step || step.title || `Step ${idx + 1}`}
                            </h4>
                        </div>
                        <div class="process-step-content">
                            <p>${typeof step === "string" ? step : step.description || step.details || step.step || 'Process step details'}</p>
                            ${typeof step === 'object' && step.timeline ? `
                                <div class="process-timeline-info">
                                    <strong>Timeline:</strong> ${step.timeline}
                                </div>
                            ` : ''}
                            ${typeof step === 'object' && step.requirements ? `
                                <div class="process-requirements">
                                    <strong>Requirements:</strong> ${Array.isArray(step.requirements) ? step.requirements.join(', ') : step.requirements}
                                </div>
                            ` : ''}
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
        ` : ''}

        <!-- Enhanced Building Codes Section - Comprehensive Frontend Data Capture -->
        <div class="content-section">
            <h2 class="section-title">
                <div class="section-icon">📚</div>
                Project-Specific Building Codes
            </h2>
            
            ${permitData.buildingCodes && Array.isArray(permitData.buildingCodes) && permitData.buildingCodes.length > 0 ? 
                permitData.buildingCodes.map((codeSection, idx) => `
                    <div class="building-code-section no-break" style="margin-bottom: 30px;">
                        <div class="code-card">
                            <div class="code-header">
                                <h3 class="code-title">${codeSection.section || codeSection.title || `Building Code Section ${idx + 1}`}</h3>
                                <span class="code-badge">Section ${idx + 1}</span>
                            </div>
                            <p class="code-description">
                                ${codeSection.description || codeSection.summary || 'Code section details'}
                            </p>
                            
                            <!-- Enhanced Details Section -->
                            ${codeSection.details ? `
                                <div class="detail-section" style="background: #f8fafc; border-left: 4px solid #10b981; padding: 16px; margin: 16px 0; border-radius: 8px;">
                                    <h4 style="color: #065f46; font-weight: 600; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
                                        📋 Detailed Requirements
                                    </h4>
                                    ${typeof codeSection.details === 'string' ? 
                                        `<p style="color: #374151; line-height: 1.6; white-space: pre-line;">${codeSection.details}</p>` :
                                        Array.isArray(codeSection.details) ?
                                            `<ul style="color: #374151; margin: 0; padding-left: 20px;">
                                                ${codeSection.details.map(detail => 
                                                    `<li style="margin-bottom: 8px;">${typeof detail === 'string' ? detail : detail.description || detail.requirement || JSON.stringify(detail)}</li>`
                                                ).join('')}
                                            </ul>` :
                                            `<pre style="color: #374151; background: #f3f4f6; padding: 12px; border-radius: 6px; overflow-x: auto; white-space: pre-wrap;">${JSON.stringify(codeSection.details, null, 2)}</pre>`
                                    }
                                </div>
                            ` : ''}
                            
                            <!-- Specific Requirements -->
                            ${codeSection.requirements && Array.isArray(codeSection.requirements) ? `
                                <div class="detail-section" style="background: #f0fdf4; border-left: 4px solid #22c55e; padding: 16px; margin: 16px 0; border-radius: 8px;">
                                    <h4 style="color: #15803d; font-weight: 600; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
                                        ✅ Specific Requirements
                                    </h4>
                                    <ul style="color: #374151; margin: 0; padding-left: 20px;">
                                        ${codeSection.requirements.map(req => `
                                            <li style="margin-bottom: 8px;">
                                                ${typeof req === 'string' ? req : req.description || req.requirement || JSON.stringify(req)}
                                                ${typeof req === 'object' && req.details ? `<div style="margin-left: 16px; margin-top: 4px; font-size: 12px; color: #6b7280; font-style: italic;">${req.details}</div>` : ''}
                                            </li>
                                        `).join('')}
                                    </ul>
                                </div>
                            ` : ''}
                            
                            <!-- Technical Specifications -->
                            ${codeSection.specifications ? `
                                <div class="detail-section" style="background: #ecfeff; border-left: 4px solid #06b6d4; padding: 16px; margin: 16px 0; border-radius: 8px;">
                                    <h4 style="color: #0e7490; font-weight: 600; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
                                        🔧 Technical Specifications
                                    </h4>
                                    ${Array.isArray(codeSection.specifications) ? 
                                        `<ul style="color: #374151; margin: 0; padding-left: 20px;">
                                            ${codeSection.specifications.map(spec => 
                                                `<li style="margin-bottom: 8px;">${typeof spec === 'string' ? spec : spec.description || JSON.stringify(spec)}</li>`
                                            ).join('')}
                                        </ul>` :
                                        `<p style="color: #374151; line-height: 1.6;">${codeSection.specifications}</p>`
                                    }
                                </div>
                            ` : ''}
                            
                            <!-- Code References -->
                            ${codeSection.codeReference ? `
                                <div class="detail-section" style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px; margin: 16px 0; border-radius: 8px;">
                                    <h4 style="color: #1d4ed8; font-weight: 600; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
                                        📖 Code Reference
                                    </h4>
                                    <p style="color: #374151; line-height: 1.6; font-family: 'Courier New', monospace; background: #f8fafc; padding: 8px; border-radius: 4px;">
                                        ${codeSection.codeReference}
                                    </p>
                                    ${codeSection.codeDetails ? `
                                        <div style="margin-top: 12px;">
                                            <p style="color: #374151; line-height: 1.6;">${codeSection.codeDetails}</p>
                                        </div>
                                    ` : ''}
                                </div>
                            ` : ''}
                            
                            <!-- Measurements & Dimensions -->
                            ${codeSection.measurements ? `
                                <div class="detail-section" style="background: #fef3e2; border-left: 4px solid #f59e0b; padding: 16px; margin: 16px 0; border-radius: 8px;">
                                    <h4 style="color: #92400e; font-weight: 600; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
                                        📐 Measurements & Dimensions
                                    </h4>
                                    ${Array.isArray(codeSection.measurements) ? 
                                        `<ul style="color: #374151; margin: 0; padding-left: 20px;">
                                            ${codeSection.measurements.map(measurement => 
                                                `<li style="margin-bottom: 8px;">${typeof measurement === 'string' ? measurement : measurement.description || JSON.stringify(measurement)}</li>`
                                            ).join('')}
                                        </ul>` :
                                        `<p style="color: #374151; line-height: 1.6;">${codeSection.measurements}</p>`
                                    }
                                </div>
                            ` : ''}
                            
                            <!-- Installation Guidelines -->
                            ${codeSection.installation ? `
                                <div class="detail-section" style="background: #f5f3ff; border-left: 4px solid #8b5cf6; padding: 16px; margin: 16px 0; border-radius: 8px;">
                                    <h4 style="color: #5b21b6; font-weight: 600; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
                                        🔨 Installation Guidelines
                                    </h4>
                                    ${Array.isArray(codeSection.installation) ? 
                                        `<ul style="color: #374151; margin: 0; padding-left: 20px;">
                                            ${codeSection.installation.map(guideline => 
                                                `<li style="margin-bottom: 8px;">${typeof guideline === 'string' ? guideline : guideline.description || JSON.stringify(guideline)}</li>`
                                            ).join('')}
                                        </ul>` :
                                        `<p style="color: #374151; line-height: 1.6;">${codeSection.installation}</p>`
                                    }
                                </div>
                            ` : ''}
                            
                            <!-- Material Requirements -->
                            ${codeSection.materials ? `
                                <div class="detail-section" style="background: #fef7ed; border-left: 4px solid #ea580c; padding: 16px; margin: 16px 0; border-radius: 8px;">
                                    <h4 style="color: #9a3412; font-weight: 600; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
                                        🧱 Material Requirements
                                    </h4>
                                    ${Array.isArray(codeSection.materials) ? 
                                        `<ul style="color: #374151; margin: 0; padding-left: 20px;">
                                            ${codeSection.materials.map(material => 
                                                `<li style="margin-bottom: 8px;">${typeof material === 'string' ? material : material.description || JSON.stringify(material)}</li>`
                                            ).join('')}
                                        </ul>` :
                                        `<p style="color: #374151; line-height: 1.6;">${codeSection.materials}</p>`
                                    }
                                </div>
                            ` : ''}
                            
                            <!-- Compliance Notes -->
                            ${codeSection.complianceNotes ? `
                                <div class="detail-section" style="background: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 16px; margin: 16px 0; border-radius: 8px;">
                                    <h4 style="color: #0c4a6e; font-weight: 600; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
                                        📝 Compliance Notes
                                    </h4>
                                    <p style="color: #374151; line-height: 1.6;">${codeSection.complianceNotes}</p>
                                </div>
                            ` : ''}
                            
                            <!-- Violations & Penalties -->
                            ${codeSection.violations ? `
                                <div class="detail-section" style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; margin: 16px 0; border-radius: 8px;">
                                    <h4 style="color: #991b1b; font-weight: 600; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
                                        ⚠️ Violations & Penalties
                                    </h4>
                                    <p style="color: #374151; line-height: 1.6;">${codeSection.violations}</p>
                                </div>
                            ` : ''}
                            
                            <div class="compliance-note">
                                ✓ Project-specific compliance verified
                            </div>
                        </div>
                    </div>
                `).join('') :
                `<div class="text-center py-8">
                    <div class="code-card">
                        <div class="code-header">
                            <h3 class="code-title">California Building Code (CBC)</h3>
                            <span class="code-badge">Title 24, Part 2</span>
                        </div>
                        <p class="code-description">
                            State building standards that apply to all construction projects in California
                        </p>
                        <div class="compliance-note">
                            ✓ Mandatory compliance required for all permits
                        </div>
                    </div>
                    <div class="code-card">
                        <div class="code-header">
                            <h3 class="code-title">${permitData.meta?.location || 'Local'} Municipal Code</h3>
                            <span class="code-badge">Local Ordinances</span>
                        </div>
                        <p class="code-description">
                            City-specific building requirements and zoning restrictions
                        </p>
                        <div class="compliance-note">
                            ✓ Local compliance verification required
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
                <div class="section-icon">📞</div>
                Comprehensive Contact Information
            </h2>
            <div class="enhanced-contact-grid">
                ${permitData.contactInfo ? `
                    <div class="enhanced-contact-card no-break">
                        <h3 class="contact-section-title">Municipal Building Department</h3>
                        <div class="contact-details-grid">
                            ${permitData.contactInfo.department ? `
                                <div class="contact-detail-item">
                                    <div class="contact-detail-icon">🏛️</div>
                                    <div>
                                        <div class="contact-detail-label">Department</div>
                                        <div class="contact-detail-value">${permitData.contactInfo.department}</div>
                                    </div>
                                </div>
                            ` : ''}
                            ${permitData.contactInfo.address ? `
                                <div class="contact-detail-item">
                                    <div class="contact-detail-icon">📍</div>
                                    <div>
                                        <div class="contact-detail-label">Address</div>
                                        <div class="contact-detail-value">${permitData.contactInfo.address}</div>
                                    </div>
                                </div>
                            ` : ''}
                            ${permitData.contactInfo.phone ? `
                                <div class="contact-detail-item">
                                    <div class="contact-detail-icon">📞</div>
                                    <div>
                                        <div class="contact-detail-label">Phone</div>
                                        <div class="contact-detail-value">${permitData.contactInfo.phone}</div>
                                    </div>
                                </div>
                            ` : ''}
                            ${permitData.contactInfo.email ? `
                                <div class="contact-detail-item">
                                    <div class="contact-detail-icon">📧</div>
                                    <div>
                                        <div class="contact-detail-label">Email</div>
                                        <div class="contact-detail-value">${permitData.contactInfo.email}</div>
                                    </div>
                                </div>
                            ` : ''}
                            ${permitData.contactInfo.hours ? `
                                <div class="contact-detail-item">
                                    <div class="contact-detail-icon">🕒</div>
                                    <div>
                                        <div class="contact-detail-label">Office Hours</div>
                                        <div class="contact-detail-value">${permitData.contactInfo.hours}</div>
                                    </div>
                                </div>
                            ` : ''}
                            ${permitData.contactInfo.website ? `
                                <div class="contact-detail-item">
                                    <div class="contact-detail-icon">🌐</div>
                                    <div>
                                        <div class="contact-detail-label">Website</div>
                                        <div class="contact-detail-value">${permitData.contactInfo.website}</div>
                                    </div>
                                </div>
                            ` : ''}
                        </div>
                        
                        ${permitData.contactInfo.inspector || permitData.contactInfo.inspectorPhone || permitData.contactInfo.inspectorEmail ? `
                            <div class="inspector-section">
                                <h4 class="inspector-title">👷 Assigned Inspector</h4>
                                <div class="inspector-details">
                                    ${permitData.contactInfo.inspector ? `
                                        <div class="inspector-detail">
                                            <strong>Name:</strong> ${permitData.contactInfo.inspector}
                                        </div>
                                    ` : ''}
                                    ${permitData.contactInfo.inspectorPhone ? `
                                        <div class="inspector-detail">
                                            <strong>Phone:</strong> ${permitData.contactInfo.inspectorPhone}
                                        </div>
                                    ` : ''}
                                    ${permitData.contactInfo.inspectorEmail ? `
                                        <div class="inspector-detail">
                                            <strong>Email:</strong> ${permitData.contactInfo.inspectorEmail}
                                        </div>
                                    ` : ''}
                                </div>
                            </div>
                        ` : ''}
                        
                        ${permitData.contactInfo.onlinePortal ? `
                            <div class="portal-section">
                                <h4 class="portal-title">💻 Online Portal</h4>
                                <div class="portal-link">${permitData.contactInfo.onlinePortal}</div>
                            </div>
                        ` : ''}
                        
                        ${permitData.contactInfo.emergencyContact || permitData.contactInfo.schedulingPhone ? `
                            <div class="additional-contacts">
                                ${permitData.contactInfo.emergencyContact ? `
                                    <div class="additional-contact-item">
                                        <div class="contact-detail-icon">🚨</div>
                                        <div>
                                            <div class="contact-detail-label">Emergency Contact</div>
                                            <div class="contact-detail-value">${permitData.contactInfo.emergencyContact}</div>
                                        </div>
                                    </div>
                                ` : ''}
                                ${permitData.contactInfo.schedulingPhone ? `
                                    <div class="additional-contact-item">
                                        <div class="contact-detail-icon">📅</div>
                                        <div>
                                            <div class="contact-detail-label">Scheduling Phone</div>
                                            <div class="contact-detail-value">${permitData.contactInfo.schedulingPhone}</div>
                                        </div>
                                    </div>
                                ` : ''}
                            </div>
                        ` : ''}
                    </div>
                ` : '<p style="text-align: center; padding: 40px; color: #64748b;">Detailed contact information will be populated automatically based on analysis results.</p>'}
            </div>
        </div>

        <!-- Special Considerations Section -->
        ${permitData.specialConsiderations && Array.isArray(permitData.specialConsiderations) && permitData.specialConsiderations.length > 0 ? `
        <div class="content-section no-break">
            <h2 class="section-title">
                <div class="section-icon">⚠️</div>
                Special Considerations & Critical Alerts
            </h2>
            <div class="considerations-container">
                ${permitData.specialConsiderations.map((consideration, idx) => `
                    <div class="consideration-card no-break">
                        <div class="consideration-header">
                            <div class="consideration-number">⚠️</div>
                            <h4 class="consideration-title">Critical Alert #${idx + 1}</h4>
                        </div>
                        <div class="consideration-content">
                            <p>${typeof consideration === "string" ? consideration : JSON.stringify(consideration)}</p>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
        ` : ''}

        <!-- Attached Files Section -->
        ${permitData.attachedFiles && Array.isArray(permitData.attachedFiles) && permitData.attachedFiles.length > 0 ? `
        <div class="content-section no-break">
            <h2 class="section-title">
                <div class="section-icon">📎</div>
                Attached Project Files
            </h2>
            <div class="attached-files-container">
                ${permitData.attachedFiles.map(file => `
                    <div class="attached-file-item no-break">
                        <div class="file-icon-container">
                            ${file.type === 'application/pdf' ? '📄' : 
                              file.type.startsWith('image/') ? '🖼️' : 
                              file.type.includes('video/') ? '🎥' :
                              file.type.includes('word') ? '📝' :
                              file.type.includes('excel') || file.type.includes('spreadsheet') ? '📊' :
                              file.type.includes('powerpoint') || file.type.includes('presentation') ? '🎯' :
                              file.type.includes('text/') ? '📄' :
                              file.type.includes('audio/') ? '🎵' : '📁'}
                        </div>
                        <div class="file-details">
                            <div class="file-name">${file.name}</div>
                            <div class="file-meta">
                                <span class="file-size">${formatFileSize(file.size)}</span>
                                ${file.uploadDate ? `<span class="file-date">Uploaded: ${file.uploadDate}</span>` : ''}
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
        ` : ''}

        <!-- Footer -->
        <div class="footer">
            <div class="footer-content">
                <div class="footer-section">
                    <h4>Prepared By</h4>
                    <p>${companyInfo.company || companyInfo.ownerName}</p>
                    <p>${companyInfo.ownerName}</p>
                    ${companyInfo.license ? `<p>License: ${companyInfo.license}</p>` : ''}
                </div>
                <div class="footer-section">
                    <h4>Contact Information</h4>
                    ${companyInfo.phone ? `<p>Phone: ${companyInfo.phone}</p>` : ''}
                    ${companyInfo.email ? `<p>Email: ${companyInfo.email}</p>` : ''}
                    ${companyInfo.website ? `<p>Web: ${companyInfo.website}</p>` : ''}
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

export async function generatePDFReport(permitData: PermitData, companyInfo: CompanyInfo): Promise<Blob> {
  try {
    console.log('🔄 [PDF-FRONTEND] Starting PDF generation request...');
    const htmlContent = generatePermitReportHTML(permitData, companyInfo);
    
    // Call backend PDF generation service
    const response = await fetch('/api/generate-permit-report-pdf', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        htmlContent,
        permitData,
        companyInfo,
      }),
    });

    console.log('📄 [PDF-FRONTEND] Response received:', {
      status: response.status,
      statusText: response.statusText,
      contentType: response.headers.get('Content-Type'),
      contentLength: response.headers.get('Content-Length')
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [PDF-FRONTEND] Response error:', errorText);
      throw new Error(`PDF generation failed: ${response.statusText} - ${errorText}`);
    }

    // Verify content type
    const contentType = response.headers.get('Content-Type');
    if (!contentType || !contentType.includes('application/pdf')) {
      console.error('❌ [PDF-FRONTEND] Invalid content type:', contentType);
      throw new Error(`Invalid content type: ${contentType}. Expected application/pdf`);
    }

    const blob = await response.blob();
    console.log('✅ [PDF-FRONTEND] PDF blob created:', {
      size: blob.size,
      type: blob.type
    });

    return blob;
  } catch (error) {
    console.error('❌ [PDF-FRONTEND] Error generating PDF report:', error);
    throw error;
  }
}

export function downloadPDFReport(pdfBlob: Blob, permitData: PermitData) {
  const url = URL.createObjectURL(pdfBlob);
  const link = document.createElement('a');
  const fileName = `Permit_Analysis_Report_${permitData.meta?.projectType || 'Project'}_${new Date().toISOString().slice(0, 10)}.pdf`;
  
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
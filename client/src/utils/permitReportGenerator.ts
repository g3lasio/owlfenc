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

export interface PermitData {
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
        }
        
        .report-container {
            max-width: 210mm;
            margin: 0 auto;
            background: white;
            box-shadow: 0 0 20px rgba(0,0,0,0.1);
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
        }
        
        .content-section:last-child {
            border-bottom: none;
        }
        
        /* Permits Section */
        .permit-card {
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 24px;
            margin-bottom: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
            transition: all 0.2s;
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

        <!-- Executive Summary -->
        <div class="executive-summary">
            <h2 class="section-title">
                <div class="section-icon">📊</div>
                Executive Summary
            </h2>
            <p style="margin-bottom: 20px; font-size: 16px; color: #475569;">
                This comprehensive permit analysis report provides detailed information about the required permits, 
                building codes, contact information, and compliance requirements for your construction project.
            </p>
            <div class="summary-stats">
                <div class="stat-card">
                    <div class="stat-number">${permitData.requiredPermits?.length || 0}</div>
                    <div class="stat-label">Required Permits</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${permitData.contactInformation?.length || 0}</div>
                    <div class="stat-label">Department Contacts</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${permitData.requiredPermits?.reduce((count, permit) => {
                        if (permit.requiredDocuments) {
                            return count + (Array.isArray(permit.requiredDocuments) ? permit.requiredDocuments.length : 1);
                        }
                        return count;
                    }, 0) || 0}</div>
                    <div class="stat-label">Required Documents</div>
                </div>
            </div>
        </div>

        <!-- Required Permits Section -->
        <div class="content-section">
            <h2 class="section-title">
                <div class="section-icon">🏛️</div>
                Required Permits
            </h2>
            ${permitData.requiredPermits && permitData.requiredPermits.length > 0 ? 
                permitData.requiredPermits.map(permit => `
                    <div class="permit-card">
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

        <!-- Building Codes Section -->
        <div class="content-section">
            <h2 class="section-title">
                <div class="section-icon">📚</div>
                Applicable Building Codes
            </h2>
            <div class="codes-grid">
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
                        ✓ Must comply with local amendments to state codes
                    </div>
                </div>
            </div>
        </div>

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
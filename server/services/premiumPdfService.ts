import puppeteer from 'puppeteer';
import { promises as fs } from 'fs';
import path from 'path';

export interface ContractPdfData {
  client: {
    name: string;
    address: string;
    phone: string;
    email: string;
  };
  contractor: {
    name: string;
    address: string;
    phone: string;
    email: string;
    license?: string;
  };
  project: {
    type: string;
    description: string;
    location: string;
  };
  financials: {
    total: number;
  };
  protectionClauses?: Array<{
    title: string;
    content: string;
  }>;
}

class PremiumPdfService {
  private static instance: PremiumPdfService;

  static getInstance(): PremiumPdfService {
    if (!PremiumPdfService.instance) {
      PremiumPdfService.instance = new PremiumPdfService();
    }
    return PremiumPdfService.instance;
  }

  private generatePremiumContractHTML(data: ContractPdfData): string {
    const currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const protectionClausesHtml = data.protectionClauses?.map((clause, index) => `
      <div class="clause-card">
        <div class="clause-header">
          <div class="clause-number">${index + 1}</div>
          <h4 class="clause-title">${clause.title}</h4>
        </div>
        <div class="clause-content">
          <p>${clause.content}</p>
        </div>
      </div>
    `).join('') || '';

    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Independent Contractor Agreement</title>
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            body {
                font-family: 'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                font-size: 11pt;
                line-height: 1.7;
                color: #1a1a1a;
                background: #ffffff;
                margin: 0;
                padding: 40px;
                counter-reset: page;
            }
            
            .page {
                max-width: 210mm;
                min-height: 297mm;
                margin: 0 auto;
                position: relative;
                padding-bottom: 80px;
            }
            
            /* Premium Header Card */
            .header-card {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 30px;
                border-radius: 12px;
                box-shadow: 0 8px 32px rgba(102, 126, 234, 0.15);
                margin-bottom: 40px;
                text-align: center;
                position: relative;
                overflow: hidden;
            }
            
            .header-card::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="25" cy="25" r="1" fill="white" opacity="0.05"/><circle cx="75" cy="75" r="1" fill="white" opacity="0.05"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>');
                pointer-events: none;
            }
            
            .contract-title {
                font-size: 24pt;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 3px;
                margin-bottom: 8px;
                position: relative;
                z-index: 1;
            }
            
            .contract-subtitle {
                font-size: 14pt;
                font-weight: 400;
                opacity: 0.9;
                margin-bottom: 20px;
                position: relative;
                z-index: 1;
            }
            
            .contract-date {
                font-size: 12pt;
                font-weight: 500;
                position: relative;
                z-index: 1;
                padding: 8px 16px;
                background: rgba(255, 255, 255, 0.15);
                border-radius: 20px;
                display: inline-block;
                backdrop-filter: blur(10px);
            }
            
            /* Premium Information Cards */
            .parties-section {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 30px;
                margin-bottom: 40px;
            }
            
            .party-card {
                background: rgba(255, 255, 255, 0.8);
                backdrop-filter: blur(20px);
                border: 1px solid rgba(102, 126, 234, 0.1);
                border-radius: 16px;
                padding: 24px;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
                transition: all 0.3s ease;
                position: relative;
                overflow: hidden;
            }
            
            .party-card::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 4px;
                background: linear-gradient(90deg, #667eea, #764ba2);
                border-radius: 16px 16px 0 0;
            }
            
            .party-label {
                font-size: 14pt;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 1px;
                color: #667eea;
                margin-bottom: 16px;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            
            .party-label::before {
                content: '';
                width: 8px;
                height: 8px;
                background: #667eea;
                border-radius: 50%;
            }
            
            .party-name {
                font-size: 16pt;
                font-weight: 600;
                color: #1a1a1a;
                margin-bottom: 12px;
            }
            
            .party-details {
                color: #4a5568;
                line-height: 1.6;
            }
            
            .party-details div {
                margin-bottom: 4px;
            }
            
            /* Content Sections */
            .section-card {
                background: white;
                border-radius: 12px;
                padding: 24px;
                margin-bottom: 24px;
                box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
                border: 1px solid rgba(0, 0, 0, 0.05);
            }
            
            .section-title {
                font-size: 16pt;
                font-weight: 700;
                color: #2d3748;
                margin-bottom: 16px;
                padding-bottom: 8px;
                border-bottom: 2px solid #667eea;
                display: flex;
                align-items: center;
                gap: 12px;
            }
            
            .section-number {
                background: linear-gradient(135deg, #667eea, #764ba2);
                color: white;
                width: 32px;
                height: 32px;
                border-radius: 8px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: 600;
                font-size: 14pt;
            }
            
            .section-content {
                color: #4a5568;
                line-height: 1.8;
            }
            
            .section-content p {
                margin-bottom: 12px;
            }
            
            .section-content strong {
                color: #2d3748;
                font-weight: 600;
            }
            
            /* Premium Protection Clauses */
            .clause-card {
                background: linear-gradient(145deg, #f8fafc, #e2e8f0);
                border-radius: 12px;
                padding: 20px;
                margin-bottom: 16px;
                border-left: 4px solid #667eea;
                box-shadow: 0 2px 8px rgba(102, 126, 234, 0.1);
            }
            
            .clause-header {
                display: flex;
                align-items: center;
                gap: 12px;
                margin-bottom: 12px;
            }
            
            .clause-number {
                background: #667eea;
                color: white;
                width: 28px;
                height: 28px;
                border-radius: 6px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: 600;
                font-size: 12pt;
            }
            
            .clause-title {
                font-size: 14pt;
                font-weight: 600;
                color: #2d3748;
                margin: 0;
            }
            
            .clause-content {
                color: #4a5568;
                line-height: 1.7;
                margin-left: 40px;
            }
            
            /* Premium Signature Section */
            .signature-section {
                margin-top: 50px;
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 40px;
                page-break-inside: avoid;
            }
            
            .signature-card {
                background: white;
                border-radius: 12px;
                padding: 24px;
                box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
                border: 2px solid #e2e8f0;
                text-align: center;
                position: relative;
            }
            
            .signature-card::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 3px;
                background: linear-gradient(90deg, #667eea, #764ba2);
                border-radius: 12px 12px 0 0;
            }
            
            .signature-line {
                border-bottom: 2px solid #667eea;
                height: 60px;
                margin-bottom: 12px;
                position: relative;
            }
            
            .signature-label {
                font-weight: 700;
                font-size: 14pt;
                color: #2d3748;
                margin-bottom: 8px;
                text-transform: uppercase;
                letter-spacing: 1px;
            }
            
            .signature-name {
                font-size: 12pt;
                color: #4a5568;
                margin-bottom: 8px;
            }
            
            .signature-date {
                font-size: 10pt;
                color: #718096;
                padding: 4px 12px;
                background: #f7fafc;
                border-radius: 16px;
                display: inline-block;
            }
            
            /* Premium Footer with Pagination */
            .footer {
                position: fixed;
                bottom: 30px;
                left: 40px;
                right: 40px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 16px 24px;
                background: linear-gradient(135deg, #667eea, #764ba2);
                color: white;
                border-radius: 8px;
                font-size: 10pt;
                box-shadow: 0 -2px 12px rgba(102, 126, 234, 0.2);
            }
            
            .footer-left {
                display: flex;
                align-items: center;
                gap: 8px;
            }
            
            .footer-logo {
                width: 24px;
                height: 24px;
                background: white;
                border-radius: 4px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: 700;
                color: #667eea;
                font-size: 12pt;
            }
            
            .footer-text {
                font-weight: 500;
            }
            
            .footer-right {
                display: flex;
                align-items: center;
                gap: 12px;
            }
            
            .page-number {
                background: rgba(255, 255, 255, 0.2);
                padding: 6px 12px;
                border-radius: 16px;
                font-weight: 600;
                backdrop-filter: blur(10px);
            }
            
            .footer-divider {
                width: 1px;
                height: 20px;
                background: rgba(255, 255, 255, 0.3);
            }
            
            /* Print Styles */
            @media print {
                body { 
                    margin: 0; 
                    padding: 20px;
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                }
                .page-break { 
                    page-break-before: always; 
                }
                .footer {
                    position: fixed;
                    bottom: 0;
                }
            }
            
            /* Responsive adjustments */
            @media (max-width: 768px) {
                .parties-section {
                    grid-template-columns: 1fr;
                }
                .signature-section {
                    grid-template-columns: 1fr;
                }
            }
        </style>
    </head>
    <body>
        <div class="page">
            <!-- Premium Header Card -->
            <div class="header-card">
                <div class="contract-title">Independent Contractor Agreement</div>
                <div class="contract-subtitle">Professional Construction Services Contract</div>
                <div class="contract-date">${currentDate}</div>
            </div>

            <!-- Premium Parties Information -->
            <div class="parties-section">
                <div class="party-card">
                    <div class="party-label">Contractor</div>
                    <div class="party-name">${data.contractor.name}</div>
                    <div class="party-details">
                        <div><strong>Address:</strong> ${data.contractor.address}</div>
                        <div><strong>Phone:</strong> ${data.contractor.phone}</div>
                        <div><strong>Email:</strong> ${data.contractor.email}</div>
                        ${data.contractor.license ? `<div><strong>License:</strong> ${data.contractor.license}</div>` : ''}
                    </div>
                </div>

                <div class="party-card">
                    <div class="party-label">Client</div>
                    <div class="party-name">${data.client.name}</div>
                    <div class="party-details">
                        <div><strong>Address:</strong> ${data.client.address}</div>
                        <div><strong>Phone:</strong> ${data.client.phone}</div>
                        <div><strong>Email:</strong> ${data.client.email}</div>
                    </div>
                </div>
            </div>

            <!-- Project Description Section -->
            <div class="section-card">
                <div class="section-title">
                    <div class="section-number">1</div>
                    Project Description & Scope
                </div>
                <div class="section-content">
                    <p><strong>Project Type:</strong> ${data.project.type}</p>
                    <p><strong>Location:</strong> ${data.project.location}</p>
                    <p><strong>Description:</strong> ${data.project.description}</p>
                </div>
            </div>

            <!-- Financial Terms Section -->
            <div class="section-card">
                <div class="section-title">
                    <div class="section-number">2</div>
                    Financial Terms & Payment Schedule
                </div>
                <div class="section-content">
                    <p><strong>Total Contract Amount:</strong> $${data.financials.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    <p><strong>Payment Structure:</strong></p>
                    <ul style="margin-left: 20px; margin-top: 8px;">
                        <li>50% deposit upon contract execution: $${(data.financials.total * 0.5).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</li>
                        <li>50% final payment upon project completion: $${(data.financials.total * 0.5).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</li>
                    </ul>
                </div>
            </div>

            <!-- Scope of Work Section -->
            <div class="section-card">
                <div class="section-title">
                    <div class="section-number">3</div>
                    Scope of Work & Responsibilities
                </div>
                <div class="section-content">
                    <p>The Contractor agrees to provide all labor, materials, equipment, and services necessary for the completion of the work described in the project description above. This includes but is not limited to:</p>
                    <ul style="margin-left: 20px; margin-top: 12px;">
                        <li>Professional site preparation and cleanup</li>
                        <li>Supply of all materials meeting industry standards</li>
                        <li>Skilled labor and supervision</li>
                        <li>Compliance with all local building codes and regulations</li>
                        <li>Final inspection and quality assurance</li>
                    </ul>
                </div>
            </div>

            <!-- Timeline Section -->
            <div class="section-card">
                <div class="section-title">
                    <div class="section-number">4</div>
                    Project Timeline & Completion
                </div>
                <div class="section-content">
                    <p><strong>Commencement:</strong> Work shall commence within 5 business days of contract execution and receipt of initial payment.</p>
                    <p><strong>Completion:</strong> Project timeline will be determined based on scope complexity, weather conditions, and permit requirements.</p>
                    <p><strong>Communication:</strong> Regular progress updates will be provided to the client throughout the project duration.</p>
                </div>
            </div>

            ${protectionClausesHtml ? `
            <!-- Legal Protection Clauses Section -->
            <div class="section-card">
                <div class="section-title">
                    <div class="section-number">5</div>
                    Legal Protection & Risk Mitigation Clauses
                </div>
                <div class="section-content">
                    ${protectionClausesHtml}
                </div>
            </div>
            ` : ''}

            <!-- General Terms Section -->
            <div class="section-card">
                <div class="section-title">
                    <div class="section-number">${protectionClausesHtml ? '6' : '5'}</div>
                    General Terms & Conditions
                </div>
                <div class="section-content">
                    <p><strong>Entire Agreement:</strong> This contract constitutes the entire agreement between the parties and supersedes all prior negotiations, representations, or agreements.</p>
                    <p><strong>Modifications:</strong> Any modifications to this agreement must be made in writing and signed by both parties.</p>
                    <p><strong>Governing Law:</strong> This contract shall be governed by and construed in accordance with the laws of the State of California.</p>
                    <p><strong>Dispute Resolution:</strong> Any disputes arising from this contract will be resolved through binding arbitration in accordance with California state law.</p>
                </div>
            </div>

            <!-- Premium Signature Section -->
            <div class="signature-section">
                <div class="signature-card">
                    <div class="signature-line"></div>
                    <div class="signature-label">Contractor Signature</div>
                    <div class="signature-name">${data.contractor.name}</div>
                    <div class="signature-date">Date: ___________</div>
                </div>
                <div class="signature-card">
                    <div class="signature-line"></div>
                    <div class="signature-label">Client Signature</div>
                    <div class="signature-name">${data.client.name}</div>
                    <div class="signature-date">Date: ___________</div>
                </div>
            </div>
        </div>

        <!-- Premium Footer with Pagination -->
        <div class="footer">
            <div class="footer-left">
                <div class="footer-logo">🦉</div>
                <div class="footer-text">Owl Fence Legal Defense System</div>
            </div>
            <div class="footer-right">
                <div class="footer-text">Professional Contract Management</div>
                <div class="footer-divider"></div>
                <div class="page-number">Page <span class="page-counter"></span></div>
            </div>
        </div>

        <script>
            // Add page numbering
            document.addEventListener('DOMContentLoaded', function() {
                const pages = document.querySelectorAll('.page');
                const counters = document.querySelectorAll('.page-counter');
                
                counters.forEach((counter, index) => {
                    counter.textContent = \`\${index + 1} of \${pages.length}\`;
                });
            });
        </script>
    </body>
    </html>
    `;
  }

  async generatePDF(data: ContractPdfData): Promise<Buffer> {
    let browser;
    
    try {
      console.log('🎨 [PREMIUM PDF] Starting premium contract generation...');
      
      // Generate the premium HTML
      const html = this.generatePremiumContractHTML(data);
      
      // Use system Chrome executable
      const executablePath = '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium';

      // Launch Puppeteer with premium settings
      browser = await puppeteer.launch({
        headless: true,
        executablePath: executablePath,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
          '--disable-extensions',
          '--disable-plugins',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
          '--disable-features=TranslateUI',
          '--disable-ipc-flooding-protection'
        ]
      });

      const page = await browser.newPage();
      
      // Set content and generate PDF with premium settings
      await page.setContent(html, { waitUntil: 'networkidle0' });
      
      // Premium PDF generation with optimal settings
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        preferCSSPageSize: true,
        margin: {
          top: '20mm',
          right: '15mm',
          bottom: '25mm',
          left: '15mm'
        },
        displayHeaderFooter: false, // We use custom footer
        scale: 1.0
      });

      console.log('✅ [PREMIUM PDF] Premium contract generated successfully');
      return Buffer.from(pdfBuffer);
      
    } catch (error) {
      console.error('❌ [PREMIUM PDF] Error generating premium contract:', error);
      throw new Error(`Premium PDF generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  async savePDF(pdfBuffer: Buffer, filename: string): Promise<string> {
    try {
      const outputDir = path.join(process.cwd(), 'temp');
      await fs.mkdir(outputDir, { recursive: true });
      
      const filePath = path.join(outputDir, filename);
      await fs.writeFile(filePath, pdfBuffer);
      
      console.log('✅ [PREMIUM PDF] Premium contract saved successfully:', filePath);
      return filePath;
    } catch (error) {
      console.error('❌ [PREMIUM PDF] Error saving premium contract:', error);
      throw new Error(`Failed to save premium PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export const premiumPdfService = PremiumPdfService.getInstance();
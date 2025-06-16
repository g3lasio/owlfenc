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

class ProfessionalPdfService {
  private static instance: ProfessionalPdfService;

  static getInstance(): ProfessionalPdfService {
    if (!ProfessionalPdfService.instance) {
      ProfessionalPdfService.instance = new ProfessionalPdfService();
    }
    return ProfessionalPdfService.instance;
  }

  private generateProfessionalContractHTML(data: ContractPdfData): string {
    const currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Independent Contractor Agreement</title>
    <style>
        @page {
            size: Letter;
            margin: 0.75in 1in;
            @bottom-center {
                content: "Page " counter(page) " of " counter(pages);
                font-size: 10px;
                color: #666;
            }
        }
        
        body {
            font-family: 'Times New Roman', serif;
            font-size: 12px;
            line-height: 1.4;
            color: #000;
            margin: 0;
            padding: 0;
        }
        
        .contract-header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #000;
            padding-bottom: 15px;
        }
        
        .contract-title {
            font-size: 18px;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 15px;
        }
        
        .contract-subtitle {
            font-size: 14px;
            margin-bottom: 10px;
        }
        
        .parties-section {
            display: flex;
            justify-content: space-between;
            margin: 25px 0;
            border: 1px solid #000;
            padding: 15px;
        }
        
        .party {
            flex: 1;
            text-align: center;
            padding: 0 10px;
        }
        
        .party:first-child {
            border-right: 1px solid #000;
            padding-right: 20px;
        }
        
        .party:last-child {
            padding-left: 20px;
        }
        
        .party-title {
            font-size: 14px;
            font-weight: bold;
            text-transform: uppercase;
            margin-bottom: 10px;
            text-decoration: underline;
        }
        
        .party-info {
            font-size: 11px;
            line-height: 1.3;
        }
        
        .party-name {
            font-weight: bold;
            font-size: 12px;
            margin-bottom: 5px;
        }
        
        .section {
            margin: 20px 0;
            page-break-inside: avoid;
        }
        
        .section-title {
            font-size: 13px;
            font-weight: bold;
            text-transform: uppercase;
            margin-bottom: 10px;
            border-bottom: 1px solid #000;
            padding-bottom: 3px;
        }
        
        .section-content {
            text-align: justify;
            margin-left: 15px;
        }
        
        .clause {
            margin: 10px 0;
            text-align: justify;
        }
        
        .clause-title {
            font-weight: bold;
            margin-bottom: 5px;
        }
        
        .numbered-list {
            counter-reset: item;
            padding-left: 0;
        }
        
        .numbered-list li {
            display: block;
            margin: 8px 0;
            counter-increment: item;
        }
        
        .numbered-list li:before {
            content: counter(item) ". ";
            font-weight: bold;
            margin-right: 5px;
        }
        
        .signature-section {
            margin-top: 40px;
            page-break-inside: avoid;
        }
        
        .signature-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }
        
        .signature-table td {
            border: 1px solid #000;
            padding: 15px;
            vertical-align: top;
            width: 50%;
        }
        
        .signature-label {
            font-weight: bold;
            margin-bottom: 30px;
        }
        
        .signature-line {
            border-bottom: 1px solid #000;
            margin: 20px 0 5px 0;
            height: 1px;
        }
        
        .date-line {
            border-bottom: 1px solid #000;
            margin: 20px 0 5px 0;
            height: 1px;
            width: 150px;
        }
        
        .page-break {
            page-break-before: always;
        }
        
        .highlight {
            background-color: #f0f0f0;
            padding: 3px;
            border-radius: 2px;
        }
        
        .amount {
            font-weight: bold;
            text-decoration: underline;
        }
    </style>
</head>
<body>
    <div class="contract-header">
        <div class="contract-title">Independent Contractor Agreement</div>
        <div class="contract-subtitle">
            This Independent Contractor Agreement (the "Agreement") is dated this ${currentDate.split(',')[1].trim()}.
        </div>
    </div>

    <div class="parties-section">
        <div class="party">
            <div class="party-title">Client</div>
            <div class="party-name">${data.client.name}</div>
            <div class="party-info">
                ${data.client.address}<br>
                Phone: ${data.client.phone}<br>
                Email: ${data.client.email}<br>
                <em>(the "Client")</em>
            </div>
        </div>
        <div class="party">
            <div class="party-title">Contractor</div>
            <div class="party-name">${data.contractor.name}</div>
            <div class="party-info">
                ${data.contractor.address}<br>
                Phone: ${data.contractor.phone}<br>
                Email: ${data.contractor.email}<br>
                ${data.contractor.license ? `License: ${data.contractor.license}<br>` : ''}
                <em>(the "Contractor")</em>
            </div>
        </div>
    </div>

    <div class="section">
        <div class="section-title">1. Background</div>
        <div class="section-content">
            <p>The Client is of the opinion that the Contractor has the necessary qualifications, experience and abilities to provide services to the Client.</p>
            <p>The Contractor is agreeable to providing such services to the Client on the terms and conditions set out in this Agreement.</p>
        </div>
    </div>

    <div class="section">
        <div class="section-title">2. Services Provided</div>
        <div class="section-content">
            <p>The Client hereby agrees to engage the Contractor to provide the Client with the following services (the "Services"):</p>
            <div class="clause">
                <div class="clause-title">Project Description:</div>
                <p><span class="highlight">${data.project.description}</span></p>
            </div>
            <div class="clause">
                <div class="clause-title">Project Location:</div>
                <p>${data.project.location}</p>
            </div>
            <div class="clause">
                <div class="clause-title">Project Type:</div>
                <p>${data.project.type}</p>
            </div>
        </div>
    </div>

    <div class="section">
        <div class="section-title">3. Payment</div>
        <div class="section-content">
            <p>The Client will provide compensation to the Contractor for the Services as follows:</p>
            <ul class="numbered-list">
                <li>Total Contract Amount: <span class="amount">$${data.financials.total.toLocaleString()}</span></li>
                <li>Payment shall be made in accordance with the payment schedule agreed upon between the parties.</li>
                <li>Payment terms: Net 30 days from invoice date unless otherwise specified.</li>
                <li>All payments shall be made in United States Dollars.</li>
            </ul>
        </div>
    </div>

    <div class="section">
        <div class="section-title">4. Term and Termination</div>
        <div class="section-content">
            <ul class="numbered-list">
                <li>This Agreement shall commence on the date of execution and shall continue until the Services are completed to the satisfaction of both parties.</li>
                <li>Either party may terminate this Agreement at any time by providing thirty (30) days written notice to the other party.</li>
                <li>Upon termination, the Contractor shall be paid for all Services performed up to the date of termination.</li>
            </ul>
        </div>
    </div>

    <div class="section">
        <div class="section-title">5. Independent Contractor Status</div>
        <div class="section-content">
            <p>It is understood and agreed that the Contractor is an independent contractor and not an employee of the Client. The Contractor shall be responsible for:</p>
            <ul class="numbered-list">
                <li>All applicable taxes, including self-employment tax</li>
                <li>Obtaining and maintaining appropriate insurance coverage</li>
                <li>Providing all necessary tools and equipment</li>
                <li>Compliance with all applicable laws and regulations</li>
            </ul>
        </div>
    </div>

    <div class="page-break"></div>

    <div class="section">
        <div class="section-title">6. Quality of Work</div>
        <div class="section-content">
            <ul class="numbered-list">
                <li>The Contractor agrees to perform all Services in a professional and workmanlike manner.</li>
                <li>All work shall comply with applicable building codes, safety regulations, and industry standards.</li>
                <li>The Contractor warrants that all work will be free from defects for a period of one (1) year from completion.</li>
            </ul>
        </div>
    </div>

    <div class="section">
        <div class="section-title">7. Insurance and Liability</div>
        <div class="section-content">
            <ul class="numbered-list">
                <li>The Contractor shall maintain general liability insurance with minimum coverage of $1,000,000.</li>
                <li>The Contractor shall provide proof of insurance upon request.</li>
                <li>The Contractor shall indemnify and hold harmless the Client from any claims arising from the Contractor's performance of Services.</li>
            </ul>
        </div>
    </div>

    ${data.protectionClauses && data.protectionClauses.length > 0 ? `
    <div class="section">
        <div class="section-title">8. Additional Protective Clauses</div>
        <div class="section-content">
            ${data.protectionClauses.map((clause, index) => `
                <div class="clause">
                    <div class="clause-title">${index + 1}. ${clause.title}</div>
                    <p>${clause.content}</p>
                </div>
            `).join('')}
        </div>
    </div>
    ` : ''}

    <div class="section">
        <div class="section-title">9. General Provisions</div>
        <div class="section-content">
            <ul class="numbered-list">
                <li><strong>Entire Agreement:</strong> This Agreement constitutes the entire agreement between the parties and supersedes all prior negotiations, representations, or agreements.</li>
                <li><strong>Governing Law:</strong> This Agreement shall be governed by the laws of the State of California.</li>
                <li><strong>Amendments:</strong> This Agreement may only be amended in writing signed by both parties.</li>
                <li><strong>Severability:</strong> If any provision of this Agreement is deemed invalid or unenforceable, the remainder shall remain in full force and effect.</li>
            </ul>
        </div>
    </div>

    <div class="signature-section">
        <div class="section-title">Signatures</div>
        <p>By signing below, both parties acknowledge that they have read, understood, and agree to be bound by the terms and conditions of this Agreement.</p>
        
        <table class="signature-table">
            <tr>
                <td>
                    <div class="signature-label">CLIENT</div>
                    <div class="signature-line"></div>
                    <div style="margin-top: 5px; font-size: 10px;">Signature</div>
                    <div style="margin-top: 15px; font-weight: bold;">${data.client.name}</div>
                    <div style="margin-top: 10px;">
                        Date: <span class="date-line" style="display: inline-block;"></span>
                    </div>
                </td>
                <td>
                    <div class="signature-label">CONTRACTOR</div>
                    <div class="signature-line"></div>
                    <div style="margin-top: 5px; font-size: 10px;">Signature</div>
                    <div style="margin-top: 15px; font-weight: bold;">${data.contractor.name}</div>
                    <div style="margin-top: 10px;">
                        Date: <span class="date-line" style="display: inline-block;"></span>
                    </div>
                </td>
            </tr>
        </table>
    </div>
</body>
</html>`;
  }

  async generatePDF(data: ContractPdfData): Promise<Buffer> {
    console.log('🤖 [PDF] Starting professional contract PDF generation...');
    
    let browser;
    try {
      // Generate the professional HTML
      const html = this.generateProfessionalContractHTML(data);
      
      // Use system Chrome executable
      const executablePath = '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium';

      // Launch Puppeteer with system Chrome
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
          '--disable-renderer-backgrounding'
        ]
      });

      const page = await browser.newPage();
      
      // Set content and generate PDF
      await page.setContent(html, { waitUntil: 'networkidle0' });
      
      const pdfBuffer = await page.pdf({
        format: 'Letter',
        margin: {
          top: '0.75in',
          right: '1in',
          bottom: '0.75in',
          left: '1in'
        },
        printBackground: true,
        preferCSSPageSize: true,
        displayHeaderFooter: true,
        headerTemplate: '<div></div>',
        footerTemplate: '<div style="font-size: 10px; color: #666; text-align: center; width: 100%; margin: 0 auto;">Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>'
      });

      console.log('✅ [PDF] Professional contract PDF generated successfully');
      return Buffer.from(pdfBuffer);

    } catch (error) {
      console.error('❌ [PDF] Error generating contract PDF:', error);
      throw new Error(`PDF generation failed: ${error.message}`);
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  async savePDF(pdfBuffer: Buffer, filename: string): Promise<string> {
    try {
      const tempDir = path.join(process.cwd(), 'temp');
      await fs.mkdir(tempDir, { recursive: true });
      
      const filePath = path.join(tempDir, filename);
      await fs.writeFile(filePath, pdfBuffer);
      
      console.log('💾 [PDF] Contract PDF saved to:', filePath);
      return filePath;
    } catch (error) {
      console.error('❌ [PDF] Error saving contract PDF:', error);
      throw new Error(`Failed to save PDF: ${error.message}`);
    }
  }
}

export const professionalPdfService = ProfessionalPdfService.getInstance();
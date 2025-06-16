import puppeteer from 'puppeteer';

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

  generateProfessionalLegalContractHTML(data: ContractPdfData): string {
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
            size: A4;
            margin: 1in;
            @bottom-center {
                content: "Page " counter(page) " of " counter(pages);
                font-family: 'Times New Roman', serif;
                font-size: 10pt;
                color: #666;
            }
        }
        
        body {
            font-family: 'Times New Roman', serif;
            font-size: 11pt;
            line-height: 1.4;
            color: #000;
            background: white;
            margin: 0;
            padding: 0;
        }
        
        .container {
            max-width: 100%;
            margin: 0;
            padding: 0;
        }
        
        .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #000;
            padding-bottom: 15px;
        }
        
        .header h1 {
            font-size: 18pt;
            font-weight: bold;
            margin: 0;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        
        .section {
            margin-bottom: 25px;
            border: 1px solid #ccc;
            padding: 15px;
            background: #fafafa;
        }
        
        .section-title {
            font-size: 14pt;
            font-weight: bold;
            margin-bottom: 10px;
            text-transform: uppercase;
            border-bottom: 1px solid #666;
            padding-bottom: 5px;
        }
        
        .party-info {
            display: table;
            width: 100%;
            margin-bottom: 15px;
        }
        
        .party-column {
            display: table-cell;
            width: 50%;
            vertical-align: top;
            padding-right: 10px;
        }
        
        .party-box {
            border: 1px solid #000;
            padding: 10px;
            margin-bottom: 10px;
        }
        
        .party-label {
            font-weight: bold;
            font-size: 12pt;
            margin-bottom: 8px;
            text-decoration: underline;
        }
        
        .legal-text {
            text-align: justify;
            margin-bottom: 15px;
            text-indent: 20px;
        }
        
        .numbered-section {
            margin-bottom: 20px;
        }
        
        .section-number {
            font-weight: bold;
            margin-right: 5px;
        }
        
        .signature-section {
            margin-top: 40px;
            page-break-inside: avoid;
        }
        
        .signature-box {
            border: 1px solid #000;
            padding: 15px;
            margin-bottom: 20px;
        }
        
        .signature-line {
            border-bottom: 1px solid #000;
            height: 40px;
            margin-bottom: 5px;
        }
        
        .date-line {
            border-bottom: 1px solid #000;
            width: 150px;
            height: 25px;
            display: inline-block;
        }
        
        .page-break {
            page-break-before: always;
        }
        
        .clause-box {
            border: 1px solid #999;
            padding: 12px;
            margin: 10px 0;
            background: #f9f9f9;
        }
        
        .clause-title {
            font-weight: bold;
            font-size: 12pt;
            margin-bottom: 8px;
        }
        
        .footer-info {
            font-size: 9pt;
            color: #666;
            text-align: center;
            margin-top: 30px;
            border-top: 1px solid #ccc;
            padding-top: 10px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Independent Contractor Agreement</h1>
            <p style="margin: 10px 0; font-size: 12pt;">Date: ${currentDate}</p>
        </div>

        <div class="section">
            <div class="section-title">Parties to Agreement</div>
            <div class="party-info">
                <div class="party-column">
                    <div class="party-box">
                        <div class="party-label">CONTRACTOR:</div>
                        <p><strong>${data.contractor.name}</strong></p>
                        <p>${data.contractor.address}</p>
                        <p>Phone: ${data.contractor.phone}</p>
                        <p>Email: ${data.contractor.email}</p>
                        ${data.contractor.license ? `<p>License: ${data.contractor.license}</p>` : ''}
                    </div>
                </div>
                <div class="party-column">
                    <div class="party-box">
                        <div class="party-label">CLIENT:</div>
                        <p><strong>${data.client.name}</strong></p>
                        <p>${data.client.address}</p>
                        <p>Phone: ${data.client.phone}</p>
                        <p>Email: ${data.client.email}</p>
                    </div>
                </div>
            </div>
        </div>

        <div class="section">
            <div class="section-title">Project Description</div>
            <div class="party-box">
                <p><strong>Project Type:</strong> ${data.project.type}</p>
                <p><strong>Location:</strong> ${data.project.location}</p>
                <p><strong>Description:</strong></p>
                <div class="legal-text">${data.project.description.replace(/\n/g, '</p><p class="legal-text">')}</div>
                <p><strong>Total Contract Value:</strong> $${data.financials.total.toLocaleString()}</p>
            </div>
        </div>

        <div class="page-break"></div>

        <div class="section">
            <div class="section-title">Terms and Conditions</div>
            
            <div class="numbered-section">
                <p><span class="section-number">1. INDEPENDENT CONTRACTOR RELATIONSHIP</span></p>
                <div class="legal-text">
                    The Contractor is an independent contractor and not an employee, partner, or joint venturer of the Client. The Contractor will not be entitled to any benefits that the Client may make available to its employees, such as group health or life insurance, profit-sharing, or retirement benefits. The Contractor will be solely responsible for all tax returns and payments required to be filed with or made to any federal, state, or local tax authority with respect to the Contractor's performance of services and receipt of fees under this Agreement.
                </div>
            </div>

            <div class="numbered-section">
                <p><span class="section-number">2. SERVICES TO BE PERFORMED</span></p>
                <div class="legal-text">
                    The Contractor agrees to perform the services described in the Project Description section above. All services will be performed in a professional and workmanlike manner in accordance with industry standards and applicable building codes. The Contractor warrants that all work will be performed by properly licensed and insured personnel when required by law.
                </div>
            </div>

            <div class="numbered-section">
                <p><span class="section-number">3. COMPENSATION</span></p>
                <div class="legal-text">
                    In consideration for the services to be performed by the Contractor, the Client agrees to pay the Contractor the total amount of $${data.financials.total.toLocaleString()} according to the payment schedule agreed upon by both parties. Payment terms include a deposit of 50% upon signing this agreement, with the balance due upon completion of work and client approval.
                </div>
            </div>

            <div class="numbered-section">
                <p><span class="section-number">4. MATERIALS AND EQUIPMENT</span></p>
                <div class="legal-text">
                    Unless otherwise specified, the Contractor will provide all materials, equipment, and supplies necessary to complete the work described herein. All materials will be new and of good quality, conforming to applicable industry standards. The Contractor warrants all materials against defects for a period of one (1) year from completion of work.
                </div>
            </div>

            <div class="numbered-section">
                <p><span class="section-number">5. TIME OF PERFORMANCE</span></p>
                <div class="legal-text">
                    Work will commence within a reasonable time after execution of this agreement and receipt of any required permits. The Contractor will use reasonable efforts to complete the work in a timely manner, weather and other conditions permitting. Time extensions may be granted for circumstances beyond the Contractor's reasonable control, including but not limited to weather delays, permit delays, or changes requested by the Client.
                </div>
            </div>
        </div>

        <div class="page-break"></div>

        <div class="section">
            <div class="section-title">Additional Terms and Protections</div>
            
            <div class="numbered-section">
                <p><span class="section-number">6. LIABILITY AND INSURANCE</span></p>
                <div class="legal-text">
                    The Contractor maintains general liability insurance in the amount of not less than $1,000,000 per occurrence and agrees to provide evidence of such coverage upon request. Each party agrees to indemnify and hold harmless the other party from any claims, damages, or expenses arising from their own negligent acts or omissions in connection with this agreement.
                </div>
            </div>

            <div class="numbered-section">
                <p><span class="section-number">7. CHANGE ORDERS</span></p>
                <div class="legal-text">
                    Any changes to the scope of work described herein must be agreed to in writing by both parties before implementation. Change orders will include adjustments to contract price and completion time as applicable. No additional work will be performed without written authorization from the Client.
                </div>
            </div>

            <div class="numbered-section">
                <p><span class="section-number">8. PERMITS AND COMPLIANCE</span></p>
                <div class="legal-text">
                    The Contractor will obtain all necessary permits and approvals required for the work, unless specifically agreed otherwise in writing. All work will be performed in compliance with applicable building codes, regulations, and industry standards. Any permits obtained will be transferred to the Client upon completion of work.
                </div>
            </div>

            <div class="numbered-section">
                <p><span class="section-number">9. WARRANTY</span></p>
                <div class="legal-text">
                    The Contractor warrants all work performed under this agreement against defects in workmanship for a period of one (1) year from completion. This warranty does not cover damage due to normal wear and tear, abuse, or failure to properly maintain the work. The Contractor's obligation under this warranty is limited to repair or replacement of defective work.
                </div>
            </div>

            <div class="numbered-section">
                <p><span class="section-number">10. TERMINATION</span></p>
                <div class="legal-text">
                    Either party may terminate this agreement upon written notice if the other party materially breaches the agreement and fails to cure such breach within ten (10) days after written notice. In the event of termination, the Contractor will be compensated for work satisfactorily completed prior to termination.
                </div>
            </div>
        </div>

        ${data.protectionClauses && data.protectionClauses.length > 0 ? `
        <div class="page-break"></div>
        <div class="section">
            <div class="section-title">Project-Specific Protection Clauses</div>
            ${data.protectionClauses.map((clause, index) => `
                <div class="clause-box">
                    <div class="clause-title">${index + 11}. ${clause.title.toUpperCase()}</div>
                    <div class="legal-text">${clause.content}</div>
                </div>
            `).join('')}
        </div>
        ` : ''}

        <div class="page-break"></div>

        <div class="section">
            <div class="section-title">General Provisions</div>
            
            <div class="numbered-section">
                <p><span class="section-number">${data.protectionClauses ? data.protectionClauses.length + 11 : 11}. GOVERNING LAW</span></p>
                <div class="legal-text">
                    This Agreement shall be governed by and construed in accordance with the laws of the State of California, without regard to its conflict of laws principles. Any disputes arising under this Agreement shall be resolved in the courts of competent jurisdiction in the state where the work is performed.
                </div>
            </div>

            <div class="numbered-section">
                <p><span class="section-number">${data.protectionClauses ? data.protectionClauses.length + 12 : 12}. ENTIRE AGREEMENT</span></p>
                <div class="legal-text">
                    This Agreement constitutes the entire agreement between the parties and supersedes all prior negotiations, representations, or agreements relating to the subject matter hereof. This Agreement may not be amended except by written instrument signed by both parties.
                </div>
            </div>

            <div class="numbered-section">
                <p><span class="section-number">${data.protectionClauses ? data.protectionClauses.length + 13 : 13}. SEVERABILITY</span></p>
                <div class="legal-text">
                    If any provision of this Agreement is held to be invalid or unenforceable, the remaining provisions shall continue in full force and effect. The invalid provision shall be replaced by a valid provision that most closely approximates the intent and economic effect of the invalid provision.
                </div>
            </div>
        </div>

        <div class="signature-section">
            <div class="section-title">Signatures</div>
            
            <div style="display: table; width: 100%;">
                <div style="display: table-cell; width: 50%; padding-right: 20px;">
                    <div class="signature-box">
                        <p><strong>CONTRACTOR:</strong></p>
                        <div class="signature-line"></div>
                        <p>${data.contractor.name}</p>
                        <p>Date: <span class="date-line"></span></p>
                    </div>
                </div>
                <div style="display: table-cell; width: 50%;">
                    <div class="signature-box">
                        <p><strong>CLIENT:</strong></p>
                        <div class="signature-line"></div>
                        <p>${data.client.name}</p>
                        <p>Date: <span class="date-line"></span></p>
                    </div>
                </div>
            </div>
        </div>

        <div class="footer-info">
            <p>This Independent Contractor Agreement was prepared on ${currentDate}</p>
            <p>All parties should retain a copy of this executed agreement for their records</p>
        </div>
    </div>
</body>
</html>
    `;
  }

  async generateProfessionalPDF(data: ContractPdfData): Promise<Buffer> {
    console.log('🎨 [PREMIUM PDF] Starting premium contract generation...');
    
    try {
      const html = this.generateProfessionalLegalContractHTML(data);
      
      const browser = await puppeteer.launch({
        headless: true,
        executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu'
        ]
      });

      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      
      const pdfBuffer = Buffer.from(await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '1in',
          right: '1in',
          bottom: '1in',  
          left: '1in'
        },
        displayHeaderFooter: true,
        headerTemplate: '<div></div>',
        footerTemplate: `
          <div style="font-size: 10px; text-align: center; width: 100%; color: #666;">
            Page <span class="pageNumber"></span> of <span class="totalPages"></span>
          </div>
        `
      }));

      await browser.close();
      
      console.log('✅ [PREMIUM PDF] Premium contract generated successfully');
      return pdfBuffer;
      
    } catch (error) {
      console.error('❌ [PREMIUM PDF] Error generating PDF:', error);
      throw new Error('Failed to generate premium PDF contract');
    }
  }
}

export default PremiumPdfService;
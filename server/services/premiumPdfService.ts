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
  permitInfo?: {
    permitsRequired: boolean;
    responsibility: string;
    numbers: string;
  };
  timeline?: {
    startDate: string;
    endDate: string;
    estimatedDuration?: string;
  };
  warranties?: {
    workmanship: string;
    materials: string;
  };
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
            margin: 1in 1in 1in 1in;
            @bottom-center {
                content: "Page " counter(page) " of " counter(pages);
                font-family: 'Times New Roman', serif;
                font-size: 10pt;
                color: #666;
            }
        }
        
        body {
            font-family: 'Times New Roman', serif;
            font-size: 12pt;
            line-height: 1.5;
            color: #000;
            background: white;
            margin: 0;
            padding: 0;
        }
        
        .container {
            max-width: 100%;
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
            letter-spacing: 2px;
        }
        
        .date-section {
            text-align: right;
            margin: 20px 0;
            font-weight: bold;
        }
        
        .parties-section {
            margin: 30px 0;
        }
        
        .party-info {
            display: table;
            width: 100%;
            margin: 20px 0;
            border-collapse: separate;
            border-spacing: 20px 0;
        }
        
        .party-box {
            display: table-cell;
            width: 45%;
            border: 2px solid #000;
            padding: 20px;
            vertical-align: top;
        }
        
        .party-title {
            font-weight: bold;
            font-size: 14pt;
            text-align: center;
            margin-bottom: 15px;
            text-transform: uppercase;
            border-bottom: 1px solid #000;
            padding-bottom: 5px;
        }
        
        .party-details {
            line-height: 1.8;
        }
        
        .content-section {
            margin: 25px 0;
        }
        
        .section-title {
            font-size: 14pt;
            font-weight: bold;
            margin: 25px 0 15px 0;
            text-transform: uppercase;
            text-align: center;
            border-bottom: 1px solid #000;
            padding-bottom: 5px;
        }
        
        .legal-text {
            text-align: justify;
            margin-bottom: 15px;
            line-height: 1.6;
        }
        
        .numbered-section {
            margin-bottom: 25px;
        }
        
        .section-number {
            font-weight: bold;
            text-decoration: underline;
            font-size: 13pt;
        }
        
        .page-break {
            page-break-before: always;
            margin-top: 30px;
        }
        
        .signature-section {
            margin-top: 60px;
            page-break-inside: avoid;
        }
        
        .signature-container {
            display: table;
            width: 100%;
            margin: 40px 0;
            border-collapse: separate;
            border-spacing: 30px 0;
        }
        
        .signature-box {
            display: table-cell;
            width: 45%;
            border: 2px solid #000;
            padding: 30px 20px;
            vertical-align: top;
            text-align: center;
        }
        
        .signature-title {
            font-weight: bold;
            font-size: 14pt;
            margin-bottom: 30px;
            text-transform: uppercase;
        }
        
        .signature-line {
            border-bottom: 2px solid #000;
            height: 50px;
            margin: 25px 0;
        }
        
        .date-line {
            border-bottom: 1px solid #000;
            display: inline-block;
            width: 150px;
            height: 20px;
        }
        
        .footer-discrete {
            text-align: center;
            font-size: 8pt;
            color: #999;
            margin-top: 60px;
            border-top: 1px solid #ddd;
            padding-top: 10px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Independent Contractor Agreement</h1>
        </div>
        
        <div class="date-section">
            <strong>Agreement Date:</strong> ${currentDate}
        </div>

        <div class="parties-section">
            <div class="party-info">
                <div class="party-box">
                    <div class="party-title">Contractor</div>
                    <div class="party-details">
                        <p><strong>Business Name:</strong> ${data.contractor.name}</p>
                        <p><strong>Business Address:</strong><br>${data.contractor.address}</p>
                        <p><strong>Telephone:</strong> ${data.contractor.phone}</p>
                        <p><strong>Email:</strong> ${data.contractor.email}</p>
                    </div>
                </div>
                <div class="party-box">
                    <div class="party-title">Client</div>
                    <div class="party-details">
                        <p><strong>Full Name/Company:</strong> ${data.client.name}</p>
                        <p><strong>Property Address:</strong><br>${data.client.address}</p>
                        <p><strong>Telephone:</strong> ${data.client.phone}</p>
                        <p><strong>Email:</strong> ${data.client.email}</p>
                    </div>
                </div>
            </div>
        </div>

        <div class="content-section">
            <div class="section-title">WHEREAS CLAUSES</div>
            <p class="legal-text">
                <strong>WHEREAS,</strong> the Client desires to engage the services of an independent contractor to perform specialized ${data.project.type.toLowerCase()} work at the above-referenced property; and
            </p>
            <p class="legal-text">
                <strong>WHEREAS,</strong> the Contractor represents that it possesses the requisite skill, experience, expertise, and all necessary licenses to perform the specified work in accordance with industry standards and applicable regulations; and
            </p>
            <p class="legal-text">
                <strong>WHEREAS,</strong> both parties desire to establish clear terms and conditions governing their professional relationship and to define their respective rights, duties, and obligations;
            </p>
            <p class="legal-text">
                <strong>NOW, THEREFORE,</strong> in consideration of the mutual covenants, agreements, and undertakings contained herein, and for other good and valuable consideration, the receipt and sufficiency of which are hereby acknowledged, the parties agree as follows:
            </p>
        </div>

        <div class="content-section">
            <div class="numbered-section">
                <p><span class="section-number">1. SCOPE OF WORK AND SPECIFICATIONS</span></p>
                <p class="legal-text">
                    The Contractor hereby agrees to furnish all labor, materials, equipment, and services necessary to complete the following work: ${data.project.description}. Said work shall be performed at the following location: ${data.project.location}. All work shall be executed in a professional, workmanlike manner in strict accordance with industry best practices, applicable building codes, municipal regulations, and manufacturer specifications. The Contractor warrants that all work will meet or exceed industry standards for quality and durability.
                </p>
            </div>

            <div class="numbered-section">
                <p><span class="section-number">2. CONTRACT PRICE AND PAYMENT TERMS</span></p>
                <p class="legal-text">
                    The total contract price for all work, materials, and services described herein shall be <strong>$${data.financials.total.toLocaleString('en-US')} USD</strong>. Payment shall be made according to the following schedule: (a) Fifty percent (50%) of the total contract price is due and payable upon execution of this Agreement as a down payment, and (b) The remaining fifty percent (50%) balance is due and payable immediately upon substantial completion and Client's acceptance of the work. All payments shall be made in United States currency. Late payments shall accrue interest at the rate of one and one-half percent (1.5%) per month or the maximum rate permitted by law, whichever is less.
                </p>
            </div>

            <div class="numbered-section">
                <p><span class="section-number">3. COMMENCEMENT AND COMPLETION</span></p>
                <p class="legal-text">
                    ${this.generateTimelineSection(data.timeline)}
                </p>
            </div>

            <div class="numbered-section">
                <p><span class="section-number">4. INDEPENDENT CONTRACTOR STATUS</span></p>
                <p class="legal-text">
                    The Contractor is and shall remain an independent contractor in the performance of all work under this Agreement. Nothing contained herein shall be construed to create an employer-employee, partnership, joint venture, or agency relationship between the parties. The Contractor shall be solely responsible for all federal, state, and local taxes, withholdings, unemployment insurance, workers' compensation, and other statutory obligations. The Contractor retains the exclusive right to control the manner, method, and means of performing the contracted services, subject to achieving the specified results.
                </p>
            </div>

            <div class="numbered-section">
                <p><span class="section-number">5. MATERIALS, EQUIPMENT, AND WORKMANSHIP</span></p>
                <p class="legal-text">
                    Unless expressly specified otherwise in writing, the Contractor shall furnish and pay for all materials, equipment, tools, transportation, and incidental services necessary for the completion of the work. All materials shall be new, of first quality, and shall conform to applicable industry standards and manufacturer specifications. All equipment used shall be properly maintained and in safe working condition. The Contractor warrants that all work will be free from defects in materials and workmanship for a period of one (1) year from the date of completion.
                </p>
            </div>

        <div class="page-break"></div>
            
            <div class="numbered-section">
                <p><span class="section-number">6. INSURANCE AND LIABILITY</span></p>
                <p class="legal-text">
                    The Contractor shall maintain, at its own expense, comprehensive general liability insurance with minimum coverage limits of One Million Dollars ($1,000,000) per occurrence and Two Million Dollars ($2,000,000) aggregate, naming the Client as an additional insured. The Contractor shall also maintain workers' compensation insurance as required by law. Evidence of such insurance coverage shall be provided to the Client upon request. Each party agrees to indemnify, defend, and hold harmless the other party from and against any and all claims, damages, losses, costs, and expenses (including reasonable attorney fees) arising from or relating to their own negligent acts, errors, or omissions in connection with this Agreement.
                </p>
            </div>

            <div class="numbered-section">
                <p><span class="section-number">7. CHANGE ORDERS AND MODIFICATIONS</span></p>
                <p class="legal-text">
                    No changes, modifications, or alterations to the scope of work, specifications, or contract terms shall be valid or binding unless executed in writing and signed by both parties. Any approved change order shall specify the nature of the change, adjustment to the contract price (if any), and any modification to the completion schedule. The Contractor shall not proceed with any additional work without a signed written change order. Verbal agreements or understandings shall not be enforceable.
                </p>
            </div>

            <div class="numbered-section">
                <p><span class="section-number">8. PERMITS, LICENSES, AND CODE COMPLIANCE</span></p>
                <p class="legal-text">
                    ${this.generatePermitSection(data.permitInfo)}
                </p>
            </div>

            <div class="numbered-section">
                <p><span class="section-number">9. WARRANTY AND REMEDIES</span></p>
                <p class="legal-text">
                    ${this.generateWarrantySection(data.warranties)}
                </p>
            </div>

            <div class="numbered-section">
                <p><span class="section-number">10. DEFAULT AND TERMINATION</span></p>
                <p class="legal-text">
                    Either party may terminate this Agreement upon the material breach of the other party, provided that the breaching party is given written notice of the breach and fails to cure such breach within ten (10) days after receipt of notice. In the event of termination, the Contractor shall be entitled to payment for all work satisfactorily completed prior to termination, less any damages sustained by the Client as a result of Contractor's breach. The Client may also terminate this Agreement for convenience upon thirty (30) days written notice, in which case the Contractor shall be compensated for all work completed and materials ordered prior to termination.
                </p>
            </div>

            <div class="numbered-section">
                <p><span class="section-number">11. DISPUTE RESOLUTION</span></p>
                <p class="legal-text">
                    Any disputes arising under this Agreement shall first be addressed through good faith negotiations between the parties. If such negotiations fail to resolve the dispute within thirty (30) days, the matter shall be submitted to binding arbitration administered by the American Arbitration Association under its Construction Industry Arbitration Rules. The arbitration shall be conducted in the county where the work is performed. The prevailing party in any arbitration or legal proceeding shall be entitled to recover reasonable attorney fees and costs from the non-prevailing party.
                </p>
            </div>

            <div class="numbered-section">
                <p><span class="section-number">12. SAFETY AND COMPLIANCE</span></p>
                <p class="legal-text">
                    The Contractor shall maintain a safe work environment and comply with all applicable Occupational Safety and Health Administration (OSHA) regulations and industry safety standards. The Contractor shall be solely responsible for the safety of its employees, subcontractors, and work site. All personnel shall use appropriate personal protective equipment and follow established safety protocols. The Contractor shall immediately report any workplace accidents or injuries to the Client and appropriate authorities.
                </p>
            </div>
        </div>

        ${data.protectionClauses && data.protectionClauses.length > 0 ? `
        <div class="page-break"></div>
        <div class="content-section">
            <div class="section-title">PROJECT-SPECIFIC PROTECTION CLAUSES</div>
            ${data.protectionClauses.map((clause, index) => `
                <div class="numbered-section">
                    <p><span class="section-number">${index + 13}. ${clause.title.toUpperCase()}</span></p>
                    <p class="legal-text">${clause.content}</p>
                </div>
            `).join('')}
        </div>
        ` : ''}

        <div class="page-break"></div>

        <div class="content-section">
            <div class="section-title">GENERAL PROVISIONS</div>
            
            <div class="numbered-section">
                <p><span class="section-number">${data.protectionClauses ? data.protectionClauses.length + 13 : 13}. GOVERNING LAW AND JURISDICTION</span></p>
                <p class="legal-text">
                    This Agreement shall be governed by and construed in accordance with the laws of the State of California, without regard to its conflict of laws principles. The parties hereby consent to the exclusive jurisdiction of the state and federal courts located in the county where the work is performed for the resolution of any disputes arising under this Agreement. This Agreement shall be binding upon and inure to the benefit of the parties' respective heirs, successors, and assigns.
                </p>
            </div>

            <div class="numbered-section">
                <p><span class="section-number">${data.protectionClauses ? data.protectionClauses.length + 14 : 14}. ENTIRE AGREEMENT AND MODIFICATIONS</span></p>
                <p class="legal-text">
                    This Agreement constitutes the complete and exclusive statement of the agreement between the parties and supersedes all prior negotiations, representations, understandings, and agreements, whether written or oral, relating to the subject matter hereof. No amendment, modification, or waiver of any provision of this Agreement shall be effective unless set forth in a written document signed by both parties. No course of dealing or usage of trade shall be used to modify, interpret, supplement, or alter the terms of this Agreement.
                </p>
            </div>

            <div class="numbered-section">
                <p><span class="section-number">${data.protectionClauses ? data.protectionClauses.length + 15 : 15}. SEVERABILITY AND CONSTRUCTION</span></p>
                <p class="legal-text">
                    If any provision of this Agreement is held to be invalid, illegal, or unenforceable by a court of competent jurisdiction, the remaining provisions shall continue in full force and effect. Any invalid provision shall be replaced by a valid provision that most closely approximates the intent and economic effect of the invalid provision. The headings used in this Agreement are for convenience only and shall not affect the interpretation of any provision. This Agreement has been negotiated by the parties and shall not be construed against either party as the drafter.
                </p>
            </div>

            <div class="numbered-section">
                <p><span class="section-number">${data.protectionClauses ? data.protectionClauses.length + 16 : 16}. NOTICES</span></p>
                <p class="legal-text">
                    All notices required or permitted under this Agreement shall be in writing and shall be deemed to have been duly given when personally delivered, or three (3) days after being sent by certified mail, return receipt requested, postage prepaid, to the addresses set forth above or to such other address as either party may designate by written notice to the other party.
                </p>
            </div>
        </div>

        <div class="signature-section">
            <div class="section-title">EXECUTION</div>
            <p class="legal-text" style="text-align: center; margin-bottom: 30px;">
                <strong>IN WITNESS WHEREOF,</strong> the parties have executed this Independent Contractor Agreement as of the date first written above.
            </p>
            
            <div class="signature-container">
                <div class="signature-box">
                    <div class="signature-title">CONTRACTOR</div>
                    <div class="signature-line"></div>
                    <p><strong>${data.contractor.name}</strong></p>
                    <p>Print Name</p>
                    <br>
                    <p>Date: <span class="date-line"></span></p>
                </div>
                <div class="signature-box">
                    <div class="signature-title">CLIENT</div>
                    <div class="signature-line"></div>
                    <p><strong>${data.client.name}</strong></p>
                    <p>Print Name</p>
                    <br>
                    <p>Date: <span class="date-line"></span></p>
                </div>
            </div>
        </div>

        <div class="footer-discrete">
            Powered by Mervin AI
        </div>
    </div>
</body>
</html>
    `;
  }

  private generatePermitSection(permitInfo?: { permitsRequired: boolean; responsibility: string; numbers: string }): string {
    if (!permitInfo) {
      // Default permit section when no permitInfo is provided
      return `The Contractor shall obtain and pay for all permits, licenses, and approvals required by federal, state, and local authorities for the performance of the work, unless specifically agreed otherwise in writing. All work shall be performed in strict compliance with applicable building codes, zoning ordinances, environmental regulations, safety requirements, and industry standards. The Contractor shall schedule and coordinate all required inspections. Upon completion, all permits shall be properly closed out and documentation provided to the Client.`;
    }

    let permitText = '';
    
    if (permitInfo.permitsRequired) {
      if (permitInfo.responsibility === 'contractor') {
        permitText = `<strong>Contractor Responsibility:</strong> The Contractor shall obtain and pay for all permits, licenses, and approvals required by federal, state, and local authorities for the performance of the work. `;
      } else if (permitInfo.responsibility === 'client') {
        permitText = `<strong>Client Responsibility:</strong> The Client is responsible for obtaining and paying for all permits, licenses, and approvals required by federal, state, and local authorities for the performance of the work. The Contractor shall provide all necessary documentation and specifications required for permit applications. `;
      } else {
        permitText = `<strong>Shared Responsibility:</strong> Both parties agree to cooperate in obtaining all permits, licenses, and approvals required by federal, state, and local authorities for the performance of the work. Specific responsibilities shall be determined by mutual agreement in writing. `;
      }
      
      if (permitInfo.numbers && permitInfo.numbers.trim()) {
        permitText += `<strong>Permit Numbers:</strong> ${permitInfo.numbers}. `;
      }
    } else {
      permitText = `<strong>No Permits Required:</strong> Based on the scope of work, no permits are anticipated to be required for this project. However, if permits become necessary during the course of work, the parties agree to address permit requirements through a written change order. `;
    }
    
    permitText += `All work shall be performed in strict compliance with applicable building codes, zoning ordinances, environmental regulations, safety requirements, and industry standards. The responsible party shall schedule and coordinate all required inspections. Upon completion, all permits shall be properly closed out and documentation provided as appropriate.`;
    
    return permitText;
  }

  private generateTimelineSection(timeline?: { startDate: string; endDate: string; estimatedDuration?: string }): string {
    if (!timeline || (!timeline.startDate && !timeline.endDate)) {
      // Default timeline section when no timeline data is provided
      return `The Contractor shall commence work within ten (10) business days following execution of this Agreement and receipt of the initial payment, weather and site conditions permitting. The Contractor shall proceed with due diligence and in a timely manner to achieve substantial completion. Time is of the essence in this Agreement. The Contractor shall provide the Client with reasonable advance notice of any circumstances that may delay completion, including but not limited to adverse weather conditions, permit delays, or unforeseen site conditions.`;
    }

    let timelineText = '';
    
    if (timeline.startDate) {
      const startDate = new Date(timeline.startDate);
      const formattedStartDate = startDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      timelineText += `<strong>Project Start Date:</strong> Work shall commence on or about ${formattedStartDate}, subject to receipt of initial payment and favorable weather conditions. `;
    } else {
      timelineText += `The Contractor shall commence work within ten (10) business days following execution of this Agreement and receipt of the initial payment, weather and site conditions permitting. `;
    }

    if (timeline.endDate) {
      const endDate = new Date(timeline.endDate);
      const formattedEndDate = endDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      timelineText += `<strong>Substantial Completion Date:</strong> All work shall be substantially completed by ${formattedEndDate}. `;
    }

    if (timeline.startDate && timeline.endDate) {
      const start = new Date(timeline.startDate);
      const end = new Date(timeline.endDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      timelineText += `<strong>Project Duration:</strong> The estimated completion time is ${diffDays} calendar days. `;
    }

    timelineText += `Time is of the essence in this Agreement. The Contractor shall proceed with due diligence and in a timely manner to achieve substantial completion. The Contractor shall provide the Client with reasonable advance notice of any circumstances that may delay completion, including but not limited to adverse weather conditions, permit delays, or unforeseen site conditions. Extensions of time may be granted only through written agreement of both parties.`;

    return timelineText;
  }

  private generateWarrantySection(warranties?: { workmanship: string; materials: string }): string {
    if (!warranties || (!warranties.workmanship && !warranties.materials)) {
      // Default warranty section when no warranty data is provided
      return `The Contractor hereby warrants all work performed under this Agreement against defects in materials and workmanship for a period of twelve (12) months from the date of substantial completion. This warranty does not cover damage resulting from normal wear and tear, abuse, neglect, accident, or failure to properly maintain the work. Upon written notice of any warranty defect, the Contractor shall, at its option, repair or replace the defective work at no cost to the Client within thirty (30) days. This warranty is in addition to any manufacturer warranties that may apply to materials or equipment.`;
    }

    let warrantyText = '';
    
    if (warranties.workmanship) {
      warrantyText += `<strong>Workmanship Warranty:</strong> The Contractor hereby warrants all work performed under this Agreement against defects in workmanship for a period of ${warranties.workmanship} from the date of substantial completion. `;
    }
    
    if (warranties.materials) {
      warrantyText += `<strong>Materials Warranty:</strong> ${warranties.materials}. `;
    }

    warrantyText += `This warranty does not cover damage resulting from normal wear and tear, abuse, neglect, accident, or failure to properly maintain the work. Upon written notice of any warranty defect, the Contractor shall, at its option, repair or replace the defective work at no cost to the Client within thirty (30) days. These warranties are in addition to any manufacturer warranties that may apply to materials or equipment.`;

    return warrantyText;
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
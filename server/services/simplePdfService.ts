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

class SimplePdfService {
  private static instance: SimplePdfService;

  static getInstance(): SimplePdfService {
    if (!SimplePdfService.instance) {
      SimplePdfService.instance = new SimplePdfService();
    }
    return SimplePdfService.instance;
  }

  private generateContractHTML(data: ContractPdfData): string {
    const currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const protectionClausesHtml = data.protectionClauses?.map((clause, index) => `
      <div class="protection-clause">
        <h4>${index + 1}. ${clause.title}</h4>
        <p>${clause.content}</p>
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
                font-family: 'Times New Roman', serif;
                font-size: 12pt;
                line-height: 1.6;
                color: #000;
                background: #fff;
                margin: 0;
                padding: 20px;
            }
            
            .contract-header {
                text-align: center;
                margin-bottom: 30px;
                border-bottom: 2px solid #000;
                padding-bottom: 20px;
            }
            
            .contract-title {
                font-size: 18pt;
                font-weight: bold;
                text-transform: uppercase;
                letter-spacing: 2px;
                margin-bottom: 10px;
            }
            
            .contract-subtitle {
                font-size: 14pt;
                margin-bottom: 15px;
            }
            
            .parties-section {
                margin-bottom: 25px;
            }
            
            .party-info {
                margin-bottom: 15px;
                padding: 10px;
                border: 1px solid #ccc;
                background: #f9f9f9;
            }
            
            .party-label {
                font-weight: bold;
                text-transform: uppercase;
                margin-bottom: 5px;
                color: #333;
            }
            
            .section {
                margin-bottom: 20px;
                page-break-inside: avoid;
            }
            
            .section-title {
                font-size: 14pt;
                font-weight: bold;
                text-transform: uppercase;
                margin-bottom: 10px;
                border-bottom: 1px solid #000;
                padding-bottom: 5px;
            }
            
            .protection-clause {
                margin-bottom: 15px;
                padding: 10px;
                border-left: 3px solid #007acc;
                background: #f0f8ff;
            }
            
            .protection-clause h4 {
                font-weight: bold;
                margin-bottom: 5px;
                color: #007acc;
            }
            
            .signature-section {
                margin-top: 40px;
                display: flex;
                justify-content: space-between;
                page-break-inside: avoid;
            }
            
            .signature-block {
                width: 45%;
                border-top: 1px solid #000;
                padding-top: 10px;
                text-align: center;
            }
            
            .footer {
                margin-top: 30px;
                text-align: center;
                font-size: 10pt;
                color: #666;
                border-top: 1px solid #ccc;
                padding-top: 10px;
            }
            
            @media print {
                body { margin: 0; padding: 15px; }
                .page-break { page-break-before: always; }
            }
        </style>
    </head>
    <body>
        <div class="contract-header">
            <div class="contract-title">Independent Contractor Agreement</div>
            <div class="contract-subtitle">Professional Construction Services Contract</div>
            <div>Date: ${currentDate}</div>
        </div>

        <div class="parties-section">
            <div class="party-info">
                <div class="party-label">Contractor:</div>
                <div><strong>${data.contractor.name}</strong></div>
                <div>${data.contractor.address}</div>
                <div>Phone: ${data.contractor.phone}</div>
                <div>Email: ${data.contractor.email}</div>
                ${data.contractor.license ? `<div>License: ${data.contractor.license}</div>` : ''}
            </div>

            <div class="party-info">
                <div class="party-label">Client:</div>
                <div><strong>${data.client.name}</strong></div>
                <div>${data.client.address}</div>
                <div>Phone: ${data.client.phone}</div>
                <div>Email: ${data.client.email}</div>
            </div>
        </div>

        <div class="section">
            <div class="section-title">1. Project Description</div>
            <p><strong>Project Type:</strong> ${data.project.type}</p>
            <p><strong>Location:</strong> ${data.project.location}</p>
            <p><strong>Description:</strong> ${data.project.description}</p>
        </div>

        <div class="section">
            <div class="section-title">2. Financial Terms</div>
            <p><strong>Total Contract Amount:</strong> $${data.financials.total.toFixed(2)}</p>
            <p><strong>Payment Terms:</strong> 50% deposit upon contract signing, 50% upon project completion</p>
        </div>

        <div class="section">
            <div class="section-title">3. Scope of Work</div>
            <p>The Contractor agrees to provide all labor, materials, equipment, and services necessary for the completion of the work described in the project description above.</p>
        </div>

        <div class="section">
            <div class="section-title">4. Timeline</div>
            <p>Work shall commence upon receipt of signed contract and initial payment. Completion timeline will be determined based on project scope and weather conditions.</p>
        </div>

        ${protectionClausesHtml ? `
        <div class="section">
            <div class="section-title">5. Legal Protection Clauses</div>
            ${protectionClausesHtml}
        </div>
        ` : ''}

        <div class="section">
            <div class="section-title">6. General Terms</div>
            <p>This agreement constitutes the entire agreement between the parties. Any modifications must be made in writing and signed by both parties.</p>
            <p>This contract shall be governed by the laws of the State of California.</p>
        </div>

        <div class="signature-section">
            <div class="signature-block">
                <div>_________________________</div>
                <div><strong>Contractor Signature</strong></div>
                <div>${data.contractor.name}</div>
                <div>Date: ___________</div>
            </div>
            <div class="signature-block">
                <div>_________________________</div>
                <div><strong>Client Signature</strong></div>
                <div>${data.client.name}</div>
                <div>Date: ___________</div>
            </div>
        </div>

        <div class="footer">
            <p>This contract was generated on ${currentDate} using Owl Fence Legal Defense System</p>
            <p>Professional Construction Contract Management Platform</p>
        </div>
    </body>
    </html>
    `;
  }

  async generateHTML(data: ContractPdfData): Promise<string> {
    try {
      console.log('📄 [SIMPLE PDF] Generating contract HTML...');
      return this.generateContractHTML(data);
    } catch (error) {
      console.error('❌ [SIMPLE PDF] Error generating HTML:', error);
      throw new Error(`HTML generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async saveHTML(html: string, filename: string): Promise<string> {
    try {
      const outputDir = path.join(process.cwd(), 'temp');
      await fs.mkdir(outputDir, { recursive: true });
      
      const filePath = path.join(outputDir, filename);
      await fs.writeFile(filePath, html, 'utf-8');
      
      console.log('✅ [SIMPLE PDF] HTML saved successfully:', filePath);
      return filePath;
    } catch (error) {
      console.error('❌ [SIMPLE PDF] Error saving HTML:', error);
      throw new Error(`Failed to save HTML: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export const simplePdfService = SimplePdfService.getInstance();
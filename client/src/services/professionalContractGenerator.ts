/**
 * Professional Contract Generator Service
 * Generates comprehensive Independent Contractor Agreements based on extracted data and selected protections
 */

export interface ContractData {
  userId?: number; // ID del usuario/contratista logueado
  client: {
    name: string;
    address: string;
    email?: string;
    phone?: string;
  };
  contractor: {
    name: string;
    address: string;
    email?: string;
    phone?: string;
    license?: string;
  };
  project: {
    type: string;
    description: string;
    location: string;
    startDate?: string;
    endDate?: string;
  };
  financials: {
    total: number;
    subtotal?: number;
    tax?: number;
    taxRate?: number;
  };
  materials?: Array<{
    item: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    totalPrice: number;
  }>;
  protections: Array<{
    id: string;
    category: string;
    subcategory: string;
    clause: string;
  }>;
  paymentTerms: {
    total: number;
    retainer: number;
    schedule: string;
  };
  timeline: {
    startDate: string;
    estimatedCompletion: string;
  };
}

export class ProfessionalContractGenerator {
  generateContractHTML(data: ContractData): string {
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
        body {
            font-family: 'Times New Roman', serif;
            font-size: 12px;
            line-height: 1.6;
            margin: 40px;
            color: #000;
        }
        .header {
            text-align: center;
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 30px;
            text-transform: uppercase;
        }
        .parties {
            display: flex;
            justify-content: space-between;
            margin: 30px 0;
            border: 1px solid #000;
            padding: 20px;
        }
        .party {
            flex: 1;
            text-align: center;
        }
        .party-title {
            font-weight: bold;
            font-size: 14px;
            margin-bottom: 10px;
        }
        .section {
            margin: 25px 0;
        }
        .section-title {
            font-weight: bold;
            font-size: 14px;
            margin-bottom: 15px;
            text-transform: uppercase;
        }
        .clause {
            margin: 15px 0;
        }
        .clause-number {
            font-weight: bold;
            margin-right: 10px;
        }
        .signature-section {
            margin-top: 50px;
            page-break-inside: avoid;
        }
        .signature-line {
            border-bottom: 1px solid #000;
            width: 300px;
            margin: 30px 0 10px 0;
        }
        ul {
            margin: 10px 0;
            padding-left: 30px;
        }
        .footer {
            position: fixed;
            bottom: 20px;
            right: 20px;
            font-size: 10px;
        }
        .page-break {
            page-break-before: always;
        }
    </style>
</head>
<body>
    <div class="header">
        INDEPENDENT CONTRACTOR AGREEMENT
    </div>

    <p>THIS INDEPENDENT CONTRACTOR AGREEMENT (the "Agreement") is dated this ${currentDate}.</p>

    <div class="parties">
        <div class="party">
            <div class="party-title">CLIENT</div>
            <div>${data.client.name}</div>
            <div>${data.client.address}</div>
            ${data.client.email ? `<div>${data.client.email}</div>` : ''}
            ${data.client.phone ? `<div>${data.client.phone}</div>` : ''}
            <div style="margin-top: 20px;">(the "Client")</div>
        </div>
        <div class="party">
            <div class="party-title">CONTRACTOR</div>
            <div>${data.contractor.name}</div>
            <div>${data.contractor.address}</div>
            ${data.contractor.email ? `<div>${data.contractor.email}</div>` : ''}
            ${data.contractor.phone ? `<div>${data.contractor.phone}</div>` : ''}
            ${data.contractor.license ? `<div>License: ${data.contractor.license}</div>` : ''}
            <div style="margin-top: 20px;">(the "Contractor")</div>
        </div>
    </div>

    <div class="section">
        <div class="section-title">BACKGROUND</div>
        <p><strong>A.</strong> The Client is of the opinion that the Contractor has the necessary qualifications, experience and abilities to provide services to the Client.</p>
        <p><strong>B.</strong> The Contractor is agreeable to providing such services to the Client on the terms and conditions set out in this Agreement.</p>
    </div>

    <p>IN CONSIDERATION OF the matters described above and of the mutual benefits and obligations set forth in this Agreement, the receipt and sufficiency of which consideration is hereby acknowledged, the Client and the Contractor (individually the "Party" and collectively the "Parties" to this Agreement) agree as follows:</p>

    <div class="section">
        <div class="section-title">SERVICES PROVIDED</div>
        <div class="clause">
            <span class="clause-number">1.</span>
            The Client hereby agrees to engage the Contractor to provide the Client with the following services (the "Services"):
            <ul>
                <li>${data.project.description} at ${data.project.location}</li>
                ${data.materials ? data.materials.slice(0, 3).map(material => 
                    `<li>${material.item} (${material.quantity} ${material.unit})</li>`
                ).join('') : ''}
            </ul>
        </div>
        <div class="clause">
            <span class="clause-number">2.</span>
            The Services will also include any other tasks which the Parties may agree on. The Contractor hereby agrees to provide such Services to the Client.
        </div>
    </div>

    <div class="section">
        <div class="section-title">TERM OF AGREEMENT</div>
        <div class="clause">
            <span class="clause-number">3.</span>
            The term of this Agreement (the "Term") will begin on ${data.timeline.startDate} and will remain in full force and effect until the completion of the Services, subject to earlier termination as provided in this Agreement.
        </div>
    </div>

    <div class="section">
        <div class="section-title">PERFORMANCE</div>
        <div class="clause">
            <span class="clause-number">4.</span>
            The Parties agree to do everything necessary to ensure that the terms of this Agreement take effect.
        </div>
    </div>

    <div class="section">
        <div class="section-title">CURRENCY</div>
        <div class="clause">
            <span class="clause-number">5.</span>
            Except as otherwise provided in this Agreement, all monetary amounts referred to in this Agreement are in USD (US Dollars).
        </div>
    </div>

    <div class="section">
        <div class="section-title">COMPENSATION</div>
        <div class="clause">
            <span class="clause-number">6.</span>
            The Contractor will charge the Client a total fee of $${data.financials.total.toFixed(2)} for the Services (the "Compensation").
        </div>
        <div class="clause">
            <span class="clause-number">7.</span>
            A retainer of $${data.paymentTerms.retainer.toFixed(2)} (the "Retainer") is payable by the Client upon execution of this Agreement.
        </div>
        <div class="clause">
            <span class="clause-number">8.</span>
            For the remaining amount, the Client will be invoiced as follows:
            <ul>
                <li>${data.paymentTerms.schedule}</li>
            </ul>
        </div>
        <div class="clause">
            <span class="clause-number">9.</span>
            Invoices submitted by the Contractor to the Client are due within 30 days of receipt.
        </div>
        <div class="clause">
            <span class="clause-number">10.</span>
            The Compensation as stated in this Agreement does not include sales tax, or other applicable duties as may be required by law. Any sales tax and duties required by law will be charged to the Client in addition to the Compensation.
        </div>
    </div>

    ${this.generateProtectionClauses(data.protections)}

    <div class="section">
        <div class="section-title">INTEREST ON LATE PAYMENTS</div>
        <div class="clause">
            <span class="clause-number">13.</span>
            Interest payable on any overdue amounts under this Agreement is charged at a rate of 5.00% per annum or at the maximum rate enforceable under applicable legislation, whichever is lower.
        </div>
    </div>

    <div class="section">
        <div class="section-title">CONFIDENTIALITY</div>
        <div class="clause">
            <span class="clause-number">14.</span>
            Confidential information (the "Confidential Information") refers to any data or information relating to the business of the Client which would reasonably be considered to be proprietary to the Client including, but not limited to, accounting records, business processes, and client records and that is not generally known in the industry of the Client and where the release of that Confidential Information could reasonably be expected to cause harm to the Client.
        </div>
        <div class="clause">
            <span class="clause-number">15.</span>
            The Contractor agrees that they will not disclose, divulge, reveal, report or use, for any purpose, any Confidential Information which the Contractor has obtained, except as authorized by the Client or as required by law.
        </div>
    </div>

    <div class="section page-break">
        <div class="section-title">CAPACITY/INDEPENDENT CONTRACTOR</div>
        <div class="clause">
            <span class="clause-number">19.</span>
            In providing the Services under this Agreement it is expressly agreed that the Contractor is acting as an independent contractor and not as an employee. The Contractor and the Client acknowledge that this Agreement does not create a partnership or joint venture between them, and is exclusively a contract for service.
        </div>
    </div>

    <div class="section">
        <div class="section-title">GOVERNING LAW</div>
        <div class="clause">
            <span class="clause-number">35.</span>
            This Agreement will be governed by and construed in accordance with the laws determined by the project jurisdiction.
        </div>
    </div>

    <div class="section">
        <div class="section-title">SEVERABILITY</div>
        <div class="clause">
            <span class="clause-number">36.</span>
            In the event that any of the provisions of this Agreement are held to be invalid or unenforceable in whole or in part, all other provisions will nevertheless continue to be valid and enforceable with the invalid or unenforceable parts severed from the remainder of this Agreement.
        </div>
    </div>

    <div class="signature-section">
        <p><strong>IN WITNESS WHEREOF</strong> the Parties have duly affixed their signatures under hand and seal on this ${currentDate}.</p>
        
        <div style="margin-top: 50px;">
            <div class="signature-line"></div>
            <div>${data.client.name}</div>
            <div style="font-size: 10px;">Client Signature</div>
        </div>

        <div style="margin-top: 40px;">
            <div class="signature-line"></div>
            <div>${data.contractor.name}</div>
            <div style="font-size: 10px;">Contractor Signature</div>
        </div>
    </div>

    <div class="footer">
        Page 1 of 1
    </div>
</body>
</html>`;
  }

  private generateProtectionClauses(protections: ContractData['protections']): string {
    if (!protections || protections.length === 0) return '';

    let clauseNumber = 11;
    let html = '<div class="section"><div class="section-title">CONTRACTOR PROTECTIONS</div>';

    // Group protections by category
    const groupedProtections = protections.reduce((acc, protection) => {
      if (!acc[protection.category]) {
        acc[protection.category] = [];
      }
      acc[protection.category].push(protection);
      return acc;
    }, {} as Record<string, typeof protections>);

    Object.entries(groupedProtections).forEach(([category, categoryProtections]) => {
      html += `<div class="clause">
        <span class="clause-number">${clauseNumber}.</span>
        <strong>${category}:</strong>
        <ul>`;
      
      categoryProtections.forEach(protection => {
        html += `<li>${protection.clause}</li>`;
      });
      
      html += '</ul></div>';
      clauseNumber++;
    });

    html += '</div>';
    return html;
  }

  async generatePDF(contractHTML: string): Promise<Blob> {
    // This would typically use a PDF generation service
    // For now, we'll simulate the PDF generation
    const response = await fetch('/api/contracts/html-to-pdf', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ html: contractHTML }),
    });

    if (!response.ok) {
      throw new Error('Failed to generate PDF');
    }

    return response.blob();
  }
}

export const professionalContractGenerator = new ProfessionalContractGenerator();
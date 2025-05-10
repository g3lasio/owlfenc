import fs from 'fs';
import path from 'path';

interface ContractData {
  contractor: {
    name: string;
    address: string;
    phone: string;
    email: string;
    license: string;
  };
  client: {
    name: string;
    address: string;
    phone: string;
    email: string;
  };
  project: {
    description: string;
    startDate: string;
    completionDate: string;
    fenceType: string;
    fenceHeight: string;
    fenceLength: string;
    fenceMaterial: string;
    location: string;
  };
  compensation: {
    totalCost: string;
    depositAmount: string;
    paymentSchedule: string;
    formOfPayment: string;
  };
  additionalClauses?: string[];
  state: string;
}

/**
 * Genera un contrato HTML basado en la plantilla y los datos proporcionados
 * @param templatePath Ruta a la plantilla HTML del contrato
 * @param data Datos para completar el contrato
 * @returns HTML del contrato generado
 */
export function generateContractHTML(data: ContractData): string {
  try {
    // Leer la plantilla desde el archivo
    let templateHtml = '';
    
    // En entorno de navegador, usamos importación directa del template
    const templatePath = '/src/components/templates/contract-template.html';
    
    // Usar fetch para obtener la plantilla en el cliente
    const fetchTemplate = async () => {
      try {
        const response = await fetch(templatePath);
        if (!response.ok) {
          throw new Error(`Error fetching template: ${response.status}`);
        }
        return await response.text();
      } catch (error) {
        console.error('Error loading contract template:', error);
        throw error;
      }
    };
    
    // Placeholder para el HTML generado, se reemplazará con el resultado de la API
    return `
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Independent Contractor Agreement</title>
        <link
          href="https://fonts.googleapis.com/css2?family=Quantico:wght@400;700&display=swap"
          rel="stylesheet"
        />
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            padding: 40px;
            color: #333;
            background-color: #fdfdfd;
          }
          .container {
            max-width: 900px;
            margin: auto;
            border: 1px solid #ddd;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
          }
          h1, h2, h3 {
            text-align: center;
            font-family: "Quantico", sans-serif;
            color: #005b96;
          }
          .section {
            margin-bottom: 20px;
          }
          .section-title {
            font-weight: 700;
            margin-bottom: 8px;
            font-family: "Quantico", sans-serif;
            border-bottom: 2px solid #005b96;
            padding-bottom: 4px;
          }
          .signature-section {
            margin-top: 50px;
            display: flex;
            justify-content: space-between;
          }
          .signature {
            width: 45%;
            text-align: center;
          }
          .signature-line {
            border-bottom: 1px solid #000;
            margin-bottom: 5px;
            height: 2em;
          }
          .clause {
            margin-bottom: 12px;
            text-align: justify;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Independent Contractor Agreement</h1>
          <h2>Project Contract</h2>

          <div class="section">
            <div class="section-title">1. Parties</div>
            <p>
              <strong>Contractor:</strong> ${data.contractor.name}, ${data.contractor.address}, 
              ${data.contractor.phone}, ${data.contractor.email}, License #${data.contractor.license}
            </p>
            <p>
              <strong>Client:</strong> ${data.client.name}, ${data.client.address}, 
              ${data.client.phone}, ${data.client.email}
            </p>
          </div>

          <div class="section">
            <div class="section-title">2. Background</div>
            <p>This Agreement is made between the Contractor and Client for the installation of a fence as detailed below. Both parties agree to the terms and conditions outlined in this contract.</p>
          </div>

          <div class="section">
            <div class="section-title">3. Services Provided</div>
            <p>
              The Contractor will install a ${data.project.fenceType} fence at the Client's property located at ${data.project.location}. 
              The fence will be ${data.project.fenceHeight} high and ${data.project.fenceLength} long, constructed from ${data.project.fenceMaterial}.
              ${data.project.description}
            </p>
          </div>

          <div class="section">
            <div class="section-title">4. Term of Agreement</div>
            <p>Work will commence on ${data.project.startDate} with an estimated completion date of ${data.project.completionDate}.</p>
          </div>

          <div class="section">
            <div class="section-title">5. Compensation & Payment Terms</div>
            <p>
              The total cost for the services is ${data.compensation.totalCost}. A deposit of ${data.compensation.depositAmount} is required before work can begin.
              The remaining balance will be paid according to the following schedule: ${data.compensation.paymentSchedule}.
              Acceptable forms of payment include: ${data.compensation.formOfPayment}.
            </p>
          </div>

          <div class="section">
            <div class="section-title">6. Reimbursement & Expenses</div>
            <p>Any additional expenses not included in the original estimate must be approved in writing by the Client before being incurred. Approved additional expenses will be added to the final invoice.</p>
          </div>

          <div class="section">
            <div class="section-title">7. Interest on Late Payments</div>
            <p>Payments not received within 10 days of the due date will incur a late fee of 1.5% per month (18% per annum) on the outstanding balance.</p>
          </div>

          <div class="section">
            <div class="section-title">8. Confidentiality</div>
            <p>Both parties agree to maintain the confidentiality of any proprietary information disclosed during the course of this Agreement.</p>
          </div>

          <div class="section">
            <div class="section-title">9. Intellectual Property Ownership</div>
            <p>All designs, plans, and specifications created for this project remain the property of the Contractor.</p>
          </div>

          <div class="section">
            <div class="section-title">10. Return of Property</div>
            <p>Upon termination of this Agreement, each party will promptly return all property belonging to the other party.</p>
          </div>

          <div class="section">
            <div class="section-title">11. Independent Contractor Status</div>
            <p>The Contractor is an independent contractor and not an employee of the Client. The Contractor is responsible for all taxes, insurance, and benefits related to their business.</p>
          </div>

          <div class="section">
            <div class="section-title">12. Right of Substitution</div>
            <p>The Contractor may, at their discretion, engage subcontractors to perform portions of the work, provided that the Contractor remains responsible for all work performed.</p>
          </div>

          <div class="section">
            <div class="section-title">13. Autonomy & Equipment</div>
            <p>The Contractor will provide all tools, equipment, and materials necessary to complete the work unless otherwise specified. The Contractor controls the method and means of performing the services.</p>
          </div>

          <div class="section">
            <div class="section-title">14. Non-Exclusivity</div>
            <p>This Agreement does not create an exclusive relationship between the parties. Both parties are free to enter into similar agreements with other parties.</p>
          </div>

          <div class="section">
            <div class="section-title">15. Notice & Communication</div>
            <p>All notices under this Agreement must be in writing and delivered to the addresses listed above, or by email with confirmation of receipt.</p>
          </div>

          <div class="section">
            <div class="section-title">16. Indemnification</div>
            <p>Each party agrees to indemnify and hold harmless the other party from any claims, damages, and expenses arising from the indemnifying party's negligence or breach of this Agreement.</p>
          </div>

          <div class="section">
            <div class="section-title">17. Force Majeure</div>
            <p>Neither party shall be liable for delays or failures in performance resulting from causes beyond their reasonable control, including acts of God, labor disputes, or other force majeure events.</p>
          </div>

          <div class="section">
            <div class="section-title">18. Final Acceptance of Work</div>
            <p>The Client shall inspect the completed work within 7 days of notice of completion. If no objections are raised within this period, the work shall be deemed accepted.</p>
          </div>

          <div class="section">
            <div class="section-title">19. Permits & Licenses</div>
            <p>The Client is responsible for securing and paying for all necessary permits, inspections, and approvals required for the project.</p>
          </div>

          <div class="section">
            <div class="section-title">20. Consequential Damages</div>
            <p>Neither party shall be liable for any indirect, special, or consequential damages arising out of or in connection with this Agreement.</p>
          </div>

          <div class="section">
            <div class="section-title">21. Site Access & Safety</div>
            <p>The Client shall provide the Contractor with reasonable access to the work site and ensure that the site is safe and ready for the work to be performed.</p>
          </div>

          <div class="section">
            <div class="section-title">22. Weather Delays</div>
            <p>The Contractor shall not be penalized for delays caused by adverse weather conditions that make it unsafe or impractical to perform the work.</p>
          </div>

          <div class="section">
            <div class="section-title">23. Code Compliance</div>
            <p>The Contractor will comply with all relevant building codes in effect at the time this Agreement is signed. Changes in code requirements after this date may result in additional charges.</p>
          </div>

          <div class="section">
            <div class="section-title">24. Attorney's Fees & Litigation Costs</div>
            <p>In the event of litigation arising from this Agreement, the prevailing party shall be entitled to recover reasonable attorney's fees and costs.</p>
          </div>

          <div class="section">
            <div class="section-title">25. Termination & Dispute Resolution</div>
            <p>Either party may terminate this Agreement for cause with 7 days' written notice if the other party is in breach and fails to cure within that period. All disputes shall be resolved through binding arbitration.</p>
          </div>

          <div class="section">
            <div class="section-title">26. Modification & Amendments</div>
            <p>This Agreement may only be modified by a written amendment signed by both parties.</p>
          </div>

          <div class="section">
            <div class="section-title">27. Time is of the Essence</div>
            <p>Time is of the essence in the performance of this Agreement. Any anticipated delays must be communicated promptly to the other party.</p>
          </div>

          <div class="section">
            <div class="section-title">28. Assignment & Transfer</div>
            <p>Neither party may assign their rights or obligations under this Agreement without the prior written consent of the other party.</p>
          </div>

          <div class="section">
            <div class="section-title">29. Entire Agreement & Severability</div>
            <p>This Agreement constitutes the entire understanding between the parties. If any provision is held invalid, the remaining provisions shall remain in effect.</p>
          </div>

          <div class="section">
            <div class="section-title">30. Governing Law</div>
            <p>This Agreement shall be governed by and interpreted under the laws of the State of ${data.state}, applicable at the location where services are rendered, without regard to its conflict of law provisions.</p>
          </div>

          ${data.additionalClauses && data.additionalClauses.length > 0 ? `
          <div class="section">
            <div class="section-title">31. Additional Clauses</div>
            ${data.additionalClauses.map((clause, index) => `
              <p class="clause">${index + 1}. ${clause}</p>
            `).join('')}
          </div>
          ` : ''}

          <div class="signature-section">
            <div class="signature">
              <div class="signature-line"></div>
              <p>Contractor Signature</p>
              <p>Date: ____________</p>
            </div>
            <div class="signature">
              <div class="signature-line"></div>
              <p>Client Signature</p>
              <p>Date: ____________</p>
            </div>
          </div>
        </div>
      </body>
    </html>
    `;
  } catch (error) {
    console.error('Error generating contract:', error);
    throw error;
  }
}

/**
 * Convierte los datos extraídos por la API a formato ContractData
 * @param extractedData Datos extraídos por la API
 * @returns Datos formateados para generar el contrato
 */
export function formatContractData(extractedData: any): ContractData {
  const contractorName = extractedData.contratista?.nombre || 'Owl Fence Co.';
  const contractorAddress = extractedData.contratista?.direccion || '2901 Owens Ct, Fairfield, CA 94534 US';
  const contractorPhone = extractedData.contratista?.telefono || '(202) 549-3519';
  const contractorEmail = extractedData.contratista?.email || 'contact@owlfence.com';
  const contractorLicense = extractedData.contratista?.licencia || 'OWL-2023-CA';
  
  return {
    contractor: {
      name: contractorName,
      address: contractorAddress,
      phone: contractorPhone,
      email: contractorEmail,
      license: contractorLicense
    },
    client: {
      name: extractedData.cliente?.nombre || '[CLIENTE NO IDENTIFICADO]',
      address: extractedData.cliente?.direccion || '[DIRECCIÓN NO IDENTIFICADA]',
      phone: extractedData.cliente?.telefono || '[TELÉFONO NO IDENTIFICADO]',
      email: extractedData.cliente?.email || '[EMAIL NO IDENTIFICADO]'
    },
    project: {
      description: extractedData.proyecto?.descripcion || 'Instalación de cerca conforme a las especificaciones adjuntas.',
      startDate: extractedData.proyecto?.fechaInicio || 'Fecha a determinar',
      completionDate: extractedData.proyecto?.fechaFinalizacion || 'Dentro de 3 semanas desde el inicio',
      fenceType: extractedData.proyecto?.tipoCerca || 'residencial',
      fenceHeight: extractedData.proyecto?.altura || '6 pies',
      fenceLength: extractedData.proyecto?.longitud || '[LONGITUD NO IDENTIFICADA]',
      fenceMaterial: extractedData.proyecto?.material || 'madera tratada',
      location: extractedData.cliente?.direccion || '[UBICACIÓN NO IDENTIFICADA]'
    },
    compensation: {
      totalCost: extractedData.presupuesto?.total || '[COSTO TOTAL NO IDENTIFICADO]',
      depositAmount: extractedData.presupuesto?.deposito || '50% del costo total',
      paymentSchedule: extractedData.presupuesto?.formaPago || 'Saldo restante a la finalización del proyecto',
      formOfPayment: 'Efectivo, Cheque, Transferencia Bancaria, Tarjeta de Crédito'
    },
    additionalClauses: extractedData.clausulasAdicionales || [],
    state: 'California'
  };
}
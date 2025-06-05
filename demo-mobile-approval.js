/**
 * Demostración completa del sistema móvil de aprobación de estimados
 */

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// Datos de prueba del estimado
const demoEstimate = {
  estimateNumber: 'EST-DEMO-2025',
  date: new Date().toLocaleDateString('es-ES'),
  client: {
    name: 'Gelasio Chyrris',
    email: 'gelasio@chyrris.com',
    phone: '+1 (555) 123-4567',
    address: '123 Demo Street, San Francisco, CA 94102'
  },
  contractor: {
    companyName: 'Owl Fenc LLC',
    name: 'Owl Fenc',
    email: 'info@chyrris.com',
    phone: '202 549 3519',
    address: '2901 Owens Court',
    city: 'Fairfield',
    state: 'California',
    zipCode: '94534',
    license: 'LIC-12345',
    website: 'owlfenc.com'
  },
  project: {
    type: 'Construcción de Cerca',
    description: 'Instalación de cerca perimetral',
    scopeOfWork: 'Demolición de concreto 2450 sqft, instalación de postes y alambre'
  },
  items: [
    {
      id: '1',
      name: 'Grapa para cerca',
      description: 'Grapas galvanizadas para fijar alambre a postes de madera',
      quantity: 5,
      unit: 'caja',
      unitPrice: 8.20,
      total: 41.00
    },
    {
      id: '2',
      name: 'Demolición de concreto',
      description: 'Demolición profesional de superficie existente',
      quantity: 2450,
      unit: 'sqft',
      unitPrice: 2.50,
      total: 6125.00
    },
    {
      id: '3',
      name: 'Instalación de postes',
      description: 'Postes galvanizados con instalación profesional',
      quantity: 20,
      unit: 'poste',
      unitPrice: 45.00,
      total: 900.00
    }
  ],
  subtotal: 7066.00,
  tax: 613.30,
  taxRate: 8.68,
  total: 7679.30,
  notes: 'Proyecto incluye garantía de 2 años en materiales y mano de obra.'
};

function generateEstimateHTML(estimate) {
  const baseUrl = 'http://localhost:5000';
  
  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Estimado Profesional - ${estimate.estimateNumber}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
          background: #f8fafc;
          color: #1f2937;
        }
        
        .email-container {
          max-width: 600px;
          margin: 0 auto;
          background: white;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 10px 25px rgba(0,0,0,0.1);
        }
        
        .header {
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          padding: 30px;
          text-align: center;
        }
        
        .header h1 {
          font-size: 28px;
          margin-bottom: 8px;
        }
        
        .header p {
          opacity: 0.9;
          font-size: 16px;
        }
        
        .content {
          padding: 30px;
        }
        
        .section {
          margin-bottom: 30px;
        }
        
        .section h2 {
          color: #10b981;
          font-size: 20px;
          margin-bottom: 15px;
          border-bottom: 2px solid #e5f9f5;
          padding-bottom: 8px;
        }
        
        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 20px;
        }
        
        .info-card {
          background: #f8fafc;
          padding: 20px;
          border-radius: 8px;
          border-left: 4px solid #10b981;
        }
        
        .info-card h3 {
          color: #374151;
          margin-bottom: 10px;
          font-size: 16px;
        }
        
        .info-card p {
          margin: 4px 0;
          color: #6b7280;
        }
        
        .items-table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
          background: white;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        
        .items-table th {
          background: #10b981;
          color: white;
          padding: 15px;
          text-align: left;
          font-weight: 600;
        }
        
        .items-table td {
          padding: 15px;
          border-bottom: 1px solid #e5e7eb;
        }
        
        .items-table tr:last-child td {
          border-bottom: none;
        }
        
        .total-section {
          background: #f8fafc;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
        }
        
        .total-row {
          display: flex;
          justify-content: space-between;
          margin: 8px 0;
          padding: 4px 0;
        }
        
        .total-row.final {
          border-top: 2px solid #10b981;
          padding-top: 12px;
          margin-top: 12px;
          font-weight: bold;
          font-size: 18px;
          color: #10b981;
        }
        
        .action-buttons {
          text-align: center;
          margin: 40px 0;
          padding: 30px;
          background: linear-gradient(135deg, #f0f9ff, #e0f2fe);
          border-radius: 12px;
        }
        
        .action-buttons h3 {
          margin-bottom: 20px;
          color: #374151;
        }
        
        .btn {
          display: inline-block;
          padding: 15px 30px;
          margin: 10px;
          text-decoration: none;
          border-radius: 8px;
          font-weight: 600;
          font-size: 16px;
          transition: all 0.3s ease;
          min-width: 200px;
        }
        
        .btn-approve {
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
        }
        
        .btn-approve:hover {
          background: linear-gradient(135deg, #059669, #047857);
          transform: translateY(-2px);
        }
        
        .btn-adjust {
          background: linear-gradient(135deg, #f59e0b, #d97706);
          color: white;
        }
        
        .btn-adjust:hover {
          background: linear-gradient(135deg, #d97706, #b45309);
          transform: translateY(-2px);
        }
        
        .notes {
          background: #fffbeb;
          border-left: 4px solid #f59e0b;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
        }
        
        .footer {
          background: #374151;
          color: white;
          padding: 30px;
          text-align: center;
        }
        
        .footer p {
          margin: 5px 0;
          opacity: 0.8;
        }
        
        @media (max-width: 600px) {
          .info-grid {
            grid-template-columns: 1fr;
          }
          
          .items-table {
            font-size: 14px;
          }
          
          .items-table th,
          .items-table td {
            padding: 10px 8px;
          }
          
          .btn {
            display: block;
            margin: 10px 0;
            width: 100%;
          }
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="header">
          <h1>📋 Estimado Profesional</h1>
          <p>Estimado ${estimate.estimateNumber} - ${estimate.date}</p>
        </div>
        
        <div class="content">
          <div class="section">
            <h2>Información del Proyecto</h2>
            <div class="info-grid">
              <div class="info-card">
                <h3>👤 Cliente</h3>
                <p><strong>${estimate.client.name}</strong></p>
                <p>📧 ${estimate.client.email}</p>
                <p>📞 ${estimate.client.phone}</p>
                <p>📍 ${estimate.client.address}</p>
              </div>
              
              <div class="info-card">
                <h3>🏢 Contratista</h3>
                <p><strong>${estimate.contractor.companyName}</strong></p>
                <p>📧 ${estimate.contractor.email}</p>
                <p>📞 ${estimate.contractor.phone}</p>
                <p>📍 ${estimate.contractor.address}</p>
                <p>🌐 ${estimate.contractor.website}</p>
              </div>
            </div>
            
            <div class="info-card">
              <h3>🔨 Proyecto</h3>
              <p><strong>Tipo:</strong> ${estimate.project.type}</p>
              <p><strong>Descripción:</strong> ${estimate.project.description}</p>
              <p><strong>Alcance:</strong> ${estimate.project.scopeOfWork}</p>
            </div>
          </div>
          
          <div class="section">
            <h2>Desglose de Costos</h2>
            <table class="items-table">
              <thead>
                <tr>
                  <th>Descripción</th>
                  <th>Cantidad</th>
                  <th>Precio Unit.</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                ${estimate.items.map(item => `
                  <tr>
                    <td>
                      <strong>${item.name}</strong><br>
                      <small style="color: #6b7280;">${item.description}</small>
                    </td>
                    <td>${item.quantity} ${item.unit}</td>
                    <td>$${item.unitPrice.toFixed(2)}</td>
                    <td><strong>$${item.total.toFixed(2)}</strong></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            
            <div class="total-section">
              <div class="total-row">
                <span>Subtotal:</span>
                <span>$${estimate.subtotal.toFixed(2)}</span>
              </div>
              <div class="total-row">
                <span>Impuestos (${estimate.taxRate}%):</span>
                <span>$${estimate.tax.toFixed(2)}</span>
              </div>
              <div class="total-row final">
                <span>TOTAL:</span>
                <span>$${estimate.total.toFixed(2)}</span>
              </div>
            </div>
          </div>
          
          ${estimate.notes ? `
          <div class="notes">
            <h3>📝 Notas Importantes</h3>
            <p>${estimate.notes}</p>
          </div>
          ` : ''}
          
          <div class="action-buttons">
            <h3>¿Qué desea hacer con este estimado?</h3>
            <a href="${baseUrl}/api/simple-estimate/approve?estimateId=${estimate.estimateNumber}&clientEmail=${estimate.client.email}" 
               class="btn btn-approve">
              ✅ Aprobar Estimado
            </a>
            <a href="${baseUrl}/api/simple-estimate/adjust?estimateId=${estimate.estimateNumber}&clientEmail=${estimate.client.email}" 
               class="btn btn-adjust">
              📝 Solicitar Ajustes
            </a>
          </div>
        </div>
        
        <div class="footer">
          <p><strong>${estimate.contractor.companyName}</strong></p>
          <p>Este estimado es válido por 30 días desde la fecha de emisión</p>
          <p>Para preguntas, contacte: ${estimate.contractor.email}</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

async function sendDemoEstimate() {
  console.log('📱 Enviando estimado de demostración...');
  
  try {
    // Primero guardar el estimado en el sistema
    const estimateForSystem = {
      estimateNumber: demoEstimate.estimateNumber,
      clientName: demoEstimate.client.name,
      clientEmail: demoEstimate.client.email,
      contractorEmail: demoEstimate.contractor.email,
      total: demoEstimate.total.toFixed(2),
      projectType: demoEstimate.project.type,
      status: 'sent',
      date: new Date().toISOString(),
      items: demoEstimate.items
    };

    // Enviar POST al endpoint para guardar el estimado
    const saveResponse = await fetch('http://localhost:5000/api/simple-estimate/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(estimateForSystem)
    });

    if (!saveResponse.ok) {
      console.log('⚠️ No se pudo guardar en el sistema, continuando con email...');
    } else {
      console.log('✅ Estimado guardado en el sistema');
    }

    const html = generateEstimateHTML(demoEstimate);
    
    const emailData = {
      from: 'onboarding@resend.dev',
      to: [demoEstimate.client.email],
      subject: `Estimado Profesional - ${demoEstimate.estimateNumber} - ${demoEstimate.contractor.companyName}`,
      html: html
    };

    const result = await resend.emails.send(emailData);
    
    if (result.error) {
      console.error('❌ Error enviando estimado:', result.error);
      return false;
    }
    
    console.log('✅ Estimado enviado exitosamente');
    console.log('📧 ID del email:', result.data?.id);
    console.log('📬 Destinatario:', demoEstimate.client.email);
    console.log('💰 Total del estimado: $' + demoEstimate.total.toFixed(2));
    
    // También enviar copia al contratista
    const contractorCopy = {
      ...emailData,
      to: [demoEstimate.contractor.email],
      subject: `[COPIA] ${emailData.subject}`
    };
    
    const contractorResult = await resend.emails.send(contractorCopy);
    
    if (!contractorResult.error) {
      console.log('✅ Copia enviada al contratista');
      console.log('📧 ID copia:', contractorResult.data?.id);
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  }
}

// Ejecutar demostración
sendDemoEstimate()
  .then(success => {
    if (success) {
      console.log('\n🎉 DEMOSTRACIÓN COMPLETADA EXITOSAMENTE');
      console.log('📱 Enlaces de prueba disponibles:');
      console.log(`✅ Aprobar: http://localhost:5000/api/simple-estimate/approve?estimateId=${demoEstimate.estimateNumber}&clientEmail=${demoEstimate.client.email}`);
      console.log(`📝 Ajustar: http://localhost:5000/api/simple-estimate/adjust?estimateId=${demoEstimate.estimateNumber}&clientEmail=${demoEstimate.client.email}`);
      console.log('\n📧 Revisa tu email para ver el estimado completo con botones de acción móvil-responsivos');
    } else {
      console.log('\n❌ Error en la demostración');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });
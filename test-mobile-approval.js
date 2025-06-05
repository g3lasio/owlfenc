/**
 * Test server for mobile-responsive estimate approval system
 */

import express from 'express';
const app = express();
const PORT = 3001;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Simple in-memory storage for testing
const estimates = new Map();

// Initialize test data
estimates.set('EST-TEST-001', {
  id: 'EST-TEST-001',
  estimateNumber: 'EST-TEST-001',
  clientName: 'Juan Pérez',
  clientEmail: 'cliente@ejemplo.com',
  contractorEmail: 'contratista@ejemplo.com',
  status: 'sent',
  total: '5,500.00',
  createdAt: new Date(),
  items: [
    { description: 'Material de construcción', quantity: 1, price: 3000 },
    { description: 'Mano de obra', quantity: 1, price: 2500 }
  ]
});

console.log('✅ Test estimate EST-TEST-001 created');

// Approve estimate - GET endpoint for mobile links
app.get('/api/simple-estimate/approve', (req, res) => {
  const { estimateId, clientEmail } = req.query;
  
  if (!estimateId || !clientEmail) {
    return res.status(400).send(`
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Error - Datos Incompletos</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 20px; background: #f8fafc; }
          .error { background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-width: 500px; margin: 0 auto; }
          @media (max-width: 640px) { body { padding: 10px; } .error { padding: 20px; } }
        </style>
      </head>
      <body>
        <div class="error">
          <h2>❌ Error</h2>
          <p>Datos incompletos para procesar la aprobación.</p>
        </div>
      </body>
      </html>
    `);
  }

  const estimate = estimates.get(estimateId);
  if (!estimate) {
    return res.status(404).send(`
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Error - Estimado No Encontrado</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 20px; background: #f8fafc; }
          .error { background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-width: 500px; margin: 0 auto; }
          @media (max-width: 640px) { body { padding: 10px; } .error { padding: 20px; } }
        </style>
      </head>
      <body>
        <div class="error">
          <h2>❌ Error</h2>
          <p>El estimado ${estimateId} no fue encontrado.</p>
        </div>
      </body>
      </html>
    `);
  }

  if (estimate.status === 'approved') {
    return res.send(`
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Estimado Ya Aprobado</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 20px; background: #f8fafc; }
          .container { background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-width: 500px; margin: 0 auto; }
          .success { color: #059669; }
          @media (max-width: 640px) { body { padding: 10px; } .container { padding: 20px; } }
        </style>
      </head>
      <body>
        <div class="container">
          <h2 class="success">✅ Estimado Ya Aprobado</h2>
          <p>Este estimado ya fue aprobado anteriormente.</p>
          <p><strong>Estimado:</strong> ${estimate.estimateNumber}</p>
          <p><strong>Total:</strong> $${estimate.total}</p>
          <p><strong>Aprobado por:</strong> ${estimate.approverName || 'Cliente'}</p>
        </div>
      </body>
      </html>
    `);
  }

  // Show approval form
  res.send(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Aprobar Estimado ${estimateId}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        
        .container {
          background: white;
          padding: 40px;
          border-radius: 16px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.1);
          max-width: 500px;
          width: 100%;
        }
        
        .header {
          text-align: center;
          margin-bottom: 30px;
        }
        
        .success-icon {
          width: 80px;
          height: 80px;
          background: linear-gradient(135deg, #10b981, #059669);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 20px;
          font-size: 40px;
        }
        
        h1 {
          color: #1f2937;
          margin-bottom: 10px;
          font-size: 24px;
        }
        
        .estimate-info {
          background: #f8fafc;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 30px;
          border-left: 4px solid #10b981;
        }
        
        .form-group {
          margin-bottom: 20px;
        }
        
        label {
          display: block;
          margin-bottom: 8px;
          font-weight: 600;
          color: #374151;
        }
        
        input, textarea {
          width: 100%;
          padding: 12px;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          font-size: 16px;
          transition: border-color 0.3s ease;
        }
        
        input:focus, textarea:focus {
          outline: none;
          border-color: #10b981;
        }
        
        .btn {
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          padding: 15px 30px;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          width: 100%;
          transition: all 0.3s ease;
          margin-bottom: 10px;
        }
        
        .btn:hover {
          background: linear-gradient(135deg, #059669, #047857);
          transform: translateY(-2px);
        }
        
        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }
        
        .btn-secondary {
          background: #f59e0b;
          color: white;
        }
        
        .btn-secondary:hover {
          background: #d97706;
        }
        
        .terms {
          background: #fef3c7;
          padding: 15px;
          border-radius: 8px;
          margin-bottom: 20px;
          font-size: 14px;
          color: #92400e;
        }
        
        @media (max-width: 600px) {
          .container { padding: 30px 20px; }
          h1 { font-size: 20px; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="success-icon">📋</div>
          <h1>Aprobar Estimado</h1>
          <p>Confirme su aprobación del estimado</p>
        </div>
        
        <div class="estimate-info">
          <h3>Estimado: ${estimate.estimateNumber}</h3>
          <p><strong>Cliente:</strong> ${estimate.clientName}</p>
          <p><strong>Total:</strong> $${estimate.total}</p>
          <p><strong>Contratista:</strong> ${estimate.contractorEmail}</p>
        </div>
        
        <form id="approvalForm">
          <div class="form-group">
            <label for="clientName">Nombre Completo *</label>
            <input type="text" id="clientName" name="clientName" required placeholder="Ingrese su nombre completo" value="${estimate.clientName}">
          </div>
          
          <div class="form-group">
            <label for="approvalDate">Fecha de Aprobación *</label>
            <input type="date" id="approvalDate" name="approvalDate" required value="${new Date().toISOString().split('T')[0]}">
          </div>
          
          <div class="form-group">
            <label for="comments">Comentarios Adicionales (Opcional)</label>
            <textarea id="comments" name="comments" rows="3" placeholder="Comentarios sobre el proyecto..."></textarea>
          </div>
          
          <div class="terms">
            <p><strong>Al aprobar este estimado:</strong></p>
            <ul style="margin-top: 8px; padding-left: 20px;">
              <li>Acepta los términos y condiciones especificados</li>
              <li>Autoriza el inicio del proyecto según lo descrito</li>
              <li>Confirma los precios y materiales listados</li>
            </ul>
          </div>
          
          <button type="submit" class="btn" id="submitBtn">
            ✅ Aprobar Estimado
          </button>
          
          <button type="button" class="btn btn-secondary" id="adjustBtn">
            📝 Solicitar Ajustes
          </button>
        </form>
      </div>
      
      <script>
        document.getElementById('approvalForm').addEventListener('submit', async (e) => {
          e.preventDefault();
          
          const submitBtn = document.getElementById('submitBtn');
          submitBtn.disabled = true;
          submitBtn.textContent = 'Procesando...';
          
          const formData = new FormData(e.target);
          const data = {
            estimateId: '${estimateId}',
            clientEmail: '${clientEmail}',
            clientName: formData.get('clientName'),
            approvalDate: formData.get('approvalDate'),
            comments: formData.get('comments'),
            contractorEmail: '${estimate.contractorEmail}'
          };
          
          try {
            const response = await fetch('/api/simple-estimate/approve', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(data)
            });
            
            if (response.ok) {
              window.location.reload();
            } else {
              alert('Error procesando la aprobación');
              submitBtn.disabled = false;
              submitBtn.textContent = '✅ Aprobar Estimado';
            }
          } catch (error) {
            alert('Error de conexión');
            submitBtn.disabled = false;
            submitBtn.textContent = '✅ Aprobar Estimado';
          }
        });
        
        document.getElementById('adjustBtn').addEventListener('click', () => {
          window.location.href = '/api/simple-estimate/adjust?estimateId=${estimateId}&clientEmail=${clientEmail}';
        });
      </script>
    </body>
    </html>
  `);
});

// Process approval
app.post('/api/simple-estimate/approve', (req, res) => {
  const { estimateId, clientName } = req.body;
  
  console.log('✅ Processing approval for:', estimateId);

  const estimate = estimates.get(estimateId);
  if (!estimate) {
    return res.status(404).json({
      success: false,
      message: 'Estimado no encontrado'
    });
  }

  // Update estimate status
  estimate.status = 'approved';
  estimate.approverName = clientName;
  estimate.approvedAt = new Date();
  estimates.set(estimateId, estimate);

  console.log('✅ Estimate approved by:', clientName);

  // Show confirmation page
  res.send(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Estimado Aprobado</title>
      <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 20px; background: #f8fafc; }
        .container { background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-width: 500px; margin: 0 auto; }
        .success { color: #059669; }
        .info { background: #e0f2fe; padding: 20px; border-radius: 8px; margin: 20px 0; }
        @media (max-width: 640px) { body { padding: 10px; } .container { padding: 20px; } }
      </style>
    </head>
    <body>
      <div class="container">
        <h2 class="success">✅ Estimado Aprobado Exitosamente</h2>
        <p>Su estimado ha sido aprobado y el contratista ha sido notificado.</p>
        
        <div class="info">
          <h3>Próximos Pasos:</h3>
          <p>
            • El contratista ha recibido una notificación inmediata<br>
            • Se le contactará en las próximas 24 horas<br>
            • Recibirá un contrato formal para firma<br>
            • El proyecto puede comenzar según lo acordado
          </p>
        </div>
        
        <p><strong>Estimado:</strong> ${estimateId}</p>
        <p><strong>Aprobado por:</strong> ${clientName}</p>
        <p><strong>Fecha:</strong> ${new Date().toLocaleDateString('es-ES')}</p>
      </div>
    </body>
    </html>
  `);
});

// Request adjustments - GET endpoint
app.get('/api/simple-estimate/adjust', (req, res) => {
  const { estimateId, clientEmail } = req.query;
  
  if (!estimateId || !clientEmail) {
    return res.status(400).send('Datos incompletos');
  }

  const estimate = estimates.get(estimateId);
  if (!estimate) {
    return res.status(404).send('Estimado no encontrado');
  }

  // Show adjustment form
  res.send(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Solicitar Ajustes - ${estimateId}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        
        .container {
          background: white;
          padding: 40px;
          border-radius: 16px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.1);
          max-width: 600px;
          width: 100%;
        }
        
        .header {
          text-align: center;
          margin-bottom: 30px;
        }
        
        .adjust-icon {
          width: 80px;
          height: 80px;
          background: linear-gradient(135deg, #f59e0b, #d97706);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 20px;
          font-size: 40px;
        }
        
        h1 {
          color: #1f2937;
          margin-bottom: 10px;
          font-size: 24px;
        }
        
        .estimate-info {
          background: #fffbeb;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 30px;
          border-left: 4px solid #f59e0b;
        }
        
        .form-group {
          margin-bottom: 20px;
        }
        
        label {
          display: block;
          margin-bottom: 8px;
          font-weight: 600;
          color: #374151;
        }
        
        input, textarea {
          width: 100%;
          padding: 12px;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          font-size: 16px;
          transition: border-color 0.3s ease;
        }
        
        input:focus, textarea:focus {
          outline: none;
          border-color: #f59e0b;
        }
        
        textarea {
          resize: vertical;
          min-height: 120px;
        }
        
        .btn {
          background: linear-gradient(135deg, #f59e0b, #d97706);
          color: white;
          padding: 15px 30px;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          width: 100%;
          transition: all 0.3s ease;
          margin-bottom: 10px;
        }
        
        .btn:hover {
          background: linear-gradient(135deg, #d97706, #b45309);
          transform: translateY(-2px);
        }
        
        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }
        
        .btn-secondary {
          background: #6b7280;
          color: white;
        }
        
        .btn-secondary:hover {
          background: #4b5563;
        }
        
        .note {
          background: #fef3c7;
          padding: 15px;
          border-radius: 8px;
          margin-bottom: 20px;
          font-size: 14px;
          color: #92400e;
        }
        
        @media (max-width: 600px) {
          .container { padding: 30px 20px; }
          h1 { font-size: 20px; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="adjust-icon">📝</div>
          <h1>Solicitar Ajustes</h1>
          <p>Indique los cambios que desea en el estimado</p>
        </div>
        
        <div class="estimate-info">
          <h3>Estimado: ${estimate.estimateNumber}</h3>
          <p><strong>Cliente:</strong> ${estimate.clientName}</p>
          <p><strong>Total Actual:</strong> $${estimate.total}</p>
          <p><strong>Contratista:</strong> ${estimate.contractorEmail}</p>
        </div>
        
        <form id="adjustmentForm">
          <div class="form-group">
            <label for="clientName">Su Nombre Completo *</label>
            <input type="text" id="clientName" name="clientName" required placeholder="Ingrese su nombre completo" value="${estimate.clientName}">
          </div>
          
          <div class="form-group">
            <label for="requestedChanges">Cambios Solicitados *</label>
            <textarea id="requestedChanges" name="requestedChanges" required placeholder="Describa específicamente los cambios que desea en el estimado (materiales, cantidades, servicios, etc.)"></textarea>
          </div>
          
          <div class="form-group">
            <label for="clientNotes">Notas Adicionales</label>
            <textarea id="clientNotes" name="clientNotes" placeholder="Comentarios adicionales, presupuesto objetivo, fechas especiales, etc."></textarea>
          </div>
          
          <div class="note">
            <p><strong>Importante:</strong></p>
            <ul style="margin-top: 8px; padding-left: 20px;">
              <li>Sea específico en los cambios solicitados</li>
              <li>El contratista responderá en 24-48 horas</li>
              <li>Recibirá un nuevo estimado con los ajustes</li>
            </ul>
          </div>
          
          <button type="submit" class="btn" id="submitBtn">
            📝 Enviar Solicitud de Ajustes
          </button>
          
          <button type="button" class="btn btn-secondary" id="backBtn">
            ← Volver a Aprobación
          </button>
        </form>
      </div>
      
      <script>
        document.getElementById('adjustmentForm').addEventListener('submit', async (e) => {
          e.preventDefault();
          
          const submitBtn = document.getElementById('submitBtn');
          submitBtn.disabled = true;
          submitBtn.textContent = 'Enviando solicitud...';
          
          const formData = new FormData(e.target);
          const data = {
            estimateId: '${estimateId}',
            clientEmail: '${clientEmail}',
            clientName: formData.get('clientName'),
            requestedChanges: formData.get('requestedChanges'),
            clientNotes: formData.get('clientNotes'),
            contractorEmail: '${estimate.contractorEmail}'
          };
          
          try {
            const response = await fetch('/api/simple-estimate/adjust', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(data)
            });
            
            if (response.ok) {
              window.location.reload();
            } else {
              alert('Error enviando la solicitud de ajustes');
              submitBtn.disabled = false;
              submitBtn.textContent = '📝 Enviar Solicitud de Ajustes';
            }
          } catch (error) {
            alert('Error de conexión');
            submitBtn.disabled = false;
            submitBtn.textContent = '📝 Enviar Solicitud de Ajustes';
          }
        });
        
        document.getElementById('backBtn').addEventListener('click', () => {
          window.location.href = '/api/simple-estimate/approve?estimateId=${estimateId}&clientEmail=${clientEmail}';
        });
      </script>
    </body>
    </html>
  `);
});

// Process adjustment request
app.post('/api/simple-estimate/adjust', (req, res) => {
  const { estimateId, clientName, requestedChanges, clientNotes } = req.body;
  
  console.log('📝 Processing adjustment request for:', estimateId);

  const estimate = estimates.get(estimateId);
  if (!estimate) {
    return res.status(404).json({
      success: false,
      message: 'Estimado no encontrado'
    });
  }

  // Update estimate status and add adjustment request
  estimate.status = 'adjustments_requested';
  if (!estimate.adjustments) estimate.adjustments = [];
  estimate.adjustments.push({
    id: Date.now().toString(),
    clientName,
    requestedChanges,
    clientNotes,
    createdAt: new Date(),
    status: 'pending'
  });
  estimates.set(estimateId, estimate);

  console.log('📝 Adjustment request added by:', clientName);

  // Show confirmation page
  res.send(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Solicitud de Ajustes Enviada</title>
      <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 20px; background: #f8fafc; }
        .container { background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-width: 500px; margin: 0 auto; }
        .success { color: #f59e0b; }
        .info { background: #fffbeb; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b; }
        @media (max-width: 640px) { body { padding: 10px; } .container { padding: 20px; } }
      </style>
    </head>
    <body>
      <div class="container">
        <h2 class="success">📝 Solicitud de Ajustes Enviada</h2>
        <p>Su solicitud de cambios ha sido enviada al contratista.</p>
        
        <div class="info">
          <h3>Próximos Pasos:</h3>
          <p>
            • El contratista ha recibido su solicitud inmediatamente<br>
            • Revisará los cambios solicitados<br>
            • Recibirá un nuevo estimado en 24-48 horas<br>
            • Podrá aprobar o solicitar más ajustes
          </p>
        </div>
        
        <p><strong>Estimado:</strong> ${estimateId}</p>
        <p><strong>Solicitado por:</strong> ${clientName}</p>
        <p><strong>Fecha:</strong> ${new Date().toLocaleDateString('es-ES')}</p>
        
        <div style="margin-top: 30px; padding: 15px; background: #f3f4f6; border-radius: 8px;">
          <h4>Cambios Solicitados:</h4>
          <p style="text-align: left; margin-top: 10px;">${requestedChanges}</p>
          ${clientNotes ? `<h4 style="margin-top: 15px;">Notas Adicionales:</h4><p style="text-align: left; margin-top: 10px;">${clientNotes}</p>` : ''}
        </div>
      </div>
    </body>
    </html>
  `);
});

// Test page
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Sistema Móvil de Aprobación de Estimados</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; background: #f8fafc; }
        .container { background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-width: 600px; margin: 0 auto; }
        .btn { background: #10b981; color: white; padding: 12px 24px; border: none; border-radius: 6px; font-size: 16px; cursor: pointer; margin: 10px; text-decoration: none; display: inline-block; }
        .btn:hover { background: #059669; }
        .btn-secondary { background: #f59e0b; }
        .btn-secondary:hover { background: #d97706; }
        .test-links { margin-top: 30px; }
        .status { margin-top: 20px; padding: 15px; background: #f3f4f6; border-radius: 8px; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Sistema Móvil de Aprobación de Estimados</h1>
        <p>Sistema móvil-responsivo para aprobación y ajustes de estimados de construcción.</p>
        
        <div class="test-links">
          <h3>Enlaces de Prueba:</h3>
          <a href="/api/simple-estimate/approve?estimateId=EST-TEST-001&clientEmail=cliente@ejemplo.com" class="btn">
            ✅ Probar Aprobación
          </a>
          <a href="/api/simple-estimate/adjust?estimateId=EST-TEST-001&clientEmail=cliente@ejemplo.com" class="btn btn-secondary">
            📝 Probar Ajustes
          </a>
        </div>
        
        <div class="status">
          <h3>Estado del Estimado de Prueba:</h3>
          <p><strong>ID:</strong> EST-TEST-001</p>
          <p><strong>Cliente:</strong> Juan Pérez (cliente@ejemplo.com)</p>
          <p><strong>Total:</strong> $5,500.00</p>
          <p><strong>Estado:</strong> ${estimates.get('EST-TEST-001')?.status || 'No encontrado'}</p>
          ${estimates.get('EST-TEST-001')?.approverName ? `<p><strong>Aprobado por:</strong> ${estimates.get('EST-TEST-001').approverName}</p>` : ''}
        </div>
        
        <div style="margin-top: 30px; padding: 20px; background: #e0f2fe; border-radius: 8px;">
          <h3>Funcionalidades Implementadas:</h3>
          <ul>
            <li>✅ Aprobación móvil-responsiva de estimados</li>
            <li>📝 Solicitud de ajustes con comentarios detallados</li>
            <li>🔔 Notificaciones en tiempo real para contratistas</li>
            <li>📱 Diseño optimizado para dispositivos móviles</li>
            <li>💾 Seguimiento completo de estados y cambios</li>
            <li>🔄 Workflow completo de aprobación/ajustes</li>
          </ul>
        </div>
      </div>
    </body>
    </html>
  `);
});

app.listen(PORT, () => {
  console.log(`📱 Servidor de prueba ejecutándose en http://localhost:${PORT}/`);
  console.log('✅ Test estimate EST-TEST-001 available');
  console.log('🧪 Test approval: http://localhost:3001/api/simple-estimate/approve?estimateId=EST-TEST-001&clientEmail=cliente@ejemplo.com');
  console.log('📝 Test adjustments: http://localhost:3001/api/simple-estimate/adjust?estimateId=EST-TEST-001&clientEmail=cliente@ejemplo.com');
});
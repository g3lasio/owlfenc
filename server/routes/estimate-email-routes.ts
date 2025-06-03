/**
 * Rutas para el sistema de estimados por email
 * Maneja envío, aprobación y ajustes de estimados
 */

import { Router, Request, Response } from 'express';
import { EstimateEmailService, EstimateData, EstimateApproval, EstimateAdjustment } from '../services/estimateEmailService';

const router = Router();

/**
 * Enviar estimado por email al cliente
 * POST /api/estimate-email/send
 */
router.post('/send', async (req: Request, res: Response) => {
  try {
    console.log('📧 [ESTIMATE-EMAIL-ROUTES] Recibiendo solicitud de envío de estimado');
    
    const estimateData: EstimateData = req.body;
    
    // Validaciones básicas
    if (!estimateData.client?.email || !estimateData.contractor?.email) {
      return res.status(400).json({
        success: false,
        message: 'Email del cliente y contratista son requeridos'
      });
    }
    
    if (!estimateData.estimateNumber || !estimateData.items?.length) {
      return res.status(400).json({
        success: false,
        message: 'Número de estimado y lista de materiales son requeridos'
      });
    }
    
    // Generar fecha actual si no se proporciona
    if (!estimateData.date) {
      estimateData.date = new Date().toLocaleDateString('es-ES');
    }
    
    // Calcular totales si no están calculados
    if (!estimateData.subtotal) {
      estimateData.subtotal = estimateData.items.reduce((sum, item) => sum + item.total, 0);
    }
    
    if (!estimateData.tax && estimateData.taxRate) {
      estimateData.tax = estimateData.subtotal * (estimateData.taxRate / 100);
    }
    
    if (!estimateData.total) {
      estimateData.total = estimateData.subtotal + (estimateData.tax || 0);
    }
    
    console.log('📧 [ESTIMATE-EMAIL-ROUTES] Datos validados, enviando estimado...');
    console.log('📧 [ESTIMATE-EMAIL-ROUTES] Cliente:', estimateData.client.name, estimateData.client.email);
    console.log('📧 [ESTIMATE-EMAIL-ROUTES] Contratista:', estimateData.contractor.companyName);
    console.log('📧 [ESTIMATE-EMAIL-ROUTES] Total:', estimateData.total);
    
    const result = await EstimateEmailService.sendEstimateToClient(estimateData);
    
    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        estimateId: estimateData.estimateNumber
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.message
      });
    }
    
  } catch (error) {
    console.error('❌ [ESTIMATE-EMAIL-ROUTES] Error enviando estimado:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

/**
 * Procesamiento de aprobación de estimado (POST desde formulario inline)
 * POST /api/estimate-email/approve
 */
router.post('/approve', async (req: Request, res: Response) => {
  try {
    const { id: estimateId, email: clientEmail } = req.query;
    
    if (!estimateId || !clientEmail) {
      return res.status(400).send(`
        <html>
          <head>
            <title>Error - Parámetros Faltantes</title>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f8fafc; }
              .error { background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-width: 500px; margin: 0 auto; }
            </style>
          </head>
          <body>
            <div class="error">
              <h2>❌ Error</h2>
              <p>Parámetros faltantes en el enlace de aprobación.</p>
            </div>
          </body>
        </html>
      `);
    }
    
    // Renderizar formulario de aprobación
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
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="success-icon">✅</div>
            <h1>Aprobar Estimado</h1>
            <p>Confirme su aprobación del estimado</p>
          </div>
          
          <div class="estimate-info">
            <h3>Estimado: ${estimateId}</h3>
            <p>Cliente: ${clientEmail}</p>
          </div>
          
          <form id="approvalForm">
            <div class="form-group">
              <label for="clientName">Nombre Completo *</label>
              <input type="text" id="clientName" name="clientName" required placeholder="Ingrese su nombre completo">
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
              comments: formData.get('comments')
            };
            
            try {
              const response = await fetch('/api/estimate-email/approve', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
              });
              
              if (response.ok) {
                document.body.innerHTML = \`
                  <div style="text-align: center; padding: 50px; font-family: Arial, sans-serif;">
                    <div style="background: white; padding: 40px; border-radius: 16px; box-shadow: 0 20px 40px rgba(0,0,0,0.1); max-width: 500px; margin: 0 auto;">
                      <div style="width: 80px; height: 80px; background: linear-gradient(135deg, #10b981, #059669); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; font-size: 40px; color: white;">🎉</div>
                      <h2 style="color: #10b981; margin-bottom: 15px;">¡Estimado Aprobado!</h2>
                      <p style="color: #6b7280; margin-bottom: 20px;">Su aprobación ha sido enviada al contratista.</p>
                      <p style="color: #6b7280;">Pronto recibirá información sobre los próximos pasos.</p>
                    </div>
                  </div>
                \`;
              } else {
                throw new Error('Error en la respuesta del servidor');
              }
            } catch (error) {
              alert('Error procesando la aprobación. Por favor intente nuevamente.');
              submitBtn.disabled = false;
              submitBtn.textContent = '✅ Aprobar Estimado';
            }
          });
        </script>
      </body>
      </html>
    `);
    
  } catch (error) {
    console.error('❌ [ESTIMATE-EMAIL-ROUTES] Error mostrando página de aprobación:', error);
    res.status(500).send('Error interno del servidor');
  }
});

/**
 * Procesar aprobación de estimado
 * POST /api/estimate-email/approve
 */
router.post('/approve', async (req: Request, res: Response) => {
  try {
    const { estimateId, clientEmail, clientName, approvalDate, comments } = req.body;
    
    if (!estimateId || !clientEmail || !clientName || !approvalDate) {
      return res.status(400).json({
        success: false,
        message: 'Datos de aprobación incompletos'
      });
    }
    
    // Aquí deberías obtener el email del contratista desde la base de datos
    // Por ahora usaremos un placeholder que debe ser reemplazado
    const contractorEmail = 'contractor@example.com'; // TODO: Obtener desde BD
    
    const approval: EstimateApproval = {
      estimateId,
      clientName,
      approvalDate,
      contractorEmail
    };
    
    const result = await EstimateEmailService.processEstimateApproval(approval);
    
    res.json(result);
    
  } catch (error) {
    console.error('❌ [ESTIMATE-EMAIL-ROUTES] Error procesando aprobación:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

/**
 * Página de solicitud de ajustes
 * GET /api/estimates/adjust
 */
router.get('/adjust', async (req: Request, res: Response) => {
  try {
    const { id: estimateId, email: clientEmail } = req.query;
    
    if (!estimateId || !clientEmail) {
      return res.status(400).send(`
        <html>
          <head>
            <title>Error - Parámetros Faltantes</title>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f8fafc; }
              .error { background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-width: 500px; margin: 0 auto; }
            </style>
          </head>
          <body>
            <div class="error">
              <h2>❌ Error</h2>
              <p>Parámetros faltantes en el enlace de ajustes.</p>
            </div>
          </body>
        </html>
      `);
    }
    
    // Renderizar formulario de solicitud de ajustes
    res.send(`
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Solicitar Ajustes - Estimado ${estimateId}</title>
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
            color: white;
          }
          
          h1 {
            color: #1f2937;
            margin-bottom: 10px;
          }
          
          .estimate-info {
            background: #fef3c7;
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
          
          input, textarea, select {
            width: 100%;
            padding: 12px;
            border: 2px solid #e5e7eb;
            border-radius: 8px;
            font-size: 16px;
            transition: border-color 0.3s ease;
          }
          
          input:focus, textarea:focus, select:focus {
            outline: none;
            border-color: #f59e0b;
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
          
          .suggestions {
            background: #e0f2fe;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
          }
          
          .suggestion-item {
            margin-bottom: 10px;
            padding: 10px;
            background: white;
            border-radius: 6px;
            cursor: pointer;
            transition: background-color 0.2s ease;
          }
          
          .suggestion-item:hover {
            background-color: #f0f9ff;
          }
          
          @media (max-width: 600px) {
            .container { padding: 30px 20px; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="adjust-icon">📝</div>
            <h1>Solicitar Ajustes</h1>
            <p>Indíquenos qué cambios necesita en el estimado</p>
          </div>
          
          <div class="estimate-info">
            <h3>Estimado: ${estimateId}</h3>
            <p>Cliente: ${clientEmail}</p>
          </div>
          
          <form id="adjustmentForm">
            <div class="form-group">
              <label for="changeType">Tipo de Cambio Solicitado *</label>
              <select id="changeType" name="changeType" required>
                <option value="">Seleccione el tipo de cambio</option>
                <option value="materials">Cambio de materiales</option>
                <option value="quantity">Ajuste de cantidades</option>
                <option value="add_items">Agregar elementos</option>
                <option value="remove_items">Remover elementos</option>
                <option value="pricing">Ajuste de precios</option>
                <option value="timeline">Cambio de cronograma</option>
                <option value="specifications">Cambio de especificaciones</option>
                <option value="other">Otro</option>
              </select>
            </div>
            
            <div class="suggestions">
              <h4 style="margin-bottom: 15px; color: #0369a1;">Sugerencias Comunes:</h4>
              <div class="suggestion-item" onclick="addSuggestion('Cambiar material de valla por una opción más económica')">
                • Cambiar material por opción más económica
              </div>
              <div class="suggestion-item" onclick="addSuggestion('Agregar puerta adicional en el lado este')">
                • Agregar elementos adicionales
              </div>
              <div class="suggestion-item" onclick="addSuggestion('Reducir la altura de la valla de 6 pies a 4 pies')">
                • Modificar especificaciones
              </div>
              <div class="suggestion-item" onclick="addSuggestion('Incluir instalación de sistema de riego')">
                • Incluir servicios adicionales
              </div>
            </div>
            
            <div class="form-group">
              <label for="clientNotes">Detalles de los Cambios Solicitados *</label>
              <textarea id="clientNotes" name="clientNotes" rows="5" required 
                placeholder="Describa específicamente qué cambios necesita. Sea lo más detallado posible para que podamos preparar un estimado ajustado a sus necesidades."></textarea>
            </div>
            
            <div class="form-group">
              <label for="urgency">Urgencia</label>
              <select id="urgency" name="urgency">
                <option value="normal">Normal - Respuesta en 2-3 días hábiles</option>
                <option value="high">Alta - Respuesta en 24 horas</option>
                <option value="urgent">Urgente - Respuesta el mismo día</option>
              </select>
            </div>
            
            <div class="form-group">
              <label for="contactPreference">Preferencia de Contacto</label>
              <select id="contactPreference" name="contactPreference">
                <option value="email">Email</option>
                <option value="phone">Teléfono</option>
                <option value="both">Email y Teléfono</option>
              </select>
            </div>
            
            <button type="submit" class="btn" id="submitBtn">
              📝 Enviar Solicitud de Ajustes
            </button>
          </form>
        </div>
        
        <script>
          function addSuggestion(text) {
            const textarea = document.getElementById('clientNotes');
            if (textarea.value.trim() === '') {
              textarea.value = text;
            } else {
              textarea.value += '\\n\\n' + text;
            }
            textarea.focus();
          }
          
          document.getElementById('adjustmentForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const submitBtn = document.getElementById('submitBtn');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Enviando solicitud...';
            
            const formData = new FormData(e.target);
            const data = {
              estimateId: '${estimateId}',
              clientEmail: '${clientEmail}',
              changeType: formData.get('changeType'),
              clientNotes: formData.get('clientNotes'),
              urgency: formData.get('urgency'),
              contactPreference: formData.get('contactPreference')
            };
            
            try {
              const response = await fetch('/api/estimate-email/adjust', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
              });
              
              if (response.ok) {
                document.body.innerHTML = \`
                  <div style="text-align: center; padding: 50px; font-family: Arial, sans-serif;">
                    <div style="background: white; padding: 40px; border-radius: 16px; box-shadow: 0 20px 40px rgba(0,0,0,0.1); max-width: 500px; margin: 0 auto;">
                      <div style="width: 80px; height: 80px; background: linear-gradient(135deg, #f59e0b, #d97706); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; font-size: 40px; color: white;">✉️</div>
                      <h2 style="color: #f59e0b; margin-bottom: 15px;">¡Solicitud Enviada!</h2>
                      <p style="color: #6b7280; margin-bottom: 20px;">Su solicitud de ajustes ha sido enviada al contratista.</p>
                      <p style="color: #6b7280;">Recibirá el estimado revisado según la urgencia seleccionada.</p>
                    </div>
                  </div>
                \`;
              } else {
                throw new Error('Error en la respuesta del servidor');
              }
            } catch (error) {
              alert('Error enviando la solicitud. Por favor intente nuevamente.');
              submitBtn.disabled = false;
              submitBtn.textContent = '📝 Enviar Solicitud de Ajustes';
            }
          });
        </script>
      </body>
      </html>
    `);
    
  } catch (error) {
    console.error('❌ [ESTIMATE-EMAIL-ROUTES] Error mostrando página de ajustes:', error);
    res.status(500).send('Error interno del servidor');
  }
});

/**
 * Procesar solicitud de ajustes
 * POST /api/estimate-email/adjust
 */
router.post('/adjust', async (req: Request, res: Response) => {
  try {
    const { estimateId, clientEmail, changeType, clientNotes, urgency, contactPreference } = req.body;
    
    if (!estimateId || !clientEmail || !clientNotes) {
      return res.status(400).json({
        success: false,
        message: 'Datos de solicitud incompletos'
      });
    }
    
    // Aquí deberías obtener el email del contratista desde la base de datos
    const contractorEmail = 'contractor@example.com'; // TODO: Obtener desde BD
    
    const adjustment: EstimateAdjustment = {
      estimateId,
      clientNotes,
      requestedChanges: `Tipo de cambio: ${changeType}\nUrgencia: ${urgency}\nPreferencia de contacto: ${contactPreference}\n\nDetalles: ${clientNotes}`,
      contractorEmail,
      clientEmail
    };
    
    const result = await EstimateEmailService.processEstimateAdjustment(adjustment);
    
    res.json(result);
    
  } catch (error) {
    console.error('❌ [ESTIMATE-EMAIL-ROUTES] Error procesando ajustes:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

/**
 * Aprobar estimado - Cliente hace clic en el botón "Aprobar"
 * GET /api/estimate-email/approve
 */
router.get('/approve', async (req: Request, res: Response) => {
  try {
    const { id: estimateId, email: clientEmail } = req.query;
    
    if (!estimateId || !clientEmail) {
      return res.status(400).send(`
        <html>
          <head><title>Error - Parámetros Inválidos</title></head>
          <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px;">
            <h2 style="color: #dc2626;">Error: Parámetros Inválidos</h2>
            <p>No se pudieron encontrar los datos del estimado. Por favor, use el enlace original del email.</p>
          </body>
        </html>
      `);
    }

    // Aquí se guardará la aprobación en la base de datos
    console.log(`📋 [ESTIMATE-APPROVAL] Cliente ${clientEmail} aprobó estimado ${estimateId}`);
    
    // Mostrar página de confirmación de aprobación
    res.send(`
      <html>
        <head>
          <title>Estimado Aprobado</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { 
              font-family: Arial, sans-serif; 
              max-width: 600px; 
              margin: 50px auto; 
              padding: 20px;
              background-color: #f9fafb;
            }
            .container {
              background: white;
              padding: 40px;
              border-radius: 12px;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
              text-align: center;
            }
            .success-icon {
              font-size: 64px;
              color: #10b981;
              margin-bottom: 20px;
            }
            h1 { color: #059669; margin-bottom: 20px; }
            p { color: #6b7280; line-height: 1.6; margin-bottom: 15px; }
            .estimate-id {
              background: #ecfdf5;
              padding: 10px;
              border-radius: 6px;
              font-weight: bold;
              color: #047857;
              margin: 20px 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="success-icon">✅</div>
            <h1>¡Estimado Aprobado!</h1>
            <p>Gracias por aprobar nuestro estimado. Hemos recibido su confirmación y nos pondremos en contacto con usted pronto para coordinar los próximos pasos.</p>
            <div class="estimate-id">Estimado #${estimateId}</div>
            <p>Cliente: ${clientEmail}</p>
            <p>Fecha de aprobación: ${new Date().toLocaleDateString('es-ES')}</p>
            <p><strong>Su contratista será notificado automáticamente y se comunicará con usted dentro de las próximas 24 horas.</strong></p>
          </div>
        </body>
      </html>
    `);
    
  } catch (error) {
    console.error('❌ [ESTIMATE-APPROVAL] Error procesando aprobación:', error);
    res.status(500).send(`
      <html>
        <head><title>Error del Servidor</title></head>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px;">
          <h2 style="color: #dc2626;">Error del Servidor</h2>
          <p>Ocurrió un error procesando su aprobación. Por favor, contacte directamente al contratista.</p>
        </body>
      </html>
    `);
  }
});

/**
 * Solicitar ajustes - Cliente hace clic en el botón "Solicitar Ajustes"
 * GET /api/estimate-email/adjust
 */
router.get('/adjust', async (req: Request, res: Response) => {
  try {
    const { id: estimateId, email: clientEmail } = req.query;
    
    if (!estimateId || !clientEmail) {
      return res.status(400).send(`
        <html>
          <head><title>Error - Parámetros Inválidos</title></head>
          <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px;">
            <h2 style="color: #dc2626;">Error: Parámetros Inválidos</h2>
            <p>No se pudieron encontrar los datos del estimado. Por favor, use el enlace original del email.</p>
          </body>
        </html>
      `);
    }

    // Mostrar formulario para solicitar ajustes
    res.send(`
      <html>
        <head>
          <title>Solicitar Ajustes al Estimado</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { 
              font-family: Arial, sans-serif; 
              max-width: 600px; 
              margin: 50px auto; 
              padding: 20px;
              background-color: #f9fafb;
            }
            .container {
              background: white;
              padding: 40px;
              border-radius: 12px;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .icon {
              font-size: 48px;
              color: #f59e0b;
              text-align: center;
              margin-bottom: 20px;
            }
            h1 { color: #d97706; margin-bottom: 20px; text-align: center; }
            .form-group { margin-bottom: 20px; }
            label { 
              display: block; 
              margin-bottom: 5px; 
              font-weight: bold; 
              color: #374151; 
            }
            textarea { 
              width: 100%; 
              padding: 12px; 
              border: 1px solid #d1d5db; 
              border-radius: 6px; 
              font-size: 14px;
              resize: vertical;
              min-height: 120px;
            }
            .btn {
              background: linear-gradient(135deg, #f59e0b, #d97706);
              color: white;
              padding: 12px 30px;
              border: none;
              border-radius: 6px;
              font-size: 16px;
              font-weight: bold;
              cursor: pointer;
              width: 100%;
              transition: background 0.3s ease;
            }
            .btn:hover {
              background: linear-gradient(135deg, #d97706, #b45309);
            }
            .estimate-info {
              background: #fef3c7;
              padding: 15px;
              border-radius: 6px;
              margin-bottom: 20px;
              border-left: 4px solid #f59e0b;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="icon">📝</div>
            <h1>Solicitar Ajustes al Estimado</h1>
            
            <div class="estimate-info">
              <strong>Estimado #${estimateId}</strong><br>
              Cliente: ${clientEmail}
            </div>
            
            <form action="/api/estimate-email/submit-adjustment" method="POST">
              <input type="hidden" name="estimateId" value="${estimateId}">
              <input type="hidden" name="clientEmail" value="${clientEmail}">
              
              <div class="form-group">
                <label for="adjustments">Describa los cambios o ajustes que necesita:</label>
                <textarea 
                  name="adjustments" 
                  id="adjustments" 
                  placeholder="Por favor, describa específicamente qué cambios necesita en el estimado. Por ejemplo: cambiar el tipo de material, ajustar cantidades, modificar el alcance del trabajo, etc."
                  required
                ></textarea>
              </div>
              
              <div class="form-group">
                <label for="contactInfo">Información de contacto (opcional):</label>
                <textarea 
                  name="contactInfo" 
                  id="contactInfo" 
                  placeholder="Si prefiere que lo contactemos por teléfono o tiene horarios específicos, indíquelo aquí."
                  style="min-height: 80px;"
                ></textarea>
              </div>
              
              <button type="submit" class="btn">
                📤 Enviar Solicitud de Ajustes
              </button>
            </form>
            
            <p style="margin-top: 20px; font-size: 14px; color: #6b7280; text-align: center;">
              Su contratista recibirá esta solicitud y se pondrá en contacto con usted para discutir los ajustes.
            </p>
          </div>
        </body>
      </html>
    `);
    
  } catch (error) {
    console.error('❌ [ESTIMATE-ADJUSTMENT] Error mostrando formulario de ajustes:', error);
    res.status(500).send(`
      <html>
        <head><title>Error del Servidor</title></head>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px;">
          <h2 style="color: #dc2626;">Error del Servidor</h2>
          <p>Ocurrió un error mostrando el formulario. Por favor, contacte directamente al contratista.</p>
        </body>
      </html>
    `);
  }
});

/**
 * Procesar solicitud de ajustes
 * POST /api/estimate-email/submit-adjustment
 */
router.post('/submit-adjustment', async (req: Request, res: Response) => {
  try {
    const { estimateId, clientEmail, adjustments, contactInfo } = req.body;
    
    if (!estimateId || !clientEmail || !adjustments) {
      return res.status(400).send(`
        <html>
          <head><title>Error - Datos Incompletos</title></head>
          <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px;">
            <h2 style="color: #dc2626;">Error: Datos Incompletos</h2>
            <p>Por favor, complete todos los campos requeridos.</p>
          </body>
        </html>
      `);
    }

    // Aquí se guardará la solicitud de ajuste en la base de datos
    console.log(`📝 [ESTIMATE-ADJUSTMENT] Cliente ${clientEmail} solicita ajustes para estimado ${estimateId}`);
    console.log(`📝 [ESTIMATE-ADJUSTMENT] Ajustes solicitados:`, adjustments);
    if (contactInfo) {
      console.log(`📝 [ESTIMATE-ADJUSTMENT] Info de contacto:`, contactInfo);
    }
    
    // Mostrar página de confirmación
    res.send(`
      <html>
        <head>
          <title>Solicitud de Ajustes Enviada</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { 
              font-family: Arial, sans-serif; 
              max-width: 600px; 
              margin: 50px auto; 
              padding: 20px;
              background-color: #f9fafb;
            }
            .container {
              background: white;
              padding: 40px;
              border-radius: 12px;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
              text-align: center;
            }
            .success-icon {
              font-size: 64px;
              color: #f59e0b;
              margin-bottom: 20px;
            }
            h1 { color: #d97706; margin-bottom: 20px; }
            p { color: #6b7280; line-height: 1.6; margin-bottom: 15px; }
            .estimate-id {
              background: #fef3c7;
              padding: 10px;
              border-radius: 6px;
              font-weight: bold;
              color: #92400e;
              margin: 20px 0;
            }
            .adjustments-preview {
              background: #f3f4f6;
              padding: 15px;
              border-radius: 6px;
              text-align: left;
              margin: 20px 0;
              border-left: 4px solid #f59e0b;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="success-icon">📝</div>
            <h1>¡Solicitud de Ajustes Enviada!</h1>
            <p>Hemos recibido su solicitud de ajustes para el estimado. Su contratista revisará los cambios solicitados y se pondrá en contacto con usted.</p>
            <div class="estimate-id">Estimado #${estimateId}</div>
            <div class="adjustments-preview">
              <strong>Ajustes solicitados:</strong><br>
              ${adjustments.replace(/\n/g, '<br>')}
            </div>
            <p>Cliente: ${clientEmail}</p>
            <p>Fecha de solicitud: ${new Date().toLocaleDateString('es-ES')}</p>
            <p><strong>Su contratista recibirá esta solicitud inmediatamente y le enviará un estimado actualizado dentro de las próximas 24-48 horas.</strong></p>
          </div>
        </body>
      </html>
    `);
    
  } catch (error) {
    console.error('❌ [ESTIMATE-ADJUSTMENT] Error procesando solicitud de ajustes:', error);
    res.status(500).send(`
      <html>
        <head><title>Error del Servidor</title></head>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px;">
          <h2 style="color: #dc2626;">Error del Servidor</h2>
          <p>Ocurrió un error procesando su solicitud. Por favor, contacte directamente al contratista.</p>
        </body>
      </html>
    `);
  }
});

export default router;
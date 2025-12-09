/**
 * Rutas simplificadas para el sistema de estimados por email
 * Sistema móvil-responsivo con aprobación y ajustes
 * 
 * ACTUALIZADO: Ahora busca estimados tanto en SimpleTracker (legacy) como en Firebase (Mervin AI)
 */

import { Router, Request, Response } from 'express';
import { simpleTracker } from '../services/SimpleEstimateTracker';
import { db as firebaseDb } from '../firebase-admin';

const router = Router();

/**
 * Helper para buscar estimados en múltiples fuentes
 * Primero busca en SimpleTracker (legacy), luego en Firebase
 */
async function findEstimateByNumber(estimateNumber: string): Promise<any | null> {
  // 1. Buscar en SimpleTracker (legacy)
  const trackerEstimate = simpleTracker.getEstimateByNumber(estimateNumber);
  if (trackerEstimate) {
    return { ...trackerEstimate, source: 'tracker' };
  }
  
  // 2. Buscar en Firebase por estimateNumber
  if (firebaseDb) {
    try {
      const snapshot = await firebaseDb.collection('estimates')
        .where('estimateNumber', '==', estimateNumber)
        .limit(1)
        .get();
      
      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        return { id: doc.id, ...doc.data(), source: 'firebase' };
      }
    } catch (error) {
      console.error('⚠️ [SIMPLE-ESTIMATE] Error buscando en Firebase:', error);
    }
  }
  
  return null;
}

/**
 * Enviar estimado por email al cliente
 * POST /api/simple-estimate/send
 */
router.post('/send', async (req: Request, res: Response) => {
  try {
    console.log('📧 [SIMPLE-ESTIMATE] Enviando estimado por email');
    const estimateData = req.body;
    
    // Guardar estimado para seguimiento
    const savedEstimate = simpleTracker.saveEstimate(estimateData);
    console.log('📧 [SIMPLE-ESTIMATE] Estimado guardado:', savedEstimate.estimateNumber);
    
    res.json({
      success: true,
      message: 'Estimado enviado exitosamente',
      estimateId: savedEstimate.estimateNumber,
      trackingId: savedEstimate.id
    });

  } catch (error) {
    console.error('❌ [SIMPLE-ESTIMATE] Error enviando estimado:', error);
    res.status(500).json({
      success: false,
      message: 'Error enviando el estimado'
    });
  }
});

/**
 * Aprobar estimado - Cliente hace clic en el botón "Aprobar"
 * GET /api/simple-estimate/approve
 */
router.get('/approve', async (req: Request, res: Response) => {
  try {
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

    // Buscar estimado en múltiples fuentes (SimpleTracker + Firebase)
    const estimate = await findEstimateByNumber(estimateId as string);
    if (!estimate) {
      console.log(`⚠️ [SIMPLE-ESTIMATE] Estimado no encontrado: ${estimateId}`);
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
    
    console.log(`✅ [SIMPLE-ESTIMATE] Estimado encontrado en: ${estimate.source}`);

    // Si ya está aprobado, mostrar mensaje
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
            <p><strong>Aprobado por:</strong> ${estimate.approverName}</p>
          </div>
        </body>
        </html>
      `);
    }

    // Mostrar formulario de aprobación
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

  } catch (error) {
    console.error('❌ [SIMPLE-ESTIMATE] Error mostrando formulario:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

/**
 * Procesar aprobación de estimado
 * POST /api/simple-estimate/approve
 */
router.post('/approve', async (req: Request, res: Response) => {
  try {
    const { estimateId, clientName, clientEmail, contractorEmail } = req.body;
    
    console.log('✅ [SIMPLE-ESTIMATE] Procesando aprobación:', estimateId);

    // Buscar estimado en múltiples fuentes
    const estimate = await findEstimateByNumber(estimateId);
    
    if (!estimate) {
      return res.status(404).json({
        success: false,
        message: 'Estimado no encontrado'
      });
    }
    
    // Actualizar estado según la fuente
    let updated = false;
    if (estimate.source === 'tracker') {
      updated = simpleTracker.approveEstimate(estimateId, clientName);
    } else if (estimate.source === 'firebase' && firebaseDb) {
      // Actualizar en Firebase
      await firebaseDb.collection('estimates').doc(estimate.id).update({
        status: 'approved',
        approverName: clientName,
        approvedAt: new Date().toISOString(),
        approverEmail: clientEmail || null
      });
      updated = true;
      console.log(`✅ [SIMPLE-ESTIMATE] Estimado aprobado en Firebase: ${estimate.id}`);
    }

    if (!updated) {
      return res.status(500).json({
        success: false,
        message: 'Error actualizando el estimado'
      });
    }

    // Mostrar página de confirmación
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

  } catch (error) {
    console.error('❌ [SIMPLE-ESTIMATE] Error procesando aprobación:', error);
    res.status(500).json({
      success: false,
      message: 'Error procesando la aprobación del estimado'
    });
  }
});

/**
 * Solicitar ajustes - Cliente hace clic en el botón "Solicitar Ajustes"
 * GET /api/simple-estimate/adjust
 */
router.get('/adjust', async (req: Request, res: Response) => {
  try {
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
            <p>Datos incompletos para solicitar ajustes.</p>
          </div>
        </body>
        </html>
      `);
    }

    // Buscar estimado en múltiples fuentes (SimpleTracker + Firebase)
    const estimate = await findEstimateByNumber(estimateId as string);
    if (!estimate) {
      console.log(`⚠️ [SIMPLE-ESTIMATE] Estimado no encontrado para ajustes: ${estimateId}`);
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
    
    console.log(`✅ [SIMPLE-ESTIMATE] Estimado encontrado para ajustes en: ${estimate.source}`);

    // Mostrar formulario de solicitud de ajustes
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

  } catch (error) {
    console.error('❌ [SIMPLE-ESTIMATE] Error mostrando formulario de ajustes:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

/**
 * Procesar solicitud de ajustes
 * POST /api/simple-estimate/adjust
 */
router.post('/adjust', async (req: Request, res: Response) => {
  try {
    const { estimateId, clientName, clientEmail, requestedChanges, clientNotes, contractorEmail } = req.body;
    
    console.log('📝 [SIMPLE-ESTIMATE] Procesando solicitud de ajustes:', estimateId);

    // Buscar estimado en múltiples fuentes
    const estimate = await findEstimateByNumber(estimateId);
    
    if (!estimate) {
      return res.status(404).json({
        success: false,
        message: 'Estimado no encontrado'
      });
    }
    
    // Agregar solicitud de ajuste según la fuente
    let updated = false;
    if (estimate.source === 'tracker') {
      updated = simpleTracker.addAdjustmentRequest(estimateId, {
        clientName,
        clientEmail,
        requestedChanges,
        clientNotes
      });
    } else if (estimate.source === 'firebase' && firebaseDb) {
      // Agregar solicitud de ajuste en Firebase
      const adjustmentRequest = {
        clientName,
        clientEmail,
        requestedChanges,
        clientNotes,
        requestedAt: new Date().toISOString()
      };
      
      await firebaseDb.collection('estimates').doc(estimate.id).update({
        status: 'adjustment_requested',
        adjustmentRequests: [...(estimate.adjustmentRequests || []), adjustmentRequest],
        lastAdjustmentRequestAt: new Date().toISOString()
      });
      updated = true;
      console.log(`📝 [SIMPLE-ESTIMATE] Solicitud de ajuste agregada en Firebase: ${estimate.id}`);
    }

    if (!updated) {
      return res.status(500).json({
        success: false,
        message: 'Error procesando la solicitud'
      });
    }

    // Mostrar página de confirmación
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

  } catch (error) {
    console.error('❌ [SIMPLE-ESTIMATE] Error procesando ajustes:', error);
    res.status(500).json({
      success: false,
      message: 'Error procesando la solicitud de ajustes'
    });
  }
});

/**
 * Obtener notificaciones pendientes para contratista
 * GET /api/simple-estimate/notifications/:contractorEmail
 */
router.get('/notifications/:contractorEmail', async (req: Request, res: Response) => {
  try {
    const { contractorEmail } = req.params;
    
    const notifications = simpleTracker.getPendingNotifications(contractorEmail);
    
    res.json({
      success: true,
      notifications,
      count: notifications.length
    });

  } catch (error) {
    console.error('❌ [SIMPLE-ESTIMATE] Error obteniendo notificaciones:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo notificaciones'
    });
  }
});

export default router;
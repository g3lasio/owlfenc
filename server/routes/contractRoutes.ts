// server/routes/contractRoutes.ts

import { Router } from 'express';

const router = Router();

// Simulación temporal de base de datos de contratos en memoria
// En producción esto sería reemplazado por una base de datos real
let contracts: any[] = [];
let nextId = 1;

// Middleware básico de autenticación (simulado)
const requireAuth = (req: any, res: any, next: any) => {
  // En producción, aquí verificarías el token de autenticación
  // Por ahora simulamos que el usuario está autenticado
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ message: 'No autenticado' });
  }
  
  // Simular usuario autenticado
  req.user = { id: 'user_123', email: 'user@example.com' };
  next();
};

/**
 * GET /api/contracts - Obtener todos los contratos del usuario
 */
router.get('/', requireAuth, (req, res) => {
  try {
    // Filtrar contratos por usuario (en producción sería por user_id real)
    const userContracts = contracts.filter(contract => contract.userId === req.user.id);
    res.json(userContracts);
  } catch (error) {
    console.error('Error fetching contracts:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * POST /api/contracts - Crear un nuevo contrato
 */
router.post('/', requireAuth, (req, res) => {
  try {
    const { title, clientName, contractType, html, contractData } = req.body;
    
    const newContract = {
      id: nextId++,
      userId: req.user.id,
      title: title || `Contrato ${nextId}`,
      clientName: clientName || 'Cliente',
      contractType: contractType || 'General',
      status: 'draft',
      html: html || '',
      contractData: contractData || {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    contracts.push(newContract);
    
    res.status(201).json(newContract);
  } catch (error) {
    console.error('Error creating contract:', error);
    res.status(500).json({ error: 'Error creando el contrato' });
  }
});

/**
 * GET /api/contracts/:id - Obtener un contrato específico
 */
router.get('/:id', requireAuth, (req, res) => {
  try {
    const contractId = parseInt(req.params.id);
    const contract = contracts.find(c => c.id === contractId && c.userId === req.user.id);
    
    if (!contract) {
      return res.status(404).json({ error: 'Contrato no encontrado' });
    }
    
    res.json(contract);
  } catch (error) {
    console.error('Error fetching contract:', error);
    res.status(500).json({ error: 'Error obteniendo el contrato' });
  }
});

/**
 * PUT /api/contracts/:id - Actualizar un contrato
 */
router.put('/:id', requireAuth, (req, res) => {
  try {
    const contractId = parseInt(req.params.id);
    const contractIndex = contracts.findIndex(c => c.id === contractId && c.userId === req.user.id);
    
    if (contractIndex === -1) {
      return res.status(404).json({ error: 'Contrato no encontrado' });
    }
    
    const updates = req.body;
    contracts[contractIndex] = {
      ...contracts[contractIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    res.json(contracts[contractIndex]);
  } catch (error) {
    console.error('Error updating contract:', error);
    res.status(500).json({ error: 'Error actualizando el contrato' });
  }
});

/**
 * DELETE /api/contracts/:id - Eliminar un contrato
 */
router.delete('/:id', requireAuth, (req, res) => {
  try {
    const contractId = parseInt(req.params.id);
    const contractIndex = contracts.findIndex(c => c.id === contractId && c.userId === req.user.id);
    
    if (contractIndex === -1) {
      return res.status(404).json({ error: 'Contrato no encontrado' });
    }
    
    contracts.splice(contractIndex, 1);
    res.json({ message: 'Contrato eliminado exitosamente' });
  } catch (error) {
    console.error('Error deleting contract:', error);
    res.status(500).json({ error: 'Error eliminando el contrato' });
  }
});

/**
 * POST /api/contracts/:id/download - Descargar contrato como PDF
 */
router.post('/:id/download', requireAuth, (req, res) => {
  try {
    const contractId = parseInt(req.params.id);
    const contract = contracts.find(c => c.id === contractId && c.userId === req.user.id);
    
    if (!contract) {
      return res.status(404).json({ error: 'Contrato no encontrado' });
    }
    
    // En producción, aquí generarías el PDF real usando puppeteer o similar
    // Por ahora simulamos la descarga
    res.json({ 
      message: 'Descarga iniciada',
      downloadUrl: `/api/contracts/${contractId}/pdf`,
      contractTitle: contract.title
    });
  } catch (error) {
    console.error('Error downloading contract:', error);
    res.status(500).json({ error: 'Error en la descarga' });
  }
});

/**
 * POST /api/contracts/:id/send-email - Enviar contrato por email
 */
router.post('/:id/send-email', requireAuth, (req, res) => {
  try {
    const contractId = parseInt(req.params.id);
    const contract = contracts.find(c => c.id === contractId && c.userId === req.user.id);
    
    if (!contract) {
      return res.status(404).json({ error: 'Contrato no encontrado' });
    }
    
    // Actualizar estado del contrato
    const contractIndex = contracts.findIndex(c => c.id === contractId);
    if (contractIndex !== -1) {
      contracts[contractIndex].status = 'sent';
      contracts[contractIndex].sentAt = new Date().toISOString();
    }
    
    // En producción, aquí enviarías el email real
    res.json({ 
      message: 'Email enviado exitosamente',
      contractTitle: contract.title,
      recipient: contract.contractData?.client?.email || 'cliente@email.com'
    });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ error: 'Error enviando el email' });
  }
});

/**
 * POST /api/contracts/:id/sign - Marcar contrato como firmado
 */
router.post('/:id/sign', requireAuth, (req, res) => {
  try {
    const contractId = parseInt(req.params.id);
    const contractIndex = contracts.findIndex(c => c.id === contractId && c.userId === req.user.id);
    
    if (contractIndex === -1) {
      return res.status(404).json({ error: 'Contrato no encontrado' });
    }
    
    // Actualizar estado del contrato
    contracts[contractIndex].status = 'signed';
    contracts[contractIndex].signedAt = new Date().toISOString();
    
    res.json({ 
      message: 'Contrato marcado como firmado',
      contract: contracts[contractIndex]
    });
  } catch (error) {
    console.error('Error signing contract:', error);
    res.status(500).json({ error: 'Error firmando el contrato' });
  }
});

/**
 * POST /api/contracts/generate - Generar un nuevo contrato con IA
 */
router.post('/generate', requireAuth, (req, res) => {
  try {
    const { contractData, enhancementLevel = 'professional' } = req.body;
    
    // Simular generación con IA (en producción usaría Anthropic)
    const generatedHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Contrato Generado</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; }
            .header { text-align: center; font-size: 24px; margin-bottom: 30px; }
            .section { margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <div class="header">CONTRATO DE SERVICIOS</div>
          <div class="section">
            <strong>Cliente:</strong> ${contractData?.client?.name || '[Nombre del Cliente]'}
          </div>
          <div class="section">
            <strong>Proyecto:</strong> ${contractData?.project?.scope || '[Descripción del Proyecto]'}
          </div>
          <div class="section">
            <strong>Monto Total:</strong> ${contractData?.payment?.totalAmount || '[Monto]'}
          </div>
          <div class="section">
            <p>Este contrato ha sido generado automáticamente con protecciones legales para el contratista.</p>
          </div>
        </body>
      </html>
    `;
    
    // Crear y guardar el contrato
    const newContract = {
      id: nextId++,
      userId: req.user.id,
      title: `Contrato - ${contractData?.client?.name || 'Cliente'}`,
      clientName: contractData?.client?.name || 'Cliente',
      contractType: contractData?.project?.type || 'General',
      status: 'draft',
      html: generatedHtml,
      contractData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    contracts.push(newContract);
    
    res.json({
      success: true,
      contract: newContract,
      html: generatedHtml,
      metadata: {
        generatedAt: new Date().toISOString(),
        enhancementLevel,
        complianceScore: 85
      }
    });
  } catch (error) {
    console.error('Error generating contract:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error generando el contrato' 
    });
  }
});

export default router;
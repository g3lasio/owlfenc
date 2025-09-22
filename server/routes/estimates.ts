import { Router } from 'express';
import { z } from 'zod';
import { storage } from '../storage';
import { verifyFirebaseAuth as requireAuth } from '../middleware/firebase-auth';
import { userMappingService } from '../services/userMappingService';
import { DatabaseStorage } from '../DatabaseStorage';

// userMappingService is imported directly as singleton

const router = Router();

// Schemas de validación para el nuevo sistema de estimados
const CreateEstimateSchema = z.object({
  clientName: z.string().min(1, 'Client name is required'),
  clientEmail: z.string().email().optional().or(z.literal('')),
  clientPhone: z.string().optional(),
  clientAddress: z.string().min(1, 'Client address is required'),
  projectType: z.string().min(1, 'Project type is required'),
  projectSubtype: z.string().min(1, 'Project subtype is required'),
  projectDescription: z.string().optional(),
  scope: z.string().optional(),
  timeline: z.string().optional(),
  items: z.array(z.object({
    name: z.string(),
    description: z.string().optional(),
    category: z.enum(['material', 'labor', 'additional']),
    quantity: z.number().positive(),
    unit: z.string(),
    unitPrice: z.number().min(0),
    totalPrice: z.number().min(0),
    sortOrder: z.number().optional(),
    isOptional: z.boolean().optional()
  })),
  taxRate: z.number().min(0).max(100).optional(),
  notes: z.string().optional(),
  internalNotes: z.string().optional()
});

const UpdateEstimateSchema = CreateEstimateSchema.partial();

// POST /api/estimates - Crear nuevo estimado
router.post('/', async (req, res) => {
  try {
    console.log('🔐 Creando estimado, datos recibidos:', req.body);
    
    // Usar el firebaseUserId del frontend (autenticación requerida)
    const firebaseUserId = req.body.firebaseUserId;
    // 🔐 SECURITY FIX: Usar user_id real del usuario autenticado
    const firebaseUid = req.firebaseUser?.uid;
    if (!firebaseUid) {
      return res.status(401).json({ success: false, error: 'Usuario no autenticado' });
    }
    let userId = await userMappingService.getInternalUserId(firebaseUid);
    if (!userId) {
      userId = await userMappingService.createMapping(firebaseUid, req.firebaseUser?.email || `${firebaseUid}@firebase.auth`);
    }
    if (!userId) {
      return res.status(500).json({ success: false, error: 'Error creando mapeo de usuario' });
    }
    console.log(`🔐 [SECURITY] Creating estimate for REAL user_id: ${userId}`);
    
    console.log(`👤 Usuario Firebase: ${firebaseUserId}, User ID: ${userId}`);
    
    const validatedData = CreateEstimateSchema.parse(req.body);
    
    // Generar número de estimado único
    const estimateNumber = `EST-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    
    // Calcular totales
    const subtotal = validatedData.items.reduce((sum, item) => sum + item.totalPrice, 0);
    const taxRate = validatedData.taxRate || 8.75;
    const taxAmount = Math.round((subtotal * taxRate) / 100);
    const total = subtotal + taxAmount;
    
    // Crear fecha de vencimiento (30 días por defecto)
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 30);
    
    const estimateData = {
      userId,
      estimateNumber,
      clientId: null, // Por ahora null, se puede conectar con clientes existentes después
      clientName: validatedData.clientName,
      clientEmail: validatedData.clientEmail || null,
      clientPhone: validatedData.clientPhone || null,
      clientAddress: validatedData.clientAddress,
      projectType: validatedData.projectType,
      projectSubtype: validatedData.projectSubtype,
      projectDescription: validatedData.projectDescription || null,
      scope: validatedData.scope || null,
      timeline: validatedData.timeline || null,
      items: validatedData.items,
      subtotal,
      taxRate: taxRate, // Almacenar como porcentaje normal (ej: 12 para 12%)
      taxAmount,
      total,
      status: 'draft' as const,
      validUntil,
      estimateDate: new Date(),
      notes: validatedData.notes || null,
      internalNotes: validatedData.internalNotes || null
    };

    const estimate = await storage.createEstimate(estimateData);
    
    res.status(201).json({
      success: true,
      data: estimate,
      message: 'Estimate created successfully'
    });
    
  } catch (error) {
    console.error('Error creating estimate:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid data',
        details: error.errors
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// GET /api/estimates - Obtener estimados del usuario
router.get('/', async (req, res) => {
  try {
    // 🔐 SECURITY FIX: Usar user_id real del usuario autenticado
    const firebaseUid = req.firebaseUser?.uid;
    if (!firebaseUid) {
      return res.status(401).json({ success: false, error: 'Usuario no autenticado' });
    }
    let userId = await userMappingService.getInternalUserId(firebaseUid);
    if (!userId) {
      userId = await userMappingService.createMapping(firebaseUid, req.firebaseUser?.email || `${firebaseUid}@firebase.auth`);
    }
    if (!userId) {
      return res.status(500).json({ success: false, error: 'Error creando mapeo de usuario' });
    }
    console.log(`🔐 [SECURITY] Getting estimates for REAL user_id: ${userId}`);
    const { status, limit = '50', offset = '0' } = req.query;
    
    let estimates = await storage.getEstimatesByUserId(userId);
    
    // Filtrar por status si se proporciona
    if (status && typeof status === 'string') {
      estimates = estimates.filter(est => est.status === status);
    }
    
    // Aplicar paginación
    const limitNum = parseInt(limit as string);
    const offsetNum = parseInt(offset as string);
    const paginatedEstimates = estimates.slice(offsetNum, offsetNum + limitNum);
    
    res.json({
      success: true,
      data: paginatedEstimates,
      pagination: {
        total: estimates.length,
        limit: limitNum,
        offset: offsetNum,
        hasMore: offsetNum + limitNum < estimates.length
      }
    });
    
  } catch (error) {
    console.error('Error fetching estimates:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// GET /api/estimates/:id - Obtener estimado específico
router.get('/:id', requireAuth, async (req, res) => {
  try {
    // 🔐 SECURITY FIX: Usar user_id real del usuario autenticado  
    const firebaseUid = req.firebaseUser?.uid;
    if (!firebaseUid) {
      return res.status(401).json({ success: false, error: 'Usuario no autenticado' });
    }
    let userId = await userMappingService.getInternalUserId(firebaseUid);
    if (!userId) {
      userId = await userMappingService.createMapping(firebaseUid, req.firebaseUser?.email || `${firebaseUid}@firebase.auth`);
    }
    if (!userId) {
      return res.status(500).json({ success: false, error: 'Error creando mapeo de usuario' });
    }
    console.log(`🔐 [SECURITY] Operating with REAL user_id: ${userId}`);
    const estimateId = parseInt(req.params.id);
    
    if (isNaN(estimateId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid estimate ID'
      });
    }
    
    const estimate = await storage.getEstimate(estimateId);
    
    if (!estimate) {
      return res.status(404).json({
        success: false,
        error: 'Estimate not found'
      });
    }
    
    // Verificar que el estimado pertenece al usuario
    if (estimate.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }
    
    res.json({
      success: true,
      data: estimate
    });
    
  } catch (error) {
    console.error('Error fetching estimate:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// PUT /api/estimates/:id - Actualizar estimado
router.put('/:id', requireAuth, async (req, res) => {
  try {
    // 🔐 SECURITY FIX: Usar user_id real del usuario autenticado  
    const firebaseUid = req.firebaseUser?.uid;
    if (!firebaseUid) {
      return res.status(401).json({ success: false, error: 'Usuario no autenticado' });
    }
    let userId = await userMappingService.getInternalUserId(firebaseUid);
    if (!userId) {
      userId = await userMappingService.createMapping(firebaseUid, req.firebaseUser?.email || `${firebaseUid}@firebase.auth`);
    }
    if (!userId) {
      return res.status(500).json({ success: false, error: 'Error creando mapeo de usuario' });
    }
    console.log(`🔐 [SECURITY] Operating with REAL user_id: ${userId}`);
    const estimateId = parseInt(req.params.id);
    
    if (isNaN(estimateId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid estimate ID'
      });
    }
    
    const validatedData = UpdateEstimateSchema.parse(req.body);
    
    // Verificar que el estimado existe y pertenece al usuario
    const existingEstimate = await storage.getEstimate(estimateId);
    
    if (!existingEstimate) {
      return res.status(404).json({
        success: false,
        error: 'Estimate not found'
      });
    }
    
    if (existingEstimate.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }
    
    // Calcular nuevos totales si se actualizaron los items
    let updateData = { ...validatedData };
    
    if (validatedData.items) {
      const subtotal = validatedData.items.reduce((sum, item) => sum + item.totalPrice, 0);
      const taxRate = validatedData.taxRate || (existingEstimate.taxRate / 100);
      const taxAmount = Math.round((subtotal * taxRate) / 100);
      const total = subtotal + taxAmount;
      
      updateData = {
        ...updateData,
        subtotal,
        taxRate: Math.round(taxRate * 100),
        taxAmount,
        total
      };
    }
    
    const updatedEstimate = await storage.updateEstimate(estimateId, updateData);
    
    res.json({
      success: true,
      data: updatedEstimate,
      message: 'Estimate updated successfully'
    });
    
  } catch (error) {
    console.error('Error updating estimate:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid data',
        details: error.errors
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// DELETE /api/estimates/:id - Eliminar estimado
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    // 🔐 SECURITY FIX: Usar user_id real del usuario autenticado  
    const firebaseUid = req.firebaseUser?.uid;
    if (!firebaseUid) {
      return res.status(401).json({ success: false, error: 'Usuario no autenticado' });
    }
    let userId = await userMappingService.getInternalUserId(firebaseUid);
    if (!userId) {
      userId = await userMappingService.createMapping(firebaseUid, req.firebaseUser?.email || `${firebaseUid}@firebase.auth`);
    }
    if (!userId) {
      return res.status(500).json({ success: false, error: 'Error creando mapeo de usuario' });
    }
    console.log(`🔐 [SECURITY] Operating with REAL user_id: ${userId}`);
    const estimateId = parseInt(req.params.id);
    
    if (isNaN(estimateId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid estimate ID'
      });
    }
    
    // Verificar que el estimado existe y pertenece al usuario
    const existingEstimate = await storage.getEstimate(estimateId);
    
    if (!existingEstimate) {
      return res.status(404).json({
        success: false,
        error: 'Estimate not found'
      });
    }
    
    if (existingEstimate.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }
    
    const deleted = await storage.deleteEstimate(estimateId);
    
    if (deleted) {
      res.json({
        success: true,
        message: 'Estimate deleted successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to delete estimate'
      });
    }
    
  } catch (error) {
    console.error('Error deleting estimate:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// REMOVED: Duplicate PDF endpoint - using only /api/estimate-puppeteer-pdf

// POST /api/estimates/:id/send - Enviar estimado por email
router.post('/:id/send', requireAuth, async (req, res) => {
  try {
    // 🔐 SECURITY FIX: Usar user_id real del usuario autenticado  
    const firebaseUid = req.firebaseUser?.uid;
    if (!firebaseUid) {
      return res.status(401).json({ success: false, error: 'Usuario no autenticado' });
    }
    let userId = await userMappingService.getInternalUserId(firebaseUid);
    if (!userId) {
      userId = await userMappingService.createMapping(firebaseUid, req.firebaseUser?.email || `${firebaseUid}@firebase.auth`);
    }
    if (!userId) {
      return res.status(500).json({ success: false, error: 'Error creando mapeo de usuario' });
    }
    console.log(`🔐 [SECURITY] Operating with REAL user_id: ${userId}`);
    const estimateId = parseInt(req.params.id);
    const { email, message } = req.body;
    
    if (isNaN(estimateId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid estimate ID'
      });
    }
    
    // Verificar que el estimado existe y pertenece al usuario
    const estimate = await storage.getEstimate(estimateId);
    
    if (!estimate) {
      return res.status(404).json({
        success: false,
        error: 'Estimate not found'
      });
    }
    
    if (estimate.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }
    
    const recipientEmail = email || estimate.clientEmail;
    
    if (!recipientEmail) {
      return res.status(400).json({
        success: false,
        error: 'No email address provided'
      });
    }
    
    // Aquí se integraría con el servicio de email
    // Por ahora simulamos el envío
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Actualizar estado del estimado
    await storage.updateEstimate(estimateId, { 
      status: 'sent',
      sentDate: new Date()
    });
    
    res.json({
      success: true,
      message: `Estimate sent successfully to ${recipientEmail}`
    });
    
  } catch (error) {
    console.error('Error sending estimate:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// GET /api/estimates/stats - Estadísticas de estimados
router.get('/stats/summary', requireAuth, async (req, res) => {
  try {
    // 🔐 SECURITY FIX: Usar user_id real del usuario autenticado  
    const firebaseUid = req.firebaseUser?.uid;
    if (!firebaseUid) {
      return res.status(401).json({ success: false, error: 'Usuario no autenticado' });
    }
    let userId = await userMappingService.getInternalUserId(firebaseUid);
    if (!userId) {
      userId = await userMappingService.createMapping(firebaseUid, req.firebaseUser?.email || `${firebaseUid}@firebase.auth`);
    }
    if (!userId) {
      return res.status(500).json({ success: false, error: 'Error creando mapeo de usuario' });
    }
    console.log(`🔐 [SECURITY] Operating with REAL user_id: ${userId}`);
    const estimates = await storage.getEstimatesByUserId(userId);
    
    const stats = {
      total: estimates.length,
      draft: estimates.filter(e => e.status === 'draft').length,
      sent: estimates.filter(e => e.status === 'sent').length,
      approved: estimates.filter(e => e.status === 'approved').length,
      expired: estimates.filter(e => e.status === 'expired').length,
      totalValue: estimates.reduce((sum, e) => sum + e.total, 0),
      averageValue: estimates.length > 0 ? estimates.reduce((sum, e) => sum + e.total, 0) / estimates.length : 0,
      thisMonth: estimates.filter(e => {
        const estimateDate = new Date(e.estimateDate!);
        const now = new Date();
        return estimateDate.getMonth() === now.getMonth() && 
               estimateDate.getFullYear() === now.getFullYear();
      }).length
    };
    
    res.json({
      success: true,
      data: stats
    });
    
  } catch (error) {
    console.error('Error fetching estimate stats:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

export default router;
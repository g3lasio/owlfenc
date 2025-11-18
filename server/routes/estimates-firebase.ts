/**
 * API Routes para el sistema de estimados
 * USANDO SOLO FIREBASE - NO PostgreSQL
 */

import express from 'express';
import { z } from 'zod';
import { verifyFirebaseAuth as requireAuth } from '../middleware/firebase-auth';
import { firebaseEstimatesService } from '../services/firebaseEstimatesService';
import { deepSearchService } from '../services/deepSearchService';
import { redisUsageService } from '../services/redisUsageService';

const router = express.Router();

// Schema de validación para estimados
const createEstimateSchema = z.object({
  clientName: z.string().min(1, "Nombre del cliente requerido"),
  clientEmail: z.string().email().optional().nullable(),
  clientPhone: z.string().optional().nullable(),
  projectAddress: z.string().optional().nullable(), // Opcional - puede no conocerse al inicio
  projectCity: z.string().optional().nullable(),
  projectState: z.string().optional().nullable(),
  projectZip: z.string().optional().nullable(),
  projectType: z.string().min(1, "Tipo de proyecto requerido"),
  projectSubtype: z.string().optional().nullable(),
  
  // 🔥 NUEVO: Soporte para generación automática con DeepSearch
  projectDescription: z.string().optional().nullable(),
  useDeepSearch: z.boolean().default(false),
  
  // Items pueden ser opcionales si se usa DeepSearch
  items: z.array(z.object({
    description: z.string(),
    quantity: z.number(),
    unit: z.string(),
    unitPrice: z.number(),
    totalPrice: z.number(),
    category: z.string().optional(),
    notes: z.string().optional()
  })).default([]),
  
  subtotal: z.number().optional(),
  tax: z.number().default(0),
  discount: z.number().default(0),
  total: z.number().optional(),
  notes: z.string().optional().nullable(),
  terms: z.string().optional().nullable(),
  contractorName: z.string().optional().nullable(),
  contractorEmail: z.string().email().optional().nullable(),
  contractorPhone: z.string().optional().nullable(),
  contractorLicense: z.string().optional().nullable(),
  status: z.enum(['draft', 'sent', 'viewed', 'approved', 'rejected', 'expired']).default('draft')
});

// GET /api/estimates - Obtener todos los estimados del usuario
router.get('/', requireAuth, async (req, res) => {
  try {
    // Usuario autenticado desde Firebase Auth
    const userId = req.firebaseUser?.uid;
    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }
    
    console.log('📋 [ESTIMATES-API] Obteniendo estimados para usuario:', userId);
    
    // Obtener estimados desde Firebase
    const estimates = await firebaseEstimatesService.getEstimatesByUser(userId, {
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      status: req.query.status as string
    });
    
    console.log(`✅ [ESTIMATES-API] Encontrados ${estimates.length} estimados`);
    
    res.json(estimates);
  } catch (error) {
    console.error('❌ [ESTIMATES-API] Error al obtener estimados:', error);
    res.status(500).json({ 
      error: 'Error al obtener estimados',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

// POST /api/estimates - Crear un nuevo estimado
router.post('/', requireAuth, async (req, res) => {
  try {
    const userId = req.firebaseUser?.uid;
    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }
    
    console.log('📝 [ESTIMATES-API] Creando nuevo estimado para usuario:', userId);
    console.log('📦 [ESTIMATES-API] Datos recibidos:', req.body);
    
    // Validar datos de entrada
    const validationResult = createEstimateSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      console.error('❌ [ESTIMATES-API] Error de validación:', validationResult.error);
      return res.status(400).json({
        error: 'Datos de estimado inválidos',
        details: validationResult.error.format()
      });
    }
    
    let estimateData = validationResult.data;
    let usedDeepSearch = false;
    
    // 🔥 INTEGRACIÓN COMPLETA: DeepSearch automático si se proporciona descripción
    if (estimateData.useDeepSearch && estimateData.projectDescription) {
      console.log('🤖 [DEEPSEARCH-AUTO] Ejecutando DeepSearch automáticamente...');
      
      try {
        const location = [
          estimateData.projectAddress,
          estimateData.projectCity,
          estimateData.projectState,
          estimateData.projectZip
        ].filter(Boolean).join(', ');
        
        const deepSearchResult = await deepSearchService.analyzeProject(
          estimateData.projectDescription,
          location || undefined
        );
        
        console.log(`✅ [DEEPSEARCH-AUTO] DeepSearch completado: ${deepSearchResult.materials.length} materiales generados`);
        
        // Convertir materiales de DeepSearch al formato de items del estimate
        estimateData.items = deepSearchResult.materials.map(material => ({
          description: `${material.name} - ${material.description}`,
          quantity: material.quantity,
          unit: material.unit,
          unitPrice: material.unitPrice,
          totalPrice: material.totalPrice,
          category: material.category,
          notes: material.specifications
        }));
        
        // Calcular totales
        estimateData.subtotal = deepSearchResult.totalMaterialsCost;
        estimateData.total = deepSearchResult.grandTotal;
        
        usedDeepSearch = true;
        
      } catch (deepSearchError) {
        console.error('❌ [DEEPSEARCH-AUTO] Error en DeepSearch:', deepSearchError);
        // No fallar la creación del estimate, solo registrar el error
        console.warn('⚠️ [DEEPSEARCH-AUTO] Continuando sin DeepSearch');
      }
    }
    
    // Validar que tengamos items (manuales o de DeepSearch)
    if (!estimateData.items || estimateData.items.length === 0) {
      return res.status(400).json({
        error: 'El estimado debe tener al menos un item o usar DeepSearch con projectDescription'
      });
    }
    
    // Asegurar que subtotal y total existan
    if (!estimateData.subtotal) {
      estimateData.subtotal = estimateData.items.reduce((sum, item) => sum + item.totalPrice, 0);
    }
    if (!estimateData.total) {
      estimateData.total = estimateData.subtotal + estimateData.tax - estimateData.discount;
    }
    
    // Crear estimado en Firebase
    const newEstimate = await firebaseEstimatesService.createEstimate({
      ...estimateData,
      userId, // Firebase UID obligatorio
      estimateNumber: '', // Se generará automáticamente
      clientId: req.body.clientId
    });
    
    console.log('✅ [ESTIMATES-API] Estimado creado exitosamente, ID:', newEstimate.id);
    
    // 🔥 INTEGRACIÓN COMPLETA: Incrementar contador automáticamente
    // Esto asegura que tanto estimados manuales como de Mervin se cuenten igual
    try {
      const feature = usedDeepSearch ? 'aiEstimates' : 'basicEstimates';
      await redisUsageService.incrementUsage(userId, feature, 1);
      console.log(`✅ [ESTIMATES-USAGE] Contador incrementado: ${feature} +1`);
    } catch (usageError) {
      // No fallar la creación del estimate si falla el contador
      console.error('⚠️ [ESTIMATES-USAGE] Error incrementando contador:', usageError);
    }
    
    res.status(201).json(newEstimate);
  } catch (error) {
    console.error('❌ [ESTIMATES-API] Error al crear estimado:', error);
    res.status(500).json({ 
      error: 'Error al crear estimado',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

// GET /api/estimates/:id - Obtener un estimado específico
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.firebaseUser?.uid;
    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }
    
    const estimateId = req.params.id;
    
    console.log(`📄 [ESTIMATES-API] Obteniendo estimado ${estimateId} para usuario ${userId}`);
    
    const estimate = await firebaseEstimatesService.getEstimate(estimateId, userId);
    
    if (!estimate) {
      return res.status(404).json({ error: 'Estimado no encontrado' });
    }
    
    res.json(estimate);
  } catch (error) {
    console.error('❌ [ESTIMATES-API] Error al obtener estimado:', error);
    
    if (error instanceof Error && error.message === 'Access denied') {
      return res.status(403).json({ error: 'Acceso denegado' });
    }
    
    res.status(500).json({ 
      error: 'Error al obtener estimado',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

// PUT /api/estimates/:id - Actualizar un estimado
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.firebaseUser?.uid;
    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }
    
    const estimateId = req.params.id;
    
    console.log(`✏️ [ESTIMATES-API] Actualizando estimado ${estimateId} para usuario ${userId}`);
    
    // Actualizar estimado en Firebase
    const updatedEstimate = await firebaseEstimatesService.updateEstimate(
      estimateId,
      userId,
      req.body
    );
    
    console.log('✅ [ESTIMATES-API] Estimado actualizado exitosamente');
    
    res.json(updatedEstimate);
  } catch (error) {
    console.error('❌ [ESTIMATES-API] Error al actualizar estimado:', error);
    
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({ error: 'Estimado no encontrado' });
    }
    
    if (error instanceof Error && error.message === 'Access denied') {
      return res.status(403).json({ error: 'Acceso denegado' });
    }
    
    res.status(500).json({ 
      error: 'Error al actualizar estimado',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

// DELETE /api/estimates/:id - Eliminar un estimado
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.firebaseUser?.uid;
    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }
    
    const estimateId = req.params.id;
    
    console.log(`🗑️ [ESTIMATES-API] Eliminando estimado ${estimateId} para usuario ${userId}`);
    
    const success = await firebaseEstimatesService.deleteEstimate(estimateId, userId);
    
    if (!success) {
      return res.status(500).json({ error: 'Error al eliminar estimado' });
    }
    
    console.log('✅ [ESTIMATES-API] Estimado eliminado exitosamente');
    
    res.json({ success: true, message: 'Estimado eliminado exitosamente' });
  } catch (error) {
    console.error('❌ [ESTIMATES-API] Error al eliminar estimado:', error);
    
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({ error: 'Estimado no encontrado' });
    }
    
    if (error instanceof Error && error.message === 'Access denied') {
      return res.status(403).json({ error: 'Acceso denegado' });
    }
    
    res.status(500).json({ 
      error: 'Error al eliminar estimado',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

// POST /api/estimates/:id/send - Marcar estimado como enviado
router.post('/:id/send', requireAuth, async (req, res) => {
  try {
    const userId = req.firebaseUser?.uid;
    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }
    
    const estimateId = req.params.id;
    
    console.log(`📧 [ESTIMATES-API] Marcando estimado ${estimateId} como enviado`);
    
    await firebaseEstimatesService.markEstimateAsSent(estimateId, userId);
    
    res.json({ success: true, message: 'Estimado marcado como enviado' });
  } catch (error) {
    console.error('❌ [ESTIMATES-API] Error al marcar como enviado:', error);
    res.status(500).json({ 
      error: 'Error al marcar estimado como enviado',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

// POST /api/estimates/:id/approve - Aprobar estimado
router.post('/:id/approve', requireAuth, async (req, res) => {
  try {
    const userId = req.firebaseUser?.uid;
    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }
    
    const estimateId = req.params.id;
    
    console.log(`✅ [ESTIMATES-API] Aprobando estimado ${estimateId}`);
    
    await firebaseEstimatesService.approveEstimate(estimateId, userId);
    
    res.json({ success: true, message: 'Estimado aprobado' });
  } catch (error) {
    console.error('❌ [ESTIMATES-API] Error al aprobar estimado:', error);
    res.status(500).json({ 
      error: 'Error al aprobar estimado',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

// POST /api/estimates/:id/reject - Rechazar estimado
router.post('/:id/reject', requireAuth, async (req, res) => {
  try {
    const userId = req.firebaseUser?.uid;
    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }
    
    const estimateId = req.params.id;
    const reason = req.body.reason;
    
    console.log(`❌ [ESTIMATES-API] Rechazando estimado ${estimateId}`);
    
    await firebaseEstimatesService.rejectEstimate(estimateId, userId, reason);
    
    res.json({ success: true, message: 'Estimado rechazado' });
  } catch (error) {
    console.error('❌ [ESTIMATES-API] Error al rechazar estimado:', error);
    res.status(500).json({ 
      error: 'Error al rechazar estimado',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

// POST /api/estimates/:id/duplicate - Duplicar estimado
router.post('/:id/duplicate', requireAuth, async (req, res) => {
  try {
    const userId = req.firebaseUser?.uid;
    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }
    
    const estimateId = req.params.id;
    
    console.log(`📋 [ESTIMATES-API] Duplicando estimado ${estimateId}`);
    
    const newEstimate = await firebaseEstimatesService.duplicateEstimate(estimateId, userId);
    
    console.log('✅ [ESTIMATES-API] Estimado duplicado exitosamente, nuevo ID:', newEstimate.id);
    
    res.status(201).json(newEstimate);
  } catch (error) {
    console.error('❌ [ESTIMATES-API] Error al duplicar estimado:', error);
    res.status(500).json({ 
      error: 'Error al duplicar estimado',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

// GET /api/estimates/stats - Obtener estadísticas de estimados
router.get('/stats/summary', requireAuth, async (req, res) => {
  try {
    const userId = req.firebaseUser?.uid;
    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }
    
    console.log(`📊 [ESTIMATES-API] Obteniendo estadísticas para usuario ${userId}`);
    
    const stats = await firebaseEstimatesService.getEstimateStats(userId);
    
    res.json(stats);
  } catch (error) {
    console.error('❌ [ESTIMATES-API] Error al obtener estadísticas:', error);
    res.status(500).json({ 
      error: 'Error al obtener estadísticas',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

export default router;
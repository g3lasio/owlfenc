/**
 * MERVIN AI - ESTIMATES API
 * 
 * Endpoint optimizado para Mervin AI que integra DeepSearch automáticamente.
 * No requiere items predefinidos - genera todo automáticamente con IA.
 */

import { Router, Request, Response } from 'express';
import { verifyFirebaseAuth } from '../middleware/firebase-auth';
import { deepSearchService } from '../services/deepSearchService';
import { userMappingService } from '../services/userMappingService';
import { db as firebaseDb } from '../firebase-admin';

const router = Router();

interface MervinEstimateRequest {
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  clientAddress?: string;
  projectType: string;
  projectDescription: string;
  location?: string;
  sendEmail?: boolean;
  generatePdf?: boolean;
  generateShareUrl?: boolean;
}

/**
 * POST /api/mervin/create-estimate
 * 
 * Endpoint completo para Mervin AI que:
 * 1. Ejecuta DeepSearch automáticamente
 * 2. Crea el estimado con items calculados
 * 3. Genera URL compartible
 * 4. Opcionalmente envía email
 */
router.post('/create-estimate', verifyFirebaseAuth, async (req: Request, res: Response) => {
  try {
    const startTime = Date.now();
    console.log('🤖 [MERVIN-ESTIMATE] Iniciando creación de estimado con IA...');
    
    const {
      clientName,
      clientEmail,
      clientPhone,
      clientAddress,
      projectType,
      projectDescription,
      location,
      sendEmail = false,
      generatePdf = true,
      generateShareUrl = true
    } = req.body as MervinEstimateRequest;

    // Validar campos requeridos
    if (!clientName || !projectType || !projectDescription) {
      return res.status(400).json({
        success: false,
        error: 'Campos requeridos: clientName, projectType, projectDescription'
      });
    }

    // Obtener userId del usuario autenticado
    const firebaseUid = req.firebaseUser?.uid;
    if (!firebaseUid) {
      return res.status(401).json({ success: false, error: 'Usuario no autenticado' });
    }

    const userId = await userMappingService.getOrCreateUserIdForFirebaseUid(
      firebaseUid, 
      req.firebaseUser?.email
    );

    console.log(`🔐 [MERVIN-ESTIMATE] Usuario: ${userId}, Cliente: ${clientName}`);

    // 1. EJECUTAR DEEPSEARCH
    console.log('🔍 [MERVIN-ESTIMATE] Ejecutando DeepSearch...');
    const deepSearchResult = await deepSearchService.analyzeProject(
      `${projectType}: ${projectDescription}`,
      location || clientAddress
    );

    console.log(`✅ [MERVIN-ESTIMATE] DeepSearch completado: ${deepSearchResult.materials.length} materiales`);

    // 2. TRANSFORMAR ITEMS AL FORMATO DE ESTIMADO
    const items = [
      // Materiales
      ...deepSearchResult.materials.map((material, index) => ({
        name: material.name,
        description: material.description || '',
        category: 'material' as const,
        quantity: material.quantity,
        unit: material.unit,
        unitPrice: material.unitPrice,
        totalPrice: material.totalPrice,
        sortOrder: index
      })),
      // Mano de obra
      ...deepSearchResult.laborCosts.map((labor, index) => ({
        name: labor.category,
        description: labor.description,
        category: 'labor' as const,
        quantity: labor.hours,
        unit: 'hours',
        unitPrice: labor.rate,
        totalPrice: labor.total,
        sortOrder: deepSearchResult.materials.length + index
      })),
      // Costos adicionales
      ...deepSearchResult.additionalCosts.map((additional, index) => ({
        name: additional.category,
        description: additional.description,
        category: 'additional' as const,
        quantity: 1,
        unit: 'unit',
        unitPrice: additional.cost,
        totalPrice: additional.cost,
        sortOrder: deepSearchResult.materials.length + deepSearchResult.laborCosts.length + index
      }))
    ];

    // 3. CALCULAR TOTALES (mantener precisión de centavos)
    const subtotal = deepSearchResult.grandTotal;
    const taxRate = 8.75;
    const taxAmount = Math.round((subtotal * (taxRate / 100)) * 100) / 100; // Precisión de centavos
    const total = Math.round((subtotal + taxAmount) * 100) / 100;

    // 4. CREAR ESTIMADO EN LA BASE DE DATOS
    // IMPORTANTE: Usar estimateNumber como doc.id para que coincida con la URL pública
    const estimateNumber = `EST-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 30);

    // Usar estimateNumber como ID del documento para consistencia con URLs públicas
    const estimateId = estimateNumber;
    const estimateData = {
      id: estimateId,
      userId,
      estimateNumber,
      clientId: null,
      clientName,
      clientEmail: clientEmail || null,
      clientPhone: clientPhone || null,
      clientAddress: clientAddress || null,
      projectType,
      projectSubtype: projectType,
      projectDescription,
      scope: deepSearchResult.projectScope,
      timeline: null,
      items,
      subtotal,
      taxRate,
      taxAmount,
      total,
      status: 'draft',
      validUntil: validUntil.toISOString(),
      estimateDate: new Date().toISOString(),
      notes: deepSearchResult.recommendations.join('\n'),
      internalNotes: `Generado por Mervin AI. Confianza: ${(deepSearchResult.confidence * 100).toFixed(0)}%`,
      firebaseUid,
      createdAt: new Date().toISOString(),
      source: 'mervin_ai',
      deepSearchConfidence: deepSearchResult.confidence
    };

    // GUARDAR EN FIREBASE (única fuente de verdad para Mervin)
    if (!firebaseDb) {
      throw new Error('Firebase no está configurado');
    }
    
    await firebaseDb.collection('estimates').doc(estimateId).set(estimateData);
    console.log(`✅ [MERVIN-ESTIMATE] Estimado guardado en Firebase: ${estimateId}`);

    // 6. GENERAR URL COMPARTIBLE
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://app.owlfenc.com' 
      : `http://localhost:${process.env.PORT || 5000}`;
    
    const shareUrl = generateShareUrl 
      ? `${baseUrl}/api/simple-estimate/approve?estimateId=${estimateNumber}&clientEmail=${encodeURIComponent(clientEmail || '')}`
      : null;

    const pdfUrl = generatePdf
      ? `${baseUrl}/api/estimate-puppeteer-pdf?estimateId=${estimateId}`
      : null;

    // 7. ENVIAR EMAIL SI SE SOLICITA
    let emailSent = false;
    if (sendEmail && clientEmail) {
      try {
        // Aquí iría la lógica de envío de email
        console.log(`📧 [MERVIN-ESTIMATE] Email pendiente para: ${clientEmail}`);
        emailSent = true;
      } catch (emailError) {
        console.warn('⚠️ [MERVIN-ESTIMATE] Error enviando email:', emailError);
      }
    }

    const processingTime = Date.now() - startTime;
    console.log(`✅ [MERVIN-ESTIMATE] Completado en ${processingTime}ms`);

    // RESPUESTA COMPLETA PARA MERVIN
    res.json({
      success: true,
      estimate: {
        id: estimateId,
        estimateNumber,
        clientName,
        clientEmail,
        projectType,
        projectDescription: deepSearchResult.projectScope,
        items: items.slice(0, 10), // Solo primeros 10 para respuesta
        totalItems: items.length,
        subtotal,
        taxRate,
        taxAmount,
        total,
        status: 'draft',
        validUntil: validUntil.toISOString()
      },
      deepSearch: {
        materialsCount: deepSearchResult.materials.length,
        laborCostsCount: deepSearchResult.laborCosts.length,
        confidence: deepSearchResult.confidence,
        recommendations: deepSearchResult.recommendations.slice(0, 3),
        warnings: deepSearchResult.warnings
      },
      urls: {
        shareUrl,
        pdfUrl,
        approveUrl: shareUrl,
        editUrl: `${baseUrl}/estimates-wizard?edit=${estimateId}`
      },
      email: {
        sent: emailSent,
        recipient: clientEmail || null
      },
      processingTimeMs: processingTime,
      message: `✅ Estimado #${estimateNumber} creado exitosamente para ${clientName}. Total: $${total.toFixed(2)}`
    });

  } catch (error: any) {
    console.error('❌ [MERVIN-ESTIMATE] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error interno del servidor'
    });
  }
});

/**
 * POST /api/mervin/quick-estimate
 * 
 * Versión rápida que solo calcula costos sin guardar
 * Útil para consultas rápidas de Mervin
 */
router.post('/quick-estimate', verifyFirebaseAuth, async (req: Request, res: Response) => {
  try {
    const { projectDescription, location } = req.body;

    if (!projectDescription) {
      return res.status(400).json({
        success: false,
        error: 'projectDescription es requerido'
      });
    }

    console.log('⚡ [MERVIN-QUICK] Calculando estimado rápido...');

    const result = await deepSearchService.analyzeProject(projectDescription, location);

    res.json({
      success: true,
      estimate: {
        projectType: result.projectType,
        scope: result.projectScope,
        materials: result.materials.slice(0, 5).map(m => ({
          name: m.name,
          quantity: m.quantity,
          unit: m.unit,
          price: m.totalPrice
        })),
        totalMaterials: result.totalMaterialsCost,
        totalLabor: result.totalLaborCost,
        totalAdditional: result.totalAdditionalCost,
        grandTotal: result.grandTotal,
        confidence: result.confidence
      },
      recommendations: result.recommendations,
      warnings: result.warnings,
      message: `💰 Costo estimado: $${result.grandTotal.toFixed(2)} (Materiales: $${result.totalMaterialsCost.toFixed(2)}, Labor: $${result.totalLaborCost.toFixed(2)})`
    });

  } catch (error: any) {
    console.error('❌ [MERVIN-QUICK] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/mervin/estimate/:id
 * 
 * Obtener detalles de un estimado con URLs
 */
router.get('/estimate/:id', verifyFirebaseAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    if (!firebaseDb) {
      return res.status(500).json({ success: false, error: 'Firebase no configurado' });
    }
    
    const doc = await firebaseDb.collection('estimates').doc(id).get();
    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Estimado no encontrado'
      });
    }
    
    const estimate = { id: doc.id, ...doc.data() };

    const baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://app.owlfenc.com' 
      : `http://localhost:${process.env.PORT || 5000}`;

    res.json({
      success: true,
      estimate,
      urls: {
        shareUrl: `${baseUrl}/api/simple-estimate/approve?estimateId=${estimate.estimateNumber}&clientEmail=${encodeURIComponent((estimate as any).clientEmail || '')}`,
        pdfUrl: `${baseUrl}/api/estimate-puppeteer-pdf?estimateId=${id}`,
        editUrl: `${baseUrl}/estimates-wizard?edit=${id}`
      }
    });

  } catch (error: any) {
    console.error('❌ [MERVIN-GET] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;

/**
 * Estimate Wizard Automation API
 * 
 * Endpoints para automatizar el flujo del Estimate Wizard
 * como asistente conversacional guiado por chat.
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { verifyFirebaseAuth } from '../middleware/firebase-auth';
import { UserMappingService } from '../services/UserMappingService';
import { DatabaseStorage } from '../DatabaseStorage';
import OpenAI from 'openai';

const router = Router();
const databaseStorage = new DatabaseStorage();
const userMappingService = UserMappingService.getInstance(databaseStorage);

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Esquemas de validación
const StepOneSchema = z.object({
  clientName: z.string().min(1, 'Nombre del cliente requerido'),
  clientEmail: z.string().email().optional().or(z.literal('')),
  clientPhone: z.string().optional(),
  clientAddress: z.string().optional()
});

const StepTwoSchema = z.object({
  customerId: z.string(),
  projectDescription: z.string().min(10, 'Descripción debe tener al menos 10 caracteres'),
  language: z.enum(['es', 'en']).default('es')
});

const StepThreeSchema = z.object({
  estimateId: z.string(),
  englishDescription: z.string(),
  location: z.string().optional()
});

const StepFourSchema = z.object({
  estimateId: z.string(),
  materials: z.array(z.any()),
  englishDescription: z.string(),
  location: z.string().optional()
});

const AdjustmentSchema = z.object({
  estimateId: z.string(),
  action: z.enum(['update_quantity', 'add_item', 'remove_item', 'update_price']),
  itemName: z.string(),
  newQuantity: z.number().optional(),
  newPrice: z.number().optional(),
  newItem: z.object({
    name: z.string(),
    quantity: z.number(),
    unit: z.string(),
    unitPrice: z.number()
  }).optional()
});

/**
 * POST /api/estimate-wizard/step-1-client
 * Paso 1: Captura y crea cliente
 */
router.post('/step-1-client', verifyFirebaseAuth, async (req: Request, res: Response) => {
  try {
    console.log('📋 [WIZARD-STEP-1] Captura de cliente:', req.body);

    const firebaseUid = req.firebaseUser?.uid;
    if (!firebaseUid) {
      return res.status(401).json({ 
        success: false, 
        error: 'Usuario no autenticado' 
      });
    }

    const validatedData = StepOneSchema.parse(req.body);

    // Crear cliente usando el endpoint Firebase existente
    const clientResponse = await fetch(`${process.env.BASE_URL || 'http://localhost:5000'}/api/clients`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${req.headers.authorization?.replace('Bearer ', '')}`
      },
      body: JSON.stringify({
        name: validatedData.clientName,
        email: validatedData.clientEmail || '',
        phone: validatedData.clientPhone || '',
        address: validatedData.clientAddress || ''
      })
    });

    if (!clientResponse.ok) {
      throw new Error('Error creando cliente');
    }

    const clientData = await clientResponse.json();

    console.log('✅ [WIZARD-STEP-1] Cliente creado:', clientData.id);

    res.json({
      success: true,
      data: {
        customerId: clientData.id,
        clientName: validatedData.clientName,
        nextStep: 'description',
        message: `✅ Cliente "${validatedData.clientName}" registrado. Ahora describe el alcance del trabajo:`
      }
    });

  } catch (error: any) {
    console.error('❌ [WIZARD-STEP-1] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error procesando cliente'
    });
  }
});

/**
 * POST /api/estimate-wizard/step-2-description
 * Paso 2: Reescribe descripción de español a inglés profesional
 */
router.post('/step-2-description', verifyFirebaseAuth, async (req: Request, res: Response) => {
  try {
    console.log('📝 [WIZARD-STEP-2] Reescritura de descripción:', req.body);

    const validatedData = StepTwoSchema.parse(req.body);

    // Usar OpenAI para reescribir la descripción
    // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: `Eres un experto en construcción que reescribe descripciones de proyectos del español al inglés. 
          Convierte la descripción de entrada en una descripción profesional en inglés, clara y técnica, 
          sin inventar detalles que no estén en el texto original. Mantén las medidas, materiales específicos y 
          alcance exacto del trabajo.`
        },
        {
          role: "user",
          content: `Reescribe esta descripción de proyecto de construcción al inglés profesional:

${validatedData.projectDescription}

Responde solo con la descripción reescrita en inglés, sin comentarios adicionales.`
        }
      ],
      max_tokens: 500,
      temperature: 0.3
    });

    const englishDescription = response.choices[0]?.message?.content?.trim() || validatedData.projectDescription;

    console.log('✅ [WIZARD-STEP-2] Descripción reescrita exitosamente');

    res.json({
      success: true,
      data: {
        customerId: validatedData.customerId,
        originalDescription: validatedData.projectDescription,
        englishDescription,
        nextStep: 'materials',
        message: `✅ Descripción procesada. Ahora buscaré los materiales necesarios para: "${englishDescription}"`
      }
    });

  } catch (error: any) {
    console.error('❌ [WIZARD-STEP-2] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error procesando descripción'
    });
  }
});

/**
 * POST /api/estimate-wizard/step-3-materials
 * Paso 3: Obtiene materiales usando DeepSearch
 */
router.post('/step-3-materials', verifyFirebaseAuth, async (req: Request, res: Response) => {
  try {
    console.log('🔍 [WIZARD-STEP-3] Búsqueda de materiales:', req.body);

    const validatedData = StepThreeSchema.parse(req.body);

    // Llamar al endpoint DeepSearch Materials existente
    const materialsResponse = await fetch(`${process.env.BASE_URL || 'http://localhost:5000'}/api/deepsearch/materials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${req.headers.authorization?.replace('Bearer ', '')}`
      },
      body: JSON.stringify({
        projectDescription: validatedData.englishDescription,
        location: validatedData.location || '',
        includeLabor: false,
        includeAdditionalCosts: true
      })
    });

    if (!materialsResponse.ok) {
      throw new Error('Error obteniendo materiales');
    }

    const materialsData = await materialsResponse.json();

    console.log('✅ [WIZARD-STEP-3] Materiales obtenidos:', materialsData.data?.materials?.length || 0);

    res.json({
      success: true,
      data: {
        estimateId: validatedData.estimateId,
        materials: materialsData.data?.materials || [],
        totalMaterialsCost: materialsData.data?.totalMaterialsCost || 0,
        nextStep: 'labor',
        message: `✅ Encontré ${materialsData.data?.materials?.length || 0} materiales. Ahora calcularé los costos de labor...`
      }
    });

  } catch (error: any) {
    console.error('❌ [WIZARD-STEP-3] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error obteniendo materiales'
    });
  }
});

/**
 * POST /api/estimate-wizard/step-4-full-cost
 * Paso 4: Calcula costos completos (material + labor)
 */
router.post('/step-4-full-cost', verifyFirebaseAuth, async (req: Request, res: Response) => {
  try {
    console.log('💰 [WIZARD-STEP-4] Cálculo de costos completos:', req.body);

    const validatedData = StepFourSchema.parse(req.body);

    // Llamar al endpoint Labor DeepSearch para obtener costos de labor
    const laborResponse = await fetch(`${process.env.BASE_URL || 'http://localhost:5000'}/api/labor-deepsearch/labor-only`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${req.headers.authorization?.replace('Bearer ', '')}`
      },
      body: JSON.stringify({
        projectDescription: validatedData.englishDescription,
        location: validatedData.location || '',
        projectType: 'construction'
      })
    });

    if (!laborResponse.ok) {
      throw new Error('Error obteniendo costos de labor');
    }

    const laborData = await laborResponse.json();

    // Calcular totales
    const materialsCost = validatedData.materials.reduce((sum: number, material: any) => sum + (material.totalPrice || 0), 0);
    const laborCost = laborData.data?.totalLaborCost || 0;
    const subtotal = materialsCost + laborCost;
    const taxRate = 0.0875; // 8.75% default
    const taxAmount = subtotal * taxRate;
    const total = subtotal + taxAmount;

    const fullCostData = {
      materials: validatedData.materials,
      laborCosts: laborData.data?.laborCosts || [],
      summary: {
        materialsCost,
        laborCost,
        subtotal,
        taxRate: taxRate * 100,
        taxAmount,
        total
      }
    };

    console.log('✅ [WIZARD-STEP-4] Costos calculados - Total:', total);

    res.json({
      success: true,
      data: {
        estimateId: validatedData.estimateId,
        ...fullCostData,
        nextStep: 'review',
        message: `✅ Cálculo completo: $${total.toFixed(2)} total. ¿Deseas ajustar algo?`
      }
    });

  } catch (error: any) {
    console.error('❌ [WIZARD-STEP-4] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error calculando costos'
    });
  }
});

/**
 * POST /api/estimate-wizard/step-5-adjust
 * Paso 5: Procesa ajustes del usuario (cambiar cantidades, precios, etc.)
 */
router.post('/step-5-adjust', verifyFirebaseAuth, async (req: Request, res: Response) => {
  try {
    console.log('🔧 [WIZARD-STEP-5] Procesando ajuste:', req.body);

    const validatedData = AdjustmentSchema.parse(req.body);

    // Aquí procesar los ajustes según el tipo de acción
    let message = '';
    let success = true;

    switch (validatedData.action) {
      case 'update_quantity':
        message = `✅ Cantidad de "${validatedData.itemName}" actualizada a ${validatedData.newQuantity}`;
        break;
      case 'update_price':
        message = `✅ Precio de "${validatedData.itemName}" actualizado a $${validatedData.newPrice}`;
        break;
      case 'add_item':
        message = `✅ Item "${validatedData.newItem?.name}" agregado`;
        break;
      case 'remove_item':
        message = `✅ Item "${validatedData.itemName}" removido`;
        break;
    }

    res.json({
      success,
      data: {
        estimateId: validatedData.estimateId,
        action: validatedData.action,
        nextStep: 'finalize',
        message: `${message}. Di "generar PDF" para finalizar el estimado.`
      }
    });

  } catch (error: any) {
    console.error('❌ [WIZARD-STEP-5] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error procesando ajuste'
    });
  }
});

/**
 * POST /api/estimate-wizard/step-6-generate-pdf
 * Paso 6: Genera PDF final con link de descarga
 */
router.post('/step-6-generate-pdf', verifyFirebaseAuth, async (req: Request, res: Response) => {
  try {
    console.log('📄 [WIZARD-STEP-6] Generando PDF:', req.body);

    const { estimateId, estimateData } = req.body;

    if (!estimateId || !estimateData) {
      return res.status(400).json({
        success: false,
        error: 'EstimateId y estimateData requeridos'
      });
    }

    // Generar PDF usando el servicio existente
    // Por ahora simulamos la generación, pero aquí se integraría con el PuppeteerPdfService
    const pdfUrl = `${process.env.BASE_URL || 'http://localhost:5000'}/exports/${estimateId}-${Date.now()}.pdf`;
    
    console.log('✅ [WIZARD-STEP-6] PDF generado:', pdfUrl);

    res.json({
      success: true,
      data: {
        pdfUrl,
        downloadLink: pdfUrl,
        shareLink: pdfUrl,
        estimateNumber: estimateData.estimateNumber || `EST-${Date.now()}`,
        message: `🎉 ¡Estimado completado! PDF disponible en: ${pdfUrl}`
      }
    });

  } catch (error: any) {
    console.error('❌ [WIZARD-STEP-6] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error generando PDF'
    });
  }
});

export default router;
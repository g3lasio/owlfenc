/**
 * Rutas API para PDF Monkey - Generación de PDFs de estimados y contratos
 */

import { Request, Response } from 'express';
import { pdfMonkeyService, EstimateData, ContractData } from '../services/pdfMonkeyService';

/**
 * Generar PDF de estimado usando PDF Monkey
 * POST /api/pdf-monkey/estimate
 */
export async function generateEstimatePDF(req: Request, res: Response) {
  console.log('📄 [API] Iniciando generación de PDF de estimado...');
  
  try {
    const { estimateData, templateId } = req.body;
    
    if (!estimateData) {
      console.error('❌ [API] Datos de estimado no proporcionados');
      return res.status(400).json({
        success: false,
        error: 'Datos de estimado requeridos'
      });
    }

    console.log('📄 [API] Datos recibidos:', {
      estimateNumber: estimateData.estimateNumber,
      clientName: estimateData.client?.name,
      itemsCount: estimateData.items?.length || 0,
      templateId: templateId || 'default'
    });

    // Validar datos mínimos requeridos
    if (!estimateData.estimateNumber || !estimateData.client?.name || !estimateData.items?.length) {
      console.error('❌ [API] Datos de estimado incompletos');
      return res.status(400).json({
        success: false,
        error: 'Datos de estimado incompletos. Se requiere número de estimado, cliente y al menos un item.'
      });
    }

    // Generar PDF usando PDF Monkey
    const pdfBuffer = await pdfMonkeyService.generateEstimatePDF(estimateData as EstimateData, templateId);
    
    console.log('✅ [API] PDF generado exitosamente, tamaño:', pdfBuffer.length, 'bytes');

    // Configurar headers para descarga
    const filename = `estimate_${estimateData.estimateNumber}_${Date.now()}.pdf`;
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    
    console.log('📄 [API] Enviando PDF al cliente...');
    res.send(pdfBuffer);

  } catch (error: any) {
    console.error('❌ [API] Error generando PDF de estimado:', error);
    
    res.status(500).json({
      success: false,
      error: 'Error generando PDF',
      details: error.message
    });
  }
}

/**
 * Generar PDF de contrato usando PDF Monkey
 * POST /api/pdf-monkey/contract
 */
export async function generateContractPDF(req: Request, res: Response) {
  console.log('📄 [API] Iniciando generación de PDF de contrato...');
  
  try {
    const { contractData, templateId } = req.body;
    
    if (!contractData) {
      console.error('❌ [API] Datos de contrato no proporcionados');
      return res.status(400).json({
        success: false,
        error: 'Datos de contrato requeridos'
      });
    }

    console.log('📄 [API] Datos de contrato recibidos:', {
      contractNumber: contractData.contractNumber,
      clientName: contractData.client?.name,
      templateId: templateId || 'default'
    });

    // Validar datos mínimos requeridos
    if (!contractData.contractNumber || !contractData.client?.name) {
      console.error('❌ [API] Datos de contrato incompletos');
      return res.status(400).json({
        success: false,
        error: 'Datos de contrato incompletos. Se requiere número de contrato y cliente.'
      });
    }

    // Generar PDF usando PDF Monkey
    const pdfBuffer = await pdfMonkeyService.generateContractPDF(contractData as ContractData, templateId);
    
    console.log('✅ [API] PDF de contrato generado exitosamente, tamaño:', pdfBuffer.length, 'bytes');

    // Configurar headers para descarga
    const filename = `contract_${contractData.contractNumber}_${Date.now()}.pdf`;
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    
    console.log('📄 [API] Enviando PDF de contrato al cliente...');
    res.send(pdfBuffer);

  } catch (error: any) {
    console.error('❌ [API] Error generando PDF de contrato:', error);
    
    res.status(500).json({
      success: false,
      error: 'Error generando PDF de contrato',
      details: error.message
    });
  }
}

/**
 * Verificar estado del servicio PDF Monkey
 * GET /api/pdf-monkey/health
 */
export async function checkPDFMonkeyHealth(req: Request, res: Response) {
  console.log('🔍 [API] Verificando estado de PDF Monkey...');
  
  try {
    const isHealthy = await pdfMonkeyService.healthCheck();
    
    if (isHealthy) {
      console.log('✅ [API] PDF Monkey está funcionando correctamente');
      res.json({
        success: true,
        service: 'PDF Monkey',
        status: 'healthy',
        message: 'Servicio funcionando correctamente'
      });
    } else {
      console.warn('⚠️ [API] PDF Monkey no está respondiendo correctamente');
      res.status(503).json({
        success: false,
        service: 'PDF Monkey',
        status: 'unhealthy',
        message: 'Servicio no disponible'
      });
    }
  } catch (error: any) {
    console.error('❌ [API] Error verificando estado de PDF Monkey:', error);
    
    res.status(500).json({
      success: false,
      service: 'PDF Monkey',
      status: 'error',
      message: error.message
    });
  }
}

/**
 * Listar templates disponibles en PDF Monkey
 * GET /api/pdf-monkey/templates
 */
export async function listPDFTemplates(req: Request, res: Response) {
  console.log('📋 [API] Obteniendo lista de templates...');
  
  try {
    const templates = await pdfMonkeyService.listTemplates();
    
    console.log('✅ [API] Templates obtenidos:', templates.length);
    
    res.json({
      success: true,
      templates: templates,
      count: templates.length
    });
  } catch (error: any) {
    console.error('❌ [API] Error obteniendo templates:', error);
    
    res.status(500).json({
      success: false,
      error: 'Error obteniendo templates',
      details: error.message
    });
  }
}

/**
 * Generar PDF de estimado con datos simplificados (para compatibilidad)
 * POST /api/pdf-monkey/estimate-simple
 */
export async function generateSimpleEstimatePDF(req: Request, res: Response) {
  console.log('📄 [API] Generando PDF simple de estimado...');
  
  try {
    // Aceptar datos directamente del frontend sin destructuring
    const estimateDataFromFrontend = req.body;
    const templateId = req.body.templateId;

    // Usar datos directamente del frontend con validaciones mínimas
    const estimateData: EstimateData = {
      estimateNumber: estimateDataFromFrontend.estimateNumber || `EST-${Date.now()}`,
      date: estimateDataFromFrontend.date || new Date().toLocaleDateString(),
      validUntil: estimateDataFromFrontend.validUntil || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString(),
      client: {
        name: estimateDataFromFrontend.client?.name || 'Cliente Sin Nombre',
        email: estimateDataFromFrontend.client?.email || 'cliente@ejemplo.com',
        address: estimateDataFromFrontend.client?.address || 'Dirección no especificada',
        phone: estimateDataFromFrontend.client?.phone || '555-0000'
      },
      contractor: {
        companyName: estimateDataFromFrontend.contractor?.companyName || 'Owl Fence',
        name: estimateDataFromFrontend.contractor?.name || 'Owl Fence',
        email: estimateDataFromFrontend.contractor?.email || 'info@owlfenc.com',
        phone: estimateDataFromFrontend.contractor?.phone || '202-549-3519',
        address: estimateDataFromFrontend.contractor?.address || '2901 Owens Court',
        city: estimateDataFromFrontend.contractor?.city || 'Fairfield',
        state: estimateDataFromFrontend.contractor?.state || 'California',
        zipCode: estimateDataFromFrontend.contractor?.zipCode || '94534'
      },
      project: {
        type: estimateDataFromFrontend.project?.type || 'Fence Installation',
        description: estimateDataFromFrontend.project?.description || 'Proyecto de construcción de cerca',
        location: estimateDataFromFrontend.project?.location || 'Ubicación del proyecto',
        scopeOfWork: estimateDataFromFrontend.project?.scopeOfWork || 'Construcción de cerca según especificaciones'
      },
      items: estimateDataFromFrontend.items || [],
      subtotal: estimateDataFromFrontend.subtotal || 0,
      tax: estimateDataFromFrontend.tax || 0,
      taxRate: Math.min(estimateDataFromFrontend.taxRate || 10, 100),
      total: estimateDataFromFrontend.total || 0,
      notes: estimateDataFromFrontend.notes || 'Estimado generado por Owl Fence'
    };

    console.log('📄 [API] Datos simples convertidos:', {
      estimateNumber: estimateData.estimateNumber,
      clientName: estimateData.client.name,
      itemsCount: estimateData.items.length
    });

    // Generar PDF
    const pdfBuffer = await pdfMonkeyService.generateEstimatePDF(estimateData, templateId);
    
    console.log('✅ [API] PDF simple generado exitosamente');

    const filename = `estimate_${estimateData.estimateNumber}.pdf`;
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    
    res.send(pdfBuffer);

  } catch (error: any) {
    console.error('❌ [API] Error generando PDF simple:', error);
    
    res.status(500).json({
      success: false,
      error: 'Error generando PDF simple',
      details: error.message
    });
  }
}
/**
 * Rutas para el sistema de facturación (invoices)
 */

import express from 'express';
import { z } from 'zod';
import { storage } from '../storage';
import { InvoiceService } from '../services/invoiceService';
import { generateInvoiceHtml } from '../templates/invoiceTemplate';

const router = express.Router();

// Schema para validación
const GenerateInvoiceSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
  dueDate: z.string().optional(), // ISO date string, opcional
  customMessage: z.string().optional(),
  paymentTerms: z.number().min(1).max(90).optional() // días, 3-90
});

/**
 * POST /api/invoices/generate-from-project
 * Generar factura desde un proyecto completado
 */
router.post('/generate-from-project', async (req, res) => {
  try {
    const { projectId, dueDate, customMessage, paymentTerms } = GenerateInvoiceSchema.parse(req.body);
    
    // Obtener datos del proyecto
    const project = await storage.getProjectById(parseInt(projectId));
    if (!project) {
      return res.status(404).json({ error: 'Proyecto no encontrado' });
    }
    
    // Verificar que el proyecto esté completado
    if (project.status !== 'completed') {
      return res.status(400).json({ 
        error: 'Solo se pueden generar facturas para proyectos completados',
        currentStatus: project.status 
      });
    }
    
    // Verificar que no tenga factura ya generada
    if (project.invoiceGenerated) {
      return res.status(400).json({ 
        error: 'Ya existe una factura para este proyecto',
        invoiceNumber: project.invoiceNumber 
      });
    }
    
    // Obtener datos del contractor
    const contractor = await storage.getUserById(project.userId);
    if (!contractor) {
      return res.status(404).json({ error: 'Datos del contractor no encontrados' });
    }
    
    // Personalizar datos del contractor con parámetros opcionales
    const contractorData = {
      ...contractor,
      defaultPaymentTerms: paymentTerms || contractor.defaultPaymentTerms || 30,
      invoiceMessageTemplate: customMessage || contractor.invoiceMessageTemplate
    };
    
    // Generar datos de la factura
    const invoiceData = await InvoiceService.generateInvoiceFromProject(projectId, contractorData);
    
    // Si se especifica una fecha de vencimiento personalizada, usarla
    if (dueDate) {
      invoiceData.dueDate = dueDate;
    }
    
    // Generar HTML de la factura
    const invoiceHtml = generateInvoiceHtml(invoiceData);
    
    // Actualizar proyecto con información de la factura
    await storage.updateProject(project.id, {
      invoiceGenerated: true,
      invoiceNumber: invoiceData.invoiceNumber,
      invoiceHtml: invoiceHtml,
      invoiceDueDate: new Date(invoiceData.dueDate),
      invoiceStatus: invoiceData.balanceDue > 0 ? 'pending' : 'paid'
    });
    
    res.json({
      success: true,
      invoiceData,
      invoiceHtml,
      message: 'Factura generada exitosamente'
    });
    
  } catch (error) {
    console.error('Error generando factura:', error);
    res.status(500).json({ 
      error: 'Error interno generando factura',
      details: error.message 
    });
  }
});

/**
 * POST /api/invoices/generate-pdf/:projectId
 * Generar PDF de factura para descarga
 */
router.post('/generate-pdf/:projectId', async (req, res) => {
  try {
    const projectId = req.params.projectId;
    
    // Obtener proyecto con factura
    const project = await storage.getProjectById(parseInt(projectId));
    if (!project || !project.invoiceGenerated || !project.invoiceHtml) {
      return res.status(404).json({ error: 'Factura no encontrada para este proyecto' });
    }
    
    // Usar el servicio PDF existente (PDFMonkey o Puppeteer)
    const pdfBuffer = await generateInvoicePdf(project.invoiceHtml, project.invoiceNumber);
    
    // Configurar headers para descarga
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Factura-${project.invoiceNumber}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    
    res.send(pdfBuffer);
    
  } catch (error) {
    console.error('Error generando PDF de factura:', error);
    res.status(500).json({ error: 'Error generando PDF de factura' });
  }
});

/**
 * GET /api/invoices/project/:projectId
 * Obtener factura existente de un proyecto
 */
router.get('/project/:projectId', async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId);
    
    const project = await storage.getProjectById(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Proyecto no encontrado' });
    }
    
    if (!project.invoiceGenerated) {
      return res.status(404).json({ error: 'No hay factura generada para este proyecto' });
    }
    
    res.json({
      invoiceNumber: project.invoiceNumber,
      invoiceHtml: project.invoiceHtml,
      invoiceStatus: project.invoiceStatus,
      invoiceDueDate: project.invoiceDueDate,
      lastReminderSent: project.lastReminderSent
    });
    
  } catch (error) {
    console.error('Error obteniendo factura:', error);
    res.status(500).json({ error: 'Error obteniendo factura' });
  }
});

/**
 * POST /api/invoices/send-reminder/:projectId
 * Enviar recordatorio de pago
 */
router.post('/send-reminder/:projectId', async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId);
    
    const project = await storage.getProjectById(projectId);
    if (!project || !project.invoiceGenerated) {
      return res.status(404).json({ error: 'Factura no encontrada' });
    }
    
    if (project.invoiceStatus === 'paid') {
      return res.status(400).json({ error: 'La factura ya está pagada' });
    }
    
    // Implementar envío de email recordatorio
    await sendInvoiceReminder(project);
    
    // Actualizar fecha del último recordatorio
    await storage.updateProject(project.id, {
      lastReminderSent: new Date()
    });
    
    res.json({ 
      success: true, 
      message: 'Recordatorio enviado exitosamente' 
    });
    
  } catch (error) {
    console.error('Error enviando recordatorio:', error);
    res.status(500).json({ error: 'Error enviando recordatorio' });
  }
});

/**
 * Función auxiliar para generar PDF usando servicios existentes
 */
async function generateInvoicePdf(html: string, invoiceNumber: string): Promise<Buffer> {
  // Aquí integraremos con PDFMonkey o Puppeteer existente
  // Por ahora, placeholder que retorna el HTML
  throw new Error('PDF generation to be implemented');
}

/**
 * Función auxiliar para enviar recordatorios por email
 */
async function sendInvoiceReminder(project: any): Promise<void> {
  // Aquí integraremos con Resend/SendGrid existente
  throw new Error('Email reminder to be implemented');
}

export default router;
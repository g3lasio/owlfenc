import { Express, Request, Response } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { estimatorService, ProjectInput } from "../services/estimatorService";
import { sendEmail } from "../services/emailService";

export function registerEstimateRoutes(app: Express): void {
  // Endpoint para validar datos de entrada
  app.post('/api/estimate/validate', async (req: Request, res: Response) => {
    try {
      // En una aplicación real, obtendríamos el ID del usuario de la sesión
      const userId = 1; // ID por defecto para pruebas
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'Usuario no encontrado' });
      }
      
      // Validar datos de entrada
      const inputData = {
        ...req.body,
        contractorId: userId,
        contractorName: user.company || user.username,
        contractorAddress: user.address || "",
        contractorPhone: user.phone || "",
        contractorEmail: user.email || "",
        contractorLicense: user.license || "",
      };
      
      const validationErrors = estimatorService.validateProjectInput(inputData);
      
      if (Object.keys(validationErrors).length > 0) {
        return res.status(400).json({ 
          valid: false,
          errors: validationErrors
        });
      }
      
      res.json({ valid: true });
    } catch (error) {
      console.error('Error validando datos del proyecto:', error);
      res.status(400).json({ message: 'Error al validar datos del proyecto' });
    }
  });
  
  // Endpoint para calcular estimado basado en reglas o IA
  app.post('/api/estimates/calculate', async (req: Request, res: Response) => {
    try {
      // Validar schema de entrada
      const inputSchema = z.object({
        // Client Information
        clientName: z.string().min(1, "Cliente obligatorio"),
        clientEmail: z.string().email().optional(),
        clientPhone: z.string().optional(),
        projectAddress: z.string().min(1, "Dirección del proyecto obligatoria"),
        clientCity: z.string().optional(),
        clientState: z.string().optional(),
        clientZip: z.string().optional(),
        
        // Project Details
        projectType: z.string().min(1, "Tipo de proyecto obligatorio"),
        projectSubtype: z.string().min(1, "Subtipo de proyecto obligatorio"),
        projectDimensions: z.object({
          length: z.number().optional(),
          height: z.number().optional(),
          width: z.number().optional(),
          area: z.number().optional()
        }).refine(data => {
          return data.length > 0 || data.area > 0 || (data.width > 0 && data.height > 0);
        }, {
          message: "Se requiere al menos una dimensión válida (longitud, área, o ancho y altura)"
        }),
        additionalFeatures: z.record(z.any()).optional(),
        notes: z.string().optional(),
        
        // Generation options
        useAI: z.boolean().optional(),
        customPrompt: z.string().optional(),
        
        // Contractor Info (opcional desde el frontend, requerido para el servicio)
        contractorId: z.number().optional(),
        contractorName: z.string().optional(),
        contractorCompany: z.string().optional(),
        contractorAddress: z.string().optional(),
        contractorPhone: z.string().optional(),
        contractorEmail: z.string().optional(),
        contractorLicense: z.string().optional(),
        contractorLogo: z.string().optional()
      });
      
      // Validar datos
      const validatedInput = inputSchema.parse(req.body);
      
      // En una aplicación real, obtendríamos el ID del usuario de la sesión
      const userId = 1; // ID por defecto para pruebas
      const user = await storage.getUser(userId);
      
      // Preparar datos para el servicio estimador
      const estimateInput: ProjectInput = {
        // Usar datos del contratista proporcionados o del usuario autenticado
        contractorId: validatedInput.contractorId || userId,
        contractorName: validatedInput.contractorName || user?.username || "",
        contractorCompany: validatedInput.contractorCompany || user?.company || "",
        contractorAddress: validatedInput.contractorAddress || user?.address || "",
        contractorPhone: validatedInput.contractorPhone || user?.phone || "",
        contractorEmail: validatedInput.contractorEmail || user?.email || "",
        contractorLicense: validatedInput.contractorLicense || user?.license || "",
        contractorLogo: validatedInput.contractorLogo,
        
        // Datos del cliente
        clientName: validatedInput.clientName,
        clientEmail: validatedInput.clientEmail,
        clientPhone: validatedInput.clientPhone,
        projectAddress: validatedInput.projectAddress,
        clientCity: validatedInput.clientCity,
        clientState: validatedInput.clientState,
        clientZip: validatedInput.clientZip,
        
        // Detalles del proyecto
        projectType: validatedInput.projectType,
        projectSubtype: validatedInput.projectSubtype,
        projectDimensions: validatedInput.projectDimensions,
        additionalFeatures: validatedInput.additionalFeatures,
        notes: validatedInput.notes,
        
        // Opciones de generación
        useAI: validatedInput.useAI,
        customPrompt: validatedInput.customPrompt
      };
      
      // Generar estimado
      const estimateResult = await estimatorService.generateEstimate(estimateInput);
      
      res.json(estimateResult);
    } catch (error) {
      console.error('Error calculando estimado:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: 'Datos de entrada inválidos',
          errors: error.errors
        });
      }
      
      res.status(500).json({ message: 'Error generando estimado' });
    }
  });
  
  // Endpoint para generar HTML personalizado del estimado
  app.post('/api/estimates/html', async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        estimateData: z.record(z.any()),
        templateId: z.number().optional()
      });
      
      const { estimateData, templateId } = schema.parse(req.body);
      
      // Incluir el ID de la plantilla en los datos si se proporcionó
      if (templateId) {
        estimateData.templateId = templateId;
      }
      
      // Generar HTML usando la plantilla especificada
      const html = await estimatorService.generateEstimateHtml(estimateData);
      
      res.json({ html });
    } catch (error) {
      console.error('Error generando HTML del estimado:', error);
      res.status(500).json({ message: 'Error generando HTML del estimado' });
    }
  });
  
  // Endpoint para guardar el estimado como proyecto
  app.post('/api/estimates/save', async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        estimateData: z.record(z.any()),
        status: z.string().optional()
      });
      
      const { estimateData, status = 'draft' } = schema.parse(req.body);
      
      // En una aplicación real, obtendríamos el ID del usuario de la sesión
      const userId = 1; // ID por defecto para pruebas
      
      // Generar ID único para el proyecto
      const projectId = estimateData.projectId || `proj_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      
      // Generar HTML para el estimado
      const estimateHtml = await estimatorService.generateEstimateHtml(estimateData);
      
      // Preparar datos del proyecto
      const projectData = {
        userId: userId,
        projectId: projectId,
        clientName: estimateData.client?.name || 'Cliente',
        clientEmail: estimateData.client?.email || null,
        clientPhone: estimateData.client?.phone || null,
        address: estimateData.client?.address || '',
        city: estimateData.client?.city || null,
        state: estimateData.client?.state || null,
        zip: estimateData.client?.zip || null,
        fenceType: estimateData.project?.subtype || 'Wood Fence',
        status: status,
        estimateHtml: estimateHtml,
        details: JSON.stringify(estimateData),
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Guardar proyecto
      const project = await storage.createProject(projectData);
      
      res.status(201).json({
        success: true,
        projectId: project.projectId,
        project: project
      });
    } catch (error) {
      console.error('Error guardando estimado:', error);
      res.status(500).json({ message: 'Error guardando estimado' });
    }
  });
  
  // Endpoint para enviar el estimado por email
  app.post('/api/estimates/email', async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        estimateData: z.record(z.any()),
        email: z.string().email(),
        subject: z.string().optional(),
        message: z.string().optional(),
        templateId: z.number().optional()
      });
      
      const { estimateData, email, subject, message, templateId } = schema.parse(req.body);
      
      // En una aplicación real, obtendríamos el ID del usuario de la sesión
      const userId = 1; // ID por defecto para pruebas
      
      // Generar HTML para el estimado
      const estimateHtml = await estimatorService.generateEstimateHtml(estimateData);
      
      // Preparar datos para el email
      const emailData = {
        to: email,
        subject: subject || `Estimado para ${estimateData.client?.name || 'su proyecto'}`,
        html: estimateHtml,
        message: message,
        userId: userId,
        templateId: templateId,
        attachments: [{
          content: Buffer.from(estimateHtml).toString('base64'),
          filename: 'estimado.pdf',
          type: 'application/pdf',
          disposition: 'attachment'
        }]
      };
      
      // Adaptamos los parámetros para usar sendEmail
      const emailSent = await sendEmail({
        to: emailData.to,
        from: 'no-reply@0wlfunding.com',
        subject: emailData.subject,
        html: emailData.html,
        text: emailData.message
      });
      
      if (emailSent) {
        res.json({
          success: true,
          message: 'Email enviado correctamente'
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Error enviando email'
        });
      }
    } catch (error) {
      console.error('Error enviando estimado por email:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: 'Datos de entrada inválidos',
          errors: error.errors
        });
      }
      
      res.status(500).json({ message: 'Error enviando estimado por email' });
    }
  });
}
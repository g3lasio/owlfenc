import { Express, Request, Response } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { estimatorService, validateProjectInput } from "../services/estimatorService";
import { promptGeneratorService } from "../services/promptGeneratorService";
import { emailService } from "../services/emailService";
import { InsertProject } from "@shared/schema";

export function registerEstimateRoutes(app: Express): void {
  // Endpoint para validar datos de entrada
  app.post('/api/estimates/validate', async (req: Request, res: Response) => {
    try {
      // In a real app, we would get the user ID from the session
      const userId = 1; // Default user ID
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'Usuario no encontrado' });
      }
      
      // Validate input data
      const inputData = {
        ...req.body,
        contractorId: userId,
        contractorName: user.company || user.username,
        contractorAddress: user.address || '',
        contractorPhone: user.phone || '',
        contractorEmail: user.email || '',
        contractorLicense: user.license || '',
      };
      
      const validationErrors = validateProjectInput(inputData);
      
      if (Object.keys(validationErrors).length > 0) {
        return res.status(400).json({ 
          valid: false,
          errors: validationErrors
        });
      }
      
      res.json({ valid: true });
    } catch (error) {
      console.error('Error validando datos del proyecto:', error);
      res.status(400).json({ message: 'Error validando datos del proyecto' });
    }
  });
  
  // Endpoint para calcular estimado basado en reglas o IA
  app.post('/api/estimates/calculate', async (req: Request, res: Response) => {
    try {
      // Validar schema de entrada
      const inputSchema = z.object({
        contractorId: z.number().optional(),
        contractorName: z.string().optional(),
        contractorCompany: z.string().optional(),
        contractorAddress: z.string().optional(),
        contractorPhone: z.string().optional(),
        contractorEmail: z.string().optional(),
        contractorLicense: z.string().optional(),
        contractorLogo: z.string().optional(),
        
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
          // Si es un proyecto de cerca, longitud es obligatoria
          if (data.length && data.length > 0) return true;
          
          // Si es un proyecto de techado, área es obligatoria
          if (data.area && data.area > 0) return true;
          
          return false;
        }, {
          message: "Se requiere longitud para cercas o área para techados"
        }),
        additionalFeatures: z.record(z.any()).optional(),
        notes: z.string().optional(),
        
        // Generation options
        useAI: z.boolean().optional(),
        customPrompt: z.string().optional()
      });
      
      const validatedInput = inputSchema.parse(req.body);
      
      // Para modo de prueba, utilizar datos del contractista proporcionados
      const contractorId = validatedInput.contractorId || 1;
      
      // Si no se proporcionan datos del contratista, obtenerlos de la BD
      if (!validatedInput.contractorName) {
        const contractor = await storage.getUser(contractorId);
        if (contractor) {
          validatedInput.contractorName = contractor.company || contractor.username;
          validatedInput.contractorCompany = contractor.company;
          validatedInput.contractorAddress = contractor.address;
          validatedInput.contractorPhone = contractor.phone;
          validatedInput.contractorEmail = contractor.email;
          validatedInput.contractorLicense = contractor.license;
        }
      }
      
      // Generate estimate
      const estimateResult = await estimatorService.generateEstimate(validatedInput);
      
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
  app.post('/api/estimates/generate-html', async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        estimate: z.record(z.any()),
        templateId: z.number().optional()
      });
      
      const { estimate, templateId } = schema.parse(req.body);
      
      // Generate HTML
      const html = await estimatorService.generateEstimateHtml(estimate);
      
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
      
      // In a real app, we would get the user ID from the session
      const userId = estimateData.contractor?.id || 1; // Default user ID
      
      // Generate HTML for the estimate
      const estimateHtml = await estimatorService.generateEstimateHtml(estimateData);
      
      // Prepare project data
      const projectData: InsertProject = {
        userId: userId,
        projectId: estimateData.projectId || `proj_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        clientName: estimateData.client?.name || 'Cliente',
        clientEmail: estimateData.client?.email || '',
        clientPhone: estimateData.client?.phone || '',
        address: estimateData.client?.address || '',
        fenceType: estimateData.project?.subtype || '',
        length: estimateData.project?.dimensions?.length || 0,
        height: estimateData.project?.dimensions?.height || 0,
        gates: estimateData.project?.additionalFeatures?.gates || [],
        additionalDetails: estimateData.project?.notes || '',
        estimateHtml: estimateHtml,
        status: status
      };
      
      // Add total price if available
      if (estimateData.rulesBasedEstimate?.totals?.total) {
        projectData.totalPrice = Math.round(estimateData.rulesBasedEstimate.totals.total * 100);
      }
      
      // Save to database
      const project = await storage.createProject(projectData);
      
      res.json({
        success: true,
        project
      });
    } catch (error) {
      console.error('Error guardando estimado:', error);
      res.status(500).json({ message: 'Error guardando el estimado' });
    }
  });
  
  // Endpoint para obtener todos los materiales para un tipo específico
  app.get('/api/materials', async (req: Request, res: Response) => {
    try {
      const { category } = req.query;
      
      if (!category || typeof category !== 'string') {
        return res.status(400).json({ message: 'Se requiere categoría de materiales' });
      }
      
      // Obtener materiales de la base de datos
      const materials = await storage.getMaterialsByCategory(category);
      
      res.json(materials);
    } catch (error) {
      console.error('Error obteniendo materiales:', error);
      res.status(500).json({ message: 'Error obteniendo materiales' });
    }
  });
  
  // Endpoint para generar un prompt y obtener estimado asistido por IA
  app.post('/api/estimates/generate-prompt', async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        userId: z.number().optional(),
        projectData: z.record(z.any()),
        category: z.string()
      });
      
      const { userId = 1, projectData, category } = schema.parse(req.body);
      
      // Generar el prompt
      const prompt = await promptGeneratorService.generatePromptForProject(userId, projectData, category);
      
      res.json({ prompt });
    } catch (error) {
      console.error('Error generando prompt:', error);
      res.status(500).json({ message: 'Error generando prompt' });
    }
  });
  
  // Endpoint para procesar un prompt con IA y obtener un estimado estructurado
  app.post('/api/estimates/process-prompt', async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        prompt: z.string(),
        systemInstructions: z.string().optional()
      });
      
      const { prompt, systemInstructions } = schema.parse(req.body);
      
      // Procesar el prompt con OpenAI
      const result = await promptGeneratorService.processPromptWithAI(prompt, systemInstructions);
      
      res.json(result);
    } catch (error) {
      console.error('Error procesando prompt con IA:', error);
      res.status(500).json({ message: 'Error procesando prompt con IA' });
    }
  });
  
  // Endpoint para enviar estimado por email
  app.post('/api/estimates/send-email', async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        estimate: z.record(z.any()),
        templateId: z.number().optional().nullable(),
        email: z.string().email(),
        subject: z.string(),
        message: z.string()
      });
      
      const { estimate, templateId, email, subject, message } = schema.parse(req.body);
      
      // Enviar email
      const result = await emailService.sendEstimateByEmail(
        estimate,
        templateId || null,
        email,
        subject,
        message
      );
      
      if (result) {
        res.json({ success: true, message: 'Email enviado correctamente' });
      } else {
        res.status(500).json({ success: false, message: 'Error al enviar email' });
      }
    } catch (error) {
      console.error('Error enviando email:', error);
      res.status(500).json({ message: 'Error enviando email' });
    }
  });
}
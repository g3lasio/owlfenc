import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertProjectSchema, 
  insertTemplateSchema, 
  insertChatLogSchema,
  InsertProject,
  insertPermitSearchHistorySchema,
  insertPropertySearchHistorySchema
} from "@shared/schema";
import OpenAI from "openai";
import { z } from "zod";
import puppeteer from "puppeteer";
import * as crypto from "crypto";
import Stripe from "stripe";
import axios from 'axios';
import { chatService } from './services/chatService';
import { propertyService } from './services/propertyService';
import { documentService } from './services/documentService';
import { memoryService } from './services/memoryService';
import { stripeService } from './services/stripeService';
import { permitService } from './services/permitService';
import { searchService } from './services/searchService';
import { emailService } from './services/emailService';
import { estimatorService, validateProjectInput } from './services/estimatorService';
import { promptGeneratorService } from './services/promptGeneratorService';
import { registerPromptTemplateRoutes } from './routes/prompt-templates';
import { registerEstimateRoutes } from './routes/estimate-routes';
import { registerPropertyRoutes } from './routes/property-routes';
import { registerContractRoutes } from './routes/contract-routes';
import clientRoutes from './routes/clientRoutes';
import express from 'express'; // Import express to use express.raw

// Initialize OpenAI API
const GPT_MODEL = "gpt-4";
if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY no está configurado en las variables de entorno");
}
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Configuration object (needs to be populated appropriately)
const config = {
  fenceRules: {
    heightFactors: {
      "4": 1,
      "6": 1.2,
      "8": 1.5
    }
  }
};

// Helper functions for calculations
function calculateFencePrice(type: string, length: number, height: number, pricingSettings: any): number {
  const basePrice = type.toLowerCase().includes('wood') ? pricingSettings.fencePrices.wood : 
                  type.toLowerCase().includes('vinyl') ? pricingSettings.fencePrices.vinyl : 
                  pricingSettings.fencePrices.chainLink;

  // Apply height multiplier
  const heightMultiplier = config.fenceRules.heightFactors[height.toString()] || 1; // Use config for height factors

  return Math.round(basePrice * length * heightMultiplier);
}

function getFenceDetails(type: string): string {
  if (type.toLowerCase().includes('wood')) {
    return 'Pressure-treated pine, post-set in concrete';
  } else if (type.toLowerCase().includes('vinyl')) {
    return 'Premium vinyl panels, post-set in concrete';
  } else if (type.toLowerCase().includes('chain')) {
    return 'Galvanized chain link, post-set in concrete';
  }
  return 'Standard installation, post-set in concrete';
}

function calculateCompletionTime(length: number): string {
  if (length <= 50) return '3-5';
  if (length <= 100) return '5-7';
  if (length <= 200) return '7-10';
  return '10-14';
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Registrar rutas específicas
  registerPromptTemplateRoutes(app);
  registerEstimateRoutes(app);
  registerPropertyRoutes(app);
  registerContractRoutes(app);
  
  // Registrar rutas de clientes
  app.use('/api/clients', clientRoutes);

  // Add API routes
  app.get('/api/projects', async (req: Request, res: Response) => {
    try {
      // In a real app, we would get the user ID from the session
      const userId = 1; // Default user ID
      const projects = await storage.getProjectsByUserId(userId);
      res.json(projects);
    } catch (error) {
      console.error('Error fetching projects:', error);
      res.status(500).json({ message: 'Failed to fetch projects' });
    }
  });

  app.get('/api/projects/:projectId', async (req: Request, res: Response) => {
    try {
      const { projectId } = req.params;
      const project = await storage.getProjectByProjectId(projectId);

      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }

      res.json(project);
    } catch (error) {
      console.error('Error fetching project:', error);
      res.status(500).json({ message: 'Failed to fetch project' });
    }
  });

  app.post('/api/projects', async (req: Request, res: Response) => {
    try {
      const projectData = insertProjectSchema.parse(req.body);
      const project = await storage.createProject(projectData);
      res.status(201).json(project);
    } catch (error) {
      console.error('Error creating project:', error);
      res.status(400).json({ message: 'Invalid project data' });
    }
  });

  app.get('/api/templates/:type', async (req: Request, res: Response) => {
    try {
      const { type } = req.params;
      // In a real app, we would get the user ID from the session
      const userId = 1; // Default user ID
      const templates = await storage.getTemplatesByType(userId, type);
      res.json(templates);
    } catch (error) {
      console.error('Error fetching templates:', error);
      res.status(500).json({ message: 'Failed to fetch templates' });
    }
  });

  app.post('/api/templates', async (req: Request, res: Response) => {
    try {
      const templateData = insertTemplateSchema.parse(req.body);
      const template = await storage.createTemplate(templateData);
      res.status(201).json(template);
    } catch (error) {
      console.error('Error creating template:', error);
      res.status(400).json({ message: 'Invalid template data' });
    }
  });

  app.post('/api/chat', async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        message: z.string(),
        context: z.record(z.any()).optional(),
        userId: z.number().optional()
      });

      const { message, context = {}, userId = 1 } = schema.parse(req.body);
      const user = await storage.getUser(userId);
      const userContext = {
        contractorName: user?.company || 'Acme Fencing',
        contractorPhone: user?.phone || '(503) 555-1234',
        contractorEmail: user?.email || 'john@acmefencing.com',
        contractorAddress: user?.address || '123 Main St',
        contractorLicense: user?.license || 'CCB #123456',
        ...context
      };

      const response = await chatService.handleMessage(message, userContext);

      // Si tenemos un template en la respuesta, guardarlo como proyecto
      if (response.template && response.context) {
        try {
          // Generar un ID único para el proyecto
          const projectId = `proj_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

          // Preparar datos del proyecto
          const projectData = {
            userId: userId,
            projectId: projectId,
            clientName: response.context.clientName || 'Cliente',
            clientEmail: response.context.clientEmail || '',
            clientPhone: response.context.clientPhone || '',
            address: response.context.clientAddress || '',
            fenceType: response.context.fenceType || 'Wood Fence',
            status: 'estimate_generated',
            estimateHtml: response.template.html,
            details: JSON.stringify(response.context),
            createdAt: new Date(),
            updatedAt: new Date()
          };

          // Intentar guardar el proyecto
          try {
            const project = await storage.createProject(projectData);
            console.log('Proyecto guardado:', project.projectId);
          } catch (saveError) {
            console.error('Error al guardar el proyecto:', saveError);
          }
        } catch (projectError) {
          console.error('Error preparando datos del proyecto:', projectError);
        }
      }

      res.json(response);
    } catch (error) {
      console.error('Error processing chat message:', error);
      res.status(400).json({ message: 'Invalid request' });
    }
  });

  app.post('/api/generate-estimate', async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        projectDetails: z.record(z.any())
      });

      const { projectDetails } = schema.parse(req.body);

      // Get the default estimate template
      const userId = 1; // Default user ID
      const template = await storage.getDefaultTemplate(userId, "estimate");

      if (!template) {
        return res.status(404).json({ message: 'No default estimate template found' });
      }

      // Generate HTML from template
      const html = await generateEstimateHtml({
        fenceType: projectDetails.fenceType,
        fenceLength: projectDetails.fenceLength,
        fenceHeight: projectDetails.fenceHeight,
        gates: projectDetails.gates || [],
        clientName: projectDetails.clientName,
        address: projectDetails.address,
        context: projectDetails.context || {}
      });

      res.json({ html });
    } catch (error) {
      console.error('Error generating estimate:', error);
      res.status(400).json({ message: 'Failed to generate estimate' });
    }
  });

  // ** Nuevos endpoints para el generador de estimados **

  // Endpoint para validar datos de entrada
  app.post('/api/estimate/validate', async (req: Request, res: Response) => {
    try {
      // In a real app, we would get the user ID from the session
      const userId = 1; // Default user ID
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
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
      console.error('Error validating project data:', error);
      res.status(400).json({ message: 'Failed to validate project data' });
    }
  });

  // Endpoint para calcular estimado basado en reglas o IA
  app.post('/api/estimate/calculate', async (req: Request, res: Response) => {
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
          // Si es un proyecto de cerca, longitud es obligatoria
          if (data.length && data.length > 0) return true;

          // Si es un proyecto de techado, área es obligatoria
          if (data.area && data.area > 0) return true;

          return false;
        }, {
          message: "Se requiere longitud para cercas o área para techados"
        }),
        additionalFeatures: z.record(z.any()).optional(),

        // Generation options
        useAI: z.boolean().optional(),
        customPrompt: z.string().optional()
      });

      const validatedInput = inputSchema.parse(req.body);

      // Para modo de prueba, creamos datos de contratista mock
      const mockContractor = {
        id: 1,
        name: "Contractor Test",
        address: "123 Contractor St, San Diego, CA",
        phone: "555-987-6543",
        email: "contractor@example.com",
        license: "LIC-12345",
      };

      // Prepare data for the estimator service
      const estimateInput = {
        ...validatedInput,
        contractorId: mockContractor.id,
        contractorName: mockContractor.name,
        contractorAddress: mockContractor.address,
        contractorPhone: mockContractor.phone,
        contractorEmail: mockContractor.email,
        contractorLicense: mockContractor.license,
      };

      // Generate estimate
      const estimateResult = await estimatorService.generateEstimate(estimateInput);

      res.json(estimateResult);
    } catch (error) {
      console.error('Error calculating estimate:', error);

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
  app.post('/api/estimate/html', async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        estimateData: z.record(z.any())
      });

      const { estimateData } = schema.parse(req.body);

      // Generate HTML
      const html = await estimatorService.generateEstimateHtml(estimateData);

      res.json({ html });
    } catch (error) {
      console.error('Error generating estimate HTML:', error);
      res.status(500).json({ message: 'Error generando HTML del estimado' });
    }
  });

  // Endpoint para guardar el estimado como proyecto
  app.post('/api/estimate/save', async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        estimateData: z.record(z.any()),
        status: z.string().optional()
      });

      const { estimateData, status = 'draft' } = schema.parse(req.body);

      // In a real app, we would get the user ID from the session
      const userId = 1; // Default user ID

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
      console.error('Error saving estimate:', error);
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
      console.error('Error fetching materials:', error);
      res.status(500).json({ message: 'Error obteniendo materiales' });
    }
  });

  // Endpoint para generar un prompt y obtener estimado asistido por IA
  app.post('/api/estimate/generate-prompt', async (req: Request, res: Response) => {
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
      console.error('Error generating prompt:', error);
      res.status(500).json({ message: 'Error generando prompt' });
    }
  });

  // Endpoint para procesar un prompt con IA y obtener un estimado estructurado
  app.post('/api/estimate/process-prompt', async (req: Request, res: Response) => {
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
      console.error('Error processing prompt with AI:', error);
      res.status(500).json({ message: 'Error procesando prompt con IA' });
    }
  });

  // Endpoint para enviar estimado por email
  app.post('/api/estimate/send-email', async (req: Request, res: Response) => {
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
      console.error('Error sending email:', error);
      res.status(500).json({ message: 'Error enviando email' });
    }
  });

  app.post('/api/generate-contract', async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        projectDetails: z.record(z.any())
      });

      const { projectDetails } = schema.parse(req.body);

      // Get the default contract template
      const userId = 1; // Default user ID
      const template = await storage.getDefaultTemplate(userId, "contract");

      if (!template) {
        return res.status(404).json({ message: 'No default contract template found' });
      }

      // Generate HTML from template
      const html = await generateContractHtml(projectDetails);

      res.json({ html });
    } catch (error) {
      console.error('Error generating contract:', error);
      res.status(400).json({ message: 'Failed to generate contract' });
    }
  });

  app.post('/api/generate-pdf', async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        html: z.string(),
        filename: z.string()
      });

      const { html, filename } = schema.parse(req.body);

      // Generate PDF from HTML
      const pdfBuffer = await generatePDF(html, 'estimate');

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(pdfBuffer);
    } catch (error) {
      console.error('Error generating PDF:', error);
      res.status(400).json({ message: 'Failed to generate PDF' });
    }
  });

  // *** SUBSCRIPTION ROUTES ***
  app.get('/api/subscription/plans', async (req: Request, res: Response) => {
    try {
      const plans = await storage.getAllSubscriptionPlans();

      // Si no hay planes, devolver planes por defecto para desarrollo
      if (!plans || plans.length === 0) {
        const defaultPlans = [
          {
            id: 1,
            name: "Primo Chambeador",
            description: "Ideal para quien quiere ver la magia de Mervin antes de invertir",
            price: 0,
            yearlyPrice: 0,
            features: [
              "Estimados IA: Hasta 5 mensuales con marca de agua",
              "Contratos PDF: Hasta 2 mensuales con marca de agua",
              "Templates: Sólo básicas, sin personalización",
              "Property Verifier: 5 búsquedas/mes",
              "Soporte: Email (respuesta en 72 h)",
              "Acceso Trial: AR Estimator en modo demo",
              "Historial: Últimos 2 proyectos"
            ],
            motto: "Empieza rompiendo el suelo, termina construyendo tu legado",
            code: "primo_chambeador",
            isActive: true
          },
          {
            id: 2,
            name: "El Mero Patrón",
            description: "Para el patrón que ya factura constante y quiere optimizar cada minuto",
            price: 4999,
            yearlyPrice: 49999,
            features: [
              "Estimados IA: Ilimitados, sin marca de agua",
              "Contratos: Hasta 50 mensuales con tu logo y datos",
              "Templates: Avanzados, control de colores y fuentes",
              "Property Verifier: 50 búsquedas/mes",
              "Métricas & Reportes: Estadísticas completas",
              "AR Fence Estimator: Acceso completo",
              "Soporte: Email prioritario (24 h)",
              "Historial completo: Todos los proyectos"
            ],
            motto: "No sigues proyectos… los proyectos te siguen a ti.",
            code: "mero_patron",
            isActive: true
          },
          {
            id: 3,
            name: "El Chingón Mayor",
            description: "Para el chingón que quiere delegar TODO el papeleo y subir su nivel a otra liga",
            price: 9999,
            yearlyPrice: 99999,
            features: [
              "Todo lo de 'Mero Patrón', más:",
              "Estimados & Contratos IA ilimitados",
              "Ownership Verifier ilimitado",
              "IA Personalizada: Mervin aprende tu estilo y forma de cobrar",
              "Notificaciones Real Time: App + email al aprobar/firmar",
              "AI Project Manager completo: Seguimiento de hitos y pagos",
              "PermitAdvisor: Recomendaciones según municipio",
              "Soporte VIP: Chat en vivo y llamadas programadas",
              "Capacitación 1:1 mensual personalizada"
            ],
            motto: "El nivel donde el éxito lleva tu nombre como estandarte.",
            code: "chingon_mayor",
            isActive: true
          }
        ];
        return res.json(defaultPlans);
      }

      res.json(plans);
    } catch (error) {
      console.error('Error al obtener planes de suscripción:', error);
      res.status(500).json({ message: 'Error al obtener planes de suscripción' });
    }
  });

  app.get('/api/subscription/user-subscription', async (req: Request, res: Response) => {
    try {
      // En una app real, obtendríamos el userId de la sesión
      const userId = 1; // Default user ID
      const subscription = await storage.getUserSubscriptionByUserId(userId);

      if (!subscription) {
        return res.json({ active: false });
      }

      // Si hay una suscripción, obtener el plan asociado
      const plan = await storage.getSubscriptionPlan(subscription.planId || 0);

      res.json({
        active: subscription.status === 'active',
        subscription,
        plan
      });
    } catch (error) {
      console.error('Error al obtener suscripción del usuario:', error);
      res.status(500).json({ message: 'Error al obtener suscripción' });
    }
  });

  app.post('/api/subscription/create-checkout', async (req: Request, res: Response) => {
    console.log(`[${new Date().toISOString()}] Iniciando creación de checkout`);
    try {
      console.log('Solicitud de creación de checkout recibida:', req.body);

      // Validar los parámetros de la solicitud
      const schema = z.object({
        planId: z.number(),
        billingCycle: z.enum(['monthly', 'yearly']),
        successUrl: z.string(),
        cancelUrl: z.string()
      });

      const validationResult = schema.safeParse(req.body);

      if (!validationResult.success) {
        console.error('Error de validación:', validationResult.error);
        return res.status(400).json({ 
          message: 'Datos de solicitud inválidos',
          errors: validationResult.error.format() 
        });
      }

      const { planId, billingCycle, successUrl, cancelUrl } = validationResult.data;

      // Verificar que el plan existe
      const plan = await storage.getSubscriptionPlan(planId);
      if (!plan) {
        console.error(`Plan con ID ${planId} no encontrado`);
        return res.status(404).json({ message: 'Plan de suscripción no encontrado' });
      }

      // En una app real, obtendríamos el userId y la información del usuario de la sesión
      const userId = 1;
      const user = await storage.getUser(userId);

      if (!user) {
        console.error(`Usuario con ID ${userId} no encontrado`);
        return res.status(404).json({ message: 'Usuario no encontrado' });
      }

      console.log(`Creando sesión de checkout para plan: ${plan.name}, ciclo: ${billingCycle}`);

      try {
        const checkoutUrl = await stripeService.createSubscriptionCheckout({
          planId,
          userId,
          email: user.email || 'cliente@example.com',
          name: user.company || 'Cliente',
          billingCycle,
          successUrl,
          cancelUrl
        });

        if (!checkoutUrl) {
          throw new Error('No se recibió URL de checkout válida');
        }

        console.log('Sesión de checkout creada exitosamente, URL:', checkoutUrl.substring(0, 60) + '...');
        res.json({ url: checkoutUrl });
      } catch (stripeError: any) {
        console.error('Error específico de Stripe:', stripeError.message || stripeError);
        res.status(502).json({ 
          message: 'Error al comunicarse con el servicio de pagos',
          details: stripeError.message || 'Error desconocido'
        });
      }
    } catch (error: any) {
      console.error('Error general al crear sesión de checkout:', error);
      res.status(500).json({ 
        message: 'Error al crear sesión de checkout',
        details: error.message || 'Error desconocido'
      });
    }
  });

  app.post('/api/subscription/create-portal', async (req: Request, res: Response) => {
    try {
      console.log('Solicitud de creación de portal de cliente recibida:', req.body);

      // Validar los parámetros de la solicitud
      const schema = z.object({
        successUrl: z.string()
      });

      const validationResult = schema.safeParse(req.body);

      if (!validationResult.success) {
        console.error('Error de validación:', validationResult.error);
        return res.status(400).json({ 
          message: 'Datos de solicitud inválidos',
          errors: validationResult.error.format() 
        });
      }

      const { successUrl } = validationResult.data;

      // En una app real, obtendríamos el userId de la sesión
      const userId = 1;

      // Verificar que el usuario tiene una suscripción activa
      const subscription = await storage.getUserSubscriptionByUserId(userId);

      if (!subscription) {
        console.error(`No se encontró una suscripción activa para el usuario ${userId}`);
        return res.status(404).json({ message: 'No se encontró una suscripción activa' });
      }

      console.log(`Creando portal de cliente para suscripción ID: ${subscription.id}`);

      try {
        const portalUrl = await stripeService.createCustomerPortalSession({
          subscriptionId: subscription.id,
          userId,
          successUrl,
          cancelUrl: successUrl
        });

        if (!portalUrl) {
          throw new Error('No se recibió URL del portal válida');
        }

        console.log('Portal de cliente creado exitosamente, URL:', portalUrl.substring(0, 60) + '...');
        res.json({ url: portalUrl });
      } catch (stripeError: any) {
        console.error('Error específico de Stripe:', stripeError.message || stripeError);
        res.status(502).json({ 
          message: 'Error al comunicarse con el servicio de pagos',
          details: stripeError.message || 'Error desconocido'
        });
      }
    } catch (error: any) {
      console.error('Error general al crear portal de cliente:', error);
      res.status(500).json({ 
        message: 'Error al crear portal de cliente',
        details: error.message || 'Error desconocido'
      });
    }
  });

  app.post('/api/webhook/stripe', express.raw({type: 'application/json'}), async (req: Request, res: Response) => {
    try {
      await stripeService.handleWebhookEvent(req.body);
      res.json({ received: true });
    } catch (error) {
      console.error('Error al procesar webhook de Stripe:', error);
      res.status(400).send(`Webhook Error: ${error.message}`);
    }
  });

  app.get('/api/subscription/payment-history', async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "No autenticado" });
      }

      const userId = req.user.id;

      // Obtenemos la suscripción del usuario para conseguir el customerId
      const subscription = await storage.getUserSubscriptionByUserId(userId);

      if (!subscription || !subscription.stripeCustomerId) {
        return res.json([]);
      }

      // Usar Stripe para obtener las facturas
      const invoices = await stripeService.getCustomerInvoices(subscription.stripeCustomerId);

      res.json(invoices);
    } catch (error) {
      console.error('Error al obtener historial de pagos:', error);
      res.status(500).json({ message: 'Error al obtener historial de pagos' });
    }
  });

  app.get('/api/subscription/payment-methods', async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "No autenticado" });
      }

      const userId = req.user.id;

      // Obtenemos la suscripción del usuario para conseguir el customerId
      const subscription = await storage.getUserSubscriptionByUserId(userId);

      if (!subscription || !subscription.stripeCustomerId) {
        return res.json([]);
      }

      // Usar Stripe para obtener los métodos de pago
      const paymentMethods = await stripeService.getCustomerPaymentMethods(subscription.stripeCustomerId);

      res.json(paymentMethods);
    } catch (error) {
      console.error('Error al obtener métodos de pago:', error);
      res.status(500).json({ message: 'Error al obtener métodos de pago' });
    }
  });

  app.post('/api/subscription/update-payment-method', async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "No autenticado" });
      }

      const userId = req.user.id;
      const returnUrl = req.body.returnUrl || `${req.protocol}://${req.get('host')}/billing?success=true`;

      // Obtenemos la suscripción del usuario para conseguir el customerId
      const subscription = await storage.getUserSubscriptionByUserId(userId);

      if (!subscription || !subscription.stripeCustomerId) {
        return res.status(400).json({ message: 'No se encontró información de suscripción' });
      }

      // Crear sesión de configuración de método de pago
      const session = await stripeService.createSetupSession({
        customerId: subscription.stripeCustomerId,
        returnUrl
      });

      res.json({ url: session.url });
    } catch (error) {
      console.error('Error al crear sesión de actualización de método de pago:', error);
      res.status(500).json({ message: 'Error al crear sesión de actualización' });
    }
  });

  // Endpoint para crear un Setup Intent para tarjetas
  app.post('/api/subscription/setup-intent', async (req: Request, res: Response) => {
    try {
      // En un entorno real, usaríamos req.isAuthenticated() desde passport
      // Para desarrollo, asumiremos que estamos autenticados
      // if (!req.isAuthenticated()) {
      //   return res.status(401).json({ message: "No autenticado" });
      // }

      // Usar un ID de usuario fijo para desarrollo
      const userId = 1; // En producción: req.user.id

      // Obtenemos la suscripción del usuario para conseguir el customerId
      let subscription = await storage.getUserSubscriptionByUserId(userId);

      // Si no existe una suscripción con customerId, creamos un cliente
      if (!subscription || !subscription.stripeCustomerId) {
        // Primero, verificamos si existe el usuario
        const user = await storage.getUser(userId);
        if (!user) {
          return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        // Crear un cliente en Stripe
        const customer = await stripeService.createCustomer({
          email: user.email || undefined,
          name: user.username
        });

        // Si no hay suscripción, la creamos
        if (!subscription) {
          subscription = await storage.createUserSubscription({
            userId,
            planId: null,
            status: 'inactive',
            stripeCustomerId: customer.id,
            stripeSubscriptionId: null,
            currentPeriodStart: new Date(), // Usamos campos correctos del schema
            currentPeriodEnd: null,
            cancelAtPeriodEnd: false,
            billingCycle: 'monthly',
            nextBillingDate: null
          });
        } else {
          // Actualizar la suscripción existente con el customerId
          subscription = await storage.updateUserSubscription(subscription.id, {
            stripeCustomerId: customer.id
          });
        }
      }

      // Crear un setup intent usando el servicio de Stripe
      const setupIntent = await stripeService.createSetupIntent(subscription.stripeCustomerId);

      res.json({ clientSecret: setupIntent.client_secret });
    } catch (error) {
      console.error('Error al crear setup intent:', error);
      res.status(500).json({ message: 'Error al procesar la solicitud' });
    }
  });

  // Ruta para sincronizar planes con Stripe (solo para administradores)
  app.post('/api/admin/sync-plans', async (req: Request, res: Response) => {
    try {
      // En una app real, verificaríamos que el usuario es un administrador
      await stripeService.syncPlansWithStripe();
      res.json({ success: true });
    } catch (error) {
      console.error('Error al sincronizar planes con Stripe:', error);
      res.status(500).json({ message: 'Error al sincronizar planes' });
    }
  });

  // Rutas para clientes
  app.get('/api/clients', async (req: Request, res: Response) => {
    try {
      // En una app real, obtendríamos el userId de la sesión
      const userId = 1;
      const clients = await storage.getClientsByUserId(userId);
      res.json(clients);
    } catch (error) {
      console.error('Error fetching clients:', error);
      res.status(500).json({ message: 'Error al obtener los clientes' });
    }
  });

  app.post('/api/clients', async (req: Request, res: Response) => {
    try {
      const userId = 1; // En producción, obtener del token de autenticación
      const clientData = {
        ...req.body,
        userId,
        clientId: `client_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const newClient = await storage.createClient(clientData);
      res.status(201).json(newClient);
    } catch (error) {
      console.error('Error creating client:', error);
      res.status(400).json({ message: 'Error al crear el cliente' });
    }
  });

  app.post('/api/clients/import/csv', async (req: Request, res: Response) => {
    try {
      const userId = 1; // En producción, obtener del token de autenticación
      const { csvData } = req.body;

      // Procesar el CSV y crear los clientes
      const rows = csvData.split('\n').slice(1); // Ignorar encabezados
      const clients = [];

      for (const row of rows) {
        const [name, email, phone, address] = row.split(',');
        if (name) {
          const clientData = {
            userId,
            clientId: `client_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            name: name.trim(),
            email: email?.trim(),
            phone: phone?.trim(),
            address: address?.trim(),
            createdAt: new Date(),
            updatedAt: new Date()
          };

          const newClient = await storage.createClient(clientData);
          clients.push(newClient);
        }
      }

      res.status(201).json({
        message: `${clients.length} clientes importados exitosamente`,
        clients
      });
    } catch (error) {
      console.error('Error importing clients:', error);
      res.status(400).json({ message: 'Error al importar clientes' });
    }
  });

  app.post('/api/clients/import/vcf', async (req: Request, res: Response) => {
    try {
      const userId = 1; // En producción, obtener del token de autenticación
      const { vcfData } = req.body;

      // Procesar datos vCard (formato .vcf de contactos de Apple)
      const vCards = vcfData.split('END:VCARD')
        .filter(card => card.trim().length > 0)
        .map(card => card + 'END:VCARD');
      
      const clients = [];

      for (const vCard of vCards) {
        try {
          // Extraer datos básicos del vCard
          const nameMatch = vCard.match(/FN:(.*?)(?:\r\n|\n)/);
          const emailMatch = vCard.match(/EMAIL.*?:(.*?)(?:\r\n|\n)/);
          const phoneMatch = vCard.match(/TEL.*?:(.*?)(?:\r\n|\n)/);
          const addressMatch = vCard.match(/ADR.*?:(.*?)(?:\r\n|\n)/);

          const name = nameMatch ? nameMatch[1].trim() : null;
          
          if (name) {
            const email = emailMatch ? emailMatch[1].trim() : null;
            const phone = phoneMatch ? phoneMatch[1].trim() : null;
            let address = null;
            
            if (addressMatch) {
              const addressParts = addressMatch[1].split(';');
              // Formato típico: ;;calle;ciudad;estado;código postal;país
              address = addressParts.slice(2).filter(part => part.trim()).join(', ');
            }

            const clientData = {
              userId,
              clientId: `client_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
              name,
              email,
              phone,
              address,
              createdAt: new Date(),
              updatedAt: new Date()
            };

            const newClient = await storage.createClient(clientData);
            clients.push(newClient);
          }
        } catch (cardError) {
          console.error('Error processing individual vCard:', cardError);
          // Continuar con la siguiente tarjeta
        }
      }

      res.status(201).json({
        message: `${clients.length} contactos importados exitosamente`,
        clients
      });
    } catch (error) {
      console.error('Error importing vCard contacts:', error);
      res.status(400).json({ message: 'Error al importar contactos de Apple' });
    }
  });

  app.get('/api/user-profile', async (req: Request, res: Response) => {
    try {
      // En producción, obtener userId del token de autenticación
      const userId = 1; // Por ahora usar ID fijo para desarrollo
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ 
          message: "Perfil no encontrado",
          code: "PROFILE_NOT_FOUND"
        });
      }

      // Asegurarse de que todos los campos requeridos existan
      const profile = {
        companyName: user.companyName || "",
        ownerName: user.ownerName || "",
        role: user.role || "",
        email: user.email || "",
        phone: user.phone || "",
        mobilePhone: user.mobilePhone || "",
        address: user.address || "",
        city: user.city || "",
        state: user.state || "",
        zipCode: user.zipCode || "",
        license: user.license || "",
        insurancePolicy: user.insurancePolicy || "",
        ein: user.ein || "",
        businessType: user.businessType || "",
        yearEstablished: user.yearEstablished || "",
        website: user.website || "",
        description: user.description || "",
        specialties: user.specialties || [],
        socialMedia: user.socialMedia || {},
        documents: user.documents || {},
        logo: user.logo || ""
      };

      res.json(profile);
    } catch (error) {
      console.error("Error loading profile:", error);
      res.status(500).json({ 
        message: "Error al cargar el perfil",
        code: "INTERNAL_ERROR"
      });
    }
  });
  
  // Endpoint para actualizar el perfil de usuario
  app.post('/api/user-profile', async (req: Request, res: Response) => {
    try {
      // En producción, obtener userId del token de autenticación
      const userId = 1; // Por ahora usar ID fijo para desarrollo
      
      // Verificar que el usuario existe
      const existingUser = await storage.getUser(userId);
      if (!existingUser) {
        return res.status(404).json({
          message: "Usuario no encontrado",
          code: "USER_NOT_FOUND"
        });
      }
      
      // Actualizar el perfil del usuario
      const profileData = req.body;
      
      // Preparar datos para actualizar, preservando datos existentes
      const userData: Partial<User> = {
        ...profileData,
        updatedAt: new Date()
      };
      
      // Guardar los cambios en la base de datos
      await storage.updateUser(userId, userData);
      
      // Responder con éxito
      res.json({
        success: true,
        message: "Perfil actualizado correctamente"
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({
        success: false,
        message: "Error al actualizar el perfil",
        code: "INTERNAL_ERROR"
      });
    }
  });


  // Endpoint para sugerencias de direcciones
  app.get('/api/address/suggestions', async (req: Request, res: Response) => {
    const query = req.query.query as string;
    try {
      const response = await axios.get(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&types=address&key=${process.env.GOOGLE_MAPS_API_KEY}`
      );

      const suggestions = response.data.predictions.map((prediction: any) => prediction.description);
      res.json(suggestions);
    } catch (error) {
      console.error('Error fetching address suggestions:', error);
      res.status(500).json({ error: 'Error fetching suggestions' });
    }
  });

  // Endpoint para obtener detalles de una propiedad por dirección
  // Endpoints para el historial de búsqueda de propiedades
  app.get('/api/property/history', async (req: Request, res: Response) => {
    try {
      // En una aplicación real, obtendríamos el userId de la sesión
      const userId = 1; // ID de usuario por defecto para pruebas
      
      const history = await storage.getPropertySearchHistoryByUserId(userId);
      res.json(history);
    } catch (error) {
      console.error('Error al obtener historial de búsqueda de propiedades:', error);
      res.status(500).json({ message: 'Error al obtener historial de búsqueda de propiedades' });
    }
  });

  app.get('/api/property/history/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const historyItem = await storage.getPropertySearchHistory(parseInt(id));
      
      if (!historyItem) {
        return res.status(404).json({ message: 'Historial de búsqueda no encontrado' });
      }
      
      res.json(historyItem);
    } catch (error) {
      console.error('Error al obtener detalle de historial de propiedad:', error);
      res.status(500).json({ message: 'Error al obtener detalle de historial de propiedad' });
    }
  });
  
  app.post('/api/property/history/:id/favorite', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { isFavorite } = req.body;
      
      // Verificar que el historial existe
      const historyItem = await storage.getPropertySearchHistory(parseInt(id));
      if (!historyItem) {
        return res.status(404).json({ message: 'Historial de búsqueda no encontrado' });
      }
      
      // Actualizar el estado de favorito
      const updatedHistory = await storage.updatePropertySearchHistory(parseInt(id), {
        isFavorite: !!isFavorite
      });
      
      res.json(updatedHistory);
    } catch (error) {
      console.error('Error al actualizar favorito:', error);
      res.status(500).json({ message: 'Error al actualizar favorito' });
    }
  });
  
  app.post('/api/property/history/:id/notes', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { notes } = req.body;
      
      // Verificar que el historial existe
      const historyItem = await storage.getPropertySearchHistory(parseInt(id));
      if (!historyItem) {
        return res.status(404).json({ message: 'Historial de búsqueda no encontrado' });
      }
      
      // Actualizar las notas
      const updatedHistory = await storage.updatePropertySearchHistory(parseInt(id), {
        notes
      });
      
      res.json(updatedHistory);
    } catch (error) {
      console.error('Error al actualizar notas:', error);
      res.status(500).json({ message: 'Error al actualizar notas' });
    }
  });

  app.get('/api/property/details', async (req: Request, res: Response) => {
    const address = req.query.address as string;

    if (!address) {
      return res.status(400).json({ 
        message: 'Se requiere el parámetro "address"' 
      });
    }

    console.log('===== INICIO DE SOLICITUD DE DETALLES DE PROPIEDAD =====');
    console.log('Solicitando datos de propiedad para dirección:', address);

    try {
      // Usar el servicio externo ATTOM directamente
      const ATTOM_WRAPPER_URL = 'https://attom-wrapper.replit.app';
      console.log(`Intentando conexión directa con el servicio ATTOM en: ${ATTOM_WRAPPER_URL}`);
      
      try {
        // Probar la conexión con el wrapper
        const testResponse = await axios.get(`${ATTOM_WRAPPER_URL}/api/health`, { 
          timeout: 5000 
        });
        console.log('Estado del servicio ATTOM:', testResponse.data || 'Sin datos de estado');
      } catch (healthError) {
        console.error('Error verificando estado del servicio ATTOM:', healthError.message);
        // Continuamos aunque falle la verificación de salud
      }
      
      // Procedemos con múltiples intentos para obtener datos
      const startTime = Date.now();
      console.log('Intentos para obtener datos de propiedad:');
      
      // Intento 1: Enviar dirección completa
      console.log('Intento 1 - Dirección completa');
      try {
        const response = await axios.get(`${ATTOM_WRAPPER_URL}/api/property/details`, {
          params: { address },
          timeout: 15000
        });
        
        console.log('Intento 1 exitoso. Datos recibidos:', response.data ? 'Sí' : 'No');
        
        if (response.data) {
          const propertyData = {
            owner: response.data.owner || 'No disponible',
            address: response.data.address || address,
            sqft: response.data.buildingAreaSqFt || response.data.sqft || 0,
            bedrooms: response.data.rooms?.bedrooms || response.data.bedrooms || 0,
            bathrooms: response.data.rooms?.bathrooms || response.data.bathrooms || 0,
            lotSize: response.data.lotSizeAcres 
              ? `${response.data.lotSizeAcres} acres` 
              : response.data.lotSize || 'No disponible',
            landSqft: response.data.lotSizeSqFt || 0,
            yearBuilt: response.data.yearBuilt || 0,
            propertyType: response.data.propertyType || 'Residencial',
            ownerOccupied: !!response.data.ownerOccupied,
            verified: true,
            ownershipVerified: !!response.data.owner,
            // Info adicional si está disponible
            purchaseDate: response.data.saleTransHistory?.[0]?.saleTransDate,
            purchasePrice: response.data.saleTransHistory?.[0]?.saleTransAmount,
            previousOwner: response.data.saleTransHistory?.[1]?.seller,
            ownerHistory: response.data.saleTransHistory?.map((entry: any) => ({
              owner: entry.buyer || 'Desconocido',
              purchaseDate: entry.saleTransDate,
              purchasePrice: entry.saleTransAmount,
              saleDate: entry.recordingDate,
              salePrice: entry.saleTransAmount
            }))
          };
          
          const endTime = Date.now();
          console.log(`Solicitud completada en ${endTime - startTime}ms con estado: SUCCESS`);
          console.log('Enviando respuesta al cliente...');
          console.log('===== FIN DE SOLICITUD DE DETALLES DE PROPIEDAD =====\n');
          
          // Guardar la búsqueda en el historial
          try {
            // En una aplicación real, obtendríamos el userId de la sesión
            const userId = 1; // ID de usuario por defecto para pruebas
            
            // Crear un título basado en la dirección
            const title = `Propiedad en ${address}`;
            
            // Preparar datos para el historial
            const historyData = {
              userId,
              address,
              ownerName: propertyData.owner,
              results: propertyData,
              title,
              isFavorite: false,
              parcelNumber: propertyData.parcelNumber || '',
              tags: [] // Inicialmente sin etiquetas
            };
            
            // Validar los datos antes de guardar
            const validHistoryData = insertPropertySearchHistorySchema.parse(historyData);
            
            // Guardar en la base de datos
            await storage.createPropertySearchHistory(validHistoryData);
            console.log('Búsqueda guardada en el historial de propiedades');
          } catch (historyError) {
            // En caso de error al guardar el historial, solo lo registramos pero no interrumpimos la respuesta
            console.error('Error al guardar en historial de propiedades:', historyError);
          }
          
          return res.json(propertyData);
        }
      } catch (error1) {
        console.log('Intento 1 falló:', error1.message || 'Error desconocido');
        console.log('Código de estado:', error1.response?.status || 'N/A');
      }
      
      // Intento 2: Usar el formato de componentes
      console.log('Intento 2 - Formato de componentes de dirección');
      try {
        // Parsear dirección en componentes
        const addressParts = address.split(',').map(part => part.trim());
        const streetAddress = addressParts[0];
        const city = addressParts.length > 1 ? addressParts[1] : '';
        const stateZip = addressParts.length > 2 ? addressParts[2].split(' ') : ['', ''];
        const state = stateZip[0] || '';
        const zip = stateZip.length > 1 ? stateZip[1] : '';
        
        console.log('Componentes de dirección:', { streetAddress, city, state, zip });
        
        const response = await axios.get(`${ATTOM_WRAPPER_URL}/api/property/details`, {
          params: { 
            street: streetAddress,
            city,
            state,
            zip
          },
          timeout: 15000
        });
        
        if (response.data) {
          const propertyData = {
            owner: response.data.owner || 'No disponible',
            address: response.data.address || address,
            sqft: response.data.buildingAreaSqFt || response.data.sqft || 0,
            bedrooms: response.data.rooms?.bedrooms || response.data.bedrooms || 0,
            bathrooms: response.data.rooms?.bathrooms || response.data.bathrooms || 0,
            lotSize: response.data.lotSizeAcres 
              ? `${response.data.lotSizeAcres} acres` 
              : response.data.lotSize || 'No disponible',
            landSqft: response.data.lotSizeSqFt || 0,
            yearBuilt: response.data.yearBuilt || 0,
            propertyType: response.data.propertyType || 'Residencial',
            ownerOccupied: !!response.data.ownerOccupied,
            verified: true,
            ownershipVerified: !!response.data.owner
          };
          
          const endTime = Date.now();
          console.log(`Solicitud completada en ${endTime - startTime}ms con estado: SUCCESS`);
          console.log('Enviando respuesta al cliente...');
          console.log('===== FIN DE SOLICITUD DE DETALLES DE PROPIEDAD =====\n');
          
          // Guardar la búsqueda en el historial
          try {
            // En una aplicación real, obtendríamos el userId de la sesión
            const userId = 1; // ID de usuario por defecto para pruebas
            
            // Crear un título basado en la dirección
            const title = `Propiedad en ${address}`;
            
            // Preparar datos para el historial
            const historyData = {
              userId,
              address,
              ownerName: propertyData.owner,
              results: propertyData,
              title,
              isFavorite: false,
              parcelNumber: propertyData.parcelNumber || '',
              tags: [] // Inicialmente sin etiquetas
            };
            
            // Validar los datos antes de guardar
            const validHistoryData = insertPropertySearchHistorySchema.parse(historyData);
            
            // Guardar en la base de datos
            await storage.createPropertySearchHistory(validHistoryData);
            console.log('Búsqueda guardada en el historial de propiedades (intento 2)');
          } catch (historyError) {
            // En caso de error al guardar el historial, solo lo registramos pero no interrumpimos la respuesta
            console.error('Error al guardar en historial de propiedades:', historyError);
          }
          
          return res.json(propertyData);
        }
      } catch (error2) {
        console.log('Intento 2 falló:', error2.message || 'Error desconocido');
      }
      
      // Intento 3: Usar servicio interno
      console.log('Intento 3 - Servicio interno propertyService');
      try {
        const result = await propertyService.getPropertyDetailsWithDiagnostics(address);
        const endTime = Date.now();
        
        console.log(`Solicitud interna completada en ${endTime - startTime}ms con estado: ${result.status}`);
        console.log('Diagnóstico de la solicitud:', {
          status: result.status,
          parsedAddress: result.diagnostics?.parsedAddress ? 'disponible' : 'no disponible',
          errorType: result.error?.code || 'ninguno',
          processingTime: endTime - startTime
        });
        
        if (result.status === 'SUCCESS' && result.data) {
          console.log('ÉXITO: Datos verificados obtenidos de servicio interno');
          console.log('Enviando respuesta al cliente...');
          console.log('===== FIN DE SOLICITUD DE DETALLES DE PROPIEDAD =====\n');
          
          return res.json(result.data);
        }
        
        if (result.status === 'NOT_FOUND') {
          console.log('No se encontró información para la dirección proporcionada');
          console.log('===== FIN DE SOLICITUD DE DETALLES DE PROPIEDAD =====\n');
          
          return res.status(404).json({ 
            message: 'No se encontró información para la dirección proporcionada',
            details: 'Verifica que la dirección esté correctamente escrita e incluya ciudad, estado y código postal'
          });
        }
      } catch (error3) {
        console.log('Intento 3 falló:', error3.message || 'Error desconocido');
      }
      
      // Si llegamos aquí, todos los intentos han fallado
      console.log('Todos los intentos fallaron. No se pudo obtener información de propiedad.');
      return res.status(404).json({ 
        message: 'No se encontró información para la dirección proporcionada',
        details: 'Verifica que la dirección esté correctamente escrita. Por ejemplo: "123 Main St, Seattle, WA 98101"'
      });
    } catch (error: any) {
      console.error('ERROR EN VERIFICACIÓN DE PROPIEDAD:');
      console.error('Mensaje:', error.message);

      res.status(500).json({ 
        message: 'Error al obtener detalles de la propiedad',
        error: error.message
      });
    }
  });

  // Endpoint para Mervin DeepSearch - Permite consultar permisos y regulaciones para proyectos de construcción
  // Endpoints para el historial de búsqueda de permisos
  app.get('/api/permit/history', async (req: Request, res: Response) => {
    try {
      // En una aplicación real, obtendríamos el userId de la sesión
      const userId = 1; // ID de usuario por defecto
      
      const history = await storage.getPermitSearchHistoryByUserId(userId);
      res.json(history);
    } catch (error) {
      console.error('Error al obtener historial de búsqueda de permisos:', error);
      res.status(500).json({ message: 'Error al obtener historial de búsqueda' });
    }
  });

  app.get('/api/permit/history/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const historyItem = await storage.getPermitSearchHistory(parseInt(id));
      
      if (!historyItem) {
        return res.status(404).json({ message: 'Historial de búsqueda no encontrado' });
      }
      
      res.json(historyItem);
    } catch (error) {
      console.error('Error al obtener detalle de historial:', error);
      res.status(500).json({ message: 'Error al obtener detalle de historial' });
    }
  });

  app.post('/api/permit/check', async (req: Request, res: Response) => {
    try {
      console.log('===== INICIO DE SOLICITUD MERVIN DEEPSEARCH =====');

      // Validar el esquema de la solicitud
      const permitSchema = z.object({
        address: z.string().min(5, "La dirección es demasiado corta"),
        projectType: z.string().min(3, "El tipo de proyecto es demasiado corto")
      });

      const validationResult = permitSchema.safeParse(req.body);

      if (!validationResult.success) {
        console.error('Error de validación en solicitud de permisos:', validationResult.error);
        return res.status(400).json({ 
          message: 'Datos de solicitud inválidos',
          errors: validationResult.error.format() 
        });
      }

      const { address, projectType } = validationResult.data;
      console.log(`Consultando permisos para proyecto de ${projectType} en ${address}`);

      // Verificar que tenemos API key de OpenAI configurada
      if (!process.env.OPENAI_API_KEY) {
        console.error('Error: OpenAI API Key no configurada');
        return res.status(500).json({
          message: 'Error de configuración del servicio',
          error: 'No se ha configurado la API de OpenAI'
        });
      }

      // Obtener información de permisos
      const startTime = Date.now();
      const permitData = await permitService.checkPermits(address, projectType);
      const endTime = Date.now();

      console.log(`Solicitud completada en ${endTime - startTime}ms`);
      console.log('Información de permisos obtenida correctamente');
      
      // Guardar la búsqueda en el historial
      try {
        // En una aplicación real, obtendríamos el userId de la sesión
        const userId = 1; // ID de usuario por defecto
        
        // Crear un título basado en los parámetros de búsqueda
        const title = `${projectType} en ${address}`;
        
        // Obtener la descripción del proyecto si está disponible
        const projectDescription = req.body.projectDescription || '';
        
        // Guardar en el historial
        const historyData = {
          userId,
          address,
          projectType,
          projectDescription,
          results: permitData, // Guardar todos los resultados
          title
        };
        
        // Validar los datos antes de guardar
        const validHistoryData = insertPermitSearchHistorySchema.parse(historyData);
        
        // Guardar en la base de datos
        await storage.createPermitSearchHistory(validHistoryData);
        console.log('Búsqueda guardada en el historial');
      } catch (historyError) {
        // En caso de error al guardar el historial, solo lo registramos pero no interrumpimos la respuesta
        console.error('Error al guardar historial de búsqueda:', historyError);
      }
      
      console.log('===== FIN DE SOLICITUD MERVIN DEEPSEARCH =====');

      res.json(permitData);
    } catch (error: any) {
      console.error('ERROR EN VERIFICACIÓN DE PERMISOS:');
      console.error('Mensaje:', error.message);

      res.status(500).json({ 
        message: 'Error al obtener información de permisos y regulaciones',
        error: error.message
      });
    }
  });

  // Endpoint para probar la funcionalidad de búsqueda web de Mervin DeepSearch
  app.get('/api/permit/test/search', async (req: Request, res: Response) => {
    try {
      console.log('===== PRUEBA DE BÚSQUEDA WEB MERVIN DEEPSEARCH =====');

      // Verificar que tenemos API key de OpenAI configurada
      if (!process.env.OPENAI_API_KEY) {
        console.error('Error: OpenAI API Key no configurada');
        return res.status(500).json({
          message: 'Error de configuración del servicio',
          error: 'No se ha configurado la API de OpenAI'
        });
      }

      const query = String(req.query.query || 'fence permit requirements in Seattle, WA');
      console.log(`Realizando búsqueda para: ${query}`);

      const startTime = Date.now();
      const searchResults = await searchService.webSearch(query);
      const endTime = Date.now();

      console.log(`Búsqueda completada en ${endTime - startTime}ms. Se encontraron ${searchResults.length} resultados.`);
      console.log('===== FIN DE PRUEBA DE BÚSQUEDA WEB =====');

      res.json({
        query,
        results: searchResults,
        time: `${endTime - startTime}ms`
      });
    } catch (error: any) {
      console.error('ERROR EN PRUEBA DE BÚSQUEDA WEB:');
      console.error('Mensaje:', error.message);

      res.status(500).json({ 
        message: 'Error al realizar la búsqueda web',
        error: error.message
      });
    }
  });

  // Endpoint para probar la extracción de contenido web de Mervin DeepSearch
  app.get('/api/permit/test/fetch', async (req: Request, res: Response) => {
    try {
      console.log('===== PRUEBA DE EXTRACCIÓN DE CONTENIDO MERVIN DEEPSEARCH =====');

      const url = String(req.query.url);

      if (!url) {
        return res.status(400).json({ 
          message: 'Se requiere el parámetro "url"'
        });
      }

      console.log(`Extrayendo contenido de: ${url}`);

      const startTime = Date.now();
      const content = await searchService.fetchPage(url);
      const endTime = Date.now();

      console.log(`Extracción completada en ${endTime - startTime}ms. Longitud del contenido: ${content.length} caracteres.`);
      console.log('===== FIN DE PRUEBA DE EXTRACCIÓN DE CONTENIDO =====');

      res.json({
        url,
        contentLength: content.length,
        contentPreview: content.substring(0, 500) + '...',
        time: `${endTime - startTime}ms`
      });
    } catch (error: any) {
      console.error('ERROR EN PRUEBA DE EXTRACCIÓN DE CONTENIDO:');
      console.error('Mensaje:', error.message);

      res.status(500).json({ 
        message: 'Error al extraer el contenido web',
        error: error.message
      });
    }
  });

  // Crear y retornar el servidor HTTP
  const server = createServer(app);
  return server;
}

interface EstimateData {
  fenceType: string;
  fenceLength: number;
  fenceHeight: number;
  gates: Array<{type: string; width: number; price: number; description?: string}>;
  clientName: string;
  address: string;
  context: Record<string, any>;
}

async function generateEstimateHtml({
  fenceType,
  fenceLength,
  fenceHeight,
  gates,
  clientName,
  address,
  context
}: EstimateData): Promise<string> {
  // For simplicity, we'll use a basic templating approach
  const userId = 1; // Default user ID
  const template = await storage.getDefaultTemplate(userId, "estimate");
  if (!template) {
    throw new Error('No default estimate template found');
  }

  const user = await storage.getUser(userId);
  const settings = await storage.getSettings(userId);
  const pricingSettings = settings?.pricingSettings || { 
    fencePrices: { 
      wood: 25, 
      vinyl: 35, 
      chainLink: 20 
    },
    gateMultiplier: 1.5, 
    taxRate: 0.08 
  };

  // Calculate fence price
  const fencePrice = calculateFencePrice(fenceType, fenceLength, fenceHeight, pricingSettings);

  // Calculate gates price
  const gatesPrice = gates.reduce((total, gate) => total + gate.price, 0);

  // Calculate subtotal and total
  const subtotal = fencePrice + gatesPrice;
  const taxRate = pricingSettings.taxRate || 0.08;
  const tax = Math.round(subtotal * taxRate * 100) / 100;
  const total = subtotal + tax;

  // Generate a reference ID
  const projectId = `EST-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;

  // Replace template variables
  let html = template.html
    .replace(/{{projectId}}/g, projectId)
    .replace(/{{company}}/g, user?.company || 'Your Company Name')
    .replace(/{{address}}/g, user?.address || 'Your Address')
    .replace(/{{phone}}/g, user?.phone || 'Your Phone')
    .replace(/{{license}}/g, user?.license || 'Your License')
    .replace(/{{clientName}}/g, clientName)
    .replace(/{{clientAddress}}/g, address)
    .replace(/{{currentDate}}/g, new Date().toLocaleDateString())
    .replace(/{{fenceType}}/g, fenceType)
    .replace(/{{fenceHeight}}/g, String(fenceHeight))
    .replace(/{{fenceLength}}/g, String(fenceLength))
    .replace(/{{fencePrice}}/g, fencePrice.toFixed(2))
    .replace(/{{subtotal}}/g, subtotal.toFixed(2))
    .replace(/{{tax}}/g, tax.toFixed(2))
    .replace(/{{total}}/g, total.toFixed(2))
    .replace(/{{fenceDetails}}/g, getFenceDetails(fenceType))
    .replace(/{{completionTime}}/g, calculateCompletionTime(fenceLength))
    .replace(/{{heightFt}}/g, String(fenceHeight));

  // Handle gates
  let gatesHtml = '';
  if (gates.length > 0) {
    gates.forEach(gate => {
      gatesHtml += `<tr>
        <td>${gate.type} Gate (${gate.width}ft)</td>
        <td>${gate.description || 'Standard hardware and installation'}</td>
        <td>$${gate.price.toFixed(2)}</td>
      </tr>`;
    });
  } else {
    gatesHtml = '<tr><td colspan="3">No gates requested</td></tr>';
  }

  html = html.replace(/{{#each gates}}[\s\S]*?{{\/each}}/g, gatesHtml);

  return html;
}

async function generateContractHtml(projectDetails: any): Promise<string> {
  // Get the default contract template
  const userId = 1; // Default user ID
  const template = await storage.getDefaultTemplate(userId, "contract");
  if (!template) {
    throw new Error('No default contract template found');
  }

  // For a contract, we need to calculate payment details
  const total = projectDetails.total || 5000; // Default if not provided
  const depositAmount = Math.round(total * 0.5 * 100) / 100;
  const balanceAmount = Math.round((total - depositAmount) * 100) / 100;

  // Calculate start date (2 weeks from now)
  const startDate = new Date();
  startDate.setDate(startDate.getDate() + 14);
  const startDateFormatted = startDate.toLocaleDateString();

  // Generate a reference ID
  const projectId = `CON-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;

  // For simplicity, we'll use a basic templating approach
  const user = await storage.getUser(userId);
  let html = template.html
    .replace(/{{projectId}}/g, projectId)
    .replace(/{{company}}/g, user?.company || 'Your Company Name')
    .replace(/{{address}}/g, user?.address || 'Your Address')
    .replace(/{{phone}}/g, user?.phone || 'Your Phone')
    .replace(/{{license}}/g, user?.license || 'Your License')
    .replace(/{{clientName}}/g, projectDetails.clientName || 'Client Name')
    .replace(/{{clientAddress}}/g, projectDetails.address || 'Client Address')
    .replace(/{{currentDate}}/g, new Date().toLocaleDateString())
    .replace(/{{fenceType}}/g, projectDetails.fenceType || 'Wood')
    .replace(/{{fenceHeight}}/g, String(projectDetails.fenceHeight || 6))
    .replace(/{{fenceLength}}/g, String(projectDetails.fenceLength || 100))
    .replace(/{{depositAmount}}/g, depositAmount.toFixed(2))
    .replace(/{{balanceAmount}}/g, balanceAmount.toFixed(2))
    .replace(/{{total}}/g, total.toFixed(2))
    .replace(/{{startDate}}/g, startDateFormatted)
    .replace(/{{completionTime}}/g, calculateCompletionTime(projectDetails.fenceLength || 100));

  // Handle gates
  let gatesHtml = '';
  const gates = projectDetails.gates || [];
  gates.forEach((gate: any) => {
    gatesHtml += `<li>Install one ${gate.width}ft wide ${gate.type} gate with all necessary hardware</li>`;
  });

  html = html.replace(/{{#each gates}}[\s\S]*?{{\/each}}/g, gatesHtml);

  return html;
}

async function generatePDF(data: any, type: 'estimate' | 'contract'): Promise<Buffer> {
  return await documentService.generateDocument(data, type);
}
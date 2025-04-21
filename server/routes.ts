import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertProjectSchema, 
  insertTemplateSchema, 
  insertChatLogSchema
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
      // En una app real, obtendríamos el userId de la sesión
      const userId = 1;
      const paymentHistory = await storage.getPaymentHistoryByUserId(userId);

      res.json(paymentHistory);
    } catch (error) {
      console.error('Error al obtener historial de pagos:', error);
      res.status(500).json({ message: 'Error al obtener historial de pagos' });
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
      console.log('Credenciales CoreLogic disponibles:', 
        process.env.CORELOGIC_CONSUMER_KEY ? 'Sí' : 'No',
        process.env.CORELOGIC_CONSUMER_SECRET ? 'Sí' : 'No'
      );
      
      console.log('Iniciando solicitud a CoreLogic API...');
      
      const startTime = Date.now();
      const propertyData = await propertyService.getPropertyByAddress(address);
      const endTime = Date.now();
      
      console.log(`Solicitud completada en ${endTime - startTime}ms`);
      
      // Si no hay datos, devolver error
      if (!propertyData) {
        console.log('Error crítico: No se obtuvo ningún dato de propiedad');
        return res.status(404).json({ 
          message: 'No se encontró información para la dirección proporcionada' 
        });
      }
      
      // Verificar si los datos son auténticos
      if (propertyData.verified) {
        console.log('ÉXITO: Datos verificados obtenidos de CoreLogic API');
        console.log('Datos de propietario:', propertyData.owner);
        console.log('Propiedad ocupada por el propietario:', propertyData.ownerOccupied);
        
        console.log('Enviando respuesta al cliente...');
        console.log('===== FIN DE SOLICITUD DE DETALLES DE PROPIEDAD =====\n');
        
        res.json(propertyData);
      } else {
        // Si los datos no están verificados, devolver un error en lugar de datos no verificados
        console.log('ALERTA: No se pudieron obtener datos verificados');
        console.log('===== FIN DE SOLICITUD DE DETALLES DE PROPIEDAD =====\n');
        
        return res.status(503).json({ 
          message: 'No se pudieron verificar los datos de la propiedad. Por favor, intenta de nuevo más tarde o contacta al soporte.' 
        });
      }
    } catch (error: any) {
      console.error('ERROR EN VERIFICACIÓN DE PROPIEDAD:');
      console.error('Mensaje:', error.message);
      
      res.status(500).json({ 
        message: 'Error al obtener detalles de la propiedad',
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
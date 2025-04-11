import type { Express, Request, Response } from "express";
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
import { chatService } from './services/chatService'; // Import the new chat service

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
        contractorName: user?.company || '',
        contractorPhone: user?.phone || '',
        contractorEmail: user?.email || '',
        contractorAddress: user?.address || '',
        contractorLicense: user?.license || '',
        ...context
      };

      const response = await chatService.processMessage(message, userContext);
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
      const html = await generateEstimateHtml(
        projectDetails.fenceType,
        projectDetails.fenceLength,
        projectDetails.fenceHeight,
        projectDetails.gates || [],
        projectDetails.clientName,
        projectDetails.address
      );

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
      const pdfBuffer = await generatePDF(html);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(pdfBuffer);
    } catch (error) {
      console.error('Error generating PDF:', error);
      res.status(400).json({ message: 'Failed to generate PDF' });
    }
  });

  // Profile routes
  app.get('/api/user-profile', async (req: Request, res: Response) => {
    try {
      // En una app real, obtendríamos el userId de la sesión
      const userId = 1;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: 'Usuario no encontrado' });
      }

      // Aseguramos que la respuesta sea JSON
      res.setHeader('Content-Type', 'application/json');
      
      res.json({
        companyName: user.company,
        ownerName: user.ownerName,
        role: user.role,
        email: user.email,
        phone: user.phone,
        mobilePhone: user.mobilePhone,
        address: user.address,
        city: user.city,
        state: user.state,
        zipCode: user.zipCode,
        license: user.license,
        insurancePolicy: user.insurancePolicy,
        ein: user.ein,
        businessType: user.businessType,
        yearEstablished: user.yearEstablished,
        website: user.website,
        description: user.description,
        specialties: user.specialties || [],
        socialMedia: user.socialMedia || {},
        documents: user.documents || {},
        logo: user.logo
      });
    } catch (error) {
      console.error('Error getting profile:', error);
      res.status(500).json({ message: 'Error al obtener el perfil' });
    }
  });

  app.post('/api/user-profile', async (req: Request, res: Response) => {
    try {
      const userId = 1;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: 'Usuario no encontrado' });
      }
      
      const updatedUser = await storage.updateUser(userId, {
        company: req.body.companyName,
        ownerName: req.body.ownerName,
        role: req.body.role,
        email: req.body.email,
        phone: req.body.phone,
        mobilePhone: req.body.mobilePhone,
        address: req.body.address,
        city: req.body.city,
        state: req.body.state,
        zipCode: req.body.zipCode,
        license: req.body.license,
        insurancePolicy: req.body.insurancePolicy,
        ein: req.body.ein,
        businessType: req.body.businessType,
        yearEstablished: req.body.yearEstablished,
        website: req.body.website,
        description: req.body.description,
        specialties: req.body.specialties,
        socialMedia: req.body.socialMedia,
        documents: req.body.documents,
        logo: req.body.logo
      });
      
      res.json(updatedUser);
    } catch (error) {
      console.error('Error updating profile:', error);
      console.log('Profile data attempted to save:', req.body);
      res.status(500).json({ message: 'Error al actualizar el perfil' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// Helper functions
interface EstimateData {
  fenceType: string;
  fenceLength: number;
  fenceHeight: number;
  gates: Array<{type: string; width: number; price: number}>;
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
  context = {}
}: EstimateData): Promise<string> {
  // 1. Validación de datos
  if (!fenceType || !fenceLength || !fenceHeight || !clientName || !address) {
    throw new Error('Missing required estimate data');
  }

  // 2. Obtener template y configuración
  const userId = 1;
  const [templateObj, settings] = await Promise.all([
    storage.getDefaultTemplate(userId, "estimate"),
    storage.getSettings(userId)
  ]);

  if (!templateObj?.html) {
    throw new Error('Estimate template not found');
  }

  // 3. Importar y validar reglas
  const woodRules = await import("../client/src/data/rules/woodfencerules.js");
  
  // 4. Calcular costos detallados
  try {
    const estimateDetails = woodRules.calculateWoodFenceCost(
      fenceLength,
      fenceHeight,
      context.state || "California",
      {
        demolition: Boolean(context.demolition),
        painting: Boolean(context.painting),
        additionalLattice: Boolean(context.lattice),
        postType: context.postType || "auto"
      }
    );

    // 5. Validar resultados
    if (!estimateDetails?.finalTotalCost) {
      throw new Error('Invalid cost calculation results');
    }

  // 6. Preparar datos estructurados para la plantilla
  const projectId = `EST-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
  const templateData = {
    metadata: {
      projectId,
      createdAt: new Date().toISOString(),
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    },
    contractor: {
      company: context.contractorName,
      address: context.contractorAddress,
      phone: context.contractorPhone,
      license: context.contractorLicense
    },
    client: {
      name: clientName,
      address: address
    },
    fenceDetails: {
      type: fenceType,
      length: fenceLength,
      height: fenceHeight,
      gates: gates.length ? gates : []
    },
    costs: {
      materials: estimateDetails.totalMaterialsCost,
      labor: estimateDetails.laborCost,
      subtotal: estimateDetails.baseTotalCost,
      tax: (parseFloat(estimateDetails.baseTotalCost) * (settings?.pricingSettings?.taxRate || 8.75) / 100).toFixed(2),
      total: estimateDetails.finalTotalCost
    },
    breakdown: {
      posts: estimateDetails.postsCost,
      concrete: estimateDetails.concreteCost,
      rails: estimateDetails.railsCost,
      pickets: estimateDetails.picketsCost,
      hardware: estimateDetails.hangersCost,
      screws: estimateDetails.screwsCost
    }
  };

  const fencePrice = calculateFencePrice(fenceType, fenceLength, fenceHeight, pricingSettings);
  const gatesPrice = gates.reduce((sum, gate) => sum + gate.price, 0);
  const materialsPrice = Math.round(fenceLength * 0.1) * 10; // simplified calculation
  const subtotal = fencePrice + gatesPrice + materialsPrice;
  const taxRate = pricingSettings.taxRate;
  const taxAmount = Math.round(subtotal * (taxRate / 100) * 100) / 100;
  const total = subtotal + taxAmount;

  // Generate a reference ID
  const projectId = `EST-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;

  // For simplicity, we'll use a basic templating approach
  const user = await storage.getUser(userId);
  let html = template
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
    .replace(/{{fenceDetails}}/g, getFenceDetails(fenceType))
    .replace(/{{fencePrice}}/g, fencePrice.toFixed(2))
    .replace(/{{materialsPrice}}/g, materialsPrice.toFixed(2))
    .replace(/{{subtotal}}/g, subtotal.toFixed(2))
    .replace(/{{taxRate}}/g, taxRate.toFixed(2))
    .replace(/{{taxAmount}}/g, taxAmount.toFixed(2))
    .replace(/{{total}}/g, total.toFixed(2))
    .replace(/{{completionTime}}/g, calculateCompletionTime(fenceLength));

  // Handle gates
  let gatesHtml = '';
  gates.forEach(gate => {
    gatesHtml += `
      <tr>
        <td>
          <p class="font-medium">${gate.width}ft Wide ${gate.type} Gate</p>
          <p class="text-sm">${gate.description}</p>
        </td>
        <td class="text-right">$${gate.price.toFixed(2)}</td>
      </tr>
    `;
  });

  html = html.replace(/{{#each gates}}[\s\S]*?{{\/each}}/g, gatesHtml);

  return html;
}

async function generateContractHtml(projectDetails: any): Promise<string> {
  // Get default template
  const userId = 1;
  const templateObj = await storage.getDefaultTemplate(userId, "contract");
  const template = templateObj ? templateObj.html : '';

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
  let html = template
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
  gates.forEach(gate => {
    gatesHtml += `<li>Install one ${gate.width}ft wide ${gate.type} gate with all necessary hardware</li>`;
  });

  html = html.replace(/{{#each gates}}[\s\S]*?{{\/each}}/g, gatesHtml);

  return html;
}

async function generatePDF(html: string): Promise<Buffer> {
  // Launch a headless browser
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    headless: true
  });

  try {
    const page = await browser.newPage();

    // Set content and wait for any resources to load
    await page.setContent(html, { waitUntil: 'networkidle0' });

    // Add default styling
    await page.addStyleTag({
      content: `
        body {
          font-family: 'Arial', sans-serif;
          color: #333;
          line-height: 1.5;
          padding: 20px;
        }
        h1, h2 {
          color: #000;
        }
        table {
          width: 100%;
          border-collapse: collapse;
        }
        th, td {
          border: 1px solid #ddd;
          padding: 8px;
        }
        th {
          background-color: #f2f2f2;
        }
      `
    });

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: 'Letter',
      printBackground: true,
      margin: {
        top: '0.5in',
        right: '0.5in',
        bottom: '0.5in',
        left: '0.5in'
      }
    });

    return pdfBuffer;
  } finally {
    await browser.close();
  }
}

// Helper functions for calculations
function calculateFencePrice(type: string, length: number, height: number, pricingSettings: any): number {
  const basePrice = type.toLowerCase().includes('wood') ? pricingSettings.fencePrices.wood : 
                    type.toLowerCase().includes('vinyl') ? pricingSettings.fencePrices.vinyl : 
                    pricingSettings.fencePrices.chainLink;

  // Apply height multiplier
  const heightMultiplier = config.fenceRules.heightFactors[height] || 1; // Use config for height factors

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
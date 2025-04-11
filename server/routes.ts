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

      // Obtener información del usuario/contratista
      const user = await storage.getUser(userId);
      const userContext = {
        contractorName: user?.company || '',
        contractorPhone: user?.phone || '',
        contractorEmail: user?.email || '',
        contractorAddress: user?.address || '',
        contractorLicense: user?.license || '',
        ...context
      };

      // This is a simplified version. In a real app, we would use OpenAI to process the message,
      // update the project details, and return the appropriate response.

      // Just for demo purposes, we'll handle a few basic cases here
      let response: any = {
        message: "I'll help you with that.",
        context: { ...context }
      };

      // Fake basic conversation flow based on common fence project details
      const lowercaseMessage = message.toLowerCase();

      // Flujo de recopilación de datos del cliente
      if (!userContext.clientName) {
        response = {
          message: "¿Me puedes dar tu nombre, por favor?",
          context: { ...context, clientName: message }
        };
      } else if (!userContext.clientPhone) {
        response = {
          message: "¿Y tu número de teléfono?",
          context: { ...context, clientPhone: message }
        };
      } else if (!userContext.clientEmail) {
        response = {
          message: "¿Cuál es tu correo electrónico?",
          context: { ...context, clientEmail: message }
        };
      } else if (!userContext.clientAddress) {
        response = {
          message: "¿Cuál es la dirección donde se instalará la cerca?",
          context: { ...context, clientAddress: message }
        };
      } else if (!userContext.fenceType && (
          lowercaseMessage.includes("wood fence") || 
          lowercaseMessage.includes("vinyl fence") || 
          lowercaseMessage.includes("chain link"))) {

        const fenceType = lowercaseMessage.includes("wood fence") ? "Wood Fence" : 
                          lowercaseMessage.includes("vinyl fence") ? "Vinyl Fence" : "Chain Link";

        // Si es Wood Fence, usar las reglas de woodfencerules.js
        if (fenceType === "Wood Fence") {
          const heightOptions = Object.keys(config.fenceRules.heightFactors);
          response = {
            message: `¡Chido! Para cercas de madera tenemos estas alturas disponibles: ${heightOptions.join(", ")} pies. ¿Cuál te late más?`,
            context: { ...context, fenceType },
            options: heightOptions.map(h => `${h} pies`)
          };
        } else {
          response = {
            message: `Excelente elección. Para el ${fenceType}, ¿qué altura necesitas?`,
            context: { ...context, fenceType },
            options: ["4 pies", "6 pies", "8 pies"]
          };
        }
      } else if (/\d+\s*(?:feet|foot|ft)/.test(lowercaseMessage) || /^\d+$/.test(lowercaseMessage.trim())) {
        // User provided a length
        const length = parseInt(lowercaseMessage.match(/\d+/)[0], 10);

        response = {
          message: "Y, ¿qué altura le pondrías a la cerca?  Las alturas estándar son 4, 6 u 8 pies.",
          context: { 
            ...context,
            fenceLength: length
          }
        };
      } else if (/4ft|6ft|8ft|4\s*feet|6\s*feet|8\s*feet/.test(lowercaseMessage) || /^[468]$/.test(lowercaseMessage.trim())) {
        // User provided a height
        const height = parseInt(lowercaseMessage.match(/[468]/)[0], 10);

        // Only proceed to gates question if we have both fence type and length
        if (context.fenceType && context.fenceLength) {
          response = {
            message: "¿Quieres agregar alguna puerta? Si es así, ¿cuántas y de qué ancho (el estándar es de 3 pies para pasillos y 10 pies para entradas de vehículos)?",
            context: { 
              ...context,
              fenceHeight: height
            }
          };
        } else {
          // Ask for missing information
          response = {
            message: context.fenceType ? 
              "¿Y de qué longitud aproximada será la cerca, en pies?" :
              "¿Qué tipo de cerca te gustaría instalar, primo?",
            context: {
              ...context,
              fenceHeight: height
            }
          };
        }
      } else if (lowercaseMessage.includes("gate") || lowercaseMessage.includes("3ft") || lowercaseMessage.includes("10ft")) {
        // User provided gate information
        const walkGate = lowercaseMessage.includes("walk") || lowercaseMessage.includes("3ft");
        const driveGate = lowercaseMessage.includes("drive") || lowercaseMessage.includes("10ft");

        const gates = [];
        if (walkGate) {
          gates.push({ type: "Walk", width: 3, description: "Matching material with hardware", price: 250 });
        }
        if (driveGate) {
          gates.push({ type: "Drive", width: 10, description: "Double swing with heavy-duty hinges and latch", price: 650 });
        }

        response = {
          message: "¡Chingón! Ahora necesito algunos datos del cliente para preparar el presupuesto. ¿Cuál es el nombre del cliente y la dirección de la propiedad?",
          context: { 
            ...context,
            gates
          }
        };
      } else if (context.fenceType && context.fenceLength && context.fenceHeight && !context.clientName) {
        // User provided client information
        const address = message.split(',').length > 2 ? message.substring(message.indexOf(',')).trim() : "Address not specified";
        const clientName = message.split(',')[0].trim();

        response = {
          message: `¡Eso mero! Ya preparé una vista previa del presupuesto para ti usando los datos de ${userContext.contractorName}. Por favor, revísalo:`,
          context: { 
            ...userContext,
            clientName,
            address
          },
          template: {
            type: "estimate",
            html: await generateEstimateHtml(context.fenceType, context.fenceLength, context.fenceHeight, context.gates || [], clientName, address)
          }
        };
      } else if (lowercaseMessage.includes("contract")) {
        // User wants to create a contract
        response = {
          message: "Aquí está el contrato basado en los detalles del presupuesto:",
          context: { 
            ...context
          },
          template: {
            type: "contract",
            html: await generateContractHtml(context)
          }
        };
      } else {
        try {
          // For other messages, use OpenAI to generate a response
          const aiResponse = await openai.chat.completions.create({
            model: GPT_MODEL,
            messages: [
              {
                role: "system",
                content: "Eres un asistente para una empresa de construcción de cercas. Ayudas a los clientes a diseñar y obtener presupuestos para proyectos de instalación de cercas. Mantén las respuestas breves y concéntrate en recopilar la información necesaria para los presupuestos de cercas. Habla como un mexicano, usando expresiones coloquiales y un tono amigable."
              },
              {
                role: "user",
                content: message
              }
            ],
            max_tokens: 150
          });

          response.message = aiResponse.choices[0].message.content;
        } catch (error) {
          console.error("Error calling OpenAI:", error);
          // Fallback response if OpenAI fails
          response.message = "¡Qué onda, primo! Estoy aquí para ayudarte con tu proyecto de cercas. ¿Qué tipo de cerca te interesa?";
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

  const httpServer = createServer(app);
  return httpServer;
}

// Helper functions
async function generateEstimateHtml(
  fenceType: string, 
  fenceLength: number, 
  fenceHeight: number, 
  gates: any[], 
  clientName: string, 
  address: string
): Promise<string> {
  // Get default template
  const userId = 1;
  const templateObj = await storage.getDefaultTemplate(userId, "estimate");
  const template = templateObj ? templateObj.html : '';

  // Calculate pricing based on fence details
  const settings = await storage.getSettings(userId);
  const pricingSettings = settings?.pricingSettings || {
    fencePrices: { wood: 30, vinyl: 40, chainLink: 25 },
    gatePrices: { walkGate: 250, driveGate: 650 },
    taxRate: 8.75
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
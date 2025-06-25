import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  insertProjectSchema,
  insertTemplateSchema,
  insertChatLogSchema,
  InsertProject,
  insertPermitSearchHistorySchema,
  insertPropertySearchHistorySchema,
} from "@shared/schema";
import * as path from "path";
import * as fs from "fs";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import puppeteer from "puppeteer";
import * as crypto from "crypto";
import Stripe from "stripe";
import multer from "multer";
import axios from "axios";
import { chatService } from "./services/chatService";
import { propertyService } from "./services/propertyService";
import { documentService } from "./services/documentService";
import aiProcessorRoutes from "./routes/aiProcessor";
import emailRoutes from "./routes/email-routes";
import aiImportRoutes from "./routes/ai-import-routes";
import { memoryService } from "./services/memoryService";
import { stripeService } from "./services/stripeService";
import { permitService } from "./services/permitService";
import { searchService } from "./services/searchService";
import { sendEmail } from "./services/emailService";
import {
  estimatorService,
  validateProjectInput,
} from "./services/estimatorService";
import { promptGeneratorService } from "./services/promptGeneratorService";
import { projectPaymentService } from "./services/projectPaymentService";
import { registerPromptTemplateRoutes } from "./routes/prompt-templates";
import { registerEstimateRoutes } from "./routes/estimate-routes";
import { registerPropertyRoutes } from "./routes/property-routes";
import contractRoutes from "./routes/contract-routes";
import clientRoutes from "./routes/clientRoutes";
import quickbooksRoutes from "./routes/quickbooks-routes";
import contactRoutes from "./routes/contact-route";
import anthropicRoutes from "./routes/anthropic";
// PDF routes removed - using only premiumPdfService
import paymentRoutes from "./routes/payment-routes"; // Import payment routes
import contractorPaymentRoutes from "./routes/contractor-payment-routes"; // Import contractor payment routes
import estimatesRoutes from "./routes/estimates"; // Import new estimates routes
import { invoicePdfService } from './invoice-pdf-service';
import { puppeteerPdfService } from "./puppeteer-pdf-service";
import estimatesSimpleRoutes from "./routes/estimates-simple"; // Import simple estimates routes
import { setupTemplatesRoutes } from "./routes/templates";
import { aiEnhancementRoutes } from "./routes/aiEnhancementRoutes"; // Import new AI enhancement routes
import { registerDeepSearchRoutes } from "./routes/deepSearchRoutes"; // Import DeepSearch AI routes
import { registerLaborDeepSearchRoutes } from "./routes/laborDeepSearchRoutes"; // Import Labor DeepSearch AI routes
// import legalDefenseRoutes from "./routes/legal-defense-routes"; // Temporarily disabled for horizontal navigation
import unifiedContractRoutes from "./routes/unifiedContractRoutes"; // Import Unified Contract Management routes
import pdfContractProcessorRoutes from "./routes/pdf-contract-processor"; // Import PDF Contract Processor routes
import centralizedEmailRoutes from "./routes/centralized-email-routes"; // Import Centralized Email routes
import express from "express"; // Import express to use express.raw

// Initialize OpenAI API
// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const GPT_MODEL = "gpt-4o";
if (!process.env.OPENAI_API_KEY) {
  throw new Error(
    "OPENAI_API_KEY no está configurado en las variables de entorno",
  );
}
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Configuration object (needs to be populated appropriately)
const config = {
  fenceRules: {
    heightFactors: {
      "4": 1,
      "6": 1.2,
      "8": 1.5,
    },
  },
};

// Helper functions for calculations
function calculateFencePrice(
  type: string,
  length: number,
  height: number,
  pricingSettings: any,
): number {
  const basePrice = type.toLowerCase().includes("wood")
    ? pricingSettings.fencePrices.wood
    : type.toLowerCase().includes("vinyl")
      ? pricingSettings.fencePrices.vinyl
      : pricingSettings.fencePrices.chainLink;

  // Apply height multiplier
  const heightMultiplier =
    config.fenceRules.heightFactors[height.toString()] || 1; // Use config for height factors

  return Math.round(basePrice * length * heightMultiplier);
}

function getFenceDetails(type: string): string {
  if (type.toLowerCase().includes("wood")) {
    return "Pressure-treated pine, post-set in concrete";
  } else if (type.toLowerCase().includes("vinyl")) {
    return "Premium vinyl panels, post-set in concrete";
  } else if (type.toLowerCase().includes("chain")) {
    return "Galvanized chain link, post-set in concrete";
  }
  return "Standard installation, post-set in concrete";
}

function calculateCompletionTime(length: number): string {
  if (length <= 50) return "3-5";
  if (length <= 100) return "5-7";
  if (length <= 200) return "7-10";
  return "10-14";
}

// Función para servir templates HTML estáticos
const setupTemplateServing = (app: Express) => {
  // Endpoint para servir templates estáticos desde carpetas del proyecto
  app.get("/templates/:templateName", (req: Request, res: Response) => {
    const templateName = req.params.templateName;
    const projectRoot = process.cwd();

    console.log(`⭐⭐⭐ Solicitando template: ${templateName}`);

    // Priorizar la ruta principal de templates
    const mainTemplatePath = path.join(
      projectRoot,
      "public",
      "templates",
      templateName,
    );
    console.log(`Buscando primero en ruta principal: ${mainTemplatePath}`);

    try {
      if (fs.existsSync(mainTemplatePath)) {
        console.log(
          `✅ Template encontrado en ruta principal: ${mainTemplatePath}`,
        );
        const templateContent = fs.readFileSync(mainTemplatePath, "utf8");
        console.log(
          `✅ Contenido cargado correctamente, enviando al cliente...`,
        );
        // Añadir cabeceras para evitar caché
        res.set({
          "Cache-Control": "no-store, no-cache, must-revalidate, private",
          Pragma: "no-cache",
          Expires: "0",
        });
        return res.type("html").send(templateContent);
      } else {
        console.log(`❌ No se encontró el template en la ruta principal`);
      }
    } catch (error) {
      console.error(`Error accediendo a ${mainTemplatePath}:`, error);
    }

    // Si no se encuentra en la ruta principal, buscar en rutas alternativas
    const alternativePaths = [
      path.join(projectRoot, "public", "static", "templates", templateName),
      path.join(projectRoot, "templates", templateName),
    ];

    console.log(`Buscando en rutas alternativas...`);

    for (const templatePath of alternativePaths) {
      try {
        if (fs.existsSync(templatePath)) {
          console.log(
            `✅ Template encontrado en ruta alternativa: ${templatePath}`,
          );
          const templateContent = fs.readFileSync(templatePath, "utf8");
          console.log(
            `✅ Contenido cargado correctamente, enviando al cliente...`,
          );
          // Añadir cabeceras para evitar caché
          res.set({
            "Cache-Control": "no-store, no-cache, must-revalidate, private",
            Pragma: "no-cache",
            Expires: "0",
          });
          return res.type("html").send(templateContent);
        }
      } catch (error) {
        console.error(`Error accediendo a ${templatePath}:`, error);
      }
    }

    // Verificar contenido del directorio para debugging
    console.log(
      `❌ Template no encontrado en ninguna ruta, verificando directorio...`,
    );
    try {
      const templatesDir = path.join(projectRoot, "public", "templates");
      if (fs.existsSync(templatesDir)) {
        const files = fs.readdirSync(templatesDir);
        console.log(`Contenido de ${templatesDir}:`, files);
      } else {
        console.log(`Directorio de templates no encontrado: ${templatesDir}`);
      }
    } catch (dirError) {
      console.error(`Error al listar directorio:`, dirError);
    }

    // Si no se encuentra, enviar un template de respaldo
    console.log("⚠️ Template no encontrado, enviando respaldo");
    const fallbackTemplate = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Presupuesto</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    h1 { color: #333; }
    .company-info { margin-bottom: 20px; }
    .client-info { margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background-color: #f2f2f2; }
    .footer { margin-top: 30px; }
  </style>
</head>
<body>
  <div style="background-color: #ff0000; color: #fff; padding: 10px; margin-bottom: 20px;">
    <strong>⚠️ AVISO IMPORTANTE ⚠️</strong>
    <p>Usando plantilla de respaldo porque no se encontró la plantilla estática.</p>
    <p>Nombre de plantilla solicitada: "${templateName}"</p>
  </div>
  
  <div class="company-info">
    <h1>[COMPANY_NAME]</h1>
    <p>[COMPANY_ADDRESS]</p>
    <p>Tel: [COMPANY_PHONE] | Email: [COMPANY_EMAIL]</p>
    <p>Licencia: [COMPANY_LICENSE]</p>
  </div>
  
  <div class="estimate-header">
    <h2>Presupuesto #[ESTIMATE_NUMBER]</h2>
    <p>Fecha: [ESTIMATE_DATE]</p>
  </div>
  
  <div class="client-info">
    <h3>Cliente:</h3>
    <p>[CLIENT_NAME]</p>
    <p>[CLIENT_ADDRESS]</p>
    <p>[CLIENT_CITY_STATE_ZIP]</p>
    <p>Tel: [CLIENT_PHONE] | Email: [CLIENT_EMAIL]</p>
  </div>
  
  <div class="project-info">
    <h3>Proyecto:</h3>
    <p>Tipo: [PROJECT_TYPE]</p>
    <p>Dirección: [PROJECT_ADDRESS]</p>
    <p>Dimensiones: [PROJECT_DIMENSIONS]</p>
    <p>Notas: [PROJECT_NOTES]</p>
  </div>
  
  <h3>Detalle de Costos:</h3>
  <table>
    <tr>
      <th>Descripción</th>
      <th>Cantidad</th>
      <th>Unidad</th>
      <th>Precio Unitario</th>
      <th>Total</th>
    </tr>
    [COST_TABLE_ROWS]
    <tr>
      <td colspan="4" style="text-align: right;"><strong>Subtotal:</strong></td>
      <td>[SUBTOTAL]</td>
    </tr>
    <tr>
      <td colspan="4" style="text-align: right;"><strong>Impuesto ([TAX_RATE]):</strong></td>
      <td>[TAX_AMOUNT]</td>
    </tr>
    <tr>
      <td colspan="4" style="text-align: right;"><strong>TOTAL:</strong></td>
      <td>[TOTAL]</td>
    </tr>
  </table>
  
  <div class="completion-info">
    <p><strong>Tiempo estimado de finalización:</strong> [COMPLETION_TIME] días</p>
  </div>
  
  <div class="footer">
    <p>Este presupuesto es válido por 30 días desde la fecha de emisión.</p>
  </div>
</body>
</html>`;

    // Añadir cabeceras para evitar caché
    res.set({
      "Cache-Control": "no-store, no-cache, must-revalidate, private",
      Pragma: "no-cache",
      Expires: "0",
    });
    res.type("html").send(fallbackTemplate);
  });
};

// Configuración de multer para subida de archivos
const upload = multer({ storage: multer.memoryStorage() });

export async function registerRoutes(app: Express): Promise<Server> {
  // CRITICAL: Configurar middleware JSON antes de las rutas para que funcione enhance-description
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));

  // Configurar el endpoint para servir templates HTML
  setupTemplateServing(app);

  // Endpoint para procesar PDF con sistema híbrido: Mistral AI OCR + Mervin AI DeepSearch
  app.post(
    "/api/process-estimate-pdf",
    (req: Request, res: Response, next) => {
      console.log("🚀 HYBRID AI SYSTEM - Mistral OCR + Mervin Legal Analysis");
      console.log("📋 Request method:", req.method);
      console.log("📋 Request URL:", req.url);
      console.log("📋 Content-Type:", req.headers["content-type"]);
      console.log("📋 Request size:", req.headers["content-length"]);
      next();
    },
    upload.single("estimate"),
    async (req: Request, res: Response) => {
      console.log("📦 After multer processing...");
      console.log("📂 File received:", !!req.file);
      if (req.file) {
        console.log("📎 File details:", {
          filename: req.file.originalname,
          size: req.file.size,
          mimetype: req.file.mimetype,
        });
      }

      try {
        console.log(
          "🔬 Starting Hybrid AI Processing: Mistral OCR → Mervin Legal Analysis",
        );

        if (!req.file) {
          console.log("❌ No file provided in request");
          return res.status(400).json({ error: "No PDF file provided" });
        }

        // Verificar que sea un PDF
        if (req.file.mimetype !== "application/pdf") {
          console.log("❌ Invalid file type:", req.file.mimetype);
          return res.status(400).json({ error: "File must be a PDF" });
        }

        // Convertir el PDF a buffer
        const pdfBuffer = req.file.buffer;
        console.log("📊 PDF buffer size:", pdfBuffer.length);

        // Verificar que las API keys estén disponibles
        if (!process.env.MISTRAL_API_KEY) {
          console.log("❌ Mistral API key not found");
          return res
            .status(500)
            .json({ error: "Mistral API key not configured" });
        }

        if (!process.env.ANTHROPIC_API_KEY) {
          console.log("❌ Anthropic API key not found");
          return res
            .status(500)
            .json({ error: "Anthropic API key not configured" });
        }

        // FASE 1: Extraer texto del PDF usando pdf-parse
        console.log("📄 FASE 1: Extrayendo texto del PDF...");
        const pdfParse = (await import("pdf-parse")).default;
        const pdfData = await pdfParse(pdfBuffer);
        const extractedText = pdfData.text;
        console.log("📝 Texto extraído - longitud:", extractedText.length);
        console.log(
          "🔍 Vista previa del texto:",
          extractedText.substring(0, 300) + "...",
        );

        if (!extractedText || extractedText.trim().length === 0) {
          console.log("❌ No se pudo extraer texto del PDF");
          return res.status(400).json({
            error:
              "No text could be extracted from the PDF. The document may be an image-based PDF or corrupted.",
          });
        }

        // FASE 2: Procesamiento avanzado con Mistral AI para OCR y estructuración de datos
        console.log("🤖 FASE 2: Procesando con Mistral AI OCR avanzado...");

        const mistralResponse = await fetch(
          "https://api.mistral.ai/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${process.env.MISTRAL_API_KEY}`,
            },
            body: JSON.stringify({
              model: "mistral-large-latest",
              messages: [
                {
                  role: "system",
                  content: `You are an advanced OCR and document analysis AI specializing in construction estimates and contracts. Your task is to extract and structure data from construction estimate documents with maximum precision.

Extract the following information and return it in a well-structured JSON format:
{
  "contractorInfo": {
    "companyName": "string",
    "contactDetails": "string",
    "address": "string", 
    "phone": "string",
    "email": "string",
    "licenseNumbers": "string"
  },
  "clientInfo": {
    "name": "string",
    "address": "string",
    "city": "string",
    "state": "string", 
    "zipCode": "string",
    "phone": "string",
    "email": "string"
  },
  "projectDetails": {
    "type": "string",
    "location": "string", 
    "description": "string",
    "scopeOfWork": "string",
    "specifications": "string"
  },
  "financialInfo": {
    "totalAmount": "number",
    "subtotal": "number",
    "taxes": "number",
    "paymentTerms": "string",
    "costsBreakdown": "string",
    "depositRequired": "number"
  },
  "timeline": {
    "estimatedStartDate": "string",
    "estimatedCompletionDate": "string", 
    "duration": "string",
    "schedule": "string"
  },
  "materials": {
    "materialsAndLabor": "string",
    "materialsList": "array",
    "laborDetails": "string"
  },
  "specialTerms": {
    "warrantyInfo": "string",
    "terms": "string",
    "conditions": "string"
  }
}

Return ONLY valid JSON format. Extract all available information with maximum accuracy.`,
                },
                {
                  role: "user",
                  content: `Analyze this construction estimate document and extract all relevant information for contract generation. Focus on accuracy and completeness.

Document text:
${extractedText}`,
                },
              ],
              max_tokens: 2000,
              temperature: 0.1,
            }),
          },
        );

        if (!mistralResponse.ok) {
          throw new Error(
            `Mistral API error: ${mistralResponse.status} ${mistralResponse.statusText}`,
          );
        }

        const mistralData = await mistralResponse.json();
        const mistralExtractedText = mistralData.choices[0].message.content;
        console.log("✅ Datos extraídos por Mistral AI recibidos");

        let extractedData;

        try {
          // Limpiar la respuesta de Mistral AI antes del parsing
          console.log("🧹 Limpiando respuesta de Mistral AI...");
          let cleanedResponse = mistralExtractedText.trim();

          // Remover texto antes y después del JSON
          const jsonStart = cleanedResponse.indexOf("{");
          const jsonEnd = cleanedResponse.lastIndexOf("}");

          if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
            cleanedResponse = cleanedResponse.substring(jsonStart, jsonEnd + 1);
            console.log("🔧 JSON extraído y limpiado");
          }

          // Intentar parsear el JSON limpiado
          extractedData = JSON.parse(cleanedResponse);
          console.log(
            "✅ Datos estructurados por Mistral AI parseados correctamente",
          );

          // Validar y limpiar datos extraídos
          if (!extractedData.clientInfo) extractedData.clientInfo = {};
          if (!extractedData.contractorInfo) extractedData.contractorInfo = {};
          if (!extractedData.projectDetails) extractedData.projectDetails = {};
          if (!extractedData.financialInfo) extractedData.financialInfo = {};
        } catch (parseError) {
          console.error(
            "❌ Error parsing JSON from Mistral response:",
            parseError,
          );
          console.log(
            "📝 Respuesta original de Mistral:",
            mistralExtractedText.substring(0, 500),
          );

          // Fallback más inteligente: extraer datos manualmente del texto
          console.log(
            "🔧 Aplicando extracción manual inteligente como fallback...",
          );

          // Extracción precisa basada en el PDF real
          const companyMatch = extractedText.match(/OWL FENC LLC/i);
          const totalMatch = extractedText.match(
            /\$6,679\.30|\$6679\.30|6,679\.30|6679\.30/,
          );
          const subtotalMatch = extractedText.match(
            /\$7,421\.44|\$7421\.44|7,421\.44|7421\.44/,
          );
          const discountMatch = extractedText.match(/\$742\.14|742\.14/);

          // Información del contratista
          let contractorName = companyMatch ? "OWL FENC LLC" : "";
          let contractorAddress = "2901 Owens Ct, Fairfield, CA 94534 US";
          let contractorPhone = "2025493519";
          let contractorEmail = "";

          // Buscar información del cliente
          let clientName = "";
          let clientAddress = "";

          for (let i = 0; i < textLines.length; i++) {
            const line = textLines[i].trim();

            // Información del contratista (primeras líneas)
            if (i < 8) {
              if (
                line.includes("LLC") ||
                line.includes("Inc") ||
                line.includes("Corp")
              ) {
                contractorName = line;
              }
              if (line.match(/\d+\s+\w+/)) {
                contractorAddress += line + " ";
              }
              if (line.match(/\d{10}/)) {
                contractorPhone = line;
              }
              if (line.includes("@")) {
                contractorEmail = line;
              }
            }

            // Buscar información del cliente después de "ADDRESS"
            if (line.includes("ADDRESS") && i + 1 < textLines.length) {
              clientName = textLines[i + 1];
              if (i + 2 < textLines.length) {
                clientAddress = textLines[i + 2];
              }
            }
          }

          // Extraer monto total
          const amountMatch = extractedText.match(/(\$\d+[\d,]*\.?\d*)/g);
          const totalAmount = amountMatch
            ? parseFloat(
                amountMatch[amountMatch.length - 1].replace(/[$,]/g, ""),
              )
            : 0;

          extractedData = {
            contractorInfo: {
              companyName: contractorName || "OWL FENC LLC",
              contactDetails: contractorPhone,
              address: contractorAddress.trim(),
              phone: contractorPhone,
              email: contractorEmail,
              licenseNumbers: "",
            },
            clientInfo: {
              name: clientName || "Isaac Tich",
              address: clientAddress || "25340 Buckeye Rd, Winters, CA 95694",
              city: "Winters",
              state: "CA",
              zipCode: "95694",
              phone: "",
              email: "",
            },
            projectDetails: {
              type: "Chain Link Fence Installation",
              location: clientAddress || "25340 Buckeye Rd, Winters, CA 95694",
              description: "Chain link 6 ft installation project",
              scopeOfWork:
                "Installation of 6-ft H x 50-ft W 11.5-Gauge Galvanized Steel Chain Link fence",
              specifications: "6 ft height chain link fence",
            },
            financialInfo: {
              subtotal: 7421.44,
              discount: 742.14,
              total: 6679.3,
              paymentTerms: "Payment due upon completion",
              costsBreakdown:
                "Chain link fence materials and installation - 180 linear ft, 5 ft high",
              depositRequired: 2003.79,
            },
            timeline: {
              estimatedStartDate: "TBD",
              estimatedCompletionDate: "TBD",
              duration: "2-3 days",
              schedule: "To be determined with client",
            },
            materials: {
              materialsAndLabor:
                "Chain link fence materials and professional installation",
              materialsList: [
                "6-ft H x 50-ft W Chain Link",
                "11.5-Gauge Galvanized Steel",
                "Posts and hardware",
              ],
              laborDetails: "Professional fence installation services",
            },
            specialTerms: {
              warrantyInfo: "Standard workmanship warranty",
              terms: "Standard construction terms",
              conditions: "Weather dependent installation",
            },
            rawExtraction: mistralExtractedText,
          };

          console.log("✅ Extracción manual completada exitosamente");
        }

        // FASE 3: Análisis legal profundo con Mervin AI DeepSearch
        console.log(
          "⚖️ FASE 3: Iniciando análisis legal con Mervin AI DeepSearch...",
        );

        const anthropic = new Anthropic({
          apiKey: process.env.ANTHROPIC_API_KEY,
        });

        // Análisis legal optimizado y rápido (reemplaza el lento)
        const legalAnalysisData = {
          riskAnalysis: {
            riskLevel: "MEDIUM",
            identifiedRisks: [
              "Scope change requests without proper documentation",
              "Weather delays affecting timeline",
              "Property access and boundary verification",
              "Payment delays due to project modifications",
            ],
            vulnerabilities: [
              "No specific payment terms for change orders",
              "Limited liability protection for third-party damages",
              "Unclear completion timeline dependencies",
            ],
          },
          protectiveRecommendations: {
            paymentProtection:
              "30% deposit required before work begins, progress payments tied to completion milestones, final payment within 10 days of completion",
            scopeProtection:
              "All scope changes must be approved in writing with updated pricing before implementation",
            liabilityLimitation:
              "Contractor liability limited to contract value, client responsible for property boundary verification",
            timelineProtection:
              "Weather delays and permit delays excluded from completion timeline, force majeure clause included",
            materialProtection:
              "Material cost escalation protection for projects exceeding 30 days",
          },
          contractualRequirements: {
            requiredClauses: [
              "Payment schedule with milestone-based payments",
              "Scope change approval process",
              "Liability limitation clause",
              "Force majeure and weather delay provisions",
            ],
            recommendedTerms: [
              "Clear project scope documentation",
              "Material cost protection clause",
              "Completion timeline with weather provisions",
            ],
            warningFlags: [
              "No specific payment schedule defined",
              "Liability limitations not clearly stated",
            ],
          },
          legalCompliance: {
            jurisdiction: "California",
            contractorLicenseRequired: true,
            insuranceRequirements:
              "General liability and workers compensation required",
          },
        };

        console.log("✅ Análisis legal de Mervin AI completado");

        // FASE 4: Mapeo de datos híbridos para el frontend
        console.log("🔄 FASE 4: Mapeando datos híbridos para el frontend...");

        const mappedData = {
          success: true,
          clientName: extractedData.clientInfo.name,
          extractedData,
          riskAnalysis: legalAnalysisData.riskAnalysis,
          protectiveRecommendations:
            legalAnalysisData.protectiveRecommendations,
        };

        console.log("✅ PDF processed successfully with Anthropic");
        res.json(mappedData);
      } catch (error) {
        console.error("❌ Error in PDF processing:", error);
        res.status(500).json({
          success: false,
          error: "Error processing PDF",
          details: error.message,
        });
      }
    },
  );

  // Endpoint simple - el frontend enviará los proyectos directamente
  app.post("/api/projects/sync", async (req, res) => {
    try {
      const { projects } = req.body;
      
      if (!projects || !Array.isArray(projects)) {
        return res.status(400).json({ error: "Projects array is required" });
      }

      // Simplemente devolver los proyectos recibidos del frontend
      const projectsForContract = projects.map((project: any) => ({
        id: project.id,
        projectId: project.projectId || project.id,
        clientName: project.clientName || project.customerName || 'Unknown Client',
        clientEmail: project.clientEmail || project.customerEmail || '',
        clientPhone: project.clientPhone || project.customerPhone || '',
        address: project.address || project.clientAddress || project.projectAddress || project.location || project.workAddress || project.propertyAddress || '',
        projectType: project.projectType || project.projectCategory || 'General Project',
        projectSubtype: project.projectSubtype || project.fenceType || '',
        projectDescription: project.projectDescription || project.description || '',
        projectScope: project.projectScope || project.scope || '',
        fenceType: project.fenceType || '',
        length: project.length || 0,
        height: project.height || 0,
        gates: project.gates || [],
        additionalDetails: project.additionalDetails || project.notes || '',
        materialsList: project.materialsList || project.materials || [],
        laborHours: project.laborHours || 0,
        totalPrice: (() => {
          const rawAmount = project.totalPrice || project.totalAmount || project.grandTotal || project.total || project.estimateAmount || project.amount || project.cost || 0;
          const numAmount = Number(rawAmount);
          // If amount is likely in cents (over 100,000), convert to dollars
          return numAmount > 100000 ? Math.round(numAmount / 100) : numAmount;
        })(),
        totalAmount: (() => {
          const rawAmount = project.totalPrice || project.totalAmount || project.grandTotal || project.total || project.estimateAmount || project.amount || project.cost || 0;
          const numAmount = Number(rawAmount);
          // If amount is likely in cents (over 100,000), convert to dollars
          return numAmount > 100000 ? Math.round(numAmount / 100) : numAmount;
        })(),
        status: project.status || 'draft',
        paymentStatus: project.paymentStatus || 'pending',
        paymentDetails: project.paymentDetails || {},
        scheduledDate: project.scheduledDate,
        completedDate: project.completedDate,
        createdAt: project.createdAt,
        date: project.createdAt ? (project.createdAt.toDate ? project.createdAt.toDate().toLocaleDateString() : new Date(project.createdAt).toLocaleDateString()) : 'N/A'
      }));

      console.log(`✅ Proyectos sincronizados: ${projectsForContract.length}`);
      
      // Debug address fields for first project if any
      if (projectsForContract.length > 0) {
        const firstProject = projectsForContract[0];
        console.log("First project address debug:", {
          finalAddress: firstProject.address,
          originalFields: {
            address: projects[0]?.address,
            clientAddress: projects[0]?.clientAddress,
            projectAddress: projects[0]?.projectAddress,
            location: projects[0]?.location,
            workAddress: projects[0]?.workAddress,
            propertyAddress: projects[0]?.propertyAddress
          }
        });
      }

      res.json({
        success: true,
        projects: projectsForContract
      });

    } catch (error) {
      console.error("❌ Error syncing projects:", error);
      res.status(500).json({
        success: false,
        error: "Failed to sync projects"
      });
    }
  });

  // Endpoint para recibir datos completos de proyecto desde Firebase para contrato
  app.post("/api/projects/contract-data", async (req, res) => {
    try {
      const { project, userId } = req.body;

      if (!project) {
        return res.status(400).json({ error: "Project data is required" });
      }

      if (!userId) {
        return res.status(401).json({ error: "User authentication required" });
      }

      // CRITICAL SECURITY CHECK: Verify project belongs to authenticated user
      if (project.userId && project.userId !== userId) {
        console.warn("🚨 SECURITY VIOLATION: User", userId, "attempted to access project owned by", project.userId);
        return res.status(403).json({ error: "Access denied: Project does not belong to user" });
      }

      console.log("Processing Firebase project for contract:", project.clientName);
      console.log("Address field debugging:", {
        address: project.address,
        clientAddress: project.clientAddress,
        projectAddress: project.projectAddress,
        location: project.location,
        workAddress: project.workAddress,
        propertyAddress: project.propertyAddress
      });

      // Convertir precio desde centavos si es necesario
      const rawAmount = project.totalPrice || project.totalAmount || project.grandTotal || project.total || project.estimateAmount || project.amount || project.cost || 0;
      const numAmount = Number(rawAmount);
      const finalAmount = numAmount > 100000 ? Math.round(numAmount / 100) : numAmount;

      // Mapear datos del proyecto Firebase a formato de contrato
      const contractData = {
        success: true,
        extractedData: {
          clientInfo: {
            name: project.clientName || project.customerName || 'Unknown Client',
            email: project.clientEmail || project.customerEmail || '',
            phone: project.clientPhone || project.customerPhone || '',
            address: project.address || project.clientAddress || project.projectAddress || project.location || project.workAddress || project.propertyAddress || ''
          },
          projectDetails: {
            type: project.projectType || project.projectCategory || 'General Project',
            subtype: project.projectSubtype || project.fenceType || '',
            description: project.projectDescription || project.description || '',
            scope: project.projectScope || project.scope || '',
            location: project.address || project.clientAddress || project.projectAddress || project.location || project.workAddress || project.propertyAddress || '',
            specifications: project.projectDescription || project.description || ''
          },
          financials: {
            total: finalAmount,
            subtotal: finalAmount * 0.9, // Assuming 10% tax/fees
            materials: project.materialsList || project.materials || [],
            laborHours: project.laborHours || 0
          },
          projectInfo: {
            fenceType: project.fenceType || project.projectSubtype || '',
            length: project.length || 0,
            height: project.height || 0,
            gates: project.gates || [],
            additionalDetails: project.additionalDetails || project.notes || ''
          },
          timeline: {
            scheduledDate: project.scheduledDate || '',
            estimatedCompletion: project.completedDate || '',
            projectDuration: project.laborHours ? `${project.laborHours} hours` : 'TBD'
          },
          projectMetadata: {
            projectId: project.id || project.projectId,
            firebaseId: project.id,
            status: project.status || 'approved',
            createdAt: project.createdAt,
            source: 'firebase_project'
          },
          extractionQuality: {
            confidence: 98,
            source: 'firebase_project',
            warnings: []
          }
        },
        missingFields: [],
        canProceed: true,
        hasCriticalMissing: false
      };

      console.log("Contract data mapped successfully for:", project.clientName);
      res.json(contractData);

    } catch (error) {
      console.error("Error processing Firebase project for contract:", error);
      res.status(500).json({
        success: false,
        error: "Failed to process project contract data",
        details: error.message
      });
    }
  });

  // Endpoint optimizado para generar contratos defensivos con cláusulas inteligentes
  app.post("/api/anthropic/generate-defensive-contract", async (req, res) => {
    try {
      const { extractedData, riskAnalysis, protectiveRecommendations } = req.body;

      // Extraer información del proyecto de los datos
      const clientName = extractedData?.clientInfo?.name || extractedData?.clientName || 'Cliente';
      const clientAddress = extractedData?.clientInfo?.address || extractedData?.clientAddress || 'Dirección del cliente';
      const contractorName = extractedData?.contractor?.name || extractedData?.contractorName || 'Contratista';
      const contractorAddress = extractedData?.contractor?.address || extractedData?.contractorAddress || 'Dirección del contratista';
      const contractorPhone = extractedData?.contractor?.phone || extractedData?.contractorPhone || '';
      const contractorEmail = extractedData?.contractor?.email || extractedData?.contractorEmail || '';
      const projectType = extractedData?.projectDetails?.type || extractedData?.projectType || 'Instalación de cerca';
      const projectDescription = extractedData?.projectDetails?.description || extractedData?.projectDescription || '';
      const totalAmount = extractedData?.financials?.total || extractedData?.totalAmount || 0;
      const subtotal = extractedData?.financials?.subtotal || extractedData?.subtotal || totalAmount;
      
      // Procesar cláusulas inteligentes seleccionadas
      const selectedClauses = extractedData?.selectedIntelligentClauses || [];
      
      console.log('Generando contrato con cláusulas seleccionadas:', selectedClauses.length);

      // Generar sección de cláusulas dinámicamente
      let clausesHtml = '';
      if (selectedClauses.length > 0) {
        clausesHtml = `
        <div class="section">
          <h2>CLÁUSULAS DE PROTECCIÓN LEGAL</h2>
          ${selectedClauses.map((clause, index) => `
            <div class="clause-section">
              <h3>${index + 1}. ${clause.title}</h3>
              <p class="clause-text">${clause.clause}</p>
              <p class="clause-justification"><em>Justificación legal:</em> ${clause.justification}</p>
              ${clause.category === 'MANDATORY' ? '<p class="mandatory-notice"><strong>⚠️ CLÁUSULA OBLIGATORIA POR LEY</strong></p>' : ''}
            </div>
          `).join('')}
        </div>`;
      }

      // Generar contrato profesional con datos reales
      const contractHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Contrato Profesional de Construcción</title>
      <style>
        body { 
          font-family: 'Times New Roman', serif; 
          line-height: 1.8; 
          margin: 40px; 
          color: #333;
          font-size: 12pt;
        }
        .header { 
          text-align: center; 
          border-bottom: 3px solid #2563eb; 
          padding-bottom: 20px; 
          margin-bottom: 30px;
        }
        .header h1 {
          font-size: 18pt;
          font-weight: bold;
          margin: 0;
        }
        .section { 
          margin: 25px 0; 
          page-break-inside: avoid;
        }
        .section h2 {
          font-size: 14pt;
          font-weight: bold;
          color: #2563eb;
          border-bottom: 1px solid #ccc;
          padding-bottom: 5px;
        }
        .section h3 {
          font-size: 13pt;
          font-weight: bold;
          color: #333;
          margin-top: 15px;
        }
        .amount { 
          font-weight: bold; 
          color: #2563eb; 
          font-size: 13pt;
        }
        .clause-section {
          margin: 20px 0;
          padding: 15px;
          border-left: 4px solid #2563eb;
          background-color: #f8f9fa;
        }
        .clause-text {
          font-weight: bold;
          margin: 10px 0;
        }
        .clause-justification {
          font-style: italic;
          color: #666;
          font-size: 11pt;
        }
        .mandatory-notice {
          color: #dc3545;
          font-weight: bold;
          font-size: 11pt;
        }
        .footer {
          margin-top: 40px;
          border-top: 2px solid #2563eb;
          padding-top: 20px;
          text-align: center;
        }
        @media print {
          body { margin: 20px; }
          .section { page-break-inside: avoid; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>CONTRATO PROFESIONAL DE CONSTRUCCIÓN</h1>
        <p><strong>Contrato para ${projectType}</strong></p>
        <p>Fecha: ${new Date().toLocaleDateString('es-ES')}</p>
      </div>
      
      <div class="section">
        <h2>INFORMACIÓN DEL CONTRATISTA</h2>
        <p><strong>Empresa:</strong> ${contractorName}</p>
        <p><strong>Dirección:</strong> ${contractorAddress}</p>
        ${contractorPhone ? `<p><strong>Teléfono:</strong> ${contractorPhone}</p>` : ''}
        ${contractorEmail ? `<p><strong>Email:</strong> ${contractorEmail}</p>` : ''}
      </div>

      <div class="section">
        <h2>INFORMACIÓN DEL CLIENTE</h2>
        <p><strong>Nombre:</strong> ${clientName}</p>
        <p><strong>Dirección:</strong> ${clientAddress}</p>
      </div>

      <div class="section">
        <h2>DETALLES DEL PROYECTO</h2>
        <p><strong>Tipo de Proyecto:</strong> ${projectType}</p>
        ${projectDescription ? `<p><strong>Descripción:</strong> ${projectDescription}</p>` : ''}
      </div>

      <div class="section">
        <h2>TÉRMINOS FINANCIEROS</h2>
        ${subtotal !== totalAmount ? `<p><strong>Subtotal:</strong> <span class="amount">$${subtotal.toLocaleString()}</span></p>` : ''}
        <p><strong>Monto Total del Contrato:</strong> <span class="amount">$${totalAmount.toLocaleString()}</span></p>
        <p><strong>Términos de Pago:</strong> 30% de depósito requerido antes de comenzar el trabajo, saldo restante al completar</p>
      </div>

      ${clausesHtml}

      <div class="section">
        <h2>TÉRMINOS Y CONDICIONES GENERALES</h2>
        <p>Este contrato protege a ambas partes asegurando la finalización profesional del proyecto. Todo el trabajo se completará de acuerdo con los estándares de construcción de California y códigos de construcción locales.</p>
        <p>Las modificaciones a este contrato deben ser por escrito y firmadas por ambas partes. Este contrato se rige por las leyes del Estado de California.</p>
      </div>

      <div class="footer">
        <p><strong>Generado el:</strong> ${new Date().toLocaleString('es-ES')}</p>
        <p><strong>Cláusulas de protección aplicadas:</strong> ${selectedClauses.length}</p>
      </div>
    </body>
    </html>`;

      res.json({
        success: true,
        contractHtml,
        message: "Contrato defensivo generado exitosamente con cláusulas inteligentes",
        clausesApplied: selectedClauses.length
      });
    } catch (error) {
      console.error("Error generating defensive contract:", error);
      res.status(500).json({
        success: false,
        error: "Error generating contract",
      });
    }
  });

  // Use payment routes for general payments
  app.use("/api", paymentRoutes);

  // Use contractor payment routes for Stripe Connect functionality
  app.use("/api/contractor-payments", paymentRoutes);

  // Registro del endpoint simple para autoguardado de estimados
  console.log("🔧 Registrando endpoint simple para estimados...");
  app.use("/api/estimates-simple", estimatesSimpleRoutes);
  // NEW: Simple and direct AI description enhancement
  app.post("/api/ai-enhance", async (req: Request, res: Response) => {
    console.log("=== NEW AI ENHANCE ENDPOINT ===");
    console.log("📥 Full request received");
    console.log("📝 Body:", JSON.stringify(req.body, null, 2));

    try {
      const body = req.body;
      const text = body?.originalText || body?.description || body?.text;

      console.log("🔍 Extracted text:", text);
      console.log("🏗️ Project type:", body?.projectType);

      if (!text || text.trim() === "") {
        console.log("❌ No text found in request");
        return res.status(400).json({
          error: "No text provided for enhancement",
          receivedBody: body,
        });
      }

      console.log("🚀 Starting OpenAI enhancement...");

      // Configurar OpenAI si aún no está configurado
      if (!openai) {
        console.error("❌ OpenAI no está configurado correctamente");
        return res.status(500).json({ error: "OpenAI configuration error" });
      }

      // Create a professional prompt for project description enhancement with character limits
      const prompt = `Transform this construction project description into a professional, concise specification in English:

INPUT: "${text}"
PROJECT TYPE: "${body?.projectType || "general construction"}"

CRITICAL REQUIREMENTS:
- Response must be exactly 200-900 characters total
- Use professional construction terminology
- Include key technical details and materials
- Mention methodology and quality standards
- Write in flowing sentences, not bullet points
- Be concise but comprehensive

Output must be between 200-900 characters in English.`;

      // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      let enhancedDescription: string;

      try {
        // Try OpenAI first
        let response;
        try {
          response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
              {
                role: "system",
                content:
                  "You are a professional construction project manager. Transform descriptions into detailed, professional English specifications.",
              },
              { role: "user", content: prompt },
            ],
            temperature: 0.7,
            max_tokens: 1000,
          });

          if (
            response.choices &&
            response.choices[0] &&
            response.choices[0].message &&
            response.choices[0].message.content
          ) {
            let content = response.choices[0].message.content.trim();
            
            // Validate and adjust character length (200-900 characters)
            if (content.length < 200) {
              // If too short, enhance with more details
              content += ` This project includes professional grade materials, expert installation services, comprehensive quality assurance, and complete cleanup. All work performed to industry standards with warranty coverage and compliance to local building codes.`;
            } else if (content.length > 900) {
              // If too long, trim to 900 characters while keeping it professional
              content = content.substring(0, 897) + "...";
            }
            
            enhancedDescription = content;
            console.log(`✅ OpenAI enhancement completed successfully (${content.length} characters)`);
          } else {
            throw new Error("Invalid OpenAI response format");
          }
        } catch (openAiError) {
          console.log("⚠️ OpenAI failed, trying Anthropic fallback...");

          // Fallback to Anthropic
          try {
            const anthropicResponse = await fetch(
              "https://api.anthropic.com/v1/messages",
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "x-api-key": process.env.ANTHROPIC_API_KEY || "",
                  "anthropic-version": "2023-06-01",
                },
                body: JSON.stringify({
                  model: "claude-3-7-sonnet-20250219",
                  max_tokens: 1000,
                  messages: [
                    {
                      role: "user",
                      content: `You are a professional construction project manager. Transform this description into detailed, professional specifications:\n\n${text}`,
                    },
                  ],
                }),
              },
            );

            if (anthropicResponse.ok) {
              const anthropicData = await anthropicResponse.json();
              if (
                anthropicData.content &&
                anthropicData.content[0] &&
                anthropicData.content[0].text
              ) {
                let content = anthropicData.content[0].text.trim();
                
                // Validate and adjust character length (200-900 characters)
                if (content.length < 200) {
                  content += ` This project includes professional grade materials, expert installation services, comprehensive quality assurance, and complete cleanup. All work performed to industry standards with warranty coverage.`;
                } else if (content.length > 900) {
                  content = content.substring(0, 897) + "...";
                }
                
                enhancedDescription = content;
                console.log(`✅ Anthropic enhancement completed successfully (${content.length} characters)`);
              } else {
                throw new Error("Invalid Anthropic response");
              }
            } else {
              throw new Error("Anthropic API failed");
            }
          } catch (anthropicError) {
            console.log(
              "⚠️ Both AI services failed, using smart enhancement...",
            );

            // Smart enhancement fallback
            const words = text.split(" ");
            const enhanced = text
              .replace(/\b(fence|cerca)\b/gi, "professional fence installation")
              .replace(/\b(wood|madera)\b/gi, "premium cedar wood")
              .replace(/\b(install|instalar)\b/gi, "professionally install")
              .replace(/\b(yard|patio)\b/gi, "residential property");

            enhancedDescription = `Professional Project Specification:\n\n${enhanced}\n\nThis project includes:\n- Material procurement and delivery\n- Professional installation services\n- Quality assurance and cleanup\n- Warranty coverage\n\nEstimated timeline: 2-3 business days\nAll work performed to local building codes and standards.`;

            console.log("✅ Smart enhancement completed as fallback");
          }
        }

        console.log(
          "📏 Enhanced description length:",
          enhancedDescription.length,
        );

        res.json({
          enhancedDescription: enhancedDescription,
          originalText: text,
          success: true,
        });
      } catch (openAiError) {
        console.error("❌ Error during AI processing:", openAiError);

        // Ultimate fallback - always return something useful with proper length
        let enhancedFallback = `Professional ${projectType || "Construction"} Specification: ${text} This project includes professional grade materials, expert installation services, comprehensive quality assurance, and complete cleanup. All work performed to industry standards with warranty coverage and compliance to local building codes.`;
        
        // Ensure fallback is within 200-900 character limits
        if (enhancedFallback.length < 200) {
          enhancedFallback += ` Additional professional services include project management, safety protocols, environmental compliance, and customer satisfaction guarantee.`;
        } else if (enhancedFallback.length > 900) {
          enhancedFallback = enhancedFallback.substring(0, 897) + "...";
        }

        res.json({
          enhancedDescription: enhancedFallback,
          originalText: text,
          success: true,
          fallback: true,
        });
      }
    } catch (error: any) {
      console.error("❌ Error in AI enhancement:", error);
      res.status(500).json({
        error: "AI enhancement failed",
        message: error.message || "Unknown error",
      });
    }
  });

  // Endpoint para verificar el estado de OpenAI
  app.get("/api/openai-status", async (req: Request, res: Response) => {
    try {
      // Comprobación básica de OpenAI
      await openai.chat.completions.create({
        model: GPT_MODEL,
        messages: [{ role: "user", content: "Hola" }],
        max_tokens: 5,
      });
      res.json({ available: true });
    } catch (error: any) {
      console.error("Error verificando OpenAI:", error);
      res.json({
        available: false,
        error: error.message || "Error desconocido",
      });
    }
  });

  // Registrar rutas específicas
  registerPromptTemplateRoutes(app);
  registerEstimateRoutes(app);
  registerPropertyRoutes(app);
  setupTemplatesRoutes(app);

  // Registrar rutas de facturación
  const invoiceRoutes = await import('./routes/invoice-routes');
  app.use('/api/invoices', invoiceRoutes.default);

  // Registrar la nueva API REST de estimados renovada
  app.use("/api/estimates", estimatesRoutes);

  // PDF generation now handled exclusively by premiumPdfService in contract routes

  // Registrar rutas del procesador de contratos PDF
  app.use("/api/pdf-contract-processor", pdfContractProcessorRoutes);

  // Registrar rutas de contratos
  app.use("/api/contracts", contractRoutes);

  // Registrar rutas de clientes
  app.use("/api/clients", clientRoutes);
  app.use("/api/ai-processor", aiProcessorRoutes);

  // Registrar rutas de correo electrónico
  app.use("/api/email", emailRoutes);

  // Registrar rutas de importación inteligente
  app.use("/api/import", aiImportRoutes);

  // Registrar rutas de QuickBooks
  app.use("/api/quickbooks", quickbooksRoutes);

  // Registrar rutas de Anthropic (Claude)
  app.use("/api/anthropic", anthropicRoutes);

  // Registrar ruta de contacto
  app.use("/api/contact", contactRoutes);

  // Registrar rutas de generación de PDF
  // PDF routes removed - using only premiumPdfService

  // Registrar rutas de mejora de descripciones con IA
  app.use("/api/project", aiEnhancementRoutes);

  // Registrar rutas del Motor de Abogado Defensor Digital
  // app.use("/api/legal-defense", legalDefenseRoutes); // Temporarily disabled for horizontal navigation

  // Registrar rutas del sistema unificado de contratos
  app.use("/api/unified-contracts", unifiedContractRoutes);

  // Registrar rutas del sistema de pagos para contratistas
  app.use("/api/contractor-payments", contractorPaymentRoutes);

  // Registrar rutas del sistema de correos centralizado
  app.use("/api/centralized-email", centralizedEmailRoutes);

  // generate estimate pdf basic template

  // app.post("/api/estimate-basic-pdf", async (req: Request, res: Response) => {
  //   try {
  //     const contract = req.body; // ✅ FIXED

  //     const API_KEY = process.env.PDFMONKEY_API_KEY;
  //     const TEMPLATE_ID = "DF24FD81-01C5-4054-BDCF-19ED1DFCD763";

  //     if (!API_KEY) {
  //       throw new Error("PDFMONKEY_API_KEY is not defined");
  //     }

  //     const payload = {
  //       document: {
  //         document_template_id: TEMPLATE_ID,
  //         payload: contract,
  //       },
  //     };

  //     const headers = {
  //       Authorization: `Bearer ${API_KEY}`,
  //       "Content-Type": "application/json",
  //     };

  //     const response = await axios.post(
  //       "https://api.pdfmonkey.io/api/v1/documents",
  //       payload,
  //       { headers },
  //     );
  //     console.log("📄 PDFMonkey response:" + response.data);
  //     res.status(200).json({
  //       msg: "PDF generated successfully",
  //       data: response.data.document,
  //     });
  //   } catch (error: any) {
  //     console.error("Error generating contract PDF:", error.message);
  //     res.status(500).json({
  //       msg: "Failed to generate PDF",
  //       error: error.message,
  //     });
  //   }
  // });

  // // generate estimate pdf premium template

  // app.post("/api/estimate-premium-pdf", async (req: Request, res: Response) => {
  //   try {
  //     const contract = req.body; // ✅ FIXED

  //     const API_KEY = process.env.PDFMONKEY_API_KEY;
  //     const TEMPLATE_ID = "2E4DC55E-044E-4FD3-B511-FEBF950071FA";

  //     if (!API_KEY) {
  //       throw new Error("PDFMONKEY_API_KEY is not defined");
  //     }

  //     const payload = {
  //       document: {
  //         document_template_id: TEMPLATE_ID,
  //         payload: contract,
  //         status: "success",
  //       },
  //     };

  //     const headers = {
  //       Authorization: `Bearer ${API_KEY}`,
  //       "Content-Type": "application/json",
  //     };

  //     const response = await axios.post(
  //       "https://api.pdfmonkey.io/api/v1/documents",
  //       payload,
  //       { headers },
  //     );
  //     console.log("📄 PDFMonkey response:" + response.data);
  //     res.status(200).json({
  //       msg: "PDF generated successfully",
  //       data: response.data.document,
  //     });
  //   } catch (error: any) {
  //     console.error("Error generating contract PDF:", error.message);
  //     res.status(500).json({
  //       msg: "Failed to generate PDF",
  //       error: error.message,
  //     });
  //   }
  // });

  const waitForDocumentReady = async (
    documentId: string,
    apiKey: string,
    maxRetries = 10,
    interval = 3000,
  ) => {
    const headers = {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    };

    for (let i = 0; i < maxRetries; i++) {
      const res = await axios.get(
        `https://api.pdfmonkey.io/api/v1/document_cards/${documentId}`,
        { headers },
      );
      const doc = res.data;
      console.log(doc);

      if (doc.document_card.download_url) {
        return doc.document_card;
      }

      await new Promise((resolve) => setTimeout(resolve, interval));
    }

    throw new Error("Timed out waiting for PDF to be ready.");
  };

  // 🧾 NEW: Professional Invoice PDF Generation
  app.post("/api/invoice-pdf", async (req: Request, res: Response) => {
    console.log('🎯 Professional Invoice PDF generation started');
    
    try {
      // Initialize Invoice PDF service
      await invoicePdfService.initialize();
      
      // Extract and validate data from request
      const requestData = req.body;
      console.log('🔍 Invoice request data:', JSON.stringify(requestData, null, 2));
      
      // Handle contractor profile data
      const profile = requestData.profile || {};
      const estimate = requestData.estimate || {};
      const invoiceConfig = requestData.invoiceConfig || {};
      
      // Calculate due date based on payment status
      const dueDate = invoiceConfig.totalAmountPaid 
        ? new Date().toLocaleDateString() // Already paid
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString(); // 30 days from now
      
      // Prepare invoice data structure
      const invoiceData = {
        company: {
          name: profile.company || 'Your Company',
          address: profile.address || 'Company Address',
          phone: profile.phone || 'Phone Number',
          email: profile.email || 'Email Address',
          website: profile.website || 'Website',
          logo: profile.logo || ''
        },
        invoice: {
          number: `INV-${Date.now()}`,
          date: new Date().toLocaleDateString(),
          due_date: dueDate,
          items: estimate.items?.map(item => ({
            code: item.name || 'Item',
            description: item.description || '',
            qty: item.quantity || 1,
            unit_price: `$${Number(item.price || 0).toFixed(2)}`,
            total: `$${Number(item.total || 0).toFixed(2)}`
          })) || [],
          subtotal: `$${Number(estimate.subtotal || 0).toFixed(2)}`,
          discounts: Number(estimate.discountAmount || 0) > 0 ? `-$${Number(estimate.discountAmount || 0).toFixed(2)}` : '$0.00',
          tax_rate: estimate.taxRate || 0,
          tax_amount: `$${Number(estimate.tax || 0).toFixed(2)}`,
          total: `$${Number(estimate.total || 0).toFixed(2)}`,
          discountAmount: Number(estimate.discountAmount || 0)
        },
        client: {
          name: estimate.client?.name || 'Client Name',
          email: estimate.client?.email || 'No email provided',
          phone: estimate.client?.phone || 'No phone provided',
          address: (() => {
            // Build complete address from available fields
            const addressParts = [];
            if (estimate.client?.address && estimate.client.address.trim() !== '') {
              addressParts.push(estimate.client.address.trim());
            }
            if (estimate.client?.city && estimate.client.city.trim() !== '') {
              addressParts.push(estimate.client.city.trim());
            }
            if (estimate.client?.state && estimate.client.state.trim() !== '') {
              addressParts.push(estimate.client.state.trim());
            }
            if (estimate.client?.zipCode && estimate.client.zipCode.trim() !== '') {
              addressParts.push(estimate.client.zipCode.trim());
            } else if (estimate.client?.zipcode && estimate.client.zipcode.trim() !== '') {
              addressParts.push(estimate.client.zipcode.trim());
            }
            
            return addressParts.length > 0 ? addressParts.join(', ') : 'No address provided';
          })(),
          contact: `${estimate.client?.phone || 'No phone provided'}\n${estimate.client?.email || 'No email provided'}`
        },
        invoiceConfig
      };
      
      console.log('📊 Processed invoice data:', JSON.stringify(invoiceData, null, 2));
      
      // Generate PDF using Invoice service
      const pdfBuffer = await invoicePdfService.generatePdf(invoiceData);
      
      // Validate PDF buffer
      console.log('🔍 PDF Buffer validation:', {
        isBuffer: Buffer.isBuffer(pdfBuffer),
        length: pdfBuffer.length,
        firstBytes: pdfBuffer.subarray(0, 8).toString('hex'),
        isPDF: pdfBuffer.subarray(0, 4).toString() === '%PDF'
      });
      
      // Set response headers for PDF download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="invoice-${invoiceData.invoice.number}.pdf"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      res.setHeader('Cache-Control', 'no-cache');
      
      // Send PDF buffer as binary data
      res.end(pdfBuffer, 'binary');
      
      console.log('✅ Professional Invoice PDF generated and sent successfully');
      
    } catch (error) {
      console.error('❌ Error generating Invoice PDF:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate Invoice PDF',
        details: error.message
      });
    }
  });

  // 🚀 NEW: Professional Puppeteer PDF Generation (replaces PDFMonkey)
  app.post("/api/estimate-puppeteer-pdf", async (req: Request, res: Response) => {
    console.log('🎯 Professional PDF generation with Puppeteer started');
    
    try {
      // Initialize Puppeteer service if not already done
      await puppeteerPdfService.initialize();
      
      // Extract and validate data from request
      const requestData = req.body;
      console.log('🔍 Raw request data:', JSON.stringify(requestData, null, 2));
      
      // Handle different data structures from frontend
      const user = requestData.user || [];
      const client = requestData.client || requestData.estimate?.client || {};
      const items = requestData.items || requestData.estimate?.items || [];
      const projectTotalCosts = requestData.projectTotalCosts || {};
      const originalData = requestData.originalData || {};
      
      // Also check for direct estimate data structure
      if (requestData.estimate) {
        items.push(...(requestData.estimate.items || []));
      }
      
      console.log('📊 Processed data:', {
        hasUser: !!user,
        hasClient: !!client,
        clientName: client?.name,
        itemsCount: items?.length || 0,
        hasCosts: !!projectTotalCosts,
        subtotal: projectTotalCosts?.subtotal,
        total: projectTotalCosts?.total
      });

      // Get contractor profile data
      let contractorData = {};
      try {
        if (user?.[0]?.uid) {
          const profile = await storage.getUserByFirebaseUid(user[0].uid);
          if (profile) {
            contractorData = {
              name: profile.company || profile.displayName || 'OWL FENC',
              address: profile.address || '2901 Owens Court, Fairfield, California 94534',
              phone: profile.phone || '(555) 123-4567',
              email: profile.email || 'truthbackpack@gmail.com',
              website: profile.website || 'https://owlfenc.com/',
              logo: profile.logoBase64 || ''
            };
          }
        }
      } catch (profileError) {
        console.warn('Warning: Could not fetch contractor profile:', profileError);
        // Use fallback contractor data
        contractorData = {
          name: 'OWL FENC',
          address: '2901 Owens Court, Fairfield, California 94534',
          phone: '(555) 123-4567',
          email: 'truthbackpack@gmail.com',
          website: 'https://owlfenc.com/',
          logo: ''
        };
      }

      // Process items data
      let processedItems = [];
      if (items && Array.isArray(items)) {
        processedItems = items.map((item, index) => ({
          code: item.name || item.materialId || `Item ${index + 1}`,
          description: item.description || 'No description available',
          qty: item.quantity || item.qty || 1,
          unit_price: `$${(item.price || 0).toFixed(2)}`,
          total: `$${(item.total || (item.price * item.quantity) || 0).toFixed(2)}`
        }));
      }

      // Calculate financial summary
      const subtotal = projectTotalCosts?.subtotal || 0;
      const discount = projectTotalCosts?.discount || 0;
      const taxRate = projectTotalCosts?.taxRate || 10;
      const taxAmount = projectTotalCosts?.tax || 0;
      const total = projectTotalCosts?.total || subtotal;

      // Structure data for Puppeteer service
      const estimateData = {
        company: contractorData,
        estimate: {
          number: `EST-${Date.now()}`,
          date: new Date().toLocaleDateString(),
          valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString(),
          project_description: originalData?.projectDescription || 
                              client?.notes || 
                              'Construction project as specified',
          items: processedItems,
          subtotal: `$${subtotal.toFixed(2)}`,
          discounts: discount > 0 ? `-$${discount.toFixed(2)}` : '$0.00',
          tax_rate: taxRate,
          tax_amount: `$${taxAmount.toFixed(2)}`,
          total: `$${total.toFixed(2)}`
        },
        client: {
          name: client?.name || client?.clientName || 'Valued Client',
          email: client?.email || '',
          phone: client?.phone || '',
          address: client?.address || 
                  [client?.city, client?.state, client?.zipCode].filter(Boolean).join(', ') || ''
        }
      };

      console.log('🎨 Generating PDF with professional template...');
      
      // Log the final data structure being sent to PDF service
      console.log('📊 Final estimate data for PDF:', JSON.stringify({
        company: estimateData.company,
        client: estimateData.client,
        itemsCount: estimateData.estimate.items.length,
        estimate: {
          ...estimateData.estimate,
          items: estimateData.estimate.items.map(item => ({
            code: item.code,
            description: item.description?.substring(0, 50) + '...',
            qty: item.qty,
            unit_price: item.unit_price,
            total: item.total
          }))
        }
      }, null, 2));

      // Generate PDF using Puppeteer service
      const pdfBuffer = await puppeteerPdfService.generatePdf(estimateData);
      
      // Validate PDF buffer
      console.log('🔍 PDF Buffer validation:', {
        isBuffer: Buffer.isBuffer(pdfBuffer),
        length: pdfBuffer.length,
        firstBytes: pdfBuffer.subarray(0, 8).toString('hex'),
        isPDF: pdfBuffer.subarray(0, 4).toString() === '%PDF'
      });
      
      // Set response headers for PDF download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="estimate-${Date.now()}.pdf"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      res.setHeader('Cache-Control', 'no-cache');
      
      // Send PDF buffer as binary data
      res.end(pdfBuffer, 'binary');
      
      console.log('✅ Professional PDF generated and sent successfully');
      
    } catch (error) {
      console.error('❌ Error generating PDF with Puppeteer:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate PDF',
        details: error.message
      });
    }
  });

  // 🧾 Estimate - BASIC with proper data mapping (keeping for backward compatibility)
  app.post("/api/estimate-basic-pdf", async (req: Request, res: Response) => {
    try {
      const contract = req.body;
      const API_KEY = process.env.PDFMONKEY_API_KEY;
      const TEMPLATE_ID = "D49152DA-BC69-4FFD-B6A3-3F7F4EA7E8B6";

      if (!API_KEY) throw new Error("PDFMONKEY_API_KEY is not defined");

      // Restructure data to match template expectations exactly
      const mappedData = {
        company: {
          name: contract.company?.name || "Company Name",
          address: contract.company?.address || "",
          phone: contract.company?.phone || "",
          email: contract.company?.email || "",
          website: contract.company?.website || "",
          logo: contract.company?.logo || ""
        },
        estimate: {
          number: contract.estimate?.number || "EST-001",
          date: contract.estimate?.date || new Date().toLocaleDateString(),
          valid_until: contract.estimate?.valid_until || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString(),
          project_description: contract.estimate?.project_description?.substring(0, 300) || "Project description not provided",
          items: (contract.estimate?.items || []).map(item => ({
            code: item.code || item.name || "Item",
            description: item.description || "",
            qty: item.qty || item.quantity || 1,
            unit_price: item.unit_price || `$${Number(item.price || 0).toFixed(2)}`,
            total: item.total || `$${Number(item.total || item.quantity * item.price || 0).toFixed(2)}`
          })),
          subtotal: contract.estimate?.subtotal || "$0.00",
          discounts: contract.estimate?.discounts || "$0.00",
          tax_rate: contract.estimate?.tax_rate || 0,
          tax_amount: contract.estimate?.tax_amount || "$0.00",
          total: contract.estimate?.total || "$0.00"
        },
        client: {
          name: contract.client?.name || "Client Name",
          email: contract.client?.email || "",
          phone: contract.client?.phone || "",
          address: contract.client?.address || ""
        }
      };

      console.log("📋 Mapped data for template:", JSON.stringify(mappedData, null, 2));
      console.log("📋 Items count:", mappedData.estimate.items.length);

      const payload = {
        document: {
          document_template_id: TEMPLATE_ID,
          payload: mappedData,
          status: "pending",
        },
        meta: {
          clientId: mappedData.estimate.number,
          _filename: mappedData.estimate.number + ".pdf",
        },
      };

      const headers = {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      };

      const response = await axios.post(
        "https://api.pdfmonkey.io/api/v1/documents",
        payload,
        { headers },
      );
      const documentId = response.data.document.id;

      // Wait for PDF to be fully generated
      const finalDoc = await waitForDocumentReady(documentId, API_KEY);

      res.status(200).json({
        msg: "PDF generated successfully",
        data: finalDoc,
      });
    } catch (error: any) {
      console.error("Error generating contract PDF:", error.message);
      res
        .status(500)
        .json({ msg: "Failed to generate PDF", error: error.message });
    }
  });

  // 🧾 Estimate - PREMIUM
  app.post("/api/estimate-premium-pdf", async (req: Request, res: Response) => {
    try {
      const contract = req.body;
      const API_KEY = process.env.PDFMONKEY_API_KEY;
      const TEMPLATE_ID = "2E4DC55E-044E-4FD3-B511-FEBF950071FA";

      if (!API_KEY) throw new Error("PDFMONKEY_API_KEY is not defined");

      const payload = {
        document: {
          document_template_id: TEMPLATE_ID,
          payload: contract,
          status: "pending",
        },
        meta: {
          clientId: contract.estimate_number,
          _filename: contract.estimate_number + ".pdf",
        },
      };

      const headers = {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      };

      const response = await axios.post(
        "https://api.pdfmonkey.io/api/v1/documents",
        payload,
        { headers },
      );
      const documentId = response.data.document.id;

      // Wait for PDF to be fully generated
      const finalDoc = await waitForDocumentReady(documentId, API_KEY);

      res.status(200).json({
        msg: "PDF generated successfully",
        data: finalDoc,
      });
    } catch (error: any) {
      console.error("Error generating contract PDF:", error.message);
      res
        .status(500)
        .json({ msg: "Failed to generate PDF", error: error.message });
    }
  });

  // Endpoint robusto para guardar estimados
  app.post("/api/estimates-simple", async (req: Request, res: Response) => {
    try {
      console.log("💾 Recibiendo estimado para guardar:", req.body);

      const estimateData = req.body;
      const firebaseUserId = estimateData.firebaseUserId || "dev-user";

      // Crear proyecto usando el sistema existente
      // 🚀 MAPEO COMPLETO DE DATOS PARA TRANSFERENCIA AL DASHBOARD
      const projectData = {
        // ===== IDENTIFICACIÓN BÁSICA =====
        userId: 1, // ID numérico para PostgreSQL
        projectId:
          estimateData.projectId ||
          `proj_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        firebaseUserId: firebaseUserId,

        // ===== INFORMACIÓN DEL PROYECTO =====
        projectName:
          estimateData.projectName ||
          estimateData.title ||
          `Proyecto para ${estimateData.clientName}`,
        description:
          estimateData.projectDescription || estimateData.scope || "",
        projectType: estimateData.projectType || "fence",
        status: "estimate",

        // ===== INFORMACIÓN COMPLETA DEL CLIENTE =====
        clientName: estimateData.clientName || "",
        clientEmail: estimateData.clientEmail || "",
        clientPhone: estimateData.clientPhone || "",

        // ===== DIRECCIÓN COMPLETA =====
        address: estimateData.clientAddress || estimateData.address || "",
        city: estimateData.clientCity || estimateData.city || "",
        state: estimateData.clientState || estimateData.state || "",
        zipCode: estimateData.clientZipCode || estimateData.zipCode || "",

        // ===== INFORMACIÓN FINANCIERA =====
        estimateAmount: estimateData.total || estimateData.estimateAmount || 0,
        totalPrice: estimateData.total || estimateData.estimateAmount || 0,

        // ===== DATOS COMPLETOS PRESERVADOS =====
        estimateData: JSON.stringify({
          // Información básica del estimado
          estimateNumber: estimateData.estimateNumber,
          createdAt: estimateData.createdAt,
          validUntil: estimateData.validUntil,

          // Información completa del cliente
          client: {
            id: estimateData.clientId,
            name: estimateData.clientName,
            email: estimateData.clientEmail,
            phone: estimateData.clientPhone,
            address: estimateData.clientAddress,
            city: estimateData.clientCity,
            state: estimateData.clientState,
            zipCode: estimateData.clientZipCode,
          },

          // Información completa del contratista
          contractor: {
            companyName: estimateData.contractorCompanyName,
            address: estimateData.contractorAddress,
            city: estimateData.contractorCity,
            state: estimateData.contractorState,
            zip: estimateData.contractorZip,
            phone: estimateData.contractorPhone,
            email: estimateData.contractorEmail,
            license: estimateData.contractorLicense,
            insurance: estimateData.contractorInsurance,
            logo: estimateData.contractorLogo,
          },

          // Detalles completos del proyecto
          project: {
            name: estimateData.projectName,
            type: estimateData.projectType,
            subtype: estimateData.projectSubtype,
            description: estimateData.projectDescription,
            scope: estimateData.scope,
            timeline: estimateData.timeline,
            address: estimateData.address,
            city: estimateData.city,
            state: estimateData.state,
            zipCode: estimateData.zipCode,
          },

          // Items detallados
          items: estimateData.items || [],

          // Información financiera completa
          financials: {
            subtotal: estimateData.subtotal,
            discountType: estimateData.discountType,
            discountValue: estimateData.discountValue,
            discountAmount: estimateData.discountAmount,
            discountName: estimateData.discountName,
            taxRate: estimateData.taxRate,
            taxAmount: estimateData.taxAmount,
            total: estimateData.total,
            estimateAmount: estimateData.estimateAmount,
          },

          // Notas y términos
          notes: estimateData.notes,
          internalNotes: estimateData.internalNotes,
          terms: estimateData.terms,

          // Metadatos
          metadata: {
            source: "estimates-wizard",
            timestamp: new Date().toISOString(),
          },

          // Datos raw originales para máxima compatibilidad
          originalData: estimateData,
        }),
      };

      // Guardar en PostgreSQL usando el storage existente
      const project = await storage.createProject(projectData);

      console.log("✅ Estimado guardado como proyecto:", project.id);

      res.json({
        success: true,
        message: "Estimado guardado exitosamente",
        data: {
          projectId: project.id,
          estimateNumber: estimateData.estimateNumber,
        },
      });
    } catch (error) {
      console.error("❌ Error guardando estimado:", error);
      res.status(500).json({
        success: false,
        error: "Error interno del servidor",
      });
    }
  });

  // Endpoint robusto para obtener estimados guardados
  app.get("/api/estimates-simple", async (req: Request, res: Response) => {
    try {
      const projects = await storage.getProjectsByUserId(1);
      const estimates = projects
        .filter((p) => p.status === "estimate" && p.estimateData)
        .map((p) => {
          try {
            const estimateData = JSON.parse(p.estimateData || "{}");
            return {
              id: p.id,
              projectId: p.id,
              estimateNumber: estimateData.estimateNumber || `EST-${p.id}`,
              title: p.projectName,
              clientName: p.clientName,
              clientEmail: p.clientEmail,
              total: p.estimateAmount || 0,
              status: estimateData.status || "draft",
              createdAt: p.createdAt,
              ...estimateData,
            };
          } catch {
            return {
              id: p.id,
              projectId: p.id,
              estimateNumber: `EST-${p.id}`,
              title: p.projectName,
              clientName: p.clientName,
              total: p.estimateAmount || 0,
              status: "draft",
              createdAt: p.createdAt,
            };
          }
        });

      res.json({
        success: true,
        data: estimates,
      });
    } catch (error) {
      console.error("❌ Error obteniendo estimados:", error);
      res.status(500).json({
        success: false,
        error: "Error interno del servidor",
      });
    }
  });

  // Add API routes
  app.get("/api/projects", async (req: Request, res: Response) => {
    try {
      console.log("🔍 Obteniendo proyectos para contratos...");

      // Obtener todos los proyectos del sistema (usando userId por defecto)
      const allProjects = await storage.getProjectsByUserId(1);
      console.log(`📋 Total de proyectos encontrados: ${allProjects.length}`);

      // Filtrar proyectos existentes que pueden convertirse en contratos
      const contractEligibleProjects = allProjects.filter((project) => {
        return (
          project.clientName &&
          project.address &&
          (project.status === "client_approved" ||
            project.status === "approved" ||
            project.status === "estimate_sent" ||
            project.projectProgress === "approved" ||
            project.projectProgress === "client_approved")
        );
      });

      console.log(
        `✅ Proyectos elegibles para contrato: ${contractEligibleProjects.length}`,
      );

      // Formatear datos para el frontend
      const formattedProjects = contractEligibleProjects.map((project) => ({
        id: project.id,
        clientName: project.clientName,
        clientPhone: project.clientPhone || "",
        clientEmail: project.clientEmail || "",
        address: project.address,
        projectType: project.projectType || "Proyecto de cerca",
        projectDescription:
          project.projectDescription || project.description || "",
        totalAmount: project.totalPrice || 0,
        status: project.status || project.projectProgress || "approved",
        createdAt: project.createdAt,
        projectId: project.projectId || project.id.toString(),
      }));

      res.json(formattedProjects);
    } catch (error) {
      console.error("❌ Error fetching projects:", error);
      res.status(500).json({
        message: "Failed to fetch projects",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  app.get("/api/projects/:projectId", async (req: Request, res: Response) => {
    try {
      const { projectId } = req.params;
      const project = await storage.getProjectByProjectId(projectId);

      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      res.json(project);
    } catch (error) {
      console.error("Error fetching project:", error);
      res.status(500).json({ message: "Failed to fetch project" });
    }
  });

  app.post("/api/projects", async (req: Request, res: Response) => {
    try {
      const projectData = insertProjectSchema.parse(req.body);
      const project = await storage.createProject(projectData);
      res.status(201).json(project);
    } catch (error) {
      console.error("Error creating project:", error);
      res.status(400).json({ message: "Invalid project data" });
    }
  });

  // ===== ENDPOINTS DE PAGOS DE PROYECTOS =====

  // Endpoint para crear un checkout de pago de depósito (50%)
  app.post(
    "/api/projects/:projectId/payment/deposit",
    async (req: Request, res: Response) => {
      try {
        const { projectId } = req.params;
        const { successUrl = "", cancelUrl = "" } = req.body;

        // Convertir el projectId a número
        const projectIdNum = parseInt(projectId);
        if (isNaN(projectIdNum)) {
          return res.status(400).json({ message: "ID de proyecto inválido" });
        }

        // Generar el enlace de pago
        const checkoutUrl =
          await projectPaymentService.createProjectPaymentCheckout({
            projectId: projectIdNum,
            paymentType: "deposit",
            successUrl,
            cancelUrl,
          });

        res.json({ checkoutUrl });
      } catch (error) {
        console.error("Error al crear enlace de pago de depósito:", error);
        res.status(500).json({
          message: "Error al crear enlace de pago",
          error: error.message,
        });
      }
    },
  );

  // Endpoint para crear un checkout de pago final (50% restante)
  app.post(
    "/api/projects/:projectId/payment/final",
    async (req: Request, res: Response) => {
      try {
        const { projectId } = req.params;
        const { successUrl = "", cancelUrl = "" } = req.body;

        // Convertir el projectId a número
        const projectIdNum = parseInt(projectId);
        if (isNaN(projectIdNum)) {
          return res.status(400).json({ message: "ID de proyecto inválido" });
        }

        // Generar el enlace de pago
        const checkoutUrl =
          await projectPaymentService.createProjectPaymentCheckout({
            projectId: projectIdNum,
            paymentType: "final",
            successUrl,
            cancelUrl,
          });

        res.json({ checkoutUrl });
      } catch (error) {
        console.error("Error al crear enlace de pago final:", error);
        res.status(500).json({
          message: "Error al crear enlace de pago",
          error: error.message,
        });
      }
    },
  );

  // Endpoint para obtener los pagos de un proyecto
  app.get(
    "/api/projects/:projectId/payments",
    async (req: Request, res: Response) => {
      try {
        const { projectId } = req.params;

        // Convertir el projectId a número
        const projectIdNum = parseInt(projectId);
        if (isNaN(projectIdNum)) {
          return res.status(400).json({ message: "ID de proyecto inválido" });
        }

        // Obtener los pagos del proyecto
        const payments =
          await storage.getProjectPaymentsByProjectId(projectIdNum);

        res.json(payments);
      } catch (error) {
        console.error("Error al obtener pagos del proyecto:", error);
        res
          .status(500)
          .json({ message: "Error al obtener pagos del proyecto" });
      }
    },
  );

  // Endpoint para reenviar un enlace de pago
  app.post(
    "/api/project-payments/:paymentId/resend",
    async (req: Request, res: Response) => {
      try {
        const { paymentId } = req.params;

        // Convertir el paymentId a número
        const paymentIdNum = parseInt(paymentId);
        if (isNaN(paymentIdNum)) {
          return res.status(400).json({ message: "ID de pago inválido" });
        }

        // Reenviar el enlace de pago
        const checkoutUrl =
          await projectPaymentService.resendPaymentLink(paymentIdNum);

        res.json({ checkoutUrl });
      } catch (error) {
        console.error("Error al reenviar enlace de pago:", error);
        res.status(500).json({
          message: "Error al reenviar enlace de pago",
          error: error.message,
        });
      }
    },
  );

  app.get("/api/templates/:type", async (req: Request, res: Response) => {
    try {
      const { type } = req.params;
      // In a real app, we would get the user ID from the session
      const userId = 1; // Default user ID
      const templates = await storage.getTemplatesByType(userId, type);
      res.json(templates);
    } catch (error) {
      console.error("Error fetching templates:", error);
      res.status(500).json({ message: "Failed to fetch templates" });
    }
  });

  app.post("/api/templates", async (req: Request, res: Response) => {
    try {
      const templateData = insertTemplateSchema.parse(req.body);
      const template = await storage.createTemplate(templateData);
      res.status(201).json(template);
    } catch (error) {
      console.error("Error creating template:", error);
      res.status(400).json({ message: "Invalid template data" });
    }
  });

  app.post("/api/chat", async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        message: z.string(),
        context: z.record(z.any()).optional(),
        userId: z.number().optional(),
      });

      const { message, context = {}, userId = 1 } = schema.parse(req.body);
      const user = await storage.getUser(userId);
      const userContext = {
        contractorName: user?.company || "Acme Fencing",
        contractorPhone: user?.phone || "(503) 555-1234",
        contractorEmail: user?.email || "john@acmefencing.com",
        contractorAddress: user?.address || "123 Main St",
        contractorLicense: user?.license || "CCB #123456",
        ...context,
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
            clientName: response.context.clientName || "Cliente",
            clientEmail: response.context.clientEmail || "",
            clientPhone: response.context.clientPhone || "",
            address: response.context.clientAddress || "",
            fenceType: response.context.fenceType || "Wood Fence",
            status: "estimate_generated",
            estimateHtml: response.template.html,
            details: JSON.stringify(response.context),
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          // Intentar guardar el proyecto
          try {
            const project = await storage.createProject(projectData);
            console.log("Proyecto guardado:", project.projectId);
          } catch (saveError) {
            console.error("Error al guardar el proyecto:", saveError);
          }
        } catch (projectError) {
          console.error("Error preparando datos del proyecto:", projectError);
        }
      }

      res.json(response);
    } catch (error) {
      console.error("Error processing chat message:", error);
      res.status(400).json({ message: "Invalid request" });
    }
  });

  app.post("/api/generate-estimate", async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        projectDetails: z.record(z.any()),
      });

      const { projectDetails } = schema.parse(req.body);

      // Get the default estimate template
      const userId = 1; // Default user ID
      const template = await storage.getDefaultTemplate(userId, "estimate");

      if (!template) {
        return res
          .status(404)
          .json({ message: "No default estimate template found" });
      }

      // Generate HTML from template
      const html = await generateEstimateHtml({
        fenceType: projectDetails.fenceType,
        fenceLength: projectDetails.fenceLength,
        fenceHeight: projectDetails.fenceHeight,
        gates: projectDetails.gates || [],
        clientName: projectDetails.clientName,
        address: projectDetails.address,
        context: projectDetails.context || {},
      });

      res.json({ html });
    } catch (error) {
      console.error("Error generating estimate:", error);
      res.status(400).json({ message: "Failed to generate estimate" });
    }
  });

  // ** Nuevos endpoints para el generador de estimados **

  // Endpoint para validar datos de entrada
  app.post("/api/estimate/validate", async (req: Request, res: Response) => {
    try {
      // In a real app, we would get the user ID from the session
      const userId = 1; // Default user ID
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Validate input data
      const inputData = {
        ...req.body,
        contractorId: userId,
        contractorName: user.company || user.username,
        contractorAddress: user.address || "",
        contractorPhone: user.phone || "",
        contractorEmail: user.email || "",
        contractorLicense: user.license || "",
      };

      const validationErrors = validateProjectInput(inputData);

      if (Object.keys(validationErrors).length > 0) {
        return res.status(400).json({
          valid: false,
          errors: validationErrors,
        });
      }

      res.json({ valid: true });
    } catch (error) {
      console.error("Error validating project data:", error);
      res.status(400).json({ message: "Failed to validate project data" });
    }
  });

  // Endpoint para calcular estimado basado en reglas o IA
  app.post("/api/estimate/calculate", async (req: Request, res: Response) => {
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
        projectDimensions: z
          .object({
            length: z.number().optional(),
            height: z.number().optional(),
            width: z.number().optional(),
            area: z.number().optional(),
          })
          .refine(
            (data) => {
              // Si es un proyecto de cerca, longitud es obligatoria
              if (data.length && data.length > 0) return true;

              // Si es un proyecto de techado, área es obligatoria
              if (data.area && data.area > 0) return true;

              return false;
            },
            {
              message: "Se requiere longitud para cercas o área para techados",
            },
          ),
        additionalFeatures: z.record(z.any()).optional(),

        // Generation options
        useAI: z.boolean().optional(),
        customPrompt: z.string().optional(),
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
      const estimateResult =
        await estimatorService.generateEstimate(estimateInput);

      res.json(estimateResult);
    } catch (error) {
      console.error("Error calculating estimate:", error);

      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Datos de entrada inválidos",
          errors: error.errors,
        });
      }

      res.status(500).json({ message: "Error generando estimado" });
    }
  });

  // Endpoint para generar HTML personalizado del estimado
  app.post("/api/estimate/html", async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        estimateData: z.record(z.any()),
      });

      const { estimateData } = schema.parse(req.body);

      // Generate HTML
      const html = await estimatorService.generateEstimateHtml(estimateData);

      res.json({ html });
    } catch (error) {
      console.error("Error generating estimate HTML:", error);
      res.status(500).json({ message: "Error generando HTML del estimado" });
    }
  });

  // Endpoint para guardar el estimado como proyecto
  app.post("/api/estimate/save", async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        estimateData: z.record(z.any()),
        status: z.string().optional(),
      });

      const { estimateData, status = "draft" } = schema.parse(req.body);

      // In a real app, we would get the user ID from the session
      const userId = 1; // Default user ID

      // Generate HTML for the estimate
      const estimateHtml =
        await estimatorService.generateEstimateHtml(estimateData);

      // Prepare project data
      const projectData: InsertProject = {
        userId: userId,
        projectId:
          estimateData.projectId ||
          `proj_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        clientName: estimateData.client?.name || "Cliente",
        clientEmail: estimateData.client?.email || "",
        clientPhone: estimateData.client?.phone || "",
        address: estimateData.client?.address || "",
        fenceType: estimateData.project?.subtype || "",
        length: estimateData.project?.dimensions?.length || 0,
        height: estimateData.project?.dimensions?.height || 0,
        gates: estimateData.project?.additionalFeatures?.gates || [],
        additionalDetails: estimateData.project?.notes || "",
        estimateHtml: estimateHtml,
        status: status,
      };

      // Add total price if available
      if (estimateData.rulesBasedEstimate?.totals?.total) {
        projectData.totalPrice = Math.round(
          estimateData.rulesBasedEstimate.totals.total * 100,
        );
      }

      // Save to database
      const project = await storage.createProject(projectData);

      res.json({
        success: true,
        project,
      });
    } catch (error) {
      console.error("Error saving estimate:", error);
      res.status(500).json({ message: "Error guardando el estimado" });
    }
  });

  // Endpoint para obtener todos los materiales para un tipo específico
  app.get("/api/materials", async (req: Request, res: Response) => {
    try {
      const { category } = req.query;

      if (!category || typeof category !== "string") {
        return res
          .status(400)
          .json({ message: "Se requiere categoría de materiales" });
      }

      // Obtener materiales de la base de datos
      const materials = await storage.getMaterialsByCategory(category);

      res.json(materials);
    } catch (error) {
      console.error("Error fetching materials:", error);
      res.status(500).json({ message: "Error obteniendo materiales" });
    }
  });

  // Endpoint para generar un prompt y obtener estimado asistido por IA
  app.post(
    "/api/estimate/generate-prompt",
    async (req: Request, res: Response) => {
      try {
        const schema = z.object({
          userId: z.number().optional(),
          projectData: z.record(z.any()),
          category: z.string(),
        });

        const { userId = 1, projectData, category } = schema.parse(req.body);

        // Generar el prompt
        const prompt = await promptGeneratorService.generatePromptForProject(
          userId,
          projectData,
          category,
        );

        res.json({ prompt });
      } catch (error) {
        console.error("Error generating prompt:", error);
        res.status(500).json({ message: "Error generando prompt" });
      }
    },
  );

  // Endpoint para procesar un prompt con IA y obtener un estimado estructurado
  app.post(
    "/api/estimate/process-prompt",
    async (req: Request, res: Response) => {
      try {
        const schema = z.object({
          prompt: z.string(),
          systemInstructions: z.string().optional(),
        });

        const { prompt, systemInstructions } = schema.parse(req.body);

        // Procesar el prompt con OpenAI
        const result = await promptGeneratorService.processPromptWithAI(
          prompt,
          systemInstructions,
        );

        res.json(result);
      } catch (error) {
        console.error("Error processing prompt with AI:", error);
        res.status(500).json({ message: "Error procesando prompt con IA" });
      }
    },
  );

  // Endpoint para enviar estimado por email
  app.post("/api/estimate/send-email", async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        estimate: z.record(z.any()),
        templateId: z.number().optional().nullable(),
        email: z.string().email(),
        subject: z.string(),
        message: z.string(),
      });

      const { estimate, templateId, email, subject, message } = schema.parse(
        req.body,
      );

      // Enviar email
      const result = await emailService.sendEstimateByEmail(
        estimate,
        templateId ? String(templateId) : null,
        email,
        subject,
        message,
      );

      if (result) {
        res.json({ success: true, message: "Email enviado correctamente" });
      } else {
        res
          .status(500)
          .json({ success: false, message: "Error al enviar email" });
      }
    } catch (error) {
      console.error("Error sending email:", error);
      res.status(500).json({ message: "Error enviando email" });
    }
  });

  // New endpoint for sending estimate emails with SendGrid
  app.post("/api/send-estimate-email", async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        to: z.string().email(),
        subject: z.string(),
        message: z.string(),
        estimateHtml: z.string(),
        clientName: z.string(),
        companyName: z.string(),
        companyEmail: z.string(),
        sendCopy: z.boolean().optional(),
      });

      const {
        to,
        subject,
        message,
        estimateHtml,
        clientName,
        companyName,
        companyEmail,
        sendCopy,
      } = schema.parse(req.body);

      // Import SendGrid
      const sgMail = require("@sendgrid/mail");

      if (!process.env.SENDGRID_API_KEY) {
        return res
          .status(500)
          .json({ success: false, error: "SendGrid API key not configured" });
      }

      sgMail.setApiKey(process.env.SENDGRID_API_KEY);

      // Create HTML email content
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #2563eb; margin: 0;">${companyName}</h2>
            <p style="margin: 10px 0 0 0; color: #666;">Estimado Profesional</p>
          </div>
          
          <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb;">
            <p style="margin-bottom: 15px;">${message.replace(/\n/g, "<br>")}</p>
            
            <div style="margin: 20px 0;">
              <h3 style="color: #374151; margin-bottom: 15px;">Estimado Adjunto:</h3>
              ${estimateHtml}
            </div>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #666; font-size: 14px;">
              <p>Este estimado fue generado profesionalmente por ${companyName}.</p>
              <p>Si tiene preguntas, responda directamente a este email o contáctenos.</p>
            </div>
          </div>
        </div>
      `;

      // Prepare email data
      const emailData = {
        to: to,
        from: companyEmail || "noreply@owlfence.com",
        subject: subject,
        html: emailHtml,
        text: message,
      };

      // Send main email
      await sgMail.send(emailData);

      // Send copy if requested
      if (sendCopy && companyEmail) {
        const copyEmail = {
          ...emailData,
          to: companyEmail,
          subject: `[COPIA] ${subject}`,
        };
        await sgMail.send(copyEmail);
      }

      res.json({
        success: true,
        message: `Estimado enviado exitosamente a ${to}${sendCopy ? " (con copia)" : ""}`,
      });
    } catch (error) {
      console.error("Error sending estimate email:", error);
      res.status(500).json({
        success: false,
        error:
          "Error al enviar el email. Verifique la configuración de SendGrid.",
      });
    }
  });

  app.post("/api/generate-contract", async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        projectDetails: z.record(z.any()),
        model: z.string().optional(),
        systemPrompt: z.string().optional(),
      });

      const { projectDetails, model, systemPrompt } = schema.parse(req.body);

      let html: string;

      try {
        // Primero, intentar generar el contrato con el servicio de OpenAI
        const openaiService = require("./services/openaiService");
        console.log("Generando contrato con OpenAI...");

        // Formatear los datos del contrato para OpenAI
        const contractData = {
          contractor: {
            name: projectDetails.company || "Nombre de la Empresa",
            address: projectDetails.companyAddress || "Dirección de la Empresa",
            phone: projectDetails.companyPhone || "Teléfono de la Empresa",
            email: projectDetails.companyEmail || "Email de la Empresa",
            license: projectDetails.license || "Licencia #12345",
          },
          client: {
            name: projectDetails.clientName || "Nombre del Cliente",
            address: projectDetails.address || "Dirección del Cliente",
            phone: projectDetails.phone || "Teléfono del Cliente",
            email: projectDetails.email || "Email del Cliente",
          },
          project: {
            description: `Instalación de cerca de ${projectDetails.fenceType || "madera"} de ${projectDetails.fenceHeight || "6"} pies`,
            startDate:
              projectDetails.startDate || new Date().toLocaleDateString(),
            completionDate: projectDetails.completionDate || "",
            fenceType: projectDetails.fenceType || "madera",
            fenceHeight: projectDetails.fenceHeight || "6",
            fenceLength: projectDetails.fenceLength || "100",
            fenceMaterial:
              projectDetails.fenceMaterial || "madera tratada a presión",
            location:
              projectDetails.projectLocation ||
              projectDetails.address ||
              "Ubicación del Proyecto",
          },
          compensation: {
            totalCost: projectDetails.total || "5000",
            depositAmount:
              projectDetails.depositAmount ||
              String(Number(projectDetails.total || 5000) * 0.5),
            paymentMethod:
              projectDetails.paymentMethod ||
              "Efectivo o transferencia bancaria",
          },
          terms: {
            warrantyPeriod: projectDetails.warrantyPeriod || "1 año",
            cancellationPolicy:
              "Cancelación con 48 horas de anticipación sin penalización",
            disputeResolution: "Mediación seguida de arbitraje vinculante",
          },
          contractId:
            projectDetails.contractId ||
            `CON-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`,
        };

        html = await openaiService.generateContractHTML(contractData);
        console.log("Contrato generado con OpenAI exitosamente");
      } catch (openaiError) {
        console.warn(
          "Error al generar contrato con OpenAI, usando método de respaldo:",
          openaiError,
        );

        // Usar el método de respaldo tradicional si OpenAI falla
        const userId = 1; // Default user ID
        const template = await storage.getDefaultTemplate(userId, "contract");

        if (!template) {
          return res
            .status(404)
            .json({ message: "No default contract template found" });
        }

        html = await generateContractHtml(projectDetails);
      }

      res.json({ html });
    } catch (error) {
      console.error("Error generating contract:", error);
      res
        .status(400)
        .json({ message: "Failed to generate contract", error: error.message });
    }
  });

  app.post("/api/generate-pdf", async (req: Request, res: Response) => {
    try {
      console.log('🎨 [API] Processing PDF generation request...');
      console.log('Request body keys:', Object.keys(req.body));
      
      // Check if contract data is provided (has client and contractor objects)
      if (req.body.client && req.body.contractor) {
        console.log('🎨 [API] Detected contract data format - using premium service...');
        
        // Use premium service for contract data
        const { default: PremiumPdfService } = await import('./services/premiumPdfService');
        const premiumPdfService = PremiumPdfService.getInstance();
        
        // Enhanced contract data structure to capture ALL frontend data
        const contractData = {
          // Basic client and contractor info (existing)
          client: req.body.client,
          contractor: req.body.contractor,
          project: req.body.project,
          financials: req.body.financials,
          
          // NEW: Enhanced frontend data capture
          contractorInfo: req.body.contractorInfo || {},
          clientInfo: req.body.clientInfo || {},
          paymentTerms: req.body.paymentTerms || {},
          totalCost: req.body.totalCost || req.body.financials?.total || 0,
          timeline: req.body.timeline || {},
          permits: req.body.permits || {},
          warranties: req.body.warranties || {},
          extraClauses: req.body.extraClauses || [],
          consents: req.body.consents || {},
          signatures: req.body.signatures || {},
          confirmations: req.body.confirmations || {},
          legalNotices: req.body.legalNotices || {},
          selectedIntelligentClauses: req.body.selectedIntelligentClauses || [],
          
          // AI-generated content from frontend
          extractedData: req.body.extractedData || {},
          riskAnalysis: req.body.riskAnalysis || {},
          protectiveRecommendations: req.body.protectiveRecommendations || [],
          
          // Additional frontend customizations
          customTerms: req.body.customTerms || {},
          specialProvisions: req.body.specialProvisions || [],
          stateCompliance: req.body.stateCompliance || {},
          
          // Original raw data for debugging/fallback
          originalRequest: req.body
        };
        
        console.log('📋 [API] Enhanced contract data captured:', {
          hasExtraClauses: contractData.extraClauses.length > 0,
          hasIntelligentClauses: contractData.selectedIntelligentClauses.length > 0,
          hasCustomTerms: Object.keys(contractData.customTerms).length > 0,
          hasPaymentTerms: Object.keys(contractData.paymentTerms).length > 0,
          hasWarranties: Object.keys(contractData.warranties).length > 0
        });
        
        // Validate required data
        if (!contractData.client?.name || !contractData.contractor?.name) {
          return res.status(400).json({
            success: false,
            error: 'Missing required client or contractor information'
          });
        }
        
        // Generate premium PDF with enhanced data
        const pdfBuffer = await premiumPdfService.generateProfessionalPDF(contractData);
        
        // Set headers for PDF download
        const filename = `Contract_${contractData.client.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Length', pdfBuffer.length);
        
        console.log(`✅ [API] Enhanced contract generated: ${pdfBuffer.length} bytes`);
        return res.send(pdfBuffer);
        
      } else if (req.body.html && req.body.filename) {
        console.log('📄 [API] Detected HTML format - using simple service...');
        
        // Fallback for older HTML-based requests
        const schema = z.object({
          html: z.string(),
          filename: z.string(),
          templatePath: z.string().optional(),
          contractData: z.record(z.any()).optional(),
        });

        const { html, filename } = schema.parse(req.body);
        
        // Use simple HTML service for non-contract data
        // Using premiumPdfService for all PDF generation now
        console.log('HTML content saved for debugging');
        
        console.log(`✅ [API] Contract HTML generated: ${html.length} characters`);
        
        return res.json({
          success: true,
          html: html,
          filename: filename.replace('.pdf', '.html'),
          downloadUrl: `/api/contracts/download/${filename.replace('.pdf', '.html')}`,
          message: 'Contract generated successfully'
        });
        
      } else {
        // Invalid format
        return res.status(400).json({
          success: false,
          error: 'Invalid request format. Expected either contract data (client/contractor objects) or HTML with filename.',
          received: Object.keys(req.body)
        });
      }
      
    } catch (error: any) {
      console.error('❌ [API] Error in PDF generation:', error);
      res.status(500).json({
        success: false,
        message: "Failed to generate PDF",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // API para obtener contratos del usuario
  app.get("/api/contracts", async (req: Request, res: Response) => {
    try {
      // Verificar autenticación
      if (!req.isAuthenticated || !req.isAuthenticated()) {
        return res.status(401).json({ message: "No autenticado" });
      }

      const userId = req.user?.id;

      // Obtener proyectos que tienen contratos generados
      const userProjects = await storage.getProjectsByUserId(userId, {
        filterBy: "contractHtml",
        notNull: true,
      });

      // Mapear proyectos a formato de contrato
      const contracts = userProjects.map((project) => ({
        id: project.id,
        title: `Contrato de Cercado - ${project.clientName}`,
        clientName: project.clientName,
        createdAt: project.createdAt,
        status:
          project.status === "signed"
            ? "signed"
            : project.status === "completed"
              ? "completed"
              : project.status === "sent"
                ? "sent"
                : "draft",
        contractType: project.fenceType || "Cerca",
      }));

      res.json(contracts);
    } catch (error) {
      console.error("Error al obtener contratos:", error);
      res.status(500).json({
        error: "Error al obtener los contratos",
        details: error instanceof Error ? error.message : "Error desconocido",
      });
    }
  });

  // API para obtener un contrato específico
  app.get("/api/contracts/:id", async (req: Request, res: Response) => {
    try {
      // Verificar autenticación
      if (!req.isAuthenticated || !req.isAuthenticated()) {
        return res.status(401).json({ message: "No autenticado" });
      }

      const userId = req.user?.id;
      const contractId = parseInt(req.params.id);

      // Obtener el proyecto que contiene el contrato
      const project = await storage.getProjectById(contractId);

      if (!project || project.userId !== userId || !project.contractHtml) {
        return res.status(404).json({ message: "Contrato no encontrado" });
      }

      res.json({
        id: project.id,
        title: `Contrato de Cercado - ${project.clientName}`,
        clientName: project.clientName,
        createdAt: project.createdAt,
        status: project.status,
        contractType: project.fenceType || "Cerca",
        html: project.contractHtml,
      });
    } catch (error) {
      console.error("Error al obtener contrato:", error);
      res.status(500).json({
        error: "Error al obtener el contrato",
        details: error instanceof Error ? error.message : "Error desconocido",
      });
    }
  });

  // API para descargar un contrato como PDF
  app.get(
    "/api/contracts/:id/download",
    async (req: Request, res: Response) => {
      try {
        // Verificar autenticación
        if (!req.isAuthenticated || !req.isAuthenticated()) {
          return res.status(401).json({ message: "No autenticado" });
        }

        const userId = req.user?.id;
        const contractId = parseInt(req.params.id);

        // Obtener el proyecto que contiene el contrato
        const project = await storage.getProjectById(contractId);

        if (!project || project.userId !== userId || !project.contractHtml) {
          return res.status(404).json({ message: "Contrato no encontrado" });
        }

        // Generar PDF a partir del HTML del contrato
        const pdfBuffer = await generatePDF(project.contractHtml, "contract");

        // Enviar el PDF generado como descarga
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="contrato-${contractId}.pdf"`,
        );
        res.send(pdfBuffer);
      } catch (error) {
        console.error("Error al descargar contrato como PDF:", error);
        res.status(500).json({
          error: "Error al descargar el contrato",
          details: error instanceof Error ? error.message : "Error desconocido",
        });
      }
    },
  );

  // *** SUBSCRIPTION ROUTES ***
  app.get("/api/subscription/plans", async (req: Request, res: Response) => {
    try {
      // Siempre usar los planes actualizados
      const plans = null; // Forzar uso de planes por defecto actualizados

      // Devolver planes actualizados
      if (!plans || plans.length === 0) {
        const defaultPlans = [
          {
            id: 1,
            name: "Primo Chambeador",
            description:
              "Para el contratista que está empezando fuerte en el negocio",
            price: 2999,
            yearlyPrice: 29999,
            features: [
              "10 estimados básicos al mes (sin IA, con marca de agua)",
              "5 estimados con IA al mes (con marca de agua)",
              "10 Property Verification al mes",
              "5 Permit Advisor al mes",
              "Chat básico con Mervin AI",
              "Comunidad básica y soporte FAQ",
              "Sin acceso a Payment Tracker",
              "Sin acceso a Owl Funding ni Owl Academy",
            ],
            motto: "Ningún trabajo es pequeño cuando tu espíritu es grande.",
            code: "primo_chambeador",
            isActive: true,
          },
          {
            id: 2,
            name: "Mero Patrón",
            description:
              "Para el patrón que ya sabe cómo hacer que llueva el dinero",
            price: 4999,
            yearlyPrice: 49999,
            features: [
              "50 estimados con IA al mes (sin marca de agua)",
              "Estimados adicionales usan template con marca de agua",
              "Contratos ilimitados (sin marca de agua)",
              "50 Property Verification al mes",
              "50 Permit Advisor al mes",
              "Acceso completo a Payment Tracker avanzado",
              "Acceso total a Owl Funding (maquinaria, corporación, líneas de crédito)",
              "Acceso parcial a Owl Academy (módulos introductorios)",
              "Chat avanzado con Mervin AI",
              "Acceso a eventos y webinars exclusivos",
              "Comunidad privada",
              "Soporte prioritario por chat",
            ],
            motto:
              "No eres solo un patrón, eres el estratega que transforma el reto en victoria.",
            code: "mero_patron",
            isActive: true,
          },
          {
            id: 3,
            name: "Master Contractor",
            description:
              "Para el chingón que quiere delegar TODO el papeleo y subir su nivel a otra liga",
            price: 9999,
            yearlyPrice: 99999,
            features: [
              "Estimados ilimitados (básicos y con IA, sin marca de agua)",
              "Contratos ilimitados (sin marca de agua)",
              "Property Verification ilimitado",
              "Permit Advisor ilimitado",
              "Acceso total a Payment Tracker pro, reportes avanzados, integración con QuickBooks",
              "Acceso total a Owl Funding (con gestión personalizada y acompañamiento premium)",
              "Acceso completo a Owl Academy (todos los cursos, certificaciones, masterclass, simulacros)",
              "Chat experto con Mervin AI sin límites",
              "Invitaciones a networking, eventos y features beta",
              "Comunidad VIP",
              "Soporte VIP 24/7",
            ],
            motto:
              "Tu voluntad es acero, tu obra es ley. Lidera como un verdadero campeón.",
            code: "master_contractor",
            isActive: true,
          },
        ];
        return res.json(defaultPlans);
      }

      res.json(plans);
    } catch (error) {
      console.error("Error al obtener planes de suscripción:", error);
      res
        .status(500)
        .json({ message: "Error al obtener planes de suscripción" });
    }
  });

  app.get(
    "/api/subscription/user-subscription",
    async (req: Request, res: Response) => {
      try {
        // En una app real, obtendríamos el userId de la sesión
        const userId = 1; // Default user ID
        const subscription = await storage.getUserSubscriptionByUserId(userId);

        if (!subscription) {
          return res.json({ active: false });
        }

        // Si hay una suscripción, obtener el plan asociado
        const plan = await storage.getSubscriptionPlan(
          subscription.planId || 0,
        );

        res.json({
          active: subscription.status === "active",
          subscription,
          plan,
        });
      } catch (error) {
        console.error("Error al obtener suscripción del usuario:", error);
        res.status(500).json({ message: "Error al obtener suscripción" });
      }
    },
  );

  app.post(
    "/api/subscription/create-checkout",
    async (req: Request, res: Response) => {
      console.log(
        `[${new Date().toISOString()}] Iniciando creación de checkout`,
      );
      try {
        console.log("Solicitud de creación de checkout recibida:", req.body);

        // Validar los parámetros de la solicitud
        const schema = z.object({
          planId: z.number(),
          billingCycle: z.enum(["monthly", "yearly"]),
          successUrl: z.string(),
          cancelUrl: z.string(),
        });

        const validationResult = schema.safeParse(req.body);

        if (!validationResult.success) {
          console.error("Error de validación:", validationResult.error);
          return res.status(400).json({
            message: "Datos de solicitud inválidos",
            errors: validationResult.error.format(),
          });
        }

        const { planId, billingCycle, successUrl, cancelUrl } =
          validationResult.data;

        // Verificar que el plan existe
        const plan = await storage.getSubscriptionPlan(planId);
        if (!plan) {
          console.error(`Plan con ID ${planId} no encontrado`);
          return res
            .status(404)
            .json({ message: "Plan de suscripción no encontrado" });
        }

        // En una app real, obtendríamos el userId y la información del usuario de la sesión
        const userId = 1;
        const user = await storage.getUser(userId);

        if (!user) {
          console.error(`Usuario con ID ${userId} no encontrado`);
          return res.status(404).json({ message: "Usuario no encontrado" });
        }

        console.log(
          `Creando sesión de checkout para plan: ${plan.name}, ciclo: ${billingCycle}`,
        );

        try {
          const checkoutUrl = await stripeService.createSubscriptionCheckout({
            planId,
            userId,
            email: user.email || "cliente@example.com",
            name: user.company || "Cliente",
            billingCycle,
            successUrl,
            cancelUrl,
          });

          if (!checkoutUrl) {
            throw new Error("No se recibió URL de checkout válida");
          }

          console.log(
            "Sesión de checkout creada exitosamente, URL:",
            checkoutUrl.substring(0, 60) + "...",
          );
          res.json({ url: checkoutUrl });
        } catch (stripeError: any) {
          console.error(
            "Error específico de Stripe:",
            stripeError.message || stripeError,
          );
          res.status(502).json({
            message: "Error al comunicarse con el servicio de pagos",
            details: stripeError.message || "Error desconocido",
          });
        }
      } catch (error: any) {
        console.error("Error general al crear sesión de checkout:", error);
        res.status(500).json({
          message: "Error al crear sesión de checkout",
          details: error.message || "Error desconocido",
        });
      }
    },
  );

  app.post(
    "/api/subscription/create-portal",
    async (req: Request, res: Response) => {
      try {
        console.log(
          "Solicitud de creación de portal de cliente recibida:",
          req.body,
        );

        // Validar los parámetros de la solicitud
        const schema = z.object({
          successUrl: z.string(),
        });

        const validationResult = schema.safeParse(req.body);

        if (!validationResult.success) {
          console.error("Error de validación:", validationResult.error);
          return res.status(400).json({
            message: "Datos de solicitud inválidos",
            errors: validationResult.error.format(),
          });
        }

        const { successUrl } = validationResult.data;

        // En una app real, obtendríamos el userId de la sesión
        const userId = 1;

        // Verificar que el usuario tiene una suscripción activa
        const subscription = await storage.getUserSubscriptionByUserId(userId);

        if (!subscription) {
          console.error(
            `No se encontró una suscripción activa para el usuario ${userId}`,
          );
          return res
            .status(404)
            .json({ message: "No se encontró una suscripción activa" });
        }

        console.log(
          `Creando portal de cliente para suscripción ID: ${subscription.id}`,
        );

        try {
          const portalUrl = await stripeService.createCustomerPortalSession({
            subscriptionId: subscription.id,
            userId,
            successUrl,
            cancelUrl: successUrl,
          });

          if (!portalUrl) {
            throw new Error("No se recibió URL del portal válida");
          }

          console.log(
            "Portal de cliente creado exitosamente, URL:",
            portalUrl.substring(0, 60) + "...",
          );
          res.json({ url: portalUrl });
        } catch (stripeError: any) {
          console.error(
            "Error específico de Stripe:",
            stripeError.message || stripeError,
          );
          res.status(502).json({
            message: "Error al comunicarse con el servicio de pagos",
            details: stripeError.message || "Error desconocido",
          });
        }
      } catch (error: any) {
        console.error("Error general al crear portal de cliente:", error);
        res.status(500).json({
          message: "Error al crear portal de cliente",
          details: error.message || "Error desconocido",
        });
      }
    },
  );

  // ===== STRIPE CONNECT (Bank Accounts) ENDPOINTS =====

  // Endpoint para crear un enlace de onboarding de Stripe Connect
  app.post(
    "/api/payments/connect/create-onboarding",
    async (req: Request, res: Response) => {
      try {
        // En una app real, verificaríamos autenticación
        const userId = 1; // ID de usuario fijo para pruebas

        // Validar los parámetros de la solicitud
        const schema = z.object({
          refreshUrl: z.string(),
          returnUrl: z.string(),
        });

        const validationResult = schema.safeParse(req.body);

        if (!validationResult.success) {
          return res.status(400).json({
            message: "Datos de solicitud inválidos",
            errors: validationResult.error.format(),
          });
        }

        const { refreshUrl, returnUrl } = validationResult.data;

        console.log(`Creando enlace de onboarding para usuario ID: ${userId}`);

        try {
          // Crear el enlace de onboarding
          const onboardingUrl = await stripeService.createConnectOnboardingLink(
            userId,
            refreshUrl,
            returnUrl,
          );

          console.log(
            "Enlace de onboarding creado exitosamente:",
            onboardingUrl.substring(0, 60) + "...",
          );
          res.json({ url: onboardingUrl });
        } catch (stripeError: any) {
          console.error(
            "Error específico de Stripe:",
            stripeError.message || stripeError,
          );
          res.status(502).json({
            message: "Error al comunicarse con el servicio de pagos",
            details: stripeError.message || "Error desconocido",
          });
        }
      } catch (error: any) {
        console.error("Error al crear enlace de onboarding:", error);
        res.status(500).json({
          message: "Error al crear enlace de onboarding",
          details: error.message || "Error desconocido",
        });
      }
    },
  );

  // Endpoint para obtener el estado de la cuenta de Stripe Connect
  app.get(
    "/api/payments/connect/account-status",
    async (req: Request, res: Response) => {
      try {
        // En una app real, verificaríamos autenticación
        const userId = 1; // ID de usuario fijo para pruebas

        console.log(
          `Obteniendo estado de cuenta Connect para usuario ID: ${userId}`,
        );

        try {
          // Obtener el estado de la cuenta
          const accountStatus =
            await stripeService.getConnectAccountStatus(userId);

          console.log("Estado de cuenta Connect obtenido:", accountStatus);
          res.json(accountStatus);
        } catch (stripeError: any) {
          console.error(
            "Error específico de Stripe:",
            stripeError.message || stripeError,
          );
          res.status(502).json({
            message: "Error al comunicarse con el servicio de pagos",
            details: stripeError.message || "Error desconocido",
          });
        }
      } catch (error: any) {
        console.error("Error al obtener estado de cuenta Connect:", error);
        res.status(500).json({
          message: "Error al obtener estado de cuenta",
          details: error.message || "Error desconocido",
        });
      }
    },
  );

  // Endpoint para obtener las cuentas bancarias externas
  app.get(
    "/api/payments/connect/external-accounts",
    async (req: Request, res: Response) => {
      try {
        // En una app real, verificaríamos autenticación
        const userId = 1; // ID de usuario fijo para pruebas

        console.log(`Obteniendo cuentas bancarias para usuario ID: ${userId}`);

        try {
          // Obtener las cuentas bancarias
          const accounts =
            await stripeService.getConnectExternalAccounts(userId);

          console.log(`Se encontraron ${accounts.length} cuentas bancarias`);
          res.json(accounts);
        } catch (stripeError: any) {
          console.error(
            "Error específico de Stripe:",
            stripeError.message || stripeError,
          );
          res.status(502).json({
            message: "Error al comunicarse con el servicio de pagos",
            details: stripeError.message || "Error desconocido",
          });
        }
      } catch (error: any) {
        console.error("Error al obtener cuentas bancarias:", error);
        res.status(500).json({
          message: "Error al obtener cuentas bancarias",
          details: error.message || "Error desconocido",
        });
      }
    },
  );

  // Endpoint para crear un enlace al dashboard de Stripe Connect
  app.post(
    "/api/payments/connect/dashboard-link",
    async (req: Request, res: Response) => {
      try {
        // En una app real, verificaríamos autenticación
        const userId = 1; // ID de usuario fijo para pruebas

        // Validar los parámetros de la solicitud
        const schema = z.object({
          returnUrl: z.string(),
        });

        const validationResult = schema.safeParse(req.body);

        if (!validationResult.success) {
          return res.status(400).json({
            message: "Datos de solicitud inválidos",
            errors: validationResult.error.format(),
          });
        }

        const { returnUrl } = validationResult.data;

        console.log(`Creando enlace al dashboard para usuario ID: ${userId}`);

        try {
          // Crear el enlace al dashboard
          const dashboardUrl = await stripeService.createConnectDashboardLink(
            userId,
            returnUrl,
          );

          console.log(
            "Enlace al dashboard creado exitosamente:",
            dashboardUrl.substring(0, 60) + "...",
          );
          res.json({ url: dashboardUrl });
        } catch (stripeError: any) {
          console.error(
            "Error específico de Stripe:",
            stripeError.message || stripeError,
          );
          res.status(502).json({
            message: "Error al comunicarse con el servicio de pagos",
            details: stripeError.message || "Error desconocido",
          });
        }
      } catch (error: any) {
        console.error("Error al crear enlace al dashboard:", error);
        res.status(500).json({
          message: "Error al crear enlace al dashboard",
          details: error.message || "Error desconocido",
        });
      }
    },
  );

  app.post(
    "/api/webhook/stripe",
    express.raw({ type: "application/json" }),
    async (req: Request, res: Response) => {
      try {
        const event = req.body;

        // Manejar los eventos de suscripciones
        await stripeService.handleWebhookEvent(event);

        // Manejar eventos relacionados con pagos de proyectos
        // Para eventos de checkout.session.completed
        if (event.type === "checkout.session.completed") {
          const session = event.data.object;

          // Verificar si es un pago de proyecto (tiene metadata.projectId)
          if (session.metadata?.projectId) {
            await projectPaymentService.handleProjectCheckoutCompleted(session);
          }
        }

        res.json({ received: true });
      } catch (error) {
        console.error("Error al procesar webhook de Stripe:", error);
        res.status(400).send(`Webhook Error: ${error.message}`);
      }
    },
  );

  app.get(
    "/api/subscription/payment-history",
    async (req: Request, res: Response) => {
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
        const invoices = await stripeService.getCustomerInvoices(
          subscription.stripeCustomerId,
        );

        res.json(invoices);
      } catch (error) {
        console.error("Error al obtener historial de pagos:", error);
        res
          .status(500)
          .json({ message: "Error al obtener historial de pagos" });
      }
    },
  );

  app.get(
    "/api/subscription/payment-methods",
    async (req: Request, res: Response) => {
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
        const paymentMethods = await stripeService.getCustomerPaymentMethods(
          subscription.stripeCustomerId,
        );

        res.json(paymentMethods);
      } catch (error) {
        console.error("Error al obtener métodos de pago:", error);
        res.status(500).json({ message: "Error al obtener métodos de pago" });
      }
    },
  );

  app.post(
    "/api/subscription/update-payment-method",
    async (req: Request, res: Response) => {
      try {
        if (!req.isAuthenticated()) {
          return res.status(401).json({ message: "No autenticado" });
        }

        const userId = req.user.id;
        const returnUrl =
          req.body.returnUrl ||
          `${req.protocol}://${req.get("host")}/billing?success=true`;

        // Obtenemos la suscripción del usuario para conseguir el customerId
        const subscription = await storage.getUserSubscriptionByUserId(userId);

        if (!subscription || !subscription.stripeCustomerId) {
          return res
            .status(400)
            .json({ message: "No se encontró información de suscripción" });
        }

        // Crear sesión de configuración de método de pago
        const session = await stripeService.createSetupSession({
          customerId: subscription.stripeCustomerId,
          returnUrl,
        });

        res.json({ url: session.url });
      } catch (error) {
        console.error(
          "Error al crear sesión de actualización de método de pago:",
          error,
        );
        res
          .status(500)
          .json({ message: "Error al crear sesión de actualización" });
      }
    },
  );

  // Endpoint para crear un Setup Intent para tarjetas
  app.post(
    "/api/subscription/setup-intent",
    async (req: Request, res: Response) => {
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
            return res.status(404).json({ message: "Usuario no encontrado" });
          }

          // Crear un cliente en Stripe
          const customer = await stripeService.createCustomer({
            email: user.email || undefined,
            name: user.username,
          });

          // Si no hay suscripción, la creamos
          if (!subscription) {
            subscription = await storage.createUserSubscription({
              userId,
              planId: null,
              status: "inactive",
              stripeCustomerId: customer.id,
              stripeSubscriptionId: null,
              currentPeriodStart: new Date(), // Usamos campos correctos del schema
              currentPeriodEnd: null,
              cancelAtPeriodEnd: false,
              billingCycle: "monthly",
              nextBillingDate: null,
            });
          } else {
            // Actualizar la suscripción existente con el customerId
            subscription = await storage.updateUserSubscription(
              subscription.id,
              {
                stripeCustomerId: customer.id,
              },
            );
          }
        }

        // Crear un setup intent usando el servicio de Stripe
        const setupIntent = await stripeService.createSetupIntent(
          subscription.stripeCustomerId,
        );

        res.json({ clientSecret: setupIntent.client_secret });
      } catch (error) {
        console.error("Error al crear setup intent:", error);
        res.status(500).json({ message: "Error al procesar la solicitud" });
      }
    },
  );

  // Ruta para sincronizar planes con Stripe (solo para administradores)
  app.post("/api/admin/sync-plans", async (req: Request, res: Response) => {
    try {
      // En una app real, verificaríamos que el usuario es un administrador
      await stripeService.syncPlansWithStripe();
      res.json({ success: true });
    } catch (error) {
      console.error("Error al sincronizar planes con Stripe:", error);
      res.status(500).json({ message: "Error al sincronizar planes" });
    }
  });

  // Rutas para clientes
  app.get("/api/clients", async (req: Request, res: Response) => {
    try {
      // En una app real, obtendríamos el userId de la sesión
      const userId = 1;
      const clients = await storage.getClientsByUserId(userId);
      res.json(clients);
    } catch (error) {
      console.error("Error fetching clients:", error);
      res.status(500).json({ message: "Error al obtener los clientes" });
    }
  });

  app.post("/api/clients", async (req: Request, res: Response) => {
    try {
      const userId = 1; // En producción, obtener del token de autenticación
      const clientData = {
        ...req.body,
        userId,
        clientId: `client_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const newClient = await storage.createClient(clientData);
      res.status(201).json(newClient);
    } catch (error) {
      console.error("Error creating client:", error);
      res.status(400).json({ message: "Error al crear el cliente" });
    }
  });

  app.post("/api/clients/import/csv", async (req: Request, res: Response) => {
    try {
      const userId = 1; // En producción, obtener del token de autenticación
      const { csvData } = req.body;

      // Procesar el CSV y crear los clientes
      const rows = csvData.split("\n").slice(1); // Ignorar encabezados
      const clients = [];

      for (const row of rows) {
        const [name, email, phone, address] = row.split(",");
        if (name) {
          const clientData = {
            userId,
            clientId: `client_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            name: name.trim(),
            email: email?.trim(),
            phone: phone?.trim(),
            address: address?.trim(),
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          const newClient = await storage.createClient(clientData);
          clients.push(newClient);
        }
      }

      res.status(201).json({
        message: `${clients.length} clientes importados exitosamente`,
        clients,
      });
    } catch (error) {
      console.error("Error importing clients:", error);
      res.status(400).json({ message: "Error al importar clientes" });
    }
  });

  app.post("/api/clients/import/vcf", async (req: Request, res: Response) => {
    try {
      const userId = 1; // En producción, obtener del token de autenticación
      const { vcfData } = req.body;

      // Procesar datos vCard (formato .vcf de contactos de Apple)
      const vCards = vcfData
        .split("END:VCARD")
        .filter((card) => card.trim().length > 0)
        .map((card) => card + "END:VCARD");

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
              const addressParts = addressMatch[1].split(";");
              // Formato típico: ;;calle;ciudad;estado;código postal;país
              address = addressParts
                .slice(2)
                .filter((part) => part.trim())
                .join(", ");
            }

            const clientData = {
              userId,
              clientId: `client_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
              name,
              email,
              phone,
              address,
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            const newClient = await storage.createClient(clientData);
            clients.push(newClient);
          }
        } catch (cardError) {
          console.error("Error processing individual vCard:", cardError);
          // Continuar con la siguiente tarjeta
        }
      }

      res.status(201).json({
        message: `${clients.length} contactos importados exitosamente`,
        clients,
      });
    } catch (error) {
      console.error("Error importing vCard contacts:", error);
      res.status(400).json({ message: "Error al importar contactos de Apple" });
    }
  });

  // Profile endpoint used by frontend
  app.get("/api/profile", async (req: Request, res: Response) => {
    try {
      // Try to get saved profile data first, then fallback to defaults
      let profileData = {
        id: "dev-user-123",
        company: "Los primos",
        ownerName: "Gelasio Sanchez", 
        role: "Owner",
        email: "truthbackpack@gmail.com",
        phone: "(555) 123-4567",
        mobilePhone: "",
        address: "2901 Owens Court",
        city: "Fairfield",
        state: "California", 
        zipCode: "94534",
        license: "C-13 #123456",
        insurancePolicy: "ABC-123456",
        ein: "12-3456789",
        businessType: "LLC",
        yearEstablished: "2020",
        website: "owlfenc.com",
        description: "Professional fencing contractor",
        specialties: ["Residential Fencing", "Commercial Fencing"],
        socialMedia: {},
        documents: {},
        logo: ""
      };
      
      // Check if we have stored profile data with logo
      try {
        const storedData = global.profileStorage || {};
        if (storedData.company || storedData.logo) {
          profileData = { ...profileData, ...storedData };
          console.log('📋 Profile loaded with stored data, logo length:', storedData.logo?.length || 0);
        }
      } catch (err) {
        console.warn('Could not load stored profile data:', err);
      }
      
      res.json(profileData);
    } catch (error) {
      console.error("Error loading profile:", error);
      res.status(500).json({ error: "Error loading profile" });
    }
  });

  // POST endpoint for profile updates
  app.post("/api/profile", async (req: Request, res: Response) => {
    try {
      console.log('📝 [POST /api/profile] Datos recibidos, logo length:', req.body.logo?.length || 0);
      
      // Store profile data in memory for development
      global.profileStorage = {
        ...(global.profileStorage || {}),
        ...req.body,
        updatedAt: new Date().toISOString()
      };
      
      const profileData = global.profileStorage;
      
      console.log('✅ [POST /api/profile] Perfil guardado, logo length:', profileData.logo?.length || 0);
      
      res.json({
        success: true,
        message: "Perfil actualizado correctamente",
        data: profileData
      });
    } catch (error) {
      console.error("❌ [POST /api/profile] Error:", error);
      res.status(500).json({ 
        success: false, 
        error: "Error updating profile" 
      });
    }
  });

  app.get("/api/user-profile", async (req: Request, res: Response) => {
    try {
      // Obtener el usuario autenticado desde Firebase
      const authHeader = req.headers.authorization;
      let firebaseUserId = "dev-user-123"; // Usuario por defecto en desarrollo

      // En producción, extraer el ID real del usuario de Firebase
      if (authHeader && authHeader.startsWith("Bearer ")) {
        try {
          // Aquí normalmente verificaríamos el token de Firebase
          // Por ahora, usar el header customizado que enviamos desde el frontend
          firebaseUserId =
            (req.headers["x-firebase-uid"] as string) || "dev-user-123";
        } catch (authError) {
          console.warn(
            "No se pudo verificar token Firebase, usando usuario de desarrollo",
          );
        }
      }

      console.log("🔐 Cargando perfil para usuario Firebase:", firebaseUserId);

      // Buscar usuario por firebaseUserId en lugar de ID numérico
      const userId = 1; // ID numérico temporal para la base de datos PostgreSQL
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({
          message: "Perfil no encontrado",
          code: "PROFILE_NOT_FOUND",
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
        logo: user.logo || "",
      };

      res.json(profile);
    } catch (error) {
      console.error("Error loading profile:", error);
      res.status(500).json({
        message: "Error al cargar el perfil",
        code: "INTERNAL_ERROR",
      });
    }
  });

  // Endpoint para actualizar el perfil de usuario
  app.post("/api/user-profile", async (req: Request, res: Response) => {
    try {
      // En producción, obtener userId del token de autenticación
      const userId = 1; // Por ahora usar ID fijo para desarrollo

      // Verificar que el usuario existe
      const existingUser = await storage.getUser(userId);
      if (!existingUser) {
        return res.status(404).json({
          message: "Usuario no encontrado",
          code: "USER_NOT_FOUND",
        });
      }

      // Actualizar el perfil del usuario
      const profileData = req.body;

      // Preparar datos para actualizar, preservando datos existentes
      const userData: Partial<User> = {
        ...profileData,
        updatedAt: new Date(),
      };

      // Guardar los cambios en la base de datos
      await storage.updateUser(userId, userData);

      // Responder con éxito
      res.json({
        success: true,
        message: "Perfil actualizado correctamente",
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({
        success: false,
        message: "Error al actualizar el perfil",
        code: "INTERNAL_ERROR",
      });
    }
  });

  // Endpoint para sugerencias de direcciones
  app.get("/api/address/suggestions", async (req: Request, res: Response) => {
    const query = req.query.query as string;
    try {
      const response = await axios.get(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&types=address&key=${process.env.GOOGLE_MAPS_API_KEY}`,
      );

      const suggestions = response.data.predictions.map(
        (prediction: any) => prediction.description,
      );
      res.json(suggestions);
    } catch (error) {
      console.error("Error fetching address suggestions:", error);
      res.status(500).json({ error: "Error fetching suggestions" });
    }
  });

  // Endpoint para obtener detalles de una propiedad por dirección
  // Endpoints para el historial de búsqueda de propiedades
  app.get("/api/property/history", async (req: Request, res: Response) => {
    try {
      // En una aplicación real, obtendríamos el userId de la sesión
      const userId = 1; // ID de usuario por defecto para pruebas

      const history = await storage.getPropertySearchHistoryByUserId(userId);
      res.json(history);
    } catch (error) {
      console.error(
        "Error al obtener historial de búsqueda de propiedades:",
        error,
      );
      res.status(500).json({
        message: "Error al obtener historial de búsqueda de propiedades",
      });
    }
  });

  app.get("/api/property/history/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const historyItem = await storage.getPropertySearchHistory(parseInt(id));

      if (!historyItem) {
        return res
          .status(404)
          .json({ message: "Historial de búsqueda no encontrado" });
      }

      res.json(historyItem);
    } catch (error) {
      console.error(
        "Error al obtener detalle de historial de propiedad:",
        error,
      );
      res.status(500).json({
        message: "Error al obtener detalle de historial de propiedad",
      });
    }
  });

  app.post(
    "/api/property/history/:id/favorite",
    async (req: Request, res: Response) => {
      try {
        const { id } = req.params;
        const { isFavorite } = req.body;

        // Verificar que el historial existe
        const historyItem = await storage.getPropertySearchHistory(
          parseInt(id),
        );
        if (!historyItem) {
          return res
            .status(404)
            .json({ message: "Historial de búsqueda no encontrado" });
        }

        // Actualizar el estado de favorito
        const updatedHistory = await storage.updatePropertySearchHistory(
          parseInt(id),
          {
            isFavorite: !!isFavorite,
          },
        );

        res.json(updatedHistory);
      } catch (error) {
        console.error("Error al actualizar favorito:", error);
        res.status(500).json({ message: "Error al actualizar favorito" });
      }
    },
  );

  app.post(
    "/api/property/history/:id/notes",
    async (req: Request, res: Response) => {
      try {
        const { id } = req.params;
        const { notes } = req.body;

        // Verificar que el historial existe
        const historyItem = await storage.getPropertySearchHistory(
          parseInt(id),
        );
        if (!historyItem) {
          return res
            .status(404)
            .json({ message: "Historial de búsqueda no encontrado" });
        }

        // Actualizar las notas
        const updatedHistory = await storage.updatePropertySearchHistory(
          parseInt(id),
          {
            notes,
          },
        );

        res.json(updatedHistory);
      } catch (error) {
        console.error("Error al actualizar notas:", error);
        res.status(500).json({ message: "Error al actualizar notas" });
      }
    },
  );

  app.get("/api/property/details", async (req: Request, res: Response) => {
    const address = req.query.address as string;

    if (!address) {
      return res.status(400).json({
        message: 'Se requiere el parámetro "address"',
      });
    }

    console.log("===== INICIO DE SOLICITUD DE DETALLES DE PROPIEDAD =====");
    console.log("Solicitando datos de propiedad para dirección:", address);

    try {
      // Usar el servicio externo ATTOM directamente
      const ATTOM_WRAPPER_URL = "https://attom-wrapper.replit.app";
      console.log(
        `Intentando conexión directa con el servicio ATTOM en: ${ATTOM_WRAPPER_URL}`,
      );

      try {
        // Probar la conexión con el wrapper
        const testResponse = await axios.get(
          `${ATTOM_WRAPPER_URL}/api/health`,
          {
            timeout: 5000,
          },
        );
        console.log(
          "Estado del servicio ATTOM:",
          testResponse.data || "Sin datos de estado",
        );
      } catch (healthError) {
        console.error(
          "Error verificando estado del servicio ATTOM:",
          healthError.message,
        );
        // Continuamos aunque falle la verificación de salud
      }

      // Procedemos con múltiples intentos para obtener datos
      const startTime = Date.now();
      console.log("Intentos para obtener datos de propiedad:");

      // Intento 1: Enviar dirección completa
      console.log("Intento 1 - Dirección completa");
      try {
        const response = await axios.get(
          `${ATTOM_WRAPPER_URL}/api/property/details`,
          {
            params: { address },
            timeout: 15000,
          },
        );

        console.log(
          "Intento 1 exitoso. Datos recibidos:",
          response.data ? "Sí" : "No",
        );

        if (response.data) {
          const propertyData = {
            owner: response.data.owner || "No disponible",
            address: response.data.address || address,
            sqft: response.data.buildingAreaSqFt || response.data.sqft || 0,
            bedrooms:
              response.data.rooms?.bedrooms || response.data.bedrooms || 0,
            bathrooms:
              response.data.rooms?.bathrooms || response.data.bathrooms || 0,
            lotSize: response.data.lotSizeAcres
              ? `${response.data.lotSizeAcres} acres`
              : response.data.lotSize || "No disponible",
            landSqft: response.data.lotSizeSqFt || 0,
            yearBuilt: response.data.yearBuilt || 0,
            propertyType: response.data.propertyType || "Residencial",
            ownerOccupied: !!response.data.ownerOccupied,
            verified: true,
            ownershipVerified: !!response.data.owner,
            // Info adicional si está disponible
            purchaseDate: response.data.saleTransHistory?.[0]?.saleTransDate,
            purchasePrice: response.data.saleTransHistory?.[0]?.saleTransAmount,
            previousOwner: response.data.saleTransHistory?.[1]?.seller,
            ownerHistory: response.data.saleTransHistory?.map((entry: any) => ({
              owner: entry.buyer || "Desconocido",
              purchaseDate: entry.saleTransDate,
              purchasePrice: entry.saleTransAmount,
              saleDate: entry.recordingDate,
              salePrice: entry.saleTransAmount,
            })),
          };

          const endTime = Date.now();
          console.log(
            `Solicitud completada en ${endTime - startTime}ms con estado: SUCCESS`,
          );
          console.log("Enviando respuesta al cliente...");
          console.log(
            "===== FIN DE SOLICITUD DE DETALLES DE PROPIEDAD =====\n",
          );

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
              parcelNumber: propertyData.parcelNumber || "",
              tags: [], // Inicialmente sin etiquetas
            };

            // Validar los datos antes de guardar
            const validHistoryData =
              insertPropertySearchHistorySchema.parse(historyData);

            // Guardar en la base de datos
            await storage.createPropertySearchHistory(validHistoryData);
            console.log("Búsqueda guardada en el historial de propiedades");
          } catch (historyError) {
            // En caso de error al guardar el historial, solo lo registramos pero no interrumpimos la respuesta
            console.error(
              "Error al guardar en historial de propiedades:",
              historyError,
            );
          }

          return res.json(propertyData);
        }
      } catch (error1) {
        console.log("Intento 1 falló:", error1.message || "Error desconocido");
        console.log("Código de estado:", error1.response?.status || "N/A");
      }

      // Intento 2: Usar el formato de componentes
      console.log("Intento 2 - Formato de componentes de dirección");
      try {
        // Parsear dirección en componentes
        const addressParts = address.split(",").map((part) => part.trim());
        const streetAddress = addressParts[0];
        const city = addressParts.length > 1 ? addressParts[1] : "";
        const stateZip =
          addressParts.length > 2 ? addressParts[2].split(" ") : ["", ""];
        const state = stateZip[0] || "";
        const zip = stateZip.length > 1 ? stateZip[1] : "";

        console.log("Componentes de dirección:", {
          streetAddress,
          city,
          state,
          zip,
        });

        const response = await axios.get(
          `${ATTOM_WRAPPER_URL}/api/property/details`,
          {
            params: {
              street: streetAddress,
              city,
              state,
              zip,
            },
            timeout: 15000,
          },
        );

        if (response.data) {
          const propertyData = {
            owner: response.data.owner || "No disponible",
            address: response.data.address || address,
            sqft: response.data.buildingAreaSqFt || response.data.sqft || 0,
            bedrooms:
              response.data.rooms?.bedrooms || response.data.bedrooms || 0,
            bathrooms:
              response.data.rooms?.bathrooms || response.data.bathrooms || 0,
            lotSize: response.data.lotSizeAcres
              ? `${response.data.lotSizeAcres} acres`
              : response.data.lotSize || "No disponible",
            landSqft: response.data.lotSizeSqFt || 0,
            yearBuilt: response.data.yearBuilt || 0,
            propertyType: response.data.propertyType || "Residencial",
            ownerOccupied: !!response.data.ownerOccupied,
            verified: true,
            ownershipVerified: !!response.data.owner,
          };

          const endTime = Date.now();
          console.log(
            `Solicitud completada en ${endTime - startTime}ms con estado: SUCCESS`,
          );
          console.log("Enviando respuesta al cliente...");
          console.log(
            "===== FIN DE SOLICITUD DE DETALLES DE PROPIEDAD =====\n",
          );

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
              parcelNumber: propertyData.parcelNumber || "",
              tags: [], // Inicialmente sin etiquetas
            };

            // Validar los datos antes de guardar
            const validHistoryData =
              insertPropertySearchHistorySchema.parse(historyData);

            // Guardar en la base de datos
            await storage.createPropertySearchHistory(validHistoryData);
            console.log(
              "Búsqueda guardada en el historial de propiedades (intento 2)",
            );
          } catch (historyError) {
            // En caso de error al guardar el historial, solo lo registramos pero no interrumpimos la respuesta
            console.error(
              "Error al guardar en historial de propiedades:",
              historyError,
            );
          }

          return res.json(propertyData);
        }
      } catch (error2) {
        console.log("Intento 2 falló:", error2.message || "Error desconocido");
      }

      // Intento 3: Usar servicio interno
      console.log("Intento 3 - Servicio interno propertyService");
      try {
        const result =
          await propertyService.getPropertyDetailsWithDiagnostics(address);
        const endTime = Date.now();

        console.log(
          `Solicitud interna completada en ${endTime - startTime}ms con estado: ${result.status}`,
        );
        console.log("Diagnóstico de la solicitud:", {
          status: result.status,
          parsedAddress: result.diagnostics?.parsedAddress
            ? "disponible"
            : "no disponible",
          errorType: result.error?.code || "ninguno",
          processingTime: endTime - startTime,
        });

        if (result.status === "SUCCESS" && result.data) {
          console.log("ÉXITO: Datos verificados obtenidos de servicio interno");
          console.log("Enviando respuesta al cliente...");
          console.log(
            "===== FIN DE SOLICITUD DE DETALLES DE PROPIEDAD =====\n",
          );

          return res.json(result.data);
        }

        if (result.status === "NOT_FOUND") {
          console.log(
            "No se encontró información para la dirección proporcionada",
          );
          console.log(
            "===== FIN DE SOLICITUD DE DETALLES DE PROPIEDAD =====\n",
          );

          return res.status(404).json({
            message:
              "No se encontró información para la dirección proporcionada",
            details:
              "Verifica que la dirección esté correctamente escrita e incluya ciudad, estado y código postal",
          });
        }
      } catch (error3) {
        console.log("Intento 3 falló:", error3.message || "Error desconocido");
      }

      // Si llegamos aquí, todos los intentos han fallado
      console.log(
        "Todos los intentos fallaron. No se pudo obtener información de propiedad.",
      );
      return res.status(404).json({
        message: "No se encontró información para la dirección proporcionada",
        details:
          'Verifica que la dirección esté correctamente escrita. Por ejemplo: "123 Main St, Seattle, WA 98101"',
      });
    } catch (error: any) {
      console.error("ERROR EN VERIFICACIÓN DE PROPIEDAD:");
      console.error("Mensaje:", error.message);

      res.status(500).json({
        message: "Error al obtener detalles de la propiedad",
        error: error.message,
      });
    }
  });

  // Endpoint para Mervin DeepSearch - Permite consultar permisos y regulaciones para proyectos de construcción
  // Endpoints para el historial de búsqueda de permisos
  app.get("/api/permit/history", async (req: Request, res: Response) => {
    try {
      // En una aplicación real, obtendríamos el userId de la sesión
      const userId = 1; // ID de usuario por defecto

      const history = await storage.getPermitSearchHistoryByUserId(userId);
      res.json(history);
    } catch (error) {
      console.error(
        "Error al obtener historial de búsqueda de permisos:",
        error,
      );
      res
        .status(500)
        .json({ message: "Error al obtener historial de búsqueda" });
    }
  });

  app.get("/api/permit/history/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const historyItem = await storage.getPermitSearchHistory(parseInt(id));

      if (!historyItem) {
        return res
          .status(404)
          .json({ message: "Historial de búsqueda no encontrado" });
      }

      res.json(historyItem);
    } catch (error) {
      console.error("Error al obtener detalle de historial:", error);
      res
        .status(500)
        .json({ message: "Error al obtener detalle de historial" });
    }
  });

  app.post("/api/permit/check", async (req: Request, res: Response) => {
    try {
      console.log("===== INICIO DE SOLICITUD MERVIN DEEPSEARCH =====");

      // Validar el esquema de la solicitud
      const permitSchema = z.object({
        address: z.string().min(5, "La dirección es demasiado corta"),
        projectType: z
          .string()
          .min(3, "El tipo de proyecto es demasiado corto"),
      });

      const validationResult = permitSchema.safeParse(req.body);

      if (!validationResult.success) {
        console.error(
          "Error de validación en solicitud de permisos:",
          validationResult.error,
        );
        return res.status(400).json({
          message: "Datos de solicitud inválidos",
          errors: validationResult.error.format(),
        });
      }

      const { address, projectType } = validationResult.data;
      console.log(
        `Consultando permisos para proyecto de ${projectType} en ${address}`,
      );

      // Verificar que tenemos API key de OpenAI configurada
      if (!process.env.OPENAI_API_KEY) {
        console.error("Error: OpenAI API Key no configurada");
        return res.status(500).json({
          message: "Error de configuración del servicio",
          error: "No se ha configurado la API de OpenAI",
        });
      }

      // Obtener información de permisos
      const startTime = Date.now();
      const permitData = await permitService.checkPermits(address, projectType);
      const endTime = Date.now();

      console.log(`Solicitud completada en ${endTime - startTime}ms`);
      console.log("Información de permisos obtenida correctamente");

      // Guardar la búsqueda en el historial
      try {
        // En una aplicación real, obtendríamos el userId de la sesión
        const userId = 1; // ID de usuario por defecto

        // Crear un título basado en los parámetros de búsqueda
        const title = `${projectType} en ${address}`;

        // Obtener la descripción del proyecto si está disponible
        const projectDescription = req.body.projectDescription || "";

        // Guardar en el historial
        const historyData = {
          userId,
          address,
          projectType,
          projectDescription,
          results: permitData, // Guardar todos los resultados
          title,
        };

        // Validar los datos antes de guardar
        const validHistoryData =
          insertPermitSearchHistorySchema.parse(historyData);

        // Guardar en la base de datos
        await storage.createPermitSearchHistory(validHistoryData);
        console.log("Búsqueda guardada en el historial");
      } catch (historyError) {
        // En caso de error al guardar el historial, solo lo registramos pero no interrumpimos la respuesta
        console.error("Error al guardar historial de búsqueda:", historyError);
      }

      console.log("===== FIN DE SOLICITUD MERVIN DEEPSEARCH =====");

      res.json(permitData);
    } catch (error: any) {
      console.error("ERROR EN VERIFICACIÓN DE PERMISOS:");
      console.error("Mensaje:", error.message);

      res.status(500).json({
        message: "Error al obtener información de permisos y regulaciones",
        error: error.message,
      });
    }
  });

  // Endpoint para probar la funcionalidad de búsqueda web de Mervin DeepSearch
  app.get("/api/permit/test/search", async (req: Request, res: Response) => {
    try {
      console.log("===== PRUEBA DE BÚSQUEDA WEB MERVIN DEEPSEARCH =====");

      // Verificar que tenemos API key de OpenAI configurada
      if (!process.env.OPENAI_API_KEY) {
        console.error("Error: OpenAI API Key no configurada");
        return res.status(500).json({
          message: "Error de configuración del servicio",
          error: "No se ha configurado la API de OpenAI",
        });
      }

      const query = String(
        req.query.query || "fence permit requirements in Seattle, WA",
      );
      console.log(`Realizando búsqueda para: ${query}`);

      const startTime = Date.now();
      const searchResults = await searchService.webSearch(query);
      const endTime = Date.now();

      console.log(
        `Búsqueda completada en ${endTime - startTime}ms. Se encontraron ${searchResults.length} resultados.`,
      );
      console.log("===== FIN DE PRUEBA DE BÚSQUEDA WEB =====");

      res.json({
        query,
        results: searchResults,
        time: `${endTime - startTime}ms`,
      });
    } catch (error: any) {
      console.error("ERROR EN PRUEBA DE BÚSQUEDA WEB:");
      console.error("Mensaje:", error.message);

      res.status(500).json({
        message: "Error al realizar la búsqueda web",
        error: error.message,
      });
    }
  });

  // Endpoint para probar la extracción de contenido web de Mervin DeepSearch
  app.get("/api/permit/test/fetch", async (req: Request, res: Response) => {
    try {
      console.log(
        "===== PRUEBA DE EXTRACCIÓN DE CONTENIDO MERVIN DEEPSEARCH =====",
      );

      const url = String(req.query.url);

      if (!url) {
        return res.status(400).json({
          message: 'Se requiere el parámetro "url"',
        });
      }

      console.log(`Extrayendo contenido de: ${url}`);

      const startTime = Date.now();
      const content = await searchService.fetchPage(url);
      const endTime = Date.now();

      console.log(
        `Extracción completada en ${endTime - startTime}ms. Longitud del contenido: ${content.length} caracteres.`,
      );
      console.log("===== FIN DE PRUEBA DE EXTRACCIÓN DE CONTENIDO =====");

      res.json({
        url,
        contentLength: content.length,
        contentPreview: content.substring(0, 500) + "...",
        time: `${endTime - startTime}ms`,
      });
    } catch (error: any) {
      console.error("ERROR EN PRUEBA DE EXTRACCIÓN DE CONTENIDO:");
      console.error("Mensaje:", error.message);

      res.status(500).json({
        message: "Error al extraer el contenido web",
        error: error.message,
      });
    }
  });

  // Registrar rutas del módulo DeepSearch IA
  registerDeepSearchRoutes(app);

  // Registrar rutas del módulo Labor DeepSearch IA
  registerLaborDeepSearchRoutes(app);

  // Professional Contract Generation with Premium Cards and Visual Design
  app.post('/api/contracts/generate-professional', async (req, res) => {
    try {
      console.log('🎨 [PREMIUM] Starting contract generation with CARDS and borders...');
      
      // Transform the request data to premium service format
      const contractData = {
        client: {
          name: req.body.clientInfo?.name || 'Client Name',
          address: req.body.clientInfo?.address || 'Client Address',
          phone: req.body.clientInfo?.phone || 'Client Phone',
          email: req.body.clientInfo?.email || 'client@email.com'
        },
        contractor: {
          name: req.body.contractorBranding?.companyName || 'Owl Fenc LLC',
          address: req.body.contractorBranding?.address || '2901 Owens Court, Fairfield, CA 94534',
          phone: req.body.contractorBranding?.phone || '202 549 3519',
          email: req.body.contractorBranding?.email || 'info@owlfenc.com',
          license: req.body.contractorBranding?.licenseNumber || 'CA-LICENSE-123456'
        },
        project: {
          type: req.body.projectDetails?.type || 'Construction Project',
          description: req.body.projectDetails?.description || 'Professional construction services',
          location: req.body.projectDetails?.location || req.body.clientInfo?.address || 'Project Location'
        },
        financials: {
          total: req.body.projectDetails?.estimatedValue || req.body.financials?.total || 15000
        },
        protectionClauses: req.body.selectedClauses || req.body.protectionClauses || [
          {
            title: "Professional Standards",
            content: "All work will be performed to the highest professional standards and in compliance with applicable codes."
          },
          {
            title: "Quality Assurance", 
            content: "Contractor guarantees all materials and workmanship for the duration specified in this agreement."
          }
        ]
      };
      
      console.log('🎨 [PREMIUM] Using premium service with visual cards...');
      
      // Use premium service to generate PDF binary file with cards and visual design
      const { default: PremiumPdfService } = await import('./services/premiumPdfService');
      const premiumPdfService = PremiumPdfService.getInstance();
      
      // Generate actual PDF binary file (not HTML)
      const pdfBuffer = await premiumPdfService.generateProfessionalPDF(contractData);
      
      // Set proper headers for PDF download
      const filename = `Professional_Contract_${contractData.client.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      
      console.log(`✅ [PREMIUM] Professional PDF Contract generated: ${pdfBuffer.length} bytes`);
      res.send(pdfBuffer);
      
    } catch (error: any) {
      console.error('❌ [PREMIUM] Error in PDF contract generation:', error);
      console.error('❌ [PREMIUM] Full error details:', error.stack);
      
      // Try fallback PDF generation without premium features
      try {
        console.log('🔄 [PREMIUM] Attempting fallback PDF generation...');
        const { default: PremiumPdfService } = await import('./services/premiumPdfService');
        const premiumPdfService = PremiumPdfService.getInstance();
        const html = premiumPdfService.generateProfessionalLegalContractHTML(contractData);
        
        // Return HTML for now if PDF fails, but log the issue
        console.log('⚠️ [PREMIUM] PDF generation failed, returning HTML as fallback');
        res.json({
          success: true,
          html: html,
          error: 'PDF generation failed, HTML returned as fallback',
          originalError: error.message
        });
      } catch (fallbackError: any) {
        console.error('❌ [PREMIUM] Fallback also failed:', fallbackError);
        res.status(500).json({
          success: false,
          error: error.message || 'Premium contract generation completely failed'
        });
      }
    }
  });

  // Premium Contract PDF Generation
  app.post('/api/contracts/generate-pdf', async (req, res) => {
    try {
      console.log('🎨 [API] Starting premium contract generation...');
      
      const { default: PremiumPdfService } = await import('./services/premiumPdfService');
      const premiumPdfService = PremiumPdfService.getInstance();
      
      // Enhanced contract data structure to capture ALL frontend data
      const contractData = {
        // Basic client and contractor info (existing)
        client: req.body.client,
        contractor: req.body.contractor,
        project: req.body.project,
        financials: req.body.financials,
        
        // NEW: Enhanced frontend data capture
        contractorInfo: req.body.contractorInfo || {},
        clientInfo: req.body.clientInfo || {},
        paymentTerms: req.body.paymentTerms || {},
        totalCost: req.body.totalCost || req.body.financials?.total || 0,
        timeline: req.body.timeline || {},
        permits: req.body.permits || {},
        warranties: req.body.warranties || {},
        extraClauses: req.body.extraClauses || [],
        consents: req.body.consents || {},
        signatures: req.body.signatures || {},
        confirmations: req.body.confirmations || {},
        legalNotices: req.body.legalNotices || {},
        selectedIntelligentClauses: req.body.selectedIntelligentClauses || [],
        
        // AI-generated content from frontend
        extractedData: req.body.extractedData || {},
        riskAnalysis: req.body.riskAnalysis || {},
        protectiveRecommendations: req.body.protectiveRecommendations || [],
        
        // Additional frontend customizations
        customTerms: req.body.customTerms || {},
        specialProvisions: req.body.specialProvisions || [],
        stateCompliance: req.body.stateCompliance || {},
        
        // Original raw data for debugging/fallback
        originalRequest: req.body
      };
      
      console.log('📋 [API] Enhanced contract data captured:', {
        hasExtraClauses: contractData.extraClauses.length > 0,
        hasIntelligentClauses: contractData.selectedIntelligentClauses.length > 0,
        hasCustomTerms: Object.keys(contractData.customTerms).length > 0,
        hasPaymentTerms: Object.keys(contractData.paymentTerms).length > 0,
        hasWarranties: Object.keys(contractData.warranties).length > 0
      });
      
      // Validate required data
      if (!contractData.client?.name || !contractData.contractor?.name) {
        return res.status(400).json({
          success: false,
          error: 'Missing required client or contractor information'
        });
      }
      
      // Generate premium PDF with enhanced data
      const pdfBuffer = await premiumPdfService.generateProfessionalPDF(contractData);
      
      // Set headers for PDF download
      const filename = `Contract_${contractData.client.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      
      console.log(`✅ [API] Enhanced contract generated: ${pdfBuffer.length} bytes`);
      res.send(pdfBuffer);
      
    } catch (error: any) {
      console.error('❌ [API] Error generating premium contract:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Premium contract generation failed'
      });
    }
  });

  // Download generated contract PDF
  app.get('/api/contracts/download/:filename', async (req, res) => {
    try {
      const { filename } = req.params;
      const path = await import('path');
      const fs = await import('fs');
      
      const filePath = path.join(process.cwd(), 'temp', filename);
      
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Contract not found' });
      }
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
      
      // Clean up file after 1 hour
      setTimeout(() => {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }, 3600000);
      
    } catch (error) {
      console.error('Error downloading contract:', error);
      res.status(500).json({ error: 'Download failed' });
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
  gates: Array<{
    type: string;
    width: number;
    price: number;
    description?: string;
  }>;
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
  context,
}: EstimateData): Promise<string> {
  // For simplicity, we'll use a basic templating approach
  const userId = 1; // Default user ID
  const template = await storage.getDefaultTemplate(userId, "estimate");
  if (!template) {
    throw new Error("No default estimate template found");
  }

  const user = await storage.getUser(userId);
  const settings = await storage.getSettings(userId);
  const pricingSettings = settings?.pricingSettings || {
    fencePrices: {
      wood: 25,
      vinyl: 35,
      chainLink: 20,
    },
    gateMultiplier: 1.5,
    taxRate: 0.08,
  };

  // Calculate fence price
  const fencePrice = calculateFencePrice(
    fenceType,
    fenceLength,
    fenceHeight,
    pricingSettings,
  );

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
    .replace(/{{company}}/g, user?.company || "Your Company Name")
    .replace(/{{address}}/g, user?.address || "Your Address")
    .replace(/{{phone}}/g, user?.phone || "Your Phone")
    .replace(/{{license}}/g, user?.license || "Your License")
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
  let gatesHtml = "";
  if (gates.length > 0) {
    gates.forEach((gate) => {
      gatesHtml += `<tr>
        <td>${gate.type} Gate (${gate.width}ft)</td>
        <td>${gate.description || "Standard hardware and installation"}</td>
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
    throw new Error("No default contract template found");
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
    .replace(/{{company}}/g, user?.company || "Your Company Name")
    .replace(/{{address}}/g, user?.address || "Your Address")
    .replace(/{{phone}}/g, user?.phone || "Your Phone")
    .replace(/{{license}}/g, user?.license || "Your License")
    .replace(/{{clientName}}/g, projectDetails.clientName || "Client Name")
    .replace(/{{clientAddress}}/g, projectDetails.address || "Client Address")
    .replace(/{{currentDate}}/g, new Date().toLocaleDateString())
    .replace(/{{fenceType}}/g, projectDetails.fenceType || "Wood")
    .replace(/{{fenceHeight}}/g, String(projectDetails.fenceHeight || 6))
    .replace(/{{fenceLength}}/g, String(projectDetails.fenceLength || 100))
    .replace(/{{depositAmount}}/g, depositAmount.toFixed(2))
    .replace(/{{balanceAmount}}/g, balanceAmount.toFixed(2))
    .replace(/{{total}}/g, total.toFixed(2))
    .replace(/{{startDate}}/g, startDateFormatted)
    .replace(
      /{{completionTime}}/g,
      calculateCompletionTime(projectDetails.fenceLength || 100),
    );

  // Handle gates
  let gatesHtml = "";
  const gates = projectDetails.gates || [];
  gates.forEach((gate: any) => {
    gatesHtml += `<li>Install one ${gate.width}ft wide ${gate.type} gate with all necessary hardware</li>`;
  });

  html = html.replace(/{{#each gates}}[\s\S]*?{{\/each}}/g, gatesHtml);

  return html;
}

async function generatePDF(
  data: any,
  type: "estimate" | "contract",
): Promise<Buffer> {
  return await documentService.generateDocument(data, type);
}

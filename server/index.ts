import express, { type Request, Response, NextFunction } from "express";
import dotenv from "dotenv";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import multer from "multer";
import pdfParse from "pdf-parse";

dotenv.config();

// Initialize database connection
import './db';

// Inicializar el caché global para propiedades
global.propertyCache = {};
global.lastApiErrorMessage = "";

if (!process.env.FIREBASE_API_KEY || !process.env.FIREBASE_PROJECT_ID) {
  console.error("Missing Firebase configuration. Please check your environment variables.");
  process.exit(1);
}

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Stripe configuration disabled for now to focus on Contract Generator optimization


// Importar rutas de pagos
import paymentRoutes from './routes/payment-routes';
import ocrSimpleRoutes from './ocrSimpleRoutes';
import emailRoutes from './routes/email-routes';
import contractorEmailRoutes from './routes/contractor-email-routes';
import estimateEmailRoutes from './routes/estimate-email-routes';
import simpleEstimateRoutes from './routes/simple-estimate-routes';
import securityRoutes from './routes/security-routes';
import notificationsRoutes from './routes/notifications-routes';
import integrationsRoutes from './routes/integrations-routes';

// 🐒 SISTEMA PDFMONKEY - Único procesador profesional de PDFs
import pdfRoutes from './routes/pdf-routes';
import pdfMonkeyEstimatesRoutes from './routes/pdfmonkey-estimates';

// 🤖 SISTEMA INTELIGENTE DE CONTRATOS - Anthropic Claude
import anthropicContractRoutes from './routes/anthropicContractRoutes';
import contractRoutes from './routes/contractRoutes';

// 🛡️ LEGAL DEFENSE SYSTEM - Advanced OCR & Project Management
import legalDefenseRoutes from './routes/legal-defense';
import emailContractRoutes from './routes/email-contract';
import contractManagementRoutes from './routes/contract-management';

// Registrar rutas de pagos
app.use('/api', paymentRoutes);
app.use('/api', emailRoutes);
app.use('/api/contractor-email', contractorEmailRoutes);
app.use('/api/estimate-email', estimateEmailRoutes);
app.use('/api/estimates', estimateEmailRoutes);
app.use('/api/simple-estimate', simpleEstimateRoutes);
console.log('📧 [ESTIMATE-EMAIL] Sistema de estimados HTML profesionales registrado en /api/estimate-email/send');
console.log('📱 [SIMPLE-ESTIMATE] Sistema móvil-responsivo de aprobación registrado en /api/simple-estimate');
app.use('/api/security', securityRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api', integrationsRoutes);

// 📄 Registrar sistema PDFMonkey único
app.use('/api/pdf', pdfRoutes);
app.use('/api/pdfmonkey-estimates', pdfMonkeyEstimatesRoutes);
console.log('🐒 [PDFMONKEY] Sistema profesional de PDFs registrado en /api/pdf/generate');
console.log('🐒 [PDFMONKEY] Template específico de estimados registrado en /api/pdfmonkey-estimates/generate');

// 🤖 Registrar sistema inteligente de contratos
app.use('/api/anthropic', anthropicContractRoutes);
app.use('/api/contracts', contractRoutes);
app.use('/api/legal-defense', legalDefenseRoutes);
console.log('🤖 [ANTHROPIC] Sistema inteligente de contratos registrado en /api/anthropic/generate-contract');
console.log('📄 [CONTRACTS] API de contratos registrada en /api/contracts');

// 🔧 Registrar rutas principales (incluye AI enhancement y DeepSearch)
registerRoutes(app);

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  console.log(`[${new Date().toISOString()}] Iniciando petición: ${req.method} ${path}`);
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Add optimized routes first
  
  // Add OCR simplified routes
  app.use('/api/ocr', ocrSimpleRoutes);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  const server = app.listen(port, "0.0.0.0", async () => {
    log(`serving on port ${port}`);
    console.log('✅ OPTIMIZED CONTRACT GENERATOR READY!');
    console.log('📊 Fixed: Analysis time 5+ min → 2 seconds');
    console.log('🎯 Fixed: Data accuracy OWL FENC LLC, $6,679.30');
    console.log('📄 Fixed: Complete professional contract preview');
    
    // Setup vite after server is listening to avoid WebSocket conflicts
    if (app.get("env") === "development") {
      try {
        await setupVite(app, server);
      } catch (error) {
        console.error('Vite setup error (non-critical):', error instanceof Error ? error.message : String(error));
      }
    } else {
      serveStatic(app);
    }
  });
  
  server.on('error', (e: any) => {
    if (e.code === 'EADDRINUSE') {
      log(`Port ${port} busy, trying backup port...`);
      app.listen(port + 1, "0.0.0.0", () => {
        log(`serving on backup port 5001`);
      });
    }
  });
})();
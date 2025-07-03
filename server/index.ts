import express, { type Request, Response, NextFunction } from "express";
import dotenv from "dotenv";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import multer from "multer";
import pdfParse from "pdf-parse";
import centralizedEmailRoutes from "./routes/centralized-email-routes-fix";
import { setupProductionRoutes, setupProductionErrorHandlers } from "./production-setup";

dotenv.config();

// Initialize database connection
import './db';

// Inicializar el caché global para propiedades
global.propertyCache = {};
global.lastApiErrorMessage = "";

// Log startup information
console.log('🚀 Starting server...');
console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`🔌 Port: ${process.env.PORT || 5000}`);

// En producción, no salir si faltan variables de Firebase, solo advertir
if (!process.env.FIREBASE_API_KEY || !process.env.FIREBASE_PROJECT_ID) {
  console.warn("⚠️  Missing Firebase configuration. Please check your environment variables.");
  if (process.env.NODE_ENV === 'production') {
    console.warn("⚠️  Running in production mode without Firebase config - some features may not work");
  } else {
    process.exit(1);
  }
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

// PDF generation now handled exclusively by premiumPdfService
// REMOVED: PDFMonkey estimates routes - using only Puppeteer PDF service

// 🤖 SISTEMA INTELIGENTE DE CONTRATOS - Anthropic Claude
import anthropicContractRoutes from './routes/anthropicContractRoutes';
import contractRoutes from './routes/contractRoutes';

// 🛡️ LEGAL DEFENSE SYSTEM - Advanced OCR & Project Management
import legalDefenseRoutes from './routes/legal-defense';
import legalDefenseUnifiedRoutes from './routes/legal-defense-unified';
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

// REMOVED: All PDFMonkey routes - using only Puppeteer PDF service

// 🤖 Registrar sistema inteligente de contratos
app.use('/api/anthropic', anthropicContractRoutes);
app.use('/api/legal-defense', legalDefenseUnifiedRoutes); // Use unified routes
app.use('/api/legal-defense-legacy', legalDefenseRoutes); // Keep legacy for compatibility
console.log('🛡️ [LEGAL-DEFENSE] Sistema unificado de contratos registrado en /api/legal-defense/generate-contract');
console.log('🤖 [ANTHROPIC] Sistema inteligente de contratos registrado en /api/anthropic/generate-contract');

// Add logging middleware first
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

// 🔧 Registrar TODAS las rutas de API ANTES de iniciar el servidor
// Add health check routes
import healthRoutes from './routes/health';
app.use('/api', healthRoutes);

// Add OCR simplified routes
app.use('/api/ocr', ocrSimpleRoutes);

// Add email contract routes
app.use('/api/email', emailContractRoutes);

// 🔧 Registrar rutas principales (incluye AI enhancement y DeepSearch)
registerRoutes(app);

// 🔧 Registrar rutas centralizadas DESPUÉS del middleware de body-parser
app.use("/api/centralized-email", centralizedEmailRoutes);
console.log('📧 [CENTRALIZED-EMAIL] Rutas registradas en /api/centralized-email');

(async () => {

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    
    console.error('Error handler:', err);
    res.status(status).json({ message });
    // No lanzar el error en producción
    if (process.env.NODE_ENV !== 'production') {
      throw err;
    }
  });

  // Setup server based on environment
  try {
    const port = parseInt(process.env.PORT || '5000', 10);
    const server = await new Promise<any>((resolve) => {
      const httpServer = app.listen(port, "0.0.0.0", () => {
        log(`Server started on port ${port}`);
        resolve(httpServer);
      });
    });
    
    // Only setup Vite in development mode
    if (process.env.NODE_ENV !== 'production') {
      await setupVite(app, server);
      console.log('📄 Frontend served via Vite development server');
    } else {
      // In production, use custom production setup
      setupProductionRoutes(app);
      setupProductionErrorHandlers();
      console.log('📄 Frontend served from production build');
    }
    
    console.log('✅ OPTIMIZED CONTRACT GENERATOR READY!');
    console.log('📊 Puppeteer PDF Service: Local generation without external dependencies');
    console.log('🎯 Professional template with modern design and print optimization');
    
  } catch (error) {
    console.error('Server setup error:', error instanceof Error ? error.message : String(error));
    // Fallback: start basic server without Vite
    const server = app.listen(5001, "0.0.0.0", () => {
      log('Fallback server started on port 5001');
    });
  }
  

})();
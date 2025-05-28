import express, { type Request, Response, NextFunction } from "express";
import dotenv from "dotenv";
import cleanRoutes from "./routes-clean";
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

// Sincronizar planes con Stripe en segundo plano
(async () => {
  try {
    await stripeService.verifyStripeConnection();
    stripeService.syncPlansWithStripe().catch(console.error);
  } catch (error) {
    console.error('Error conectando con Stripe:', error);
  }
})();


// Importar rutas de pagos
import paymentRoutes from './routes/payment-routes';

// 🐒 SISTEMA PDFMONKEY - Único procesador profesional de PDFs
import pdfRoutes from './routes/pdf-routes';
import pdfMonkeyEstimatesRoutes from './routes/pdfmonkey-estimates';

// 🤖 SISTEMA INTELIGENTE DE CONTRATOS - Anthropic Claude
import anthropicContractRoutes from './routes/anthropicContractRoutes';
import contractRoutes from './routes/contractRoutes';

// Registrar rutas de pagos
app.use('/api', paymentRoutes);

// 📄 Registrar sistema PDFMonkey único
app.use('/api/pdf', pdfRoutes);
app.use('/api/pdfmonkey-estimates', pdfMonkeyEstimatesRoutes);
console.log('🐒 [PDFMONKEY] Sistema profesional de PDFs registrado en /api/pdf/generate');
console.log('🐒 [PDFMONKEY] Template específico de estimados registrado en /api/pdfmonkey-estimates/generate');

// 🤖 Registrar sistema inteligente de contratos
app.use('/api/anthropic', anthropicContractRoutes);
app.use('/api/contracts', contractRoutes);
console.log('🤖 [ANTHROPIC] Sistema inteligente de contratos registrado en /api/anthropic/generate-contract');
console.log('📄 [CONTRACTS] API de contratos registrada en /api/contracts');

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
  app.use(cleanRoutes);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  }).on('error', (e: any) => {
    if (e.code === 'EADDRINUSE') {
      log(`Port ${port} busy, trying backup port...`);
      server.listen({
        port: 5001,
        host: "0.0.0.0",
        reusePort: true,
      }, () => {
        log(`serving on backup port 5001`);
      });
    }
  });
})();
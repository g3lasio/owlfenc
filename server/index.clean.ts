// Voy a crear una versión limpia del servidor sin fragmentos problemáticos
// Esta es una versión temporal para reconstruir el archivo

import express from 'express';
import { setupGlobalErrorHandlers } from './lib/error-handlers';
import setupVite from './vite';
import dotenv from 'dotenv';

// Cargar variables de entorno primero
dotenv.config();

// Importar todas las rutas necesarias (sin los fragmentos problemáticos)
import contractorEmailRoutes from './routes/contractorEmail';
import estimateEmailRoutes from './routes/estimateEmail';
import simpleEstimateRoutes from './routes/simpleEstimate';
import securityRoutes from './routes/security';
import notificationsRoutes from './routes/notifications';
import integrationsRoutes from './routes/integrations';
import anthropicContractRoutes from './routes/anthropicContract';
import legalDefenseUnifiedRoutes from './routes/legalDefenseUnified';
import legalDefenseRoutes from './routes/legalDefense';
import dualSignatureRoutes from './routes/dualSignatureRoutes';
import passwordResetRoutes from './routes/passwordReset';
import memoryRoutes from './routes/memory';
import paymentRoutes from './routes/payments';
import emailRoutes from './routes/email';

const app = express();

// Middleware básico
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Configuración de headers CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Setup global error handlers
setupGlobalErrorHandlers();

// Registrar todas las rutas API
app.use('/api', paymentRoutes);
app.use('/api', emailRoutes);
app.use('/api/contractor-email', contractorEmailRoutes);
app.use('/api/estimate-email', estimateEmailRoutes);
app.use('/api/estimates', estimateEmailRoutes);
app.use('/api/simple-estimate', simpleEstimateRoutes);
app.use('/api/security', securityRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api', integrationsRoutes);
app.use('/api/anthropic', anthropicContractRoutes);
app.use('/api/legal-defense', legalDefenseUnifiedRoutes);
app.use('/api/legal-defense-legacy', legalDefenseRoutes);
app.use('/api/dual-signature', dualSignatureRoutes);
app.use('/api/password-reset', passwordResetRoutes);
app.use('/api/memory', memoryRoutes);

console.log('🛡️ [LEGAL-DEFENSE] Sistema unificado de contratos registrado');
console.log('🖊️ [DUAL-SIGNATURE] Sistema de firma dual registrado');
console.log('🔐 [PASSWORD-RESET] Sistema de restablecimiento registrado');
console.log('🧠 [MEMORY-SYSTEM] Sistema de memoria y aprendizaje registrado');

// 🖊️ Firma digital manejada por React frontend - rutas /sign/* van al cliente React
// ELIMINADO: Interceptación del servidor - ahora React maneja las rutas de firma directamente

// Add logging middleware only for API routes
app.use('/api', (req, res, next) => {
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
    let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
    if (capturedJsonResponse) {
      logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
    }

    if (logLine.length > 80) {
      logLine = logLine.slice(0, 79) + "…";
    }

    console.log(logLine);
  });

  next();
});

// Add health check routes
import healthRoutes from './routes/health';
app.use('/api', healthRoutes);

app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

app.get('/status', (req, res) => {
  res.status(200).json({ status: 'healthy', uptime: process.uptime() });
});

// Setup Vite (debe ir AL FINAL)
setupVite(app);

export default app;
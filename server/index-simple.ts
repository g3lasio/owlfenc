import express from "express";
import dotenv from "dotenv";
import { setupVite, serveStatic, log } from "./vite";
import simpleEstimateRoutes from './routes/simple-estimate-routes';

dotenv.config();

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Registrar sistema móvil-responsivo de aprobación
app.use('/api/simple-estimate', simpleEstimateRoutes);
console.log('📱 [SIMPLE-ESTIMATE] Sistema móvil-responsivo de aprobación registrado en /api/simple-estimate');

// Ruta de prueba
app.get('/test-estimate', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Test - Sistema de Estimados</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; background: #f8fafc; }
        .container { background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-width: 600px; margin: 0 auto; }
        .btn { background: #10b981; color: white; padding: 12px 24px; border: none; border-radius: 6px; font-size: 16px; cursor: pointer; margin: 10px; text-decoration: none; display: inline-block; }
        .btn:hover { background: #059669; }
        .test-links { margin-top: 30px; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Sistema de Estimados - Prueba</h1>
        <p>Sistema móvil-responsivo para aprobación y ajustes de estimados.</p>
        
        <div class="test-links">
          <h3>Enlaces de Prueba:</h3>
          <a href="/api/simple-estimate/approve?estimateId=EST-TEST-001&clientEmail=cliente@ejemplo.com" class="btn">
            ✅ Probar Aprobación
          </a>
          <a href="/api/simple-estimate/adjust?estimateId=EST-TEST-001&clientEmail=cliente@ejemplo.com" class="btn">
            📝 Probar Ajustes
          </a>
        </div>
        
        <div style="margin-top: 30px; padding: 20px; background: #f3f4f6; border-radius: 8px;">
          <h3>Funcionalidades:</h3>
          <ul>
            <li>✅ Aprobación móvil-responsiva de estimados</li>
            <li>📝 Solicitud de ajustes con comentarios</li>
            <li>🔔 Notificaciones en tiempo real para contratistas</li>
            <li>📱 Diseño optimizado para dispositivos móviles</li>
            <li>💾 Seguimiento in-memory de estados</li>
          </ul>
        </div>
      </div>
    </body>
    </html>
  `);
});

// Crear datos de prueba
app.post('/api/create-test-estimate', (req, res) => {
  try {
    const { simpleTracker } = require('./services/SimpleEstimateTracker');
    
    const testEstimate = {
      estimateNumber: 'EST-TEST-001',
      client: {
        name: 'Juan Pérez',
        email: 'cliente@ejemplo.com'
      },
      contractor: {
        email: 'contratista@ejemplo.com'
      },
      total: '5,500.00',
      items: [
        { description: 'Material de construcción', quantity: 1, price: 3000 },
        { description: 'Mano de obra', quantity: 1, price: 2500 }
      ]
    };

    const saved = simpleTracker.saveEstimate(testEstimate);
    
    res.json({
      success: true,
      message: 'Estimado de prueba creado',
      estimate: saved
    });
  } catch (error) {
    console.error('Error creando estimado de prueba:', error);
    res.status(500).json({
      success: false,
      message: 'Error creando estimado de prueba'
    });
  }
});

const errorHandler = (err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Error interno del servidor:", err);
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Error interno del servidor";
  res.status(status).json({ message });
};

app.use(errorHandler);

// Configurar Vite para desarrollo
(async () => {
  const server = await setupVite(app, process.env.NODE_ENV === "production");
  app.use(serveStatic());

  const PORT = parseInt(process.env.PORT || "5000", 10);
  server.listen(PORT, "0.0.0.0", () => {
    log(`Servidor ejecutándose en http://localhost:${PORT}/`);
    console.log('📱 [SIMPLE-ESTIMATE] Sistema móvil-responsivo activo');
    console.log('🧪 [TEST] Página de prueba disponible en /test-estimate');
  });
})();
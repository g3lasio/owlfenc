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

// CRITICAL: Configure JSON middleware FIRST - required for all API routes
// Increased limits to handle large contract data and PDFs
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true, parameterLimit: 50000 }));



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

// 🖊️ DUAL SIGNATURE SYSTEM - Contract Signing Workflow
import dualSignatureRoutes from './routes/dualSignatureRoutes';

// Company Information API endpoints (Firebase)
app.get('/api/company-information/:userId', async (req, res) => {
  console.log('📋 Getting company information for user:', req.params.userId);
  
  try {
    const { userId } = req.params;
    
    // Import Firebase admin with proper initialization
    const { initializeApp, getApps } = await import('firebase-admin/app');
    const { getFirestore } = await import('firebase-admin/firestore');
    
    // Initialize Firebase Admin if not already initialized
    if (getApps().length === 0) {
      initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID || "owlfence-f4570",
      });
    }
    
    const db = getFirestore();
    
    // Get company information from Firebase
    const companyDoc = await db.collection('users').doc(userId).collection('companyInfo').doc('info').get();
    
    if (!companyDoc.exists) {
      return res.status(404).json({ error: 'Company information not found' });
    }
    
    res.json(companyDoc.data());
  } catch (error) {
    console.error('❌ Error getting company information:', error);
    res.status(500).json({ error: 'Failed to get company information' });
  }
});

app.post('/api/company-information', async (req, res) => {
  console.log('💾 Saving company information...');
  
  try {
    const companyData = req.body;
    const userId = companyData.userId;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    // Import Firebase admin with proper initialization
    const { initializeApp, getApps } = await import('firebase-admin/app');
    const { getFirestore } = await import('firebase-admin/firestore');
    
    // Initialize Firebase Admin if not already initialized
    if (getApps().length === 0) {
      initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID || "owlfence-f4570",
      });
    }
    
    const db = getFirestore();
    
    // Save company information to Firebase
    const companyInfoData = {
      ...companyData,
      updatedAt: new Date().toISOString()
    };
    
    await db.collection('users').doc(userId).collection('companyInfo').doc('info').set(companyInfoData, { merge: true });
    
    console.log('✅ Company information saved successfully');
    res.json({ success: true, data: companyInfoData });
  } catch (error) {
    console.error('❌ Error saving company information:', error);
    res.status(500).json({ error: 'Failed to save company information' });
  }
});

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

// 🖊️ Registrar sistema de firma dual
app.use('/api/dual-signature', dualSignatureRoutes);
console.log('🖊️ [DUAL-SIGNATURE] Sistema de firma dual registrado en /api/dual-signature');

// 🖊️ Ruta para páginas de firma - DEBE IR ANTES de setupVite
app.get('/sign/:contractId/:party', async (req, res) => {
  try {
    const { contractId, party } = req.params;
    
    console.log(`🔍 [SIGN-PAGE] Serving signature page for ${party}: ${contractId}`);
    
    // Validar party
    if (!['contractor', 'client'].includes(party)) {
      return res.status(400).send('Invalid party parameter');
    }
    
    // Verificar que el contrato existe
    const response = await fetch(`http://localhost:${process.env.PORT || 5000}/api/dual-signature/contract/${contractId}/${party}`);
    
    if (!response.ok) {
      console.log(`❌ [SIGN-PAGE] Contract not found: ${contractId}`);
      return res.status(404).send(`
        <html>
          <head><title>Contract Not Found</title></head>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h1>Contract Not Found</h1>
            <p>The contract you're looking for doesn't exist or has expired.</p>
            <p>Contract ID: ${contractId}</p>
          </body>
        </html>
      `);
    }
    
    // Get contract data to display directly
    const contractData = await response.json();
    
    if (!contractData.success) {
      return res.status(404).send(`
        <html>
          <head><title>Contract Not Found</title></head>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h1>Contract Not Found</h1>
            <p>The contract you're looking for doesn't exist or has expired.</p>
            <p>Contract ID: ${contractId}</p>
          </body>
        </html>
      `);
    }

    const contract = contractData.contract;
    const partyName = party === 'contractor' ? 'Contractor' : 'Client';
    const partyColor = party === 'contractor' ? '#3b82f6' : '#10b981';

    // Generate professional contract HTML using the same service as PDF generation
    let professionalContractHTML = '';
    try {
      const { default: PremiumPdfService } = await import('./services/premiumPdfService');
      const premiumPdfService = PremiumPdfService.getInstance();
      
      // Use the same data structure as PDF generation
      const contractPdfData = {
        client: {
          name: contract.clientName,
          address: contract.clientAddress || 'Address not provided',
          phone: contract.clientPhone || 'Phone not provided',
          email: contract.clientEmail
        },
        contractor: {
          name: contract.contractorName,
          address: contract.contractorAddress || 'Address not provided', 
          phone: contract.contractorPhone || 'Phone not provided',
          email: contract.contractorEmail
        },
        project: {
          type: contract.projectType || 'construction',
          description: contract.projectDescription,
          location: contract.clientAddress || 'Property address'
        },
        financials: {
          total: parseFloat(contract.totalAmount) || 0
        },
        protectionClauses: contract.protectionClauses || [],
        timeline: contract.timeline || {},
        warranties: contract.warranties || {},
        permitInfo: contract.permitInfo || {}
      };
      
      // Generate the exact same professional HTML as the PDF
      professionalContractHTML = premiumPdfService.generateProfessionalLegalContractHTML(contractPdfData);
    } catch (error) {
      console.error('❌ [SIGN-PAGE] Error generating professional contract HTML:', error);
      professionalContractHTML = '<p>Error loading contract content. Please try again.</p>';
    }

    // Create complete standalone signature page with contract content
    const html = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Contract Signature - ${partyName}</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
              background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
              color: #f8fafc;
              line-height: 1.6;
              padding: 20px;
            }
            .container { 
              max-width: 800px; 
              margin: 0 auto; 
              background: #1e293b;
              border-radius: 12px;
              box-shadow: 0 10px 25px rgba(0,0,0,0.3);
              overflow: hidden;
            }
            .header { 
              background: ${partyColor}; 
              color: white; 
              padding: 20px; 
              text-align: center; 
            }
            .header h1 { font-size: 24px; margin-bottom: 5px; }
            .header .party { font-size: 18px; opacity: 0.9; }
            .content { padding: 30px; }
            .section { margin-bottom: 30px; }
            .section h2 { 
              color: ${partyColor}; 
              margin-bottom: 15px; 
              font-size: 20px;
              border-bottom: 2px solid ${partyColor};
              padding-bottom: 5px;
            }
            .contract-info { 
              display: grid; 
              grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); 
              gap: 20px; 
              margin-bottom: 30px; 
            }
            .info-card { 
              background: #334155; 
              padding: 15px; 
              border-radius: 8px; 
              border-left: 4px solid ${partyColor};
            }
            .info-card .label { 
              font-weight: bold; 
              color: ${partyColor}; 
              margin-bottom: 5px; 
            }
            .professional-contract-display { 
              background: white !important; 
              color: #1e293b !important; 
              border-radius: 8px; 
              margin: 20px 0; 
              border: 2px solid #e2e8f0;
              /* Remove height limitation to show full content */
            }
            .professional-contract-display * {
              background: white !important;
              color: #000 !important;
            }
            .professional-contract-display .party-box {
              background: white !important;
              color: #000 !important;
              border: 2px solid #000 !important;
            }
            .professional-contract-display .container {
              padding: 20px;
              background: white !important;
            }
            .professional-contract-display .page-break {
              border-top: 2px dashed #e2e8f0;
              margin: 30px 0;
              padding-top: 30px;
            }
            .professional-contract-display .section-title {
              color: #000 !important;
              font-weight: bold !important;
            }
            .professional-contract-display .legal-text {
              color: #000 !important;
            }
            .signature-section { 
              background: #334155; 
              padding: 25px; 
              border-radius: 8px; 
              margin-top: 20px; 
            }
            .checkbox-container { 
              display: flex; 
              align-items: flex-start; 
              gap: 10px; 
              margin: 20px 0; 
            }
            .checkbox-container input[type="checkbox"] { 
              width: 18px; 
              height: 18px; 
              margin-top: 2px;
            }
            .form-group { margin: 15px 0; }
            .form-group label { 
              display: block; 
              margin-bottom: 5px; 
              font-weight: bold; 
              color: ${partyColor}; 
            }
            .form-group input, .form-group textarea { 
              width: 100%; 
              padding: 10px; 
              border: 2px solid #475569; 
              border-radius: 6px; 
              background: #1e293b; 
              color: white; 
              font-size: 16px;
            }
            .form-group input:focus, .form-group textarea:focus { 
              outline: none; 
              border-color: ${partyColor}; 
            }
            .signature-type { 
              display: flex; 
              gap: 10px; 
              margin: 15px 0; 
            }
            .signature-type button { 
              padding: 10px 20px; 
              border: 2px solid #475569; 
              background: #1e293b; 
              color: white; 
              border-radius: 6px; 
              cursor: pointer; 
              transition: all 0.3s;
            }
            .signature-type button.active { 
              background: ${partyColor}; 
              border-color: ${partyColor}; 
            }
            .signature-canvas { 
              border: 2px dashed #475569; 
              border-radius: 6px; 
              background: white; 
              cursor: crosshair; 
              display: block; 
              margin: 10px 0; 
            }
            .signature-cursive { 
              background: white; 
              color: #1e293b; 
              border: 2px dashed #475569; 
              border-radius: 6px; 
              padding: 20px; 
              text-align: center; 
              font-family: 'Brush Script MT', cursive; 
              font-size: 24px; 
              min-height: 80px; 
              display: flex; 
              align-items: center; 
              justify-content: center;
            }
            .button { 
              background: ${partyColor}; 
              color: white; 
              border: none; 
              padding: 12px 24px; 
              border-radius: 6px; 
              cursor: pointer; 
              font-size: 16px; 
              font-weight: bold; 
              transition: all 0.3s;
              margin: 5px;
            }
            .button:hover { 
              opacity: 0.9; 
              transform: translateY(-1px); 
            }
            .button:disabled { 
              opacity: 0.5; 
              cursor: not-allowed; 
            }
            .button.secondary { 
              background: #475569; 
            }
            .status { 
              text-align: center; 
              padding: 20px; 
              border-radius: 8px; 
              margin: 20px 0; 
            }
            .status.success { 
              background: #065f46; 
              color: #d1fae5; 
            }
            .hidden { display: none; }
            @media (max-width: 600px) {
              .container { margin: 10px; }
              .content { padding: 20px; }
              .contract-info { grid-template-columns: 1fr; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Contract Signature</h1>
              <div class="party">${partyName} Review & Signature</div>
              <div style="font-size: 14px; opacity: 0.8; margin-top: 5px;">Contract ID: ${contractId}</div>
            </div>

            <div class="content">
              <!-- Professional Contract Content -->
              <div class="section">
                <div class="professional-contract-display">
                  ${professionalContractHTML}
                </div>
              </div>

              <!-- Signature Section -->
              <div class="signature-section">
                <h2 style="color: white; border-bottom: 2px solid white; margin-bottom: 20px;">Electronic Signature</h2>
                
                <!-- Confirmation Checkbox -->
                <div class="checkbox-container">
                  <input type="checkbox" id="confirmRead" />
                  <label for="confirmRead" style="color: white; font-weight: normal;">
                    I have carefully read and reviewed the entire contract above. I understand all terms and conditions 
                    and agree to be legally bound by this agreement.
                  </label>
                </div>

                <!-- Name Input -->
                <div class="form-group">
                  <input type="text" id="fullName" value="${party === 'contractor' ? contract.contractorName : contract.clientName}" />
                </div>

                <!-- Signature Type -->
                <div class="form-group">
                  <div class="signature-type">
                    <button type="button" id="cursiveBtn" class="active">Type Name</button>
                    <button type="button" id="drawBtn">Draw Signature</button>
                  </div>
                </div>

                <!-- Cursive Signature -->
                <div id="cursiveSignature" class="signature-cursive">
                  Your name will appear here
                </div>

                <!-- Canvas Signature -->
                <canvas id="signatureCanvas" class="signature-canvas hidden" width="400" height="150"></canvas>

                <!-- Action Buttons -->
                <div style="text-align: center; margin-top: 25px;">
                  <button type="button" id="clearBtn" class="button secondary">Clear Signature</button>
                  <button type="button" id="submitBtn" class="button">Submit Signature</button>
                </div>

                <!-- Status Message -->
                <div id="statusMessage" class="hidden"></div>
              </div>
            </div>
          </div>

          <script>
            let signatureType = 'cursive';
            let isDrawing = false;
            let canvas = document.getElementById('signatureCanvas');
            let ctx = canvas ? canvas.getContext('2d') : null;

            // Initialize canvas
            if (ctx) {
              ctx.strokeStyle = '#1e40af';
              ctx.lineWidth = 2;
              ctx.lineCap = 'round';
              ctx.lineJoin = 'round';
            }

            // Elements
            const confirmCheckbox = document.getElementById('confirmRead');
            const fullNameInput = document.getElementById('fullName');
            const cursiveBtn = document.getElementById('cursiveBtn');
            const drawBtn = document.getElementById('drawBtn');
            const cursiveDiv = document.getElementById('cursiveSignature');
            const submitBtn = document.getElementById('submitBtn');
            const clearBtn = document.getElementById('clearBtn');
            const statusDiv = document.getElementById('statusMessage');

            // Update cursive signature display
            function updateCursiveSignature() {
              const name = fullNameInput.value || 'Your name will appear here';
              cursiveDiv.textContent = name;
            }

            // Signature type switching
            cursiveBtn.addEventListener('click', () => {
              signatureType = 'cursive';
              cursiveBtn.classList.add('active');
              drawBtn.classList.remove('active');
              cursiveDiv.classList.remove('hidden');
              canvas.classList.add('hidden');
              updateCursiveSignature();
            });

            drawBtn.addEventListener('click', () => {
              signatureType = 'drawing';
              drawBtn.classList.add('active');
              cursiveBtn.classList.remove('active');
              cursiveDiv.classList.add('hidden');
              canvas.classList.remove('hidden');
            });

            // Name input handler
            fullNameInput.addEventListener('input', updateCursiveSignature);

            // Canvas drawing
            function getMousePos(e) {
              const rect = canvas.getBoundingClientRect();
              const scaleX = canvas.width / rect.width;
              const scaleY = canvas.height / rect.height;
              return {
                x: (e.clientX - rect.left) * scaleX,
                y: (e.clientY - rect.top) * scaleY
              };
            }

            function getTouchPos(e) {
              const rect = canvas.getBoundingClientRect();
              const scaleX = canvas.width / rect.width;
              const scaleY = canvas.height / rect.height;
              return {
                x: (e.touches[0].clientX - rect.left) * scaleX,
                y: (e.touches[0].clientY - rect.top) * scaleY
              };
            }

            // Mouse events
            canvas.addEventListener('mousedown', (e) => {
              isDrawing = true;
              const pos = getMousePos(e);
              ctx.beginPath();
              ctx.moveTo(pos.x, pos.y);
            });

            canvas.addEventListener('mousemove', (e) => {
              if (!isDrawing) return;
              const pos = getMousePos(e);
              ctx.lineTo(pos.x, pos.y);
              ctx.stroke();
            });

            canvas.addEventListener('mouseup', () => {
              isDrawing = false;
            });

            // Touch events
            canvas.addEventListener('touchstart', (e) => {
              e.preventDefault();
              isDrawing = true;
              const pos = getTouchPos(e);
              ctx.beginPath();
              ctx.moveTo(pos.x, pos.y);
            });

            canvas.addEventListener('touchmove', (e) => {
              e.preventDefault();
              if (!isDrawing) return;
              const pos = getTouchPos(e);
              ctx.lineTo(pos.x, pos.y);
              ctx.stroke();
            });

            canvas.addEventListener('touchend', (e) => {
              e.preventDefault();
              isDrawing = false;
            });

            // Clear signature
            clearBtn.addEventListener('click', () => {
              if (signatureType === 'drawing') {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
              } else {
                fullNameInput.value = '${party === 'contractor' ? contract.contractorName : contract.clientName}';
                updateCursiveSignature();
              }
            });

            // Submit signature
            submitBtn.addEventListener('click', async () => {
              if (!confirmCheckbox.checked) {
                alert('Please confirm that you have read the contract before signing.');
                return;
              }

              const name = fullNameInput.value.trim();
              if (!name) {
                alert('Please enter your full name.');
                return;
              }

              let signatureData = '';
              if (signatureType === 'drawing') {
                signatureData = canvas.toDataURL();
                if (!signatureData || signatureData === 'data:,') {
                  alert('Please draw your signature.');
                  return;
                }
              } else {
                signatureData = name;
              }

              submitBtn.disabled = true;
              submitBtn.textContent = 'Submitting...';

              try {
                const response = await fetch('/api/dual-signature/sign', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    contractId: '${contractId}',
                    party: '${party}',
                    signatureData,
                    signatureType,
                    fullName: name
                  })
                });

                const result = await response.json();

                if (result.success) {
                  statusDiv.className = 'status success';
                  statusDiv.innerHTML = \`
                    <h3>✅ Signature Submitted Successfully</h3>
                    <p>\${result.message}</p>
                    \${result.bothSigned ? '<p><strong>Both parties have signed! Final PDF will be sent shortly.</strong></p>' : '<p>Waiting for the other party to sign.</p>'}
                  \`;
                  statusDiv.classList.remove('hidden');
                  
                  // Hide form elements
                  document.querySelector('.signature-section').style.display = 'none';
                } else {
                  alert('Error: ' + result.message);
                }
              } catch (error) {
                alert('Network error. Please try again.');
                console.error('Signature submission error:', error);
              } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Submit Signature';
              }
            });

            // Initialize
            updateCursiveSignature();
          </script>
        </body>
      </html>
    `;
    
    res.send(html);
    
  } catch (error) {
    console.error('❌ [SIGN-PAGE] Error serving signature page:', error);
    res.status(500).send('Internal server error');
  }
});

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

    log(logLine);
  });

  next();
});

// 🔧 Registrar TODAS las rutas de API ANTES de iniciar el servidor
// Simple Signature routes already registered at the very top - remove duplicate

// Add health check routes at root level for deployment health checks
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

// 📱 Registrar rutas de SMS
import smsRoutes from './routes/sms';

app.use("/api/sms", smsRoutes);
console.log('📱 [SMS] Rutas registradas en /api/sms');





// Simple signature routes already registered early - remove duplicate registration

// Health check moved to /health to avoid interfering with frontend
// Root endpoint will be handled by Vite/static files

(async () => {

  // Setup server based on environment
  try {
    const port = parseInt(process.env.PORT || '5000', 10);
    
    // Create server with timeout configuration for deployment health checks
    const server = await new Promise<any>((resolve, reject) => {
      const httpServer = app.listen(port, "0.0.0.0", () => {
        log(`Server started on port ${port}`);
        console.log(`✅ Frontend available at: http://localhost:${port}/`);
        console.log(`✅ API health check at: http://localhost:${port}/api/health`);
        resolve(httpServer);
      });
      
      // Set server timeout for better deployment compatibility
      httpServer.timeout = 30000; // 30 seconds
      httpServer.keepAliveTimeout = 65000; // 65 seconds
      httpServer.headersTimeout = 66000; // 66 seconds
      
      httpServer.on('error', (error) => {
        console.error('Server startup error:', error);
        reject(error);
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
    
    console.log('✅ OWL FENCE AI PLATFORM READY FOR DEPLOYMENT!');
    console.log('📊 Multi-tenant contractor management system active');
    console.log('🎯 Professional contract generation and email delivery enabled');
    
    // Add error handler after all routes and Vite setup
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
    
  } catch (error) {
    console.error('Server setup error:', error instanceof Error ? error.message : String(error));
    // Fallback: start basic server without Vite
    const server = app.listen(parseInt(process.env.PORT || '5001', 10), "0.0.0.0", () => {
      log(`Fallback server started on port ${process.env.PORT || '5001'}`);
      console.log('⚠️ Running in fallback mode - some features may be limited');
    });
  }
  

})();
/**
 * Contract Management Routes - Save contracts and generate PDFs
 * OPTIMIZED: Uses browser pool for fast PDF generation in production
 */

import { Router } from 'express';
import { db } from '../db';
import { contracts } from '../../shared/schema';
import { verifyFirebaseAuth } from '../middleware/firebase-auth';
import { userMappingService } from '../services/userMappingService';
import { eq } from 'drizzle-orm';
import PremiumPdfService from '../services/premiumPdfService';

const premiumPdfService = PremiumPdfService.getInstance();

const router = Router();

// Save contract to history
// 🔐 CRITICAL SECURITY FIX: Agregado verifyFirebaseAuth para proteger guardado de contratos
router.post('/save', verifyFirebaseAuth, async (req, res) => {
  try {
    const { contractData, name, status = 'generated' } = req.body;

    if (!contractData || !name) {
      return res.status(400).json({ 
        error: 'Missing required fields: contractData and name' 
      });
    }

    // 🔐 CRITICAL SECURITY FIX: Solo usuarios autenticados pueden guardar contratos
    const firebaseUid = req.firebaseUser?.uid;
    if (!firebaseUid) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }
    let userId = await userMappingService.getInternalUserId(firebaseUid);
    if (!userId) {
      const mappingResult = await userMappingService.createMapping(firebaseUid, req.firebaseUser?.email || `${firebaseUid}@firebase.auth`);
      userId = mappingResult?.id ?? null;
    }
    if (!userId) {
      return res.status(500).json({ error: 'Error creando mapeo de usuario' });
    }
    console.log(`🔐 [SECURITY] Saving contract for REAL user_id: ${userId}`);

    // Save to database (note: contracts table doesn't have userId column, log for audit only)
    if (!db) {
      return res.status(500).json({ error: 'Database not available' });
    }
    const savedContract = await db.insert(contracts).values({
      clientName: contractData.contractData?.clientName || name,
      clientAddress: contractData.contractData?.clientAddress || '',
      projectType: contractData.contractData?.projectType || 'Construction Project',
      projectDescription: contractData.contractData?.projectDescription || '',
      projectLocation: contractData.contractData?.projectLocation || '',
      contractorName: contractData.contractData?.contractorName || '',
      totalAmount: contractData.contractData?.totalAmount || '0',
      html: contractData.html || '',
      status: status as any,
      isComplete: true,
      missingFields: [],
      contractorAddress: contractData.contractData?.contractorAddress || '',
      contractorPhone: contractData.contractData?.contractorPhone || '',
      contractorEmail: contractData.contractData?.contractorEmail || '',
      clientPhone: contractData.contractData?.clientPhone || '',
      clientEmail: contractData.contractData?.clientEmail || '',
      startDate: contractData.contractData?.startDate ? new Date(contractData.contractData.startDate) : new Date(),
      completionDate: contractData.contractData?.completionDate ? new Date(contractData.contractData.completionDate) : new Date(),
      contractorLicense: contractData.contractData?.contractorLicense || ''
    }).returning();

    res.json({ 
      success: true, 
      contractId: savedContract[0]?.id,
      message: 'Contract saved to history successfully' 
    });

  } catch (error) {
    console.error('Contract saving error:', error);
    res.status(500).json({ 
      error: 'Failed to save contract to history',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Generate PDF from contract HTML
// 🚀 PRODUCTION OPTIMIZED: Uses PremiumPdfService with browser pool
// Eliminates cold-start latency by reusing persistent browser instance
router.post('/generate-pdf', verifyFirebaseAuth, async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { contractHtml, contractData, fileName = 'contract.pdf' } = req.body;

    if (!contractHtml) {
      return res.status(400).json({ 
        error: 'Missing required field: contractHtml' 
      });
    }

    // 🔐 CRITICAL SECURITY FIX: Solo usuarios autenticados pueden generar PDFs
    const firebaseUid = req.firebaseUser?.uid;
    if (!firebaseUid) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }
    let userId = await userMappingService.getInternalUserId(firebaseUid);
    if (!userId) {
      const mappingResult = await userMappingService.createMapping(firebaseUid, req.firebaseUser?.email || `${firebaseUid}@firebase.auth`);
      userId = mappingResult?.id ?? null;
    }
    if (!userId) {
      return res.status(500).json({ error: 'Error creando mapeo de usuario' });
    }
    console.log(`🔐 [SECURITY] Generating PDF for REAL user_id: ${userId}`);
    console.log(`🚀 [CONTRACT-PDF] Starting optimized PDF generation via PremiumPdfService...`);

    // Detect if HTML is already a complete document or just a fragment
    const isCompleteDocument = contractHtml.trim().toLowerCase().startsWith('<!doctype') || 
                               contractHtml.trim().toLowerCase().startsWith('<html');
    
    // Use the HTML as-is if it's already complete, otherwise wrap it
    const fullHtml = isCompleteDocument ? contractHtml : `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Construction Contract</title>
        <style>
          body {
            font-family: 'Times New Roman', serif;
            line-height: 1.6;
            color: #000;
            max-width: 8.5in;
            margin: 0 auto;
            padding: 0.5in;
            background: white;
          }
          img { max-width: 100%; height: auto; }
          @media print {
            body { margin: 0; }
            .page-break { page-break-before: always; }
          }
        </style>
      </head>
      <body>
        ${contractHtml}
      </body>
      </html>
    `;

    // Use PremiumPdfService with browser pool (no cold-start)
    const pdfBuffer = await premiumPdfService.generatePdfFromHtml(fullHtml, {
      format: 'A4',
      margin: {
        top: '0.75in',
        right: '0.75in',
        bottom: '0.75in',
        left: '0.75in'
      },
      displayHeaderFooter: true,
      headerTemplate: `
        <div style="font-size: 10px; text-align: center; width: 100%; margin: 0 0.75in;">
          <span>Construction Contract - ${contractData?.clientName || 'Client'}</span>
        </div>
      `,
      footerTemplate: `
        <div style="font-size: 10px; text-align: center; width: 100%; margin: 0 0.75in;">
          <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
        </div>
      `
    });

    const totalTime = Date.now() - startTime;
    console.log(`✅ [CONTRACT-PDF] PDF generated in ${totalTime}ms (target: <3000ms)`);

    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.setHeader('X-Generation-Time-Ms', totalTime.toString());

    // Send PDF buffer
    res.send(pdfBuffer);

  } catch (error) {
    const totalTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : '';
    console.error(`❌ [CONTRACT-PDF] Generation failed after ${totalTime}ms:`);
    console.error(`❌ [CONTRACT-PDF] Error message: ${errorMessage}`);
    console.error(`❌ [CONTRACT-PDF] Stack trace: ${errorStack}`);
    res.status(500).json({ 
      error: 'Failed to generate PDF',
      details: errorMessage,
      timestamp: new Date().toISOString(),
      durationMs: totalTime
    });
  }
});

// Get contract history
// 🔐 CRITICAL SECURITY FIX: Agregado verifyFirebaseAuth para proteger historial de contratos
router.get('/history', verifyFirebaseAuth, async (req, res) => {
  try {
    // 🔐 SECURITY FIX: Solo mostrar contratos del usuario autenticado
    const firebaseUid = req.firebaseUser?.uid;
    if (!firebaseUid) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }
    let userId = await userMappingService.getInternalUserId(firebaseUid);
    if (!userId) {
      const mappingResult = await userMappingService.createMapping(firebaseUid, req.firebaseUser?.email || `${firebaseUid}@firebase.auth`);
      userId = mappingResult?.id ?? null;
    }
    if (!userId) {
      return res.status(500).json({ error: 'Error creando mapeo de usuario' });
    }
    console.log(`🔐 [SECURITY] Getting contract history for REAL user_id: ${userId}`);

    // Note: contracts table doesn't have userId column - this legacy table cannot be filtered by user
    // Return empty array to maintain security (don't expose other users' contracts)
    // TODO: Add userId column to contracts table schema and migrate data
    console.log(`⚠️ [SECURITY] Legacy contracts table lacks userId - returning empty history for security`);
    const contractHistory: any[] = [];
    
    res.json({ 
      success: true, 
      contracts: contractHistory 
    });

  } catch (error) {
    console.error('Error fetching contract history:', error);
    res.status(500).json({ 
      error: 'Failed to fetch contract history',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
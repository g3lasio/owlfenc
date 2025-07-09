/**
 * 🧠 NEURAL SIGNATURE API ROUTES
 * Revolutionary AI-powered signature system endpoints
 */

import { Router } from 'express';
import { neuralSignatureEcosystem } from '../services/NeuralSignatureEcosystem';
import { PDFRegenerationService } from '../services/PDFRegenerationService';

const router = Router();

// Initialize PDF regeneration service
const pdfRegenerationService = new PDFRegenerationService();

/**
 * POST /api/neural-signature/initiate
 * Start the neural signature process
 */
router.post('/initiate', async (req, res) => {
  try {
    console.log('🚀 [NEURAL-API] Initiating neural signature process...');
    
    const result = await neuralSignatureEcosystem.initiateNeuralSignatureProcess(req.body);
    
    res.json(result);
  } catch (error) {
    console.error('❌ [NEURAL-API] Initiation failed:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/neural-signature/contract/:contractId
 * Get contract data for neural interface
 */
router.get('/contract/:contractId', async (req, res) => {
  try {
    const { contractId } = req.params;
    const { track } = req.query;
    
    console.log('📋 [NEURAL-API] Loading contract data:', contractId);
    
    // In production, this would fetch from your database
    // For now, return mock data structure
    const contractData = {
      contractId,
      contractHTML: `
        <h1>Independent Contractor Agreement</h1>
        <p><strong>Contractor:</strong> Owl Fence LLC</p>
        <p><strong>Client:</strong> Sample Client</p>
        <p><strong>Project:</strong> Sample Project Description</p>
        <p>This agreement outlines the terms and conditions...</p>
      `,
      contractorData: {
        name: 'Owl Fence LLC',
        company: 'Owl Fence LLC',
        email: 'contractor@owlfence.com',
        phone: '+1234567890'
      },
      clientData: {
        name: 'Sample Client',
        email: 'client@example.com',
        phone: '+1234567890'
      },
      projectDetails: {
        description: 'Sample fence installation project',
        value: '$5,000.00',
        address: '123 Sample St, Sample City, ST 12345'
      },
      contractAnalysis: {
        contractComplexity: 'moderate' as const,
        riskFactors: ['Standard contractor liability terms'],
        recommendedActions: ['Review payment terms carefully'],
        aiInsights: 'This is a standard construction contract with typical terms and conditions. The AI analysis shows moderate complexity with standard risk factors.'
      }
    };
    
    res.json(contractData);
  } catch (error) {
    console.error('❌ [NEURAL-API] Failed to load contract:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load contract data'
    });
  }
});

/**
 * POST /api/neural-signature/validate-signature
 * Validate signature with AI
 */
router.post('/validate-signature', async (req, res) => {
  try {
    console.log('🔍 [NEURAL-API] Validating signature with AI...');
    
    const signatureValidation = await neuralSignatureEcosystem.validateSignatureWithAI(req.body);
    
    res.json({
      success: true,
      signatureValidation
    });
  } catch (error) {
    console.error('❌ [NEURAL-API] Signature validation failed:', error);
    res.status(500).json({
      success: false,
      message: 'Signature validation failed'
    });
  }
});

/**
 * POST /api/neural-signature/process-signature
 * Process signature and regenerate PDF
 */
router.post('/process-signature', async (req, res) => {
  try {
    console.log('🎯 [NEURAL-API] Processing signature...');
    
    const { contractId, signatureData, biometricData, trackingId } = req.body;
    
    // Process signature with AI validation
    const result = await neuralSignatureEcosystem.processNeuralSignature({
      signatureBase64: signatureData,
      signerInfo: {
        name: 'Sample Signer',
        email: 'signer@example.com',
        role: 'client',
        timestamp: new Date().toISOString(),
        ipAddress: req.ip || '127.0.0.1',
        userAgent: req.get('User-Agent') || 'Unknown'
      },
      biometricData: {
        drawingSpeed: biometricData.drawingSpeed || [],
        pressure: biometricData.pressure || [],
        accelerationPatterns: biometricData.accelerationPatterns || [],
        authenticityScore: biometricData.authenticityScore || 0.8
      }
    });
    
    // If signature is valid, regenerate PDF
    if (result.success && result.signatureValidation.isAuthentic) {
      const regeneratedPdf = await pdfRegenerationService.regeneratePDFWithSignature({
        contractId,
        signatureData,
        signerInfo: {
          name: 'Sample Signer',
          role: 'client',
          timestamp: new Date().toISOString()
        }
      });
      
      result.regeneratedPdfUrl = regeneratedPdf.downloadUrl;
    }
    
    res.json(result);
  } catch (error) {
    console.error('❌ [NEURAL-API] Signature processing failed:', error);
    res.status(500).json({
      success: false,
      message: 'Signature processing failed'
    });
  }
});

/**
 * GET /api/neural-signature/download-signed-pdf/:fileName
 * Download the regenerated PDF with signatures
 */
router.get('/download-signed-pdf/:fileName', async (req, res) => {
  try {
    const { fileName } = req.params;
    
    console.log('📄 [NEURAL-API] Serving signed PDF:', fileName);
    
    const pdfBuffer = await pdfRegenerationService.getSignedPDF(decodeURIComponent(fileName));
    
    if (pdfBuffer) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.send(pdfBuffer);
    } else {
      res.status(404).json({
        success: false,
        message: 'Signed PDF not found'
      });
    }
    
  } catch (error) {
    console.error('❌ [NEURAL-API] PDF download failed:', error);
    res.status(500).json({
      success: false,
      message: 'PDF download failed'
    });
  }
});

/**
 * POST /api/neural-signature/test
 * Test the neural signature system
 */
router.post('/test', async (req, res) => {
  try {
    console.log('🧪 [NEURAL-API] Running neural signature test...');
    
    const testRequest = {
      contractId: `TEST-NEURAL-${Date.now()}`,
      contractHTML: '<h1>Test Contract</h1><p>This is a test contract for the neural signature system.</p>',
      contractorData: {
        name: 'Test Contractor',
        company: 'Test Company LLC',
        email: req.body.contractorEmail || 'contractor@test.com',
        phone: '+15551234567'
      },
      clientData: {
        name: 'Test Client',
        email: req.body.clientEmail || 'client@test.com',
        phone: '+15557654321'
      },
      projectDetails: {
        description: 'Test neural signature system',
        value: '$10,000.00',
        address: '123 Test Street, Test City, TX 12345'
      }
    };
    
    const result = await neuralSignatureEcosystem.initiateNeuralSignatureProcess(testRequest);
    
    res.json({
      success: true,
      testResult: result,
      message: 'Neural signature test completed successfully'
    });
    
  } catch (error) {
    console.error('❌ [NEURAL-API] Test failed:', error);
    res.status(500).json({
      success: false,
      message: 'Neural signature test failed'
    });
  }
});

export default router;
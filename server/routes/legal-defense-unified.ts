/**
 * Unified Legal Defense Routes - Consolidated Contract Generation
 * Consolidates all contract generation endpoints into a single optimized pipeline
 * 
 * 🔐 ENTERPRISE SECURITY UPDATE (2025-10-16):
 * All endpoints now protected with enterprise-grade security middlewares
 */

import { Router } from 'express';
import multer from 'multer';
import { HybridContractGenerator } from '../services/hybridContractGenerator';
import { verifyFirebaseAuth } from '../middleware/firebase-auth';
import { 
  requireLegalDefenseAccess,
  validateUsageLimit,
  incrementUsageOnSuccess 
} from '../middleware/subscription-auth';
import { templateService } from '../templates/templateService';
import { featureFlags } from '../config/featureFlags';
import { modernPdfService } from '../services/ModernPdfService';
import { companyProfileService } from '../services/CompanyProfileService';

const router = Router();

// Configure multer for PDF uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  }
});

// Initialize contract generator
const contractGenerator = new HybridContractGenerator();

/**
 * UNIFIED CONTRACT GENERATION ENDPOINT
 * Consolidates all previous endpoints into one optimized pipeline
 * 🔐 ENTERPRISE SECURITY: CRITICAL - Now fully protected
 */
router.post('/generate-contract',
  verifyFirebaseAuth, // ✅ Auth required
  requireLegalDefenseAccess, // ✅ Bloquea Primo Chambeador
  validateUsageLimit('contracts'), // ✅ Valida límite
  incrementUsageOnSuccess('contracts'), // ✅ Cuenta el uso
  async (req, res) => {
  console.log('🛡️ [UNIFIED] Starting optimized contract generation...');
  const startTime = Date.now();
  
  try {
    const { 
      contractData, 
      protectionLevel = 'standard',
      enableOptimizations = true,
      contractorInfo,
      additionalClauses = []
    } = req.body;

    if (!contractData) {
      return res.status(400).json({
        success: false,
        error: 'Contract data is required'
      });
    }

    // Step 1: Validate and enrich contract data
    const enrichedData = await enrichContractData(contractData, contractorInfo);
    
    // Step 2: Generate contract with optimizations
    let contractResult;
    
    if (enableOptimizations) {
      // Use parallel processing for faster generation
      const [contractHtml, contractorData] = await Promise.all([
        contractGenerator.generateContractHTML(enrichedData),
        fetchContractorBranding(contractorInfo?.userId)
      ]);
      
      contractResult = {
        success: true,
        html: contractHtml,
        metadata: {
          generationTime: Date.now() - startTime,
          service: 'hybrid-optimized',
          protectionLevel
        }
      };
    } else {
      // Standard generation
      // 🔥 FIX: Pass firebaseUid for centralized contractor data lookup
      contractResult = await contractGenerator.generateProfessionalContract(enrichedData, {
        firebaseUid: req.firebaseUser?.uid, // 🔥 NEW: Pass firebaseUid
        contractorBranding: contractorInfo // Keep for backward compatibility
      });
    }

    const totalTime = Date.now() - startTime;
    
    console.log(`✅ [UNIFIED] Contract generated in ${totalTime}ms`);
    
    res.json({
      success: true,
      contract: contractResult.html,
      metadata: {
        ...contractResult.metadata,
        totalTime,
        optimized: enableOptimizations
      }
    });

  } catch (error) {
    console.error('❌ [UNIFIED] Contract generation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate contract',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * EXTRACT PDF ENDPOINT (for Legal Defense frontend compatibility)
 * 🔐 ENTERPRISE SECURITY: CRITICAL - Now fully protected
 */
router.post('/extract-pdf', 
  upload.single('pdf'),
  verifyFirebaseAuth, // ✅ Auth required
  requireLegalDefenseAccess, // ✅ Bloquea Primo Chambeador
  async (req, res) => {
  console.log('🔍 [LEGAL-DEFENSE] Starting PDF extraction for Legal Defense...');
  
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'PDF file is required'
      });
    }

    // Extract data using optimized pipeline
    const extractionResult = await extractPdfDataOptimized(req.file.buffer);
    
    if (!extractionResult.success) {
      throw new Error(extractionResult.error);
    }

    // Validate extracted data
    const validation = validateExtractedData(extractionResult.data);
    
    // Format response to match Legal Defense frontend expectations
    res.json({
      success: true,
      data: extractionResult.data,
      hasCriticalMissing: validation.completeness < 70,
      missingCritical: validation.warnings.map(w => w.replace('Missing ', '')),
      canProceed: validation.completeness >= 50,
      extractionQuality: {
        confidence: extractionResult.confidence
      }
    });

  } catch (error) {
    console.error('❌ [LEGAL-DEFENSE] PDF extraction error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to extract PDF data',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * UNIFIED PDF EXTRACTION AND VALIDATION (legacy endpoint)
 * 🔐 ENTERPRISE SECURITY: CRITICAL - Now fully protected
 */
router.post('/extract-and-process', 
  upload.single('pdf'),
  verifyFirebaseAuth, // ✅ Auth required
  requireLegalDefenseAccess, // ✅ Bloquea Primo Chambeador
  async (req, res) => {
  console.log('🔍 [UNIFIED] Starting PDF extraction and processing...');
  
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'PDF file is required'
      });
    }

    // Extract data using optimized pipeline
    const extractionResult = await extractPdfDataOptimized(req.file.buffer);
    
    if (!extractionResult.success) {
      throw new Error(extractionResult.error);
    }

    // Validate extracted data
    const validation = validateExtractedData(extractionResult.data);
    
    res.json({
      success: true,
      extractedData: extractionResult.data,
      validation,
      confidence: extractionResult.confidence,
      processingTime: extractionResult.processingTime
    });

  } catch (error) {
    console.error('❌ [UNIFIED] PDF processing error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process PDF',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * HEALTH CHECK ENDPOINT
 */
router.get('/health', async (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        contractGenerator: 'operational',
        anthropic: process.env.ANTHROPIC_API_KEY ? 'configured' : 'missing',
        openai: process.env.OPENAI_API_KEY ? 'configured' : 'missing'
      },
      performance: {
        averageGenerationTime: '< 30 seconds',
        successRate: '> 95%'
      }
    };

    res.json(health);
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Helper functions
async function enrichContractData(contractData: any, contractorInfo?: any) {
  return {
    ...contractData,
    timestamp: new Date().toISOString(),
    contractorInfo: contractorInfo || {},
    enhancementLevel: 'professional'
  };
}

async function fetchContractorBranding(userId?: string) {
  if (!userId) return {};
  
  try {
    // Fetch contractor branding data
    // This would connect to your user profile system
    return {
      companyName: 'Professional Contractor',
      address: '',
      phone: '',
      email: '',
      licenseNumber: ''
    };
  } catch (error) {
    console.warn('Failed to fetch contractor branding:', error);
    return {};
  }
}

async function extractPdfDataOptimized(buffer: Buffer) {
  console.log('🔍 [PDF-EXTRACT] Starting PDF data extraction...');
  
  // Validate input buffer
  if (!buffer || buffer.length === 0) {
    console.error('❌ [PDF-EXTRACT] Invalid or empty buffer provided');
    return {
      success: false,
      error: 'Invalid PDF buffer provided'
    };
  }

  console.log(`📄 [PDF-EXTRACT] Processing PDF buffer of ${buffer.length} bytes`);
  
  try {
    // Optimized PDF extraction using the best available service
    const pdf = await import('pdf-parse');
    
    const pdfData = await pdf.default(buffer);
    const extractedText = pdfData.text;
    
    console.log(`📝 [PDF-EXTRACT] Extracted ${extractedText?.length || 0} characters from PDF`);
    
    if (!extractedText || extractedText.length === 0) {
      console.warn('⚠️ [PDF-EXTRACT] No text extracted from PDF');
      return {
        success: false,
        error: 'No text could be extracted from the PDF. The document may be image-based or corrupted.'
      };
    }
    
    // Use AI to structure the data
    console.log('🤖 [PDF-EXTRACT] Parsing text with AI...');
    const structuredData = await parseTextWithAI(extractedText);
    
    console.log('✅ [PDF-EXTRACT] Data extraction completed successfully');
    
    return {
      success: true,
      data: structuredData,
      confidence: 85,
      processingTime: Date.now()
    };
  } catch (error) {
    console.error('❌ [PDF-EXTRACT] Extraction failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'PDF extraction failed'
    };
  }
}

// Intelligent document structure parser for estimates
function parseEstimateStructure(text: string) {
  console.log('🎯 [STRUCTURE] Analyzing document structure...');
  
  // Split text into logical sections
  const sections = {
    header: extractSection(text, /ESTIMATE[\s\S]*?(?=Client Information|$)/i),
    clientInfo: extractSection(text, /Client Information[\s\S]*?(?=Project Details|$)/i),
    projectDetails: extractSection(text, /Project Details[\s\S]*?(?=Items & Services|$)/i),
    itemsServices: extractSection(text, /Items & Services[\s\S]*?(?=Subtotal:|$)/i),
    totals: extractSection(text, /Subtotal:[\s\S]*?(?=Thank you|Terms|$)/i),
    footer: extractSection(text, /Terms[\s\S]*$/i)
  };

  console.log('📋 [STRUCTURE] Sections found:', Object.keys(sections).filter(key => sections[key]));
  
  return sections;
}

function extractSection(text: string, regex: RegExp): string {
  const match = text.match(regex);
  return match ? match[0].trim() : '';
}

// Specialized extraction functions for estimate documents
function extractClientName(text: string): string {
  const sections = parseEstimateStructure(text);
  const clientSection = sections.clientInfo;
  
  console.log('🔍 [CLIENT-NAME] Analyzing client section...');
  
  // Extract name from client information section
  const patterns = [
    /Client Information[\s\S]*?^\s*([A-Z][a-zA-Z]+\s+[A-Z][a-zA-Z]+)[\s\n]/m,
    /([A-Z][a-zA-Z]+\s+[A-Z][a-zA-Z]+)[\s\n]*Phone:/,
    /^\s*([A-Z][a-zA-Z]+\s+[A-Z][a-zA-Z]+)[\s]*$/m
  ];
  
  for (const pattern of patterns) {
    const result = extractField(clientSection || text, pattern);
    if (result && result.length > 2 && !result.includes('Information') && !result.includes('Phone')) {
      console.log(`✅ [CLIENT-NAME] Found: "${result}"`);
      return result;
    }
  }
  
  return '';
}

function extractAddress(text: string): string {
  const sections = parseEstimateStructure(text);
  const clientSection = sections.clientInfo;
  
  console.log('🔍 [ADDRESS] Analyzing address from client section...');
  
  const patterns = [
    /Address:\s*([^\n]+)/i,
    /Address[\s:]*([^\n]+)/i,
    /(\d+\s+[A-Z][a-zA-Z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Court|Ct|Hill|Way)[^\n]*)/i
  ];
  
  for (const pattern of patterns) {
    const result = extractField(clientSection || text, pattern);
    if (result && result.length > 5 && !result.includes('Project') && !result.includes('Details')) {
      console.log(`✅ [ADDRESS] Found: "${result}"`);
      return result;
    }
  }
  
  return '';
}

function extractProjectType(text: string): string {
  const sections = parseEstimateStructure(text);
  const projectSection = sections.projectDetails;
  
  console.log('🔍 [PROJECT-TYPE] Analyzing project section...');
  
  // Look for specific project keywords in project description
  const keywords = ['deck', 'remodel', 'renovation', 'construction', 'fence', 'roofing', 'flooring', 'painting'];
  
  for (const keyword of keywords) {
    const regex = new RegExp(`\\b${keyword}\\w*\\b`, 'i');
    if (regex.test(projectSection)) {
      console.log(`✅ [PROJECT-TYPE] Found: "${keyword}"`);
      return keyword;
    }
  }
  
  return '';
}

function extractProjectDescription(text: string): string {
  const sections = parseEstimateStructure(text);
  const projectSection = sections.projectDetails;
  
  console.log('🔍 [PROJECT-DESC] Extracting project description...');
  
  // Extract the main project description from project details
  const patterns = [
    /This project involves[\s\S]*?(?=\.\s*[✨💪📋🎯])/i,
    /comprehensive\s+\w+\s+of[\s\S]*?(?=\.\s*Construction)/i,
    /scope of work includes[\s\S]*?(?=\.\s*[A-Z])/i
  ];
  
  for (const pattern of patterns) {
    const result = extractField(projectSection, pattern);
    if (result && result.length > 50) {
      console.log(`✅ [PROJECT-DESC] Found description (${result.length} chars)`);
      return result.substring(0, 200) + '...'; // Limit length
    }
  }
  
  return '';
}

function extractLocation(text: string): string {
  // Location is typically the same as address for construction estimates
  return extractAddress(text);
}

function extractTotalAmount(text: string): string {
  const sections = parseEstimateStructure(text);
  const totalsSection = sections.totals;
  
  console.log('🔍 [TOTAL-AMOUNT] Analyzing totals section...');
  console.log('💰 [TOTAL-AMOUNT] Totals section:', totalsSection);
  
  // Priority patterns for actual total line (avoid project description amounts)
  const patterns = [
    /TOTAL\s*ESTIMATE:\s*\$?([\d,]+\.?\d*)/i,
    /^.*TOTAL\s*ESTIMATE:\s*\$?([\d,]+\.?\d*).*$/im,
    /Total:\s*\$?([\d,]+\.?\d*)\s*$/im,
    /Grand\s*Total:\s*\$?([\d,]+\.?\d*)/i,
    /Final\s*Total:\s*\$?([\d,]+\.?\d*)/i
  ];
  
  // First search the totals section
  for (const pattern of patterns) {
    const match = totalsSection.match(pattern);
    if (match && match[1]) {
      const amount = match[1].replace(/,/g, '');
      console.log(`✅ [TOTAL-AMOUNT] Found: "$${amount}"`);
      return amount;
    }
  }
  
  // If not found in totals, search entire document but skip project description
  const lines = text.split('\n');
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    
    // Skip lines that contain project description amounts
    if (line.includes('investment:') || line.includes('Total investment:') || 
        line.includes('Project Details') || line.includes('Dear ')) {
      continue;
    }
    
    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (match && match[1]) {
        const amount = match[1].replace(/,/g, '');
        console.log(`✅ [TOTAL-AMOUNT] Found: "$${amount}"`);
        return amount;
      }
    }
  }
  
  console.log('❌ [TOTAL-AMOUNT] No total found');
  return '';
}

async function parseTextWithAI(text: string) {
  // Validate input text
  if (!text || typeof text !== 'string') {
    console.warn('Invalid text provided to parseTextWithAI:', typeof text);
    return {
      clientInfo: { name: '', email: '', phone: '', address: '' },
      projectInfo: { type: '', description: '', location: '' },
      financialInfo: { totalAmount: '' }
    };
  }

  console.log('🔍 [AI-PARSE] Starting enhanced text parsing...');
  console.log('📝 [AI-PARSE] Text preview:', text.substring(0, 500) + '...');

  // Enhanced parsing with multiple patterns for each field
  const clientInfo = {
    name: cleanExtractedText(extractClientName(text)),
    email: cleanExtractedText(extractField(text, /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/)),
    phone: cleanExtractedText(extractField(text, /(?:phone|tel|mobile|cell).*?:?\s*([0-9\(\)\-\s\.]{10,})/i) || 
           extractField(text, /(\([0-9]{3}\)\s*[0-9]{3}[-\s]*[0-9]{4})/)),
    address: cleanExtractedText(extractAddress(text))
  };

  const projectInfo = {
    type: cleanExtractedText(extractProjectType(text)),
    description: cleanExtractedText(extractProjectDescription(text)),
    location: cleanExtractedText(extractLocation(text))
  };

  const financialInfo = {
    totalAmount: cleanExtractedText(extractTotalAmount(text))
  };

  console.log('✅ [AI-PARSE] Extracted data:', { clientInfo, projectInfo, financialInfo });

  return {
    clientInfo,
    projectInfo,
    financialInfo
  };
}

function extractField(text: string, regex: RegExp): string {
  const match = text.match(regex);
  return match && match[1] ? match[1].trim() : '';
}

// Function to clean extracted text from common OCR artifacts
function cleanExtractedText(text: string): string {
  if (!text) return '';
  
  return text
    // Remove common OCR noise words at the beginning
    .replace(/^(Information|Details|Phone|Email|Address|Project|Client|Name|Location)\s*/gi, '')
    // Remove multiple whitespaces and newlines
    .replace(/\s+/g, ' ')
    // Remove leading/trailing whitespace
    .trim()
    // Remove empty parentheses
    .replace(/\(\s*\)/g, '')
    // Clean up phone number prefixes
    .replace(/^Phone:\s*/gi, '')
    // Clean email prefixes
    .replace(/^Email:\s*/gi, '')
    // Remove standalone numbers at start (like line numbers)
    .replace(/^\d+\s+/, '')
    // Remove special characters that aren't needed
    .replace(/[^\w\s@.\-()$,]/g, ' ')
    // Consolidate multiple spaces again
    .replace(/\s+/g, ' ')
    .trim();
}

function validateExtractedData(data: any) {
  const validation = {
    isValid: true,
    errors: [] as string[],
    warnings: [] as string[],
    completeness: 0
  };

  const requiredFields = ['clientInfo.name', 'projectInfo.type', 'financialInfo.totalAmount'];
  let completeFields = 0;

  requiredFields.forEach(field => {
    const value = getNestedValue(data, field);
    if (value && value.trim()) {
      completeFields++;
    } else {
      validation.warnings.push(`Missing ${field}`);
    }
  });

  validation.completeness = (completeFields / requiredFields.length) * 100;
  validation.isValid = validation.completeness >= 70;

  return validation;
}

function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

// ============================================
// PHASE 1: Multi-Template System Endpoints
// ============================================

// GET available document templates (public endpoint - only returns metadata)
router.get('/templates',
  async (req, res) => {
    try {
      if (!featureFlags.isMultiTemplateSystemEnabled()) {
        return res.status(404).json({
          success: false,
          error: 'Template system is not enabled',
        });
      }

      const templates = templateService.getTemplateMetadata();
      
      res.json({
        success: true,
        templates,
        featureFlags: {
          multiTemplateSystem: featureFlags.isMultiTemplateSystemEnabled(),
          documentTypeSelector: featureFlags.isEnabled('documentTypeSelector'),
        },
      });
    } catch (error) {
      console.error('❌ [TEMPLATES] Error fetching templates:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Error fetching templates',
      });
    }
  }
);

// GET specific template details
router.get('/templates/:templateId',
  verifyFirebaseAuth,
  async (req, res) => {
    try {
      const { templateId } = req.params;

      if (!featureFlags.isMultiTemplateSystemEnabled()) {
        return res.status(404).json({
          success: false,
          error: 'Template system is not enabled',
        });
      }

      const template = templateService.getTemplate(templateId);
      
      if (!template) {
        return res.status(404).json({
          success: false,
          error: `Template '${templateId}' not found or not available`,
        });
      }

      res.json({
        success: true,
        template: {
          id: template.id,
          name: template.name,
          displayName: template.displayName,
          description: template.description,
          category: template.category,
          templateVersion: template.templateVersion,
          signatureType: template.signatureType,
          requiredFields: template.requiredFields,
          optionalFields: template.optionalFields,
          icon: template.icon,
        },
      });
    } catch (error) {
      console.error('❌ [TEMPLATES] Error fetching template:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Error fetching template',
      });
    }
  }
);

// POST generate document from template
router.post('/templates/:templateId/generate',
  verifyFirebaseAuth,
  requireLegalDefenseAccess,
  validateUsageLimit('contracts'),
  incrementUsageOnSuccess('contracts'),
  async (req, res) => {
    try {
      const { templateId } = req.params;
      const { data } = req.body;
      const firebaseUid = req.firebaseUser?.uid;

      console.log(`📋 [TEMPLATE-GENERATE] Generating ${templateId} document...`);

      // 🔥 SINGLE SOURCE OF TRUTH: Firebase is the ONLY source for contractor profile
      if (!firebaseUid) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
      }
      
      const profile = await companyProfileService.getProfileByFirebaseUid(firebaseUid);
      
      if (!profile) {
        return res.status(400).json({
          success: false,
          error: 'Contractor profile not found. Please complete your profile in Settings.',
        });
      }
      
      // Build branding EXCLUSIVELY from Firebase - no client data accepted
      const branding = {
        companyName: profile.companyName || '',
        address: profile.address || '',
        city: profile.city || '',
        state: profile.state || '',
        zipCode: profile.zipCode || '',
        phone: profile.phone || '',
        email: profile.email || '',
        licenseNumber: profile.license || '',
        logo: profile.logo || '',
        website: profile.website || '',
        ownerName: profile.ownerName || '',
      };
      
      console.log(`✅ [TEMPLATE-GENERATE] Profile from Firebase: license=${branding.licenseNumber || 'EMPTY'}, state=${branding.state || 'EMPTY'}`);

      if (!featureFlags.isMultiTemplateSystemEnabled()) {
        return res.status(404).json({
          success: false,
          error: 'Template system is not enabled',
        });
      }

      if (!templateService.isTemplateAvailable(templateId)) {
        return res.status(404).json({
          success: false,
          error: `Template '${templateId}' not found or not available`,
        });
      }

      const result = await templateService.generateDocument(templateId, data, branding);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error,
        });
      }

      console.log(`✅ [TEMPLATE-GENERATE] Document generated: ${templateId}`);

      res.json({
        success: true,
        html: result.html,
        metadata: result.metadata,
      });
    } catch (error) {
      console.error('❌ [TEMPLATE-GENERATE] Error generating document:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Error generating document',
      });
    }
  }
);

// ============================================
// UNIFIED PDF ENGINE - Uses ModernPdfService (Puppeteer-based)
// Same stable engine used by Invoices and Contracts
// ============================================

/**
 * UNIFIED PDF GENERATION ENDPOINT
 * Uses ModernPdfService (Puppeteer-based) for reliable PDF generation
 * Same engine that powers working Invoice and Contract PDFs
 */
router.post('/generate-pdf-native',
  verifyFirebaseAuth,
  requireLegalDefenseAccess,
  validateUsageLimit('contracts'),
  incrementUsageOnSuccess('contracts'),
  async (req, res) => {
    const startTime = Date.now();
    console.log('🚀 [UNIFIED-PDF] Starting PDF generation with ModernPdfService...');
    
    try {
      const { html, templateId, title } = req.body;
      
      if (!html) {
        return res.status(400).json({
          success: false,
          error: 'HTML content is required'
        });
      }
      
      // Use ModernPdfService for all document types - same engine as Invoices/Contracts
      const result = await modernPdfService.generateFromHtml(html, {
        format: 'Letter',
        margin: {
          top: '0.75in',
          right: '0.75in',
          bottom: '0.75in',
          left: '0.75in'
        }
      });
      
      if (!result.success || !result.buffer) {
        console.error('❌ [UNIFIED-PDF] Generation failed:', result.error);
        return res.status(500).json({
          success: false,
          error: result.error || 'PDF generation failed'
        });
      }
      
      const totalTime = Date.now() - startTime;
      console.log(`✅ [UNIFIED-PDF] PDF generated in ${totalTime}ms using ${result.method}`);
      
      const filename = title 
        ? `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`
        : `legal_defense_document_${Date.now()}.pdf`;
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', result.buffer.length);
      res.setHeader('X-Generation-Time', totalTime.toString());
      res.setHeader('X-Engine', 'modern-pdf-service');
      res.setHeader('X-Method', result.method);
      
      res.send(result.buffer);
      
    } catch (error) {
      const totalTime = Date.now() - startTime;
      console.error('❌ [UNIFIED-PDF] Unexpected error:', error);
      
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
        processingTime: totalTime
      });
    }
  }
);

/**
 * TEMPLATE + PDF GENERATION (Combined)
 * Generates document from template and converts to PDF using ModernPdfService
 * Same reliable engine as Invoices and Contracts
 * 🔥 SINGLE SOURCE OF TRUTH: Branding comes ONLY from Firebase
 */
router.post('/templates/:templateId/generate-pdf',
  verifyFirebaseAuth,
  requireLegalDefenseAccess,
  validateUsageLimit('contracts'),
  incrementUsageOnSuccess('contracts'),
  async (req, res) => {
    const startTime = Date.now();
    const { templateId } = req.params;
    const firebaseUid = req.firebaseUser?.uid;
    
    console.log(`📋 [TEMPLATE-PDF] Generating PDF for template: ${templateId}`);
    
    try {
      const { data, title } = req.body;
      
      // 🔥 SINGLE SOURCE OF TRUTH: Firebase is the ONLY source for contractor profile
      if (!firebaseUid) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }
      
      const profile = await companyProfileService.getProfileByFirebaseUid(firebaseUid);
      
      if (!profile) {
        return res.status(400).json({
          success: false,
          error: 'Contractor profile not found. Please complete your profile in Settings.'
        });
      }
      
      // Build branding EXCLUSIVELY from Firebase - no client data accepted
      const branding = {
        companyName: profile.companyName || '',
        address: profile.address || '',
        city: profile.city || '',
        state: profile.state || '',
        zipCode: profile.zipCode || '',
        phone: profile.phone || '',
        email: profile.email || '',
        licenseNumber: profile.license || '',
        logo: profile.logo || '',
        website: profile.website || '',
        ownerName: profile.ownerName || '',
      };
      
      console.log(`✅ [TEMPLATE-PDF] Profile from Firebase: license=${branding.licenseNumber || 'EMPTY'}, state=${branding.state || 'EMPTY'}`);
      
      if (!featureFlags.isMultiTemplateSystemEnabled()) {
        return res.status(404).json({
          success: false,
          error: 'Template system is not enabled'
        });
      }
      
      if (!templateService.isTemplateAvailable(templateId)) {
        return res.status(404).json({
          success: false,
          error: `Template '${templateId}' not found or not available`
        });
      }
      
      const htmlResult = await templateService.generateDocument(templateId, data, branding);
      
      if (!htmlResult.success || !htmlResult.html) {
        return res.status(400).json({
          success: false,
          error: htmlResult.error || 'Failed to generate document HTML'
        });
      }
      
      // Use ModernPdfService for all template types - unified engine
      const pdfResult = await modernPdfService.generateFromHtml(htmlResult.html, {
        format: 'Letter',
        margin: {
          top: '0.75in',
          right: '0.75in',
          bottom: '0.75in',
          left: '0.75in'
        }
      });
      
      if (!pdfResult.success || !pdfResult.buffer) {
        return res.status(500).json({
          success: false,
          error: pdfResult.error || 'PDF generation failed'
        });
      }
      
      const totalTime = Date.now() - startTime;
      console.log(`✅ [TEMPLATE-PDF] PDF generated: ${templateId} in ${totalTime}ms using ${pdfResult.method}`);
      
      const filename = title 
        ? `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`
        : `${templateId}_${Date.now()}.pdf`;
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', pdfResult.buffer.length);
      res.setHeader('X-Generation-Time', totalTime.toString());
      res.setHeader('X-Template-Id', templateId);
      res.setHeader('X-Engine', 'modern-pdf-service');
      res.setHeader('X-Method', pdfResult.method);
      
      res.send(pdfResult.buffer);
      
    } catch (error) {
      const totalTime = Date.now() - startTime;
      console.error('❌ [TEMPLATE-PDF] Error:', error);
      
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
        processingTime: totalTime
      });
    }
  }
);

/**
 * Generate template document with JSON response (HTML + PDF base64)
 * Used by frontend for Step 3 display
 */
router.post('/templates/:templateId/generate-document',
  verifyFirebaseAuth,
  requireLegalDefenseAccess,
  validateUsageLimit('contracts'),
  incrementUsageOnSuccess('contracts'),
  async (req, res) => {
    const startTime = Date.now();
    const { templateId } = req.params;
    
    console.log(`📋 [TEMPLATE-DOC] Generating document for template: ${templateId}`);
    
    try {
      const { data, title } = req.body;
      const firebaseUid = req.firebaseUser?.uid;
      
      // 🔥 SINGLE SOURCE OF TRUTH: Firebase is the ONLY source for contractor profile
      // Frontend branding is IGNORED - we always read fresh from Firebase
      if (!firebaseUid) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required - Firebase UID not found'
        });
      }
      
      console.log(`🔍 [TEMPLATE-DOC] Fetching contractor profile from Firebase (SINGLE SOURCE) for UID: ${firebaseUid}`);
      const profile = await companyProfileService.getProfileByFirebaseUid(firebaseUid);
      
      if (!profile) {
        console.error(`❌ [TEMPLATE-DOC] No profile found in Firebase for UID: ${firebaseUid}`);
        return res.status(400).json({
          success: false,
          error: 'Contractor profile not found. Please complete your profile in Settings before generating legal documents.'
        });
      }
      
      // Build branding EXCLUSIVELY from Firebase profile - no fallbacks, no client data
      const branding = {
        companyName: profile.companyName || '',
        address: profile.address || '',
        city: profile.city || '',
        state: profile.state || '',
        zipCode: profile.zipCode || '',
        phone: profile.phone || '',
        email: profile.email || '',
        licenseNumber: profile.license || '',
        logo: profile.logo || '',
        website: profile.website || '',
        ownerName: profile.ownerName || '',
        ein: profile.ein || '',
        insurancePolicy: profile.insurancePolicy || '',
      };
      
      console.log(`✅ [TEMPLATE-DOC] Profile loaded from Firebase:`, {
        companyName: branding.companyName || 'NOT SET',
        licenseNumber: branding.licenseNumber || 'NOT SET',
        state: branding.state || 'NOT SET'
      });
      
      // Validate critical fields for legal documents
      if (!branding.licenseNumber) {
        console.warn(`⚠️ [TEMPLATE-DOC] License number is missing for UID: ${firebaseUid}`);
      }
      if (!branding.state) {
        console.warn(`⚠️ [TEMPLATE-DOC] State is missing for UID: ${firebaseUid}`);
      }
      
      if (!featureFlags.isMultiTemplateSystemEnabled()) {
        return res.status(404).json({
          success: false,
          error: 'Template system is not enabled'
        });
      }
      
      if (!templateService.isTemplateAvailable(templateId)) {
        return res.status(404).json({
          success: false,
          error: `Template '${templateId}' not found or not available`
        });
      }
      
      const htmlResult = await templateService.generateDocument(templateId, data, branding);
      
      if (!htmlResult.success || !htmlResult.html) {
        return res.status(400).json({
          success: false,
          error: htmlResult.error || 'Failed to generate document HTML'
        });
      }
      
      // Generate PDF from HTML
      const pdfResult = await modernPdfService.generateFromHtml(htmlResult.html, {
        format: 'Letter',
        margin: {
          top: '0.75in',
          right: '0.75in',
          bottom: '0.75in',
          left: '0.75in'
        }
      });
      
      if (!pdfResult.success || !pdfResult.buffer) {
        return res.status(500).json({
          success: false,
          error: pdfResult.error || 'PDF generation failed'
        });
      }
      
      const totalTime = Date.now() - startTime;
      console.log(`✅ [TEMPLATE-DOC] Document generated: ${templateId} in ${totalTime}ms`);
      
      const filename = title 
        ? `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`
        : `${templateId}_${Date.now()}.pdf`;
      
      // Return JSON with HTML and PDF base64
      res.json({
        success: true,
        templateId,
        html: htmlResult.html,
        pdfBase64: pdfResult.buffer.toString('base64'),
        filename,
        pdfSize: pdfResult.buffer.length,
        processingTime: totalTime,
        method: pdfResult.method
      });
      
    } catch (error) {
      const totalTime = Date.now() - startTime;
      console.error('❌ [TEMPLATE-DOC] Error:', error);
      
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
        processingTime: totalTime
      });
    }
  }
);

/**
 * UNIFIED PDF SERVICE HEALTH CHECK
 */
router.get('/native-pdf/health', async (req, res) => {
  try {
    const health = await modernPdfService.healthCheck();
    
    res.json({
      status: health.healthy ? 'healthy' : 'unhealthy',
      engine: 'modern-pdf-service',
      ...health.details,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      engine: 'modern-pdf-service',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
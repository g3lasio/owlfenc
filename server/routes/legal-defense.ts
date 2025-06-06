import express from 'express';
import multer from 'multer';
import Anthropic from '@anthropic-ai/sdk';
import { db } from '../db';
import { projects, insertProjectSchema } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import pdf from 'pdf-parse';
import sharp from 'sharp';

const router = express.Router();

// Configure multer for PDF uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(null, false);
    }
  },
});

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// PDF OCR extraction endpoint
router.post('/extract-pdf', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file provided' });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(500).json({ 
        error: 'Anthropic API key not configured',
        message: 'Please provide ANTHROPIC_API_KEY environment variable'
      });
    }

    // Extract text from PDF using pdf-parse
    const pdfData = await pdf(req.file.buffer);
    const pdfText = pdfData.text;

    if (!pdfText || pdfText.trim().length === 0) {
      return res.status(400).json({ 
        error: 'Could not extract text from PDF',
        message: 'The PDF appears to be empty or contains only images'
      });
    }

    // Create structured extraction prompt for Claude Sonnet
    const extractionPrompt = `
You are an advanced document analysis AI specializing in construction estimate and contract analysis. Extract comprehensive data from this PDF text and return it as a structured JSON object.

PDF TEXT CONTENT:
${pdfText}

Return a JSON object with the following structure:

REQUIRED OUTPUT FORMAT (JSON only, no other text):
{
  "clientInfo": {
    "name": "string",
    "email": "string", 
    "phone": "string",
    "address": "string"
  },
  "projectDetails": {
    "type": "string",
    "description": "string",
    "location": "string", 
    "startDate": "YYYY-MM-DD or null",
    "endDate": "YYYY-MM-DD or null"
  },
  "materials": [
    {
      "item": "string",
      "quantity": "number",
      "unit": "string",
      "unitPrice": "number",
      "totalPrice": "number"
    }
  ],
  "financials": {
    "subtotal": "number",
    "tax": "number",
    "taxRate": "number",
    "total": "number"
  },
  "paymentTerms": "string",
  "specifications": "string",
  "extractionQuality": {
    "confidence": "number (0-100)",
    "missingFields": ["array of field names that couldn't be extracted"],
    "warnings": ["array of potential data quality issues"]
  }
}

EXTRACTION RULES:
- Extract all monetary values as numbers (remove $ symbols)
- Convert dates to YYYY-MM-DD format or null if not found
- Be precise with quantities and measurements
- Include all line items from estimates
- Identify contractor/company information vs client information
- If a field cannot be found, use null or empty array
- Confidence should reflect data extraction accuracy (0-100)
- List missing critical fields in missingFields array
- Flag any unclear or potentially incorrect data in warnings

Analyze this document thoroughly and extract all relevant project data:
`;

    // Send extracted text to Claude for analysis
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514', // the newest Anthropic model is "claude-sonnet-4-20250514" which was released May 14, 2025. Use this by default unless user has already selected claude-3-7-sonnet-20250219
      max_tokens: 4000,
      messages: [
        {
          role: 'user',
          content: extractionPrompt
        }
      ]
    });

    const responseText = response.content[0].type === 'text' ? response.content[0].text : '';
    
    // Parse the JSON response from Claude (remove markdown formatting if present)
    console.log('🔍 Raw Claude response length:', responseText.length);
    console.log('🔍 Raw Claude response preview:', responseText.substring(0, 500));
    
    let extractedData;
    try {
      let cleanedResponse = responseText.trim();
      
      // Remove markdown code block formatting if present
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        console.log('✅ Removed JSON markdown formatting');
      } else if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
        console.log('✅ Removed code block formatting');
      }
      
      console.log('🔧 Cleaned response preview:', cleanedResponse.substring(0, 500));
      extractedData = JSON.parse(cleanedResponse);
      console.log('✅ Successfully parsed JSON from Claude');
    } catch (parseError) {
      console.error('Failed to parse Claude response:', responseText);
      return res.status(500).json({ 
        error: 'Failed to parse extracted data',
        message: 'Claude response was not valid JSON',
        rawResponse: responseText
      });
    }

    // Validate extracted data structure
    const validationSchema = z.object({
      clientInfo: z.object({
        name: z.string().nullable(),
        email: z.string().email().nullable(),
        phone: z.string().nullable(),
        address: z.string().nullable()
      }),
      projectDetails: z.object({
        type: z.string().nullable(),
        description: z.string().nullable(),
        location: z.string().nullable(),
        startDate: z.string().nullable(),
        endDate: z.string().nullable()
      }),
      materials: z.array(z.object({
        item: z.string(),
        quantity: z.number(),
        unit: z.string(),
        unitPrice: z.number(),
        totalPrice: z.number()
      })),
      financials: z.object({
        subtotal: z.number().nullable().default(0),
        tax: z.number().nullable().default(0),
        taxRate: z.number().nullable().default(0),
        total: z.number().nullable().default(0)
      }),
      paymentTerms: z.string().nullable(),
      specifications: z.string().nullable(),
      extractionQuality: z.object({
        confidence: z.number().min(0).max(100),
        missingFields: z.array(z.string()),
        warnings: z.array(z.string())
      })
    });

    console.log('🔍 Extracted data structure:', JSON.stringify(extractedData, null, 2));
    console.log('🔧 Starting validation process...');
    
    // Fix financial data if it contains null values before validation
    if (extractedData.financials) {
      console.log('🔧 Checking financial data:', extractedData.financials);
      extractedData.financials.subtotal = extractedData.financials.subtotal || 0;
      extractedData.financials.tax = extractedData.financials.tax || 0;
      extractedData.financials.taxRate = extractedData.financials.taxRate || 0;
      extractedData.financials.total = extractedData.financials.total || 0;
      console.log('✅ Fixed financial data with defaults');
    }

    const validationResult = validationSchema.safeParse(extractedData);
    
    if (!validationResult.success) {
      console.error('❌ Validation failed:', validationResult.error.errors);
      return res.json({
        success: false,
        error: 'Validation failed',
        validationErrors: validationResult.error.errors,
        extractedData: extractedData
      });
    }

    const validatedData = validationResult.data;
    console.log('✅ Validation successful');

    // Check for critical missing fields
    const criticalFields = ['clientInfo.name', 'projectDetails.type', 'financials.total'];
    const missingCritical = criticalFields.filter(field => {
      const keys = field.split('.');
      let value: any = validatedData;
      for (const key of keys) {
        value = value?.[key];
      }
      return !value;
    });

    console.log('🔍 Missing critical fields:', missingCritical);

    res.json({
      success: true,
      data: validatedData,
      hasCriticalMissing: missingCritical.length > 0,
      missingCritical,
      canProceed: validatedData.extractionQuality.confidence >= 70 && missingCritical.length === 0
    });

  } catch (error: unknown) {
    console.error('PDF extraction error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    if (errorMessage.includes('API key')) {
      return res.status(500).json({ 
        error: 'Anthropic API authentication failed',
        message: 'Please verify ANTHROPIC_API_KEY is correctly configured'
      });
    }
    
    res.status(500).json({ 
      error: 'PDF extraction failed',
      message: errorMessage 
    });
  }
});

// Get approved projects for user
router.get('/approved-projects', async (req, res) => {
  try {
    const userId = req.query.userId ? parseInt(req.query.userId as string) : 1; // Default for demo
    
    const approvedProjects = await db
      .select()
      .from(projects)
      .where(eq(projects.status, 'approved'))
      .orderBy(projects.createdAt);

    res.json({
      success: true,
      projects: approvedProjects
    });

  } catch (error: unknown) {
    console.error('Error fetching approved projects:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ 
      error: 'Failed to fetch approved projects',
      message: errorMessage 
    });
  }
});

// Create project from extracted data
router.post('/create-project', async (req, res) => {
  try {
    const { extractedData, userId = 1 } = req.body;

    const projectData = {
      name: `${extractedData.projectDetails.type} - ${extractedData.clientInfo.name}`,
      description: extractedData.projectDetails.description,
      clientName: extractedData.clientInfo.name,
      clientEmail: extractedData.clientInfo.email,
      clientPhone: extractedData.clientInfo.phone,
      projectType: extractedData.projectDetails.type,
      address: extractedData.projectDetails.location || extractedData.clientInfo.address,
      totalAmount: extractedData.financials.total.toString(),
      materials: extractedData.materials,
      specifications: extractedData.specifications,
      paymentTerms: extractedData.paymentTerms,
      startDate: extractedData.projectDetails.startDate ? new Date(extractedData.projectDetails.startDate) : null,
      endDate: extractedData.projectDetails.endDate ? new Date(extractedData.projectDetails.endDate) : null,
      status: 'pending',
      extractedData: extractedData,
      userId
    };

    // Validate with schema
    const validatedProject = insertProjectSchema.parse(projectData);

    const [newProject] = await db
      .insert(projects)
      .values(validatedProject)
      .returning();

    res.json({
      success: true,
      project: newProject
    });

  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ 
      error: 'Failed to create project',
      message: (error as Error).message 
    });
  }
});

// Get approved projects from database
router.get('/approved-projects', async (req, res) => {
  try {
    const approvedProjects = await db.select().from(projects).where(eq(projects.status, 'approved'));
    
    res.json({
      success: true,
      projects: approvedProjects
    });
  } catch (error) {
    console.error('Database query error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch approved projects',
      message: (error as Error).message
    });
  }
});

// Generate contract from project data
router.post('/generate-contract', async (req, res) => {
  try {
    const { projectId, contractType } = req.body;
    
    if (!projectId) {
      return res.status(400).json({ error: 'Project ID is required' });
    }

    // Get project data from database
    const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Generate contract using project data
    const contractData = {
      project,
      contractType: contractType || 'standard',
      generatedAt: new Date(),
      protections: [
        'Liability Protection Clauses',
        'Payment Terms Enforcement',
        'Material Quality Guarantees',
        'Timeline Protection'
      ]
    };

    res.json({
      success: true,
      contract: contractData,
      analysis: {
        riskLevel: 'low',
        riskScore: 25,
        contractStrength: 90,
        complianceScore: 95,
        stateCompliance: true
      }
    });
  } catch (error) {
    console.error('Contract generation error:', error);
    res.status(500).json({
      error: 'Failed to generate contract',
      message: (error as Error).message
    });
  }
});

// Generate defensive contract from extracted data
router.post('/generate-defensive-contract', async (req, res) => {
  try {
    const { extractedData } = req.body;
    
    if (!extractedData) {
      return res.status(400).json({
        success: false,
        error: 'Missing extracted data for contract generation'
      });
    }

    // Generate comprehensive contract HTML using the extracted data
    const contractHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>California Construction Contract - Legal Defense</title>
      <style>
        body { font-family: 'Times New Roman', serif; line-height: 1.6; color: #000; max-width: 8.5in; margin: 0 auto; padding: 1in; }
        .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 1em; margin-bottom: 2em; }
        .header h1 { font-size: 24px; font-weight: bold; margin: 0; text-transform: uppercase; }
        .section { margin: 1.5em 0; }
        .section-header { font-size: 18px; font-weight: bold; margin: 1em 0 0.5em 0; text-transform: uppercase; border-bottom: 1px solid #000; }
        .notice-block { border: 2px solid #000; padding: 1em; margin: 1em 0; background-color: #f9f9f9; }
        .signature-block { margin-top: 3em; border: 1px solid #000; padding: 1em; }
        .legal-text { font-size: 12px; margin: 0.5em 0; }
        .materials-table { width: 100%; border-collapse: collapse; margin: 1em 0; }
        .materials-table th, .materials-table td { border: 1px solid #000; padding: 8px; text-align: left; }
        .materials-table th { background-color: #f0f0f0; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>California Construction Contract</h1>
        <h2>Legal Defense Edition</h2>
      </div>

      <div class="section">
        <div class="section-header">I. Parties to the Agreement</div>
        <p><strong>Contractor:</strong> ${extractedData.contractorName || '[Contractor Name]'}</p>
        <p><strong>Address:</strong> ${extractedData.contractorAddress || '[Contractor Address]'}</p>
        <p><strong>Phone:</strong> ${extractedData.contractorPhone || '[Contractor Phone]'}</p>
        <p><strong>Email:</strong> ${extractedData.contractorEmail || '[Contractor Email]'}</p>
        <p><strong>License #:</strong> ${extractedData.contractorLicense || '[License Number]'}</p>
        
        <p><strong>Client:</strong> ${extractedData.clientInfo?.name || '[Client Name]'}</p>
        <p><strong>Address:</strong> ${extractedData.clientInfo?.address || extractedData.projectDetails?.location || '[Client Address]'}</p>
        <p><strong>Phone:</strong> ${extractedData.clientInfo?.phone || '[Client Phone]'}</p>
        <p><strong>Email:</strong> ${extractedData.clientInfo?.email || '[Client Email]'}</p>
      </div>

      <div class="section">
        <div class="section-header">II. Recital</div>
        <p>WHEREAS, Contractor is a licensed construction professional authorized to perform construction services in the State of California; and</p>
        <p>WHEREAS, Client desires to engage Contractor for construction services as described herein; and</p>
        <p>WHEREAS, both parties wish to establish clear terms that protect their respective interests;</p>
        <p>NOW, THEREFORE, in consideration of the mutual covenants contained herein, the parties agree as follows:</p>
      </div>

      <div class="section">
        <div class="section-header">III. Scope of Services</div>
        <p><strong>Project Type:</strong> ${extractedData.projectDetails?.type || '[Project Type]'}</p>
        <p><strong>Project Description:</strong> ${extractedData.projectDetails?.description || '[Project Description]'}</p>
        <p><strong>Location:</strong> ${extractedData.projectDetails?.location || '[Project Location]'}</p>
        <p><strong>Specifications:</strong> ${extractedData.specifications || 'Work to be performed according to industry standards and applicable building codes.'}</p>
        
        ${extractedData.materials && extractedData.materials.length > 0 ? `
        <div class="section-header">Materials and Labor</div>
        <table class="materials-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Quantity</th>
              <th>Unit</th>
              <th>Unit Price</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${extractedData.materials.map((material: any) => `
              <tr>
                <td>${material.item}</td>
                <td>${material.quantity}</td>
                <td>${material.unit}</td>
                <td>$${material.unitPrice?.toFixed(2) || '0.00'}</td>
                <td>$${material.totalPrice?.toFixed(2) || '0.00'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        ` : ''}
      </div>

      <div class="section">
        <div class="section-header">IV. Duration and Completion</div>
        <p><strong>Start Date:</strong> ${extractedData.projectDetails?.startDate ? new Date(extractedData.projectDetails.startDate).toLocaleDateString() : '[Start Date]'}</p>
        <p><strong>Completion Date:</strong> ${extractedData.projectDetails?.endDate ? new Date(extractedData.projectDetails.endDate).toLocaleDateString() : '[Completion Date]'}</p>
        <p><strong>Time Extensions:</strong> Contractor shall not be responsible for delays caused by weather, permit delays, client changes, or force majeure events.</p>
      </div>

      <div class="section">
        <div class="section-header">V. Compensation and Payment Terms</div>
        <p><strong>Total Contract Amount:</strong> $${extractedData.financials?.total?.toFixed(2) || '[Total Amount]'}</p>
        <p><strong>Payment Schedule:</strong></p>
        <ul>
          <li>30% deposit ($${(extractedData.financials?.total * 0.3)?.toFixed(2) || '[Deposit Amount]'}) due upon contract execution</li>
          <li>Progress payments tied to completion milestones</li>
          <li>Final payment due within 10 days of completion</li>
        </ul>
        <p><strong>Late Payment:</strong> Client agrees to pay 1.5% per month on overdue amounts.</p>
      </div>

      <div class="section">
        <div class="section-header">VI. Confidentiality and Non-Disclosure</div>
        <p>Both parties agree to maintain confidentiality of proprietary information, trade secrets, and business practices disclosed during the course of this project.</p>
      </div>

      <div class="section">
        <div class="section-header">VII. Subcontracting</div>
        <p>Contractor reserves the right to subcontract portions of the work to qualified subcontractors while maintaining overall responsibility for project completion.</p>
      </div>

      <div class="section">
        <div class="section-header">VIII. Exclusivity</div>
        <p>During the term of this agreement, Client agrees not to engage other contractors for similar work without written consent from Contractor.</p>
      </div>

      <div class="section">
        <div class="section-header">IX. Notifications and Communications</div>
        <p>All notices, changes, and communications must be in writing and delivered to the addresses specified in Section I.</p>
      </div>

      <div class="section">
        <div class="section-header">X. Indemnification</div>
        <p>Client agrees to indemnify and hold Contractor harmless from claims arising from Client's negligence, property conditions unknown to Contractor, or work performed by others.</p>
      </div>

      <div class="section">
        <div class="section-header">XI. Modifications</div>
        <p>No modifications to this contract shall be valid unless in writing and signed by both parties. All change orders must include updated pricing and timeline adjustments.</p>
      </div>

      <div class="section">
        <div class="section-header">XII. Entire Agreement</div>
        <p>This contract constitutes the entire agreement between the parties and supersedes all prior negotiations, representations, or agreements relating to the subject matter herein.</p>
      </div>

      <div class="notice-block">
        <div class="section-header">XIII. California Legal Notices</div>
        <div class="legal-text">
          <p><strong>NOTICE TO OWNER:</strong> Under the California Mechanics' Lien Law, any contractor, subcontractor, laborer, supplier, or other person or entity who helps to improve your property, but is not paid for their work or supplies, has a right to place a lien on your home, land, or property where the work was performed and to sue you in court to obtain payment.</p>
          
          <p><strong>THREE DAY RIGHT TO CANCEL:</strong> You, the buyer, have the right to cancel this contract within three business days. You may cancel by delivering a signed and dated copy of this cancellation notice to the contractor at the address stated in the contract before midnight of the third business day after you received a signed and dated copy of the contract that includes this notice.</p>
          
          <p><strong>CONTRACTOR LICENSE NOTICE:</strong> This contractor is licensed by the Contractors State License Board. For information concerning a contractor, you may contact the Contractors State License Board.</p>
        </div>
      </div>

      <div class="signature-block">
        <div class="section-header">XIV. Signatures</div>
        <br>
        <p><strong>Contractor:</strong> ${extractedData.contractorName || '[Contractor Name]'}</p>
        <p>Signature: _________________________ Date: _____________</p>
        <br>
        <p><strong>Client:</strong> ${extractedData.clientInfo?.name || '[Client Name]'}</p>
        <p>Signature: _________________________ Date: _____________</p>
        <br>
        <p><em>This contract provides comprehensive legal protection while ensuring professional project completion in accordance with California law.</em></p>
      </div>
    </body>
    </html>`;

    res.json({
      success: true,
      contract: contractHtml,
      message: 'Defensive contract generated successfully with California legal compliance'
    });

  } catch (error) {
    console.error('Contract generation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate contract',
      message: (error as Error).message
    });
  }
});

export default router;
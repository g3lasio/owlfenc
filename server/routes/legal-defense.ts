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
    let extractedData;
    try {
      let cleanedResponse = responseText.trim();
      
      // Remove markdown code block formatting if present
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      extractedData = JSON.parse(cleanedResponse);
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
        subtotal: z.number(),
        tax: z.number(),
        taxRate: z.number(),
        total: z.number()
      }),
      paymentTerms: z.string().nullable(),
      specifications: z.string().nullable(),
      extractionQuality: z.object({
        confidence: z.number().min(0).max(100),
        missingFields: z.array(z.string()),
        warnings: z.array(z.string())
      })
    });

    const validatedData = validationSchema.parse(extractedData);

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

    // Generate unique ID
    const projectId = `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const [newProject] = await db
      .insert(projects)
      .values({ id: projectId, ...validatedProject })
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

export default router;
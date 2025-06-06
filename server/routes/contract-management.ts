/**
 * Contract Management Routes - Save contracts and generate PDFs
 */

import { Router } from 'express';
import puppeteer from 'puppeteer';
import { db } from '../db';
import { contracts } from '../../shared/schema';

const router = Router();

// Save contract to history
router.post('/save', async (req, res) => {
  try {
    const { contractData, name, status = 'generated' } = req.body;

    if (!contractData || !name) {
      return res.status(400).json({ 
        error: 'Missing required fields: contractData and name' 
      });
    }

    // Save to database
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
router.post('/generate-pdf', async (req, res) => {
  let browser;
  
  try {
    const { contractHtml, contractData, fileName = 'contract.pdf' } = req.body;

    if (!contractHtml) {
      return res.status(400).json({ 
        error: 'Missing required field: contractHtml' 
      });
    }

    // Launch Puppeteer
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    // Create complete HTML document for PDF generation
    const fullHtml = `
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
            padding: 1in;
            background: white;
          }
          .contract-header {
            text-align: center;
            margin-bottom: 2em;
            border-bottom: 2px solid #000;
            padding-bottom: 1em;
          }
          .contract-header h1 {
            font-size: 24px;
            font-weight: bold;
            margin: 0;
            text-transform: uppercase;
          }
          .parties-section {
            margin: 2em 0;
          }
          .section-header {
            font-size: 18px;
            font-weight: bold;
            margin: 1.5em 0 0.5em 0;
            text-transform: uppercase;
            border-bottom: 1px solid #000;
            padding-bottom: 0.2em;
          }
          .notice-block {
            border: 2px solid #000;
            padding: 1em;
            margin: 1em 0;
            background-color: #f9f9f9;
          }
          .signature-block {
            margin-top: 3em;
            border: 1px solid #000;
            padding: 1em;
          }
          .signature-area {
            border-bottom: 1px solid #000;
            height: 2em;
            margin: 1em 0;
          }
          .legal-text {
            font-size: 12px;
            margin: 0.5em 0;
          }
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

    // Set content and generate PDF
    await page.setContent(fullHtml, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '1in',
        right: '1in',
        bottom: '1in',
        left: '1in'
      },
      displayHeaderFooter: true,
      headerTemplate: `
        <div style="font-size: 10px; text-align: center; width: 100%; margin: 0 1in;">
          <span>Construction Contract - ${contractData?.clientName || 'Client Name'}</span>
        </div>
      `,
      footerTemplate: `
        <div style="font-size: 10px; text-align: center; width: 100%; margin: 0 1in;">
          <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span> - Generated on ${new Date().toLocaleDateString()}</span>
        </div>
      `
    });

    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    // Send PDF buffer
    res.send(pdfBuffer);

  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({ 
      error: 'Failed to generate PDF',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
});

// Get contract history
router.get('/history', async (req, res) => {
  try {
    const contractHistory = await db.select().from(contracts).orderBy(contracts.createdAt);
    
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
/**
 * Professional PDF Generation Service using Puppeteer
 * 
 * This service generates high-quality PDF estimates using the professional template
 * directly with Puppeteer, eliminating dependency on external services.
 */

import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';

interface EstimateData {
  company: {
    name: string;
    address?: string;
    phone?: string;
    email?: string;
    website?: string;
    logo?: string;
  };
  estimate: {
    number?: string;
    date?: string;
    valid_until?: string;
    project_description?: string;
    items: Array<{
      code: string;
      description: string;
      qty: number | string;
      unit_price: string;
      total: string;
    }>;
    subtotal?: string;
    discounts?: string;
    tax_rate?: number;
    tax_amount?: string;
    total?: string;
  };
  client: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
  };
}

export class PuppeteerPdfService {
  private templatePath: string;
  
  constructor() {
    this.templatePath = path.join(process.cwd(), 'server', 'templates', 'professional-estimate.html');
  }

  /**
   * Initialize the service and ensure template exists
   */
  async initialize(): Promise<void> {
    try {
      await this.ensureTemplateExists();
      console.log('✅ PuppeteerPdfService initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize PuppeteerPdfService:', error);
      throw error;
    }
  }

  /**
   * Generate PDF from estimate data
   */
  async generatePdf(data: EstimateData): Promise<Buffer> {
    console.log('🔄 Starting PDF generation with Puppeteer...');
    
    let browser;
    try {
      // Use the confirmed Chromium executable path
      const executablePath = '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium';
      
      console.log('🔍 Using Chromium executable:', executablePath);

      // Launch browser
      browser = await puppeteer.launch({
        headless: true,
        executablePath,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu',
          '--disable-extensions',
          '--disable-plugins'
        ]
      });

      const page = await browser.newPage();
      
      // Set viewport for consistent rendering
      await page.setViewport({
        width: 1200,
        height: 1600,
        deviceScaleFactor: 2
      });

      // Generate HTML from template
      const html = await this.renderTemplate(data);
      console.log('📝 Generated HTML length:', html.length);
      console.log('📋 Template data being used:', {
        companyName: data.company?.name || 'NO_COMPANY',
        clientName: data.client?.name || 'NO_CLIENT', 
        itemsCount: data.estimate?.items?.length || 0,
        subtotal: data.estimate?.subtotal || 'NO_SUBTOTAL',
        total: data.estimate?.total || 'NO_TOTAL'
      });
      
      // Set content and wait for fonts/images to load
      await page.setContent(html, {
        waitUntil: ['networkidle0', 'domcontentloaded'],
        timeout: 30000
      });
      
      console.log('🌐 Page content set successfully');

      // Add custom CSS for better PDF rendering
      await page.addStyleTag({
        content: `
          @media print {
            html, body {
              width: 8.5in;
              height: 11in;
              margin: 0;
              padding: 0;
              background: white !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            
            .thank-you-card {
              background: #2d3748 !important;
              color: #00FFB8 !important;
            }
            
            .items-table thead {
              background: #00FFB8 !important;
            }
            
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
          }
        `
      });

      // Generate PDF
      const pdfBuffer = await page.pdf({
        format: 'Letter',
        margin: {
          top: '0.75in',
          right: '0.75in',
          bottom: '0.75in',
          left: '0.75in'
        },
        printBackground: true,
        preferCSSPageSize: true,
        displayHeaderFooter: false
      });

      console.log(`✅ PDF generated successfully - Size: ${pdfBuffer.length} bytes`);
      
      // Additional validation
      if (pdfBuffer.length < 1000) {
        console.warn('⚠️ PDF seems too small, might be corrupted');
      }
      
      return pdfBuffer;

    } catch (error) {
      console.error('❌ PDF generation failed:', error);
      throw new Error(`PDF generation failed: ${error.message}`);
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  /**
   * Render HTML template with data
   */
  private async renderTemplate(data: EstimateData): Promise<string> {
    try {
      const template = await fs.readFile(this.templatePath, 'utf-8');
      
      // Simple template engine - replace Handlebars-style variables
      let html = template;
      
      // Replace company data
      html = html.replace(/\{\{company\.name\}\}/g, data.company.name || '');
      html = html.replace(/\{\{company\.address\}\}/g, data.company.address || '');
      html = html.replace(/\{\{company\.phone\}\}/g, data.company.phone || '');
      html = html.replace(/\{\{company\.email\}\}/g, data.company.email || '');
      html = html.replace(/\{\{company\.website\}\}/g, data.company.website || '');
      html = html.replace(/\{\{company\.logo\}\}/g, data.company.logo || '');
      
      // Replace estimate data
      html = html.replace(/\{\{estimate\.number\}\}/g, data.estimate.number || `EST-${Date.now().toString().slice(-6)}`);
      html = html.replace(/\{\{estimate\.date\}\}/g, data.estimate.date || new Date().toLocaleDateString('en-US'));
      html = html.replace(/\{\{estimate\.valid_until\}\}/g, data.estimate.valid_until || this.getValidUntilDate());
      html = html.replace(/\{\{estimate\.project_description\}\}/g, data.estimate.project_description || '');
      html = html.replace(/\{\{estimate\.subtotal\}\}/g, data.estimate.subtotal || '');
      html = html.replace(/\{\{estimate\.discounts\}\}/g, data.estimate.discounts || '');
      html = html.replace(/\{\{estimate\.tax_rate\}\}/g, data.estimate.tax_rate?.toString() || '');
      html = html.replace(/\{\{estimate\.tax_amount\}\}/g, data.estimate.tax_amount || '');
      html = html.replace(/\{\{estimate\.total\}\}/g, data.estimate.total || '');
      
      // Replace client data
      html = html.replace(/\{\{client\.name\}\}/g, data.client.name || '');
      html = html.replace(/\{\{client\.email\}\}/g, data.client.email || '');
      html = html.replace(/\{\{client\.phone\}\}/g, data.client.phone || '');
      html = html.replace(/\{\{client\.address\}\}/g, data.client.address || '');
      
      // Handle conditional blocks
      html = this.handleConditionals(html, data);
      
      // Handle items loop
      html = this.handleItemsLoop(html, data.estimate.items);
      
      return html;
    } catch (error) {
      console.error('❌ Template rendering failed:', error);
      throw new Error(`Template rendering failed: ${error.message}`);
    }
  }

  /**
   * Handle conditional {{#if}} blocks
   */
  private handleConditionals(html: string, data: EstimateData): string {
    // Company conditionals
    html = this.processConditional(html, 'company.address', !!data.company.address);
    html = this.processConditional(html, 'company.phone', !!data.company.phone);
    html = this.processConditional(html, 'company.email', !!data.company.email);
    html = this.processConditional(html, 'company.website', !!data.company.website);
    html = this.processConditional(html, 'company.logo', !!data.company.logo);
    
    // Estimate conditionals
    html = this.processConditional(html, 'estimate.number', !!data.estimate.number);
    html = this.processConditional(html, 'estimate.date', !!data.estimate.date);
    html = this.processConditional(html, 'estimate.valid_until', !!data.estimate.valid_until);
    html = this.processConditional(html, 'estimate.project_description', !!data.estimate.project_description);
    html = this.processConditional(html, 'estimate.subtotal', !!data.estimate.subtotal);
    html = this.processConditional(html, 'estimate.discounts', !!data.estimate.discounts);
    html = this.processConditional(html, 'estimate.tax_amount', !!data.estimate.tax_amount);
    html = this.processConditional(html, 'estimate.total', !!data.estimate.total);
    html = this.processConditional(html, 'estimate.items', data.estimate.items && data.estimate.items.length > 0);
    
    // Client conditionals
    html = this.processConditional(html, 'client.phone', !!data.client.phone);
    html = this.processConditional(html, 'client.email', !!data.client.email);
    html = this.processConditional(html, 'client.address', !!data.client.address);
    
    return html;
  }

  /**
   * Process a single conditional block
   */
  private processConditional(html: string, condition: string, isTrue: boolean): string {
    const ifRegex = new RegExp(`\\{\\{#if\\s+${condition.replace(/\./g, '\\.')}\\}\\}([\\s\\S]*?)\\{\\{/if\\}\\}`, 'g');
    const elseRegex = new RegExp(`\\{\\{#if\\s+${condition.replace(/\./g, '\\.')}\\}\\}([\\s\\S]*?)\\{\\{else\\}\\}([\\s\\S]*?)\\{\\{/if\\}\\}`, 'g');
    
    if (isTrue) {
      // Show content, remove else part if exists
      html = html.replace(elseRegex, '$1');
      html = html.replace(ifRegex, '$1');
    } else {
      // Show else content if exists, otherwise remove entire block
      html = html.replace(elseRegex, '$2');
      html = html.replace(ifRegex, '');
    }
    
    return html;
  }

  /**
   * Handle {{#each estimate.items}} loop
   */
  private handleItemsLoop(html: string, items: EstimateData['estimate']['items']): string {
    const loopRegex = /\{\{#each estimate\.items\}\}([\s\S]*?)\{\{\/each\}\}/g;
    const elseRegex = /\{\{#each estimate\.items\}\}([\s\S]*?)\{\{else\}\}([\s\S]*?)\{\{\/each\}\}/g;
    
    if (items && items.length > 0) {
      // Generate rows for each item
      html = html.replace(loopRegex, (match, template) => {
        return items.map(item => {
          let row = template;
          row = row.replace(/\{\{code\}\}/g, item.code || '');
          row = row.replace(/\{\{description\}\}/g, item.description || '');
          row = row.replace(/\{\{qty\}\}/g, item.qty?.toString() || '');
          row = row.replace(/\{\{unit_price\}\}/g, item.unit_price || '');
          row = row.replace(/\{\{total\}\}/g, item.total || '');
          return row;
        }).join('');
      });
    } else {
      // Show else content if no items
      html = html.replace(elseRegex, '$2');
      html = html.replace(loopRegex, '');
    }
    
    return html;
  }

  /**
   * Ensure template file exists
   */
  private async ensureTemplateExists(): Promise<void> {
    try {
      const templateDir = path.dirname(this.templatePath);
      await fs.mkdir(templateDir, { recursive: true });
      
      // Check if template exists
      try {
        await fs.access(this.templatePath);
        console.log('✅ Template file found');
      } catch {
        // Create template file
        console.log('📝 Creating template file...');
        await this.createTemplateFile();
      }
    } catch (error) {
      throw new Error(`Failed to ensure template exists: ${error.message}`);
    }
  }

  /**
   * Create template file with professional design
   */
  private async createTemplateFile(): Promise<void> {
    const templateContent = await fs.readFile(
      path.join(process.cwd(), 'professional_estimate_template.html'), 
      'utf-8'
    );
    
    await fs.writeFile(this.templatePath, templateContent, 'utf-8');
    console.log('✅ Template file created successfully');
  }
}

// Export instance
export const puppeteerPdfService = new PuppeteerPdfService();
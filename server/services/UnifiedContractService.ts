/**
 * UnifiedContractService - Single source of truth for contract generation
 * 
 * Architecture:
 * - ONE service, ONE flow, ZERO fallbacks in frontend
 * - Uses ModernPdfService with browser pool
 * - Built-in watchdog for hang detection
 * - Single 30-second timeout for entire operation
 * - Health gating before generation
 */

import { modernPdfService } from './ModernPdfService';

interface ContractData {
  client: {
    name: string;
    address?: string;
    email?: string;
    phone?: string;
  };
  contractor: {
    name: string;
    company?: string;
    address?: string;
    email?: string;
    phone?: string;
    license?: string;
  };
  project: {
    type?: string;
    description?: string;
    location?: string;
  };
  financials: {
    total: number;
    paymentMilestones?: Array<{
      description: string;
      percentage: number;
      amount: number;
    }>;
  };
  timeline?: {
    startDate?: string;
    endDate?: string;
    completionDate?: string;
  };
  permitInfo?: any;
  warranties?: any;
  protectionClauses?: Array<{ title: string; content: string }>;
  paymentTerms?: any;
  jurisdiction?: any;
  templateId?: string;
  changeOrder?: any;
  addendum?: any;
  workOrder?: any;
  lienWaiver?: any;
  completion?: any;
  warranty?: any;
}

interface GenerationResult {
  success: boolean;
  html?: string;
  pdfBuffer?: Buffer;
  contractId?: string;
  generatedAt?: string;
  error?: string;
  metrics?: {
    htmlGenerationMs: number;
    pdfGenerationMs: number;
    totalMs: number;
  };
}

class UnifiedContractService {
  private static instance: UnifiedContractService;
  private readonly TOTAL_TIMEOUT = 30000; // 30 seconds max for entire operation
  private lastHealthCheck: { healthy: boolean; timestamp: number } | null = null;
  private readonly HEALTH_CACHE_MS = 60000; // Cache health for 1 minute
  private consecutiveFailures = 0;
  private readonly MAX_FAILURES_BEFORE_RECYCLE = 3;

  private constructor() {
    console.log('🚀 [UNIFIED-CONTRACT] Service initialized');
  }

  static getInstance(): UnifiedContractService {
    if (!UnifiedContractService.instance) {
      UnifiedContractService.instance = new UnifiedContractService();
    }
    return UnifiedContractService.instance;
  }

  /**
   * Fast health check with caching
   */
  async isHealthy(): Promise<boolean> {
    const now = Date.now();
    
    if (this.lastHealthCheck && (now - this.lastHealthCheck.timestamp) < this.HEALTH_CACHE_MS) {
      return this.lastHealthCheck.healthy;
    }

    try {
      const health = await modernPdfService.healthCheck();
      this.lastHealthCheck = { healthy: health.healthy, timestamp: now };
      
      if (health.healthy) {
        this.consecutiveFailures = 0;
      }
      
      return health.healthy;
    } catch (error) {
      console.error('❌ [UNIFIED-CONTRACT] Health check failed:', error);
      this.lastHealthCheck = { healthy: false, timestamp: now };
      return false;
    }
  }

  /**
   * Recycle browser pool after multiple failures
   */
  private async recycleBrowserPool(): Promise<void> {
    console.log('🔄 [UNIFIED-CONTRACT] Recycling browser pool after failures...');
    try {
      await modernPdfService.shutdown();
      this.lastHealthCheck = null;
      this.consecutiveFailures = 0;
      console.log('✅ [UNIFIED-CONTRACT] Browser pool recycled');
    } catch (error) {
      console.error('❌ [UNIFIED-CONTRACT] Failed to recycle browser pool:', error);
    }
  }

  /**
   * Generate HTML from contract data using existing template logic
   */
  private async generateHtml(data: ContractData): Promise<string> {
    const templateId = data.templateId;
    
    if (templateId && templateId !== 'independent-contractor') {
      const { templateService } = await import('../templates/templateService');
      
      const templateData = {
        client: data.client,
        contractor: data.contractor,
        project: data.project,
        financials: data.financials,
        changeOrder: data.changeOrder,
        addendum: data.addendum,
        workOrder: data.workOrder,
        lienWaiver: data.lienWaiver,
        completion: data.completion,
        warranty: data.warranty,
      };
      
      const branding = {
        companyName: data.contractor?.company || data.contractor?.name,
        address: data.contractor?.address,
        phone: data.contractor?.phone,
        email: data.contractor?.email,
        licenseNumber: data.contractor?.license,
      };
      
      const result = await templateService.generateDocument(templateId, templateData as any, branding);
      
      if (!result.success || !result.html) {
        throw new Error(result.error || `Template ${templateId} generation failed`);
      }
      
      return result.html;
    } else {
      const { default: PremiumPdfService } = await import('./premiumPdfService');
      const premiumPdfService = PremiumPdfService.getInstance();
      
      return premiumPdfService.generateProfessionalLegalContractHTML({
        client: {
          name: data.client.name,
          address: data.client.address || '',
          phone: data.client.phone || '',
          email: data.client.email || '',
        },
        contractor: {
          name: data.contractor.name,
          address: data.contractor.address || '',
          phone: data.contractor.phone || '',
          email: data.contractor.email || '',
        },
        project: {
          type: data.project?.type || 'Construction',
          description: data.project?.description || '',
          location: data.project?.location || data.client.address || '',
        },
        financials: data.financials,
        timeline: data.timeline ? {
          startDate: data.timeline.startDate || '',
          endDate: data.timeline.endDate || data.timeline.completionDate || '',
        } : undefined,
        permitInfo: data.permitInfo,
        warranties: data.warranties,
        protectionClauses: data.protectionClauses || [],
        jurisdiction: data.jurisdiction,
      } as any);
    }
  }

  /**
   * Main generation method with timeout and watchdog
   */
  async generateContract(data: ContractData, options?: { pdfOnly?: boolean }): Promise<GenerationResult> {
    const startTime = Date.now();
    const contractId = `CON-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
    
    console.log(`📋 [UNIFIED-CONTRACT] Starting generation for ${contractId}`);
    console.log(`📋 [UNIFIED-CONTRACT] Template: ${data.templateId || 'independent-contractor'}`);

    // Clearable timeout to prevent unhandled rejections after success
    let timeoutId: NodeJS.Timeout | null = null;
    
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error('TIMEOUT: Contract generation exceeded 30 seconds'));
      }, this.TOTAL_TIMEOUT);
    });

    try {
      const result = await Promise.race([
        this.executeGeneration(data, contractId, options),
        timeoutPromise
      ]);

      // CRITICAL: Clear timeout on success to prevent unhandled rejection
      if (timeoutId) clearTimeout(timeoutId);

      const totalMs = Date.now() - startTime;
      console.log(`✅ [UNIFIED-CONTRACT] Generation complete in ${totalMs}ms`);

      return {
        ...result,
        metrics: {
          ...result.metrics!,
          totalMs
        }
      };
    } catch (error) {
      // Clear timeout on error too
      if (timeoutId) clearTimeout(timeoutId);
      
      const errorMessage = (error as Error).message;
      console.error(`❌ [UNIFIED-CONTRACT] Generation failed:`, errorMessage);

      this.consecutiveFailures++;
      
      if (this.consecutiveFailures >= this.MAX_FAILURES_BEFORE_RECYCLE) {
        console.log(`🚨 [UNIFIED-CONTRACT] ${this.consecutiveFailures} consecutive failures - triggering recycle`);
        await this.recycleBrowserPool();
      }

      return {
        success: false,
        error: errorMessage,
        contractId,
        generatedAt: new Date().toISOString(),
        metrics: {
          htmlGenerationMs: 0,
          pdfGenerationMs: 0,
          totalMs: Date.now() - startTime
        }
      };
    }
  }

  /**
   * Execute the actual generation (called within timeout wrapper)
   */
  private async executeGeneration(
    data: ContractData, 
    contractId: string,
    options?: { pdfOnly?: boolean }
  ): Promise<GenerationResult> {
    const htmlStart = Date.now();
    
    // Step 1: Generate HTML
    const html = await this.generateHtml(data);
    const htmlMs = Date.now() - htmlStart;
    console.log(`📄 [UNIFIED-CONTRACT] HTML generated in ${htmlMs}ms (${html.length} chars)`);

    // Step 2: Generate PDF from HTML
    const pdfStart = Date.now();
    const pdfResult = await modernPdfService.generateContractPdf(html, contractId);
    const pdfMs = Date.now() - pdfStart;
    
    if (!pdfResult.success || !pdfResult.buffer) {
      throw new Error(pdfResult.error || 'PDF generation failed');
    }

    console.log(`📄 [UNIFIED-CONTRACT] PDF generated in ${pdfMs}ms (${pdfResult.buffer.length} bytes)`);

    this.consecutiveFailures = 0;

    return {
      success: true,
      html: options?.pdfOnly ? undefined : html,
      pdfBuffer: pdfResult.buffer,
      contractId,
      generatedAt: new Date().toISOString(),
      metrics: {
        htmlGenerationMs: htmlMs,
        pdfGenerationMs: pdfMs,
        totalMs: htmlMs + pdfMs
      }
    };
  }

  /**
   * Generate HTML only (for preview/display)
   */
  async generateHtmlOnly(data: ContractData): Promise<GenerationResult> {
    const startTime = Date.now();
    const contractId = `CON-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;

    try {
      const html = await this.generateHtml(data);
      const totalMs = Date.now() - startTime;

      return {
        success: true,
        html,
        contractId,
        generatedAt: new Date().toISOString(),
        metrics: {
          htmlGenerationMs: totalMs,
          pdfGenerationMs: 0,
          totalMs
        }
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
        contractId,
        generatedAt: new Date().toISOString(),
        metrics: {
          htmlGenerationMs: 0,
          pdfGenerationMs: 0,
          totalMs: Date.now() - startTime
        }
      };
    }
  }

  /**
   * Get service status
   */
  getStatus(): { consecutiveFailures: number; lastHealthCheck: any } {
    return {
      consecutiveFailures: this.consecutiveFailures,
      lastHealthCheck: this.lastHealthCheck
    };
  }
}

export const unifiedContractService = UnifiedContractService.getInstance();
export { UnifiedContractService, ContractData, GenerationResult };

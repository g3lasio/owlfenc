/**
 * Native PDF Engine Tests - Phase 1 & Phase 2
 * 
 * Tests for all PDF generation functionality using the native engine
 * without Puppeteer/Chromium dependencies.
 */

import { nativePdfEngine } from '../services/NativePdfEngine';

// Test data for estimates
const testEstimateData = {
  company: {
    name: 'Test Construction LLC',
    address: '123 Main Street, Los Angeles, CA 90001',
    phone: '(555) 123-4567',
    email: 'info@testconstruction.com',
    license: 'CSLB #123456'
  },
  estimate: {
    number: 'EST-2025-001',
    date: '12/25/2025',
    valid_until: '01/25/2026',
    project_description: 'Complete kitchen remodel including new cabinets, countertops, flooring, and appliances.',
    items: [
      { code: 'CAB-001', description: 'Custom Cabinets', qty: 1, unit_price: '$5,500.00', total: '$5,500.00' },
      { code: 'CTR-002', description: 'Granite Countertops', qty: 25, unit_price: '$85.00', total: '$2,125.00' },
      { code: 'FLR-003', description: 'Tile Flooring Installation', qty: 150, unit_price: '$12.50', total: '$1,875.00' },
      { code: 'APP-004', description: 'Appliance Package', qty: 1, unit_price: '$3,200.00', total: '$3,200.00' },
      { code: 'LBR-005', description: 'Labor', qty: 40, unit_price: '$75.00', total: '$3,000.00' }
    ],
    subtotal: '$15,700.00',
    discounts: '$500.00',
    tax_rate: 8.25,
    tax_amount: '$1,253.90',
    total: '$16,453.90'
  },
  client: {
    name: 'John Smith',
    email: 'john.smith@email.com',
    phone: '(555) 987-6543',
    address: '456 Oak Avenue, Los Angeles, CA 90002'
  }
};

// Test data for invoices
const testInvoiceData = {
  company: {
    name: 'Test Construction LLC',
    address: '123 Main Street, Los Angeles, CA 90001',
    phone: '(555) 123-4567',
    email: 'info@testconstruction.com'
  },
  invoice: {
    number: 'INV-2025-001',
    date: '12/25/2025',
    due_date: '01/25/2026',
    items: [
      { code: 'CAB-001', description: 'Custom Cabinets', qty: 1, unit_price: '$5,500.00', total: '$5,500.00' },
      { code: 'CTR-002', description: 'Granite Countertops', qty: 25, unit_price: '$85.00', total: '$2,125.00' },
      { code: 'FLR-003', description: 'Tile Flooring Installation', qty: 150, unit_price: '$12.50', total: '$1,875.00' }
    ],
    subtotal: '$9,500.00',
    discounts: '$200.00',
    tax_rate: 8.25,
    tax_amount: '$767.25',
    total: '$10,067.25'
  },
  client: {
    name: 'John Smith',
    email: 'john.smith@email.com',
    phone: '(555) 987-6543',
    address: '456 Oak Avenue, Los Angeles, CA 90002'
  },
  invoiceConfig: {
    projectCompleted: true,
    totalAmountPaid: false,
    downPaymentAmount: '$3,000.00'
  }
};

// Test data for Legal Defense templates
const testContractHtml = `
<!DOCTYPE html>
<html>
<head><title>Test Contract</title></head>
<body>
  <h1 class="contract-title">LIEN WAIVER</h1>
  <div class="document-info">
    <div class="info-row">
      <span class="info-label">Document ID:</span>
      <span class="info-value">LW-2025-001</span>
    </div>
  </div>
  <div class="parties-section">
    <div class="party-column">
      <div class="party-title">Contractor</div>
      <div>Test Construction LLC</div>
    </div>
    <div class="party-column">
      <div class="party-title">Owner</div>
      <div>John Smith</div>
    </div>
  </div>
  <p>This is a test lien waiver document for PDF generation testing.</p>
  <div class="signature-section">
    <div class="signature-line">Contractor Signature</div>
    <div class="signature-line">Owner Signature</div>
  </div>
</body>
</html>
`;

describe('NativePdfEngine', () => {
  
  describe('Health Check', () => {
    it('should pass health check', async () => {
      const result = await nativePdfEngine.healthCheck();
      
      expect(result.healthy).toBe(true);
      expect(result.details.engine).toBe('NativePdfEngine');
      expect(result.details.noBrowserRequired).toBe(true);
      expect(result.details.pdfGenerated).toBe(true);
    });
  });

  describe('Phase 1: Legal Defense Templates', () => {
    
    it('should generate PDF from HTML (lien waiver style)', async () => {
      const result = await nativePdfEngine.generateFromHtml(testContractHtml);
      
      expect(result.success).toBe(true);
      expect(result.buffer).toBeDefined();
      expect(result.buffer!.length).toBeGreaterThan(0);
      expect(result.processingTime).toBeLessThan(500); // Should be very fast
      expect(result.method).toBe('native-pdf-lib');
      
      // Verify it's a valid PDF
      const pdfHeader = result.buffer!.slice(0, 4).toString();
      expect(pdfHeader).toBe('%PDF');
    });

    it('should generate contract PDF', async () => {
      const result = await nativePdfEngine.generateContractPdf(testContractHtml);
      
      expect(result.success).toBe(true);
      expect(result.buffer).toBeDefined();
      expect(result.pageCount).toBeGreaterThanOrEqual(1);
    });

    it('should generate lien waiver PDF', async () => {
      const result = await nativePdfEngine.generateLienWaiverPdf(testContractHtml);
      
      expect(result.success).toBe(true);
      expect(result.buffer).toBeDefined();
    });

    it('should generate change order PDF', async () => {
      const changeOrderHtml = `
        <!DOCTYPE html>
        <html>
        <body>
          <h1>CHANGE ORDER</h1>
          <h2>Change Order #CO-001</h2>
          <div class="change-box">
            <p>Original Contract Amount: $50,000</p>
            <p>Change Amount: $5,000</p>
            <p>New Total: $55,000</p>
          </div>
          <div class="signature-section"></div>
        </body>
        </html>
      `;
      
      const result = await nativePdfEngine.generateChangeOrderPdf(changeOrderHtml);
      
      expect(result.success).toBe(true);
      expect(result.buffer).toBeDefined();
    });
  });

  describe('Phase 2: Estimate PDF', () => {
    
    it('should generate estimate PDF from structured data', async () => {
      const result = await nativePdfEngine.generateEstimatePdf(testEstimateData);
      
      expect(result.success).toBe(true);
      expect(result.buffer).toBeDefined();
      expect(result.buffer!.length).toBeGreaterThan(0);
      expect(result.method).toBe('native-estimate-direct');
      expect(result.pageCount).toBeGreaterThanOrEqual(1);
      
      // Performance check - should be under 200ms
      expect(result.processingTime).toBeLessThan(200);
      
      // Verify valid PDF
      const pdfHeader = result.buffer!.slice(0, 4).toString();
      expect(pdfHeader).toBe('%PDF');
    });

    it('should handle estimate with minimal data', async () => {
      const minimalData = {
        company: { name: 'Minimal Corp' },
        estimate: {
          items: [
            { description: 'Service', qty: 1, unit_price: '$100.00', total: '$100.00' }
          ],
          total: '$100.00'
        },
        client: { name: 'Test Client' }
      };
      
      const result = await nativePdfEngine.generateEstimatePdf(minimalData);
      
      expect(result.success).toBe(true);
      expect(result.buffer).toBeDefined();
    });

    it('should handle estimate with many items (multi-page)', async () => {
      const manyItems = Array.from({ length: 30 }, (_, i) => ({
        code: `ITEM-${i + 1}`,
        description: `Line item number ${i + 1} with a detailed description`,
        qty: i + 1,
        unit_price: '$100.00',
        total: `$${(i + 1) * 100}.00`
      }));
      
      const multiPageData = {
        ...testEstimateData,
        estimate: {
          ...testEstimateData.estimate,
          items: manyItems
        }
      };
      
      const result = await nativePdfEngine.generateEstimatePdf(multiPageData);
      
      expect(result.success).toBe(true);
      expect(result.pageCount).toBeGreaterThan(1);
    });
  });

  describe('Phase 2: Invoice PDF', () => {
    
    it('should generate invoice PDF from structured data', async () => {
      const result = await nativePdfEngine.generateInvoicePdf(testInvoiceData);
      
      expect(result.success).toBe(true);
      expect(result.buffer).toBeDefined();
      expect(result.buffer!.length).toBeGreaterThan(0);
      expect(result.method).toBe('native-invoice-direct');
      
      // Performance check
      expect(result.processingTime).toBeLessThan(200);
      
      // Verify valid PDF
      const pdfHeader = result.buffer!.slice(0, 4).toString();
      expect(pdfHeader).toBe('%PDF');
    });

    it('should handle invoice with full payment', async () => {
      const paidInvoice = {
        ...testInvoiceData,
        invoiceConfig: {
          projectCompleted: true,
          totalAmountPaid: true
        }
      };
      
      const result = await nativePdfEngine.generateInvoicePdf(paidInvoice);
      
      expect(result.success).toBe(true);
      expect(result.buffer).toBeDefined();
    });

    it('should handle invoice with no payment config', async () => {
      const noConfigInvoice = {
        company: testInvoiceData.company,
        invoice: testInvoiceData.invoice,
        client: testInvoiceData.client
      };
      
      const result = await nativePdfEngine.generateInvoicePdf(noConfigInvoice);
      
      expect(result.success).toBe(true);
    });
  });

  describe('Performance Benchmarks', () => {
    
    it('should generate estimate PDF in under 100ms average', async () => {
      const iterations = 5;
      const times: number[] = [];
      
      for (let i = 0; i < iterations; i++) {
        const result = await nativePdfEngine.generateEstimatePdf(testEstimateData);
        expect(result.success).toBe(true);
        times.push(result.processingTime);
      }
      
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      console.log(`Average estimate PDF time: ${avgTime.toFixed(2)}ms`);
      
      expect(avgTime).toBeLessThan(100);
    });

    it('should generate invoice PDF in under 100ms average', async () => {
      const iterations = 5;
      const times: number[] = [];
      
      for (let i = 0; i < iterations; i++) {
        const result = await nativePdfEngine.generateInvoicePdf(testInvoiceData);
        expect(result.success).toBe(true);
        times.push(result.processingTime);
      }
      
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      console.log(`Average invoice PDF time: ${avgTime.toFixed(2)}ms`);
      
      expect(avgTime).toBeLessThan(100);
    });

    it('should generate legal defense PDF in under 100ms average', async () => {
      const iterations = 5;
      const times: number[] = [];
      
      for (let i = 0; i < iterations; i++) {
        const result = await nativePdfEngine.generateFromHtml(testContractHtml);
        expect(result.success).toBe(true);
        times.push(result.processingTime);
      }
      
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      console.log(`Average legal defense PDF time: ${avgTime.toFixed(2)}ms`);
      
      expect(avgTime).toBeLessThan(100);
    });
  });

  describe('Error Handling', () => {
    
    it('should handle empty HTML gracefully', async () => {
      const result = await nativePdfEngine.generateFromHtml('');
      
      // Should still generate a minimal PDF
      expect(result.success).toBe(true);
    });

    it('should handle malformed HTML', async () => {
      const malformedHtml = '<html><body><div>Unclosed div<p>Nested wrong</body>';
      
      const result = await nativePdfEngine.generateFromHtml(malformedHtml);
      
      // Should still generate something
      expect(result.success).toBe(true);
    });

    it('should handle estimate with empty items array', async () => {
      const emptyItems = {
        company: { name: 'Test Corp' },
        estimate: { items: [], total: '$0.00' },
        client: { name: 'Client' }
      };
      
      const result = await nativePdfEngine.generateEstimatePdf(emptyItems);
      
      expect(result.success).toBe(true);
    });
  });
});

// Export for use in other test files
export { testEstimateData, testInvoiceData, testContractHtml };

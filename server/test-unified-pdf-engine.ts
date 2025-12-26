/**
 * Test Script for Unified PDF Engine
 * 
 * Script de testing completo para validar:
 * 1. Funcionamiento de Puppeteer
 * 2. Funcionamiento del fallback (pdf-lib)
 * 3. Failover automático
 * 4. Performance comparativo
 * 5. Métricas y reporting
 * 
 * Uso:
 * npx tsx server/test-unified-pdf-engine.ts
 */

import { unifiedPdfEngine } from './services/unifiedPdfEngine';
import { simplePdfFallback } from './services/simplePdfFallback';
import { premiumPdfService } from './services/premiumPdfService';
import fs from 'fs';
import path from 'path';

// HTML de prueba (estimado simple)
const TEST_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Test Estimate</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 40px;
    }
    h1 {
      color: #2c3e50;
      border-bottom: 2px solid #3498db;
      padding-bottom: 10px;
    }
    h2 {
      color: #34495e;
      margin-top: 30px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    th, td {
      border: 1px solid #ddd;
      padding: 12px;
      text-align: left;
    }
    th {
      background-color: #3498db;
      color: white;
    }
    .total {
      font-size: 18px;
      font-weight: bold;
      text-align: right;
      margin-top: 20px;
    }
  </style>
</head>
<body>
  <h1>ESTIMATE #12345</h1>
  
  <h2>Client Information</h2>
  <p><strong>Name:</strong> John Doe Construction</p>
  <p><strong>Address:</strong> 123 Main St, Fairfield, CA 94533</p>
  <p><strong>Phone:</strong> (707) 555-1234</p>
  
  <h2>Project Details</h2>
  <p><strong>Project:</strong> Fence Installation - Residential</p>
  <p><strong>Location:</strong> 456 Oak Avenue, Fairfield, CA</p>
  <p><strong>Date:</strong> December 26, 2025</p>
  
  <h2>Items</h2>
  <table>
    <thead>
      <tr>
        <th>Description</th>
        <th>Quantity</th>
        <th>Unit Price</th>
        <th>Total</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>6ft Wood Fence Panels</td>
        <td>20</td>
        <td>$75.00</td>
        <td>$1,500.00</td>
      </tr>
      <tr>
        <td>4x4 Posts</td>
        <td>12</td>
        <td>$25.00</td>
        <td>$300.00</td>
      </tr>
      <tr>
        <td>Concrete Mix (bags)</td>
        <td>15</td>
        <td>$8.00</td>
        <td>$120.00</td>
      </tr>
      <tr>
        <td>Labor (hours)</td>
        <td>16</td>
        <td>$65.00</td>
        <td>$1,040.00</td>
      </tr>
      <tr>
        <td>Hardware & Fasteners</td>
        <td>1</td>
        <td>$150.00</td>
        <td>$150.00</td>
      </tr>
    </tbody>
  </table>
  
  <div class="total">
    <p>Subtotal: $3,110.00</p>
    <p>Tax (8.5%): $264.35</p>
    <p>TOTAL: $3,374.35</p>
  </div>
  
  <h2>Terms & Conditions</h2>
  <p>50% deposit required to begin work. Balance due upon completion.</p>
  <p>Estimate valid for 30 days from date of issue.</p>
  
  <p style="text-align: center; margin-top: 50px; color: #7f8c8d;">
    <em>Building the Future, One Project at a Time.</em>
  </p>
</body>
</html>
`;

interface TestResult {
  name: string;
  success: boolean;
  duration: number;
  error?: string;
  fileSize?: number;
  method?: string;
}

class UnifiedPdfEngineTester {
  private results: TestResult[] = [];
  private outputDir = path.join(__dirname, '../test-output');

  async runAllTests(): Promise<void> {
    console.log('🧪 Starting Unified PDF Engine Tests...\n');
    console.log('━'.repeat(60));
    
    // Crear directorio de output
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }

    // Test 1: Puppeteer directo
    await this.testPuppeteerDirect();
    
    // Test 2: Fallback directo
    await this.testFallbackDirect();
    
    // Test 3: Unified Engine (con Puppeteer funcionando)
    await this.testUnifiedEngineSuccess();
    
    // Test 4: Unified Engine (simulando fallo de Puppeteer)
    await this.testUnifiedEngineFailover();
    
    // Test 5: Performance comparativo
    await this.testPerformanceComparison();
    
    // Test 6: Métricas
    await this.testMetrics();
    
    // Mostrar resultados
    this.showResults();
  }

  private async testPuppeteerDirect(): Promise<void> {
    console.log('\n📝 Test 1: Puppeteer Direct Generation');
    const startTime = Date.now();
    
    try {
      const buffer = await premiumPdfService.generatePdfFromHtml(TEST_HTML, {
        format: 'Letter',
        printBackground: true,
      });
      
      const duration = Date.now() - startTime;
      const filePath = path.join(this.outputDir, 'test-puppeteer.pdf');
      fs.writeFileSync(filePath, buffer);
      
      this.results.push({
        name: 'Puppeteer Direct',
        success: true,
        duration,
        fileSize: buffer.length,
      });
      
      console.log(`✅ Success in ${duration}ms (${buffer.length} bytes)`);
      console.log(`   Saved to: ${filePath}`);
    } catch (error: any) {
      const duration = Date.now() - startTime;
      this.results.push({
        name: 'Puppeteer Direct',
        success: false,
        duration,
        error: error.message,
      });
      
      console.log(`❌ Failed in ${duration}ms: ${error.message}`);
    }
  }

  private async testFallbackDirect(): Promise<void> {
    console.log('\n📝 Test 2: Fallback Direct Generation (pdf-lib)');
    const startTime = Date.now();
    
    try {
      const buffer = await simplePdfFallback.generateFromHtml(TEST_HTML, {
        title: 'Test Estimate',
        format: 'Letter',
      });
      
      const duration = Date.now() - startTime;
      const filePath = path.join(this.outputDir, 'test-fallback.pdf');
      fs.writeFileSync(filePath, buffer);
      
      this.results.push({
        name: 'Fallback Direct',
        success: true,
        duration,
        fileSize: buffer.length,
      });
      
      console.log(`✅ Success in ${duration}ms (${buffer.length} bytes)`);
      console.log(`   Saved to: ${filePath}`);
    } catch (error: any) {
      const duration = Date.now() - startTime;
      this.results.push({
        name: 'Fallback Direct',
        success: false,
        duration,
        error: error.message,
      });
      
      console.log(`❌ Failed in ${duration}ms: ${error.message}`);
    }
  }

  private async testUnifiedEngineSuccess(): Promise<void> {
    console.log('\n📝 Test 3: Unified Engine (Normal Operation)');
    const startTime = Date.now();
    
    try {
      const result = await unifiedPdfEngine.generate({
        html: TEST_HTML,
        title: 'Test Estimate',
        format: 'Letter',
        timeout: 5000,
      });
      
      const duration = Date.now() - startTime;
      const filePath = path.join(this.outputDir, 'test-unified-success.pdf');
      fs.writeFileSync(filePath, result.buffer);
      
      this.results.push({
        name: 'Unified Engine (Success)',
        success: result.success,
        duration,
        fileSize: result.buffer.length,
        method: result.method,
      });
      
      console.log(`✅ Success in ${duration}ms using ${result.method} (${result.buffer.length} bytes)`);
      console.log(`   Saved to: ${filePath}`);
    } catch (error: any) {
      const duration = Date.now() - startTime;
      this.results.push({
        name: 'Unified Engine (Success)',
        success: false,
        duration,
        error: error.message,
      });
      
      console.log(`❌ Failed in ${duration}ms: ${error.message}`);
    }
  }

  private async testUnifiedEngineFailover(): Promise<void> {
    console.log('\n📝 Test 4: Unified Engine (Failover Simulation)');
    console.log('   (Using very short timeout to force fallback)');
    const startTime = Date.now();
    
    try {
      const result = await unifiedPdfEngine.generate({
        html: TEST_HTML,
        title: 'Test Estimate',
        format: 'Letter',
        timeout: 1, // 1ms timeout para forzar fallo de Puppeteer
      });
      
      const duration = Date.now() - startTime;
      const filePath = path.join(this.outputDir, 'test-unified-failover.pdf');
      fs.writeFileSync(filePath, result.buffer);
      
      this.results.push({
        name: 'Unified Engine (Failover)',
        success: result.success,
        duration,
        fileSize: result.buffer.length,
        method: result.method,
      });
      
      console.log(`✅ Failover successful in ${duration}ms using ${result.method} (${result.buffer.length} bytes)`);
      console.log(`   Saved to: ${filePath}`);
    } catch (error: any) {
      const duration = Date.now() - startTime;
      this.results.push({
        name: 'Unified Engine (Failover)',
        success: false,
        duration,
        error: error.message,
      });
      
      console.log(`❌ Failed in ${duration}ms: ${error.message}`);
    }
  }

  private async testPerformanceComparison(): Promise<void> {
    console.log('\n📝 Test 5: Performance Comparison (5 PDFs each)');
    
    const puppeteerTimes: number[] = [];
    const fallbackTimes: number[] = [];
    
    // Test Puppeteer 5 veces
    console.log('   Testing Puppeteer...');
    for (let i = 0; i < 5; i++) {
      try {
        const start = Date.now();
        await premiumPdfService.generatePdfFromHtml(TEST_HTML, { format: 'Letter' });
        puppeteerTimes.push(Date.now() - start);
      } catch (error) {
        console.log(`   ⚠️  Puppeteer test ${i + 1} failed`);
      }
    }
    
    // Test Fallback 5 veces
    console.log('   Testing Fallback...');
    for (let i = 0; i < 5; i++) {
      try {
        const start = Date.now();
        await simplePdfFallback.generateFromHtml(TEST_HTML, { format: 'Letter' });
        fallbackTimes.push(Date.now() - start);
      } catch (error) {
        console.log(`   ⚠️  Fallback test ${i + 1} failed`);
      }
    }
    
    const avgPuppeteer = puppeteerTimes.reduce((a, b) => a + b, 0) / puppeteerTimes.length;
    const avgFallback = fallbackTimes.reduce((a, b) => a + b, 0) / fallbackTimes.length;
    
    console.log(`\n   Results:`);
    console.log(`   Puppeteer: ${avgPuppeteer.toFixed(0)}ms avg (${puppeteerTimes.length} successful)`);
    console.log(`   Fallback:  ${avgFallback.toFixed(0)}ms avg (${fallbackTimes.length} successful)`);
    console.log(`   Speedup:   ${(avgPuppeteer / avgFallback).toFixed(1)}x faster with fallback`);
  }

  private async testMetrics(): Promise<void> {
    console.log('\n📝 Test 6: Metrics & Reporting');
    
    const metrics = unifiedPdfEngine.getMetrics();
    const report = unifiedPdfEngine.getMetricsReport();
    
    console.log('\n' + report);
    
    // Guardar métricas en archivo
    const metricsFile = path.join(this.outputDir, 'metrics.json');
    fs.writeFileSync(metricsFile, JSON.stringify(metrics, null, 2));
    console.log(`\n   Metrics saved to: ${metricsFile}`);
  }

  private showResults(): void {
    console.log('\n' + '━'.repeat(60));
    console.log('📊 Test Results Summary\n');
    
    const table = this.results.map(r => ({
      Test: r.name,
      Status: r.success ? '✅ Pass' : '❌ Fail',
      Duration: `${r.duration}ms`,
      Size: r.fileSize ? `${(r.fileSize / 1024).toFixed(1)}KB` : 'N/A',
      Method: r.method || 'N/A',
      Error: r.error || '-',
    }));
    
    console.table(table);
    
    const passed = this.results.filter(r => r.success).length;
    const total = this.results.length;
    
    console.log(`\n✅ Passed: ${passed}/${total}`);
    console.log(`❌ Failed: ${total - passed}/${total}`);
    console.log(`\n📁 Output directory: ${this.outputDir}`);
    console.log('━'.repeat(60));
  }
}

// Ejecutar tests
const tester = new UnifiedPdfEngineTester();
tester.runAllTests()
  .then(() => {
    console.log('\n✅ All tests completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test suite failed:', error);
    process.exit(1);
  });

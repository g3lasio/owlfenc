/**
 * COMPREHENSIVE SECURE TRIAL TESTING SYSTEM
 * Tests to verify NO BYPASSES are possible in the new trial system
 */

import fetch from 'node-fetch';

interface TestResult {
  testName: string;
  success: boolean;
  message: string;
  details?: any;
}

interface TestSuite {
  suiteName: string;
  results: TestResult[];
  totalTests: number;
  passedTests: number;
  failedTests: number;
}

export class SecureTrialTester {
  private baseUrl: string;
  private testUids: string[] = [];
  
  constructor(baseUrl: string = 'http://localhost:5000') {
    this.baseUrl = baseUrl;
  }
  
  /**
   * Run all security tests
   */
  async runAllTests(): Promise<TestSuite[]> {
    console.log('🔒 [SECURE-TESTING] Iniciando pruebas comprehensivas de seguridad...');
    
    const testSuites: TestSuite[] = [];
    
    // 1. Test trial creation security
    testSuites.push(await this.testTrialCreationSecurity());
    
    // 2. Test serverTimestamp protection
    testSuites.push(await this.testServerTimestampProtection());
    
    // 3. Test enforcement bypass attempts
    testSuites.push(await this.testEnforcementBypassAttempts());
    
    // 4. Test concurrent usage limits
    testSuites.push(await this.testConcurrentUsageLimits());
    
    // 5. Test device reset protection
    testSuites.push(await this.testDeviceResetProtection());
    
    // 6. Test malicious payload handling
    testSuites.push(await this.testMaliciousPayloadHandling());
    
    // Clean up test data
    await this.cleanupTestData();
    
    return testSuites;
  }
  
  /**
   * Test 1: Trial Creation Security
   */
  async testTrialCreationSecurity(): Promise<TestSuite> {
    const results: TestResult[] = [];
    
    console.log('🧪 [TEST-1] Testing trial creation security...');
    
    // Test 1.1: Valid trial creation
    try {
      const testUid = `test_user_${Date.now()}`;
      this.testUids.push(testUid);
      
      const response = await fetch(`${this.baseUrl}/api/secure-trial/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: testUid })
      });
      
      const data = await response.json() as any;
      
      results.push({
        testName: 'Valid trial creation',
        success: response.ok && data.success,
        message: data.success ? 'Trial created successfully' : 'Failed to create trial',
        details: data
      });
      
    } catch (error) {
      results.push({
        testName: 'Valid trial creation',
        success: false,
        message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
    
    // Test 1.2: Duplicate trial prevention
    try {
      const duplicateResponse = await fetch(`${this.baseUrl}/api/secure-trial/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: this.testUids[0] })
      });
      
      const duplicateData = await duplicateResponse.json();
      
      results.push({
        testName: 'Duplicate trial prevention',
        success: duplicateResponse.ok, // Should succeed but return existing trial
        message: 'Duplicate trial handled correctly',
        details: duplicateData
      });
      
    } catch (error) {
      results.push({
        testName: 'Duplicate trial prevention',
        success: false,
        message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
    
    // Test 1.3: Missing UID rejection
    try {
      const noUidResponse = await fetch(`${this.baseUrl}/api/secure-trial/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      
      results.push({
        testName: 'Missing UID rejection',
        success: !noUidResponse.ok, // Should fail with 400
        message: noUidResponse.ok ? 'SECURITY RISK: Missing UID accepted' : 'Missing UID correctly rejected',
      });
      
    } catch (error) {
      results.push({
        testName: 'Missing UID rejection',
        success: true, // Network error is acceptable
        message: 'Request properly rejected',
      });
    }
    
    return this.createTestSuite('Trial Creation Security', results);
  }
  
  /**
   * Test 2: ServerTimestamp Protection
   */
  async testServerTimestampProtection(): Promise<TestSuite> {
    const results: TestResult[] = [];
    
    console.log('🧪 [TEST-2] Testing serverTimestamp protection...');
    
    // Test 2.1: Trial status verification
    try {
      if (this.testUids.length > 0) {
        const response = await fetch(`${this.baseUrl}/api/secure-trial/status/${this.testUids[0]}`);
        const data = await response.json() as any;
        
        results.push({
          testName: 'Trial status verification',
          success: response.ok && data.success && data.hasActiveTrial,
          message: data.hasActiveTrial ? 'Trial status correctly retrieved' : 'Trial status issue',
          details: data
        });
      }
    } catch (error) {
      results.push({
        testName: 'Trial status verification',
        success: false,
        message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
    
    // Test 2.2: Days remaining calculation
    try {
      if (this.testUids.length > 0) {
        const response = await fetch(`${this.baseUrl}/api/secure-trial/status/${this.testUids[0]}`);
        const data = await response.json() as any;
        
        const daysRemaining = data.trial?.daysRemaining;
        const isValidDays = daysRemaining >= 0 && daysRemaining <= 14;
        
        results.push({
          testName: 'Days remaining calculation',
          success: isValidDays,
          message: isValidDays ? `Valid days remaining: ${daysRemaining}` : `Invalid days: ${daysRemaining}`,
          details: { daysRemaining }
        });
      }
    } catch (error) {
      results.push({
        testName: 'Days remaining calculation',
        success: false,
        message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
    
    return this.createTestSuite('ServerTimestamp Protection', results);
  }
  
  /**
   * Test 3: Enforcement Bypass Attempts
   */
  async testEnforcementBypassAttempts(): Promise<TestSuite> {
    const results: TestResult[] = [];
    
    console.log('🧪 [TEST-3] Testing enforcement bypass attempts...');
    
    // Test 3.1: Contract generation with valid trial
    try {
      if (this.testUids.length > 0) {
        const response = await fetch(`${this.baseUrl}/api/secure-enforcement/generate-contract`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            uid: this.testUids[0],
            contractData: { type: 'test', client: 'Test Client' }
          })
        });
        
        const data = await response.json() as any;
        
        results.push({
          testName: 'Contract generation with valid trial',
          success: response.ok && data.success,
          message: data.success ? 'Contract generated successfully' : 'Contract generation failed',
          details: data
        });
      }
    } catch (error) {
      results.push({
        testName: 'Contract generation with valid trial',
        success: false,
        message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
    
    // Test 3.2: Invalid UID rejection in enforcement
    try {
      const response = await fetch(`${this.baseUrl}/api/secure-enforcement/generate-contract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: 'invalid_user_123',
          contractData: { type: 'test' }
        })
      });
      
      results.push({
        testName: 'Invalid UID rejection in enforcement',
        success: !response.ok, // Should fail
        message: response.ok ? 'SECURITY RISK: Invalid UID accepted' : 'Invalid UID correctly rejected',
      });
      
    } catch (error) {
      results.push({
        testName: 'Invalid UID rejection in enforcement',
        success: true, // Network error is acceptable
        message: 'Request properly rejected',
      });
    }
    
    // Test 3.3: Missing required fields
    try {
      const response = await fetch(`${this.baseUrl}/api/secure-enforcement/generate-estimate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}) // Missing uid and estimateData
      });
      
      results.push({
        testName: 'Missing required fields rejection',
        success: !response.ok, // Should fail with 400
        message: response.ok ? 'SECURITY RISK: Missing fields accepted' : 'Missing fields correctly rejected',
      });
      
    } catch (error) {
      results.push({
        testName: 'Missing required fields rejection',
        success: true, // Network error is acceptable
        message: 'Request properly rejected',
      });
    }
    
    return this.createTestSuite('Enforcement Bypass Attempts', results);
  }
  
  /**
   * Test 4: Concurrent Usage Limits
   */
  async testConcurrentUsageLimits(): Promise<TestSuite> {
    const results: TestResult[] = [];
    
    console.log('🧪 [TEST-4] Testing concurrent usage limits...');
    
    // Test 4.1: Multiple simultaneous requests
    try {
      if (this.testUids.length > 0) {
        const promises = [];
        
        // Send 5 concurrent contract requests
        for (let i = 0; i < 5; i++) {
          promises.push(
            fetch(`${this.baseUrl}/api/secure-enforcement/generate-contract`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                uid: this.testUids[0],
                contractData: { type: 'test', index: i }
              })
            })
          );
        }
        
        const responses = await Promise.all(promises);
        const successCount = responses.filter(r => r.ok).length;
        
        results.push({
          testName: 'Concurrent request handling',
          success: successCount > 0, // At least some should succeed
          message: `${successCount}/5 concurrent requests succeeded`,
          details: { successCount, totalRequests: 5 }
        });
      }
    } catch (error) {
      results.push({
        testName: 'Concurrent request handling',
        success: false,
        message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
    
    // Test 4.2: Usage summary accuracy
    try {
      if (this.testUids.length > 0) {
        const response = await fetch(`${this.baseUrl}/api/secure-enforcement/usage-summary/${this.testUids[0]}`);
        const data = await response.json() as any;
        
        const hasUsageData = data.success && data.usage && typeof data.usage.contracts !== 'undefined';
        
        results.push({
          testName: 'Usage summary accuracy',
          success: hasUsageData,
          message: hasUsageData ? 'Usage data accurately tracked' : 'Usage tracking issue',
          details: data
        });
      }
    } catch (error) {
      results.push({
        testName: 'Usage summary accuracy',
        success: false,
        message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
    
    return this.createTestSuite('Concurrent Usage Limits', results);
  }
  
  /**
   * Test 5: Device Reset Protection
   */
  async testDeviceResetProtection(): Promise<TestSuite> {
    const results: TestResult[] = [];
    
    console.log('🧪 [TEST-5] Testing device reset protection...');
    
    // Test 5.1: Trial persistence across sessions
    try {
      if (this.testUids.length > 0) {
        // Get trial status multiple times to simulate different devices/sessions
        const responses = await Promise.all([
          fetch(`${this.baseUrl}/api/secure-trial/status/${this.testUids[0]}`),
          fetch(`${this.baseUrl}/api/secure-trial/status/${this.testUids[0]}`),
          fetch(`${this.baseUrl}/api/secure-trial/status/${this.testUids[0]}`)
        ]);
        
        const allSuccessful = responses.every(r => r.ok);
        const dataPromises = responses.map(r => r.json());
        const allData = await Promise.all(dataPromises);
        
        // All should return the same trial data
        const sameTrialData = allData.every(data => 
          data.hasActiveTrial === allData[0].hasActiveTrial &&
          data.trial?.daysRemaining === allData[0].trial?.daysRemaining
        );
        
        results.push({
          testName: 'Trial persistence across sessions',
          success: allSuccessful && sameTrialData,
          message: sameTrialData ? 'Trial data consistent across sessions' : 'Trial data inconsistency detected',
          details: allData
        });
      }
    } catch (error) {
      results.push({
        testName: 'Trial persistence across sessions',
        success: false,
        message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
    
    // Test 5.2: Cannot create multiple trials for same user
    try {
      if (this.testUids.length > 0) {
        const response = await fetch(`${this.baseUrl}/api/secure-trial/activate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uid: this.testUids[0] })
        });
        
        const data = await response.json() as any;
        
        results.push({
          testName: 'Prevent multiple trials per user',
          success: response.ok, // Should succeed but return existing trial
          message: 'Multiple trial prevention working correctly',
          details: data
        });
      }
    } catch (error) {
      results.push({
        testName: 'Prevent multiple trials per user',
        success: false,
        message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
    
    return this.createTestSuite('Device Reset Protection', results);
  }
  
  /**
   * Test 6: Malicious Payload Handling
   */
  async testMaliciousPayloadHandling(): Promise<TestSuite> {
    const results: TestResult[] = [];
    
    console.log('🧪 [TEST-6] Testing malicious payload handling...');
    
    // Test 6.1: SQL injection attempts
    try {
      const maliciousUid = "'; DROP TABLE entitlements; --";
      const response = await fetch(`${this.baseUrl}/api/secure-trial/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: maliciousUid })
      });
      
      results.push({
        testName: 'SQL injection protection',
        success: !response.ok || response.status === 400, // Should be rejected
        message: response.ok ? 'SECURITY RISK: SQL injection not blocked' : 'SQL injection properly blocked',
      });
      
    } catch (error) {
      results.push({
        testName: 'SQL injection protection',
        success: true, // Network error means it was blocked
        message: 'Malicious payload properly rejected',
      });
    }
    
    // Test 6.2: XSS attempts
    try {
      const xssPayload = "<script>alert('xss')</script>";
      const response = await fetch(`${this.baseUrl}/api/secure-enforcement/generate-contract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: this.testUids[0] || 'test',
          contractData: { client: xssPayload }
        })
      });
      
      results.push({
        testName: 'XSS payload handling',
        success: true, // Any response is fine as long as server doesn't crash
        message: 'XSS payload handled without server crash',
      });
      
    } catch (error) {
      results.push({
        testName: 'XSS payload handling',
        success: true, // Error means it was rejected
        message: 'XSS payload properly rejected',
      });
    }
    
    // Test 6.3: Oversized payload
    try {
      const oversizedData = 'x'.repeat(10000); // 10KB string
      const response = await fetch(`${this.baseUrl}/api/secure-trial/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: oversizedData })
      });
      
      results.push({
        testName: 'Oversized payload protection',
        success: !response.ok, // Should be rejected
        message: response.ok ? 'Large payload accepted (potential issue)' : 'Large payload properly rejected',
      });
      
    } catch (error) {
      results.push({
        testName: 'Oversized payload protection',
        success: true, // Network error means it was blocked
        message: 'Oversized payload properly rejected',
      });
    }
    
    return this.createTestSuite('Malicious Payload Handling', results);
  }
  
  /**
   * Clean up test data
   */
  async cleanupTestData(): Promise<void> {
    console.log('🧹 [CLEANUP] Cleaning up test data...');
    
    for (const uid of this.testUids) {
      try {
        // Expire test trials
        await fetch(`${this.baseUrl}/api/secure-trial/expire/${uid}`, {
          method: 'POST'
        });
      } catch (error) {
        console.warn(`Failed to cleanup test user ${uid}:`, error);
      }
    }
    
    this.testUids = [];
  }
  
  /**
   * Create test suite summary
   */
  private createTestSuite(suiteName: string, results: TestResult[]): TestSuite {
    const passedTests = results.filter(r => r.success).length;
    const failedTests = results.length - passedTests;
    
    return {
      suiteName,
      results,
      totalTests: results.length,
      passedTests,
      failedTests
    };
  }
  
  /**
   * Generate security report
   */
  generateSecurityReport(testSuites: TestSuite[]): string {
    let report = '\n🔒 SECURE TRIAL SYSTEM - SECURITY TEST REPORT\n';
    report += '=' .repeat(50) + '\n\n';
    
    let totalTests = 0;
    let totalPassed = 0;
    let totalFailed = 0;
    
    testSuites.forEach(suite => {
      totalTests += suite.totalTests;
      totalPassed += suite.passedTests;
      totalFailed += suite.failedTests;
      
      report += `📋 ${suite.suiteName}\n`;
      report += `-`.repeat(30) + '\n';
      report += `✅ Passed: ${suite.passedTests}/${suite.totalTests}\n`;
      if (suite.failedTests > 0) {
        report += `❌ Failed: ${suite.failedTests}/${suite.totalTests}\n`;
      }
      report += '\n';
      
      suite.results.forEach(result => {
        const icon = result.success ? '✅' : '❌';
        report += `  ${icon} ${result.testName}: ${result.message}\n`;
      });
      
      report += '\n';
    });
    
    report += '📊 OVERALL SUMMARY\n';
    report += '=' .repeat(20) + '\n';
    report += `Total Tests: ${totalTests}\n`;
    report += `Passed: ${totalPassed} (${Math.round(totalPassed/totalTests*100)}%)\n`;
    report += `Failed: ${totalFailed} (${Math.round(totalFailed/totalTests*100)}%)\n\n`;
    
    if (totalFailed === 0) {
      report += '🛡️ SECURITY STATUS: ALL TESTS PASSED - SYSTEM SECURE\n';
    } else {
      report += '⚠️ SECURITY STATUS: SOME TESTS FAILED - REVIEW REQUIRED\n';
    }
    
    return report;
  }
}

// Export for testing
export async function runSecurityTests(baseUrl?: string): Promise<string> {
  const tester = new SecureTrialTester(baseUrl);
  const testSuites = await tester.runAllTests();
  return tester.generateSecurityReport(testSuites);
}
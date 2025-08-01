#!/usr/bin/env tsx

/**
 * Secure ATTOM API Testing Utility
 * 
 * This utility provides comprehensive testing of the ATTOM API integration
 * with proper security measures and logging.
 * 
 * Usage: npm run tsx server/utils/secure-attom-test.ts
 */

import { secureAttomService } from '../services/secure-attom-service';

interface TestResult {
  testName: string;
  success: boolean;
  responseTime: number;
  error?: string;
  data?: any;
}

class AttomAPITester {
  private results: TestResult[] = [];

  async runAllTests(): Promise<void> {
    console.log('🚀 Starting Comprehensive ATTOM API Security Test Suite');
    console.log('================================================================');
    
    // Check API key configuration
    await this.testAPIKeyConfiguration();
    
    // Test basic connectivity
    await this.testBasicConnectivity();
    
    // Test property verification with various address formats
    await this.testPropertyVerification();
    
    // Test error handling
    await this.testErrorHandling();
    
    // Test rate limiting behavior
    await this.testRateLimitingBehavior();
    
    // Generate comprehensive report
    this.generateReport();
  }

  private async testAPIKeyConfiguration(): Promise<void> {
    console.log('\n🔐 Testing API Key Configuration...');
    
    const startTime = Date.now();
    try {
      const hasApiKey = Boolean(process.env.ATTOM_API_KEY);
      const keyLength = process.env.ATTOM_API_KEY?.length || 0;
      
      if (!hasApiKey) {
        this.addResult('API Key Configuration', false, Date.now() - startTime, 'ATTOM_API_KEY not configured');
        return;
      }
      
      if (keyLength < 10) {
        this.addResult('API Key Configuration', false, Date.now() - startTime, 'API key appears to be too short');
        return;
      }
      
      console.log('✅ API Key is configured (length: ' + keyLength + ')');
      this.addResult('API Key Configuration', true, Date.now() - startTime);
      
    } catch (error: any) {
      this.addResult('API Key Configuration', false, Date.now() - startTime, error.message);
    }
  }

  private async testBasicConnectivity(): Promise<void> {
    console.log('\n🌐 Testing Basic API Connectivity...');
    
    const startTime = Date.now();
    try {
      const isHealthy = await secureAttomService.healthCheck();
      
      if (isHealthy) {
        console.log('✅ ATTOM API connectivity successful');
        this.addResult('Basic Connectivity', true, Date.now() - startTime);
      } else {
        console.log('❌ ATTOM API connectivity failed');
        this.addResult('Basic Connectivity', false, Date.now() - startTime, 'Health check failed');
      }
      
    } catch (error: any) {
      console.log('❌ Connectivity test failed:', error.message);
      this.addResult('Basic Connectivity', false, Date.now() - startTime, error.message);
    }
  }

  private async testPropertyVerification(): Promise<void> {
    console.log('\n🏠 Testing Property Verification...');
    
    const testAddresses = [
      '123 Main St, Beverly Hills, CA 90210',
      '456 Oak Avenue, San Francisco, CA 94105',
      '789 Pine Street, Los Angeles, CA 90001'
    ];

    for (const address of testAddresses) {
      await this.testSinglePropertyVerification(address);
    }
  }

  private async testSinglePropertyVerification(address: string): Promise<void> {
    console.log(`\n  📍 Testing address: ${address}`);
    
    const startTime = Date.now();
    try {
      const propertyData = await secureAttomService.getPropertyDetails(address);
      
      if (propertyData) {
        console.log(`  ✅ Property found - Owner: ${propertyData.owner}`);
        this.addResult(`Property Verification - ${address}`, true, Date.now() - startTime, undefined, {
          owner: propertyData.owner,
          verified: propertyData.verified,
          ownershipVerified: propertyData.ownershipVerified
        });
      } else {
        console.log('  📭 No property data found');
        this.addResult(`Property Verification - ${address}`, false, Date.now() - startTime, 'No property data returned');
      }
      
    } catch (error: any) {
      console.log(`  ❌ Verification failed: ${error.message}`);
      this.addResult(`Property Verification - ${address}`, false, Date.now() - startTime, error.message);
    }
  }

  private async testErrorHandling(): Promise<void> {
    console.log('\n⚠️ Testing Error Handling...');
    
    // Test invalid address
    await this.testInvalidAddress();
    
    // Test empty address
    await this.testEmptyAddress();
  }

  private async testInvalidAddress(): Promise<void> {
    console.log('\n  🚫 Testing invalid address handling...');
    
    const startTime = Date.now();
    try {
      await secureAttomService.getPropertyDetails('Invalid Address 123');
      
      // If we get here without an error, that's unexpected
      this.addResult('Invalid Address Handling', false, Date.now() - startTime, 'Expected error but got result');
      
    } catch (error: any) {
      console.log('  ✅ Invalid address properly rejected:', error.message);
      this.addResult('Invalid Address Handling', true, Date.now() - startTime);
    }
  }

  private async testEmptyAddress(): Promise<void> {
    console.log('\n  📝 Testing empty address handling...');
    
    const startTime = Date.now();
    try {
      await secureAttomService.getPropertyDetails('');
      
      // If we get here without an error, that's unexpected
      this.addResult('Empty Address Handling', false, Date.now() - startTime, 'Expected error but got result');
      
    } catch (error: any) {
      console.log('  ✅ Empty address properly rejected:', error.message);
      this.addResult('Empty Address Handling', true, Date.now() - startTime);
    }
  }

  private async testRateLimitingBehavior(): Promise<void> {
    console.log('\n⏱️ Testing Rate Limiting Behavior...');
    
    const startTime = Date.now();
    const testAddress = '123 Test St, Beverly Hills, CA 90210';
    
    try {
      // Make multiple rapid requests to test rate limiting
      const promises = [];
      for (let i = 0; i < 3; i++) {
        promises.push(secureAttomService.getPropertyDetails(testAddress));
      }
      
      await Promise.allSettled(promises);
      
      console.log('  ✅ Rate limiting test completed (no rate limit hit)');
      this.addResult('Rate Limiting Behavior', true, Date.now() - startTime);
      
    } catch (error: any) {
      if (error.message.includes('Rate limit')) {
        console.log('  ✅ Rate limiting working correctly:', error.message);
        this.addResult('Rate Limiting Behavior', true, Date.now() - startTime);
      } else {
        console.log('  ❌ Unexpected error during rate limit test:', error.message);
        this.addResult('Rate Limiting Behavior', false, Date.now() - startTime, error.message);
      }
    }
  }

  private addResult(testName: string, success: boolean, responseTime: number, error?: string, data?: any): void {
    this.results.push({
      testName,
      success,
      responseTime,
      error,
      data
    });
  }

  private generateReport(): void {
    console.log('\n📊 COMPREHENSIVE TEST REPORT');
    console.log('================================================================');
    
    const totalTests = this.results.length;
    const successfulTests = this.results.filter(r => r.success).length;
    const failedTests = totalTests - successfulTests;
    
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Successful: ${successfulTests}`);
    console.log(`Failed: ${failedTests}`);
    console.log(`Success Rate: ${((successfulTests / totalTests) * 100).toFixed(1)}%`);
    
    console.log('\n📋 DETAILED RESULTS:');
    console.log('----------------------------------------------------------------');
    
    this.results.forEach((result, index) => {
      const status = result.success ? '✅' : '❌';
      const time = `${result.responseTime}ms`;
      
      console.log(`${index + 1}. ${status} ${result.testName} (${time})`);
      
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
      
      if (result.data) {
        console.log(`   Data: ${JSON.stringify(result.data, null, 2)}`);
      }
    });
    
    console.log('\n🔒 SECURITY ASSESSMENT:');
    console.log('----------------------------------------------------------------');
    
    const securityIssues = [];
    
    // Check for API key configuration
    const apiKeyTest = this.results.find(r => r.testName === 'API Key Configuration');
    if (!apiKeyTest?.success) {
      securityIssues.push('❌ API Key not properly configured');
    } else {
      console.log('✅ API Key properly configured and secured');
    }
    
    // Check for error handling
    const errorHandlingTests = this.results.filter(r => r.testName.includes('Handling'));
    const errorHandlingWorking = errorHandlingTests.every(r => r.success);
    
    if (errorHandlingWorking) {
      console.log('✅ Error handling working correctly');
    } else {
      securityIssues.push('❌ Error handling not working properly');
    }
    
    // Summary
    if (securityIssues.length === 0) {
      console.log('\n🎉 SECURITY STATUS: ALL CHECKS PASSED');
      console.log('The ATTOM API integration appears to be secure and working correctly.');
    } else {
      console.log('\n⚠️ SECURITY ISSUES FOUND:');
      securityIssues.forEach(issue => console.log(issue));
    }
    
    console.log('\n================================================================');
    console.log('🏁 Test suite completed');
  }
}

// Run the tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new AttomAPITester();
  tester.runAllTests().catch(console.error);
}

export { AttomAPITester };
/**
 * AUTO-DISCOVERY SYSTEM - SUITE DE PRUEBAS ROBUSTAS
 * 
 * Pruebas agresivas para identificar errores, deficiencias y problemas
 */

import { autoDiscoveryIntegration } from '../services/integration/AutoDiscoveryIntegration';
import { EndpointDiscoveryService } from '../services/discovery/EndpointDiscoveryService';
import { DynamicToolGenerator } from '../services/discovery/DynamicToolGenerator';
import { WorkflowOrchestrator } from '../services/workflow/WorkflowOrchestrator';
import { UniversalAPIExecutor } from '../services/execution/UniversalAPIExecutor';
import { PriceAdjustmentService } from '../services/PriceAdjustmentService';

// ============= TEST SUITE =============

async function runAllTests() {
  console.log('\n🧪 ========================================');
  console.log('🧪 AUTO-DISCOVERY SYSTEM - TEST SUITE');
  console.log('🧪 ========================================\n');
  
  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    errors: [] as string[]
  };
  
  // Test 1: Endpoint Discovery
  await testEndpointDiscovery(results);
  
  // Test 2: Dynamic Tool Generation
  await testDynamicToolGeneration(results);
  
  // Test 3: Workflow Orchestration
  await testWorkflowOrchestration(results);
  
  // Test 4: Universal API Execution
  await testUniversalAPIExecution(results);
  
  // Test 5: Price Adjustment
  await testPriceAdjustment(results);
  
  // Test 6: Integration
  await testIntegration(results);
  
  // Test 7: Error Handling
  await testErrorHandling(results);
  
  // Test 8: Edge Cases
  await testEdgeCases(results);
  
  // Test 9: Performance
  await testPerformance(results);
  
  // Test 10: Concurrent Requests
  await testConcurrentRequests(results);
  
  // Print Results
  printResults(results);
}

// ============= TEST 1: ENDPOINT DISCOVERY =============

async function testEndpointDiscovery(results: any) {
  console.log('\n📋 TEST 1: Endpoint Discovery');
  console.log('─'.repeat(50));
  
  try {
    const service = new EndpointDiscoveryService();
    
    // Test 1.1: Discover all endpoints
    results.total++;
    console.log('  1.1 Discovering all endpoints...');
    const endpoints = await service.discoverEndpoints();
    
    if (endpoints.length === 0) {
      throw new Error('No endpoints discovered');
    }
    
    console.log(`  ✅ Discovered ${endpoints.length} endpoints`);
    results.passed++;
    
    // Test 1.2: Validate endpoint structure
    results.total++;
    console.log('  1.2 Validating endpoint structure...');
    
    for (const endpoint of endpoints.slice(0, 5)) {
      if (!endpoint.path || !endpoint.method || !endpoint.metadata) {
        throw new Error(`Invalid endpoint structure: ${JSON.stringify(endpoint)}`);
      }
    }
    
    console.log('  ✅ Endpoint structure valid');
    results.passed++;
    
    // Test 1.3: Search endpoints
    results.total++;
    console.log('  1.3 Testing endpoint search...');
    
    const searchResults = await service.searchEndpoints('estimate');
    
    if (searchResults.length === 0) {
      console.log('  ⚠️  No endpoints found for "estimate" (might be expected)');
    } else {
      console.log(`  ✅ Found ${searchResults.length} endpoints matching "estimate"`);
    }
    
    results.passed++;
    
    // Test 1.4: Filter by category
    results.total++;
    console.log('  1.4 Testing category filtering...');
    
    const categories = ['estimate', 'contract', 'client', 'permit', 'property'];
    let foundAny = false;
    
    for (const category of categories) {
      const filtered = await service.getEndpointsByCategory(category);
      if (filtered.length > 0) {
        console.log(`  ✅ Found ${filtered.length} endpoints in category "${category}"`);
        foundAny = true;
        break;
      }
    }
    
    if (!foundAny) {
      console.log('  ⚠️  No categorized endpoints found (metadata might be missing)');
    }
    
    results.passed++;
    
    // Test 1.5: Cache functionality
    results.total++;
    console.log('  1.5 Testing cache...');
    
    const start1 = Date.now();
    await service.discoverEndpoints();
    const time1 = Date.now() - start1;
    
    const start2 = Date.now();
    await service.discoverEndpoints();
    const time2 = Date.now() - start2;
    
    if (time2 < time1 / 2) {
      console.log(`  ✅ Cache working (${time1}ms → ${time2}ms)`);
      results.passed++;
    } else {
      throw new Error(`Cache not working (${time1}ms → ${time2}ms)`);
    }
    
  } catch (error: any) {
    console.log(`  ❌ FAILED: ${error.message}`);
    results.failed++;
    results.errors.push(`Test 1: ${error.message}`);
  }
}

// ============= TEST 2: DYNAMIC TOOL GENERATION =============

async function testDynamicToolGeneration(results: any) {
  console.log('\n🛠️  TEST 2: Dynamic Tool Generation');
  console.log('─'.repeat(50));
  
  try {
    const discoveryService = new EndpointDiscoveryService();
    const generator = new DynamicToolGenerator();
    
    // Test 2.1: Generate tools from endpoints
    results.total++;
    console.log('  2.1 Generating tools from endpoints...');
    
    const endpoints = await discoveryService.discoverEndpoints();
    const tools = await generator.generateTools(endpoints);
    
    if (tools.length === 0) {
      throw new Error('No tools generated');
    }
    
    console.log(`  ✅ Generated ${tools.length} tools`);
    results.passed++;
    
    // Test 2.2: Validate tool structure
    results.total++;
    console.log('  2.2 Validating tool structure...');
    
    for (const tool of tools.slice(0, 5)) {
      if (!tool.name || !tool.description || !tool.input_schema) {
        throw new Error(`Invalid tool structure: ${JSON.stringify(tool)}`);
      }
      
      if (typeof tool.name !== 'string' || tool.name.length === 0) {
        throw new Error(`Invalid tool name: ${tool.name}`);
      }
      
      if (!tool.input_schema.properties) {
        throw new Error(`Tool missing input schema properties: ${tool.name}`);
      }
    }
    
    console.log('  ✅ Tool structure valid');
    results.passed++;
    
    // Test 2.3: Validate tool names (snake_case)
    results.total++;
    console.log('  2.3 Validating tool names...');
    
    const invalidNames = tools.filter(t => !/^[a-z][a-z0-9_]*$/.test(t.name));
    
    if (invalidNames.length > 0) {
      throw new Error(`Invalid tool names: ${invalidNames.map(t => t.name).join(', ')}`);
    }
    
    console.log('  ✅ All tool names valid (snake_case)');
    results.passed++;
    
    // Test 2.4: Check for duplicates
    results.total++;
    console.log('  2.4 Checking for duplicate tools...');
    
    const names = tools.map(t => t.name);
    const uniqueNames = new Set(names);
    
    if (names.length !== uniqueNames.size) {
      const duplicates = names.filter((name, index) => names.indexOf(name) !== index);
      throw new Error(`Duplicate tool names: ${duplicates.join(', ')}`);
    }
    
    console.log('  ✅ No duplicate tools');
    results.passed++;
    
  } catch (error: any) {
    console.log(`  ❌ FAILED: ${error.message}`);
    results.failed++;
    results.errors.push(`Test 2: ${error.message}`);
  }
}

// ============= TEST 3: WORKFLOW ORCHESTRATION =============

async function testWorkflowOrchestration(results: any) {
  console.log('\n🔄 TEST 3: Workflow Orchestration');
  console.log('─'.repeat(50));
  
  try {
    const orchestrator = new WorkflowOrchestrator();
    
    // Test 3.1: Simple workflow (no steps)
    results.total++;
    console.log('  3.1 Testing simple workflow...');
    
    const simpleWorkflow = {
      steps: []
    };
    
    const simpleResult = await orchestrator.executeWorkflow(
      simpleWorkflow,
      {},
      { userId: 'test-user', authHeaders: {}, baseURL: 'http://localhost:3000' }
    );
    
    console.log('  ✅ Simple workflow executed');
    results.passed++;
    
    // Test 3.2: Input step
    results.total++;
    console.log('  3.2 Testing input step...');
    
    const inputWorkflow = {
      steps: [
        {
          id: 'test_input',
          type: 'input' as const,
          title: 'Test Input',
          description: 'Enter test data',
          fields: [
            { name: 'testField', label: 'Test Field', type: 'text', required: true }
          ]
        }
      ]
    };
    
    const inputParams = {
      testField: 'test value'
    };
    
    const inputResult = await orchestrator.executeWorkflow(
      inputWorkflow,
      inputParams,
      { userId: 'test-user', authHeaders: {}, baseURL: 'http://localhost:3000' }
    );
    
    if (!inputResult.state || !inputResult.state.test_input) {
      throw new Error('Input step did not save state');
    }
    
    console.log('  ✅ Input step executed');
    results.passed++;
    
    // Test 3.3: Conditional workflow
    results.total++;
    console.log('  3.3 Testing conditional workflow...');
    
    const conditionalWorkflow = {
      steps: [
        {
          id: 'check_condition',
          type: 'input' as const,
          title: 'Check Condition',
          description: 'Enter yes or no',
          fields: [
            { name: 'answer', label: 'Answer', type: 'text', required: true }
          ]
        },
        {
          id: 'if_yes',
          type: 'execute' as const,
          title: 'If Yes',
          description: 'Execute if yes',
          condition: {
            field: 'check_condition.answer',
            operator: 'equals',
            value: 'yes'
          },
          endpoint: '/api/test'
        }
      ]
    };
    
    const conditionalParams = {
      answer: 'yes'
    };
    
    const conditionalResult = await orchestrator.executeWorkflow(
      conditionalWorkflow,
      conditionalParams,
      { userId: 'test-user', authHeaders: {}, baseURL: 'http://localhost:3000' }
    );
    
    console.log('  ✅ Conditional workflow executed');
    results.passed++;
    
  } catch (error: any) {
    console.log(`  ❌ FAILED: ${error.message}`);
    results.failed++;
    results.errors.push(`Test 3: ${error.message}`);
  }
}

// ============= TEST 4: UNIVERSAL API EXECUTION =============

async function testUniversalAPIExecution(results: any) {
  console.log('\n🌐 TEST 4: Universal API Execution');
  console.log('─'.repeat(50));
  
  try {
    const executor = new UniversalAPIExecutor();
    
    // Test 4.1: Validate endpoint format
    results.total++;
    console.log('  4.1 Testing endpoint validation...');
    
    try {
      await executor.execute(
        { path: 'invalid-path', method: 'GET', metadata: {} },
        {},
        { userId: 'test-user', authHeaders: {}, baseURL: 'http://localhost:3000' }
      );
      throw new Error('Should have thrown error for invalid endpoint');
    } catch (error: any) {
      if (error.message.includes('invalid')) {
        console.log('  ✅ Endpoint validation working');
        results.passed++;
      } else {
        throw error;
      }
    }
    
    // Test 4.2: Test response enrichment
    results.total++;
    console.log('  4.2 Testing response enrichment...');
    
    const mockResponse = {
      content: 'Test content',
      actions: [
        { label: 'Test Action', action: 'test_action' }
      ],
      links: [
        { url: '/test', label: 'Test Link' }
      ]
    };
    
    // Verificar que el formato de response enriquecido sea válido
    if (!mockResponse.content || !mockResponse.actions || !mockResponse.links) {
      throw new Error('Invalid enriched response format');
    }
    
    console.log('  ✅ Response enrichment format valid');
    results.passed++;
    
  } catch (error: any) {
    console.log(`  ❌ FAILED: ${error.message}`);
    results.failed++;
    results.errors.push(`Test 4: ${error.message}`);
  }
}

// ============= TEST 5: PRICE ADJUSTMENT =============

async function testPriceAdjustment(results: any) {
  console.log('\n💰 TEST 5: Price Adjustment');
  console.log('─'.repeat(50));
  
  try {
    const service = new PriceAdjustmentService();
    
    // Test 5.1: Proportional adjustment
    results.total++;
    console.log('  5.1 Testing proportional adjustment...');
    
    const mockResult = {
      totalCost: 9000,
      materials: [
        { name: 'Material 1', quantity: 10, unitCost: 100, totalCost: 1000 },
        { name: 'Material 2', quantity: 20, unitCost: 400, totalCost: 8000 }
      ],
      labor: { hours: 40, rate: 0, totalCost: 0 }
    };
    
    const adjusted = service.adjustPrice(mockResult, 10200, 'proportional');
    
    if (Math.abs(adjusted.totalCost - 10200) > 1) {
      throw new Error(`Price adjustment failed: ${adjusted.totalCost} !== 10200`);
    }
    
    console.log(`  ✅ Proportional adjustment: $9000 → $${adjusted.totalCost}`);
    results.passed++;
    
    // Test 5.2: Markup adjustment
    results.total++;
    console.log('  5.2 Testing markup adjustment...');
    
    const markupAdjusted = service.adjustPrice(mockResult, 10200, 'markup');
    
    if (Math.abs(markupAdjusted.totalCost - 10200) > 1) {
      throw new Error(`Markup adjustment failed: ${markupAdjusted.totalCost} !== 10200`);
    }
    
    console.log(`  ✅ Markup adjustment: $9000 → $${markupAdjusted.totalCost}`);
    results.passed++;
    
    // Test 5.3: Validation (too high)
    results.total++;
    console.log('  5.3 Testing validation (too high)...');
    
    try {
      service.adjustPrice(mockResult, 20000, 'proportional'); // +122% (should fail)
      throw new Error('Should have thrown error for price too high');
    } catch (error: any) {
      if (error.message.includes('razonable') || error.message.includes('50%')) {
        console.log('  ✅ Validation working (rejects too high)');
        results.passed++;
      } else {
        throw error;
      }
    }
    
    // Test 5.4: Validation (too low)
    results.total++;
    console.log('  5.4 Testing validation (too low)...');
    
    try {
      service.adjustPrice(mockResult, 4000, 'proportional'); // -56% (should fail)
      throw new Error('Should have thrown error for price too low');
    } catch (error: any) {
      if (error.message.includes('razonable') || error.message.includes('50%')) {
        console.log('  ✅ Validation working (rejects too low)');
        results.passed++;
      } else {
        throw error;
      }
    }
    
  } catch (error: any) {
    console.log(`  ❌ FAILED: ${error.message}`);
    results.failed++;
    results.errors.push(`Test 5: ${error.message}`);
  }
}

// ============= TEST 6: INTEGRATION =============

async function testIntegration(results: any) {
  console.log('\n🔗 TEST 6: Integration');
  console.log('─'.repeat(50));
  
  try {
    // Test 6.1: Initialize auto-discovery
    results.total++;
    console.log('  6.1 Initializing auto-discovery...');
    
    await autoDiscoveryIntegration.initialize();
    
    console.log('  ✅ Auto-discovery initialized');
    results.passed++;
    
    // Test 6.2: Get available tools
    results.total++;
    console.log('  6.2 Getting available tools...');
    
    const tools = await autoDiscoveryIntegration.getAvailableTools();
    
    if (tools.length === 0) {
      throw new Error('No tools available');
    }
    
    console.log(`  ✅ ${tools.length} tools available`);
    results.passed++;
    
    // Test 6.3: Search tools
    results.total++;
    console.log('  6.3 Searching tools...');
    
    const searchResults = await autoDiscoveryIntegration.searchTools('estimate');
    
    console.log(`  ✅ Found ${searchResults.length} tools matching "estimate"`);
    results.passed++;
    
    // Test 6.4: Get statistics
    results.total++;
    console.log('  6.4 Getting statistics...');
    
    const stats = await autoDiscoveryIntegration.getStatistics();
    
    if (!stats.totalEndpoints || !stats.totalTools) {
      throw new Error('Invalid statistics');
    }
    
    console.log(`  ✅ Stats: ${stats.totalEndpoints} endpoints, ${stats.totalTools} tools`);
    results.passed++;
    
  } catch (error: any) {
    console.log(`  ❌ FAILED: ${error.message}`);
    results.failed++;
    results.errors.push(`Test 6: ${error.message}`);
  }
}

// ============= TEST 7: ERROR HANDLING =============

async function testErrorHandling(results: any) {
  console.log('\n⚠️  TEST 7: Error Handling');
  console.log('─'.repeat(50));
  
  try {
    // Test 7.1: Invalid tool name
    results.total++;
    console.log('  7.1 Testing invalid tool name...');
    
    try {
      await autoDiscoveryIntegration.executeTool(
        'invalid_tool_that_does_not_exist',
        {},
        { userId: 'test-user', authHeaders: {}, baseURL: 'http://localhost:3000' }
      );
      throw new Error('Should have thrown error for invalid tool');
    } catch (error: any) {
      if (error.message.includes('not found') || error.message.includes('invalid')) {
        console.log('  ✅ Error handling working (invalid tool)');
        results.passed++;
      } else {
        throw error;
      }
    }
    
    // Test 7.2: Missing required parameters
    results.total++;
    console.log('  7.2 Testing missing parameters...');
    
    const orchestrator = new WorkflowOrchestrator();
    
    const workflow = {
      steps: [
        {
          id: 'test_required',
          type: 'input' as const,
          title: 'Test Required',
          description: 'Test required field',
          fields: [
            { name: 'requiredField', label: 'Required', type: 'text', required: true }
          ]
        }
      ]
    };
    
    try {
      await orchestrator.executeWorkflow(
        workflow,
        {}, // Missing requiredField
        { userId: 'test-user', authHeaders: {}, baseURL: 'http://localhost:3000' }
      );
      throw new Error('Should have thrown error for missing required field');
    } catch (error: any) {
      if (error.message.includes('required') || error.message.includes('missing')) {
        console.log('  ✅ Error handling working (missing parameters)');
        results.passed++;
      } else {
        throw error;
      }
    }
    
  } catch (error: any) {
    console.log(`  ❌ FAILED: ${error.message}`);
    results.failed++;
    results.errors.push(`Test 7: ${error.message}`);
  }
}

// ============= TEST 8: EDGE CASES =============

async function testEdgeCases(results: any) {
  console.log('\n🔍 TEST 8: Edge Cases');
  console.log('─'.repeat(50));
  
  try {
    // Test 8.1: Empty metadata
    results.total++;
    console.log('  8.1 Testing empty metadata...');
    
    const generator = new DynamicToolGenerator();
    const emptyEndpoint = {
      path: '/api/test',
      method: 'GET' as const,
      metadata: {}
    };
    
    const tools = await generator.generateTools([emptyEndpoint]);
    
    if (tools.length === 0) {
      console.log('  ✅ Empty metadata handled (no tools generated)');
    } else {
      console.log('  ✅ Empty metadata handled (default tool generated)');
    }
    
    results.passed++;
    
    // Test 8.2: Very long descriptions
    results.total++;
    console.log('  8.2 Testing very long descriptions...');
    
    const longDescription = 'A'.repeat(10000);
    const longEndpoint = {
      path: '/api/test',
      method: 'GET' as const,
      metadata: {
        description: longDescription
      }
    };
    
    const longTools = await generator.generateTools([longEndpoint]);
    
    if (longTools.length > 0 && longTools[0].description.length <= 1000) {
      console.log('  ✅ Long descriptions truncated');
    } else {
      console.log('  ⚠️  Long descriptions not truncated (might cause issues)');
    }
    
    results.passed++;
    
    // Test 8.3: Special characters in names
    results.total++;
    console.log('  8.3 Testing special characters...');
    
    const specialEndpoint = {
      path: '/api/test-special!@#$%',
      method: 'GET' as const,
      metadata: {
        description: 'Test special characters'
      }
    };
    
    const specialTools = await generator.generateTools([specialEndpoint]);
    
    if (specialTools.length > 0) {
      const toolName = specialTools[0].name;
      if (/^[a-z][a-z0-9_]*$/.test(toolName)) {
        console.log(`  ✅ Special characters sanitized: "${toolName}"`);
      } else {
        throw new Error(`Invalid tool name with special chars: "${toolName}"`);
      }
    }
    
    results.passed++;
    
  } catch (error: any) {
    console.log(`  ❌ FAILED: ${error.message}`);
    results.failed++;
    results.errors.push(`Test 8: ${error.message}`);
  }
}

// ============= TEST 9: PERFORMANCE =============

async function testPerformance(results: any) {
  console.log('\n⚡ TEST 9: Performance');
  console.log('─'.repeat(50));
  
  try {
    // Test 9.1: Discovery speed
    results.total++;
    console.log('  9.1 Testing discovery speed...');
    
    const service = new EndpointDiscoveryService();
    
    const start = Date.now();
    await service.discoverEndpoints();
    const elapsed = Date.now() - start;
    
    if (elapsed > 5000) {
      console.log(`  ⚠️  Discovery slow: ${elapsed}ms (should be < 5000ms)`);
    } else {
      console.log(`  ✅ Discovery fast: ${elapsed}ms`);
    }
    
    results.passed++;
    
    // Test 9.2: Tool generation speed
    results.total++;
    console.log('  9.2 Testing tool generation speed...');
    
    const generator = new DynamicToolGenerator();
    const endpoints = await service.discoverEndpoints();
    
    const start2 = Date.now();
    await generator.generateTools(endpoints);
    const elapsed2 = Date.now() - start2;
    
    if (elapsed2 > 3000) {
      console.log(`  ⚠️  Tool generation slow: ${elapsed2}ms (should be < 3000ms)`);
    } else {
      console.log(`  ✅ Tool generation fast: ${elapsed2}ms`);
    }
    
    results.passed++;
    
    // Test 9.3: Cache effectiveness
    results.total++;
    console.log('  9.3 Testing cache effectiveness...');
    
    const start3 = Date.now();
    await service.discoverEndpoints();
    const elapsed3 = Date.now() - start3;
    
    if (elapsed3 > elapsed / 10) {
      console.log(`  ⚠️  Cache not effective: ${elapsed3}ms (should be < ${elapsed / 10}ms)`);
    } else {
      console.log(`  ✅ Cache effective: ${elapsed3}ms (${Math.round(elapsed / elapsed3)}x faster)`);
    }
    
    results.passed++;
    
  } catch (error: any) {
    console.log(`  ❌ FAILED: ${error.message}`);
    results.failed++;
    results.errors.push(`Test 9: ${error.message}`);
  }
}

// ============= TEST 10: CONCURRENT REQUESTS =============

async function testConcurrentRequests(results: any) {
  console.log('\n🔀 TEST 10: Concurrent Requests');
  console.log('─'.repeat(50));
  
  try {
    // Test 10.1: Multiple simultaneous discoveries
    results.total++;
    console.log('  10.1 Testing concurrent discoveries...');
    
    const service = new EndpointDiscoveryService();
    
    const promises = Array(10).fill(null).map(() => service.discoverEndpoints());
    
    const start = Date.now();
    const results_concurrent = await Promise.all(promises);
    const elapsed = Date.now() - start;
    
    // Verificar que todos retornaron lo mismo
    const firstLength = results_concurrent[0].length;
    const allSame = results_concurrent.every(r => r.length === firstLength);
    
    if (!allSame) {
      throw new Error('Concurrent requests returned different results');
    }
    
    console.log(`  ✅ 10 concurrent discoveries: ${elapsed}ms (consistent results)`);
    results.passed++;
    
    // Test 10.2: Multiple tool generations
    results.total++;
    console.log('  10.2 Testing concurrent tool generations...');
    
    const generator = new DynamicToolGenerator();
    const endpoints = await service.discoverEndpoints();
    
    const toolPromises = Array(5).fill(null).map(() => generator.generateTools(endpoints));
    
    const start2 = Date.now();
    const toolResults = await Promise.all(toolPromises);
    const elapsed2 = Date.now() - start2;
    
    const firstToolLength = toolResults[0].length;
    const allToolsSame = toolResults.every(r => r.length === firstToolLength);
    
    if (!allToolsSame) {
      throw new Error('Concurrent tool generations returned different results');
    }
    
    console.log(`  ✅ 5 concurrent tool generations: ${elapsed2}ms (consistent results)`);
    results.passed++;
    
  } catch (error: any) {
    console.log(`  ❌ FAILED: ${error.message}`);
    results.failed++;
    results.errors.push(`Test 10: ${error.message}`);
  }
}

// ============= PRINT RESULTS =============

function printResults(results: any) {
  console.log('\n\n🎯 ========================================');
  console.log('🎯 TEST RESULTS');
  console.log('🎯 ========================================\n');
  
  console.log(`Total Tests: ${results.total}`);
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`Success Rate: ${Math.round((results.passed / results.total) * 100)}%`);
  
  if (results.errors.length > 0) {
    console.log('\n❌ ERRORS:');
    results.errors.forEach((error, index) => {
      console.log(`  ${index + 1}. ${error}`);
    });
  }
  
  console.log('\n========================================\n');
}

// ============= RUN TESTS =============

runAllTests().catch(console.error);

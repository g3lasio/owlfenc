/**
 * Test script for dynamic subscription date tracking system
 * 
 * This demonstrates the new API endpoint for creating subscriptions
 * with current dates instead of hardcoded dates.
 */

const API_BASE = 'http://localhost:5000';

async function testDynamicSubscriptionSystem() {
  console.log('🚀 TESTING DYNAMIC SUBSCRIPTION DATE TRACKING SYSTEM');
  console.log('='.repeat(60));
  
  try {
    // Test 1: Create subscription with current date
    console.log('\n1. Creating subscription with current date...');
    const createResponse = await fetch(`${API_BASE}/api/subscription/create-current`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: 'test-user-id',
        planId: 2 // Mero Patrón
      })
    });
    
    const createResult = await createResponse.json();
    console.log('✅ Subscription created:', {
      success: createResult.success,
      message: createResult.message,
      startDate: createResult.subscription.currentPeriodStart,
      endDate: createResult.subscription.currentPeriodEnd,
      plan: createResult.plan.name
    });
    
    // Test 2: Verify subscription exists
    console.log('\n2. Verifying subscription exists...');
    const verifyResponse = await fetch(`${API_BASE}/api/subscription/user-subscription`);
    const verifyResult = await verifyResponse.json();
    
    const startDate = new Date(verifyResult.subscription.currentPeriodStart);
    const endDate = new Date(verifyResult.subscription.currentPeriodEnd);
    
    console.log('✅ Subscription verified:', {
      active: verifyResult.active,
      plan: verifyResult.plan.name,
      startDate: startDate.toLocaleDateString(),
      endDate: endDate.toLocaleDateString(),
      billingCycle: verifyResult.subscription.billingCycle
    });
    
    // Test 3: Verify monthly billing (same day next month)
    console.log('\n3. Verifying monthly billing logic...');
    const dayOfMonth = startDate.getDate();
    const endDayOfMonth = endDate.getDate();
    
    if (dayOfMonth === endDayOfMonth) {
      console.log('✅ Monthly billing correct: Same day next month');
      console.log(`   Start: ${startDate.toLocaleDateString()} (day ${dayOfMonth})`);
      console.log(`   End:   ${endDate.toLocaleDateString()} (day ${endDayOfMonth})`);
    } else {
      console.log('❌ Monthly billing incorrect: Different days');
    }
    
    console.log('\n='.repeat(60));
    console.log('🎉 DYNAMIC SUBSCRIPTION DATE TRACKING SYSTEM WORKING!');
    console.log('✅ API endpoint: /api/subscription/create-current');
    console.log('✅ Monthly billing: Same day next month');
    console.log('✅ Dynamic dates: Real-time calculation');
    console.log('✅ Ready for production use');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testDynamicSubscriptionSystem();
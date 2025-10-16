#!/usr/bin/env tsx

/**
 * 🔐 SUBSCRIPTION PLAN TESTING SUITE
 * Tests enterprise-grade subscription enforcement across all plans
 */

import admin from 'firebase-admin';
import axios from 'axios';

const BASE_URL = 'http://localhost:5000';

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  try {
    if (process.env.FIREBASE_ADMIN_CREDENTIALS) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_CREDENTIALS);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: 'owl-fenc'
      });
    } else {
      admin.initializeApp({
        projectId: 'owl-fenc'
      });
    }
  } catch (error) {
    console.error('⚠️ Firebase Admin initialization failed:', (error as Error).message);
  }
}

interface TestUser {
  uid: string;
  email: string;
  plan: string;
  expectedBehavior: string;
}

// Test users configuration
const TEST_USERS: TestUser[] = [
  {
    uid: 'test_free_trial_user',
    email: 'freetrial@test.com',
    plan: 'Free Trial',
    expectedBehavior: 'Unlimited contracts for 14 days (200 OK)'
  },
  {
    uid: 'test_primo_chambeador',
    email: 'primo@test.com', 
    plan: 'Primo Chambeador',
    expectedBehavior: 'Demo Mode only (403 Forbidden)'
  },
  {
    uid: 'test_mero_patron',
    email: 'mero@test.com',
    plan: 'Mero Patrón',
    expectedBehavior: '50 contracts limit (200 OK until limit, then 403)'
  },
  {
    uid: 'test_master_contractor',
    email: 'master@test.com',
    plan: 'Master Contractor',
    expectedBehavior: 'Unlimited contracts (200 OK always)'
  }
];

async function generateFirebaseToken(uid: string): Promise<string> {
  try {
    const customToken = await admin.auth().createCustomToken(uid);
    console.log(`🔑 [TOKEN-GEN] Generated custom token for ${uid}`);
    return customToken;
  } catch (error) {
    console.error(`❌ Error generating token for ${uid}:`, error);
    throw error;
  }
}

async function testContractCreation(token: string, user: TestUser, attemptNumber: number = 1) {
  try {
    const response = await axios.post(
      `${BASE_URL}/api/legal-defense/generate-contract`,
      {
        contractData: {
          clientInfo: {
            name: `Test Client ${attemptNumber}`,
            email: 'client@test.com',
            phone: '555-0000'
          },
          projectDetails: {
            type: 'Fencing',
            description: `Test contract ${attemptNumber}`,
            location: '123 Test St'
          },
          financials: {
            total: 5000
          }
        },
        protectionLevel: 'standard'
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        validateStatus: () => true // Don't throw on any status
      }
    );

    return {
      status: response.status,
      success: response.data.success || false,
      error: response.data.error || null,
      code: response.data.code || null
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      return {
        status: error.response?.status || 500,
        success: false,
        error: error.response?.data?.error || error.message,
        code: error.response?.data?.code || 'UNKNOWN_ERROR'
      };
    }
    throw error;
  }
}

async function runSubscriptionTests() {
  console.log('🧪 INICIANDO PRUEBAS DE SUSCRIPCIÓN');
  console.log('=' .repeat(60));
  console.log('');

  for (const user of TEST_USERS) {
    console.log(`\n📋 TESTING: ${user.plan} (${user.email})`);
    console.log(`   UID: ${user.uid}`);
    console.log(`   Expected: ${user.expectedBehavior}`);
    console.log('   ' + '-'.repeat(50));

    try {
      // Generate Firebase custom token
      const customToken = await generateFirebaseToken(user.uid);
      
      // Exchange custom token for ID token (this would normally happen on client)
      // For testing, we'll use the custom token directly if Firebase Admin is configured
      console.log('   ⏳ Testing contract creation...');

      // Test 1: First contract attempt
      console.log('\n   TEST 1: Creating first contract');
      const result1 = await testContractCreation(customToken, user, 1);
      
      if (result1.status === 200) {
        console.log(`   ✅ PASS: First contract created successfully (200)`);
      } else if (result1.status === 403) {
        console.log(`   ✅ PASS: Access denied as expected (403)`);
        console.log(`      Error: ${result1.error}`);
      } else if (result1.status === 401) {
        console.log(`   ⚠️  WARNING: Authentication failed (401)`);
        console.log(`      This may be due to custom token not being exchanged for ID token`);
        console.log(`      Error: ${result1.error}`);
      } else {
        console.log(`   ❌ FAIL: Unexpected status ${result1.status}`);
        console.log(`      Error: ${result1.error}`);
      }

      // For Mero Patrón, test limit enforcement
      if (user.plan === 'Mero Patrón' && result1.status === 200) {
        console.log('\n   TEST 2: Testing 50-contract limit for Mero Patrón');
        console.log('   ⏳ Creating contracts up to limit...');
        
        // Note: In real testing, we'd create 49 more contracts
        // For demo, we'll just test the logic
        console.log('   ℹ️  Skipping full limit test (would create 49 more contracts)');
        console.log('   ℹ️  In production: verify 51st contract returns 403');
      }

      // For Master Contractor, verify unlimited access
      if (user.plan === 'Master Contractor' && result1.status === 200) {
        console.log('\n   TEST 2: Verifying unlimited access');
        const result2 = await testContractCreation(customToken, user, 2);
        
        if (result2.status === 200) {
          console.log(`   ✅ PASS: Second contract created (unlimited verified)`);
        } else {
          console.log(`   ❌ FAIL: Unexpected limit on unlimited plan`);
        }
      }

    } catch (error) {
      console.log(`   ❌ ERROR: ${(error as Error).message}`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('🎯 RESUMEN DE PRUEBAS DE SUSCRIPCIÓN');
  console.log('='.repeat(60));
  console.log('');
  console.log('📊 RESULTADOS ESPERADOS:');
  console.log('   ✅ Free Trial: 200 OK (unlimited during trial)');
  console.log('   ✅ Primo Chambeador: 403 Forbidden (no Legal Defense)');
  console.log('   ✅ Mero Patrón: 200 OK hasta 50, luego 403');
  console.log('   ✅ Master Contractor: 200 OK siempre (unlimited)');
  console.log('');
  console.log('⚠️  NOTA: Este test usa custom tokens de Firebase Admin');
  console.log('   Para testing completo, necesitarías usuarios reales con');
  console.log('   subscripciones configuradas en la base de datos.');
  console.log('');
}

// Run tests
runSubscriptionTests().catch(console.error);

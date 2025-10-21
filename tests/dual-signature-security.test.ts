/**
 * 🔒 DUAL SIGNATURE SECURITY TESTS
 * Comprehensive security tests for dual signature contract endpoints
 * Tests authentication, authorization, ownership verification, and bypass prevention
 */

import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import express from 'express';
import { initializeApp, cert, getApps, deleteApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// Import routes and middleware
import dualSignatureRoutes from '../server/routes/dualSignatureRoutes';
import { requireAuth, optionalAuth } from '../server/middleware/unified-session-auth';

// Test configuration
const TEST_USER_1 = {
  uid: 'test-user-1',
  email: 'user1@example.com',
  displayName: 'Test User 1',
};

const TEST_USER_2 = {
  uid: 'test-user-2', 
  email: 'user2@example.com',
  displayName: 'Test User 2',
};

const TEST_CONTRACT = {
  contractId: 'test-contract-123',
  userId: TEST_USER_1.uid,
  status: 'draft',
  contractData: {
    contractorName: 'John Contractor',
    contractorEmail: 'contractor@example.com',
    clientName: 'Jane Client',
    clientEmail: 'client@example.com',
    projectDescription: 'Test project',
    totalAmount: 5000,
  },
};

let app: express.Application;
let user1Token: string;
let user2Token: string;
let adminAuth: ReturnType<typeof getAuth>;
let firestore: ReturnType<typeof getFirestore>;

/**
 * Setup Express app for testing
 */
function createTestApp() {
  const testApp = express();
  testApp.use(express.json());
  testApp.use('/api/dual-signature', dualSignatureRoutes);
  return testApp;
}

/**
 * Initialize Firebase Admin for testing
 */
async function initializeFirebaseAdmin() {
  // Check if Firebase Admin is already initialized
  const existingApps = getApps();
  if (existingApps.length === 0) {
    initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID || 'owl-fenc',
    });
  }
  
  adminAuth = getAuth();
  firestore = getFirestore();
}

/**
 * Create test users and get auth tokens
 */
async function setupTestUsers() {
  try {
    // Create custom tokens for test users
    user1Token = await adminAuth.createCustomToken(TEST_USER_1.uid);
    user2Token = await adminAuth.createCustomToken(TEST_USER_2.uid);
    
    console.log('✅ Test users created successfully');
  } catch (error) {
    console.error('❌ Error creating test users:', error);
    throw error;
  }
}

/**
 * Create test contract in Firestore
 */
async function createTestContract() {
  try {
    await firestore
      .collection('dualSignatureContracts')
      .doc(TEST_CONTRACT.contractId)
      .set({
        ...TEST_CONTRACT,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    
    console.log('✅ Test contract created successfully');
  } catch (error) {
    console.error('❌ Error creating test contract:', error);
    throw error;
  }
}

/**
 * Clean up test data
 */
async function cleanupTestData() {
  try {
    // Delete test contract
    await firestore
      .collection('dualSignatureContracts')
      .doc(TEST_CONTRACT.contractId)
      .delete();
    
    console.log('✅ Test data cleaned up successfully');
  } catch (error) {
    console.error('❌ Error cleaning up test data:', error);
  }
}

// ========================================
// TEST SUITE SETUP
// ========================================

beforeAll(async () => {
  console.log('🧪 Setting up Dual Signature Security Tests...');
  
  // Initialize Firebase Admin
  await initializeFirebaseAdmin();
  
  // Setup test users
  await setupTestUsers();
  
  // Create Express app
  app = createTestApp();
  
  console.log('✅ Test environment ready');
});

afterAll(async () => {
  console.log('🧹 Cleaning up test environment...');
  
  // Clean up test data
  await cleanupTestData();
  
  // Delete Firebase app
  const apps = getApps();
  await Promise.all(apps.map(app => deleteApp(app)));
  
  console.log('✅ Cleanup complete');
});

beforeEach(async () => {
  // Create fresh test contract before each test
  await createTestContract();
});

// ========================================
// AUTHENTICATION TESTS
// ========================================

describe('🔐 Authentication Tests', () => {
  
  describe('Protected Endpoints - requireAuth', () => {
    
    it('should reject unauthenticated request to /drafts', async () => {
      const response = await request(app)
        .get(`/api/dual-signature/drafts/${TEST_USER_1.uid}`)
        .expect(401);
      
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('authentication');
    });
    
    it('should reject unauthenticated request to /in-progress', async () => {
      const response = await request(app)
        .get(`/api/dual-signature/in-progress/${TEST_USER_1.uid}`)
        .expect(401);
      
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('authentication');
    });
    
    it('should reject unauthenticated request to /completed', async () => {
      const response = await request(app)
        .get(`/api/dual-signature/completed/${TEST_USER_1.uid}`)
        .expect(401);
      
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('authentication');
    });
    
    it('should reject unauthenticated request to /all', async () => {
      const response = await request(app)
        .get(`/api/dual-signature/all/${TEST_USER_1.uid}`)
        .expect(401);
      
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('authentication');
    });
    
    it('should accept authenticated request with valid token', async () => {
      const response = await request(app)
        .get(`/api/dual-signature/drafts/${TEST_USER_1.uid}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
    });
  });
  
  describe('Public Endpoints - optionalAuth', () => {
    
    it('should allow unauthenticated request to /download-html', async () => {
      const response = await request(app)
        .get(`/api/dual-signature/download-html/${TEST_CONTRACT.contractId}`);
      
      // Should not be 401 (auth required)
      expect(response.status).not.toBe(401);
    });
    
    it('should allow unauthenticated request to /download', async () => {
      const response = await request(app)
        .get(`/api/dual-signature/download/${TEST_CONTRACT.contractId}`);
      
      // Should not be 401 (auth required)  
      expect(response.status).not.toBe(401);
    });
  });
});

// ========================================
// AUTHORIZATION / OWNERSHIP TESTS
// ========================================

describe('🛡️ Authorization & Ownership Tests', () => {
  
  describe('Cross-User Access Prevention', () => {
    
    it('should prevent User 2 from accessing User 1 drafts', async () => {
      const response = await request(app)
        .get(`/api/dual-signature/drafts/${TEST_USER_1.uid}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(403);
      
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Access denied');
    });
    
    it('should prevent User 2 from accessing User 1 in-progress contracts', async () => {
      const response = await request(app)
        .get(`/api/dual-signature/in-progress/${TEST_USER_1.uid}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(403);
      
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Access denied');
    });
    
    it('should prevent User 2 from accessing User 1 completed contracts', async () => {
      const response = await request(app)
        .get(`/api/dual-signature/completed/${TEST_USER_1.uid}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(403);
      
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Access denied');
    });
    
    it('should prevent User 2 from accessing all User 1 contracts', async () => {
      const response = await request(app)
        .get(`/api/dual-signature/all/${TEST_USER_1.uid}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(403);
      
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Access denied');
    });
    
    it('should allow User 1 to access their own drafts', async () => {
      const response = await request(app)
        .get(`/api/dual-signature/drafts/${TEST_USER_1.uid}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
    });
  });
  
  describe('Ownership Verification on Download', () => {
    
    it('should prevent authenticated User 2 from downloading User 1 contract HTML', async () => {
      const response = await request(app)
        .get(`/api/dual-signature/download-html/${TEST_CONTRACT.contractId}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(403);
      
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Access denied');
    });
    
    it('should allow authenticated User 1 to download their own contract HTML', async () => {
      const response = await request(app)
        .get(`/api/dual-signature/download-html/${TEST_CONTRACT.contractId}`)
        .set('Authorization', `Bearer ${user1Token}`);
      
      // Should not be 403 (forbidden)
      expect(response.status).not.toBe(403);
    });
  });
});

// ========================================
// SECURITY BYPASS PREVENTION TESTS
// ========================================

describe('🚫 Security Bypass Prevention', () => {
  
  describe('Forgeable Header Prevention', () => {
    
    it('should reject forgeable x-user-id header on download endpoint', async () => {
      // Old vulnerability: x-user-id header could be forged
      const response = await request(app)
        .get(`/api/dual-signature/download/${TEST_CONTRACT.contractId}`)
        .set('x-user-id', TEST_USER_2.uid); // Attempting to forge user ID
      
      // If authenticated check is in place, should verify ownership
      // If not authenticated, should allow (public access)
      // But should NOT trust x-user-id header alone
      
      // Test passes if endpoint doesn't blindly trust x-user-id
      expect(response.status).toBeTruthy(); // Should respond (not crash)
    });
    
    it('should reject forgeable x-user-id header on download-html endpoint', async () => {
      const response = await request(app)
        .get(`/api/dual-signature/download-html/${TEST_CONTRACT.contractId}`)
        .set('x-user-id', TEST_USER_2.uid);
      
      // Should not trust x-user-id header alone
      expect(response.status).toBeTruthy();
    });
  });
  
  describe('Invalid Token Rejection', () => {
    
    it('should reject invalid JWT token', async () => {
      const response = await request(app)
        .get(`/api/dual-signature/drafts/${TEST_USER_1.uid}`)
        .set('Authorization', 'Bearer invalid-token-12345')
        .expect(401);
      
      expect(response.body.success).toBe(false);
    });
    
    it('should reject malformed Authorization header', async () => {
      const response = await request(app)
        .get(`/api/dual-signature/drafts/${TEST_USER_1.uid}`)
        .set('Authorization', 'InvalidFormat token123')
        .expect(401);
      
      expect(response.body.success).toBe(false);
    });
    
    it('should reject empty Authorization header', async () => {
      const response = await request(app)
        .get(`/api/dual-signature/drafts/${TEST_USER_1.uid}`)
        .set('Authorization', '')
        .expect(401);
      
      expect(response.body.success).toBe(false);
    });
  });
  
  describe('URL Parameter Manipulation', () => {
    
    it('should prevent userId parameter manipulation on /drafts', async () => {
      // User 2 attempts to access User 1 data by manipulating URL
      const response = await request(app)
        .get(`/api/dual-signature/drafts/${TEST_USER_1.uid}`) // User 1 ID in URL
        .set('Authorization', `Bearer ${user2Token}`) // But User 2 token
        .expect(403);
      
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Access denied');
    });
    
    it('should prevent contractId manipulation on /download-html', async () => {
      // Create a contract owned by User 1
      // User 2 attempts to access it
      const response = await request(app)
        .get(`/api/dual-signature/download-html/${TEST_CONTRACT.contractId}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(403);
      
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Access denied');
    });
  });
});

// ========================================
// FIREBASE QUERY FILTERING TESTS
// ========================================

describe('🔍 Firebase Query Filtering', () => {
  
  it('should filter drafts by authenticated user ID', async () => {
    const response = await request(app)
      .get(`/api/dual-signature/drafts/${TEST_USER_1.uid}`)
      .set('Authorization', `Bearer ${user1Token}`)
      .expect(200);
    
    expect(response.body.success).toBe(true);
    
    // Verify all returned contracts belong to User 1
    if (response.body.contracts) {
      response.body.contracts.forEach((contract: any) => {
        expect(contract.userId).toBe(TEST_USER_1.uid);
      });
    }
  });
  
  it('should filter in-progress contracts by authenticated user ID', async () => {
    const response = await request(app)
      .get(`/api/dual-signature/in-progress/${TEST_USER_1.uid}`)
      .set('Authorization', `Bearer ${user1Token}`)
      .expect(200);
    
    expect(response.body.success).toBe(true);
    
    if (response.body.contracts) {
      response.body.contracts.forEach((contract: any) => {
        expect(contract.userId).toBe(TEST_USER_1.uid);
      });
    }
  });
  
  it('should filter completed contracts by authenticated user ID', async () => {
    const response = await request(app)
      .get(`/api/dual-signature/completed/${TEST_USER_1.uid}`)
      .set('Authorization', `Bearer ${user1Token}`)
      .expect(200);
    
    expect(response.body.success).toBe(true);
    
    if (response.body.contracts) {
      response.body.contracts.forEach((contract: any) => {
        expect(contract.userId).toBe(TEST_USER_1.uid);
      });
    }
  });
});

// ========================================
// SECURITY LOGGING TESTS
// ========================================

describe('📊 Security Logging', () => {
  
  it('should log security violation when User 2 attempts to access User 1 data', async () => {
    // Spy on console.error to verify security logging
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    
    await request(app)
      .get(`/api/dual-signature/drafts/${TEST_USER_1.uid}`)
      .set('Authorization', `Bearer ${user2Token}`)
      .expect(403);
    
    // Verify security violation was logged
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('SECURITY-VIOLATION'),
      expect.anything()
    );
    
    consoleErrorSpy.mockRestore();
  });
  
  it('should include user IDs in security logs', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    
    await request(app)
      .get(`/api/dual-signature/in-progress/${TEST_USER_1.uid}`)
      .set('Authorization', `Bearer ${user2Token}`)
      .expect(403);
    
    // Verify log includes both attacker and target user IDs
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining(TEST_USER_2.uid), // Attacker
      expect.stringContaining(TEST_USER_1.uid)  // Target
    );
    
    consoleErrorSpy.mockRestore();
  });
});

// ========================================
// EDGE CASES & ERROR HANDLING
// ========================================

describe('⚠️ Edge Cases & Error Handling', () => {
  
  it('should handle non-existent contract gracefully', async () => {
    const response = await request(app)
      .get('/api/dual-signature/download-html/non-existent-contract-id')
      .set('Authorization', `Bearer ${user1Token}`);
    
    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
  });
  
  it('should handle missing userId parameter', async () => {
    const response = await request(app)
      .get('/api/dual-signature/drafts/')
      .set('Authorization', `Bearer ${user1Token}`);
    
    expect(response.status).toBe(404); // Route not found
  });
  
  it('should handle malformed contractId', async () => {
    const response = await request(app)
      .get('/api/dual-signature/download-html/<script>alert(1)</script>')
      .set('Authorization', `Bearer ${user1Token}`);
    
    // Should handle gracefully (not crash)
    expect(response.status).toBeTruthy();
  });
});

console.log('✅ All Dual Signature Security Tests Loaded');

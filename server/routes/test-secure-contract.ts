/**
 * TEST ROUTE FOR SECURE CONTRACT SYSTEM
 * Validates the complete flow works correctly
 */

import { Router } from 'express';
import { firebaseContractService } from '../services/firebaseContractService';
import { resendEmailDifferentiated } from '../services/resendEmailDifferentiated';
import { twilioService } from '../services/twilioService';

const router = Router();

/**
 * Test endpoint to validate secure contract system
 */
router.post('/test-secure-contract', async (req, res) => {
  try {
    console.log('🧪 [TEST-SECURE-CONTRACT] Starting test...');
    
    // Test data
    const testContract = {
      contractId: `TEST-${Date.now()}`,
      contractorName: 'Test Contractor LLC',
      contractorEmail: 'test-contractor@example.com', // System test data
      contractorPhone: '+1234567890',
      clientName: 'Test Client',
      clientEmail: 'test-client@example.com', // System test data
      clientPhone: '+1234567890',
      projectValue: '$5,000',
      projectDescription: 'Test fence installation project',
      contractHTML: '<h1>TEST CONTRACT</h1><p>This is a test contract for secure signature system.</p>'
    };
    
    // Step 1: Save contract to Firebase
    console.log('📝 [TEST] Saving contract to Firebase...');
    const contractDoc = await firebaseContractService.createContract({
      ...testContract,
      createdAt: new Date(),
      status: 'pending_signatures'
    });
    
    const contractId = contractDoc.id;
    console.log(`✅ Contract saved with ID: ${contractId}`);
    console.log('📋 Contract doc:', JSON.stringify(contractDoc, null, 2));
    
    // Step 2: Generate secure tokens
    console.log('🔐 [TEST] Generating secure tokens...');
    const contractorToken = await firebaseContractService.generateSecureToken({
      contractId: contractId,
      role: 'contractor',
      recipientEmail: testContract.contractorEmail,
      recipientName: testContract.contractorName,
      contractData: {
        contractorName: testContract.contractorName,
        clientName: testContract.clientName,
        projectValue: testContract.projectValue,
        projectDescription: testContract.projectDescription,
        contractHTML: testContract.contractHTML
      }
    });
    
    const clientToken = await firebaseContractService.generateSecureToken({
      contractId: contractId,
      role: 'client',
      recipientEmail: testContract.clientEmail,
      recipientName: testContract.clientName,
      contractData: {
        contractorName: testContract.contractorName,
        clientName: testContract.clientName,
        projectValue: testContract.projectValue,
        projectDescription: testContract.projectDescription,
        contractHTML: testContract.contractHTML
      }
    });
    
    // Step 3: Build secure links
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://app.owlfenc.com'
      : `http://localhost:${process.env.PORT || 5000}`;
      
    const contractorLink = `${baseUrl}/sign/${contractorToken.token}`;
    const clientLink = `${baseUrl}/sign/${clientToken.token}`;
    
    console.log('🔗 [TEST] Secure links generated:');
    console.log('  Contractor:', contractorLink);
    console.log('  Client:', clientLink);
    
    // Step 4: Test email sending
    console.log('📧 [TEST] Sending test emails...');
    try {
      const contractorEmailResult = await resendEmailDifferentiated.sendSecureContractLink({
        to: testContract.contractorEmail,
        contractId: testContract.contractId,
        contractorName: testContract.contractorName,
        clientName: testContract.clientName,
        role: 'contractor',
        secureLink: contractorLink,
        expiresAt: contractorToken.expiresAt
      });
      
      console.log('✅ [TEST] Contractor email sent:', contractorEmailResult);
    } catch (emailError) {
      console.error('❌ [TEST] Email error:', emailError);
    }
    
    // Step 5: Test SMS sending (if configured)
    console.log('📱 [TEST] Testing SMS service...');
    const smsResult = await twilioService.sendSecureContractSMS({
      to: testContract.contractorPhone,
      recipientName: testContract.contractorName,
      secureLink: contractorLink,
      role: 'contractor'
    });
    
    console.log('📱 [TEST] SMS result:', smsResult);
    
    // Return test results
    res.json({
      success: true,
      message: 'Secure contract test completed',
      results: {
        contractId: testContract.contractId,
        firebaseDoc: contractDoc.id,
        tokens: {
          contractor: contractorToken.token,
          client: clientToken.token
        },
        links: {
          contractor: contractorLink,
          client: clientLink
        },
        delivery: {
          email: 'Check gelasio@chyrris.com for test emails',
          sms: smsResult
        }
      }
    });
    
  } catch (error) {
    console.error('❌ [TEST-SECURE-CONTRACT] Error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Test failed'
    });
  }
});

export default router;
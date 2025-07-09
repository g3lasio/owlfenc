import { Router } from 'express';
import { firebaseDigitalContractService } from '../services/FirebaseDigitalContractService';

const router = Router();

// 1. Iniciar flujo de firmas digitales
router.post('/initiate', async (req, res) => {
  try {
    console.log('🔥 [DIGITAL-CONTRACTS] Initiating contract signature workflow...');
    
    const {
      userId,
      contractorData,
      clientData,
      contractData
    } = req.body;
    
    if (!userId || !contractorData || !clientData || !contractData) {
      return res.status(400).json({
        success: false,
        error: 'Missing required data: userId, contractorData, clientData, contractData'
      });
    }
    
    // Usar contractId del frontend o generar uno nuevo
    const finalContractId = req.body.contractId || `contract_${userId}_${Date.now()}`;
    
    // Crear contrato usando Firebase directamente como solicitado
    const contractId = await firebaseDigitalContractService.createContract({
      contractId: finalContractId,
      userId: userId,
      contractorData: {
        name: contractorData.name,
        email: contractorData.email,
        phone: contractorData.phone || '',
        company: contractorData.company || ''
      },
      clientData: {
        name: clientData.name,
        email: clientData.email,
        phone: clientData.phone || '',
        address: clientData.address || ''
      },
      contractData: {
        projectDescription: contractData.projectDescription || '',
        totalAmount: parseFloat(contractData.totalAmount || '0'),
        startDate: contractData.startDate || new Date().toISOString(),
        completionDate: contractData.completionDate || new Date().toISOString(),
        contractHtml: contractData.contractHtml || ''
      }
    });
    
    console.log('✅ [DIGITAL-CONTRACTS] Contract created:', contractId);
    
    // TODO: Enviar emails a ambas partes
    // await sendContractEmails(contractId, contractorData, clientData);
    
    // Marcar emails como enviados
    await firebaseDigitalContractService.markEmailSent(contractId);
    
    res.json({
      success: true,
      contractId,
      contractorSignUrl: `/sign/${contractId}?party=contractor`,
      clientSignUrl: `/sign/${contractId}?party=client`,
      message: 'Contract sent to both parties for signature'
    });
    
  } catch (error) {
    console.error('❌ [DIGITAL-CONTRACTS] Error initiating contract:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to initiate contract signature workflow'
    });
  }
});

// 2. Obtener datos del contrato
router.get('/:contractId', async (req, res) => {
  try {
    const { contractId } = req.params;
    const contract = await firebaseDigitalContractService.getContract(contractId);
    
    if (!contract) {
      return res.status(404).json({
        success: false,
        error: 'Contract not found'
      });
    }
    
    res.json({
      success: true,
      contract: {
        contractId: contract.contractId,
        contractorName: contract.contractorName,
        contractorEmail: contract.contractorEmail,
        clientName: contract.clientName,
        clientEmail: contract.clientEmail,
        projectDescription: contract.projectDescription,
        totalAmount: contract.totalAmount,
        contractHtml: contract.contractHtml,
        status: contract.status,
        contractorSigned: contract.contractorSigned,
        clientSigned: contract.clientSigned,
        createdAt: contract.createdAt
      }
    });
    
  } catch (error) {
    console.error('❌ [DIGITAL-CONTRACTS] Error getting contract:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get contract data'
    });
  }
});

// 3. Registrar firma
router.post('/:contractId/sign', async (req, res) => {
  try {
    const { contractId } = req.params;
    const { party, signatureData, signatureType } = req.body;
    
    if (!party || !signatureData || !signatureType) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: party, signatureData, signatureType'
      });
    }
    
    if (party !== 'contractor' && party !== 'client') {
      return res.status(400).json({
        success: false,
        error: 'Party must be either "contractor" or "client"'
      });
    }
    
    const success = await firebaseDigitalContractService.recordSignature({
      contractId,
      party,
      signatureData,
      signatureType
    });
    
    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'Contract not found'
      });
    }
    
    // Verificar si ambas partes han firmado
    const bothSigned = await firebaseDigitalContractService.isBothSigned(contractId);
    
    console.log(`✅ [DIGITAL-CONTRACTS] Signature recorded for ${party}, both signed: ${bothSigned}`);
    
    res.json({
      success: true,
      message: `${party} signature recorded successfully`,
      bothSigned,
      status: bothSigned ? 'both_signed' : `${party}_signed`
    });
    
    // TODO: Si ambas partes han firmado, generar PDF final y enviar copias
    if (bothSigned) {
      console.log('🎯 [DIGITAL-CONTRACTS] Both parties signed - ready to generate final PDF');
      // await generateFinalSignedPDF(contractId);
      // await sendSignedCopies(contractId);
    }
    
  } catch (error) {
    console.error('❌ [DIGITAL-CONTRACTS] Error recording signature:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to record signature'
    });
  }
});

// 4. Obtener estado del contrato
router.get('/:contractId/status', async (req, res) => {
  try {
    const { contractId } = req.params;
    const contract = await firebaseDigitalContractService.getContract(contractId);
    
    if (!contract) {
      return res.status(404).json({
        success: false,
        error: 'Contract not found'
      });
    }
    
    res.json({
      success: true,
      status: contract.status,
      contractorSigned: contract.contractorSigned,
      clientSigned: contract.clientSigned,
      bothSigned: contract.contractorSigned && contract.clientSigned,
      createdAt: contract.createdAt,
      emailSent: contract.emailSent
    });
    
  } catch (error) {
    console.error('❌ [DIGITAL-CONTRACTS] Error getting contract status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get contract status'
    });
  }
});

export default router;
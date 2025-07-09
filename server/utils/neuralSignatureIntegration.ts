/**
 * NEURAL SIGNATURE INTEGRATION
 * Simple integration helper for existing Legal Defense system
 */

import { neuralSignatureEcosystem } from '../services/NeuralSignatureEcosystem';

export interface LegalDefenseContract {
  contractId: string;
  contractHTML: string;
  contractorData: any;
  clientData: any;
  projectDetails: any;
}

/**
 * Simple helper to add neural signature capabilities to existing contracts
 * This maintains all existing functionality while adding AI-powered signatures
 */
export class NeuralSignatureIntegration {
  
  /**
   * Initialize neural signature for a Legal Defense contract
   * This is a non-invasive addition that won't break existing workflows
   */
  static async enhanceContractWithNeuralSignature(contract: LegalDefenseContract) {
    try {
      console.log('🧠 [INTEGRATION] Adding neural signature to existing contract...');
      
      // Call the neural signature ecosystem without changing existing data
      const result = await neuralSignatureEcosystem.initiateNeuralSignatureProcess({
        contractId: contract.contractId,
        contractHTML: contract.contractHTML,
        contractorData: {
          name: contract.contractorData.name || contract.contractorData.company,
          company: contract.contractorData.company,
          email: contract.contractorData.email,
          phone: contract.contractorData.phone
        },
        clientData: {
          name: contract.clientData.name,
          email: contract.clientData.email,
          phone: contract.clientData.phone
        },
        projectDetails: {
          description: contract.projectDetails.description || 'Contract Project',
          value: contract.projectDetails.value || contract.projectDetails.total?.toString() || '0',
          address: contract.projectDetails.address || contract.clientData.address
        }
      });

      console.log('✅ [INTEGRATION] Neural signature added successfully');
      return result;

    } catch (error) {
      console.error('❌ [INTEGRATION] Neural signature enhancement failed:', error);
      // Return a graceful fallback that doesn't break existing functionality
      return {
        success: false,
        message: 'Neural signature enhancement failed, falling back to standard workflow'
      };
    }
  }

  /**
   * Optional: Add neural signature button to existing UI
   * This can be called from Legal Defense components
   */
  static generateNeuralSignatureButton(contractId: string) {
    return `
      <div style="margin: 20px 0; padding: 15px; background: linear-gradient(135deg, #667eea, #764ba2); border-radius: 8px;">
        <h3 style="color: white; margin: 0 0 10px 0;">🧠 Neural Signature Available</h3>
        <p style="color: white; margin: 0 0 15px 0; font-size: 14px;">
          Experience AI-powered signature validation with real-time analysis.
        </p>
        <a href="/neural-signature/${contractId}" 
           style="background: white; color: #667eea; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">
          🚀 Open Neural Interface
        </a>
      </div>
    `;
  }
}

export default NeuralSignatureIntegration;
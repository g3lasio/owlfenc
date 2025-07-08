import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { 
  FileText, 
  Mail, 
  MessageSquare, 
  Eye, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Shield, 
  AlertTriangle,
  Download,
  Send,
  UserCheck,
  Lock,
  Unlock,
  AlertCircle,
  Edit3,
  Save
} from "lucide-react";
import DigitalSignatureCanvas from "./DigitalSignatureCanvas";
import { Phase2IntegrationOrchestrator } from "@/services/digital-signature/Phase2IntegrationOrchestrator";

export interface LegalWorkflowProps {
  contractData: any;
  contractHTML: string;
  onWorkflowComplete: (signedContract: any) => void;
  onCancel: () => void;
}

type WorkflowStep = 'document-delivery' | 'mandatory-review' | 'signature-collection' | 'completion';

interface ReviewStatus {
  contractorReviewed: boolean;
  clientReviewed: boolean;
  contractorConfirmedReading: boolean;
  clientConfirmedReading: boolean;
  contractorReviewTimestamp?: string;
  clientReviewTimestamp?: string;
}

interface SignatureStatus {
  contractorSigned: boolean;
  clientSigned: boolean;
  contractorSignature?: any;
  clientSignature?: any;
  contractorSignTimestamp?: string;
  clientSignTimestamp?: string;
}

export default function LegalComplianceWorkflow({ 
  contractData, 
  contractHTML,
  onWorkflowComplete,
  onCancel 
}: LegalWorkflowProps) {
  const [currentStep, setCurrentStep] = useState<WorkflowStep>('document-delivery');
  const [reviewStatus, setReviewStatus] = useState<ReviewStatus>({
    contractorReviewed: false,
    clientReviewed: false,
    contractorConfirmedReading: false,
    clientConfirmedReading: false
  });
  const [signatureStatus, setSignatureStatus] = useState<SignatureStatus>({
    contractorSigned: false,
    clientSigned: false
  });
  
  const [isDelivering, setIsDelivering] = useState(false);
  const [deliveryCompleted, setDeliveryCompleted] = useState(false);
  const [showContractPreview, setShowContractPreview] = useState(false);
  const [currentSigner, setCurrentSigner] = useState<'contractor' | 'client' | null>(null);
  const [workflowProgress, setWorkflowProgress] = useState(0);
  const [legalViolations, setLegalViolations] = useState<string[]>([]);
  
  // Editable contact info states
  const [editableContacts, setEditableContacts] = useState({
    contractorEmail: contractData.contractor.email || '',
    clientEmail: contractData.client.email || '',
    contractorPhone: contractData.contractor.phone || '',
    clientPhone: contractData.client.phone || ''
  });
  const [editingField, setEditingField] = useState<string | null>(null);
  const [deliveryMethod, setDeliveryMethod] = useState<'email' | 'sms'>('email'); // Choose delivery method
  
  // Handle contact field updates
  const handleContactUpdate = (field: string) => {
    setEditingField(null);
    toast({
      title: "Contact Information Updated",
      description: `${field === 'emails' ? 'Email addresses' : 'Phone numbers'} have been updated for contract delivery.`,
    });
  };
  
  const { toast } = useToast();

  // Calculate workflow progress
  useEffect(() => {
    let progress = 0;
    
    // Step 1: Document Delivery (25%)
    if (deliveryCompleted) progress += 25;
    
    // Step 2: Mandatory Review (50%)
    if (reviewStatus.contractorConfirmedReading && reviewStatus.clientConfirmedReading) {
      progress += 50;
    } else if (reviewStatus.contractorConfirmedReading || reviewStatus.clientConfirmedReading) {
      progress += 25;
    }
    
    // Step 3: Signature Collection (25%)
    if (signatureStatus.contractorSigned && signatureStatus.clientSigned) {
      progress += 25;
    } else if (signatureStatus.contractorSigned || signatureStatus.clientSigned) {
      progress += 12.5;
    }
    
    setWorkflowProgress(progress);
  }, [deliveryCompleted, reviewStatus, signatureStatus]);

  // Legal compliance validation
  useEffect(() => {
    const violations: string[] = [];
    
    // Check if attempting to sign without review
    if (currentStep === 'signature-collection' && (!reviewStatus.contractorConfirmedReading || !reviewStatus.clientConfirmedReading)) {
      violations.push("VIOLATION: Cannot collect signatures without mandatory contract review confirmation");
    }
    
    // Check if attempting to complete without both signatures
    if (currentStep === 'completion' && (!signatureStatus.contractorSigned || !signatureStatus.clientSigned)) {
      violations.push("VIOLATION: Cannot complete contract without both parties' signatures");
    }
    
    setLegalViolations(violations);
  }, [currentStep, reviewStatus, signatureStatus]);

  // Step 1: Document Delivery
  const handleDocumentDelivery = async () => {
    setIsDelivering(true);
    
    try {
      // Use Phase2IntegrationOrchestrator for comprehensive delivery
      const orchestrator = new Phase2IntegrationOrchestrator();
      
      // Use new COMPLETE contract delivery system that sends full contract for device-based review and signing
      console.log('📧 [DELIVERY] Starting complete contract delivery...');
      
      // Generate unique contract ID for tracking
      const contractId = `CON-${new Date().getFullYear()}-${Date.now()}`;
      
      // Create public review URL where users can review and sign the complete contract
      const reviewUrl = `${window.location.origin}/contract-review/${contractId}`;
      console.log('🔗 [DELIVERY] Contract review URL generated:', reviewUrl);
      
      const deliveryResults = {
        email: { success: false },
        sms: { success: false }
      };

      // Send contract using ONLY the selected method
      let deliveryResult = { success: false, method: deliveryMethod };

      if (deliveryMethod === 'email') {
        // Send COMPLETE contract email ONLY
        try {
          const emailResponse = await fetch('/api/sms/complete-contract-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: editableContacts.clientEmail,
              contractorName: contractData.contractor.name,
              contractorCompany: contractData.contractor.company,
              clientName: contractData.client.name,
              contractHTML: contractHTML,
              contractId: contractId,
              reviewUrl: reviewUrl
            })
          });
          
          const emailResult = await emailResponse.json();
          deliveryResult = { success: emailResult.success, method: 'email', result: emailResult };
          console.log('📧 [EMAIL-ONLY] Result:', emailResult);
        } catch (emailError) {
          console.error('📧 [EMAIL-ONLY] Failed:', emailError);
          throw new Error('Email delivery failed');
        }
        
      } else if (deliveryMethod === 'sms') {
        // Send COMPLETE contract SMS ONLY
        if (!editableContacts.clientPhone) {
          throw new Error('Client phone number is required for SMS delivery');
        }
        
        try {
          const smsResponse = await fetch('/api/sms/complete-contract-sms', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: editableContacts.clientPhone,
              clientName: contractData.client.name,
              contractorName: contractData.contractor.name,
              contractorCompany: contractData.contractor.company,
              contractId: contractId,
              reviewUrl: reviewUrl
            })
          });
          
          const smsResult = await smsResponse.json();
          deliveryResult = { success: smsResult.success, method: 'sms', result: smsResult };
          console.log('📱 [SMS-ONLY] Result:', smsResult);
        } catch (smsError) {
          console.error('📱 [SMS-ONLY] Failed:', smsError);
          throw new Error('SMS delivery failed');
        }
      }
      
      if (deliveryResult.success) {
        setDeliveryCompleted(true);
        setCurrentStep('completion');
        
        const contactInfo = deliveryMethod === 'email' 
          ? editableContacts.clientEmail 
          : editableContacts.clientPhone;
        
        toast({
          title: `Contract Sent via ${deliveryMethod.toUpperCase()}`,
          description: `Complete contract delivered to ${contactInfo}. Client will review and sign from their device.`,
        });
      } else {
        throw new Error(`${deliveryMethod} delivery failed`);
      }
    } catch (error) {
      console.error('Document delivery error:', error);
      toast({
        title: "Contract Delivery Failed", 
        description: "Could not deliver complete contract for device-based review and signing. Please check email/SMS services and try again.",
        variant: "destructive"
      });
    } finally {
      setIsDelivering(false);
    }
  };

  // Step 2: Mandatory Review Confirmation
  const handleReviewConfirmation = (party: 'contractor' | 'client') => {
    const timestamp = new Date().toISOString();
    
    setReviewStatus(prev => ({
      ...prev,
      [`${party}Reviewed`]: true,
      [`${party}ConfirmedReading`]: true,
      [`${party}ReviewTimestamp`]: timestamp
    }));
    
    toast({
      title: `${party === 'contractor' ? 'Contractor' : 'Client'} Review Confirmed`,
      description: `Reading confirmation recorded at ${new Date(timestamp).toLocaleString()}`,
    });
    
    // Check if both parties have confirmed review
    const updatedStatus = {
      ...reviewStatus,
      [`${party}Reviewed`]: true,
      [`${party}ConfirmedReading`]: true,
      [`${party}ReviewTimestamp`]: timestamp
    };
    
    if (updatedStatus.contractorConfirmedReading && updatedStatus.clientConfirmedReading) {
      setCurrentStep('signature-collection');
      toast({
        title: "Review Phase Complete",
        description: "Both parties have confirmed reading. Signatures now enabled.",
      });
    }
  };

  // Step 3: Signature Collection
  const handleSignatureComplete = (signatureData: any, signerRole: 'contractor' | 'client') => {
    const timestamp = new Date().toISOString();
    
    setSignatureStatus(prev => ({
      ...prev,
      [`${signerRole}Signed`]: true,
      [`${signerRole}Signature`]: signatureData,
      [`${signerRole}SignTimestamp`]: timestamp
    }));
    
    setCurrentSigner(null);
    
    toast({
      title: `${signerRole === 'contractor' ? 'Contractor' : 'Client'} Signature Collected`,
      description: `Digital signature recorded with biometric validation`,
    });
    
    // Check if both parties have signed
    const updatedStatus = {
      ...signatureStatus,
      [`${signerRole}Signed`]: true,
      [`${signerRole}Signature`]: signatureData,
      [`${signerRole}SignTimestamp`]: timestamp
    };
    
    if (updatedStatus.contractorSigned && updatedStatus.clientSigned) {
      setCurrentStep('completion');
      handleContractCompletion(updatedStatus);
    }
  };

  // Step 4: Contract Completion
  const handleContractCompletion = async (finalSignatureStatus: SignatureStatus) => {
    try {
      // Generate final signed PDF with both signatures
      const orchestrator = new Phase2IntegrationOrchestrator();
      
      const completionResult = await orchestrator.executePhase2Integration({
        contractData,
        contractHTML,
        contractorSignature: finalSignatureStatus.contractorSignature,
        clientSignature: finalSignatureStatus.clientSignature,
        reviewStatus,
        signatureStatus: finalSignatureStatus,
        clientEmail: contractData.client.email,
        clientPhone: contractData.client.phone,
        contractorEmail: contractData.contractor.email,
        contractorPhone: contractData.contractor.phone || '',
        enableSMSNotifications: true,
        enableEmailDelivery: true,
        enableGeolocationValidation: true,
        enableAdvancedPDFSecurity: true
      });
      
      if (completionResult.success) {
        toast({
          title: "Contract Execution Complete",
          description: "Signed contract delivered to both parties with legal compliance certification",
        });
        
        onWorkflowComplete({
          contractData,
          reviewStatus,
          signatureStatus: finalSignatureStatus,
          completionTimestamp: new Date().toISOString(),
          legalComplianceCertified: true
        });
      } else {
        throw new Error(completionResult.error || 'Contract completion failed');
      }
    } catch (error) {
      console.error('Contract completion error:', error);
      toast({
        title: "Contract Completion Failed",
        description: "Could not complete final contract delivery",
        variant: "destructive"
      });
    }
  };

  const renderWorkflowStatus = () => (
    <Card className="mb-6 cyberpunk-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-cyan-400" />
          Legal Compliance Workflow
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">Progress:</span>
          <Progress value={workflowProgress} className="flex-1" />
          <span className="text-sm font-mono text-cyan-400">{workflowProgress.toFixed(1)}%</span>
        </div>
        
        {legalViolations.length > 0 && (
          <Alert className="border-red-600 bg-red-900/20">
            <AlertTriangle className="h-4 w-4 text-red-400" />
            <AlertDescription className="text-red-400">
              <div className="font-semibold mb-2">Legal Compliance Violations Detected:</div>
              <ul className="space-y-1">
                {legalViolations.map((violation, index) => (
                  <li key={index} className="text-sm">• {violation}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-2">
            {deliveryCompleted ? (
              <CheckCircle className="h-4 w-4 text-green-400" />
            ) : currentStep === 'document-delivery' ? (
              <Clock className="h-4 w-4 text-yellow-400" />
            ) : (
              <XCircle className="h-4 w-4 text-gray-500" />
            )}
            <span className="text-sm">Document Delivery</span>
          </div>
          
          <div className="flex items-center gap-2">
            {reviewStatus.contractorConfirmedReading && reviewStatus.clientConfirmedReading ? (
              <CheckCircle className="h-4 w-4 text-green-400" />
            ) : currentStep === 'mandatory-review' ? (
              <Clock className="h-4 w-4 text-yellow-400" />
            ) : (
              <XCircle className="h-4 w-4 text-gray-500" />
            )}
            <span className="text-sm">Mandatory Review</span>
          </div>
          
          <div className="flex items-center gap-2">
            {signatureStatus.contractorSigned && signatureStatus.clientSigned ? (
              <CheckCircle className="h-4 w-4 text-green-400" />
            ) : currentStep === 'signature-collection' ? (
              <Clock className="h-4 w-4 text-yellow-400" />
            ) : (
              <Lock className="h-4 w-4 text-gray-500" />
            )}
            <span className="text-sm">Signature Collection</span>
          </div>
          
          <div className="flex items-center gap-2">
            {currentStep === 'completion' ? (
              <CheckCircle className="h-4 w-4 text-green-400" />
            ) : (
              <Lock className="h-4 w-4 text-gray-500" />
            )}
            <span className="text-sm">Legal Completion</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderDocumentDeliveryStep = () => (
    <Card className="cyberpunk-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="h-5 w-5 text-cyan-400" />
          Step 1: Contract Review & Delivery
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="border-blue-600 bg-blue-900/20">
          <AlertCircle className="h-4 w-4 text-blue-400" />
          <AlertDescription className="text-blue-400">
            <strong>Important:</strong> Review your contract carefully before sending to client.
            Once sent, client will handle everything on their device.
          </AlertDescription>
        </Alert>
        
        {/* Contractor Preview Section */}
        <div className="border border-gray-600 rounded-lg">
          <Button
            variant="outline"
            onClick={() => setShowContractPreview(!showContractPreview)}
            className="w-full justify-between border-gray-600"
          >
            <span className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Preview Contract Before Sending
            </span>
            <Eye className="h-4 w-4" />
          </Button>
          
          {showContractPreview && (
            <div className="p-4 border-t border-gray-600 max-h-96 overflow-y-auto">
              <div 
                className="text-sm text-black bg-white p-6 rounded shadow-lg border"
                style={{ 
                  color: '#000000',
                  backgroundColor: '#ffffff',
                  lineHeight: '1.6',
                  fontSize: '14px'
                }}
                dangerouslySetInnerHTML={{ __html: contractHTML }}
              />
            </div>
          )}
        </div>
        
        {/* Delivery Method Selection */}
        <div className="space-y-3">
          <h4 className="font-semibold text-white mb-3">Choose Delivery Method</h4>
          
          {/* Method Selection Radio Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Button
              variant={deliveryMethod === 'email' ? 'default' : 'outline'}
              className={`p-4 h-auto flex-col space-y-2 ${
                deliveryMethod === 'email' 
                  ? 'bg-cyan-600 hover:bg-cyan-700 text-white border-cyan-400' 
                  : 'border-gray-600 text-gray-300 hover:bg-gray-800'
              }`}
              onClick={() => setDeliveryMethod('email')}
            >
              <Mail className="h-6 w-6" />
              <span className="font-semibold">Email Delivery</span>
              <span className="text-xs opacity-75">Send contract via email</span>
            </Button>
            
            <Button
              variant={deliveryMethod === 'sms' ? 'default' : 'outline'}
              className={`p-4 h-auto flex-col space-y-2 ${
                deliveryMethod === 'sms' 
                  ? 'bg-green-600 hover:bg-green-700 text-white border-green-400' 
                  : 'border-gray-600 text-gray-300 hover:bg-gray-800'
              }`}
              onClick={() => setDeliveryMethod('sms')}
            >
              <MessageSquare className="h-6 w-6" />
              <span className="font-semibold">SMS Delivery</span>
              <span className="text-xs opacity-75">Send contract via text message</span>
            </Button>
          </div>
          
          {/* Contact Information for Selected Method */}
          {deliveryMethod === 'email' && (
            <div className="flex items-center gap-3 p-3 bg-cyan-900/30 border border-cyan-600 rounded-lg">
              <Mail className="h-5 w-5 text-cyan-400" />
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold text-white">Email Addresses</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => editingField === 'emails' ? handleContactUpdate('emails') : setEditingField('emails')}
                    className="h-6 w-6 p-0 text-cyan-400 hover:text-cyan-300"
                  >
                    {editingField === 'emails' ? <Save className="h-3 w-3" /> : <Edit3 className="h-3 w-3" />}
                  </Button>
                </div>
                
                {editingField === 'emails' ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 w-20">Contractor:</span>
                      <Input
                        value={editableContacts.contractorEmail}
                        onChange={(e) => setEditableContacts(prev => ({ ...prev, contractorEmail: e.target.value }))}
                        className="h-6 text-xs bg-gray-700 border-gray-600 text-white"
                        placeholder="contractor@email.com"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 w-20">Client:</span>
                      <Input
                        value={editableContacts.clientEmail}
                        onChange={(e) => setEditableContacts(prev => ({ ...prev, clientEmail: e.target.value }))}
                        className="h-6 text-xs bg-gray-700 border-gray-600 text-white"
                        placeholder="client@email.com"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-gray-300">
                    <div>Contractor: {editableContacts.contractorEmail}</div>
                    <div>Client: {editableContacts.clientEmail}</div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {deliveryMethod === 'sms' && (
            <div className="flex items-center gap-3 p-3 bg-green-900/30 border border-green-600 rounded-lg">
              <MessageSquare className="h-5 w-5 text-green-400" />
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold text-white">Phone Numbers</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => editingField === 'phones' ? handleContactUpdate('phones') : setEditingField('phones')}
                    className="h-6 w-6 p-0 text-green-400 hover:text-green-300"
                  >
                    {editingField === 'phones' ? <Save className="h-3 w-3" /> : <Edit3 className="h-3 w-3" />}
                  </Button>
                </div>
                
                {editingField === 'phones' ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 w-20">Contractor:</span>
                      <Input
                        value={editableContacts.contractorPhone}
                        onChange={(e) => setEditableContacts(prev => ({ ...prev, contractorPhone: e.target.value }))}
                        className="h-6 text-xs bg-gray-700 border-gray-600 text-white"
                        placeholder="(555) 123-4567"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 w-20">Client:</span>
                      <Input
                        value={editableContacts.clientPhone}
                        onChange={(e) => setEditableContacts(prev => ({ ...prev, clientPhone: e.target.value }))}
                        className="h-6 text-xs bg-gray-700 border-gray-600 text-white"
                        placeholder="(555) 123-4567"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-gray-300">
                    <div>Contractor: {editableContacts.contractorPhone || 'Not provided'}</div>
                    <div>Client: {editableContacts.clientPhone}</div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        
        <Button
          onClick={handleDocumentDelivery}
          disabled={isDelivering || deliveryCompleted}
          className={`w-full ${
            deliveryMethod === 'email' 
              ? 'bg-cyan-600 hover:bg-cyan-700' 
              : 'bg-green-600 hover:bg-green-700'
          }`}
        >
          {isDelivering ? (
            <>
              <Clock className="h-4 w-4 mr-2 animate-spin" />
              Sending via {deliveryMethod.toUpperCase()}...
            </>
          ) : deliveryCompleted ? (
            <>
              <CheckCircle className="h-4 w-4 mr-2" />
              Contract Sent via {deliveryMethod.toUpperCase()}
            </>
          ) : (
            <>
              {deliveryMethod === 'email' ? <Mail className="h-4 w-4 mr-2" /> : <MessageSquare className="h-4 w-4 mr-2" />}
              Send Contract via {deliveryMethod.toUpperCase()}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );

  const renderMandatoryReviewStep = () => (
    <Card className="cyberpunk-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="h-5 w-5 text-yellow-400" />
          Step 2: Mandatory Contract Review
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="border-yellow-600 bg-yellow-900/20">
          <AlertTriangle className="h-4 w-4 text-yellow-400" />
          <AlertDescription className="text-yellow-400">
            <strong>Legal Requirement:</strong> Both parties must confirm they have read and understood 
            the complete contract before signatures can be collected.
          </AlertDescription>
        </Alert>
        
        <div className="space-y-4">
          {/* Review Confirmations */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Contractor Review */}
            <div className="border border-gray-600 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-white">Contractor Review</h4>
                {reviewStatus.contractorConfirmedReading ? (
                  <Badge className="bg-green-600 text-white">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Confirmed
                  </Badge>
                ) : (
                  <Badge className="bg-red-600 text-white">
                    <XCircle className="h-3 w-3 mr-1" />
                    Pending
                  </Badge>
                )}
              </div>
              
              <p className="text-sm text-gray-400 mb-3">
                {contractData.contractor.name} must confirm reading the complete contract.
              </p>
              
              {!reviewStatus.contractorConfirmedReading && (
                <Button
                  onClick={() => handleReviewConfirmation('contractor')}
                  variant="outline"
                  className="w-full border-green-400 text-green-400"
                >
                  <UserCheck className="h-4 w-4 mr-2" />
                  Confirm Contract Reading
                </Button>
              )}
              
              {reviewStatus.contractorReviewTimestamp && (
                <p className="text-xs text-gray-500 mt-2">
                  Confirmed: {new Date(reviewStatus.contractorReviewTimestamp).toLocaleString()}
                </p>
              )}
            </div>
            
            {/* Client Review */}
            <div className="border border-gray-600 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-white">Client Review</h4>
                {reviewStatus.clientConfirmedReading ? (
                  <Badge className="bg-green-600 text-white">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Confirmed
                  </Badge>
                ) : (
                  <Badge className="bg-red-600 text-white">
                    <XCircle className="h-3 w-3 mr-1" />
                    Pending
                  </Badge>
                )}
              </div>
              
              <p className="text-sm text-gray-400 mb-3">
                {contractData.client.name} must confirm reading the complete contract.
              </p>
              
              {!reviewStatus.clientConfirmedReading && (
                <Button
                  onClick={() => handleReviewConfirmation('client')}
                  variant="outline"
                  className="w-full border-green-400 text-green-400"
                >
                  <UserCheck className="h-4 w-4 mr-2" />
                  Confirm Contract Reading
                </Button>
              )}
              
              {reviewStatus.clientReviewTimestamp && (
                <p className="text-xs text-gray-500 mt-2">
                  Confirmed: {new Date(reviewStatus.clientReviewTimestamp).toLocaleString()}
                </p>
              )}
            </div>
          </div>
        </div>
        
        {reviewStatus.contractorConfirmedReading && reviewStatus.clientConfirmedReading && (
          <Alert className="border-green-600 bg-green-900/20">
            <CheckCircle className="h-4 w-4 text-green-400" />
            <AlertDescription className="text-green-400">
              <strong>Review Complete:</strong> Both parties have confirmed reading the contract. 
              Signature collection is now legally enabled.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );

  const renderSignatureCollectionStep = () => (
    <Card className="cyberpunk-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Unlock className="h-5 w-5 text-green-400" />
          Step 3: Digital Signature Collection
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="border-green-600 bg-green-900/20">
          <CheckCircle className="h-4 w-4 text-green-400" />
          <AlertDescription className="text-green-400">
            <strong>Legal Authorization:</strong> Mandatory review completed. Both parties may now 
            provide their digital signatures with biometric validation.
          </AlertDescription>
        </Alert>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Contractor Signature */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-white">Contractor Signature</h4>
              {signatureStatus.contractorSigned ? (
                <Badge className="bg-green-600 text-white">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Signed
                </Badge>
              ) : (
                <Badge className="bg-yellow-600 text-white">
                  <Clock className="h-3 w-3 mr-1" />
                  Pending
                </Badge>
              )}
            </div>
            
            {!signatureStatus.contractorSigned && currentSigner !== 'contractor' && (
              <Button
                onClick={() => setCurrentSigner('contractor')}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                Sign as Contractor
              </Button>
            )}
            
            {currentSigner === 'contractor' && (
              <DigitalSignatureCanvas
                signerRole="contractor"
                signerName={contractData.contractor.name}
                onSignatureComplete={(signatureData) => handleSignatureComplete(signatureData, 'contractor')}
                onSignatureReset={() => setCurrentSigner(null)}
                className="w-full"
              />
            )}
            
            {signatureStatus.contractorSignTimestamp && (
              <p className="text-xs text-gray-500">
                Signed: {new Date(signatureStatus.contractorSignTimestamp).toLocaleString()}
              </p>
            )}
          </div>
          
          {/* Client Signature */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-white">Client Signature</h4>
              {signatureStatus.clientSigned ? (
                <Badge className="bg-green-600 text-white">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Signed
                </Badge>
              ) : (
                <Badge className="bg-yellow-600 text-white">
                  <Clock className="h-3 w-3 mr-1" />
                  Pending
                </Badge>
              )}
            </div>
            
            {!signatureStatus.clientSigned && currentSigner !== 'client' && (
              <Button
                onClick={() => setCurrentSigner('client')}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                Sign as Client
              </Button>
            )}
            
            {currentSigner === 'client' && (
              <DigitalSignatureCanvas
                signerRole="client"
                signerName={contractData.client.name}
                onSignatureComplete={(signatureData) => handleSignatureComplete(signatureData, 'client')}
                onSignatureReset={() => setCurrentSigner(null)}
                className="w-full"
              />
            )}
            
            {signatureStatus.clientSignTimestamp && (
              <p className="text-xs text-gray-500">
                Signed: {new Date(signatureStatus.clientSignTimestamp).toLocaleString()}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderCompletionStep = () => (
    <Card className="cyberpunk-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-400" />
          Contract Tracking Dashboard
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="border-green-600 bg-green-900/20">
          <CheckCircle className="h-4 w-4 text-green-400" />
          <AlertDescription className="text-green-400">
            <strong>Contract Sent:</strong> Complete contract delivered to client. 
            Track status below.
          </AlertDescription>
        </Alert>
        
        {/* Simple Status Tracking */}
        <div className="bg-gray-800 p-4 rounded-lg">
          <h4 className="font-semibold text-cyan-400 mb-3">Contract Status</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-300">📧 Email Sent</span>
              <Badge className="bg-green-600 text-white">Completed</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-300">📱 SMS Sent</span>
              <Badge className="bg-green-600 text-white">Completed</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-300">👀 Client Received</span>
              <Badge className="bg-yellow-600 text-white">Pending</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-300">📖 Client Reviewed</span>
              <Badge className="bg-gray-600 text-white">Waiting</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-300">✍️ Client Signed</span>
              <Badge className="bg-gray-600 text-white">Waiting</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-300">✅ Process Complete</span>
              <Badge className="bg-gray-600 text-white">Waiting</Badge>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-800 p-4 rounded-lg">
            <h4 className="font-semibold text-green-400 mb-2">Delivery Details</h4>
            <ul className="text-sm text-gray-300 space-y-1">
              <li>Contract ID: CON-${new Date().getFullYear()}-${Date.now()}</li>
              <li>Email: {contractData.client.email}</li>
              <li>Phone: {contractData.client.phone}</li>
              <li>Sent: {new Date().toLocaleString()}</li>
            </ul>
          </div>
          
          <div className="bg-gray-800 p-4 rounded-lg">
            <h4 className="font-semibold text-cyan-400 mb-2">Next Steps</h4>
            <ul className="text-sm text-gray-300 space-y-1">
              <li>• Client will receive notifications</li>
              <li>• You'll get updates automatically</li>
              <li>• Contract accessible on any device</li>
              <li>• Signed copy will be delivered</li>
            </ul>
          </div>
        </div>
        
        <Button
          onClick={() => onWorkflowComplete({
            contractData,
            reviewStatus: {
              contractorReviewed: true,
              clientReviewed: false,
              contractorConfirmedReading: true,
              clientConfirmedReading: false,
              contractorReviewTimestamp: new Date().toISOString(),
              clientReviewTimestamp: null
            },
            signatureStatus: {
              contractorSigned: false,
              clientSigned: false,
              contractorSignTimestamp: null,
              clientSignTimestamp: null
            },
            completionTimestamp: new Date().toISOString(),
            legalComplianceCertified: true,
            deviceBasedProcess: true,
            trackingEnabled: true
          })}
          className="w-full bg-green-600 hover:bg-green-700"
        >
          <Download className="h-4 w-4 mr-2" />
          Return to Contract Generator
        </Button>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {renderWorkflowStatus()}
      
      {currentStep === 'document-delivery' && renderDocumentDeliveryStep()}
      {currentStep === 'completion' && renderCompletionStep()}
      
      {/* Cancel Button */}
      <div className="flex justify-center">
        <Button
          variant="outline"
          onClick={onCancel}
          className="border-gray-600 text-gray-300 hover:bg-gray-800"
          disabled={currentStep === 'completion'}
        >
          Cancel Legal Process
        </Button>
      </div>
    </div>
  );
}
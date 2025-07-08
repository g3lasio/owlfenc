/**
 * Standalone contract review page for email links
 * Provides full contract review and digital signature capability
 */

import React, { useState, useRef, useEffect } from 'react';
import { useParams } from 'wouter';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Eye, Edit3, Download, AlertTriangle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface ContractReviewProps {
  contractId?: string;
}

const ContractReview: React.FC<ContractReviewProps> = () => {
  const { contractId } = useParams<{ contractId: string }>();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  
  // State management
  const [reviewChecked, setReviewChecked] = useState(false);
  const [signatureName, setSignatureName] = useState('');
  const [contractData, setContractData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    // Load contract data (mock for now - in real implementation would fetch from API)
    const mockContractData = {
      id: contractId,
      clientName: 'Test Client',
      contractorCompany: 'Test Contractor LLC',
      projectType: 'Construction Project',
      contractHTML: `
        <div style="font-family: Times New Roman, serif; line-height: 1.8; color: #000;">
          <h1 style="text-align: center; margin-bottom: 30px;">INDEPENDENT CONTRACTOR AGREEMENT</h1>
          
          <h3>PARTIES</h3>
          <p>This Independent Contractor Agreement ("Agreement") is made between Test Contractor LLC ("Contractor") and Test Client ("Client").</p>
          
          <h3>SCOPE OF WORK</h3>
          <p>Contractor agrees to provide construction services as detailed in the attached project specifications.</p>
          
          <h3>PAYMENT TERMS</h3>
          <p>Client agrees to pay Contractor the total amount as specified in the project estimate, with payment terms as follows:</p>
          <ul>
            <li>50% deposit upon signing this agreement</li>
            <li>50% final payment upon project completion</li>
          </ul>
          
          <h3>TIMELINE</h3>
          <p>Work shall commence upon receipt of deposit and signed agreement, with estimated completion within agreed timeframe.</p>
          
          <h3>WARRANTIES AND LIABILITY</h3>
          <p>Contractor warrants all work will be performed in a professional manner according to industry standards.</p>
          
          <h3>GOVERNING LAW</h3>
          <p>This Agreement shall be governed by the laws of the applicable state jurisdiction.</p>
        </div>
      `
    };
    
    setContractData(mockContractData);
    setLoading(false);
  }, [contractId]);

  // Canvas drawing functions
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    setIsDrawing(true);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    
    const rect = canvas.getBoundingClientRect();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const isCanvasEmpty = (): boolean => {
    const canvas = canvasRef.current;
    if (!canvas) return true;
    
    const blank = document.createElement('canvas');
    blank.width = canvas.width;
    blank.height = canvas.height;
    return canvas.toDataURL() === blank.toDataURL();
  };

  const canSubmit = (): boolean => {
    return reviewChecked && (signatureName.trim().length > 0 || !isCanvasEmpty());
  };

  const handleSubmit = async () => {
    if (!reviewChecked) {
      toast({
        title: "Review Required",
        description: "Please confirm you have reviewed the contract.",
        variant: "destructive"
      });
      return;
    }

    if (!signatureName.trim() && isCanvasEmpty()) {
      toast({
        title: "Signature Required",
        description: "Please provide either a drawn signature or type your name.",
        variant: "destructive"
      });
      return;
    }

    // Collect signature data
    const signatureData = {
      contractId: contractId,
      clientName: contractData.clientName,
      typedName: signatureName,
      drawnSignature: !isCanvasEmpty() ? canvasRef.current?.toDataURL() : null,
      timestamp: new Date().toISOString(),
      reviewConfirmed: reviewChecked
    };

    console.log('Contract signed:', signatureData);
    
    // In real implementation, this would send to server
    // await fetch('/api/contracts/sign', { method: 'POST', body: JSON.stringify(signatureData) });
    
    setSubmitted(true);
    
    toast({
      title: "Contract Signed Successfully!",
      description: "Your signature has been recorded. Both parties will receive a signed copy.",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading contract...</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="text-center p-8">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Contract Signed!</h2>
            <p className="text-gray-600 mb-4">
              Your signature has been successfully recorded for contract {contractId}.
            </p>
            <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-700">
              <p><strong>Signed by:</strong> {contractData.clientName}</p>
              <p><strong>Date:</strong> {new Date().toLocaleString()}</p>
              <p><strong>Contract ID:</strong> {contractId}</p>
            </div>
            <p className="text-xs text-gray-500 mt-4">
              Both parties will receive a signed copy via email shortly.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-lg mb-6">
          <h1 className="text-3xl font-bold mb-2">Contract Review & Signature</h1>
          <p className="opacity-90">
            Contract with {contractData.contractorCompany} • ID: {contractId}
          </p>
        </div>

        {/* Legal Notice */}
        <Alert className="mb-6 border-amber-200 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            <strong>Important Legal Notice:</strong> This is a legally binding agreement. 
            Please read all terms and conditions carefully. Do not sign unless you fully understand and agree to all terms.
          </AlertDescription>
        </Alert>

        {/* Contract Content */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Complete Contract Document
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-white p-6 border rounded-lg max-h-96 overflow-y-auto">
              <div dangerouslySetInnerHTML={{ __html: contractData.contractHTML }} />
            </div>
          </CardContent>
        </Card>

        {/* Review Confirmation */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Contract Review Confirmation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <input
                type="checkbox"
                id="reviewCheck"
                checked={reviewChecked}
                onChange={(e) => setReviewChecked(e.target.checked)}
                className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="reviewCheck" className="text-gray-700 font-medium cursor-pointer">
                I have read and understand the complete contract above
              </label>
            </div>
            {reviewChecked && (
              <div className="mt-3 text-sm text-green-700 bg-green-50 p-2 rounded">
                ✓ Review confirmed - You may now provide your signature below
              </div>
            )}
          </CardContent>
        </Card>

        {/* Digital Signature */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Edit3 className="h-5 w-5" />
              Digital Signature
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Option 1: Draw Your Signature</h4>
              <canvas
                ref={canvasRef}
                width={500}
                height={150}
                className="border-2 border-gray-300 rounded-lg w-full cursor-crosshair bg-white"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
              />
              <Button variant="outline" onClick={clearSignature} className="mt-2">
                Clear Signature
              </Button>
            </div>

            <div>
              <h4 className="font-medium mb-2">Option 2: Type Your Name (Cursive Style)</h4>
              <Input
                type="text"
                value={signatureName}
                onChange={(e) => setSignatureName(e.target.value)}
                placeholder="Type your full legal name"
                className="text-lg"
                style={{ fontFamily: "'Brush Script MT', cursive" }}
              />
            </div>

            <Button
              onClick={handleSubmit}
              disabled={!canSubmit()}
              className={`w-full ${canSubmit() ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-400'}`}
            >
              {canSubmit() ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Submit Signed Contract
                </>
              ) : (
                'Complete Review & Signature Required'
              )}
            </Button>

            <p className="text-xs text-gray-500 text-center">
              By signing, you agree to all terms and conditions outlined in the contract above.
            </p>
          </CardContent>
        </Card>

        {/* Contract Details */}
        <Card>
          <CardHeader>
            <CardTitle>Contract Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p><strong>Contract ID:</strong> {contractId}</p>
                <p><strong>Contractor:</strong> {contractData.contractorCompany}</p>
              </div>
              <div>
                <p><strong>Client:</strong> {contractData.clientName}</p>
                <p><strong>Date:</strong> {new Date().toLocaleDateString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ContractReview;
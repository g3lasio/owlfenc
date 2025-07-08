/**
 * ROLE-BASED CONTRACT REVIEW SYSTEM
 * Differentiated contractor and client experiences with proper signature storage
 */

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, Eye, Edit3, FileText, AlertTriangle, User, Building } from 'lucide-react';

interface ContractData {
  contractId: string;
  contractorName: string;
  clientName: string;
  projectDetails: {
    description: string;
    value: string;
    address: string;
  };
  contractHTML: string;
}

interface SignatureStatus {
  contractorSignature?: any;
  clientSignature?: any;
  status: 'pending' | 'contractor-signed' | 'client-signed' | 'fully-signed';
}

const ContractReview: React.FC = () => {
  const { contractId } = useParams<{ contractId: string }>();
  const [location] = useLocation();
  const { toast } = useToast();
  
  // Extract role from URL parameters
  const urlParams = new URLSearchParams(location.split('?')[1] || '');
  const userRole = urlParams.get('role') as 'contractor' | 'client' || 'client';
  
  // Canvas and signature refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  
  // State management
  const [contractData, setContractData] = useState<ContractData | null>(null);
  const [signatureStatus, setSignatureStatus] = useState<SignatureStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviewChecked, setReviewChecked] = useState(false);
  const [signatureName, setSignatureName] = useState('');
  const [signatureMethod, setSignatureMethod] = useState<'canvas' | 'typed'>('canvas');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Load contract data and signature status
  useEffect(() => {
    if (contractId) {
      loadContractData();
      loadSignatureStatus();
    }
  }, [contractId]);

  const loadContractData = async () => {
    try {
      // For demo purposes, using mock data. In production, fetch from API
      const mockData: ContractData = {
        contractId: contractId!,
        contractorName: 'OWL FENC LLC',
        clientName: 'Don Scheppler',
        projectDetails: {
          description: 'Fence Installation and Demolition - 16 linear feet, 6 feet height',
          value: '$1,700.00',
          address: '54 Martinez Ct, Novato, CA 94945'
        },
        contractHTML: '<div style="font-family: Times, serif; padding: 20px;"><h1>INDEPENDENT CONTRACTOR AGREEMENT</h1><p>This agreement is entered into between OWL FENC LLC and Don Scheppler for professional fence installation services.</p><h2>SCOPE OF WORK</h2><p>The project entails the demolition and removal of the existing fence, followed by the installation of a new wooden fence measuring 6 feet in height and 16 linear feet in length.</p><h2>PROJECT VALUE</h2><p>Total project value: $1,700.00</p><h2>PAYMENT TERMS</h2><p>Payment shall be made in two installments: 50% deposit ($850.00) and 50% upon completion ($850.00).</p></div>'
      };
      
      setContractData(mockData);
      setSignatureName(userRole === 'contractor' ? mockData.contractorName : mockData.clientName);
    } catch (error) {
      console.error('Failed to load contract data:', error);
      toast({
        title: "Error",
        description: "Failed to load contract data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadSignatureStatus = async () => {
    try {
      const response = await fetch(`/api/dual-signature/contract-status/${contractId}`);
      if (response.ok) {
        const data = await response.json();
        setSignatureStatus(data.contractSignatures);
        
        // Check if current user already signed
        const existingSignature = userRole === 'contractor' 
          ? data.contractSignatures?.contractorSignature
          : data.contractSignatures?.clientSignature;
          
        if (existingSignature) {
          setSubmitted(true);
          setReviewChecked(true);
        }
      }
    } catch (error) {
      console.error('Failed to load signature status:', error);
    }
  };

  // Canvas drawing functions
  const setupCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set up canvas for high DPI displays
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    
    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#000';
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    setIsDrawing(true);
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(x, y);
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasEvent>) => {
    if (!isDrawing) return;
    e.preventDefault();
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const handleSubmitSignature = async () => {
    if (!reviewChecked) {
      toast({
        title: "Review Required",
        description: "Please confirm you have read and understood the contract",
        variant: "destructive"
      });
      return;
    }

    if (!signatureName.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter your full legal name",
        variant: "destructive"
      });
      return;
    }

    let signatureData = '';
    
    if (signatureMethod === 'canvas') {
      const canvas = canvasRef.current;
      if (!canvas) {
        toast({
          title: "Signature Required",
          description: "Please draw your signature",
          variant: "destructive"
        });
        return;
      }
      
      // Check if canvas has any content
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const hasContent = imageData.data.some((channel, index) => index % 4 === 3 && channel !== 0);
        
        if (!hasContent) {
          toast({
            title: "Signature Required",
            description: "Please draw your signature on the canvas",
            variant: "destructive"
          });
          return;
        }
        
        signatureData = canvas.toDataURL();
      }
    } else {
      signatureData = signatureName;
    }

    setSubmitting(true);

    try {
      const response = await fetch('/api/dual-signature/store-signature', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contractId,
          signerName: signatureName,
          signerRole: userRole,
          signatureType: signatureMethod,
          signatureData,
          metadata: {
            deviceInfo: navigator.userAgent,
            timestamp: new Date().toISOString()
          }
        })
      });

      if (response.ok) {
        const result = await response.json();
        setSubmitted(true);
        
        toast({
          title: "Signature Submitted",
          description: `Your signature has been recorded successfully. Contract status: ${result.contractStatus}`,
        });
        
        // Reload signature status
        loadSignatureStatus();
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to submit signature');
      }
    } catch (error) {
      console.error('Signature submission error:', error);
      toast({
        title: "Submission Failed",
        description: error instanceof Error ? error.message : "Failed to submit signature",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (signatureMethod === 'canvas') {
      setupCanvas();
    }
  }, [signatureMethod]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="flex items-center justify-center p-8">
            <Spinner className="w-8 h-8 mr-3" />
            <span>Loading contract...</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!contractData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="p-8 text-center">
            <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-red-500" />
            <h3 className="text-lg font-semibold mb-2">Contract Not Found</h3>
            <p className="text-muted-foreground">The requested contract could not be loaded.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header with role identification */}
        <Card className="border-0 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              {userRole === 'contractor' ? (
                <Building className="w-6 h-6" />
              ) : (
                <User className="w-6 h-6" />
              )}
              <Badge variant="secondary" className="text-blue-900 font-semibold">
                {userRole === 'contractor' ? 'CONTRACTOR REVIEW' : 'CLIENT SIGNATURE'}
              </Badge>
            </div>
            <CardTitle className="text-2xl">
              {userRole === 'contractor' ? '🔐 Professional Contract Review' : '📋 Contract Ready for Your Signature'}
            </CardTitle>
            <p className="opacity-90">
              {userRole === 'contractor' 
                ? 'Review contract terms and provide your professional signature'
                : `Your contract with ${contractData.contractorName} is ready for signature`
              }
            </p>
          </CardHeader>
        </Card>

        {/* Contract Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Contract Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Contract ID</label>
                <p className="font-mono">{contractData.contractId}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  {userRole === 'contractor' ? 'Client' : 'Contractor'}
                </label>
                <p className="font-semibold">
                  {userRole === 'contractor' ? contractData.clientName : contractData.contractorName}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Project</label>
                <p>{contractData.projectDetails.description}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Value</label>
                <p className="font-semibold text-green-600">{contractData.projectDetails.value}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Signature Status */}
        {signatureStatus && (
          <Card>
            <CardHeader>
              <CardTitle>Signature Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className={`w-5 h-5 ${signatureStatus.contractorSignature ? 'text-green-500' : 'text-gray-400'}`} />
                  <span>Contractor Signed</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className={`w-5 h-5 ${signatureStatus.clientSignature ? 'text-green-500' : 'text-gray-400'}`} />
                  <span>Client Signed</span>
                </div>
                <Badge variant={signatureStatus.status === 'fully-signed' ? 'default' : 'secondary'}>
                  {signatureStatus.status.toUpperCase()}
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Contract Content */}
        <Card>
          <CardHeader>
            <CardTitle>Complete Contract Document</CardTitle>
          </CardHeader>
          <CardContent>
            <div 
              className="border rounded-lg p-6 bg-white text-black max-h-96 overflow-y-auto"
              dangerouslySetInnerHTML={{ __html: contractData.contractHTML }}
            />
          </CardContent>
        </Card>

        {!submitted ? (
          <>
            {/* Review Confirmation */}
            <Card>
              <CardHeader>
                <CardTitle>📖 Contract Review Confirmation</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="review-confirmation"
                    checked={reviewChecked}
                    onCheckedChange={(checked) => setReviewChecked(checked === true)}
                  />
                  <label htmlFor="review-confirmation" className="text-sm font-medium cursor-pointer">
                    ✓ I have read and understand the complete contract above
                  </label>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  This confirmation is required by law before digital signature collection.
                </p>
              </CardContent>
            </Card>

            {/* Digital Signature */}
            <Card>
              <CardHeader>
                <CardTitle>✍️ Digital Signature</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Signature Method Selection */}
                <div>
                  <label className="text-sm font-medium">Signature Method</label>
                  <div className="flex gap-4 mt-2">
                    <button
                      type="button"
                      onClick={() => setSignatureMethod('canvas')}
                      className={`px-4 py-2 rounded-lg border ${signatureMethod === 'canvas' ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}
                    >
                      Draw Signature
                    </button>
                    <button
                      type="button"
                      onClick={() => setSignatureMethod('typed')}
                      className={`px-4 py-2 rounded-lg border ${signatureMethod === 'typed' ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}
                    >
                      Type Name
                    </button>
                  </div>
                </div>

                {/* Name Input */}
                <div>
                  <label className="text-sm font-medium">Full Legal Name</label>
                  <Input
                    value={signatureName}
                    onChange={(e) => setSignatureName(e.target.value)}
                    placeholder="Enter your full legal name"
                    className="mt-1"
                  />
                </div>

                {/* Canvas Signature */}
                {signatureMethod === 'canvas' && (
                  <div>
                    <label className="text-sm font-medium">Draw Your Signature</label>
                    <div className="mt-2 border rounded-lg overflow-hidden">
                      <canvas
                        ref={canvasRef}
                        width={600}
                        height={200}
                        className="w-full h-48 cursor-crosshair touch-none"
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                        onTouchStart={startDrawing}
                        onTouchMove={draw}
                        onTouchEnd={stopDrawing}
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearCanvas}
                      className="mt-2"
                    >
                      Clear Signature
                    </Button>
                  </div>
                )}

                {/* Typed Signature Preview */}
                {signatureMethod === 'typed' && signatureName && (
                  <div>
                    <label className="text-sm font-medium">Signature Preview</label>
                    <div className="mt-2 p-4 border rounded-lg bg-gray-50">
                      <p className="text-2xl font-cursive text-center" style={{ fontFamily: 'Amsterdam Four', fontStyle: 'italic' }}>
                        {signatureName}
                      </p>
                    </div>
                  </div>
                )}

                {/* Submit Button */}
                <Button
                  onClick={handleSubmitSignature}
                  disabled={!reviewChecked || submitting}
                  className="w-full"
                  size="lg"
                >
                  {submitting ? (
                    <>
                      <Spinner className="w-4 h-4 mr-2" />
                      Submitting Signature...
                    </>
                  ) : (
                    'Complete Review & Submit Signature'
                  )}
                </Button>
              </CardContent>
            </Card>
          </>
        ) : (
          /* Success State */
          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-8 text-center">
              <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500" />
              <h3 className="text-xl font-semibold text-green-800 mb-2">
                Signature Submitted Successfully!
              </h3>
              <p className="text-green-700 mb-4">
                Your digital signature has been securely recorded for contract {contractData.contractId}.
              </p>
              {signatureStatus?.status === 'fully-signed' && (
                <Alert>
                  <AlertDescription>
                    🎉 Contract is now fully executed! Both parties have signed and the contract is legally binding.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ContractReview;
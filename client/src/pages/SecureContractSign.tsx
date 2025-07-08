/**
 * SECURE CONTRACT SIGNATURE PAGE
 * Serverless signature page that works independently of main server
 */

import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { 
  Shield, 
  FileText, 
  User, 
  Building, 
  MapPin, 
  DollarSign,
  CheckCircle,
  AlertTriangle,
  Clock,
  Lock
} from 'lucide-react';

interface ContractData {
  contractId: string;
  contractorName: string;
  clientName: string;
  projectValue: string;
  projectDescription: string;
  contractHTML: string;
}

interface TokenValidation {
  valid: boolean;
  expired: boolean;
  used: boolean;
  role?: 'contractor' | 'client';
  recipientName?: string;
  contractData?: ContractData;
}

const SecureContractSign: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // State management
  const [loading, setLoading] = useState(true);
  const [tokenValidation, setTokenValidation] = useState<TokenValidation | null>(null);
  const [contractData, setContractData] = useState<ContractData | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [signatureName, setSignatureName] = useState('');
  const [signatureMethod, setSignatureMethod] = useState<'canvas' | 'typed'>('canvas');
  const [reviewChecked, setReviewChecked] = useState(false);
  const [paymentChecked, setPaymentChecked] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Validate token on component mount
  useEffect(() => {
    if (token) {
      validateToken();
    }
  }, [token]);
  
  // Initialize canvas
  useEffect(() => {
    if (!loading && tokenValidation?.valid && canvasRef.current) {
      initializeCanvas();
    }
  }, [loading, tokenValidation]);
  
  const validateToken = async () => {
    try {
      setLoading(true);
      
      const response = await fetch(`/api/contract/validate-token/${token}`);
      const data = await response.json();
      
      if (!response.ok) {
        setTokenValidation({
          valid: false,
          expired: data.reason === 'expired',
          used: data.reason === 'used'
        });
        setError(data.message || 'Invalid token');
        return;
      }
      
      setTokenValidation({
        valid: true,
        expired: false,
        used: false,
        role: data.role,
        recipientName: data.recipientName,
        contractData: data.contractData
      });
      
      setContractData(data.contractData);
      setSignatureName(data.recipientName);
      
    } catch (error) {
      console.error('Failed to validate token:', error);
      setError('Unable to validate contract link. Please check your connection.');
      setTokenValidation({
        valid: false,
        expired: false,
        used: false
      });
    } finally {
      setLoading(false);
    }
  };
  
  const initializeCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  };
  
  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (signatureMethod !== 'canvas') return;
    
    setIsDrawing(true);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.nativeEvent.offsetX;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.nativeEvent.offsetY;
    
    ctx.beginPath();
    ctx.moveTo(x, y);
  };
  
  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || signatureMethod !== 'canvas') return;
    
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.nativeEvent.offsetX;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.nativeEvent.offsetY;
    
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSignature(true);
  };
  
  const stopDrawing = () => {
    setIsDrawing(false);
  };
  
  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };
  
  const handleSubmit = async () => {
    // Validation
    const isClient = tokenValidation?.role === 'client';
    
    if (isClient) {
      if (!reviewChecked || !paymentChecked || !authChecked) {
        setError('Please confirm all checkboxes before signing');
        return;
      }
    } else {
      if (!reviewChecked) {
        setError('Please confirm you have reviewed the contract');
        return;
      }
    }
    
    if (signatureMethod === 'canvas' && !hasSignature) {
      setError('Please provide your signature');
      return;
    }
    
    if (signatureMethod === 'typed' && !signatureName.trim()) {
      setError('Please type your full name');
      return;
    }
    
    try {
      setSubmitting(true);
      setError(null);
      
      // Get signature data
      let signatureData = null;
      if (signatureMethod === 'canvas' && canvasRef.current) {
        signatureData = canvasRef.current.toDataURL();
      }
      
      // Submit signature
      const response = await fetch('/api/contract/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          signatureData,
          typedName: signatureMethod === 'typed' ? signatureName : null,
          userAgent: navigator.userAgent
        })
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Failed to process signature');
      }
      
      setSubmitted(true);
    } catch (error) {
      console.error('Signature submission error:', error);
      setError(error instanceof Error ? error.message : 'Failed to submit signature');
    } finally {
      setSubmitting(false);
    }
  };
  
  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-4">
              <Spinner className="h-8 w-8" />
              <p className="text-gray-600">Validating contract link...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Invalid token states
  if (!tokenValidation?.valid) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-red-600">
              <AlertTriangle className="h-6 w-6" />
              <span>Invalid Contract Link</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {tokenValidation?.expired && (
                <Alert className="border-yellow-200 bg-yellow-50">
                  <Clock className="h-4 w-4 text-yellow-600" />
                  <AlertDescription className="text-yellow-800">
                    This contract link has expired. Please contact your {tokenValidation?.role === 'client' ? 'contractor' : 'client'} for a new link.
                  </AlertDescription>
                </Alert>
              )}
              
              {tokenValidation?.used && (
                <Alert className="border-blue-200 bg-blue-50">
                  <Lock className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-800">
                    This contract has already been signed. Each link can only be used once for security purposes.
                  </AlertDescription>
                </Alert>
              )}
              
              {!tokenValidation?.expired && !tokenValidation?.used && (
                <Alert className="border-red-200 bg-red-50">
                  <Shield className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800">
                    This contract link is invalid or has been tampered with. Please use only the link provided in your email or SMS.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Submitted state
  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-green-600">
              <CheckCircle className="h-6 w-6" />
              <span>Contract Signed Successfully</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-gray-600">
                Thank you for signing the contract. You will receive a copy of the fully executed contract via email once all parties have signed.
              </p>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-800">
                  <strong>What happens next?</strong><br />
                  {tokenValidation?.role === 'contractor' 
                    ? 'Your client will receive the contract for their signature. You\'ll be notified once they sign.'
                    : 'Your contractor has been notified of your signature. Work will begin as scheduled.'
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Main signature interface
  const isClient = tokenValidation?.role === 'client';
  const roleColor = isClient ? 'blue' : 'green';
  
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Secure Contract Signature</h1>
          <div className="flex items-center justify-center space-x-4">
            <Badge variant={isClient ? 'default' : 'secondary'} className="text-sm">
              {isClient ? <User className="h-3 w-3 mr-1" /> : <Building className="h-3 w-3 mr-1" />}
              {isClient ? 'Client' : 'Contractor'} Signature
            </Badge>
            <Badge variant="outline" className="text-sm">
              <Shield className="h-3 w-3 mr-1" />
              Secure & Encrypted
            </Badge>
          </div>
        </div>
        
        {/* Contract Summary */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5" />
              <span>Contract Summary</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Contractor</p>
                <p className="font-medium">{contractData?.contractorName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Client</p>
                <p className="font-medium">{contractData?.clientName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Project Value</p>
                <p className="font-medium flex items-center">
                  <DollarSign className="h-4 w-4" />
                  {contractData?.projectValue}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Project Description</p>
                <p className="font-medium">{contractData?.projectDescription}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Contract Content */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Complete Contract Terms</CardTitle>
          </CardHeader>
          <CardContent>
            <div 
              className="prose prose-sm max-w-none max-h-96 overflow-y-auto border rounded-lg p-4 bg-gray-50"
              dangerouslySetInnerHTML={{ __html: contractData?.contractHTML || '' }}
            />
          </CardContent>
        </Card>
        
        {/* Signature Section */}
        <Card className={`border-${roleColor}-200 shadow-lg`}>
          <CardHeader className={`bg-${roleColor}-50`}>
            <CardTitle className={`text-${roleColor}-900`}>
              Digital Signature Required
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            {/* Checkboxes */}
            <div className="space-y-3 mb-6">
              <label className="flex items-start space-x-3">
                <Checkbox 
                  checked={reviewChecked}
                  onCheckedChange={(checked) => setReviewChecked(checked as boolean)}
                  className="mt-1"
                />
                <span className="text-sm">
                  I have carefully read and understand all contract terms and conditions
                </span>
              </label>
              
              {isClient && (
                <>
                  <label className="flex items-start space-x-3">
                    <Checkbox 
                      checked={paymentChecked}
                      onCheckedChange={(checked) => setPaymentChecked(checked as boolean)}
                      className="mt-1"
                    />
                    <span className="text-sm">
                      I agree to the payment terms and schedule outlined in this contract
                    </span>
                  </label>
                  
                  <label className="flex items-start space-x-3">
                    <Checkbox 
                      checked={authChecked}
                      onCheckedChange={(checked) => setAuthChecked(checked as boolean)}
                      className="mt-1"
                    />
                    <span className="text-sm">
                      I authorize {contractData?.contractorName} to begin work as specified
                    </span>
                  </label>
                </>
              )}
            </div>
            
            <Separator className="mb-6" />
            
            {/* Signature Method Toggle */}
            <div className="flex space-x-4 mb-4">
              <Button
                variant={signatureMethod === 'canvas' ? 'default' : 'outline'}
                onClick={() => setSignatureMethod('canvas')}
                size="sm"
              >
                Draw Signature
              </Button>
              <Button
                variant={signatureMethod === 'typed' ? 'default' : 'outline'}
                onClick={() => setSignatureMethod('typed')}
                size="sm"
              >
                Type Name
              </Button>
            </div>
            
            {/* Signature Input */}
            {signatureMethod === 'canvas' ? (
              <div className="space-y-3">
                <p className="text-sm text-gray-600">Sign by drawing below:</p>
                <canvas
                  ref={canvasRef}
                  className="w-full h-32 border-2 border-gray-300 rounded-lg bg-white cursor-crosshair"
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearSignature}
                  disabled={!hasSignature}
                >
                  Clear Signature
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-gray-600">Type your full legal name:</p>
                <Input
                  value={signatureName}
                  onChange={(e) => setSignatureName(e.target.value)}
                  placeholder="Your full legal name"
                  className="text-lg font-script"
                  style={{ fontFamily: 'Brush Script MT, cursive' }}
                />
              </div>
            )}
            
            {/* Submit Button */}
            <div className="mt-6 flex justify-center">
              <Button
                onClick={handleSubmit}
                disabled={submitting}
                size="lg"
                className={`bg-${roleColor}-600 hover:bg-${roleColor}-700`}
              >
                {submitting ? (
                  <>
                    <Spinner className="h-4 w-4 mr-2" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Sign Contract
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
        
        {/* Security Notice */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <div className="flex items-center justify-center space-x-2">
            <Shield className="h-4 w-4" />
            <span>This is a secure, single-use link that expires in 72 hours</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecureContractSign;
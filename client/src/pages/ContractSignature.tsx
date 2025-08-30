import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, PenTool, Download, CheckCircle, AlertCircle, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface DigitalContract {
  contractId: string;
  contractorName: string;
  contractorEmail: string;
  clientName: string;
  clientEmail: string;
  projectDescription: string;
  totalAmount: number;
  contractHtml: string;
  status: string;
  contractorSigned: boolean;
  clientSigned: boolean;
  createdAt: string;
}

const ContractSignature: React.FC = () => {
  const params = useParams();
  const { toast } = useToast();
  
  // Get data from URL params or window object
  const contractId = params.contractId || (window as any)?.__SIGNATURE_DATA__?.contractId;
  const party = params.party || (window as any)?.__SIGNATURE_DATA__?.party;
  
  const [contract, setContract] = useState<DigitalContract | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasRead, setHasRead] = useState(false);
  const [fullName, setFullName] = useState('');
  const [signatureType, setSignatureType] = useState<'drawing' | 'cursive'>('cursive');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  
  // Canvas signature
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [signatureData, setSignatureData] = useState<string>('');

  useEffect(() => {
    if (!contractId || !party) {
      setError('Missing contract information');
      setLoading(false);
      return;
    }

    loadContract();
  }, [contractId, party]);

  const loadContract = async () => {
    try {
      console.log(`🔍 Loading contract ${contractId} for ${party}`);
      
      // 🚨 CRITICAL DEBUG: Log exact frontend params
      console.log("🚨 [FRONTEND-DEBUG] contractId:", contractId);
      console.log("🚨 [FRONTEND-DEBUG] party:", party);
      console.log("🚨 [FRONTEND-DEBUG] params object:", params);
      console.log("🚨 [FRONTEND-DEBUG] URL being called:", `/api/dual-signature/contract/${contractId}/${party}`);
      
      const response = await fetch(`/api/dual-signature/contract/${contractId}/${party}`);
      const data = await response.json();
      
      if (data.success) {
        setContract(data.contract);
        setFullName(party === 'contractor' ? data.contract.contractorName : data.contract.clientName);
        
        // Check if already signed
        const alreadySigned = party === 'contractor' 
          ? data.contract.contractorSigned 
          : data.contract.clientSigned;
          
        if (alreadySigned) {
          setIsComplete(true);
        }
      } else {
        setError(data.message || 'Failed to load contract');
      }
    } catch (err) {
      console.error('Error loading contract:', err);
      setError('Network error loading contract');
    } finally {
      setLoading(false);
    }
  };

  // Canvas drawing functions
  const setupCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set up high DPI canvas
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    
    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#1e40af';
  };

  useEffect(() => {
    if (signatureType === 'drawing') {
      setupCanvas();
    }
  }, [signatureType]);

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDrawing(true);
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(x, y);
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    
    // Save signature data
    const canvas = canvasRef.current;
    if (canvas) {
      setSignatureData(canvas.toDataURL());
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setSignatureData('');
      }
    }
  };

  const handleSubmitSignature = async () => {
    if (!hasRead) {
      toast({
        title: "Review Required",
        description: "Please confirm you have read the contract before signing",
        variant: "destructive",
      });
      return;
    }

    if (!fullName.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter your full name",
        variant: "destructive",
      });
      return;
    }

    const finalSignatureData = signatureType === 'drawing' 
      ? signatureData 
      : fullName;

    if (!finalSignatureData) {
      toast({
        title: "Signature Required",
        description: signatureType === 'drawing' 
          ? "Please draw your signature" 
          : "Please enter your name",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const requestBody = {
        contractId,
        party,
        signatureData: finalSignatureData,
        signatureType,
        fullName,
      };
      
      // 🚨 CRITICAL DEBUG: Log exact request being sent
      console.log("🚨 [FRONTEND-DEBUG] Request body being sent:", JSON.stringify(requestBody));
      console.log("🚨 [FRONTEND-DEBUG] party value:", party);
      console.log("🚨 [FRONTEND-DEBUG] contractId value:", contractId);
      
      const response = await fetch('/api/dual-signature/sign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();

      if (result.success) {
        setIsComplete(true);
        toast({
          title: "Signature Submitted",
          description: result.message,
        });

        if (result.bothSigned) {
          toast({
            title: "Contract Complete",
            description: "Both parties have signed! Final PDF will be sent to all parties.",
          });
        }
      } else {
        toast({
          title: "Signature Failed",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error('Error submitting signature:', err);
      toast({
        title: "Network Error",
        description: "Failed to submit signature. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 to-blue-600 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p>Loading contract...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-900 to-red-600 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-8 w-8 mx-auto mb-4 text-red-600" />
            <h2 className="text-lg font-semibold mb-2">Error Loading Contract</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-900 to-green-600 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-600" />
            <h2 className="text-xl font-semibold mb-2">Signature Complete</h2>
            <p className="text-gray-600 mb-4">
              Thank you for signing the contract. 
              {contract?.contractorSigned && contract?.clientSigned 
                ? " All parties have signed and the final PDF will be sent shortly."
                : " Waiting for the other party to sign."
              }
            </p>
            <Badge className="bg-green-100 text-green-800">
              Signed by {party === 'contractor' ? 'Contractor' : 'Client'}
            </Badge>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!contract) return null;

  const partyName = party === 'contractor' ? 'Contractor' : 'Client';
  const partyColor = party === 'contractor' ? 'blue' : 'green';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <Card className="border-gray-700 bg-gray-800">
          <CardHeader>
            <CardTitle className={`flex items-center gap-3 text-${partyColor}-400`}>
              <FileText className="h-6 w-6" />
              Contract Signature - {partyName}
            </CardTitle>
            <div className="text-sm text-gray-400">
              Contract ID: {contractId}
            </div>
          </CardHeader>
        </Card>

        {/* Contract Content */}
        <Card className="border-gray-700 bg-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Contract Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4 mb-6 text-sm">
              <div>
                <Label className="text-gray-400">Contractor</Label>
                <p className="text-white">{contract.contractorName}</p>
                <p className="text-gray-400">{contract.contractorEmail}</p>
              </div>
              <div>
                <Label className="text-gray-400">Client</Label>
                <p className="text-white">{contract.clientName}</p>
                <p className="text-gray-400">{contract.clientEmail}</p>
              </div>
              <div>
                <Label className="text-gray-400">Project</Label>
                <p className="text-white">{contract.projectDescription}</p>
              </div>
              <div>
                <Label className="text-gray-400">Amount</Label>
                <p className="text-white font-semibold">${contract.totalAmount.toLocaleString()}</p>
              </div>
            </div>

            {/* Contract HTML Content */}
            <div className="bg-white rounded-lg p-6 mb-6 max-h-96 overflow-y-auto">
              <div 
                dangerouslySetInnerHTML={{ __html: contract.contractHtml }}
                className="prose prose-sm max-w-none"
              />
            </div>

            {/* Confirmation Checkbox */}
            <div className="flex items-start space-x-2 mb-6">
              <Checkbox 
                id="confirm-read" 
                checked={hasRead} 
                onCheckedChange={(checked) => setHasRead(checked as boolean)}
              />
              <Label htmlFor="confirm-read" className="text-sm text-gray-300 leading-relaxed">
                I have carefully read and reviewed the entire contract above. I understand all terms and conditions 
                and agree to be legally bound by this agreement.
              </Label>
            </div>
          </CardContent>
        </Card>

        {/* Signature Section */}
        <Card className="border-gray-700 bg-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Electronic Signature</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Name Input */}
            <div>
              <Label htmlFor="fullName" className="text-gray-400">Full Legal Name</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your full legal name"
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>

            {/* Signature Type Selection */}
            <div>
              <Label className="text-gray-400">Signature Method</Label>
              <div className="flex gap-4 mt-2">
                <button
                  type="button"
                  onClick={() => setSignatureType('cursive')}
                  className={`px-4 py-2 rounded-lg border transition-colors ${
                    signatureType === 'cursive'
                      ? 'border-blue-400 bg-blue-600 text-white'
                      : 'border-gray-600 bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  Type Name
                </button>
                <button
                  type="button"
                  onClick={() => setSignatureType('drawing')}
                  className={`px-4 py-2 rounded-lg border transition-colors ${
                    signatureType === 'drawing'
                      ? 'border-blue-400 bg-blue-600 text-white'
                      : 'border-gray-600 bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  Draw Signature
                </button>
              </div>
            </div>

            {/* Signature Input */}
            {signatureType === 'cursive' ? (
              <div>
                <Label className="text-gray-400">Cursive Signature</Label>
                <div className="bg-white rounded-lg p-4 text-center border-2 border-dashed border-gray-300">
                  <div 
                    style={{ 
                      fontFamily: 'Brush Script MT, cursive',
                      fontSize: '24px',
                      color: '#1e40af',
                      minHeight: '40px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {fullName || 'Your name will appear here'}
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <Label className="text-gray-400">Draw Your Signature</Label>
                <div className="bg-white rounded-lg p-4 border-2 border-dashed border-gray-300">
                  <canvas
                    ref={canvasRef}
                    width={400}
                    height={150}
                    className="w-full h-32 border border-gray-200 rounded cursor-crosshair"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                  />
                  <div className="mt-2 text-center">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={clearSignature}
                      className="text-gray-600"
                    >
                      Clear Signature
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <Button
              onClick={handleSubmitSignature}
              disabled={!hasRead || !fullName.trim() || isSubmitting}
              className={`w-full bg-${partyColor}-600 hover:bg-${partyColor}-500 text-white font-semibold py-3`}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <PenTool className="h-4 w-4 mr-2" />
              )}
              {isSubmitting ? 'Submitting Signature...' : `Sign Contract as ${partyName}`}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ContractSignature;
/**
 * Simple Mobile-Friendly Signature Page
 * 
 * Designed for iPhone, Android, tablets, and desktop
 * Provides direct contract review and signature functionality
 * Supports both drawing signatures and cursive name input
 */

import { useState, useEffect, useRef } from 'react';
import { useParams, useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, Edit3, FileText, Clock, Users } from 'lucide-react';

interface ContractData {
  contractId: string;
  contractorName: string;
  contractorCompany: string;
  contractorEmail: string;
  contractorPhone: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  clientAddress: string;
  projectDescription: string;
  totalAmount: number;
  startDate: string;
  completionDate: string;
  contractHtml: string;
  status: string;
  contractorSigned: boolean;
  clientSigned: boolean;
  contractorSignedAt: string;
  clientSignedAt: string;
}

export default function SimpleSignaturePage() {
  const { contractId } = useParams<{ contractId: string }>();
  const [location] = useLocation();
  const { toast } = useToast();
  
  // Get party type from URL params (contractor or client)
  const urlParams = new URLSearchParams(location.split('?')[1] || '');
  const party = urlParams.get('party') as 'contractor' | 'client' | null;
  
  const [contract, setContract] = useState<ContractData | null>(null);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [signatureType, setSignatureType] = useState<'drawing' | 'cursive'>('drawing');
  const [cursiveName, setCursiveName] = useState('');
  const [hasReviewed, setHasReviewed] = useState(false);
  const [signatureDrawn, setSignatureDrawn] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    if (contractId) {
      loadContract();
    }
  }, [contractId]);

  const loadContract = async () => {
    try {
      const response = await fetch(`/api/simple-signature/${contractId}`);
      const data = await response.json();
      
      if (data.success) {
        setContract(data.contract);
        
        // Pre-fill cursive name based on party
        if (party === 'contractor') {
          setCursiveName(data.contract.contractorName);
        } else {
          setCursiveName(data.contract.clientName);
        }
      } else {
        toast({
          title: "Error",
          description: "Contract not found",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error loading contract:', error);
      toast({
        title: "Error",
        description: "Failed to load contract",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Canvas drawing functions
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    draw(e);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    
    if ('touches' in e) {
      // Touch event
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      // Mouse event
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#000';
    
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
    
    setSignatureDrawn(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.beginPath();
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
    setSignatureDrawn(false);
  };

  const handleSign = async () => {
    if (!hasReviewed) {
      toast({
        title: "Review Required",
        description: "Please confirm you have reviewed the contract before signing",
        variant: "destructive"
      });
      return;
    }

    let signatureData = '';
    
    if (signatureType === 'drawing') {
      if (!signatureDrawn) {
        toast({
          title: "Signature Required",
          description: "Please draw your signature",
          variant: "destructive"
        });
        return;
      }
      
      const canvas = canvasRef.current;
      if (canvas) {
        signatureData = canvas.toDataURL();
      }
    } else {
      if (!cursiveName.trim()) {
        toast({
          title: "Name Required",
          description: "Please enter your name",
          variant: "destructive"
        });
        return;
      }
      signatureData = cursiveName.trim();
    }

    setSigning(true);
    
    try {
      const response = await fetch(`/api/simple-signature/${contractId}/sign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          party,
          signatureData,
          signatureType,
          signerName: party === 'contractor' ? contract?.contractorName : contract?.clientName
        })
      });

      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "✅ Signature Saved!",
          description: data.bothPartiesSigned 
            ? "Both parties have signed. You'll receive the completed contract via email." 
            : "Your signature has been saved. Waiting for the other party to sign."
        });
        
        // Reload contract to show updated status
        loadContract();
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to save signature",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error saving signature:', error);
      toast({
        title: "Error",
        description: "Failed to save signature",
        variant: "destructive"
      });
    } finally {
      setSigning(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardContent className="p-6 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p>Loading contract...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!contract || !party) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardContent className="p-6 text-center">
            <FileText className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-red-700 mb-2">Contract Not Found</h2>
            <p className="text-red-600">The contract you're looking for doesn't exist or the link is invalid.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isContractor = party === 'contractor';
  const currentUserSigned = isContractor ? contract.contractorSigned : contract.clientSigned;
  const otherPartyName = isContractor ? contract.clientName : contract.contractorName;
  const otherPartySigned = isContractor ? contract.clientSigned : contract.contractorSigned;

  if (currentUserSigned) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardContent className="p-6 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-green-700 mb-2">Already Signed!</h2>
            <p className="text-green-600 mb-4">You have already signed this contract.</p>
            
            {otherPartySigned ? (
              <div className="bg-green-100 p-4 rounded-lg">
                <p className="text-green-800 font-medium">🎉 Contract Complete!</p>
                <p className="text-green-700 text-sm">Both parties have signed. You'll receive the final PDF via email.</p>
              </div>
            ) : (
              <div className="bg-yellow-100 p-4 rounded-lg">
                <p className="text-yellow-800 font-medium">⏳ Waiting for {otherPartyName}</p>
                <p className="text-yellow-700 text-sm">The contract will be complete when both parties sign.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center gap-3">
              <FileText className="w-8 h-8 text-blue-600" />
              <div>
                <CardTitle className="text-2xl">Contract Review & Signature</CardTitle>
                <p className="text-gray-600">
                  Signing as: <Badge variant="secondary">{isContractor ? 'Contractor' : 'Client'}</Badge>
                </p>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Contract Details */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Contract Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-600">Project</Label>
                <p className="text-lg">{contract.projectDescription}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">Total Amount</Label>
                <p className="text-2xl font-bold text-green-600">${contract.totalAmount.toLocaleString()}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">Contractor</Label>
                <p>{contract.contractorName}</p>
                {contract.contractorCompany && <p className="text-sm text-gray-600">{contract.contractorCompany}</p>}
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">Client</Label>
                <p>{contract.clientName}</p>
                {contract.clientAddress && <p className="text-sm text-gray-600">{contract.clientAddress}</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contract Content */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Contract Terms
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div 
              className="prose prose-sm max-w-none bg-white p-6 rounded-lg border max-h-96 overflow-y-auto"
              dangerouslySetInnerHTML={{ __html: contract.contractHtml }}
            />
          </CardContent>
        </Card>

        {/* Review Confirmation */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="review-confirmation"
                checked={hasReviewed}
                onChange={(e) => setHasReviewed(e.target.checked)}
                className="w-5 h-5 text-blue-600 rounded"
              />
              <Label htmlFor="review-confirmation" className="text-lg">
                I have carefully reviewed the contract terms and agree to the conditions stated above.
              </Label>
            </div>
          </CardContent>
        </Card>

        {/* Signature Section */}
        {hasReviewed && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Edit3 className="w-5 h-5" />
                Digital Signature
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Signature Type Selector */}
              <div className="flex gap-4 mb-6">
                <Button
                  variant={signatureType === 'drawing' ? 'default' : 'outline'}
                  onClick={() => setSignatureType('drawing')}
                  className="flex-1"
                >
                  ✏️ Draw Signature
                </Button>
                <Button
                  variant={signatureType === 'cursive' ? 'default' : 'outline'}
                  onClick={() => setSignatureType('cursive')}
                  className="flex-1"
                >
                  ✍️ Type Name
                </Button>
              </div>

              {signatureType === 'drawing' ? (
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 bg-white">
                    <Label className="block text-center mb-2">Draw your signature below</Label>
                    <canvas
                      ref={canvasRef}
                      width={400}
                      height={150}
                      className="w-full h-32 border border-gray-300 rounded touch-none"
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={startDrawing}
                      onTouchMove={draw}
                      onTouchEnd={stopDrawing}
                      style={{ touchAction: 'none' }}
                    />
                    <div className="flex justify-center mt-2">
                      <Button variant="outline" size="sm" onClick={clearSignature}>
                        Clear
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <Label htmlFor="cursive-name">Enter your full name</Label>
                  <Input
                    id="cursive-name"
                    value={cursiveName}
                    onChange={(e) => setCursiveName(e.target.value)}
                    placeholder="Your full name"
                    className="text-2xl font-cursive"
                    style={{ fontFamily: 'Dancing Script, cursive' }}
                  />
                  <p className="text-sm text-gray-600">
                    Your name will appear in cursive font as your digital signature
                  </p>
                </div>
              )}

              <Separator className="my-6" />

              <Button
                onClick={handleSign}
                disabled={signing}
                className="w-full py-3 text-lg"
                size="lg"
              >
                {signing ? (
                  <>
                    <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                    Saving Signature...
                  </>
                ) : (
                  <>
                    <Edit3 className="w-5 h-5 mr-2" />
                    Sign Contract
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Status Information */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-gray-500" />
              <Label className="text-lg">Signature Status</Label>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                {contract.contractorSigned ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <Clock className="w-5 h-5 text-yellow-500" />
                )}
                <div>
                  <p className="font-medium">Contractor</p>
                  <p className="text-sm text-gray-600">
                    {contract.contractorSigned ? 'Signed' : 'Pending'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {contract.clientSigned ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <Clock className="w-5 h-5 text-yellow-500" />
                )}
                <div>
                  <p className="font-medium">Client</p>
                  <p className="text-sm text-gray-600">
                    {contract.clientSigned ? 'Signed' : 'Pending'}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
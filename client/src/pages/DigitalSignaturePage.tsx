import React, { useState, useEffect, useRef } from 'react';
import { useParams, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { PenTool, Type, CheckCircle, Loader2, FileText, User, DollarSign } from 'lucide-react';

interface Contract {
  contractId: string;
  contractorName: string;
  contractorEmail: string;
  clientName: string;
  clientEmail: string;
  projectDescription: string;
  totalAmount: string;
  contractHtml: string;
  status: string;
  contractorSigned: boolean;
  clientSigned: boolean;
}

export default function DigitalSignaturePage() {
  const { contractId } = useParams<{ contractId: string }>();
  const [location] = useLocation();
  const urlParams = new URLSearchParams(location.split('?')[1]);
  const party = urlParams.get('party') as 'contractor' | 'client';
  
  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [signatureMode, setSignatureMode] = useState<'drawing' | 'cursive'>('drawing');
  const [cursiveName, setCursiveName] = useState('');
  const [hasReviewed, setHasReviewed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  
  const { toast } = useToast();
  
  // Obtener datos del contrato
  useEffect(() => {
    const fetchContract = async () => {
      if (!contractId) return;
      
      try {
        const response = await fetch(`/api/digital-contracts/${contractId}`);
        if (!response.ok) throw new Error('Contract not found');
        
        const data = await response.json();
        if (data.success) {
          setContract(data.contract);
          
          // Si esta parte ya firmó, mostrar mensaje de completado
          if ((party === 'contractor' && data.contract.contractorSigned) ||
              (party === 'client' && data.contract.clientSigned)) {
            setIsComplete(true);
          }
        }
      } catch (error) {
        console.error('Error fetching contract:', error);
        toast({
          title: "Error",
          description: "Failed to load contract data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchContract();
  }, [contractId, party]);
  
  // Configurar canvas para dibujo
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2; // Para alta resolución
    canvas.height = rect.height * 2;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.scale(2, 2);
    ctx.lineCap = 'round';
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#000';
  }, [contract]);
  
  // Funciones de dibujo en canvas
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    setHasSignature(true);
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.beginPath();
    ctx.moveTo(x, y);
  };
  
  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.lineTo(x, y);
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
    setHasSignature(false);
    setCursiveName('');
  };
  
  // Obtener datos de firma
  const getSignatureData = (): string => {
    if (signatureMode === 'cursive') {
      return cursiveName;
    } else {
      const canvas = canvasRef.current;
      return canvas ? canvas.toDataURL() : '';
    }
  };
  
  // Verificar si la firma es válida
  const isSignatureValid = (): boolean => {
    if (signatureMode === 'cursive') {
      return cursiveName.trim().length > 0;
    } else {
      return hasSignature;
    }
  };
  
  // Enviar firma
  const submitSignature = async () => {
    if (!isSignatureValid() || !hasReviewed) return;
    
    setIsSubmitting(true);
    
    try {
      const response = await fetch(`/api/digital-contracts/${contractId}/sign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          party,
          signatureData: getSignatureData(),
          signatureType: signatureMode,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setIsComplete(true);
        toast({
          title: "✅ Signature Recorded",
          description: data.bothSigned 
            ? "Both parties have signed! Final documents will be sent soon."
            : "Your signature has been recorded. Waiting for the other party.",
        });
      } else {
        throw new Error(data.error || 'Failed to record signature');
      }
      
    } catch (error) {
      console.error('Error submitting signature:', error);
      toast({
        title: "Error",
        description: "Failed to record signature. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-cyan-400 mx-auto mb-4" />
          <p className="text-gray-300">Loading contract...</p>
        </div>
      </div>
    );
  }
  
  if (!contract) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Card className="bg-gray-800 border-gray-700 max-w-md">
          <CardContent className="pt-6 text-center">
            <FileText className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Contract Not Found</h2>
            <p className="text-gray-400">The contract you're looking for doesn't exist or has expired.</p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (isComplete) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Card className="bg-gray-800 border-gray-700 max-w-md">
          <CardContent className="pt-6 text-center">
            <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Signature Complete</h2>
            <p className="text-gray-400 mb-4">
              {party === 'contractor' ? 'You have' : 'The client has'} successfully signed this contract.
            </p>
            <div className="text-sm text-gray-500">
              {contract.contractorSigned && contract.clientSigned 
                ? "Both parties have signed. Final documents will be sent shortly."
                : "Waiting for the other party to sign."}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-900 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-cyan-400">
              <FileText className="h-5 w-5" />
              Contract Signature - {party === 'contractor' ? 'Contractor' : 'Client'} Review
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-gray-400" />
                <span className="text-gray-400">Client:</span>
                <span className="text-white">{contract.clientName}</span>
              </div>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-gray-400" />
                <span className="text-gray-400">Contractor:</span>
                <span className="text-white">{contract.contractorName}</span>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-gray-400" />
                <span className="text-gray-400">Total:</span>
                <span className="text-cyan-400 font-bold">${parseFloat(contract.totalAmount).toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Contract Content */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Contract Review</CardTitle>
          </CardHeader>
          <CardContent>
            <div 
              className="bg-white p-6 rounded-lg max-h-96 overflow-y-auto text-black"
              dangerouslySetInnerHTML={{ __html: contract.contractHtml }}
            />
          </CardContent>
        </Card>
        
        {/* Review Confirmation */}
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="review" 
                checked={hasReviewed}
                onCheckedChange={(checked) => setHasReviewed(checked as boolean)}
              />
              <Label htmlFor="review" className="text-white">
                I have read and understand the contract terms above
              </Label>
            </div>
          </CardContent>
        </Card>
        
        {/* Signature Section */}
        {hasReviewed && (
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Digital Signature</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              
              {/* Signature Mode Toggle */}
              <div className="flex gap-4">
                <Button
                  variant={signatureMode === 'drawing' ? 'default' : 'outline'}
                  onClick={() => setSignatureMode('drawing')}
                  className="flex items-center gap-2"
                >
                  <PenTool className="h-4 w-4" />
                  Draw Signature
                </Button>
                <Button
                  variant={signatureMode === 'cursive' ? 'default' : 'outline'}
                  onClick={() => setSignatureMode('cursive')}
                  className="flex items-center gap-2"
                >
                  <Type className="h-4 w-4" />
                  Type Name
                </Button>
              </div>
              
              {/* Drawing Canvas */}
              {signatureMode === 'drawing' && (
                <div className="space-y-4">
                  <div className="border border-gray-600 rounded-lg p-4 bg-white">
                    <canvas
                      ref={canvasRef}
                      width={400}
                      height={150}
                      className="w-full h-32 cursor-crosshair"
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={startDrawing}
                      onTouchMove={draw}
                      onTouchEnd={stopDrawing}
                    />
                  </div>
                  <p className="text-sm text-gray-400">
                    Draw your signature in the box above using your mouse or finger
                  </p>
                </div>
              )}
              
              {/* Cursive Name Input */}
              {signatureMode === 'cursive' && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="cursiveName" className="text-white">Full Name</Label>
                    <Input
                      id="cursiveName"
                      value={cursiveName}
                      onChange={(e) => setCursiveName(e.target.value)}
                      className="mt-2 bg-gray-700 border-gray-600 text-white"
                      placeholder="Enter your full name"
                    />
                  </div>
                  {cursiveName && (
                    <div className="border border-gray-600 rounded-lg p-4 bg-white">
                      <div className="text-3xl font-serif text-center text-black">
                        {cursiveName}
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {/* Action Buttons */}
              <div className="flex gap-4">
                <Button
                  variant="outline"
                  onClick={clearSignature}
                  className="border-gray-600 text-gray-300 hover:bg-gray-700"
                >
                  Clear
                </Button>
                <Button
                  onClick={submitSignature}
                  disabled={!isSignatureValid() || !hasReviewed || isSubmitting}
                  className="bg-cyan-600 hover:bg-cyan-500 text-white flex-1"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Recording Signature...
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
        )}
      </div>
    </div>
  );
}
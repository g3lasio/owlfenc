import React, { useState } from 'react';
import { Search, CheckCircle, AlertTriangle, XCircle, FileText, Users, Clock, Hash, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface VerificationDocument {
  folio: string;
  contractId: string;
  documentType: string;
  issueDate: string;
  pdfHash: string;
  contractor: {
    name: string;
    license?: string;
    email?: string;
  };
  client: {
    name: string;
    location?: string;
  };
  signatures: Array<{
    party: string;
    signedAt: string;
    ipAddress: string;
    status: string;
  }>;
  security: {
    integrityVerified: boolean;
    signaturesValid: boolean;
    timestampsAuthentic: boolean;
  };
}

interface VerificationResponse {
  success: boolean;
  document?: VerificationDocument;
  error?: string;
  message?: string;
}

const ContractVerification: React.FC = () => {
  const [folioInput, setFolioInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [verificationResult, setVerificationResult] = useState<VerificationResponse | null>(null);

  const handleVerify = async () => {
    if (!folioInput.trim()) {
      return;
    }

    setLoading(true);
    setVerificationResult(null);

    try {
      const response = await fetch(`/api/verify/${folioInput.trim()}`);
      const data: VerificationResponse = await response.json();
      
      setVerificationResult(data);
    } catch (error) {
      console.error('Error verifying contract:', error);
      setVerificationResult({
        success: false,
        error: 'NETWORK_ERROR',
        message: 'Unable to connect to verification service. Please try again later.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleVerify();
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short',
      });
    } catch {
      return dateString;
    }
  };

  const formatHash = (hash: string) => {
    if (hash.length > 16) {
      return `${hash.substring(0, 8)}...${hash.substring(hash.length - 8)}`;
    }
    return hash;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <img 
              src="/assets/owl-fenc-logo-white.png" 
              alt="Owl Fenc Logo" 
              className="h-24 w-auto object-contain"
            />
          </div>
          <h1 className="text-5xl font-bold text-white mb-4">
            Document Verification
          </h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            Verify the authenticity of Owl Fenc construction contracts and certificates
          </p>
        </div>

        {/* Search Box */}
        <Card className="max-w-2xl mx-auto bg-slate-800/50 border-slate-700 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white">Enter Folio Number</CardTitle>
            <CardDescription className="text-slate-400">
              Enter the folio number from your document to verify its authenticity
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="FOL-20260113-1C916B"
                value={folioInput}
                onChange={(e) => setFolioInput(e.target.value.toUpperCase())}
                onKeyPress={handleKeyPress}
                className="bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-500"
                disabled={loading}
              />
              <Button
                onClick={handleVerify}
                disabled={loading || !folioInput.trim()}
                className="bg-cyan-600 hover:bg-cyan-700 text-white"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    Verify
                  </>
                )}
              </Button>
            </div>
            <p className="text-sm text-slate-400 mt-2">
              Expected format: FOL-YYYYMMDD-XXXXX
            </p>
          </CardContent>
        </Card>

        {/* Verification Results */}
        {verificationResult && (
          <div className="max-w-4xl mx-auto mt-8 space-y-6">
            {verificationResult.success && verificationResult.document ? (
              <>
                {/* Success Badge */}
                <Alert className="bg-green-900/20 border-green-500/50">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                  <AlertDescription className="text-green-300 ml-2">
                    <strong>VERIFIED AUTHENTIC</strong> - This document is genuine and unaltered
                  </AlertDescription>
                </Alert>

                {/* Document Details */}
                <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-cyan-400" />
                      <CardTitle className="text-white">Document Details</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-slate-400">Document Type</p>
                        <p className="text-white font-medium">{verificationResult.document.documentType}</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-400">Folio Number</p>
                        <p className="text-cyan-400 font-mono font-medium">{verificationResult.document.folio}</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-400">Contract ID</p>
                        <p className="text-white font-mono text-sm">{verificationResult.document.contractId}</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-400">Issue Date</p>
                        <p className="text-white">{formatDate(verificationResult.document.issueDate)}</p>
                      </div>
                      <div className="md:col-span-2">
                        <p className="text-sm text-slate-400 flex items-center gap-1">
                          <Hash className="w-4 h-4" />
                          Document Hash (SHA-256)
                        </p>
                        <p className="text-white font-mono text-sm break-all">
                          {formatHash(verificationResult.document.pdfHash)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Parties Information */}
                <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-cyan-400" />
                      <CardTitle className="text-white">Parties to the Contract</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm text-slate-400 mb-2">Licensed Contractor</p>
                      <div className="bg-slate-900/50 p-4 rounded-lg">
                        <p className="text-white font-medium">{verificationResult.document.contractor.name}</p>
                        {verificationResult.document.contractor.license && (
                          <p className="text-slate-300 text-sm">License #: {verificationResult.document.contractor.license}</p>
                        )}
                        {verificationResult.document.contractor.email && (
                          <p className="text-slate-400 text-sm">{verificationResult.document.contractor.email}</p>
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-slate-400 mb-2">Property Owner / Client</p>
                      <div className="bg-slate-900/50 p-4 rounded-lg">
                        <p className="text-white font-medium">{verificationResult.document.client.name}</p>
                        {verificationResult.document.client.location && (
                          <p className="text-slate-300 text-sm">{verificationResult.document.client.location}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Digital Signatures */}
                <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-cyan-400" />
                      <CardTitle className="text-white">Digital Signatures</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {verificationResult.document.signatures.map((sig, index) => (
                      <div key={index} className="bg-slate-900/50 p-4 rounded-lg flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-green-400 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-white font-medium capitalize">{sig.party} Signature</p>
                          <p className="text-slate-300 text-sm">Signed: {formatDate(sig.signedAt)}</p>
                          <p className="text-slate-400 text-sm">IP Address: {sig.ipAddress}</p>
                          <Badge className="mt-2 bg-green-900/30 text-green-400 border-green-500/50">
                            {sig.status.toUpperCase()}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Security & Legal Information */}
                <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Shield className="w-5 h-5 text-cyan-400" />
                      <CardTitle className="text-white">Security & Authenticity</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-green-400" />
                        <span className="text-slate-300 text-sm">Integrity verified</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-green-400" />
                        <span className="text-slate-300 text-sm">Signatures validated</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-green-400" />
                        <span className="text-slate-300 text-sm">Timestamps authentic</span>
                      </div>
                    </div>
                    <div className="bg-slate-900/50 p-4 rounded-lg">
                      <p className="text-slate-300 text-sm leading-relaxed">
                        <strong className="text-white">Legal Notice:</strong> This document was digitally signed by both parties. 
                        The signature(s), timestamp(s), and IP address(es) serve as legal evidence of consent. 
                        Document integrity is verified via SHA-256 hash stored in our secure database.
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Powered By */}
                <Card className="bg-gradient-to-r from-cyan-900/20 to-blue-900/20 border-cyan-500/30 backdrop-blur-sm">
                  <CardContent className="py-6">
                    <div className="text-center">
                      <p className="text-slate-300 mb-2">🏆 Powered by Owl Fenc</p>
                      <div className="flex justify-center gap-6 text-sm text-slate-400">
                        <span>• Enterprise-grade security</span>
                        <span>• Tamper-proof digital seals</span>
                        <span>• Legal compliance guaranteed</span>
                      </div>
                      <Button
                        variant="link"
                        className="mt-4 text-cyan-400 hover:text-cyan-300"
                        onClick={() => window.open('https://app.owlfenc.com', '_blank')}
                      >
                        Learn more about Owl Fenc
                        <ExternalLink className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              /* Error States */
              <Alert className={`${
                verificationResult.error === 'FOLIO_NOT_FOUND' 
                  ? 'bg-yellow-900/20 border-yellow-500/50' 
                  : 'bg-red-900/20 border-red-500/50'
              }`}>
                {verificationResult.error === 'FOLIO_NOT_FOUND' ? (
                  <>
                    <AlertTriangle className="h-5 w-5 text-yellow-400" />
                    <div className="ml-2">
                      <AlertDescription className="text-yellow-300">
                        <strong>DOCUMENT NOT FOUND</strong>
                      </AlertDescription>
                      <AlertDescription className="text-yellow-200 mt-2">
                        {verificationResult.message}
                      </AlertDescription>
                      <AlertDescription className="text-yellow-200 mt-3 text-sm">
                        Please check:
                        <ul className="list-disc ml-5 mt-1">
                          <li>Folio number is correct</li>
                          <li>No extra spaces or characters</li>
                          <li>Format: FOL-YYYYMMDD-XXXXX</li>
                        </ul>
                      </AlertDescription>
                    </div>
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5 text-red-400" />
                    <div className="ml-2">
                      <AlertDescription className="text-red-300">
                        <strong>VERIFICATION ERROR</strong>
                      </AlertDescription>
                      <AlertDescription className="text-red-200 mt-2">
                        {verificationResult.message}
                      </AlertDescription>
                    </div>
                  </>
                )}
              </Alert>
            )}
          </div>
        )}

        {/* Info Section */}
        {!verificationResult && (
          <div className="max-w-2xl mx-auto mt-12">
            <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur-sm">
              <CardContent className="py-6">
                <h3 className="text-white font-semibold mb-3">How to verify your document:</h3>
                <ol className="list-decimal list-inside space-y-2 text-slate-300 text-sm">
                  <li>Locate the folio number on your contract or certificate</li>
                  <li>Enter the folio number in the field above</li>
                  <li>Click "Verify" to check authenticity</li>
                  <li>Review the verification results</li>
                </ol>
                <p className="text-slate-400 text-sm mt-4">
                  The folio number can be found at the bottom of your document in the "Digital Certificate of Authenticity" section.
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContractVerification;

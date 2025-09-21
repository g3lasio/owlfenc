import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Clock, User, Phone, Mail, MapPin, Building2, ExternalLink, CheckCircle, Zap, Shield, Cpu, Activity } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface EstimateData {
  client: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    total: number;
    description?: string;
  }>;
  projectDetails: string;
  subtotal: number;
  tax: number;
  total: number;
  taxRate: number;
  discountType?: string;
  discountValue?: number;
  discountAmount?: number;
  discountName?: string;
  contractor: {
    company: string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    phone?: string;
    email?: string;
    website?: string;
    license?: string;
    logo?: string;
  };
  template?: string;
  createdAt: string;
}

interface SharedEstimateResponse {
  success: boolean;
  estimateData?: EstimateData;
  createdAt?: string;
  expiresAt?: string;
  error?: string;
}

export default function SharedEstimate() {
  const { shareId } = useParams<{ shareId: string }>();
  const [estimateData, setEstimateData] = useState<EstimateData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [isApproving, setIsApproving] = useState(false);
  const [isApproved, setIsApproved] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchSharedEstimate = async () => {
      if (!shareId) {
        setError("Invalid share link");
        setLoading(false);
        return;
      }

      try {
        console.log(`🔗 [SHARED-ESTIMATE] Fetching shared estimate: ${shareId}`);
        const response = await fetch(`/api/estimates/shared/${shareId}`);
        const data: SharedEstimateResponse = await response.json();

        if (!response.ok) {
          if (response.status === 404) {
            setError("This estimate link was not found.");
          } else if (response.status === 410) {
            setError("This estimate link has been deactivated.");
          } else {
            setError(data.error || "Failed to load estimate");
          }
          setLoading(false);
          return;
        }

        if (data.success && data.estimateData) {
          console.log("🔍 [DEBUG] Raw estimate data items:", data.estimateData.items);
          setEstimateData(data.estimateData);
          setExpiresAt(data.expiresAt || null);
          console.log("✅ [SHARED-ESTIMATE] Estimate loaded successfully");
        } else {
          setError("Failed to load estimate data");
        }
      } catch (err) {
        console.error("❌ [SHARED-ESTIMATE] Error fetching estimate:", err);
        setError("Network error - please try again");
      } finally {
        setLoading(false);
      }
    };

    fetchSharedEstimate();
  }, [shareId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 flex items-center justify-center">
        <div className="text-center relative">
          {/* 🔴 Holographic loading animation */}
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full border-2 border-yellow-500 animate-pulse"></div>
            <div className="absolute inset-2 rounded-full border-2 border-red-500 animate-spin"></div>
            <div className="absolute inset-4 rounded-full border-2 border-blue-400 animate-ping"></div>
            <Cpu className="absolute inset-6 w-8 h-8 text-yellow-400 animate-pulse" />
          </div>
          <div className="text-yellow-400 font-bold text-xl tracking-wider mb-2">CHYRRIS TECHNOLOGIES</div>
          <p className="text-gray-300 text-sm tracking-wider">INITIALIZING HOLOGRAPHIC DISPLAY...</p>
          <div className="mt-4 flex justify-center space-x-1">
            <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-red-900 flex items-center justify-center">
        <div className="relative max-w-md mx-4">
          {/* ❌ Holographic error display */}
          <div className="absolute -inset-1 bg-gradient-to-r from-red-600 via-yellow-500 to-red-600 rounded-lg blur opacity-25 animate-pulse"></div>
          <div className="relative bg-black/90 backdrop-blur-sm border border-red-500/30 rounded-lg p-8">
            <div className="text-center">
              <div className="relative w-16 h-16 mx-auto mb-6">
                <div className="absolute inset-0 border-2 border-red-500 rounded-full animate-ping"></div>
                <div className="absolute inset-2 bg-red-500/20 rounded-full flex items-center justify-center">
                  <Shield className="w-8 h-8 text-red-400 animate-pulse" />
                </div>
              </div>
              <h2 className="text-xl font-bold text-red-400 mb-3 tracking-wider">ACCESS DENIED</h2>
              <p className="text-gray-300 text-sm leading-relaxed">{error}</p>
              <div className="mt-6 text-xs text-gray-500 tracking-wider">CHYRRIS SECURITY PROTOCOL</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!estimateData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">No estimate data found</p>
      </div>
    );
  }

  const formatCurrency = (amount: number | string, debugLabel?: string) => {
    // 🐛 DEBUG: Log para diagnosticar unit price issues
    if (debugLabel) {
      console.log(`💰 [CURRENCY-DEBUG] ${debugLabel}:`, { amount, type: typeof amount });
    }
    
    // ✅ FIX: Validación mejorada para unit price
    let numAmount: number;
    
    if (typeof amount === 'string') {
      numAmount = parseFloat(amount);
    } else if (typeof amount === 'number') {
      numAmount = amount;
    } else {
      console.warn(`⚠️ [CURRENCY-WARN] Invalid amount type:`, { amount, type: typeof amount });
      return '$0.00';
    }
    
    if (isNaN(numAmount) || numAmount === null || numAmount === undefined) {
      console.warn(`⚠️ [CURRENCY-WARN] NaN detected for ${debugLabel || 'amount'}:`, { amount, numAmount });
      return '$0.00';
    }
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(numAmount);
  };

  // 📦 Función de aprobación del estimado
  const handleApproveEstimate = async () => {
    if (!shareId) return;
    
    setIsApproving(true);
    try {
      const response = await fetch(`/api/estimates/shared/${shareId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        setIsApproved(true);
        toast({
          title: "✅ Estimate Approved!",
          description: "Your approval has been recorded. The contractor will be notified.",
        });
      } else {
        throw new Error(result.error || 'Failed to approve estimate');
      }
    } catch (err: any) {
      console.error('❌ [APPROVAL] Error approving estimate:', err);
      toast({
        title: "❌ Approval Failed",
        description: err.message || "Unable to approve estimate. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsApproving(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // 🛡️ Helper function to safely render address (handle both string and object)
  const renderAddress = (address: any) => {
    if (!address) return null;
    
    if (typeof address === 'string') {
      return address;
    }
    
    // Handle address object - concatenate meaningful fields
    if (typeof address === 'object') {
      const parts = [];
      if (address.street) parts.push(address.street);
      if (address.city) parts.push(address.city);
      if (address.state) parts.push(address.state);
      if (address.zipCode || address.zip) parts.push(address.zipCode || address.zip);
      
      return parts.join(', ') || JSON.stringify(address);
    }
    
    return String(address);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-blue-900 py-8 relative overflow-hidden">
      {/* ✨ Holographic background effects */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-10 left-10 w-32 h-32 border border-yellow-400 rounded-full animate-pulse"></div>
        <div className="absolute top-20 right-20 w-24 h-24 border border-red-500 rounded-full animate-ping"></div>
        <div className="absolute bottom-20 left-20 w-40 h-40 border border-blue-400 rounded-full animate-bounce"></div>
        <div className="absolute bottom-10 right-10 w-28 h-28 border border-yellow-400 rounded-full animate-pulse"></div>
      </div>
      
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="relative">
          {/* 🎆 Holographic container with glowing edges */}
          <div className="absolute -inset-1 bg-gradient-to-r from-yellow-600 via-red-500 to-blue-600 rounded-2xl blur opacity-20 animate-pulse"></div>
          <div className="relative bg-black/80 backdrop-blur-sm border border-yellow-400/30 rounded-2xl overflow-hidden">
            {/* 🎯 CHYRRIS TECHNOLOGIES Header */}
            <div className="relative bg-gradient-to-r from-yellow-600/20 via-red-600/20 to-yellow-600/20 border-b border-yellow-400/30 p-8">
            <div className="flex items-center justify-between">
              <div className="relative">
                <div className="flex items-center mb-2">
                  <div className="w-8 h-8 bg-yellow-400 rounded-full mr-3 flex items-center justify-center">
                    <Zap className="w-5 h-5 text-black" />
                  </div>
                  <span className="text-yellow-400 font-bold text-sm tracking-widest">CHYRRIS TECHNOLOGIES</span>
                </div>
                <h1 className="text-3xl font-bold text-white mb-1 tracking-wide">HOLOGRAPHIC ESTIMATE</h1>
                <p className="text-gray-300 text-sm tracking-wider">
                  GENERATED: {formatDate(estimateData.createdAt).toUpperCase()}
                </p>
                <div className="mt-3 flex items-center space-x-4">
                  <div className="flex items-center text-xs text-green-400">
                    <Activity className="w-3 h-3 mr-1 animate-pulse" />
                    <span>SYSTEM ACTIVE</span>
                  </div>
                  <div className="flex items-center text-xs text-blue-400">
                    <Shield className="w-3 h-3 mr-1" />
                    <span>SECURE LINK</span>
                  </div>
                </div>
              </div>
              
              {/* 📊 Status indicators */}
              <div className="text-right">
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                  <div className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
                  <div className="w-3 h-3 bg-red-400 rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
                </div>
                <div className="text-xs text-gray-400 tracking-wider">POWER: 100%</div>
              </div>
            </div>
            
            {/* ✨ Scanning line effect */}
            <div className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-transparent via-yellow-400 to-transparent w-full animate-pulse"></div>
          </div>

            <div className="p-8 space-y-8">
            {/* 🏢 Contractor Information - Holographic Panel */}
            <div className="relative">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl blur opacity-20"></div>
              <div className="relative bg-gray-900/60 backdrop-blur-sm border border-blue-400/30 rounded-xl p-6">
                <div className="flex items-center mb-4">
                  <div className="w-8 h-8 bg-blue-500/20 rounded-lg mr-3 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-blue-400" />
                  </div>
                  <h2 className="text-xl font-bold text-white tracking-wide">CONTRACTOR MATRIX</h2>
                  <div className="ml-auto flex space-x-1">
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div className="p-4 bg-yellow-500/10 border border-yellow-400/20 rounded-lg">
                      <div className="flex items-start space-x-4">
                        {/* 🏢 Company Logo */}
                        {estimateData.contractor.logo && (
                          <div className="flex-shrink-0">
                            <img 
                              src={estimateData.contractor.logo}
                              alt={`${estimateData.contractor.company} Logo`}
                              className="w-12 h-12 rounded-lg object-contain bg-white/10 p-1"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          </div>
                        )}
                        <div className="flex-1">
                          <h3 className="font-bold text-xl text-yellow-400 mb-1 tracking-wide">{estimateData.contractor.company}</h3>
                          {estimateData.contractor.license && (
                            <div className="flex items-center text-sm text-gray-300">
                              <Shield className="w-3 h-3 mr-2 text-green-400" />
                              <span>LICENSE: {estimateData.contractor.license}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {estimateData.contractor.phone && (
                      <div className="flex items-center text-sm text-gray-300 p-2 bg-gray-800/50 rounded-lg border border-gray-600/30">
                        <Phone className="w-4 h-4 mr-3 text-blue-400" />
                        <span className="tracking-wider">{estimateData.contractor.phone}</span>
                      </div>
                    )}
                    {estimateData.contractor.email && (
                      <div className="flex items-center text-sm text-gray-300 p-2 bg-gray-800/50 rounded-lg border border-gray-600/30">
                        <Mail className="w-4 h-4 mr-3 text-green-400" />
                        <span className="tracking-wider">{estimateData.contractor.email}</span>
                      </div>
                    )}
                    {estimateData.contractor.website && (
                      <div className="flex items-center text-sm p-2 bg-gray-800/50 rounded-lg border border-gray-600/30">
                        <ExternalLink className="w-4 h-4 mr-3 text-yellow-400" />
                        <a 
                          href={estimateData.contractor.website} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 transition-colors tracking-wider"
                        >
                          {estimateData.contractor.website}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 👤 Client Information - Holographic Panel */}
            <div className="relative">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-green-600 to-blue-600 rounded-xl blur opacity-20"></div>
              <div className="relative bg-gray-900/60 backdrop-blur-sm border border-green-400/30 rounded-xl p-6">
                <div className="flex items-center mb-4">
                  <div className="w-8 h-8 bg-green-500/20 rounded-lg mr-3 flex items-center justify-center">
                    <User className="w-5 h-5 text-green-400" />
                  </div>
                  <h2 className="text-xl font-bold text-white tracking-wide">CLIENT PROFILE</h2>
                  <div className="ml-auto flex space-x-1">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <div className="p-4 bg-green-500/10 border border-green-400/20 rounded-lg">
                      <h3 className="font-bold text-xl text-green-400 tracking-wide">{estimateData.client.name}</h3>
                      <div className="text-xs text-gray-400 mt-1 tracking-wider">PRIMARY CONTACT</div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {estimateData.client.phone && (
                      <div className="flex items-center text-sm text-gray-300 p-2 bg-gray-800/50 rounded-lg border border-gray-600/30">
                        <Phone className="w-4 h-4 mr-3 text-blue-400" />
                        <span className="tracking-wider">{estimateData.client.phone}</span>
                      </div>
                    )}
                    {estimateData.client.email && (
                      <div className="flex items-center text-sm text-gray-300 p-2 bg-gray-800/50 rounded-lg border border-gray-600/30">
                        <Mail className="w-4 h-4 mr-3 text-green-400" />
                        <span className="tracking-wider">{estimateData.client.email}</span>
                      </div>
                    )}
                    {estimateData.client.address && (
                      <div className="flex items-center text-sm text-gray-300 p-2 bg-gray-800/50 rounded-lg border border-gray-600/30">
                        <MapPin className="w-4 h-4 mr-3 text-red-400" />
                        <span className="tracking-wider">{renderAddress(estimateData.client.address)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 🛠️ Project Details - Holographic Panel */}
            <div className="relative">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 to-red-600 rounded-xl blur opacity-20"></div>
              <div className="relative bg-gray-900/60 backdrop-blur-sm border border-purple-400/30 rounded-xl p-6">
                <div className="flex items-center mb-4">
                  <div className="w-8 h-8 bg-purple-500/20 rounded-lg mr-3 flex items-center justify-center">
                    <Cpu className="w-5 h-5 text-purple-400" />
                  </div>
                  <h2 className="text-xl font-bold text-white tracking-wide">PROJECT SPECIFICATIONS</h2>
                  <div className="ml-auto flex space-x-1">
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                    <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
                  </div>
                </div>
                <div className="p-4 bg-gray-800/50 border border-gray-600/30 rounded-lg">
                  <p className="text-gray-300 whitespace-pre-wrap leading-relaxed tracking-wide">{estimateData.projectDetails}</p>
                </div>
              </div>
            </div>

            {/* 📄 Items - Holographic Data Matrix */}
            <div className="relative">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-yellow-600 to-orange-600 rounded-xl blur opacity-20"></div>
              <div className="relative bg-gray-900/60 backdrop-blur-sm border border-yellow-400/30 rounded-xl p-6">
                <div className="flex items-center mb-6">
                  <div className="w-8 h-8 bg-yellow-500/20 rounded-lg mr-3 flex items-center justify-center">
                    <Activity className="w-5 h-5 text-yellow-400 animate-pulse" />
                  </div>
                  <h2 className="text-xl font-bold text-white tracking-wide">ITEM MATRIX</h2>
                  <div className="ml-auto flex items-center space-x-2">
                    <div className="text-xs text-gray-400 tracking-wider">SCANNING...</div>
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                      <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse" style={{ animationDelay: '0.3s' }}></div>
                      <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse" style={{ animationDelay: '0.6s' }}></div>
                    </div>
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-yellow-400/30">
                        <th className="text-left py-3 text-yellow-400 font-bold tracking-wider text-sm">DESCRIPTION</th>
                        <th className="text-center py-3 text-yellow-400 font-bold tracking-wider text-sm">QTY</th>
                        <th className="text-center py-3 text-yellow-400 font-bold tracking-wider text-sm">UNIT</th>
                        <th className="text-right py-3 text-yellow-400 font-bold tracking-wider text-sm">UNIT PRICE</th>
                        <th className="text-right py-3 text-yellow-400 font-bold tracking-wider text-sm">TOTAL</th>
                      </tr>
                    </thead>
                    <tbody>
                      {estimateData.items.map((item, index) => (
                        <tr key={index} className="border-b border-gray-600/30 hover:bg-yellow-400/5 transition-colors">
                          <td className="py-4">
                            <div>
                              <p className="font-semibold text-white tracking-wide">{item.name}</p>
                              {item.description && (
                                <p className="text-sm text-gray-400 mt-1 tracking-wider">{item.description}</p>
                              )}
                            </div>
                          </td>
                          <td className="text-center py-4 text-blue-400 font-mono font-bold">{item.quantity}</td>
                          <td className="text-center py-4 text-gray-300 tracking-wider">{item.unit}</td>
                          <td className="text-right py-4 text-green-400 font-mono font-bold">{formatCurrency(item.unitPrice, `Item-${index}-UnitPrice`)}</td>
                          <td className="text-right py-4 text-yellow-400 font-mono font-bold text-lg">{formatCurrency(item.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* 📊 Totals - Holographic Financial Matrix */}
            <div className="relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-green-600 via-yellow-600 to-red-600 rounded-2xl blur opacity-30 animate-pulse"></div>
              <div className="relative bg-gray-900/80 backdrop-blur-sm border border-green-400/40 rounded-2xl p-8">
                <div className="flex items-center mb-6">
                  <div className="w-10 h-10 bg-green-500/20 rounded-xl mr-4 flex items-center justify-center">
                    <Activity className="w-6 h-6 text-green-400 animate-pulse" />
                  </div>
                  <h2 className="text-2xl font-bold text-white tracking-wide">FINANCIAL ANALYSIS</h2>
                  <div className="ml-auto">
                    <div className="grid grid-cols-4 gap-1">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                      <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '0.6s' }}></div>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-gray-800/50 border border-gray-600/30 rounded-lg">
                    <span className="text-gray-300 tracking-wider">SUBTOTAL:</span>
                    <span className="text-white font-mono font-bold text-lg">{formatCurrency(estimateData.subtotal)}</span>
                  </div>
                  
                  {estimateData.discountAmount && estimateData.discountAmount > 0 && (
                    <div className="flex justify-between items-center p-3 bg-green-500/10 border border-green-400/30 rounded-lg">
                      <span className="text-green-400 tracking-wider">
                        DISCOUNT ({estimateData.discountName || 'DISCOUNT'}):
                      </span>
                      <span className="text-green-400 font-mono font-bold text-lg">-{formatCurrency(estimateData.discountAmount)}</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between items-center p-3 bg-blue-500/10 border border-blue-400/30 rounded-lg">
                    <span className="text-blue-400 tracking-wider">TAX ({(estimateData.taxRate * 100).toFixed(1)}%):</span>
                    <span className="text-blue-400 font-mono font-bold text-lg">{formatCurrency(estimateData.tax)}</span>
                  </div>
                  
                  <div className="h-px bg-gradient-to-r from-transparent via-yellow-400 to-transparent my-4"></div>
                  
                  <div className="flex justify-between items-center p-4 bg-gradient-to-r from-yellow-500/20 to-red-500/20 border border-yellow-400/50 rounded-xl">
                    <span className="text-yellow-400 font-bold text-xl tracking-wider">TOTAL AMOUNT:</span>
                    <span className="text-yellow-400 font-mono font-bold text-3xl">{formatCurrency(estimateData.total)}</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* ✅ APPROVE ESTIMATE Button - Holographic Action Panel */}
            <div className="relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-green-600 via-blue-600 to-purple-600 rounded-2xl blur opacity-40 animate-pulse"></div>
              <div className="relative bg-gray-900/90 backdrop-blur-sm border border-green-400/50 rounded-2xl p-8 text-center">
                <div className="mb-6">
                  <div className="flex items-center justify-center mb-4">
                    <div className="w-12 h-12 bg-green-500/20 rounded-full mr-4 flex items-center justify-center">
                      <CheckCircle className="w-8 h-8 text-green-400 animate-pulse" />
                    </div>
                    <h2 className="text-2xl font-bold text-white tracking-wide">APPROVE ESTIMATE</h2>
                  </div>
                  <p className="text-gray-300 tracking-wider">Ready to proceed with this professional estimate?</p>
                </div>
                
                {!isApproved ? (
                  <Button
                    onClick={handleApproveEstimate}
                    disabled={isApproving}
                    className="relative group bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-500 hover:to-blue-500 text-white font-bold py-4 px-12 rounded-xl text-lg tracking-wider transform transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                    data-testid="button-approve-estimate"
                  >
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-green-600 to-blue-600 rounded-xl blur opacity-0 group-hover:opacity-50 transition-opacity"></div>
                    <div className="relative flex items-center space-x-3">
                      {isApproving ? (
                        <>
                          <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>PROCESSING...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-6 h-6" />
                          <span>APPROVE ESTIMATE</span>
                        </>
                      )}
                    </div>
                  </Button>
                ) : (
                  <div className="p-6 bg-green-500/20 border border-green-400/50 rounded-xl">
                    <div className="flex items-center justify-center mb-3">
                      <CheckCircle className="w-8 h-8 text-green-400 mr-3" />
                      <span className="text-green-400 font-bold text-xl tracking-wider">ESTIMATE APPROVED</span>
                    </div>
                    <p className="text-gray-300 text-sm tracking-wider">Your approval has been recorded. The contractor will be notified shortly.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 🏁 Footer - Chyrris Technologies */}
          <div className="bg-gradient-to-r from-gray-800/50 via-black/60 to-gray-800/50 border-t border-yellow-400/30 px-8 py-6 text-center">
            <div className="flex items-center justify-center mb-3">
              <div className="w-6 h-6 bg-yellow-400 rounded-full mr-3 flex items-center justify-center">
                <Zap className="w-4 h-4 text-black" />
              </div>
              <span className="text-yellow-400 font-bold text-sm tracking-widest">CHYRRIS TECHNOLOGIES</span>
            </div>
            <p className="text-gray-300 text-sm tracking-wider mb-2">ADVANCED HOLOGRAPHIC ESTIMATE DISPLAY SYSTEM</p>
            <p className="text-gray-400 text-xs tracking-wider">Powered by Mervin AI | Contact contractor to proceed with project</p>
            <div className="mt-4 flex justify-center space-x-4">
              <div className="flex items-center text-xs text-green-400">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
                <span>SECURE</span>
              </div>
              <div className="flex items-center text-xs text-blue-400">
                <div className="w-2 h-2 bg-blue-400 rounded-full mr-2 animate-pulse"></div>
                <span>ENCRYPTED</span>
              </div>
              <div className="flex items-center text-xs text-yellow-400">
                <div className="w-2 h-2 bg-yellow-400 rounded-full mr-2 animate-pulse"></div>
                <span>VERIFIED</span>
              </div>
            </div>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}
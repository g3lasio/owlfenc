import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Clock, User, Phone, Mail, MapPin, Building2, ExternalLink } from "lucide-react";

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading estimate...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <ExternalLink className="w-6 h-6 text-red-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Unable to Load Estimate</h2>
              <p className="text-gray-600">{error}</p>
            </div>
          </CardContent>
        </Card>
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          {/* Header */}
          <div className="bg-blue-600 text-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold">Professional Estimate</h1>
                <p className="text-blue-100 mt-1">
                  Created on {formatDate(estimateData.createdAt)}
                </p>
              </div>
              {/* ✅ PERMANENT URLS: No expiry badge for permanent links */}
            </div>
          </div>

          <div className="p-6 space-y-8">
            {/* Contractor Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Building2 className="w-5 h-5 mr-2" />
                  Contractor Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-semibold text-lg">{estimateData.contractor.company}</h3>
                    {estimateData.contractor.license && (
                      <p className="text-sm text-gray-600">License: {estimateData.contractor.license}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    {estimateData.contractor.phone && (
                      <div className="flex items-center text-sm">
                        <Phone className="w-4 h-4 mr-2 text-gray-400" />
                        {estimateData.contractor.phone}
                      </div>
                    )}
                    {estimateData.contractor.email && (
                      <div className="flex items-center text-sm">
                        <Mail className="w-4 h-4 mr-2 text-gray-400" />
                        {estimateData.contractor.email}
                      </div>
                    )}
                    {estimateData.contractor.website && (
                      <div className="flex items-center text-sm">
                        <ExternalLink className="w-4 h-4 mr-2 text-gray-400" />
                        <a 
                          href={estimateData.contractor.website} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          {estimateData.contractor.website}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Client Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="w-5 h-5 mr-2" />
                  Client Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-semibold">{estimateData.client.name}</h3>
                  </div>
                  <div className="space-y-2">
                    {estimateData.client.phone && (
                      <div className="flex items-center text-sm">
                        <Phone className="w-4 h-4 mr-2 text-gray-400" />
                        {estimateData.client.phone}
                      </div>
                    )}
                    {estimateData.client.email && (
                      <div className="flex items-center text-sm">
                        <Mail className="w-4 h-4 mr-2 text-gray-400" />
                        {estimateData.client.email}
                      </div>
                    )}
                    {estimateData.client.address && (
                      <div className="flex items-center text-sm">
                        <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                        {estimateData.client.address}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Project Details */}
            <Card>
              <CardHeader>
                <CardTitle>Project Details</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 whitespace-pre-wrap">{estimateData.projectDetails}</p>
              </CardContent>
            </Card>

            {/* Items */}
            <Card>
              <CardHeader>
                <CardTitle>Estimate Items</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2">Description</th>
                        <th className="text-center py-2">Qty</th>
                        <th className="text-center py-2">Unit</th>
                        <th className="text-right py-2">Unit Price</th>
                        <th className="text-right py-2">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {estimateData.items.map((item, index) => (
                        <tr key={index} className="border-b">
                          <td className="py-3">
                            <div>
                              <p className="font-medium">{item.name}</p>
                              {item.description && (
                                <p className="text-sm text-gray-600">{item.description}</p>
                              )}
                            </div>
                          </td>
                          <td className="text-center py-3">{item.quantity}</td>
                          <td className="text-center py-3">{item.unit}</td>
                          <td className="text-right py-3">{formatCurrency(item.unitPrice)}</td>
                          <td className="text-right py-3 font-medium">{formatCurrency(item.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Totals */}
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(estimateData.subtotal)}</span>
                  </div>
                  
                  {estimateData.discountAmount && estimateData.discountAmount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>
                        Discount ({estimateData.discountName || 'Discount'}):
                      </span>
                      <span>-{formatCurrency(estimateData.discountAmount)}</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between">
                    <span>Tax ({(estimateData.taxRate * 100).toFixed(1)}%):</span>
                    <span>{formatCurrency(estimateData.tax)}</span>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total:</span>
                    <span>{formatCurrency(estimateData.total)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 text-center text-sm text-gray-600">
            <p>This is your professional estimate. Please contact us to proceed with your project.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
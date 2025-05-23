import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Send, 
  Eye, 
  Download, 
  User, 
  MapPin, 
  Building, 
  Calendar,
  DollarSign,
  Check
} from "lucide-react";

interface ReviewAndSendStepProps {
  clientData: any;
  estimateData: any;
  materials: any[];
  labor: any[];
  onPreview: () => void;
  onDownload: () => void;
  onSend: () => void;
  onSave: () => void;
  isLoading?: boolean;
}

export function ReviewAndSendStep({
  clientData,
  estimateData,
  materials,
  labor,
  onPreview,
  onDownload,
  onSend,
  onSave,
  isLoading = false
}: ReviewAndSendStepProps) {
  
  const materialsTotal = materials.reduce((sum, material) => sum + material.total, 0);
  const laborTotal = labor.reduce((sum, laborItem) => sum + laborItem.total, 0);
  const subtotal = materialsTotal + laborTotal;
  const taxAmount = subtotal * (estimateData.taxRate || 0) / 100;
  const total = subtotal + taxAmount;

  const isComplete = clientData.name && clientData.email && estimateData.projectType && (materials.length > 0 || labor.length > 0);

  return (
    <div className="space-y-6">
      {/* Review Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Estimate Review
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Client Information Review */}
          <div>
            <h3 className="font-medium mb-3 flex items-center gap-2">
              <User className="h-4 w-4" />
              Client Information
            </h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Name</p>
                  <p className="font-medium">{clientData.name || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="font-medium">{clientData.email || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Phone</p>
                  <p className="font-medium">{clientData.phone || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Company</p>
                  <p className="font-medium">{clientData.company || 'Not provided'}</p>
                </div>
              </div>
              {clientData.address && (
                <div className="mt-3 pt-3 border-t">
                  <p className="text-sm text-gray-600 flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    Project Address
                  </p>
                  <p className="font-medium">{clientData.address}</p>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Project Details Review */}
          <div>
            <h3 className="font-medium mb-3 flex items-center gap-2">
              <Building className="h-4 w-4" />
              Project Details
            </h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-600">Project Type</p>
                  <p className="font-medium">{estimateData.projectType || 'Not specified'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Subtype</p>
                  <p className="font-medium">{estimateData.projectSubtype || 'Not specified'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Timeline</p>
                  <p className="font-medium">{estimateData.timeline || 'Not specified'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Valid Until</p>
                  <p className="font-medium">{estimateData.validUntil || 'Not set'}</p>
                </div>
              </div>
              {estimateData.scope && (
                <div className="pt-3 border-t">
                  <p className="text-sm text-gray-600 mb-2">Project Scope</p>
                  <p className="text-sm leading-relaxed">{estimateData.scope}</p>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Materials Review */}
          {materials.length > 0 && (
            <div>
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <span>Materials</span>
                <Badge variant="secondary">{materials.length} items</Badge>
              </h3>
              <div className="space-y-2">
                {materials.map((material) => (
                  <div key={material.id} className="bg-gray-50 p-3 rounded">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-sm">{material.name}</p>
                        <p className="text-xs text-gray-600">{material.description}</p>
                        <p className="text-xs text-gray-500">
                          {material.quantity} {material.unit} × ${material.price.toFixed(2)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">${material.total.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Labor Review */}
          {labor.length > 0 && (
            <div>
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <span>Labor</span>
                <Badge variant="secondary">{labor.length} items</Badge>
              </h3>
              <div className="space-y-2">
                {labor.map((laborItem) => (
                  <div key={laborItem.id} className="bg-gray-50 p-3 rounded">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-sm">{laborItem.description}</p>
                        <p className="text-xs text-gray-500">
                          {laborItem.hours} hours × ${laborItem.rate.toFixed(2)}/hour
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">${laborItem.total.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* Cost Summary */}
          <div>
            <h3 className="font-medium mb-3 flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Cost Summary
            </h3>
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Materials Total:</span>
                  <span className="font-medium">${materialsTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Labor Total:</span>
                  <span className="font-medium">${laborTotal.toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="font-medium">${subtotal.toFixed(2)}</span>
                </div>
                {taxAmount > 0 && (
                  <div className="flex justify-between">
                    <span>Tax ({estimateData.taxRate}%):</span>
                    <span className="font-medium">${taxAmount.toFixed(2)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between text-xl font-bold">
                  <span>Total:</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <Button
              variant="outline"
              onClick={onPreview}
              disabled={isLoading || !isComplete}
              className="flex items-center gap-2"
            >
              <Eye className="h-4 w-4" />
              Preview Estimate
            </Button>
            
            <Button
              variant="outline"
              onClick={onDownload}
              disabled={isLoading || !isComplete}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Download PDF
            </Button>
            
            <Button
              variant="outline"
              onClick={onSave}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <Check className="h-4 w-4" />
              Save Draft
            </Button>
            
            <Button
              onClick={onSend}
              disabled={isLoading || !isComplete}
              className="flex items-center gap-2"
            >
              <Send className="h-4 w-4" />
              {isLoading ? 'Sending...' : 'Send to Client'}
            </Button>
          </div>
          
          {!isComplete && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> Please complete all required fields (client information, project type, and at least one material or labor item) before sending the estimate.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
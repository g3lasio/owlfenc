import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  User, 
  Building, 
  Wrench, 
  FileText, 
  Check, 
  AlertCircle,
  DollarSign
} from "lucide-react";

interface EstimateSidebarProps {
  currentStep: string;
  setCurrentStep: (step: string) => void;
  clientData: any;
  estimateData: any;
  materials: any[];
  labor: any[];
}

export function EstimateSidebar({
  currentStep,
  setCurrentStep,
  clientData,
  estimateData,
  materials,
  labor
}: EstimateSidebarProps) {
  
  const steps = [
    {
      id: 'client',
      title: 'Client Information',
      icon: User,
      isComplete: clientData.name && clientData.email,
      isActive: currentStep === 'client'
    },
    {
      id: 'project',
      title: 'Project Details',
      icon: Building,
      isComplete: estimateData.projectType && estimateData.scope,
      isActive: currentStep === 'project'
    },
    {
      id: 'materials',
      title: 'Materials & Costs',
      icon: Wrench,
      isComplete: materials.length > 0 || labor.length > 0,
      isActive: currentStep === 'materials'
    },
    {
      id: 'review',
      title: 'Review & Send',
      icon: FileText,
      isComplete: false,
      isActive: currentStep === 'review'
    }
  ];

  const materialsTotal = materials.reduce((sum, material) => sum + material.total, 0);
  const laborTotal = labor.reduce((sum, laborItem) => sum + laborItem.total, 0);
  const subtotal = materialsTotal + laborTotal;
  const taxAmount = subtotal * (estimateData.taxRate || 0) / 100;
  const total = subtotal + taxAmount;

  return (
    <div className="w-80 bg-white border-r border-gray-200 p-6 overflow-y-auto">
      <div className="mb-8">
        <h2 className="text-xl font-bold text-gray-800 mb-2">
          Create Estimate
        </h2>
        <p className="text-sm text-gray-600">
          {estimateData.estimateNumber || 'New Estimate'}
        </p>
      </div>

      {/* Progress Steps */}
      <div className="space-y-2 mb-8">
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <div key={step.id}>
              <Button
                variant={step.isActive ? "default" : "ghost"}
                className={`w-full justify-start p-4 h-auto ${
                  step.isActive ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'
                }`}
                onClick={() => setCurrentStep(step.id)}
              >
                <div className="flex items-center space-x-3 w-full">
                  <div className="flex-shrink-0">
                    {step.isComplete ? (
                      <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                        <Check className="h-4 w-4 text-white" />
                      </div>
                    ) : step.isActive ? (
                      <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                        <Icon className="h-4 w-4 text-white" />
                      </div>
                    ) : (
                      <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center">
                        <Icon className="h-4 w-4 text-gray-600" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-medium text-sm">
                      {step.title}
                    </div>
                    {step.isActive && (
                      <div className="text-xs opacity-80">
                        Current step
                      </div>
                    )}
                  </div>
                </div>
              </Button>
            </div>
          );
        })}
      </div>

      <Separator className="my-6" />

      {/* Quick Summary */}
      <div className="space-y-4">
        <h3 className="font-medium text-gray-800">Quick Summary</h3>
        
        {/* Client Info */}
        <div className="bg-gray-50 p-3 rounded-lg">
          <h4 className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-2">
            Client
          </h4>
          {clientData.name ? (
            <div>
              <p className="font-medium text-sm">{clientData.name}</p>
              <p className="text-xs text-gray-600">{clientData.email}</p>
              {clientData.company && (
                <p className="text-xs text-gray-500">{clientData.company}</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-500 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              No client selected
            </p>
          )}
        </div>

        {/* Project Info */}
        <div className="bg-gray-50 p-3 rounded-lg">
          <h4 className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-2">
            Project
          </h4>
          {estimateData.projectType ? (
            <div>
              <p className="font-medium text-sm">{estimateData.projectType}</p>
              {estimateData.projectSubtype && (
                <p className="text-xs text-gray-600">{estimateData.projectSubtype}</p>
              )}
              {estimateData.timeline && (
                <p className="text-xs text-gray-500">Timeline: {estimateData.timeline}</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-500 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              No project details
            </p>
          )}
        </div>

        {/* Cost Summary */}
        <div className="bg-blue-50 p-3 rounded-lg">
          <h4 className="text-xs font-medium text-blue-600 uppercase tracking-wide mb-2 flex items-center gap-1">
            <DollarSign className="h-3 w-3" />
            Cost Summary
          </h4>
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span>Materials:</span>
              <span>${materialsTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Labor:</span>
              <span>${laborTotal.toFixed(2)}</span>
            </div>
            {taxAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span>Tax:</span>
                <span>${taxAmount.toFixed(2)}</span>
              </div>
            )}
            <Separator className="my-2" />
            <div className="flex justify-between font-medium">
              <span>Total:</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Progress Indicators */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Materials</span>
            <Badge variant={materials.length > 0 ? "default" : "secondary"}>
              {materials.length} items
            </Badge>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span>Labor Items</span>
            <Badge variant={labor.length > 0 ? "default" : "secondary"}>
              {labor.length} items
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
}
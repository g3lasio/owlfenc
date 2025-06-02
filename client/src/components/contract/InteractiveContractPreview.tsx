import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Edit3, 
  Save, 
  X, 
  Calendar, 
  DollarSign, 
  MapPin, 
  Mail, 
  Phone, 
  Building,
  Clock,
  Shield,
  FileText,
  CheckCircle,
  Plus,
  Trash2
} from 'lucide-react';

interface ContractData {
  missingFields: string[];
  clientName: string;
  clientAddress: string;
  clientEmail: string;
  clientPhone: string;
  projectType: string;
  projectDescription: string;
  projectLocation: string;
  contractorName: string;
  contractorAddress?: string;
  contractorEmail?: string;
  contractorPhone?: string;
  contractorLicense?: string;
  totalAmount: string;
  startDate: string;
  completionDate: string;
  paymentSchedule?: Array<{description: string; amount: string; dueDate?: string}>;
  paymentTerms: string;
  warrantyPeriod: string;
  warrantyTerms: string;
  insuranceInfo: string;
  protectiveClause?: string[];
}

interface EditableFieldProps {
  label: string;
  value: string;
  onSave: (newValue: string) => void;
  multiline?: boolean;
  icon?: React.ReactNode;
  type?: 'text' | 'email' | 'tel' | 'date';
}

const EditableField: React.FC<EditableFieldProps> = ({ 
  label, 
  value, 
  onSave, 
  multiline = false, 
  icon,
  type = 'text'
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);

  const handleSave = () => {
    onSave(editValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-200 flex items-center gap-2">
          {icon}
          {label}
        </label>
        <div className="flex gap-2">
          {multiline ? (
            <Textarea
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="flex-1 bg-gray-800 border-gray-600 text-white"
              rows={3}
            />
          ) : (
            <Input
              type={type}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="flex-1 bg-gray-800 border-gray-600 text-white"
            />
          )}
          <Button size="sm" onClick={handleSave} className="bg-green-600 hover:bg-green-700">
            <Save className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={handleCancel}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="group">
      <label className="text-sm font-medium text-gray-200 flex items-center gap-2 mb-1">
        {icon}
        {label}
      </label>
      <div className="flex items-center gap-2">
        <span className="text-gray-200 flex-1 break-words">{value || 'No especificado'}</span>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setIsEditing(true)}
          className="opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Edit3 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

interface PaymentScheduleEditorProps {
  schedule: Array<{description: string; amount: string; dueDate?: string; percentage?: string}>;
  onUpdate: (newSchedule: Array<{description: string; amount: string; dueDate?: string; percentage?: string}>) => void;
  totalAmount: string;
}

const PaymentScheduleEditor: React.FC<PaymentScheduleEditorProps> = ({ schedule, onUpdate, totalAmount }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editSchedule, setEditSchedule] = useState(schedule);

  // Calcular el monto total limpio para cálculos de porcentajes
  const getTotalValue = () => {
    const cleanAmount = totalAmount.replace(/[^0-9.]/g, '');
    return parseFloat(cleanAmount) || 0;
  };

  const addPayment = () => {
    setEditSchedule([...editSchedule, { 
      description: '', 
      amount: '', 
      dueDate: '',
      percentage: ''
    }]);
  };

  const removePayment = (index: number) => {
    setEditSchedule(editSchedule.filter((_, i) => i !== index));
  };

  const updatePayment = (index: number, field: string, value: string) => {
    const updated = [...editSchedule];
    const payment = { ...updated[index] };
    
    if (field === 'percentage') {
      payment.percentage = value;
      // Calcular automáticamente el monto basado en el porcentaje
      const percentage = parseFloat(value) || 0;
      const totalValue = getTotalValue();
      const calculatedAmount = (totalValue * percentage / 100).toFixed(2);
      payment.amount = `$${calculatedAmount}`;
    } else if (field === 'amount') {
      payment.amount = value;
      // Calcular automáticamente el porcentaje basado en el monto
      const cleanAmount = value.replace(/[^0-9.]/g, '');
      const amountValue = parseFloat(cleanAmount) || 0;
      const totalValue = getTotalValue();
      const calculatedPercentage = totalValue > 0 ? ((amountValue / totalValue) * 100).toFixed(1) : '0';
      payment.percentage = calculatedPercentage;
    } else {
      payment[field] = value;
    }
    
    updated[index] = payment;
    setEditSchedule(updated);
  };

  const handleSave = () => {
    const validPayments = editSchedule.filter(p => p.description && (p.amount || p.percentage));
    onUpdate(validPayments);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditSchedule(schedule);
    setIsEditing(false);
  };

  // Crear plantillas rápidas de payment schedule
  const createQuickSchedule = (type: 'upfront-balance' | 'thirds' | 'milestone') => {
    let newSchedule = [];
    
    switch (type) {
      case 'upfront-balance':
        newSchedule = [
          { description: 'Down Payment (50%)', percentage: '50', amount: '', dueDate: '' },
          { description: 'Final Payment (50%)', percentage: '50', amount: '', dueDate: '' }
        ];
        break;
      case 'thirds':
        newSchedule = [
          { description: 'Initial Payment (33%)', percentage: '33.33', amount: '', dueDate: '' },
          { description: 'Progress Payment (33%)', percentage: '33.33', amount: '', dueDate: '' },
          { description: 'Final Payment (34%)', percentage: '33.34', amount: '', dueDate: '' }
        ];
        break;
      case 'milestone':
        newSchedule = [
          { description: 'Contract Signing (25%)', percentage: '25', amount: '', dueDate: '' },
          { description: 'Material Delivery (25%)', percentage: '25', amount: '', dueDate: '' },
          { description: 'Project 50% Complete (25%)', percentage: '25', amount: '', dueDate: '' },
          { description: 'Project Completion (25%)', percentage: '25', amount: '', dueDate: '' }
        ];
        break;
    }
    
    // Calcular los montos automáticamente
    const totalValue = getTotalValue();
    newSchedule = newSchedule.map(payment => ({
      ...payment,
      amount: `$${(totalValue * parseFloat(payment.percentage) / 100).toFixed(2)}`
    }));
    
    setEditSchedule(newSchedule);
  };

  if (isEditing) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h5 className="font-semibold text-yellow-300">Edit Payment Schedule</h5>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} className="bg-green-600 hover:bg-green-700">
              <Save className="h-4 w-4 mr-1" />
              Save
            </Button>
            <Button size="sm" variant="outline" onClick={handleCancel}>
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
          </div>
        </div>

        {/* Quick Schedule Templates */}
        <div className="bg-gray-800 p-3 rounded border border-yellow-500">
          <h6 className="text-sm font-medium text-yellow-300 mb-2">Quick Templates:</h6>
          <div className="flex gap-2 flex-wrap">
            <Button
              size="sm"
              variant="outline"
              onClick={() => createQuickSchedule('upfront-balance')}
              className="text-xs"
            >
              50/50 Split
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => createQuickSchedule('thirds')}
              className="text-xs"
            >
              Three Payments
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => createQuickSchedule('milestone')}
              className="text-xs"
            >
              Milestone Schedule
            </Button>
          </div>
        </div>
        
        <div className="space-y-3">
          <div className="grid grid-cols-12 gap-2 text-xs text-gray-400 mb-2">
            <div className="col-span-4">Description</div>
            <div className="col-span-2">Percentage</div>
            <div className="col-span-3">Amount</div>
            <div className="col-span-2">Due Date</div>
            <div className="col-span-1">Actions</div>
          </div>
          
          {editSchedule.map((payment, index) => (
            <div key={index} className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-4">
                <Input
                  placeholder="Payment description"
                  value={payment.description}
                  onChange={(e) => updatePayment(index, 'description', e.target.value)}
                  className="bg-gray-800 border-gray-600 text-white text-sm"
                />
              </div>
              <div className="col-span-2">
                <div className="relative">
                  <Input
                    placeholder="25"
                    value={payment.percentage || ''}
                    onChange={(e) => updatePayment(index, 'percentage', e.target.value)}
                    className="bg-gray-800 border-gray-600 text-white text-sm pr-6"
                  />
                  <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs">%</span>
                </div>
              </div>
              <div className="col-span-3">
                <Input
                  placeholder="$1,000.00"
                  value={payment.amount}
                  onChange={(e) => updatePayment(index, 'amount', e.target.value)}
                  className="bg-gray-800 border-gray-600 text-white text-sm"
                />
              </div>
              <div className="col-span-2">
                <Input
                  type="date"
                  value={payment.dueDate || ''}
                  onChange={(e) => updatePayment(index, 'dueDate', e.target.value)}
                  className="bg-gray-800 border-gray-600 text-white text-sm"
                />
              </div>
              <div className="col-span-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => removePayment(index)}
                  className="text-red-400 hover:text-red-300 p-1 h-8 w-8"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
        
        <Button size="sm" onClick={addPayment} variant="outline" className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Add Payment
        </Button>

        {/* Total Verification */}
        <div className="bg-gray-800 p-3 rounded border border-cyan-500">
          <div className="text-sm">
            <span className="text-gray-400">Total Scheduled: </span>
            <span className="text-white font-medium">
              ${editSchedule.reduce((sum, payment) => {
                const amount = parseFloat(payment.amount?.replace(/[^0-9.]/g, '') || '0');
                return sum + amount;
              }, 0).toFixed(2)}
            </span>
            <span className="text-gray-400 ml-4">Contract Total: </span>
            <span className="text-yellow-300 font-medium">{totalAmount}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="group">
      <div className="flex items-center justify-between mb-3">
        <h5 className="font-semibold text-yellow-300">Payment Schedule:</h5>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setIsEditing(true)}
          className="opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Edit3 className="h-4 w-4" />
        </Button>
      </div>
      <div className="space-y-2">
        {schedule.map((payment, index) => (
          <div key={index} className="flex justify-between items-center p-3 bg-gray-800 rounded text-sm border border-cyan-500">
            <div className="flex-1">
              <span className="break-words text-gray-200 font-medium">{payment.description}</span>
              {payment.percentage && (
                <span className="text-xs text-cyan-400 ml-2">({payment.percentage}%)</span>
              )}
            </div>
            <div className="text-right ml-4">
              <span className="font-medium text-white block">{payment.amount}</span>
              {payment.dueDate && (
                <span className="text-xs text-gray-400">{new Date(payment.dueDate).toLocaleDateString()}</span>
              )}
            </div>
          </div>
        ))}
        {schedule.length === 0 && (
          <div className="text-center p-4 text-gray-400 text-sm">
            No payment schedule configured. Click edit to add payment milestones.
          </div>
        )}
      </div>
    </div>
  );
};

interface InteractiveContractPreviewProps {
  contractData: ContractData;
  selectedClauses: string[];
  onDataUpdate: (updatedData: ContractData) => void;
  onProceedToGeneration: () => void;
  onGoBack: () => void;
}

export const InteractiveContractPreview: React.FC<InteractiveContractPreviewProps> = ({
  contractData,
  selectedClauses,
  onDataUpdate,
  onProceedToGeneration,
  onGoBack
}) => {
  const updateField = (field: keyof ContractData, value: any) => {
    const updatedData = { ...contractData, [field]: value };
    onDataUpdate(updatedData);
  };

  const today = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-black border border-cyan-400 cyberpunk-corner-frame">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent flex items-center justify-center gap-3">
            <img 
              src="https://ik.imagekit.io/lp5czyx2a/logo%20mervin.png?updatedAt=1748883786155" 
              alt="Mervin AI" 
              className="h-8 w-8 object-contain"
            />
            PROFESSIONAL CONTRACTOR AGREEMENT
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Contract Sections */}
      <div className="space-y-4">
        {/* Página 1: Partes Contratantes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Building className="h-5 w-5 text-blue-600" />
              Contracting Parties
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-black p-4 rounded-lg cyberpunk-corner-frame border border-blue-500 space-y-3">
                <h5 className="font-semibold text-blue-300 mb-3">CLIENT (Property Owner)</h5>
                <EditableField
                  label="Name"
                  value={contractData.clientName}
                  onSave={(value) => updateField('clientName', value)}
                  icon={<Building className="h-4 w-4" />}
                />
                <EditableField
                  label="Address"
                  value={contractData.clientAddress}
                  onSave={(value) => updateField('clientAddress', value)}
                  multiline
                  icon={<MapPin className="h-4 w-4" />}
                />
                <EditableField
                  label="Email"
                  value={contractData.clientEmail}
                  onSave={(value) => updateField('clientEmail', value)}
                  type="email"
                  icon={<Mail className="h-4 w-4" />}
                />
                <EditableField
                  label="Phone"
                  value={contractData.clientPhone}
                  onSave={(value) => updateField('clientPhone', value)}
                  type="tel"
                  icon={<Phone className="h-4 w-4" />}
                />
              </div>
              
              <div className="bg-black p-4 rounded-lg cyberpunk-corner-frame border border-green-500 space-y-3">
                <h5 className="font-semibold text-green-300 mb-3">CONTRACTOR (Service Provider)</h5>
                <EditableField
                  label="Company Name"
                  value={contractData.contractorName}
                  onSave={(value) => updateField('contractorName', value)}
                  icon={<Building className="h-4 w-4" />}
                />
                <EditableField
                  label="Address"
                  value={contractData.contractorAddress || ''}
                  onSave={(value) => updateField('contractorAddress', value)}
                  multiline
                  icon={<MapPin className="h-4 w-4" />}
                />
                <EditableField
                  label="Email"
                  value={contractData.contractorEmail || ''}
                  onSave={(value) => updateField('contractorEmail', value)}
                  type="email"
                  icon={<Mail className="h-4 w-4" />}
                />
                <EditableField
                  label="Phone"
                  value={contractData.contractorPhone || ''}
                  onSave={(value) => updateField('contractorPhone', value)}
                  type="tel"
                  icon={<Phone className="h-4 w-4" />}
                />
                <EditableField
                  label="License Number"
                  value={contractData.contractorLicense || ''}
                  onSave={(value) => updateField('contractorLicense', value)}
                  icon={<Shield className="h-4 w-4" />}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Página 2: Detalles del Proyecto */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-green-600" />
              Project Details & Scope
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-black p-4 rounded-lg cyberpunk-corner-frame border border-green-500 space-y-3">
              <EditableField
                label="Project Type"
                value={contractData.projectType}
                onSave={(value) => updateField('projectType', value)}
                icon={<FileText className="h-4 w-4" />}
              />
              <EditableField
                label="Project Description"
                value={contractData.projectDescription}
                onSave={(value) => updateField('projectDescription', value)}
                multiline
                icon={<FileText className="h-4 w-4" />}
              />
              <EditableField
                label="Project Location"
                value={contractData.projectLocation}
                onSave={(value) => updateField('projectLocation', value)}
                multiline
                icon={<MapPin className="h-4 w-4" />}
              />
            </div>
          </CardContent>
        </Card>

        {/* Página 3: Cronograma */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-600" />
              Project Timeline & Deadlines
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-black p-4 rounded-lg cyberpunk-corner-frame border border-orange-500">
                <EditableField
                  label="Commencement Date"
                  value={contractData.startDate}
                  onSave={(value) => updateField('startDate', value)}
                  type="date"
                  icon={<Calendar className="h-4 w-4" />}
                />
              </div>
              <div className="bg-black p-4 rounded-lg cyberpunk-corner-frame border border-orange-500">
                <EditableField
                  label="Completion Date"
                  value={contractData.completionDate}
                  onSave={(value) => updateField('completionDate', value)}
                  type="date"
                  icon={<Calendar className="h-4 w-4" />}
                />
              </div>
            </div>
            
            <div className="bg-black p-4 rounded-lg cyberpunk-corner-frame border border-orange-500">
              <h5 className="font-semibold text-orange-300 mb-2">Time is of the Essence</h5>
              <p className="text-sm text-gray-200">
                Performance within specified timeframes is material to this agreement. Extensions require written consent with cause.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Página 4: Compensación y Pagos */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-yellow-600" />
              Compensation & Payment Structure
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-black p-4 rounded-lg cyberpunk-corner-frame border border-yellow-500 space-y-3">
              <EditableField
                label="Total Contract Amount"
                value={contractData.totalAmount}
                onSave={(value) => updateField('totalAmount', value)}
                icon={<DollarSign className="h-4 w-4" />}
              />
              <EditableField
                label="Payment Terms"
                value={contractData.paymentTerms}
                onSave={(value) => updateField('paymentTerms', value)}
                multiline
                icon={<DollarSign className="h-4 w-4" />}
              />
            </div>

            <div className="bg-black p-4 rounded-lg cyberpunk-corner-frame border border-yellow-500">
              <PaymentScheduleEditor
                schedule={contractData.paymentSchedule || []}
                totalAmount={contractData.totalAmount}
                onUpdate={(newSchedule) => updateField('paymentSchedule', newSchedule)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Página 5: Seguros y Garantías */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="h-5 w-5 text-purple-600" />
              Insurance, Warranties & Legal Protections
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-black p-4 rounded-lg cyberpunk-corner-frame border border-purple-500 space-y-3">
              <EditableField
                label="Insurance Requirements"
                value={contractData.insuranceInfo}
                onSave={(value) => updateField('insuranceInfo', value)}
                multiline
                icon={<Shield className="h-4 w-4" />}
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-black p-4 rounded-lg cyberpunk-corner-frame border border-green-500">
                <EditableField
                  label="Warranty Period"
                  value={contractData.warrantyPeriod}
                  onSave={(value) => updateField('warrantyPeriod', value)}
                  icon={<Shield className="h-4 w-4" />}
                />
              </div>
              <div className="bg-black p-4 rounded-lg cyberpunk-corner-frame border border-green-500">
                <EditableField
                  label="Warranty Terms"
                  value={contractData.warrantyTerms}
                  onSave={(value) => updateField('warrantyTerms', value)}
                  multiline
                  icon={<Shield className="h-4 w-4" />}
                />
              </div>
            </div>

            <div className="bg-black p-4 rounded-lg cyberpunk-corner-frame border border-indigo-500">
              <h5 className="font-semibold text-indigo-300 mb-3">Selected Legal Protections ({selectedClauses.length} clauses):</h5>
              <div className="space-y-2">
                {selectedClauses.map((clause, index) => (
                  <div key={index} className="flex items-start gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="break-words text-gray-200">{clause}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Página 6: Firmas */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-indigo-600" />
              Contract Execution & Signatures
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center mb-6">
              <p className="text-sm text-gray-600">
                Contract Date: {today}
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-black border-2 border-dashed border-blue-400 p-6 rounded-lg text-center cyberpunk-corner-frame">
                <h5 className="font-semibold mb-4 text-white">CLIENT SIGNATURE</h5>
                <div className="space-y-3">
                  <div className="border-b border-gray-400 pb-2 mb-4">
                    <p className="text-sm text-gray-400">Signature</p>
                  </div>
                  <p className="font-medium break-words text-white">{contractData.clientName}</p>
                  <p className="text-sm text-gray-400">Property Owner</p>
                  <div className="border-b border-gray-400 pb-2 mt-4">
                    <p className="text-sm text-gray-400">Date</p>
                  </div>
                </div>
              </div>

              <div className="bg-black border-2 border-dashed border-cyan-400 p-6 rounded-lg text-center cyberpunk-corner-frame">
                <h5 className="font-semibold mb-4 text-white">CONTRACTOR SIGNATURE</h5>
                <div className="space-y-3">
                  <div className="border-b border-gray-400 pb-2 mb-4">
                    <p className="text-sm text-gray-400">Signature</p>
                  </div>
                  <p className="font-medium break-words text-white">{contractData.contractorName}</p>
                  <p className="text-sm text-gray-400">Licensed Contractor</p>
                  <div className="border-b border-gray-400 pb-2 mt-4">
                    <p className="text-sm text-gray-400">Date</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4 pt-6 border-t">
        <Button 
          variant="outline" 
          onClick={onGoBack}
          className="flex-1"
        >
          Back to Legal Review
        </Button>
        <Button 
          onClick={onProceedToGeneration}
          className="flex-1 bg-green-600 hover:bg-green-700 text-white"
        >
          <FileText className="h-4 w-4 mr-2" />
          Generate Final PDF Contract
        </Button>
      </div>
    </div>
  );
};
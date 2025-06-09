import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  ArrowLeft,
  User,
  Building,
  FileText,
  DollarSign
} from 'lucide-react';
import { deepSearchDefenseEngine } from '@/services/deepSearchDefenseEngine';
import type { DefenseClause, DefenseAnalysisResult } from '@/services/deepSearchDefenseEngine';

interface DefenseReviewPanelProps {
  projectData: any;
  onDefenseComplete: (approvedClauses: DefenseClause[], customizations: Record<string, any>) => void;
  onGoBack: () => void;
}

export function DefenseReviewPanel({ projectData, onDefenseComplete, onGoBack }: DefenseReviewPanelProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [analysisResult, setAnalysisResult] = useState<DefenseAnalysisResult | null>(null);
  const [selectedClauses, setSelectedClauses] = useState<Set<string>>(new Set());

  useEffect(() => {
    const runAnalysis = async () => {
      try {
        setIsAnalyzing(true);
        const result = await deepSearchDefenseEngine.analyzeContract(projectData);
        setAnalysisResult(result);
        
        // Auto-select mandatory clauses
        const mandatoryClauses = result.recommendedClauses
          .filter(clause => clause.applicability.mandatory)
          .map(clause => clause.id);
        setSelectedClauses(new Set(mandatoryClauses));
      } catch (error) {
        console.error('Error in defense analysis:', error);
      } finally {
        setIsAnalyzing(false);
      }
    };

    runAnalysis();
  }, [projectData]);

  const toggleClause = (clauseId: string) => {
    const newSelected = new Set(selectedClauses);
    if (newSelected.has(clauseId)) {
      newSelected.delete(clauseId);
    } else {
      newSelected.add(clauseId);
    }
    setSelectedClauses(newSelected);
  };

  const handleComplete = () => {
    if (!analysisResult) return;
    
    const approvedClauses = analysisResult.recommendedClauses.filter(
      clause => selectedClauses.has(clause.id)
    );
    
    onDefenseComplete(approvedClauses, {});
  };

  if (isAnalyzing) {
    return (
      <Card className="border-2 border-blue-400 bg-black/80 relative overflow-hidden mt-6">
        <CardHeader className="text-center px-4 md:px-6">
          <div className="flex items-center justify-center mb-4">
            <div className="p-3 md:p-4 rounded-full border-2 border-blue-400">
              <Shield className="h-6 w-6 md:h-8 md:w-8 text-blue-400 animate-pulse" />
            </div>
          </div>
          <CardTitle className="text-xl md:text-2xl font-bold text-blue-400 mb-2">
            Contract Review
          </CardTitle>
          <p className="text-gray-300 text-xs md:text-sm leading-relaxed">
            Preparing contract data and clause review...
          </p>
        </CardHeader>
        <CardContent className="px-4 md:px-8 pb-6 md:pb-8">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!analysisResult) {
    return (
      <Alert className="border-red-400 bg-red-900/20">
        <AlertTriangle className="h-4 w-4 text-red-400" />
        <AlertDescription className="text-red-300">
          Error analyzing contract. Please try again.
        </AlertDescription>
      </Alert>
    );
  }

  const mandatoryClauses = analysisResult.recommendedClauses.filter(clause => clause.applicability.mandatory);
  const optionalClauses = analysisResult.recommendedClauses.filter(clause => !clause.applicability.mandatory);

  return (
    <Card className="border-2 border-green-400 bg-black/80 relative overflow-hidden mt-6">
      <CardHeader className="text-center px-4 md:px-6">
        <div className="flex items-center justify-center mb-4">
          <div className="p-3 md:p-4 rounded-full border-2 border-green-400">
            <Shield className="h-6 w-6 md:h-8 md:w-8 text-green-400" />
          </div>
        </div>
        <CardTitle className="text-xl md:text-2xl font-bold text-green-400 mb-2">
          Contract Review
        </CardTitle>
        <p className="text-gray-300 text-xs md:text-sm leading-relaxed">
          Review contract information and select legal clauses. Mandatory clauses are pre-selected.
        </p>
      </CardHeader>

      <CardContent className="px-4 md:px-8 pb-6 md:pb-8 space-y-6">
        {/* Contract Data Review */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-blue-400 flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Contract Information
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Contractor Data */}
            <Card className="bg-gray-900/50 border-blue-400/30">
              <CardHeader>
                <CardTitle className="text-blue-400 text-sm flex items-center">
                  <Building className="h-4 w-4 mr-2" />
                  Contractor Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Name:</span>
                  <span className="text-white">{projectData.contractorName || 'Not specified'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Address:</span>
                  <span className="text-white text-right">{projectData.contractorAddress || 'Not specified'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Phone:</span>
                  <span className="text-white">{projectData.contractorPhone || 'Not specified'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Email:</span>
                  <span className="text-white">{projectData.contractorEmail || 'Not specified'}</span>
                </div>
              </CardContent>
            </Card>

            {/* Client Data */}
            <Card className="bg-gray-900/50 border-green-400/30">
              <CardHeader>
                <CardTitle className="text-green-400 text-sm flex items-center">
                  <User className="h-4 w-4 mr-2" />
                  Client Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Name:</span>
                  <span className="text-white">{projectData.clientName || 'Not specified'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Address:</span>
                  <span className="text-white text-right">{projectData.clientAddress || projectData.projectLocation || 'Not specified'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Phone:</span>
                  <span className="text-white">{projectData.clientPhone || 'Not specified'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Email:</span>
                  <span className="text-white">{projectData.clientEmail || 'Not specified'}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Project Details */}
          <Card className="bg-gray-900/50 border-purple-400/30">
            <CardHeader>
              <CardTitle className="text-purple-400 text-sm flex items-center">
                <DollarSign className="h-4 w-4 mr-2" />
                Project Details
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Type:</span>
                <span className="text-white">{projectData.projectType || 'Not specified'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Amount:</span>
                <span className="text-white">${projectData.totalAmount?.toLocaleString() || '0.00'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Description:</span>
                <span className="text-white text-right">{projectData.projectDescription || 'Not specified'}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Mandatory Clauses */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-red-400 flex items-center">
            <Shield className="h-5 w-5 mr-2" />
            Mandatory Legal Clauses
          </h3>
          <p className="text-gray-400 text-sm">Required by law - cannot be removed</p>
          
          <div className="space-y-3">
            {mandatoryClauses.map((clause) => (
              <Card key={clause.id} className="bg-gray-900/50 border-red-400/30">
                <CardContent className="p-4">
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      checked={true}
                      disabled={true}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-white">{clause.subcategory}</div>
                      <div className="text-sm text-gray-400">{clause.rationale}</div>
                      <Badge variant="destructive" className="mt-1 text-xs">
                        REQUIRED
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Optional Clauses */}
        {optionalClauses.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-yellow-400 flex items-center">
              <CheckCircle className="h-5 w-5 mr-2" />
              Optional Legal Clauses
            </h3>
            <p className="text-gray-400 text-sm">AI-suggested clauses - select those you want to include</p>
            
            <div className="space-y-3">
              {optionalClauses.map((clause) => (
                <Card key={clause.id} className="bg-gray-900/50 border-yellow-400/30">
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      <Checkbox
                        checked={selectedClauses.has(clause.id)}
                        onCheckedChange={() => toggleClause(clause.id)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-white">{clause.subcategory}</div>
                        <div className="text-sm text-gray-400">{clause.rationale}</div>
                        <Badge variant="outline" className="mt-1 text-xs border-yellow-400 text-yellow-400">
                          OPTIONAL
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
          <Button 
            onClick={onGoBack}
            variant="outline"
            className="border-gray-600 text-gray-400 hover:border-gray-500 hover:text-gray-300"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Review
          </Button>
          <Button 
            onClick={handleComplete}
            className="bg-green-600 hover:bg-green-500 text-black font-bold py-3 px-8 rounded border-0 shadow-none"
            disabled={selectedClauses.size === 0}
          >
            Continue with Selected Clauses
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
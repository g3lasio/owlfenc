import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  ArrowLeft,
  FileText,
  DollarSign,
  Clock,
  Building
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
            Contract Defense Analysis
          </CardTitle>
          <p className="text-gray-300 text-xs md:text-sm leading-relaxed">
            Reviewing contract protection options and legal safeguards...
          </p>
        </CardHeader>
        <CardContent className="px-4 md:px-8 pb-6 md:pb-8">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto"></div>
            <Progress value={75} className="w-full [&>div]:bg-blue-400" />
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
          Error analyzing contract defense options. Please try again.
        </AlertDescription>
      </Alert>
    );
  }

  const essentialClauses = analysisResult.recommendedClauses.filter(
    clause => clause.category === 'Payment Protection' || 
              clause.category === 'Scope Protection' || 
              clause.category === 'Legal Compliance'
  );

  return (
    <Card className="border-2 border-green-400 bg-black/80 relative overflow-hidden mt-6">
      <CardHeader className="text-center px-4 md:px-6">
        <div className="flex items-center justify-center mb-4">
          <div className="p-3 md:p-4 rounded-full border-2 border-green-400">
            <Shield className="h-6 w-6 md:h-8 md:w-8 text-green-400" />
          </div>
        </div>
        <CardTitle className="text-xl md:text-2xl font-bold text-green-400 mb-2">
          Contract Protection Review
        </CardTitle>
        <p className="text-gray-300 text-xs md:text-sm leading-relaxed">
          Select protective clauses to include in your contract. Essential protections are pre-selected.
        </p>
      </CardHeader>

      <CardContent className="px-4 md:px-8 pb-6 md:pb-8 space-y-6">
        {/* Critical Warnings */}
        {analysisResult.criticalWarnings.length > 0 && (
          <Alert className="border-red-400 bg-red-900/20">
            <AlertTriangle className="h-4 w-4 text-red-400" />
            <AlertDescription>
              <div className="font-semibold text-red-300 mb-2">Important Considerations:</div>
              <ul className="space-y-1">
                {analysisResult.criticalWarnings.map((warning, index) => (
                  <li key={index} className="text-red-300 text-sm">
                    • {warning.message}
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Progress Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-gray-900/50 border-green-400/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-green-400">{essentialClauses.length}</div>
                  <div className="text-sm text-gray-400">Available Protections</div>
                </div>
                <Shield className="h-8 w-8 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 border-blue-400/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-blue-400">{selectedClauses.size}</div>
                  <div className="text-sm text-gray-400">Selected</div>
                </div>
                <CheckCircle className="h-8 w-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 border-purple-400/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-purple-400">{Math.round((selectedClauses.size / essentialClauses.length) * 100)}%</div>
                  <div className="text-sm text-gray-400">Coverage</div>
                </div>
                <Building className="h-8 w-8 text-purple-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Essential Protection Clauses */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-green-400 flex items-center">
            <Shield className="h-5 w-5 mr-2" />
            Essential Contract Protections
          </h3>
          
          {/* Payment Protection */}
          <Card className="bg-gray-900/50 border-cyan-400/30">
            <CardHeader>
              <CardTitle className="text-cyan-400 flex items-center">
                <DollarSign className="h-4 w-4 mr-2" />
                Payment Protection
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {essentialClauses
                .filter(clause => clause.category === 'Payment Protection')
                .map((clause) => (
                  <div key={clause.id} className="flex items-start space-x-3">
                    <Checkbox
                      checked={selectedClauses.has(clause.id)}
                      onCheckedChange={() => toggleClause(clause.id)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-white">{clause.subcategory}</div>
                      <div className="text-sm text-gray-400">{clause.rationale}</div>
                      {clause.applicability.mandatory && (
                        <Badge variant="destructive" className="mt-1 text-xs">
                          REQUIRED
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
            </CardContent>
          </Card>

          {/* Scope Protection */}
          <Card className="bg-gray-900/50 border-green-400/30">
            <CardHeader>
              <CardTitle className="text-green-400 flex items-center">
                <FileText className="h-4 w-4 mr-2" />
                Scope Protection
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {essentialClauses
                .filter(clause => clause.category === 'Scope Protection')
                .map((clause) => (
                  <div key={clause.id} className="flex items-start space-x-3">
                    <Checkbox
                      checked={selectedClauses.has(clause.id)}
                      onCheckedChange={() => toggleClause(clause.id)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-white">{clause.subcategory}</div>
                      <div className="text-sm text-gray-400">{clause.rationale}</div>
                      {clause.applicability.mandatory && (
                        <Badge variant="destructive" className="mt-1 text-xs">
                          REQUIRED
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
            </CardContent>
          </Card>

          {/* Legal Compliance */}
          <Card className="bg-gray-900/50 border-yellow-400/30">
            <CardHeader>
              <CardTitle className="text-yellow-400 flex items-center">
                <Building className="h-4 w-4 mr-2" />
                Legal Compliance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {essentialClauses
                .filter(clause => clause.category === 'Legal Compliance')
                .map((clause) => (
                  <div key={clause.id} className="flex items-start space-x-3">
                    <Checkbox
                      checked={selectedClauses.has(clause.id)}
                      onCheckedChange={() => toggleClause(clause.id)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-white">{clause.subcategory}</div>
                      <div className="text-sm text-gray-400">{clause.rationale}</div>
                      {clause.applicability.mandatory && (
                        <Badge variant="destructive" className="mt-1 text-xs">
                          REQUIRED
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
          <Button 
            onClick={onGoBack}
            variant="outline"
            className="border-gray-600 text-gray-400 hover:border-gray-500 hover:text-gray-300"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            BACK TO REVIEW
          </Button>
          <Button 
            onClick={handleComplete}
            className="bg-green-600 hover:bg-green-500 text-black font-bold py-3 px-8 rounded border-0 shadow-none"
            disabled={selectedClauses.size === 0}
          >
            APPLY SELECTED PROTECTIONS
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
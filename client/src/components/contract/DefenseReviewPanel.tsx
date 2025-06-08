/**
 * Defense Review & Correction Panel
 * 
 * Interfaz exhaustiva para revisar, personalizar y aprobar cláusulas defensivas
 * con trazabilidad legal completa y justificación normativa.
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Edit3,
  Eye,
  Scale,
  FileText,
  BookOpen,
  Gavel,
  ExternalLink,
  Info,
  AlertCircle,
  Zap,
  Lock,
  Target,
  TrendingUp,
  DollarSign,
  Clock,
  Users,
  Building
} from 'lucide-react';

import DeepSearchDefenseEngine, { 
  DefenseAnalysisResult, 
  DefenseClause, 
  RiskAssessment, 
  ComplianceRequirement 
} from '@/services/deepSearchDefenseEngine';

interface DefenseReviewPanelProps {
  projectData: any;
  onDefenseComplete: (approvedClauses: DefenseClause[], customizations: Record<string, any>) => void;
  onGoBack: () => void;
}

interface ClauseReviewState {
  clauseId: string;
  status: 'pending' | 'approved' | 'rejected' | 'modified';
  customizations: Record<string, any>;
  userNotes: string;
  selectedVersion: 'aggressive' | 'moderate' | 'minimal' | 'custom';
}

export const DefenseReviewPanel: React.FC<DefenseReviewPanelProps> = ({
  projectData,
  onDefenseComplete,
  onGoBack
}) => {
  const [defenseEngine] = useState(() => DeepSearchDefenseEngine.getInstance());
  const [analysisResult, setAnalysisResult] = useState<DefenseAnalysisResult | null>(null);
  const [clauseReviews, setClauseReviews] = useState<Map<string, ClauseReviewState>>(new Map());
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showLegalSources, setShowLegalSources] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [expandedClause, setExpandedClause] = useState<string | null>(null);

  useEffect(() => {
    performDefenseAnalysis();
  }, [projectData]);

  const performDefenseAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const result = await defenseEngine.analyzeContractDefense(projectData);
      setAnalysisResult(result);
      
      // Initialize clause review states
      const initialReviews = new Map<string, ClauseReviewState>();
      result.recommendedClauses.forEach(clause => {
        initialReviews.set(clause.id, {
          clauseId: clause.id,
          status: clause.applicability.mandatory ? 'approved' : 'pending',
          customizations: {},
          userNotes: '',
          selectedVersion: 'moderate'
        });
      });
      setClauseReviews(initialReviews);
    } catch (error) {
      console.error('Defense analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const updateClauseReview = (clauseId: string, updates: Partial<ClauseReviewState>) => {
    setClauseReviews(prev => {
      const newMap = new Map(prev);
      const current = newMap.get(clauseId) || {
        clauseId,
        status: 'pending',
        customizations: {},
        userNotes: '',
        selectedVersion: 'moderate'
      };
      newMap.set(clauseId, { ...current, ...updates });
      return newMap;
    });
  };

  const toggleClauseApproval = (clauseId: string) => {
    const current = clauseReviews.get(clauseId);
    if (!current) return;

    const newStatus = current.status === 'approved' ? 'pending' : 'approved';
    updateClauseReview(clauseId, { status: newStatus });
  };

  const rejectClause = (clauseId: string) => {
    updateClauseReview(clauseId, { status: 'rejected' });
  };

  const customizeClause = (clauseId: string, customizations: Record<string, any>) => {
    updateClauseReview(clauseId, { 
      status: 'modified', 
      customizations,
      selectedVersion: 'custom'
    });
  };

  const getClausesByCategory = () => {
    if (!analysisResult) return {};
    
    const categorized: Record<string, DefenseClause[]> = {};
    analysisResult.recommendedClauses.forEach(clause => {
      if (selectedCategory === 'all' || clause.category === selectedCategory) {
        if (!categorized[clause.category]) {
          categorized[clause.category] = [];
        }
        categorized[clause.category].push(clause);
      }
    });
    
    return categorized;
  };

  const getApprovalProgress = () => {
    if (!analysisResult) return { approved: 0, total: 0, percentage: 0 };
    
    const total = analysisResult.recommendedClauses.length;
    const approved = Array.from(clauseReviews.values()).filter(
      review => review.status === 'approved' || review.status === 'modified'
    ).length;
    
    return {
      approved,
      total,
      percentage: total > 0 ? Math.round((approved / total) * 100) : 0
    };
  };

  const handleDefenseComplete = () => {
    if (!analysisResult) return;

    const approvedClauses: DefenseClause[] = [];
    const customizations: Record<string, any> = {};

    analysisResult.recommendedClauses.forEach(clause => {
      const review = clauseReviews.get(clause.id);
      if (review && (review.status === 'approved' || review.status === 'modified')) {
        if (review.status === 'modified' && Object.keys(review.customizations).length > 0) {
          const customizedClause = defenseEngine.customizeClause(clause.id, review.customizations);
          if (customizedClause) {
            approvedClauses.push(customizedClause);
          }
        } else {
          approvedClauses.push(clause);
        }
        
        if (Object.keys(review.customizations).length > 0) {
          customizations[clause.id] = review.customizations;
        }
      }
    });

    onDefenseComplete(approvedClauses, customizations);
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'CRITICAL': return 'text-red-500 bg-red-500/10 border-red-500';
      case 'HIGH': return 'text-orange-500 bg-orange-500/10 border-orange-500';
      case 'MEDIUM': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500';
      case 'LOW': return 'text-green-500 bg-green-500/10 border-green-500';
      default: return 'text-gray-500 bg-gray-500/10 border-gray-500';
    }
  };

  const getRiskLevelIcon = (level: string) => {
    switch (level) {
      case 'CRITICAL': return <AlertTriangle className="h-4 w-4" />;
      case 'HIGH': return <AlertCircle className="h-4 w-4" />;
      case 'MEDIUM': return <Info className="h-4 w-4" />;
      case 'LOW': return <CheckCircle className="h-4 w-4" />;
      default: return <Info className="h-4 w-4" />;
    }
  };

  if (isAnalyzing) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <Shield className="h-6 w-6 animate-pulse text-blue-600" />
            DeepSearch Defense Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-muted-foreground">
              Ejecutando análisis exhaustivo de defensa contractual con trazabilidad legal completa...
            </p>
            <Progress value={75} className="w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!analysisResult) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Error en el análisis de defensa. Por favor, intente nuevamente.
        </AlertDescription>
      </Alert>
    );
  }

  const progress = getApprovalProgress();
  const categorizedClauses = getClausesByCategory();

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="h-8 w-8" />
              <div>
                <h1 className="text-2xl font-bold">DeepSearch Defense Legal</h1>
                <p className="text-blue-100">Revisión Exhaustiva & Corrección Contractual</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">{progress.percentage}%</div>
              <div className="text-sm text-blue-100">Completado</div>
            </div>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Critical Warnings */}
      {analysisResult.criticalWarnings.length > 0 && (
        <Alert className="border-red-500 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-500" />
          <AlertDescription>
            <div className="font-semibold text-red-700">Advertencias Críticas Detectadas:</div>
            <ul className="mt-2 space-y-1">
              {analysisResult.criticalWarnings.map((warning, index) => (
                <li key={index} className="text-red-600">
                  • {warning.message} - {warning.recommendation}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Analysis Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Riesgo Total</p>
                <p className="text-2xl font-bold text-red-600">{analysisResult.totalRiskScore}/100</p>
              </div>
              <Target className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Compliance</p>
                <p className="text-2xl font-bold text-green-600">{analysisResult.complianceScore}/100</p>
              </div>
              <Scale className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Defensa</p>
                <p className="text-2xl font-bold text-blue-600">{analysisResult.defenseStrength}/100</p>
              </div>
              <Shield className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Cláusulas</p>
                <p className="text-2xl font-bold text-purple-600">
                  {progress.approved}/{progress.total}
                </p>
              </div>
              <FileText className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Análisis General</TabsTrigger>
          <TabsTrigger value="clauses">Revisión de Cláusulas</TabsTrigger>
          <TabsTrigger value="risks">Evaluación de Riesgos</TabsTrigger>
          <TabsTrigger value="compliance">Compliance Legal</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Risk Assessments Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Evaluación de Riesgos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {analysisResult.riskAssessments.map((risk, index) => (
                  <div key={index} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold">{risk.category}</h4>
                      <Badge className={getRiskLevelColor(risk.riskLevel)}>
                        {getRiskLevelIcon(risk.riskLevel)}
                        {risk.riskLevel}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{risk.description}</p>
                    <div className="flex justify-between text-xs">
                      <span>Probabilidad: {risk.likelihood}%</span>
                      <span>Impacto: {risk.impact}%</span>
                    </div>
                    <div className="mt-2 text-xs text-red-600">
                      Costo potencial: ${risk.costImplication.min.toLocaleString()} - ${risk.costImplication.max.toLocaleString()}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Strategic Recommendations */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Recomendaciones Estratégicas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold text-red-600 mb-2">Inmediatas</h4>
                  <ul className="space-y-1">
                    {analysisResult.strategicRecommendations.immediate.map((rec, index) => (
                      <li key={index} className="text-sm flex items-start gap-2">
                        <Zap className="h-3 w-3 text-red-500 mt-0.5 flex-shrink-0" />
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold text-orange-600 mb-2">Corto Plazo</h4>
                  <ul className="space-y-1">
                    {analysisResult.strategicRecommendations.shortTerm.map((rec, index) => (
                      <li key={index} className="text-sm flex items-start gap-2">
                        <Clock className="h-3 w-3 text-orange-500 mt-0.5 flex-shrink-0" />
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold text-blue-600 mb-2">Largo Plazo</h4>
                  <ul className="space-y-1">
                    {analysisResult.strategicRecommendations.longTerm.map((rec, index) => (
                      <li key={index} className="text-sm flex items-start gap-2">
                        <Building className="h-3 w-3 text-blue-500 mt-0.5 flex-shrink-0" />
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="clauses" className="space-y-6">
          {/* Category Filter */}
          <div className="flex items-center gap-4">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Filtrar por categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorías</SelectItem>
                {Array.from(new Set(analysisResult.recommendedClauses.map(c => c.category))).map(category => (
                  <SelectItem key={category} value={category}>{category}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Progress value={progress.percentage} className="flex-1" />
            <span className="text-sm font-medium">{progress.approved}/{progress.total} aprobadas</span>
          </div>

          {/* Clauses by Category */}
          {Object.entries(categorizedClauses).map(([category, clauses]) => (
            <Card key={category}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{category}</span>
                  <Badge variant="outline">{clauses.length} cláusulas</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible>
                  {clauses.map((clause) => {
                    const review = clauseReviews.get(clause.id);
                    const isApproved = review?.status === 'approved' || review?.status === 'modified';
                    const isRejected = review?.status === 'rejected';
                    
                    return (
                      <AccordionItem key={clause.id} value={clause.id}>
                        <AccordionTrigger className="hover:no-underline">
                          <div className="flex items-center justify-between w-full mr-4">
                            <div className="flex items-center gap-3">
                              <Checkbox
                                checked={isApproved}
                                onCheckedChange={() => toggleClauseApproval(clause.id)}
                                onClick={(e) => e.stopPropagation()}
                              />
                              <div className="text-left">
                                <div className="font-medium">{clause.subcategory}</div>
                                <div className="text-sm text-muted-foreground">{clause.rationale}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className={getRiskLevelColor(clause.applicability.riskLevel)}>
                                {clause.applicability.riskLevel}
                              </Badge>
                              {clause.applicability.mandatory && (
                                <Badge variant="destructive">
                                  <Lock className="h-3 w-3 mr-1" />
                                  OBLIGATORIO
                                </Badge>
                              )}
                              {isApproved && <CheckCircle className="h-4 w-4 text-green-500" />}
                              {isRejected && <XCircle className="h-4 w-4 text-red-500" />}
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="space-y-4">
                          {/* Clause Text */}
                          <div className="bg-gray-50 p-4 rounded-lg">
                            <h5 className="font-semibold mb-2">Texto de la Cláusula:</h5>
                            <p className="text-sm leading-relaxed">{clause.clause}</p>
                          </div>

                          {/* Risk Mitigation */}
                          <div>
                            <h5 className="font-semibold mb-2">Mitigación de Riesgos:</h5>
                            <ul className="space-y-1">
                              {clause.riskMitigation.map((mitigation, index) => (
                                <li key={index} className="text-sm flex items-start gap-2">
                                  <Shield className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                                  {mitigation}
                                </li>
                              ))}
                            </ul>
                          </div>

                          {/* Legal Sources */}
                          <div>
                            <h5 className="font-semibold mb-2">Fundamento Legal:</h5>
                            <div className="space-y-2">
                              {clause.legalSources.map((source, index) => (
                                <div key={index} className="flex items-center justify-between bg-blue-50 p-3 rounded">
                                  <div>
                                    <div className="font-medium text-sm">{source.citation}</div>
                                    <div className="text-xs text-muted-foreground">{source.title}</div>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setShowLegalSources(showLegalSources === source.id ? null : source.id)}
                                  >
                                    <BookOpen className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Consequences */}
                          {clause.consequences && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <h5 className="font-semibold text-red-600 mb-2">Si se omite:</h5>
                                <ul className="space-y-1">
                                  {clause.consequences.ifOmitted.map((consequence, index) => (
                                    <li key={index} className="text-sm flex items-start gap-2">
                                      <XCircle className="h-3 w-3 text-red-500 mt-0.5 flex-shrink-0" />
                                      {consequence}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                              <div>
                                <h5 className="font-semibold text-green-600 mb-2">Si se incluye:</h5>
                                <ul className="space-y-1">
                                  {clause.consequences.ifIncluded.map((benefit, index) => (
                                    <li key={index} className="text-sm flex items-start gap-2">
                                      <CheckCircle className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                                      {benefit}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          )}

                          {/* Clause Versions */}
                          {clause.alternativeVersions && (
                            <div>
                              <h5 className="font-semibold mb-2">Versiones Alternativas:</h5>
                              <div className="space-y-2">
                                {Object.entries(clause.alternativeVersions).map(([version, text]) => (
                                  <div key={version} className="border rounded p-3">
                                    <div className="flex items-center justify-between mb-2">
                                      <Badge variant={
                                        version === 'aggressive' ? 'destructive' :
                                        version === 'moderate' ? 'default' : 'secondary'
                                      }>
                                        {version.toUpperCase()}
                                      </Badge>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => updateClauseReview(clause.id, { selectedVersion: version as any })}
                                      >
                                        Seleccionar
                                      </Button>
                                    </div>
                                    <p className="text-sm text-muted-foreground">{text}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Action Buttons */}
                          <div className="flex gap-2 pt-4 border-t">
                            <Button
                              variant={isApproved ? "default" : "outline"}
                              size="sm"
                              onClick={() => toggleClauseApproval(clause.id)}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Aprobar
                            </Button>
                            <Button
                              variant={isRejected ? "destructive" : "outline"}
                              size="sm"
                              onClick={() => rejectClause(clause.id)}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Rechazar
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setExpandedClause(expandedClause === clause.id ? null : clause.id)}
                            >
                              <Edit3 className="h-4 w-4 mr-1" />
                              Personalizar
                            </Button>
                          </div>

                          {/* Customization Panel */}
                          {expandedClause === clause.id && (
                            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                              <h5 className="font-semibold mb-3">Personalización de Cláusula:</h5>
                              <div className="space-y-3">
                                {clause.customizationOptions.variableFields.map((field) => (
                                  <div key={field}>
                                    <label className="block text-sm font-medium mb-1">
                                      {field.replace(/_/g, ' ').toUpperCase()}
                                    </label>
                                    <Input
                                      placeholder={`Ingrese ${field}`}
                                      onChange={(e) => {
                                        const current = clauseReviews.get(clause.id);
                                        if (current) {
                                          const newCustomizations = {
                                            ...current.customizations,
                                            [field]: e.target.value
                                          };
                                          customizeClause(clause.id, newCustomizations);
                                        }
                                      }}
                                    />
                                  </div>
                                ))}
                                <div>
                                  <label className="block text-sm font-medium mb-1">
                                    Notas Adicionales
                                  </label>
                                  <Textarea
                                    placeholder="Agregue notas o justificaciones para esta personalización..."
                                    onChange={(e) => updateClauseReview(clause.id, { userNotes: e.target.value })}
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="risks" className="space-y-6">
          <div className="space-y-4">
            {analysisResult.riskAssessments.map((risk, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getRiskLevelIcon(risk.riskLevel)}
                      <span>{risk.category}</span>
                    </div>
                    <Badge className={getRiskLevelColor(risk.riskLevel)}>
                      {risk.riskLevel}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground">{risk.description}</p>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Probabilidad</label>
                      <Progress value={risk.likelihood} className="mt-1" />
                      <span className="text-xs text-muted-foreground">{risk.likelihood}%</span>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Impacto</label>
                      <Progress value={risk.impact} className="mt-1" />
                      <span className="text-xs text-muted-foreground">{risk.impact}%</span>
                    </div>
                  </div>

                  <div className="bg-red-50 p-3 rounded-lg">
                    <h5 className="font-semibold text-red-700 mb-2">Implicaciones Económicas:</h5>
                    <p className="text-sm text-red-600">
                      <DollarSign className="h-4 w-4 inline mr-1" />
                      Rango de costo: ${risk.costImplication.min.toLocaleString()} - ${risk.costImplication.max.toLocaleString()}
                    </p>
                    <p className="text-xs text-red-500 mt-1">{risk.costImplication.description}</p>
                  </div>

                  <div>
                    <h5 className="font-semibold mb-2">Cláusulas de Mitigación Recomendadas:</h5>
                    <div className="flex flex-wrap gap-2">
                      {risk.mitigationClauses.map((clauseId) => {
                        const clause = defenseEngine.getDefenseClause(clauseId);
                        const review = clauseReviews.get(clauseId);
                        const isApproved = review?.status === 'approved' || review?.status === 'modified';
                        
                        return clause ? (
                          <Badge
                            key={clauseId}
                            variant={isApproved ? "default" : "outline"}
                            className="cursor-pointer"
                            onClick={() => {
                              setActiveTab('clauses');
                              setSelectedCategory(clause.category);
                            }}
                          >
                            {clause.subcategory}
                            {isApproved && <CheckCircle className="h-3 w-3 ml-1" />}
                          </Badge>
                        ) : null;
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="compliance" className="space-y-6">
          <div className="space-y-4">
            {analysisResult.mandatoryRequirements.map((requirement, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Gavel className="h-5 w-5 text-blue-600" />
                      <span>{requirement.requirement}</span>
                    </div>
                    <Badge className="bg-blue-100 text-blue-800 border-blue-300">
                      {requirement.jurisdiction}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground">{requirement.description}</p>
                  
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <h5 className="font-semibold text-blue-700 mb-2">Cláusula Obligatoria:</h5>
                    <p className="text-sm text-blue-600 font-mono bg-white p-2 rounded border">
                      {requirement.mandatoryClause}
                    </p>
                  </div>

                  <div className="bg-red-50 p-3 rounded-lg">
                    <h5 className="font-semibold text-red-700 mb-2">Penalización por Incumplimiento:</h5>
                    <p className="text-sm text-red-600">{requirement.penalty}</p>
                  </div>

                  <div className="border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="font-semibold">Fuente Legal:</h5>
                      <Button variant="ghost" size="sm">
                        <ExternalLink className="h-4 w-4 mr-1" />
                        Ver Fuente
                      </Button>
                    </div>
                    <div className="text-sm">
                      <div className="font-medium">{requirement.source.citation}</div>
                      <div className="text-muted-foreground">{requirement.source.title}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Vigente desde: {new Date(requirement.source.effectiveDate).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span>Método de verificación: {requirement.verificationMethod}</span>
                    {requirement.deadlines && (
                      <span>Plazo de notificación: {requirement.deadlines.notification} días</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      <div className="flex justify-between items-center">
        <Button variant="outline" onClick={onGoBack}>
          Regresar
        </Button>
        
        <div className="flex gap-4">
          <div className="text-sm text-muted-foreground">
            {progress.approved} de {progress.total} cláusulas aprobadas
            {analysisResult.criticalGaps.length > 0 && (
              <div className="text-red-600 mt-1">
                {analysisResult.criticalGaps.length} gaps críticos detectados
              </div>
            )}
          </div>
          
          <Button
            onClick={handleDefenseComplete}
            disabled={progress.approved === 0}
            className="bg-green-600 hover:bg-green-700"
          >
            <Shield className="h-4 w-4 mr-2" />
            Completar Defensa Legal
            ({progress.approved}/{progress.total})
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DefenseReviewPanel;
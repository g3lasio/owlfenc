import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building, Calendar, Target, Sparkles } from "lucide-react";

interface ProjectDetailsStepProps {
  estimateData: any;
  setEstimateData: (data: any) => void;
  onGenerateAI: () => void;
  isGeneratingAI: boolean;
}

export function ProjectDetailsStep({
  estimateData,
  setEstimateData,
  onGenerateAI,
  isGeneratingAI
}: ProjectDetailsStepProps) {
  const projectTypes = [
    'Residential Roofing',
    'Commercial Roofing',
    'Roof Repair',
    'Gutter Installation',
    'Siding',
    'Windows',
    'Solar Installation',
    'Insulation',
    'Other'
  ];

  const roofingSubtypes = [
    'Asphalt Shingles',
    'Metal Roofing',
    'Tile Roofing',
    'Slate Roofing',
    'Flat Roofing',
    'TPO/EPDM',
    'Modified Bitumen'
  ];

  const timelineOptions = [
    '1-2 weeks',
    '3-4 weeks',
    '1-2 months',
    '2-3 months',
    '3+ months'
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building className="h-5 w-5" />
          Project Details
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="project-type">Project Type *</Label>
            <Select
              value={estimateData.projectType || ''}
              onValueChange={(value) => setEstimateData({...estimateData, projectType: value})}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select project type" />
              </SelectTrigger>
              <SelectContent>
                {projectTypes.map((type) => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {estimateData.projectType?.includes('Roofing') && (
            <div>
              <Label htmlFor="project-subtype">Roofing Type</Label>
              <Select
                value={estimateData.projectSubtype || ''}
                onValueChange={(value) => setEstimateData({...estimateData, projectSubtype: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select roofing type" />
                </SelectTrigger>
                <SelectContent>
                  {roofingSubtypes.map((subtype) => (
                    <SelectItem key={subtype} value={subtype}>{subtype}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          <div>
            <Label htmlFor="timeline">Expected Timeline</Label>
            <Select
              value={estimateData.timeline || ''}
              onValueChange={(value) => setEstimateData({...estimateData, timeline: value})}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select timeline" />
              </SelectTrigger>
              <SelectContent>
                {timelineOptions.map((timeline) => (
                  <SelectItem key={timeline} value={timeline}>{timeline}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="valid-until">Estimate Valid Until</Label>
            <Input
              id="valid-until"
              type="date"
              value={estimateData.validUntil || ''}
              onChange={(e) => setEstimateData({...estimateData, validUntil: e.target.value})}
            />
          </div>
        </div>
        
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label htmlFor="project-scope">Project Scope & Description</Label>
            <Button
              variant="outline"
              size="sm"
              onClick={onGenerateAI}
              disabled={isGeneratingAI}
              className="flex items-center gap-2"
            >
              <Sparkles className="h-4 w-4" />
              {isGeneratingAI ? 'Generating...' : 'AI Generate'}
            </Button>
          </div>
          <Textarea
            id="project-scope"
            value={estimateData.scope || ''}
            onChange={(e) => setEstimateData({...estimateData, scope: e.target.value})}
            placeholder="Describe the project scope, materials needed, and any special requirements..."
            rows={6}
          />
          {estimateData.scope && (
            <p className="text-sm text-gray-500 mt-1">
              {estimateData.scope.length} characters
            </p>
          )}
        </div>
        
        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
            <Target className="h-4 w-4" />
            Quick Project Info
          </h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-blue-700 font-medium">Type:</span>
              <span className="ml-2">{estimateData.projectType || 'Not selected'}</span>
            </div>
            <div>
              <span className="text-blue-700 font-medium">Subtype:</span>
              <span className="ml-2">{estimateData.projectSubtype || 'Not specified'}</span>
            </div>
            <div>
              <span className="text-blue-700 font-medium">Timeline:</span>
              <span className="ml-2">{estimateData.timeline || 'Not specified'}</span>
            </div>
            <div>
              <span className="text-blue-700 font-medium">Valid Until:</span>
              <span className="ml-2">{estimateData.validUntil || 'Not set'}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
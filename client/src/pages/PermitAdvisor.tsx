import React, { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  Search,
  AlertTriangle,
  CheckCircle2,
  FileText,
  ListChecks,
  HardHat,
  CalendarClock,
  MapPin,
  ExternalLink,
  Clock,
  DollarSign,
  Phone,
  Mail,
  Building,
  ArrowLeft,
  Info,
  RotateCcw,
  BookOpen,
  Home,
  History,
  RefreshCw,
} from "lucide-react";
import MapboxPlacesAutocomplete from "@/components/ui/mapbox-places-autocomplete";

// Basic types for the component
interface PermitData {
  name: string;
  issuingAuthority: string;
  estimatedTimeline: string;
  averageCost?: string;
  description?: string;
  requirements?: string;
  url?: string;
}

interface SearchHistoryItem {
  id: number;
  userId: number;
  address: string;
  projectType: string;
  projectDescription?: string;
  title: string;
  results: any;
  createdAt: string;
}

interface PermitResponse {
  requiredPermits: PermitData[];
  specialConsiderations: string[];
  process: string[];
  meta: {
    sources: string[];
    generated: string;
    projectType: string;
    location: string;
    fullAddress?: string;
  };
  [key: string]: any;
}

// Main component
export default function PermitAdvisor() {
  const { toast } = useToast();
  const [address, setAddress] = useState("");
  const [projectType, setProjectType] = useState("fence");
  const [permitData, setPermitData] = useState<PermitResponse | null>(null);
  const [activeTab, setActiveTab] = useState("permits");
  const [showHistory, setShowHistory] = useState(false);
  const [showSearchForm, setShowSearchForm] = useState(true);
  const [projectDescription, setProjectDescription] = useState("");

  // Mutation to search permits
  const permitMutation = useMutation({
    mutationFn: async (data: {
      address: string;
      projectType: string;
      projectDescription?: string;
    }) => {
      const response = await fetch("/api/permit/check", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error("Failed to search permits");
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setPermitData(data);
      setShowSearchForm(false);
      queryClient.invalidateQueries({ queryKey: ['/api/permit/history'] });
      toast({
        title: "Search Successful",
        description: "Found permit information for your project.",
      });
    },
    onError: (error: any) => {
      console.error('Error in permit search:', error);
      const errorMessage = error?.message || error?.response?.data?.message || "Could not get permit information.";
      toast({
        title: "Search Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  // Query to get history
  const historyQuery = useQuery({
    queryKey: ['/api/permit/history'],
    queryFn: async () => {
      const response = await fetch('/api/permit/history');
      if (!response.ok) {
        throw new Error('Error getting search history');
      }
      return response.json() as Promise<SearchHistoryItem[]>;
    },
    enabled: true,
  });

  // Handler for Mapbox autocomplete
  const handlePlaceSelect = (placeData: any) => {
    if (placeData?.place_name) {
      setAddress(placeData.place_name);
    }
  };

  // Search handler
  const handleSearch = () => {
    if (!address.trim()) {
      toast({
        title: "Address Required",
        description: "Please enter an address to continue.",
        variant: "destructive",
      });
      return;
    }

    permitMutation.mutate({
      address: address.trim(),
      projectType,
      projectDescription: projectDescription.trim() || undefined,
    });
  };

  // Handler to return to form
  const handleBackToSearch = () => {
    setShowSearchForm(true);
  };

  // Handler to load a history item
  const handleLoadHistoryItem = (item: SearchHistoryItem) => {
    setAddress(item.address);
    setProjectType(item.projectType);
    setProjectDescription(item.projectDescription || "");
    setPermitData(item.results);
    setShowHistory(false);
    setShowSearchForm(false);
    toast({
      title: "Search Loaded",
      description: `Loaded search: ${item.title}`,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-teal-900 to-black p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="relative inline-block">
            {/* Futuristic icon frame */}
            <div className="relative p-4 mb-4">
              <div className="absolute inset-0 border-2 border-teal-400 opacity-60">
                {/* Corner brackets */}
                <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-teal-300"></div>
                <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-teal-300"></div>
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-teal-300"></div>
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-teal-300"></div>
                {/* Scanning lines */}
                <div className="absolute top-2 left-2 right-2 h-px bg-gradient-to-r from-transparent via-teal-400 to-transparent opacity-60 animate-pulse"></div>
                <div className="absolute bottom-2 left-2 right-2 h-px bg-gradient-to-r from-transparent via-teal-400 to-transparent opacity-60 animate-pulse delay-1000"></div>
              </div>
              <div className="relative text-6xl">🛡️</div>
            </div>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-teal-400 to-emerald-500 bg-clip-text text-transparent mb-2">
            Construction Permit Advisor
          </h1>
          <p className="text-lg text-teal-200">
            Get detailed information about permits and regulations for your project
          </p>
        </div>

        {/* Search Form */}
        {showSearchForm && (
          <div className="relative mb-8">
            {/* Cyberpunk outer frame */}
            <div className="absolute inset-0 border border-teal-400 opacity-30">
              {/* Corner brackets */}
              <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-teal-300"></div>
              <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-teal-300"></div>
              <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-teal-300"></div>
              <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-teal-300"></div>
              {/* Scanning lines */}
              <div className="absolute top-3 left-3 right-3 h-px bg-gradient-to-r from-transparent via-teal-400 to-transparent opacity-40 animate-pulse"></div>
              <div className="absolute bottom-3 left-3 right-3 h-px bg-gradient-to-r from-transparent via-teal-400 to-transparent opacity-40 animate-pulse delay-1000"></div>
            </div>
            <Card className="relative bg-gray-800/80 border-teal-500/30 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-teal-300">
                  <Search className="h-5 w-5 text-teal-400" />
                  Project Information
                </CardTitle>
                <CardDescription className="text-teal-200">
                  Enter your project details to get specific permit information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* History button */}
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowHistory(true)}
                    className="flex items-center gap-2 bg-gray-700/50 border-teal-500/30 text-teal-300 hover:bg-teal-500/20"
                  >
                    <History className="h-4 w-4" />
                    View History
                  </Button>
                </div>

                {/* Address */}
                <div className="space-y-2">
                  <Label htmlFor="address" className="text-teal-300">Project Address</Label>
                  <MapboxPlacesAutocomplete
                    value={address}
                    onChange={setAddress}
                    onPlaceSelect={handlePlaceSelect}
                    placeholder="Enter the project address"
                    countries={["mx", "us", "es"]}
                    language="en"
                  />
                </div>

                {/* Project type */}
                <div className="space-y-2">
                  <Label htmlFor="projectType" className="text-teal-300">Project Type</Label>
                  <Select value={projectType} onValueChange={setProjectType}>
                    <SelectTrigger className="bg-gray-700/50 border-teal-500/30 text-gray-200">
                      <SelectValue placeholder="Select project type" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-teal-500/30">
                      <SelectItem value="fence">Fence</SelectItem>
                      <SelectItem value="addition">House Addition</SelectItem>
                      <SelectItem value="deck">Deck/Patio</SelectItem>
                      <SelectItem value="pool">Pool</SelectItem>
                      <SelectItem value="shed">Shed</SelectItem>
                      <SelectItem value="garage">Garage</SelectItem>
                      <SelectItem value="renovation">Renovation</SelectItem>
                      <SelectItem value="driveway">Driveway</SelectItem>
                      <SelectItem value="roofing">Roofing</SelectItem>
                      <SelectItem value="drywall">Drywall / Plastering</SelectItem>
                      <SelectItem value="painting">Painting</SelectItem>
                      <SelectItem value="electrical">Electrical</SelectItem>
                      <SelectItem value="plumbing">Plumbing</SelectItem>
                      <SelectItem value="hvac">HVAC</SelectItem>
                      <SelectItem value="concrete">Concrete / Masonry</SelectItem>
                      <SelectItem value="flooring">Flooring</SelectItem>
                      <SelectItem value="landscaping">Landscaping</SelectItem>
                      <SelectItem value="insulation">Insulation</SelectItem>
                      <SelectItem value="cabinetry">Cabinetry / Carpentry</SelectItem>
                      <SelectItem value="windowDoor">Window / Door Installation</SelectItem>
                      <SelectItem value="structural">Structural Engineering</SelectItem>
                      <SelectItem value="waterproofing">Waterproofing</SelectItem>
                      <SelectItem value="demolition">Demolition</SelectItem>
                      <SelectItem value="sitePrep">Site Preparation / Excavation</SelectItem>
                      <SelectItem value="solar">Solar Panel Installation</SelectItem>
                      <SelectItem value="interiorDesign">Interior Design</SelectItem>
                      <SelectItem value="concreteCutting">Concrete Cutting / Sawing</SelectItem>
                      <SelectItem value="security">Security Systems</SelectItem>
                      <SelectItem value="moldRemediation">Mold Remediation</SelectItem>
                      <SelectItem value="asbestosRemoval">Asbestos Removal</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Project description */}
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-teal-300">Project Description (Optional)</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe the specific details of your project..."
                    value={projectDescription}
                    onChange={(e) => setProjectDescription(e.target.value)}
                    rows={3}
                    className="bg-gray-700/50 border-teal-500/30 text-gray-200 placeholder:text-gray-400"
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  onClick={handleSearch}
                  disabled={permitMutation.isPending}
                  className="w-full bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white border-0"
                >
                  {permitMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Searching...
                    </>
                  ) : (
                    <>
                      <Search className="mr-2 h-4 w-4" />
                      Search Permits
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          </div>
        )}

        {/* Results */}
        {permitData && !showSearchForm && (
          <div className="space-y-6">
            {/* Results header */}
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                onClick={handleBackToSearch}
                className="flex items-center gap-2 bg-gray-700/50 border-teal-500/30 text-teal-300 hover:bg-teal-500/20"
              >
                <ArrowLeft className="h-4 w-4" />
                New Search
              </Button>
              <div className="text-right">
                <h2 className="text-lg font-semibold text-teal-300">Results for:</h2>
                <p className="text-sm text-teal-200">{permitData.meta?.location}</p>
              </div>
            </div>

            {/* Results content */}
            <div className="relative">
              {/* Cyberpunk outer frame */}
              <div className="absolute inset-0 border border-teal-400 opacity-30">
                {/* Corner brackets */}
                <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-teal-300"></div>
                <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-teal-300"></div>
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-teal-300"></div>
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-teal-300"></div>
                {/* Scanning lines */}
                <div className="absolute top-3 left-3 right-3 h-px bg-gradient-to-r from-transparent via-teal-400 to-transparent opacity-40 animate-pulse"></div>
                <div className="absolute bottom-3 left-3 right-3 h-px bg-gradient-to-r from-transparent via-teal-400 to-transparent opacity-40 animate-pulse delay-1000"></div>
              </div>
              <Card className="relative bg-gray-800/80 border-teal-500/30 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-teal-300">Permit Information</CardTitle>
                  <CardDescription className="text-teal-200">
                    Project: {permitData.meta?.projectType} at {permitData.meta?.location}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="grid w-full grid-cols-6 bg-gray-900/80 border border-teal-400/30 relative overflow-hidden">
                      {/* Animated background */}
                      <div className="absolute inset-0 bg-gradient-to-r from-teal-500/10 via-transparent to-cyan-500/10 animate-pulse"></div>
                      <TabsTrigger value="permits" className="relative text-teal-300 data-[state=active]:bg-teal-500/30 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-teal-500/50 transition-all duration-300">
                        <span className="relative z-10">Permits</span>
                      </TabsTrigger>
                      <TabsTrigger value="contacts" className="relative text-teal-300 data-[state=active]:bg-cyan-500/30 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-cyan-500/50 transition-all duration-300">
                        <span className="relative z-10">Contacts</span>
                      </TabsTrigger>
                      <TabsTrigger value="codes" className="relative text-teal-300 data-[state=active]:bg-emerald-500/30 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-emerald-500/50 transition-all duration-300">
                        <span className="relative z-10">Codes</span>
                      </TabsTrigger>
                      <TabsTrigger value="process" className="relative text-teal-300 data-[state=active]:bg-blue-500/30 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-blue-500/50 transition-all duration-300">
                        <span className="relative z-10">Process</span>
                      </TabsTrigger>
                      <TabsTrigger value="timeline" className="relative text-teal-300 data-[state=active]:bg-purple-500/30 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-purple-500/50 transition-all duration-300">
                        <span className="relative z-10">Timeline</span>
                      </TabsTrigger>
                      <TabsTrigger value="considerations" className="relative text-teal-300 data-[state=active]:bg-amber-500/30 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-amber-500/50 transition-all duration-300">
                        <span className="relative z-10">Alerts</span>
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="permits" className="space-y-4">
                      {permitData.requiredPermits && permitData.requiredPermits.length > 0 ? (
                        <div className="space-y-4">
                          {permitData.requiredPermits.map((permit: any, idx: number) => (
                            <div key={idx} className="relative">
                              {/* Holographic border effect */}
                              <div className="absolute inset-0 bg-gradient-to-r from-teal-400/20 via-cyan-400/20 to-blue-400/20 animate-pulse rounded-lg"></div>
                              <Card className="relative bg-gray-800/90 border-teal-400/30 backdrop-blur-sm hover:shadow-lg hover:shadow-teal-400/20 transition-all duration-300 m-1">
                                <CardHeader>
                                  <CardTitle className="text-teal-300 flex items-center gap-2">
                                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                                    {permit.name}
                                  </CardTitle>
                                  <CardDescription className="text-teal-200/70">
                                    {permit.issuingAuthority}
                                  </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                  {/* Responsible Party */}
                                  {permit.responsibleParty && (
                                    <div className="bg-amber-500/10 border border-amber-400/30 rounded-lg p-3">
                                      <h4 className="text-amber-400 font-medium mb-1 flex items-center gap-2">
                                        👤 Who's Responsible
                                      </h4>
                                      <p className="text-amber-200 text-sm font-medium">{permit.responsibleParty}</p>
                                    </div>
                                  )}

                                  {permit.description && (
                                    <p className="text-gray-300 text-sm">{permit.description}</p>
                                  )}
                                  
                                  <div className="grid grid-cols-2 gap-4">
                                    {permit.estimatedTimeline && (
                                      <div>
                                        <h4 className="text-teal-400 font-medium mb-1">Timeline</h4>
                                        <p className="text-sm text-gray-300">{permit.estimatedTimeline}</p>
                                      </div>
                                    )}
                                    {permit.averageCost && (
                                      <div>
                                        <h4 className="text-teal-400 font-medium mb-1">Cost</h4>
                                        <p className="text-sm text-gray-300">{permit.averageCost}</p>
                                      </div>
                                    )}
                                  </div>

                                  {/* Required Documents */}
                                  {permit.requiredDocuments && permit.requiredDocuments.length > 0 && (
                                    <div>
                                      <h4 className="text-purple-400 font-medium mb-2 flex items-center gap-2">
                                        📋 Required Documents
                                      </h4>
                                      <div className="grid grid-cols-1 gap-2">
                                        {permit.requiredDocuments.map((doc: string, docIdx: number) => (
                                          <div key={docIdx} className="flex items-center gap-2 text-sm bg-purple-500/10 p-2 rounded border-l-2 border-purple-400">
                                            <span className="text-purple-300">•</span>
                                            <span className="text-gray-300">{doc}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Official Links */}
                                  <div className="space-y-3">
                                    {permit.applicationFormUrl && (
                                      <a 
                                        href={permit.applicationFormUrl} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-3 bg-blue-500/10 border border-blue-400/30 rounded-lg p-3 hover:bg-blue-500/20 transition-colors group"
                                      >
                                        <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center group-hover:bg-blue-500/30">
                                          📄
                                        </div>
                                        <div>
                                          <h4 className="text-blue-300 font-medium">Application Form</h4>
                                          <p className="text-blue-200/70 text-sm">Download official permit application</p>
                                        </div>
                                        <div className="ml-auto text-blue-400">→</div>
                                      </a>
                                    )}

                                    {permit.website && (
                                      <a 
                                        href={permit.website} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-3 bg-green-500/10 border border-green-400/30 rounded-lg p-3 hover:bg-green-500/20 transition-colors group"
                                      >
                                        <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center group-hover:bg-green-500/30">
                                          🌐
                                        </div>
                                        <div>
                                          <h4 className="text-green-300 font-medium">Official Website</h4>
                                          <p className="text-green-200/70 text-sm">Visit department website</p>
                                        </div>
                                        <div className="ml-auto text-green-400">→</div>
                                      </a>
                                    )}

                                    {permit.contactPhone && (
                                      <a 
                                        href={`tel:${permit.contactPhone.replace(/\D/g, '')}`}
                                        className="flex items-center gap-3 bg-teal-500/10 border border-teal-400/30 rounded-lg p-3 hover:bg-teal-500/20 transition-colors group"
                                      >
                                        <div className="w-8 h-8 bg-teal-500/20 rounded-full flex items-center justify-center group-hover:bg-teal-500/30">
                                          📞
                                        </div>
                                        <div>
                                          <h4 className="text-teal-300 font-medium">Call Department</h4>
                                          <p className="text-teal-200/70 text-sm font-mono">{permit.contactPhone}</p>
                                        </div>
                                        <div className="ml-auto text-teal-400">→</div>
                                      </a>
                                    )}
                                  </div>

                                  {/* Submission Method */}
                                  {permit.submissionMethod && (
                                    <div className="bg-cyan-500/10 border border-cyan-400/30 rounded-lg p-3">
                                      <h4 className="text-cyan-400 font-medium mb-1 flex items-center gap-2">
                                        📤 How to Submit
                                      </h4>
                                      <p className="text-cyan-200 text-sm">{permit.submissionMethod}</p>
                                    </div>
                                  )}

                                  {permit.requirements && (
                                    <div>
                                      <h4 className="text-cyan-400 font-medium mb-2">Additional Requirements</h4>
                                      <p className="text-sm text-gray-300 bg-gray-700/50 p-3 rounded border-l-4 border-cyan-400">
                                        {permit.requirements}
                                      </p>
                                    </div>
                                  )}
                                </CardContent>
                              </Card>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <CheckCircle2 className="h-12 w-12 text-green-400 mx-auto mb-4" />
                          <h3 className="text-lg font-medium text-teal-300">No specific permits required</h3>
                          <p className="text-gray-400">
                            According to available information, your project may not require special permits.
                          </p>
                        </div>
                      )}
                    </TabsContent>

                    {/* New Premium Contacts Tab */}
                    <TabsContent value="contacts" className="space-y-4">
                      {permitData.contactInformation && permitData.contactInformation.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {permitData.contactInformation.map((contact: any, idx: number) => (
                            <div key={idx} className="relative">
                              {/* Holographic border effect */}
                              <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/20 via-teal-400/20 to-blue-400/20 animate-pulse rounded-lg"></div>
                              <Card className="relative bg-gray-800/90 border-cyan-400/30 backdrop-blur-sm hover:shadow-lg hover:shadow-cyan-400/20 transition-all duration-300">
                                <CardHeader>
                                  <CardTitle className="text-cyan-300 flex items-center gap-2">
                                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                                    {contact.department || "Department"}
                                  </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                  {contact.phone && (
                                    <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 bg-teal-500/20 rounded-full flex items-center justify-center">📞</div>
                                      <div>
                                        <p className="text-xs text-gray-400">Direct Line</p>
                                        <a 
                                          href={`tel:${contact.phone.replace(/\D/g, '')}`}
                                          className="text-teal-300 font-mono hover:text-teal-200 hover:underline transition-colors cursor-pointer"
                                        >
                                          {contact.phone}
                                        </a>
                                      </div>
                                    </div>
                                  )}
                                  {contact.email && (
                                    <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 bg-cyan-500/20 rounded-full flex items-center justify-center">📧</div>
                                      <div>
                                        <p className="text-xs text-gray-400">Email</p>
                                        <a 
                                          href={`mailto:${contact.email}`}
                                          className="text-cyan-300 font-mono text-sm hover:text-cyan-200 hover:underline transition-colors cursor-pointer"
                                        >
                                          {contact.email}
                                        </a>
                                      </div>
                                    </div>
                                  )}
                                  {contact.address && (
                                    <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center">📍</div>
                                      <div>
                                        <p className="text-xs text-gray-400">Address</p>
                                        <a 
                                          href={`https://maps.google.com/maps?q=${encodeURIComponent(contact.address)}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-blue-300 text-sm hover:text-blue-200 hover:underline transition-colors cursor-pointer"
                                        >
                                          {contact.address}
                                        </a>
                                      </div>
                                    </div>
                                  )}
                                  {contact.hours && (
                                    <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 bg-emerald-500/20 rounded-full flex items-center justify-center">🕒</div>
                                      <div>
                                        <p className="text-xs text-gray-400">Hours</p>
                                        <p className="text-emerald-300 text-sm">{contact.hours}</p>
                                      </div>
                                    </div>
                                  )}
                                </CardContent>
                              </Card>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <div className="w-16 h-16 bg-gradient-to-r from-cyan-500 to-teal-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-spin">
                            📞
                          </div>
                          <h3 className="text-lg font-medium text-cyan-300">Contact Info Loading...</h3>
                          <p className="text-gray-400">Premium contact details will appear here</p>
                        </div>
                      )}
                    </TabsContent>

                    {/* New Premium Building Codes Tab */}
                    <TabsContent value="codes" className="space-y-4">
                      {permitData.localCodes && permitData.localCodes.length > 0 ? (
                        <div className="space-y-4">
                          {permitData.localCodes.map((code: any, idx: number) => (
                            <div key={idx} className="relative">
                              {/* Matrix-style border */}
                              <div className="absolute inset-0 border border-emerald-400/30">
                                <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-emerald-400"></div>
                                <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-emerald-400"></div>
                                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-emerald-400"></div>
                                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-emerald-400"></div>
                              </div>
                              <Card className="relative bg-gray-900/90 border-emerald-500/20 m-1">
                                <CardHeader>
                                  <CardTitle className="text-emerald-300 font-mono">
                                    {code.section || `Code Section ${idx + 1}`}
                                  </CardTitle>
                                  <CardDescription className="text-emerald-200/70">
                                    {code.type || "Building Code Regulation"}
                                  </CardDescription>
                                </CardHeader>
                                <CardContent>
                                  <div className="space-y-3">
                                    {code.details && (
                                      <div>
                                        <h4 className="text-emerald-400 font-medium mb-2">Requirements</h4>
                                        <p className="text-gray-300 text-sm bg-gray-800/50 p-3 rounded border-l-4 border-emerald-400">
                                          {typeof code.details === 'string' ? code.details : JSON.stringify(code.details)}
                                        </p>
                                      </div>
                                    )}
                                    {code.restrictions && (
                                      <div>
                                        <h4 className="text-amber-400 font-medium mb-2">Restrictions</h4>
                                        <p className="text-gray-300 text-sm bg-amber-500/10 p-3 rounded border-l-4 border-amber-400">
                                          {typeof code.restrictions === 'string' ? code.restrictions : JSON.stringify(code.restrictions)}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                </CardContent>
                              </Card>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <div className="w-16 h-16 bg-gradient-to-r from-emerald-500 to-green-500 rounded-lg flex items-center justify-center mx-auto mb-4 transform rotate-45 animate-pulse">
                            <span className="transform -rotate-45">📋</span>
                          </div>
                          <h3 className="text-lg font-medium text-emerald-300">Building Codes Loading...</h3>
                          <p className="text-gray-400">Specific code sections will appear here</p>
                        </div>
                      )}
                    </TabsContent>

                    {/* Premium Interactive Timeline with Process Checklist */}
                    <TabsContent value="timeline" className="space-y-6">
                      {/* Timeline Overview */}
                      {permitData.timeline && (
                        <div className="relative">
                          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-purple-500/10 rounded-lg animate-pulse"></div>
                          <Card className="relative bg-gray-800/90 border-purple-400/30">
                            <CardHeader>
                              <CardTitle className="text-purple-300 flex items-center gap-2">
                                <div className="w-3 h-3 bg-purple-400 rounded-full animate-ping"></div>
                                Project Timeline Overview
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {permitData.timeline.totalEstimatedTime && (
                                  <div className="text-center p-4 bg-purple-500/10 rounded-lg border border-purple-400/20">
                                    <h4 className="text-purple-300 font-medium">Total Time</h4>
                                    <p className="text-2xl font-bold text-white mt-2">{permitData.timeline.totalEstimatedTime}</p>
                                  </div>
                                )}
                                {permitData.timeline.criticalPathItems && (
                                  <div className="text-center p-4 bg-red-500/10 rounded-lg border border-red-400/20">
                                    <h4 className="text-red-300 font-medium">Critical Items</h4>
                                    <p className="text-2xl font-bold text-white mt-2">{Array.isArray(permitData.timeline.criticalPathItems) ? permitData.timeline.criticalPathItems.length : '1'}</p>
                                  </div>
                                )}
                                {permitData.timeline.bestTimeToApply && (
                                  <div className="text-center p-4 bg-green-500/10 rounded-lg border border-green-400/20">
                                    <h4 className="text-green-300 font-medium">Best Time</h4>
                                    <p className="text-sm font-medium text-white mt-2">{permitData.timeline.bestTimeToApply}</p>
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      )}

                      {/* Interactive Process Checklist */}
                      {permitData.process && permitData.process.length > 0 && (
                        <Card className="bg-gray-800/90 border-blue-400/30">
                          <CardHeader>
                            <CardTitle className="text-blue-300 flex items-center gap-2">
                              <div className="w-3 h-3 bg-blue-400 rounded-full animate-pulse"></div>
                              Interactive Process Checklist
                            </CardTitle>
                            <CardDescription className="text-blue-200/70">
                              Follow these steps in order. Click to mark as completed.
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-4">
                              {permitData.process.map((step: any, idx: number) => {
                                const [completed, setCompleted] = React.useState(false);
                                return (
                                  <div 
                                    key={idx} 
                                    className={`group relative p-4 rounded-lg border-2 transition-all duration-300 cursor-pointer ${
                                      completed 
                                        ? 'bg-green-500/10 border-green-400/50 shadow-lg shadow-green-400/20' 
                                        : 'bg-gray-700/50 border-blue-400/30 hover:border-blue-400/60 hover:bg-blue-500/10'
                                    }`}
                                    onClick={() => setCompleted(!completed)}
                                  >
                                    {/* Step Number */}
                                    <div className="flex items-start gap-4">
                                      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                                        completed 
                                          ? 'bg-green-500 text-white' 
                                          : 'bg-blue-500 text-white'
                                      }`}>
                                        {completed ? '✓' : idx + 1}
                                      </div>
                                      
                                      {/* Step Content */}
                                      <div className="flex-1">
                                        <p className={`text-sm transition-all duration-300 ${
                                          completed 
                                            ? 'text-green-300 line-through opacity-75' 
                                            : 'text-gray-300'
                                        }`}>
                                          {typeof step === 'string' ? step : step.step || JSON.stringify(step)}
                                        </p>
                                        
                                        {/* Dependencies indicator */}
                                        {step.dependencies && (
                                          <div className="mt-2 flex items-center gap-2">
                                            <span className="text-xs text-amber-400">Depends on step:</span>
                                            <span className="text-xs text-amber-300 font-mono bg-amber-500/10 px-2 py-1 rounded">
                                              {step.dependencies}
                                            </span>
                                          </div>
                                        )}
                                        
                                        {/* Timing indicator */}
                                        {step.timing && (
                                          <div className="mt-2 flex items-center gap-2">
                                            <span className="text-xs text-purple-400">Timing:</span>
                                            <span className="text-xs text-purple-300 font-mono bg-purple-500/10 px-2 py-1 rounded">
                                              {step.timing}
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                      
                                      {/* Interactive indicator */}
                                      <div className={`transition-all duration-300 ${
                                        completed ? 'text-green-400' : 'text-blue-400 group-hover:text-blue-300'
                                      }`}>
                                        {completed ? '🎉' : '👆'}
                                      </div>
                                    </div>
                                    
                                    {/* Holographic border effect */}
                                    {!completed && (
                                      <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-blue-400/10 via-transparent to-cyan-400/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* Loading state when no data */}
                      {(!permitData.timeline && (!permitData.process || permitData.process.length === 0)) && (
                        <div className="text-center py-12">
                          <div className="w-20 h-20 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-spin">
                            📋
                          </div>
                          <h3 className="text-lg font-medium text-purple-300">Process Timeline Loading...</h3>
                          <p className="text-gray-400">Interactive checklist will appear here</p>
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="process" className="space-y-4">
                      {permitData.process && permitData.process.length > 0 ? (
                        <div className="space-y-3">
                          {permitData.process.map((step: any, idx: number) => (
                            <div key={idx} className="flex items-start gap-3">
                              <div className="flex-shrink-0 w-6 h-6 bg-gradient-to-r from-teal-500 to-emerald-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                                {idx + 1}
                              </div>
                              <p className="text-sm text-gray-300">
                                {typeof step === 'string' ? step : step.step || JSON.stringify(step)}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <Info className="h-12 w-12 text-teal-400 mx-auto mb-4" />
                          <h3 className="text-lg font-medium text-teal-300">Process not specified</h3>
                          <p className="text-gray-400">
                            Check with local authorities for specific process information.
                          </p>
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="considerations" className="space-y-4">
                      {permitData.specialConsiderations && permitData.specialConsiderations.length > 0 ? (
                        <div className="space-y-3">
                          {permitData.specialConsiderations.map((consideration: any, idx: number) => (
                            <Alert key={idx} className="bg-amber-500/10 border-amber-500/30">
                              <AlertTriangle className="h-4 w-4 text-amber-400" />
                              <AlertDescription className="text-gray-300">
                                {typeof consideration === 'string' ? consideration : consideration.aspect || JSON.stringify(consideration)}
                              </AlertDescription>
                            </Alert>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto mb-4" />
                          <h3 className="text-lg font-medium text-teal-300">No special considerations</h3>
                          <p className="text-gray-400">
                            No special considerations identified for your project.
                          </p>
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* History modal */}
        <Dialog open={showHistory} onOpenChange={setShowHistory}>
          <DialogContent className="sm:max-w-[625px] bg-gray-800 border-teal-500/30">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-teal-300">
                <History className="h-5 w-5 text-teal-400" />
                Search History
              </DialogTitle>
              <DialogDescription className="text-teal-200">
                View and load previous searches to avoid repeating the same search.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              {historyQuery.isLoading ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-teal-400 mb-4" />
                  <p className="text-sm text-gray-400">Loading history...</p>
                </div>
              ) : historyQuery.isError ? (
                <div className="text-center p-4 border rounded-md bg-red-500/10 border-red-500/30">
                  <AlertTriangle className="h-8 w-8 text-red-400 mx-auto mb-2" />
                  <h3 className="font-medium text-red-300">Error loading history</h3>
                  <p className="text-sm text-gray-400">
                    {historyQuery.error instanceof Error ? historyQuery.error.message : 'Unknown error'}
                  </p>
                </div>
              ) : !historyQuery.data || historyQuery.data.length === 0 ? (
                <div className="text-center p-8 border rounded-md bg-gray-700/50 border-teal-500/30">
                  <Info className="h-10 w-10 text-teal-400 mx-auto mb-2" />
                  <h3 className="font-medium text-lg text-teal-300">No previous searches</h3>
                  <p className="text-sm text-gray-400 mt-1">
                    When you perform permit searches, they will be saved here for easy access later.
                  </p>
                </div>
              ) : (
                <ScrollArea className="h-[min(65vh,400px)] pr-4">
                  <div className="space-y-3">
                    {historyQuery.data.map((item) => (
                      <Card key={item.id} className="hover:bg-teal-500/10 transition-colors bg-gray-700/50 border-teal-500/30">
                        <CardHeader className="p-4 pb-2">
                          <CardTitle className="text-base text-teal-300">{item.title}</CardTitle>
                          <CardDescription className="text-xs text-gray-400">
                            {new Date(item.createdAt).toLocaleDateString()} {new Date(item.createdAt).toLocaleTimeString()}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <span className="font-medium block text-xs text-teal-300">Address:</span>
                              <span className="text-gray-300 text-xs">{item.address}</span>
                            </div>
                            <div>
                              <span className="font-medium block text-xs text-teal-300">Type:</span>
                              <span className="text-gray-300 text-xs">{item.projectType}</span>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            className="mt-3 w-full bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700"
                            onClick={() => handleLoadHistoryItem(item)}
                          >
                            Load Search
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
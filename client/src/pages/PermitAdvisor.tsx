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
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2 } from "lucide-react";
import MapboxPlacesAutocomplete from "@/components/ui/mapbox-places-autocomplete";
import { useToast } from "@/hooks/use-toast";

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

export default function PermitAdvisor() {
  const [selectedAddress, setSelectedAddress] = useState("");
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [projectType, setProjectType] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [permitData, setPermitData] = useState<PermitResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("permits");
  const [showHistory, setShowHistory] = useState(false);
  const { toast } = useToast();

  const handleAddressSelect = (addressData: any) => {
    console.log("📍 [MapboxPlaces] Dirección seleccionada:", addressData.address);
    console.log("✅ [MapboxPlaces] Datos del lugar:", addressData);
    
    setSelectedAddress(addressData.address);
    setCoordinates(addressData.coordinates);
  };

  const handleSearch = async () => {
    if (!selectedAddress.trim()) {
      setError("Please enter an address");
      return;
    }
    if (!projectType) {
      setError("Please select a project type");
      return;
    }

    setIsLoading(true);
    setError("");
    setPermitData(null);

    try {
      console.log("===== INICIANDO SOLICITUD MERVIN DEEPSEARCH =====");
      
      const response = await apiRequest('/api/permit/check', 'POST', {
        address: selectedAddress,
        projectType,
        projectDescription: projectDescription || `${projectType} project`,
        coordinates
      });

      console.log("✅ Respuesta recibida del servidor:", response);
      setPermitData(response as PermitResponse);
      
      toast({
        title: "✅ DeepSearch Complete",
        description: "Permit analysis generated successfully!",
      });

    } catch (error) {
      console.error("Error in permit search:", error);
      setError("Failed to analyze permits. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const historyQuery = useQuery({
    queryKey: ['/api/permit/history'],
    enabled: showHistory
  });

  const handleLoadHistoryItem = (item: SearchHistoryItem) => {
    setSelectedAddress(item.address);
    setProjectType(item.projectType);
    setProjectDescription(item.projectDescription || "");
    setPermitData(item.results);
    setShowHistory(false);
    
    toast({
      title: "History Loaded",
      description: `Loaded search for ${item.address}`,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-teal-900">
      {/* Header with cyberpunk styling */}
      <div className="relative overflow-hidden bg-gradient-to-r from-teal-900/50 to-gray-900/50 backdrop-blur-sm">
        <div className="absolute inset-0 bg-gray-800/10 opacity-30"></div>
        <div className="relative max-w-6xl mx-auto px-6 py-12">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-teal-300 via-cyan-300 to-blue-300 bg-clip-text text-transparent mb-4">
              Mervin DeepSearch
            </h1>
            <p className="text-xl text-gray-300 mb-8">
              AI-Powered Permit Analysis & Regulatory Intelligence
            </p>
            <div className="flex items-center justify-center gap-2 text-teal-300">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-sm font-mono">Professional Grade Intelligence</span>
            </div>
          </div>
        </div>
      </div>

      {/* Search Interface */}
      <div className="max-w-6xl mx-auto p-6">
        <Card className="bg-gray-800/50 border-teal-500/20 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-teal-300 flex items-center gap-2">
              <div className="w-3 h-3 bg-teal-400 rounded-full animate-pulse"></div>
              Property & Project Analysis
            </CardTitle>
            <CardDescription className="text-gray-400">
              Enter property details for comprehensive permit analysis
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-teal-300">Property Address</label>
                <MapboxPlacesAutocomplete
                  onPlaceSelect={handleAddressSelect}
                  onChange={() => {}} 
                  className="bg-gray-700/50 border-teal-500/30 text-white placeholder-gray-400 focus:border-teal-400 focus:ring-teal-400/20"
                  placeholder="Enter property address..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-teal-300">Project Type</label>
                <Select value={projectType} onValueChange={setProjectType}>
                  <SelectTrigger className="bg-gray-700/50 border-teal-500/30 text-white focus:border-teal-400">
                    <SelectValue placeholder="Select project type" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-teal-500/30">
                    <SelectItem value="fence">Fence Installation</SelectItem>
                    <SelectItem value="deck">Deck Construction</SelectItem>
                    <SelectItem value="addition">Home Addition</SelectItem>
                    <SelectItem value="renovation">Renovation</SelectItem>
                    <SelectItem value="electrical">Electrical Work</SelectItem>
                    <SelectItem value="plumbing">Plumbing</SelectItem>
                    <SelectItem value="roofing">Roofing</SelectItem>
                    <SelectItem value="hvac">HVAC Installation</SelectItem>
                    <SelectItem value="concrete">Concrete Work</SelectItem>
                    <SelectItem value="landscaping">Landscaping</SelectItem>
                    <SelectItem value="pool">Pool Installation</SelectItem>
                    <SelectItem value="solar">Solar Panel Installation</SelectItem>
                    <SelectItem value="siding">Siding</SelectItem>
                    <SelectItem value="windows">Window Replacement</SelectItem>
                    <SelectItem value="demolition">Demolition</SelectItem>
                    <SelectItem value="garage">Garage Construction</SelectItem>
                    <SelectItem value="shed">Shed Installation</SelectItem>
                    <SelectItem value="driveway">Driveway</SelectItem>
                    <SelectItem value="bathroom">Bathroom Remodel</SelectItem>
                    <SelectItem value="kitchen">Kitchen Remodel</SelectItem>
                    <SelectItem value="basement">Basement Finishing</SelectItem>
                    <SelectItem value="attic">Attic Conversion</SelectItem>
                    <SelectItem value="porch">Porch/Patio</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-teal-300">Project Description (Optional)</label>
              <Input
                value={projectDescription}
                onChange={(e) => setProjectDescription(e.target.value)}
                placeholder="Describe your project in detail..."
                className="bg-gray-700/50 border-teal-500/30 text-white placeholder-gray-400 focus:border-teal-400 focus:ring-teal-400/20"
              />
            </div>

            <div className="flex gap-4">
              <Button
                onClick={handleSearch}
                disabled={isLoading || !selectedAddress || !projectType}
                className="flex-1 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white font-medium transition-all duration-300 transform hover:scale-105"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Analyzing...
                  </div>
                ) : (
                  "🔍 Run DeepSearch Analysis"
                )}
              </Button>
              
              <Button
                variant="outline"
                onClick={() => setShowHistory(!showHistory)}
                className="border-teal-500/30 text-teal-300 hover:bg-teal-500/10"
              >
                {showHistory ? "Hide History" : "Show History"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Search History */}
        {showHistory && (
          <Card className="mt-6 bg-gray-800/50 border-gray-600/30">
            <CardHeader>
              <CardTitle className="text-gray-300">Search History</CardTitle>
            </CardHeader>
            <CardContent>
              {historyQuery.isLoading && (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-400"></div>
                </div>
              )}
              
              {historyQuery.data && historyQuery.data.length > 0 ? (
                <div className="space-y-3">
                  {historyQuery.data.map((item: SearchHistoryItem) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg border border-gray-600/30 hover:border-teal-500/30 transition-colors"
                    >
                      <div>
                        <p className="font-medium text-gray-300">{item.title}</p>
                        <p className="text-sm text-gray-400">{item.address}</p>
                        <p className="text-xs text-gray-500">{new Date(item.createdAt).toLocaleDateString()}</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleLoadHistoryItem(item)}
                        className="border-teal-500/30 text-teal-300 hover:bg-teal-500/10"
                      >
                        Load
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-center py-4">No search history found</p>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Results */}
      {permitData && (
        <div className="max-w-6xl mx-auto p-6">
          <div className="space-y-6">
            <Card className="bg-gray-800/50 border-teal-500/20 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-2xl text-teal-300 flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                  DeepSearch Results
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Project: {permitData.meta?.projectType} at {permitData.meta?.location}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-6 bg-gray-900/80 border border-teal-400/30 relative overflow-hidden">
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

                  {/* Contacts Tab */}
                  <TabsContent value="contacts" className="space-y-4">
                    {permitData.contactInformation && permitData.contactInformation.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {permitData.contactInformation.map((contact: any, idx: number) => (
                          <div key={idx} className="relative">
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

                  {/* Other tabs with basic content */}
                  <TabsContent value="codes" className="space-y-4">
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-gradient-to-r from-emerald-500 to-green-500 rounded-lg flex items-center justify-center mx-auto mb-4 transform rotate-45 animate-pulse">
                        <span className="transform -rotate-45">📋</span>
                      </div>
                      <h3 className="text-lg font-medium text-emerald-300">Building Codes Loading...</h3>
                      <p className="text-gray-400">Specific code sections will appear here</p>
                    </div>
                  </TabsContent>

                  <TabsContent value="process" className="space-y-4">
                    {permitData.process && permitData.process.length > 0 ? (
                      <div className="space-y-3">
                        {permitData.process.map((step: any, idx: number) => (
                          <div key={idx} className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-xs font-bold text-white">
                              {idx + 1}
                            </div>
                            <p className="text-gray-300 text-sm">
                              {typeof step === 'string' ? step : step.step || JSON.stringify(step)}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <CheckCircle2 className="h-12 w-12 text-green-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-green-300">Process information loading...</h3>
                        <p className="text-gray-400">Step-by-step process will appear here.</p>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="timeline" className="space-y-4">
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                        📅
                      </div>
                      <h3 className="text-lg font-medium text-purple-300">Timeline Analysis Loading...</h3>
                      <p className="text-gray-400">Critical path analysis will appear here</p>
                    </div>
                  </TabsContent>

                  <TabsContent value="considerations" className="space-y-4">
                    {permitData.specialConsiderations && permitData.specialConsiderations.length > 0 ? (
                      <div className="space-y-3">
                        {permitData.specialConsiderations.map((consideration: any, idx: number) => (
                          <div key={idx} className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center text-xs font-bold text-black">
                              !
                            </div>
                            <p className="text-gray-300 text-sm">
                              {typeof consideration === 'string' ? consideration : JSON.stringify(consideration)}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <CheckCircle2 className="h-12 w-12 text-green-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-green-300">No special considerations</h3>
                        <p className="text-gray-400">No additional considerations identified for this project.</p>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="max-w-6xl mx-auto p-6">
          <Card className="bg-gray-800/50 border-teal-500/20">
            <CardContent className="p-8">
              <div className="flex items-center justify-center space-x-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-400"></div>
                <p className="text-teal-300">Running DeepSearch analysis...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {error && (
        <div className="max-w-6xl mx-auto p-6">
          <Card className="bg-red-900/20 border-red-500/20">
            <CardContent className="p-6">
              <p className="text-red-300">{error}</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
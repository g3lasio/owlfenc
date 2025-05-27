import { useState, useEffect } from "react";
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
      const response = await fetch("/api/permit/search", {
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
      toast({
        title: "Search Error",
        description: error.message || "Could not get permit information.",
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
                    <TabsList className="grid w-full grid-cols-3 bg-gray-700/50">
                      <TabsTrigger value="permits" className="text-teal-300 data-[state=active]:bg-teal-500/20">Permits</TabsTrigger>
                      <TabsTrigger value="process" className="text-teal-300 data-[state=active]:bg-teal-500/20">Process</TabsTrigger>
                      <TabsTrigger value="considerations" className="text-teal-300 data-[state=active]:bg-teal-500/20">Considerations</TabsTrigger>
                    </TabsList>

                    <TabsContent value="permits" className="space-y-4">
                      {permitData.requiredPermits && permitData.requiredPermits.length > 0 ? (
                        <div className="space-y-4">
                          {permitData.requiredPermits.map((permit: PermitData, idx: number) => (
                            <div key={idx} className="relative">
                              {/* Mini cyberpunk frame for each permit */}
                              <div className="absolute inset-0 border border-cyan-400/20">
                                <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-cyan-300/50"></div>
                                <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-cyan-300/50"></div>
                                <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-cyan-300/50"></div>
                                <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-cyan-300/50"></div>
                              </div>
                              <Card className="relative bg-gray-700/50 border-cyan-500/20">
                                <CardHeader>
                                  <CardTitle className="text-lg text-cyan-200">{permit.name}</CardTitle>
                                  <CardDescription className="text-gray-400">{permit.issuingAuthority}</CardDescription>
                                </CardHeader>
                                <CardContent>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                      <h4 className="font-medium mb-2 text-cyan-300">Estimated Time</h4>
                                      <p className="text-sm text-gray-300">{permit.estimatedTimeline}</p>
                                    </div>
                                    {permit.averageCost && (
                                      <div>
                                        <h4 className="font-medium mb-2 text-cyan-300">Average Cost</h4>
                                        <p className="text-sm text-gray-300">{permit.averageCost}</p>
                                      </div>
                                    )}
                                    {permit.description && (
                                      <div className="col-span-1 md:col-span-2">
                                        <h4 className="font-medium mb-2 text-cyan-300">Description</h4>
                                        <p className="text-sm text-gray-300">{permit.description}</p>
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
                          <CheckCircle2 className="h-12 w-12 text-green-400 mx-auto mb-4" />
                          <h3 className="text-lg font-medium text-cyan-300">No specific permits required</h3>
                          <p className="text-gray-400">
                            According to available information, your project may not require special permits.
                          </p>
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="process" className="space-y-4">
                      {permitData.process && permitData.process.length > 0 ? (
                        <div className="space-y-3">
                          {permitData.process.map((step: string, idx: number) => (
                            <div key={idx} className="flex items-start gap-3">
                              <div className="flex-shrink-0 w-6 h-6 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                                {idx + 1}
                              </div>
                              <p className="text-sm text-gray-300">{step}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <Info className="h-12 w-12 text-blue-400 mx-auto mb-4" />
                          <h3 className="text-lg font-medium text-cyan-300">Process not specified</h3>
                          <p className="text-gray-400">
                            Check with local authorities for specific process information.
                          </p>
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="considerations" className="space-y-4">
                      {permitData.specialConsiderations && permitData.specialConsiderations.length > 0 ? (
                        <div className="space-y-3">
                          {permitData.specialConsiderations.map((consideration: string, idx: number) => (
                            <Alert key={idx} className="bg-yellow-500/10 border-yellow-500/30">
                              <AlertTriangle className="h-4 w-4 text-yellow-400" />
                              <AlertDescription className="text-gray-300">{consideration}</AlertDescription>
                            </Alert>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <CheckCircle2 className="h-12 w-12 text-green-400 mx-auto mb-4" />
                          <h3 className="text-lg font-medium text-cyan-300">No special considerations</h3>
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
          <DialogContent className="sm:max-w-[625px] bg-gray-800 border-cyan-500/30">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-cyan-300">
                <History className="h-5 w-5 text-cyan-400" />
                Search History
              </DialogTitle>
              <DialogDescription className="text-gray-300">
                View and load previous searches to avoid repeating the same search.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              {historyQuery.isLoading ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-cyan-400 mb-4" />
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
                <div className="text-center p-8 border rounded-md bg-gray-700/50 border-cyan-500/30">
                  <Info className="h-10 w-10 text-cyan-400 mx-auto mb-2" />
                  <h3 className="font-medium text-lg text-cyan-300">No previous searches</h3>
                  <p className="text-sm text-gray-400 mt-1">
                    When you perform permit searches, they will be saved here for easy access later.
                  </p>
                </div>
              ) : (
                <ScrollArea className="h-[min(65vh,400px)] pr-4">
                  <div className="space-y-3">
                    {historyQuery.data.map((item) => (
                      <Card key={item.id} className="hover:bg-cyan-500/10 transition-colors bg-gray-700/50 border-cyan-500/30">
                        <CardHeader className="p-4 pb-2">
                          <CardTitle className="text-base text-cyan-300">{item.title}</CardTitle>
                          <CardDescription className="text-xs text-gray-400">
                            {new Date(item.createdAt).toLocaleDateString()} {new Date(item.createdAt).toLocaleTimeString()}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <span className="font-medium block text-xs text-cyan-300">Address:</span>
                              <span className="text-gray-300 text-xs">{item.address}</span>
                            </div>
                            <div>
                              <span className="font-medium block text-xs text-cyan-300">Type:</span>
                              <span className="text-gray-300 text-xs">{item.projectType}</span>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            className="mt-3 w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700"
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
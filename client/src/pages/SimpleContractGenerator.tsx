import React, { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Database, Eye, FileText, CheckCircle } from "lucide-react";

// Simple 3-step contract generator without complex state management
export default function SimpleContractGenerator() {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [contractData, setContractData] = useState<any>(null);
  const [generatedContract, setGeneratedContract] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  
  const { currentUser } = useAuth();
  const { toast } = useToast();

  // Load projects for step 1
  const loadProjects = useCallback(async () => {
    if (!currentUser?.uid) return;
    
    setIsLoading(true);
    try {
      // Load Firebase projects directly to avoid backend database issues
      const { collection, query, where, getDocs } = await import("firebase/firestore");
      const { db } = await import("@/lib/firebase");
      
      const projectsQuery = query(
        collection(db, "projects"),
        where("userId", "==", currentUser.uid)
      );
      
      const querySnapshot = await getDocs(projectsQuery);
      const allProjects = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Filter approved projects
      const approvedProjects = allProjects.filter(project => 
        project.status === "approved" || project.status === "estimate_ready"
      );
      
      setProjects(approvedProjects);
      console.log(`Loaded ${approvedProjects.length} approved projects`);
    } catch (error) {
      console.error("Error loading projects:", error);
      toast({
        title: "Error",
        description: "Failed to load projects",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [currentUser?.uid, toast]);

  // Load projects when component mounts
  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // Step 1: Select project and move to step 2
  const handleProjectSelect = useCallback(async (project: any) => {
    setIsLoading(true);
    try {
      // Get contract data for the project
      const response = await fetch("/api/projects/contract-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project,
          userId: currentUser?.uid,
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setSelectedProject(project);
        setContractData(result.extractedData);
        setCurrentStep(2); // Move to step 2
        
        toast({
          title: "Project Selected",
          description: `Ready to generate contract for ${project.clientName}`,
        });
      } else {
        throw new Error(result.error || "Failed to load project data");
      }
    } catch (error) {
      console.error("Error selecting project:", error);
      toast({
        title: "Error",
        description: "Failed to load project data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [currentUser?.uid, toast]);

  // Step 2: Generate contract and move to step 3
  const handleGenerateContract = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/generate-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client: {
            name: contractData.clientInfo?.name || selectedProject.clientName,
            address: contractData.clientInfo?.address || "",
            email: contractData.clientInfo?.email || "",
            phone: contractData.clientInfo?.phone || "",
          },
          project: {
            description: contractData.projectDetails?.description || "",
            total: contractData.financials?.total || selectedProject.totalAmount,
          },
          timeline: {
            startDate: new Date().toISOString().split('T')[0],
            endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          },
        }),
      });

      if (response.ok && response.headers.get("content-type")?.includes("application/pdf")) {
        // PDF generated successfully
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `contract_${selectedProject.clientName}_${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        setGeneratedContract("PDF Generated Successfully");
        setCurrentStep(3); // Move to step 3
        
        toast({
          title: "Contract Generated",
          description: "Professional PDF contract downloaded successfully",
        });
      } else {
        throw new Error("Failed to generate contract PDF");
      }
    } catch (error) {
      console.error("Error generating contract:", error);
      toast({
        title: "Error",
        description: "Failed to generate contract",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [contractData, selectedProject, toast]);

  // Reset to start new contract
  const handleNewContract = useCallback(() => {
    setCurrentStep(1);
    setSelectedProject(null);
    setContractData(null);
    setGeneratedContract("");
    loadProjects();
  }, [loadProjects]);

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center text-cyan-400">
          Legal Defense Contract Generator
        </h1>

        {/* Progress Steps */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center space-x-4">
            {[1, 2, 3].map((step) => (
              <div
                key={step}
                className={`flex items-center space-x-2 ${
                  currentStep >= step ? "text-cyan-400" : "text-gray-500"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                    currentStep >= step
                      ? "border-cyan-400 bg-cyan-400 text-black"
                      : "border-gray-500"
                  }`}
                >
                  {step}
                </div>
                <span className="text-sm">
                  {step === 1 && "Select Project"}
                  {step === 2 && "Review & Generate"}
                  {step === 3 && "Download & Complete"}
                </span>
                {step < 3 && <div className="w-8 h-0.5 bg-gray-600"></div>}
              </div>
            ))}
          </div>
        </div>

        {/* Step 1: Project Selection */}
        {currentStep === 1 && (
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-cyan-400">
                <Database className="h-5 w-5" />
                Step 1: Select Project
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {isLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mx-auto"></div>
                    <p className="mt-2 text-gray-400">Loading projects...</p>
                  </div>
                ) : projects.length > 0 ? (
                  <div className="grid gap-4">
                    {projects.slice(0, 10).map((project) => (
                      <div
                        key={project.id}
                        className="border border-gray-600 rounded-lg p-4 hover:border-cyan-400 cursor-pointer transition-colors"
                        onClick={() => handleProjectSelect(project)}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <h3 className="font-semibold text-white">
                              {project.clientName}
                            </h3>
                            <p className="text-gray-400 text-sm">
                              {project.projectType || "Project"} - ${(project.totalAmount / 100).toLocaleString()}
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-cyan-400 text-cyan-400 hover:bg-cyan-400 hover:text-black"
                          >
                            Select
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-400">No approved projects found</p>
                    <Button
                      onClick={loadProjects}
                      className="mt-4 bg-cyan-600 hover:bg-cyan-500"
                    >
                      Refresh Projects
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Review & Generate */}
        {currentStep === 2 && selectedProject && (
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-cyan-400">
                <Eye className="h-5 w-5" />
                Step 2: Review & Generate Contract
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Project Summary */}
                <div className="border border-gray-600 rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-3">Project Summary</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-gray-400">Client:</p>
                      <p className="text-white">{selectedProject.clientName}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Amount:</p>
                      <p className="text-white">${(selectedProject.totalAmount / 100).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Type:</p>
                      <p className="text-white">{selectedProject.projectType || "Construction Project"}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Status:</p>
                      <p className="text-green-400">Ready for Contract</p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button
                    onClick={() => setCurrentStep(1)}
                    variant="outline"
                    className="border-gray-600 text-gray-400 hover:border-gray-500 hover:text-gray-300"
                  >
                    Back to Projects
                  </Button>
                  <Button
                    onClick={handleGenerateContract}
                    disabled={isLoading}
                    className="bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-8"
                  >
                    {isLoading ? "Generating..." : "Generate Contract"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Complete */}
        {currentStep === 3 && (
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-400">
                <CheckCircle className="h-5 w-5" />
                Step 3: Contract Generated Successfully
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center space-y-6">
                <div className="bg-green-900/30 border border-green-400 rounded-lg p-6">
                  <FileText className="h-12 w-12 text-green-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-green-400 mb-2">
                    Contract Ready!
                  </h3>
                  <p className="text-gray-300">
                    Professional legal contract has been generated and downloaded for{" "}
                    <span className="text-white font-semibold">
                      {selectedProject?.clientName}
                    </span>
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button
                    onClick={handleGenerateContract}
                    variant="outline"
                    className="border-green-400 text-green-400 hover:bg-green-400 hover:text-black"
                  >
                    Download Again
                  </Button>
                  <Button
                    onClick={handleNewContract}
                    className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 px-8"
                  >
                    Generate New Contract
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
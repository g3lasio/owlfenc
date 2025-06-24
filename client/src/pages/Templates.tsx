import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getTemplates } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";

interface Template {
  id: string;
  name: string;
  description: string;
  html: string;
  type: "estimate" | "contract";
}

export default function Templates() {
  const [tab, setTab] = useState("estimates");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        setIsLoading(true);
        const type = tab === "estimates" ? "estimate" : "contract";
        const data = await getTemplates(type);
        setTemplates(data as Template[]);
      } catch (error) {
        console.error(`Error fetching ${tab}:`, error);
        toast({
          variant: "destructive",
          title: "Error",
          description: `Failed to load ${tab}.`
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchTemplates();
  }, [tab, toast]);
  
  const handleTabChange = (value: string) => {
    setTab(value);
  };
  
  return (
    <div className="page-container">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Templates</h1>
        <Button>
          <i className="ri-add-line mr-2"></i> New Template
        </Button>
      </div>
      
      <Tabs defaultValue="estimates" value={tab} onValueChange={handleTabChange}>
        <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
          <TabsTrigger value="estimates">Estimates</TabsTrigger>
          <TabsTrigger value="contracts">Contracts</TabsTrigger>
        </TabsList>
        
        <TabsContent value="estimates">
          {isLoading ? (
            <div className="text-center p-8">
              <i className="ri-loader-4-line animate-spin text-2xl"></i>
              <p className="mt-2">Loading estimate templates...</p>
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center p-8 bg-card rounded-lg border border-border">
              <i className="ri-file-list-3-line text-4xl mb-2 text-muted-foreground"></i>
              <h3 className="text-lg font-medium mb-2">No Estimate Templates</h3>
              <p className="text-muted-foreground mb-4">
                You haven't created any estimate templates yet.
              </p>
              <Button>
                <i className="ri-add-line mr-2"></i> Create Template
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {templates.map((template) => (
                <Card key={template.id}>
                  <CardHeader>
                    <CardTitle>{template.name}</CardTitle>
                    <CardDescription>{template.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex space-x-2">
                      <Button size="sm" variant="outline">
                        <i className="ri-eye-line mr-1"></i> Preview
                      </Button>
                      <Button size="sm" variant="outline">
                        <i className="ri-edit-line mr-1"></i> Edit
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="contracts">
          {isLoading ? (
            <div className="text-center p-8">
              <i className="ri-loader-4-line animate-spin text-2xl"></i>
              <p className="mt-2">Loading contract templates...</p>
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center p-8 bg-card rounded-lg border border-border">
              <i className="ri-file-list-3-line text-4xl mb-2 text-muted-foreground"></i>
              <h3 className="text-lg font-medium mb-2">No Contract Templates</h3>
              <p className="text-muted-foreground mb-4">
                You haven't created any contract templates yet.
              </p>
              <Button>
                <i className="ri-add-line mr-2"></i> Create Template
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {templates.map((template) => (
                <Card key={template.id}>
                  <CardHeader>
                    <CardTitle>{template.name}</CardTitle>
                    <CardDescription>{template.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex space-x-2">
                      <Button size="sm" variant="outline">
                        <i className="ri-eye-line mr-1"></i> Preview
                      </Button>
                      <Button size="sm" variant="outline">
                        <i className="ri-edit-line mr-1"></i> Edit
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

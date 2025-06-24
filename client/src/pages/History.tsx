import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { getProjects } from "@/lib/firebase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

interface Project {
  id: string;
  clientName: string;
  address: string;
  fenceType: string;
  createdAt: { toDate: () => Date };
  projectType: string;
}

export default function History() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setIsLoading(true);
        const data = await getProjects();
        setProjects(data as Project[]);
      } catch (error) {
        console.error("Error fetching projects:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load project history."
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchProjects();
  }, [toast]);
  
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  };
  
  if (isLoading) {
    return (
      <div className="page-container">
        <h1 className="text-2xl font-bold mb-6">Project History</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-3 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-3 w-full mb-2" />
                <Skeleton className="h-3 w-3/4 mb-2" />
                <Skeleton className="h-3 w-2/3" />
                <div className="flex justify-end mt-4">
                  <Skeleton className="h-8 w-20" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }
  
  if (projects.length === 0) {
    return (
      <div className="flex-1 p-6 flex flex-col items-center justify-center text-center">
        <div className="rounded-full bg-muted p-6 mb-4">
          <i className="ri-file-list-3-line text-4xl text-muted-foreground"></i>
        </div>
        <h2 className="text-xl font-semibold mb-2">No Projects Yet</h2>
        <p className="text-muted-foreground mb-6 max-w-md">
          You haven't created any estimates or contracts yet. Start by creating a new estimate.
        </p>
        <Link href="/">
          <Button>
            <i className="ri-add-line mr-2"></i> Create New Estimate
          </Button>
        </Link>
      </div>
    );
  }
  
  return (
    <div className="page-container">
      <h1 className="text-2xl font-bold mb-6">Project History</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => (
          <Card key={project.id}>
            <CardHeader className="pb-2">
              <CardTitle>{project.clientName}</CardTitle>
              <CardDescription className="flex items-center">
                <i className="ri-calendar-line mr-1"></i>
                {formatDate(project.createdAt.toDate())}
                <span className="ml-2 bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full">
                  {project.projectType}
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm mb-1">
                <span className="font-medium">Address:</span> {project.address}
              </p>
              <p className="text-sm mb-1">
                <span className="font-medium">Fence Type:</span> {project.fenceType}
              </p>
              <p className="text-sm text-muted-foreground">
                ID: {project.id}
              </p>
              <div className="flex justify-end mt-4">
                <Button size="sm" variant="outline">
                  <i className="ri-file-text-line mr-1"></i> View
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

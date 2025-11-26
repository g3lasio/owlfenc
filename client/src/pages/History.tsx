import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";

interface Project {
  id: string;
  clientName: string;
  clientEmail?: string;
  address: string;
  projectType: string;
  projectDescription?: string;
  totalPrice?: number;
  status: string;
  createdAt: any;
  estimateNumber?: string;
}

export default function History() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { currentUser, loading: authLoading } = useAuth();
  
  useEffect(() => {
    const fetchProjects = async () => {
      if (!currentUser?.uid) {
        await new Promise(resolve => setTimeout(resolve, 500));
        
        if (!currentUser?.uid) {
          setIsLoading(false);
          return;
        }
      }

      try {
        setIsLoading(true);
        
        console.log("📋 [HISTORY] Loading estimates for user:", currentUser.uid);
        
        const estimatesQuery = query(
          collection(db, "estimates"),
          where("firebaseUserId", "==", currentUser.uid)
        );

        const estimatesSnapshot = await getDocs(estimatesQuery);
        console.log(`📊 [HISTORY] Found ${estimatesSnapshot.size} estimates`);
        
        const estimatesData = estimatesSnapshot.docs.map((doc) => {
          const data = doc.data();

          const clientName =
            data.clientInformation?.name ||
            data.clientName ||
            data.client?.name ||
            "Cliente sin nombre";

          const clientEmail =
            data.clientInformation?.email ||
            data.clientEmail ||
            data.client?.email ||
            "";

          let totalValue =
            data.projectTotalCosts?.totalSummary?.finalTotal ||
            data.projectTotalCosts?.total ||
            data.total ||
            data.estimateAmount ||
            0;

          if (totalValue > 10000 && Number.isInteger(totalValue)) {
            totalValue = totalValue / 100;
          }

          const projectTitle =
            data.projectDetails?.name ||
            data.projectName ||
            data.title ||
            `Estimado para ${clientName}`;

          const address =
            data.clientInformation?.address ||
            data.clientAddress ||
            data.client?.address ||
            data.address ||
            "Dirección no especificada";

          return {
            id: doc.id,
            clientName: clientName,
            clientEmail: clientEmail,
            address: address,
            projectType: data.projectType || data.projectDetails?.type || "Construction",
            projectDescription: data.projectDescription || data.description || projectTitle,
            totalPrice: totalValue,
            status: data.status || "estimate",
            createdAt: data.createdAt,
            estimateNumber: data.estimateNumber || `EST-${doc.id.slice(-6)}`,
          };
        });

        estimatesData.sort((a, b) => {
          const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
          const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
          return dateB.getTime() - dateA.getTime();
        });

        console.log(`✅ [HISTORY] Loaded ${estimatesData.length} estimates successfully`);
        setProjects(estimatesData);
      } catch (error) {
        console.error("Error fetching estimates:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load project history."
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    if (currentUser && !authLoading) {
      fetchProjects();
    }
  }, [currentUser, authLoading, toast]);
  
  const formatDate = (date: any) => {
    try {
      if (date && typeof date.toDate === 'function') {
        return new Intl.DateTimeFormat('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        }).format(date.toDate());
      }
      
      const dateObj = date instanceof Date ? date : new Date(date);
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }).format(dateObj);
    } catch (e) {
      return "Date unavailable";
    }
  };

  const formatPrice = (price?: number) => {
    if (!price) return "N/A";
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <Badge variant="secondary">Draft</Badge>;
      case "sent":
        return <Badge className="bg-blue-500">Sent</Badge>;
      case "approved":
        return <Badge className="bg-green-500">Approved</Badge>;
      case "completed":
        return <Badge className="bg-purple-500">Completed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  if (isLoading) {
    return (
      <div className="page-container p-4 sm:p-6">
        <h1 className="text-2xl font-bold mb-6">Project History</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} data-testid={`skeleton-card-${i}`}>
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
        <h2 className="text-xl font-semibold mb-2" data-testid="text-no-projects">No Projects Yet</h2>
        <p className="text-muted-foreground mb-6 max-w-md">
          You haven't created any estimates or contracts yet. Start by creating a new estimate.
        </p>
        <Link href="/estimates">
          <Button data-testid="button-create-estimate">
            <i className="ri-add-line mr-2"></i> Create New Estimate
          </Button>
        </Link>
      </div>
    );
  }
  
  return (
    <div className="page-container p-4 sm:p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Project History</h1>
        <Badge variant="outline" className="text-sm" data-testid="badge-project-count">
          {projects.length} project{projects.length !== 1 ? 's' : ''}
        </Badge>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => (
          <Card key={project.id} data-testid={`card-project-${project.id}`} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <CardTitle className="text-lg" data-testid={`text-client-name-${project.id}`}>
                  {project.clientName}
                </CardTitle>
                {getStatusBadge(project.status)}
              </div>
              <CardDescription className="flex items-center gap-2">
                <i className="ri-calendar-line"></i>
                {formatDate(project.createdAt)}
                <span className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full">
                  {project.projectType}
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm mb-1" data-testid={`text-address-${project.id}`}>
                <span className="font-medium">Address:</span> {project.address}
              </p>
              {project.totalPrice && project.totalPrice > 0 && (
                <p className="text-sm mb-1 text-green-600 font-semibold" data-testid={`text-total-${project.id}`}>
                  <span className="font-medium">Total:</span> {formatPrice(project.totalPrice)}
                </p>
              )}
              <p className="text-sm text-muted-foreground" data-testid={`text-estimate-number-${project.id}`}>
                {project.estimateNumber}
              </p>
              <div className="flex justify-end mt-4 gap-2">
                <Link href={`/estimates?edit=${project.id}`}>
                  <Button size="sm" variant="outline" data-testid={`button-view-${project.id}`}>
                    <i className="ri-file-text-line mr-1"></i> View
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

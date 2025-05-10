import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { 
  FileText, 
  LayoutDashboard, 
  Users, 
  Home as HomeIcon, 
  CheckSquare, 
  FileCheck, 
  ClipboardCheck, 
  CircleDollarSign, 
  BarChart, 
  MessagesSquare,
  CalendarClock,
  Code
} from "lucide-react";

export default function Home() {
  const { currentUser } = useAuth();
  const [userName, setUserName] = useState("");
  const [recentContracts, setRecentContracts] = useState(0);
  const [pendingContracts, setPendingContracts] = useState(0);
  const currentHour = new Date().getHours();
  
  const greeting = currentHour < 12 
    ? "Buenos días" 
    : currentHour < 18 
      ? "Buenas tardes" 
      : "Buenas noches";

  useEffect(() => {
    if (currentUser && currentUser.displayName) {
      setUserName(currentUser.displayName);
    }
    
    // Datos de ejemplo para la demostración
    setRecentContracts(3);
    setPendingContracts(2);
  }, [currentUser]);

  return (
    <div className="container mx-auto space-y-8 py-8">
      {/* Sección de cabecera con resumen */}
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-4xl font-bold">{greeting}, {userName || "Usuario"}</h1>
            <p className="text-muted-foreground mt-2">Plataforma de gestión de contratos y proyectos para cercas</p>
          </div>
          <div className="flex gap-3">
            <Link href="/mervin">
              <Button size="lg" className="gap-2">
                <MessagesSquare className="w-5 h-5" />
                Hablar con Mervin
              </Button>
            </Link>
            <Link href="/projects/new">
              <Button variant="outline" size="lg" className="gap-2">
                <FileText className="w-5 h-5" />
                Nuevo Contrato
              </Button>
            </Link>
          </div>
        </div>
      </div>
      
      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-200 dark:border-blue-900">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="text-blue-500" />
              Contratos Activos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{recentContracts}</p>
            <p className="text-sm text-muted-foreground">Contratos en proceso</p>
          </CardContent>
          <CardFooter>
            <Link href="/projects">
              <Button variant="ghost" size="sm" className="text-blue-600 dark:text-blue-400">Ver todos</Button>
            </Link>
          </CardFooter>
        </Card>
        
        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-200 dark:border-amber-900">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <CalendarClock className="text-amber-500" />
              Pendientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{pendingContracts}</p>
            <p className="text-sm text-muted-foreground">Contratos por aprobar</p>
          </CardContent>
          <CardFooter>
            <Link href="/projects?status=pending">
              <Button variant="ghost" size="sm" className="text-amber-600 dark:text-amber-400">Revisar</Button>
            </Link>
          </CardFooter>
        </Card>
        
        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-200 dark:border-green-900">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileCheck className="text-green-500" />
              Verificaciones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">8</p>
            <p className="text-sm text-muted-foreground">Verificaciones realizadas</p>
          </CardContent>
          <CardFooter>
            <Link href="/property-verifier">
              <Button variant="ghost" size="sm" className="text-green-600 dark:text-green-400">Verificar propiedad</Button>
            </Link>
          </CardFooter>
        </Card>
        
        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-200 dark:border-purple-900">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <ClipboardCheck className="text-purple-500" />
              Permisos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">5</p>
            <p className="text-sm text-muted-foreground">Consultas de permisos</p>
          </CardContent>
          <CardFooter>
            <Link href="/permit-advisor">
              <Button variant="ghost" size="sm" className="text-purple-600 dark:text-purple-400">Consultar</Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
      
      {/* Funcionalidades principales */}
      <h2 className="text-2xl font-bold mt-8 mb-4">Acciones Rápidas</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Tarjeta principal para Contratos */}
        <Card className="md:col-span-1 hover:shadow-lg transition-all duration-300 hover:border-primary/50 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <FileText className="text-primary h-6 w-6" />
              Gestión de Contratos
            </CardTitle>
            <CardDescription>
              Herramientas para contratos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Link href="/projects/new">
                <Button variant="outline" className="w-full justify-start gap-2 py-6">
                  <FileText className="h-5 w-5" />
                  Crear Nuevo Contrato
                </Button>
              </Link>
              <Link href="/mervin">
                <Button variant="outline" className="w-full justify-start gap-2 py-6">
                  <MessagesSquare className="h-5 w-5" />
                  Generar con Mervin
                </Button>
              </Link>
              <Link href="/projects">
                <Button variant="outline" className="w-full justify-start gap-2 py-6">
                  <LayoutDashboard className="h-5 w-5" />
                  Administrar Contratos
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
        
        {/* Tarjeta para Verificación y Permisos */}
        <Card className="md:col-span-1 hover:shadow-lg transition-all duration-300 hover:border-blue-400/50 bg-gradient-to-br from-blue-500/5 to-transparent">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <FileCheck className="text-blue-500 h-6 w-6" />
              Verificación y Permisos
            </CardTitle>
            <CardDescription>
              Herramientas de validación
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Link href="/property-verifier">
                <Button variant="outline" className="w-full justify-start gap-2 py-6">
                  <HomeIcon className="h-5 w-5" />
                  Verificar Propiedad
                </Button>
              </Link>
              <Link href="/permit-advisor">
                <Button variant="outline" className="w-full justify-start gap-2 py-6">
                  <ClipboardCheck className="h-5 w-5" />
                  Asesor de Permisos
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
        
        {/* Tarjeta para Herramientas Avanzadas */}
        <Card className="md:col-span-1 hover:shadow-lg transition-all duration-300 hover:border-purple-400/50 bg-gradient-to-br from-purple-500/5 to-transparent">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <BarChart className="text-purple-500 h-6 w-6" />
              Herramientas Avanzadas
            </CardTitle>
            <CardDescription>
              Funcionalidades especiales
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Link href="/ai-project-manager">
                <Button variant="outline" className="w-full justify-start gap-2 py-6">
                  <LayoutDashboard className="h-5 w-5" />
                  AI Project Manager
                </Button>
              </Link>
              <Link href="/ar-fence-estimator">
                <Button variant="outline" className="w-full justify-start gap-2 py-6">
                  <Code className="h-5 w-5" />
                  AR Fence Estimator
                </Button>
              </Link>
              <Link href="/clients">
                <Button variant="outline" className="w-full justify-start gap-2 py-6">
                  <Users className="h-5 w-5" />
                  Gestión de Clientes
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

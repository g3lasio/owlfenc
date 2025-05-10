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
        </div>
      </div>
      
      {/* Tarjeta de presentación de Mervin */}
      <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-200 dark:border-blue-900 rounded-xl p-6 shadow-md">
        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="flex-shrink-0">
            <div className="w-28 h-28 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
              <MessagesSquare className="w-14 h-14 text-blue-500" />
            </div>
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold mb-2">Mervin AI - Tu Asistente Virtual</h2>
            <p className="text-muted-foreground mb-4">Mervin puede ayudarte con todas tus tareas de gestión de cercas:</p>
            
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-4">
              <div className="bg-white dark:bg-slate-800 rounded-lg p-3 text-center border border-blue-100 dark:border-blue-900">
                <FileText className="h-5 w-5 mx-auto mb-1 text-blue-500" />
                <p className="text-sm font-medium">Contratos</p>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-lg p-3 text-center border border-blue-100 dark:border-blue-900">
                <HomeIcon className="h-5 w-5 mx-auto mb-1 text-green-500" />
                <p className="text-sm font-medium">Propiedades</p>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-lg p-3 text-center border border-blue-100 dark:border-blue-900">
                <ClipboardCheck className="h-5 w-5 mx-auto mb-1 text-purple-500" />
                <p className="text-sm font-medium">Permisos</p>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-lg p-3 text-center border border-blue-100 dark:border-blue-900">
                <Users className="h-5 w-5 mx-auto mb-1 text-amber-500" />
                <p className="text-sm font-medium">Clientes</p>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-lg p-3 text-center border border-blue-100 dark:border-blue-900">
                <CircleDollarSign className="h-5 w-5 mx-auto mb-1 text-emerald-500" />
                <p className="text-sm font-medium">Facturación</p>
              </div>
            </div>
            
            <Link href="/mervin">
              <Button size="lg" className="gap-2 w-full md:w-auto">
                <MessagesSquare className="w-5 h-5" />
                Hablar con Mervin
              </Button>
            </Link>
          </div>
        </div>
      </div>
      
      {/* Acciones rápidas simplificadas */}
      <h2 className="text-2xl font-bold mt-8 mb-4">Accesos Directos</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link href="/projects/new">
          <Card className="hover:shadow-md transition-all duration-300 hover:border-primary/50 h-full">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="bg-primary/10 p-3 rounded-full">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-medium text-lg">Nuevo Contrato</h3>
                <p className="text-muted-foreground text-sm">Crear contrato manualmente</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        
        <Link href="/property-verifier">
          <Card className="hover:shadow-md transition-all duration-300 hover:border-green-500/50 h-full">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="bg-green-500/10 p-3 rounded-full">
                <HomeIcon className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <h3 className="font-medium text-lg">Verificar Propiedad</h3>
                <p className="text-muted-foreground text-sm">Consultar información catastral</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        
        <Link href="/clients">
          <Card className="hover:shadow-md transition-all duration-300 hover:border-amber-500/50 h-full">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="bg-amber-500/10 p-3 rounded-full">
                <Users className="h-6 w-6 text-amber-500" />
              </div>
              <div>
                <h3 className="font-medium text-lg">Clientes</h3>
                <p className="text-muted-foreground text-sm">Gestionar base de clientes</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}

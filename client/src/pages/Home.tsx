import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { MessagesSquare } from "lucide-react";

export default function Home() {
  const { currentUser } = useAuth();
  const [userName, setUserName] = useState("");
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
      
      {/* Tarjeta de presentación de Mervin - Simplificada */}
      <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-200 dark:border-blue-900 rounded-xl p-6 shadow-md">
        <div className="flex flex-col items-center text-center">
          <div className="w-28 h-28 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mb-4">
            <MessagesSquare className="w-14 h-14 text-blue-500" />
          </div>
          
          <h2 className="text-2xl font-bold mb-2">Mervin AI - Tu Asistente Virtual</h2>
          <p className="text-muted-foreground mb-6 max-w-2xl">
            Mervin puede ayudarte con todas tus tareas de gestión de cercas, incluyendo contratos, 
            verificación de propiedades, permisos, gestión de clientes y facturación.
          </p>
          
          <Link href="/mervin">
            <Button size="lg" className="gap-2 px-8">
              <MessagesSquare className="w-5 h-5" />
              Hablar con Mervin
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

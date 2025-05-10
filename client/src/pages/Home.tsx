import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useAuth } from "@/contexts/AuthContext";

export default function Home() {
  const { currentUser } = useAuth();
  const [userName, setUserName] = useState("");

  useEffect(() => {
    if (currentUser && currentUser.displayName) {
      setUserName(currentUser.displayName);
    }
  }, [currentUser]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">Bienvenido, {userName || "Usuario"}</h1>
      <p className="text-muted-foreground">¿Qué te gustaría hacer hoy?</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
        {/* Tarjeta para acceder a Mervin */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle>Consultar a Mervin</CardTitle>
            <CardDescription>
              Asistente para contratos y permisos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm mb-4">Genera contratos, verifica permisos y responde preguntas sobre regulaciones de cercas.</p>
            <Link href="/mervin">
              <Button className="w-full">Hablar con Mervin</Button>
            </Link>
          </CardContent>
        </Card>
        
        {/* Tarjeta para Verificación de Propiedad */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle>Verificación de Propiedad</CardTitle>
            <CardDescription>
              Verifica la propiedad de inmuebles
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm mb-4">Consulta datos de propiedad, historial de transacciones y verifica propietarios.</p>
            <Link href="/property-verifier">
              <Button className="w-full" variant="outline">Verificar Propiedad</Button>
            </Link>
          </CardContent>
        </Card>
        
        {/* Tarjeta para Permit Advisor */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle>Mervin Permit Advisor</CardTitle>
            <CardDescription>
              Asistente especializado para permisos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm mb-4">Consulta requisitos, normativas y procesos para obtener permisos de construcción.</p>
            <Link href="/permit-advisor">
              <Button className="w-full" variant="outline">Asesor de Permisos</Button>
            </Link>
          </CardContent>
        </Card>
        
        {/* Tarjeta para Proyectos */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle>Gestión de Proyectos</CardTitle>
            <CardDescription>
              Administra tus proyectos y clientes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm mb-4">Crea y gestiona proyectos, da seguimiento y administra tus clientes.</p>
            <div className="flex gap-2">
              <Link href="/projects">
                <Button className="flex-1" variant="outline">Proyectos</Button>
              </Link>
              <Link href="/clients">
                <Button className="flex-1" variant="outline">Clientes</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
        
        {/* Tarjeta para AI Project Manager */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle>AI Project Manager</CardTitle>
            <CardDescription>
              Gestión inteligente de proyectos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm mb-4">Optimiza la planificación y seguimiento de proyectos con IA.</p>
            <Link href="/ai-project-manager">
              <Button className="w-full" variant="outline">AI Manager</Button>
            </Link>
          </CardContent>
        </Card>
        
        {/* Tarjeta para AR Fence Estimator */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle>AR Fence Estimator</CardTitle>
            <CardDescription>
              Estimación de cercas con realidad aumentada
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm mb-4">Visualiza y estima proyectos de cercas con realidad aumentada.</p>
            <Link href="/ar-fence-estimator">
              <Button className="w-full" variant="outline">AR Estimator</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

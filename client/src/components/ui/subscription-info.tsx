import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Link } from "wouter";
import { Button } from "./button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./card";
import { Badge } from "./badge";

interface SubscriptionPlan {
  id: number;
  name: string;
  description: string;
  price: number;
  yearlyPrice: number;
  features: string[];
  motto: string;
  code: string;
  isActive: boolean;
}

interface SubscriptionInfoProps {
  showHeader?: boolean;
  showFeatures?: boolean;
  compact?: boolean;
}

export function SubscriptionInfo({ 
  showHeader = true, 
  showFeatures = true,
  compact = false 
}: SubscriptionInfoProps) {
  const [isLoading, setIsLoading] = useState(false);
  
  // Obtenemos los planes disponibles
  const { data: plans } = useQuery<SubscriptionPlan[]>({
    queryKey: ["/api/subscription/plans"],
    throwOnError: false,
  });

  // Obtenemos la información de la suscripción actual del usuario
  const { data: userSubscription, isLoading: isLoadingUserSubscription } = useQuery({
    queryKey: ["/api/subscription/user-subscription"],
    throwOnError: false,
  });

  // Crear portal de cliente para gestionar la suscripción
  const createCustomerPortal = async () => {
    setIsLoading(true);

    try {
      const params = {
        successUrl: window.location.origin + "/settings/account",
      };
      
      const response = await fetch("/api/subscription/create-portal", {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });
      
      if (!response.ok) {
        throw new Error("No se pudo acceder al portal de cliente");
      }
      
      const data = await response.json();
      
      if (data && data.url) {
        window.location.replace(data.url);
      } else {
        throw new Error("No se recibió URL válida del portal de cliente");
      }
    } catch (error) {
      console.error("Error al crear portal de cliente:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Comprobar si el usuario ya tiene una suscripción activa
  const hasActiveSubscription = userSubscription && 
    ["active", "trialing"].includes(userSubscription.status);

  // Si está cargando, muestra un indicador
  if (isLoadingUserSubscription) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-center items-center p-4">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="ml-2">Cargando información de suscripción...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Si no hay suscripción activa
  if (!hasActiveSubscription) {
    return (
      <Card>
        {showHeader && (
          <CardHeader>
            <CardTitle>Estado de Suscripción</CardTitle>
            <CardDescription>No tienes una suscripción activa actualmente.</CardDescription>
          </CardHeader>
        )}
        <CardContent className={compact ? "pt-2" : ""}>
          <div className="p-4 bg-muted rounded-md text-center">
            <p className="mb-4">
              Mejora a un plan premium para acceder a todas las funcionalidades de Owl Fence.
            </p>
            <Link href="/subscription">
              <Button>Ver planes disponibles</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Si hay una suscripción activa
  const currentPlan = plans?.find(p => p.id === userSubscription.planId);
  
  return (
    <Card className="border-primary/20">
      {showHeader && (
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Estado de Suscripción</CardTitle>
              <CardDescription>Detalles de tu plan actual</CardDescription>
            </div>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
              {userSubscription.status === "active" ? "Activa" : 
               userSubscription.status === "trialing" ? "En prueba" : 
               "Inactiva"}
            </Badge>
          </div>
        </CardHeader>
      )}
      <CardContent className={compact ? "pt-2" : ""}>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-lg">
                {currentPlan?.name || "Plan desconocido"}
              </h3>
              <p className="text-muted-foreground text-sm">
                Facturación {userSubscription.billingCycle === "yearly" ? "anual" : "mensual"}
              </p>
            </div>
            <div className="text-right">
              <div className="text-xl font-bold">
                ${userSubscription.billingCycle === "yearly" 
                  ? (currentPlan?.yearlyPrice || 0).toFixed(2) 
                  : (currentPlan?.price || 0).toFixed(2)}
              </div>
              <div className="text-sm text-muted-foreground">
                {userSubscription.billingCycle === "yearly" ? "/año" : "/mes"}
              </div>
            </div>
          </div>
          
          {showFeatures && currentPlan?.features && (
            <div className="pt-4 border-t">
              <h4 className="font-medium mb-2">Funcionalidades incluidas:</h4>
              <ul className="space-y-1">
                {currentPlan.features.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-primary mr-2">✓</span>
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          onClick={createCustomerPortal} 
          disabled={isLoading}
          variant="outline"
          className="w-full"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Administrar suscripción
        </Button>
      </CardFooter>
    </Card>
  );
}
/**
 * 🔄 MIGRATION PAGE
 * Página dedicada para manejar la migración de Firebase a Clerk
 */

import React from 'react';
import { useUser } from '@clerk/clerk-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import MigrationManager from '@/components/migration/MigrationManager';

const MigrationPage: React.FC = () => {
  const { user, isLoaded } = useUser();

  if (!isLoaded) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando sistema de migración...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>🔐 Autenticación Requerida</CardTitle>
            <CardDescription>
              Debes estar autenticado para acceder al sistema de migración
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertDescription>
                Por favor, inicia sesión con Clerk para continuar con la migración de datos.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">🔄 Migración de Datos</h1>
        <p className="text-gray-600">
          Sistema de migración de Firebase a Clerk para preservar todos tus datos existentes.
        </p>
      </div>

      <div className="space-y-6">
        {/* Información del usuario actual */}
        <Card>
          <CardHeader>
            <CardTitle>👤 Usuario Actual</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <strong>Clerk ID:</strong> {user.id}
              </div>
              <div>
                <strong>Email:</strong> {user.primaryEmailAddress?.emailAddress}
              </div>
              <div>
                <strong>Nombre:</strong> {user.firstName} {user.lastName}
              </div>
              <div>
                <strong>Verificado:</strong> {user.primaryEmailAddress?.verification?.status === 'verified' ? 'Sí' : 'No'}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Información sobre la migración */}
        <Card>
          <CardHeader>
            <CardTitle>📋 Información de Migración</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="p-3 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-800 mb-2">¿Qué se migra?</h4>
                <ul className="list-disc list-inside text-blue-700 space-y-1">
                  <li>Proyectos de cercas y estimados</li>
                  <li>Datos de perfil de usuario</li>
                  <li>Configuraciones de suscripción</li>
                  <li>Historial de contratos</li>
                </ul>
              </div>
              
              <div className="p-3 bg-green-50 rounded-lg">
                <h4 className="font-medium text-green-800 mb-2">¿Es seguro?</h4>
                <ul className="list-disc list-inside text-green-700 space-y-1">
                  <li>Los datos originales se mantienen como respaldo</li>
                  <li>Migración verificada antes de completar</li>
                  <li>Proceso reversible en caso de problemas</li>
                </ul>
              </div>
              
              <div className="p-3 bg-orange-50 rounded-lg">
                <h4 className="font-medium text-orange-800 mb-2">Proceso</h4>
                <ul className="list-disc list-inside text-orange-700 space-y-1">
                  <li>1. Auditoría de datos existentes</li>
                  <li>2. Mapeo de Firebase UID a Clerk ID</li>
                  <li>3. Migración de datos por lotes</li>
                  <li>4. Verificación de integridad</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Componente principal de migración */}
        <MigrationManager />
      </div>
    </div>
  );
};

export default MigrationPage;
/**
 * 🔄 MIGRATION MANAGER COMPONENT
 * Componente para manejar la migración de Firebase a Clerk
 */

import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
// import { Badge } from '@/components/ui/badge'; // TODO: Create Badge component
import { useMigrationFromFirebase } from '@/lib/migration-clerk';
// Firebase transition imports removed - using Clerk now

interface MigrationStatus {
  needed: boolean;
  inProgress: boolean;
  completed: boolean;
  error?: string;
  projectsToMigrate: number;
  migratedCount: number;
}

export const MigrationManager: React.FC = () => {
  const { user } = useUser();
  const { migrateUserData, checkMigrationNeeded } = useMigrationFromFirebase();
  
  const [migrationStatus, setMigrationStatus] = useState<MigrationStatus>({
    needed: false,
    inProgress: false,
    completed: false,
    projectsToMigrate: 0,
    migratedCount: 0
  });

  const [auditData, setAuditData] = useState<any>(null);

  // Verificar si necesita migración al cargar
  useEffect(() => {
    if (user) {
      checkMigration();
    }
  }, [user]);

  const checkMigration = async () => {
    try {
      // Verificar datos locales
      const localCheck = detectMigrationNeeded();
      
      // Verificar datos en servidor
      const serverCheck = await checkMigrationNeeded();
      
      setMigrationStatus(prev => ({
        ...prev,
        needed: localCheck.needed || serverCheck.needed,
        projectsToMigrate: localCheck.projectsToMigrate?.length || 0
      }));
      
    } catch (error) {
      console.error('❌ [MIGRATION-UI] Error verificando migración:', error);
    }
  };

  const runAudit = async () => {
    try {
      console.log('🔍 [MIGRATION-UI] Ejecutando auditoría...');
      
      const response = await fetch('/api/migration/audit', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        setAuditData(result.data);
        console.log('✅ [MIGRATION-UI] Auditoría completada:', result.data);
      } else {
        throw new Error(`Error en auditoría: ${response.statusText}`);
      }
      
    } catch (error) {
      console.error('❌ [MIGRATION-UI] Error en auditoría:', error);
      setMigrationStatus(prev => ({
        ...prev,
        error: `Error en auditoría: ${error instanceof Error ? error.message : 'Error desconocido'}`
      }));
    }
  };

  const runMigration = async () => {
    if (!user) return;
    
    try {
      setMigrationStatus(prev => ({ ...prev, inProgress: true, error: undefined }));
      
      console.log('🔄 [MIGRATION-UI] Iniciando migración para usuario:', user.id);
      
      // Intentar migración automática primero
      const autoResult = await autoMigrateOnLogin(user.id);
      
      if (autoResult.success && autoResult.migrated > 0) {
        setMigrationStatus(prev => ({
          ...prev,
          inProgress: false,
          completed: true,
          migratedCount: autoResult.migrated
        }));
        return;
      }
      
      // Si no hay datos locales, intentar migración desde Firebase
      const firebaseUid = localStorage.getItem('firebase_user_id');
      if (firebaseUid) {
        const result = await migrateUserData(firebaseUid);
        
        setMigrationStatus(prev => ({
          ...prev,
          inProgress: false,
          completed: true,
          migratedCount: result.data?.projects + result.data?.estimates || 0
        }));
      } else {
        setMigrationStatus(prev => ({
          ...prev,
          inProgress: false,
          error: 'No se encontró Firebase UID para migración'
        }));
      }
      
    } catch (error) {
      console.error('❌ [MIGRATION-UI] Error en migración:', error);
      setMigrationStatus(prev => ({
        ...prev,
        inProgress: false,
        error: `Error en migración: ${error instanceof Error ? error.message : 'Error desconocido'}`
      }));
    }
  };

  const resetMigration = () => {
    setMigrationStatus({
      needed: false,
      inProgress: false,
      completed: false,
      projectsToMigrate: 0,
      migratedCount: 0
    });
    setAuditData(null);
  };

  if (!user) {
    return (
      <Alert>
        <AlertDescription>
          Debes estar autenticado para acceder al sistema de migración.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🔄 Migración Firebase → Clerk
            {migrationStatus.completed && <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">Completada</span>}
            {migrationStatus.inProgress && <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">En Progreso</span>}
            {migrationStatus.needed && !migrationStatus.completed && <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs">Pendiente</span>}
          </CardTitle>
          <CardDescription>
            Sistema de migración de datos de Firebase a Clerk para el usuario: {user.primaryEmailAddress?.emailAddress}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Estado actual */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium">Estado de Migración</h4>
              <div className="text-sm space-y-1">
                <div>✅ Clerk Usuario: {user.id}</div>
                <div>
                  🔒 Autenticado: {user.primaryEmailAddress?.verification?.status === 'verified' ? 'Sí' : 'Pendiente'}
                </div>
                <div>
                  📊 Proyectos locales: {migrationStatus.projectsToMigrate}
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium">Progreso</h4>
              {migrationStatus.inProgress && (
                <Progress value={50} className="w-full" />
              )}
              {migrationStatus.completed && (
                <div className="text-sm text-green-600">
                  ✅ {migrationStatus.migratedCount} elementos migrados
                </div>
              )}
            </div>
          </div>

          {/* Acciones */}
          <div className="flex gap-3">
            <Button 
              onClick={runAudit}
              variant="outline"
              disabled={migrationStatus.inProgress}
            >
              🔍 Auditar Datos
            </Button>
            
            <Button 
              onClick={runMigration}
              disabled={migrationStatus.inProgress || migrationStatus.completed}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {migrationStatus.inProgress ? '🔄 Migrando...' : '🚀 Iniciar Migración'}
            </Button>
            
            {migrationStatus.completed && (
              <Button 
                onClick={resetMigration}
                variant="outline"
              >
                🔄 Reiniciar
              </Button>
            )}
          </div>

          {/* Errores */}
          {migrationStatus.error && (
            <Alert variant="destructive">
              <AlertDescription>
                ❌ {migrationStatus.error}
              </AlertDescription>
            </Alert>
          )}

          {/* Datos de auditoría */}
          {auditData && (
            <Card>
              <CardHeader>
                <CardTitle>📊 Resultados de Auditoría</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <strong>Total de usuarios:</strong> {auditData.totalUsers}
                  </div>
                  <div>
                    <strong>Total de proyectos:</strong> {auditData.totalProjects}
                  </div>
                  <div>
                    <strong>Total de estimates:</strong> {auditData.totalEstimates}
                  </div>
                  <div>
                    <strong>Proyectos sin usuario:</strong> {auditData.dataBreakdown?.projectsWithoutUsers || 0}
                  </div>
                </div>
                
                {auditData.usersWithData && auditData.usersWithData.length > 0 && (
                  <div className="mt-4">
                    <h5 className="font-medium mb-2">Usuarios con datos:</h5>
                    <div className="max-h-32 overflow-y-auto text-xs space-y-1">
                      {auditData.usersWithData.slice(0, 5).map((userData: any, index: number) => (
                        <div key={index} className="bg-gray-50 p-2 rounded">
                          <strong>UID:</strong> {userData.firebaseUid}<br/>
                          <strong>Proyectos:</strong> {userData.projects.length} | 
                          <strong> Estimates:</strong> {userData.estimates.length}
                        </div>
                      ))}
                      {auditData.usersWithData.length > 5 && (
                        <div className="text-gray-500">
                          ... y {auditData.usersWithData.length - 5} usuarios más
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MigrationManager;
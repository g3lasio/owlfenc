/**
 * Componente para mostrar estadísticas del sistema global de DeepSearch
 * Muestra el impacto colaborativo y la mejora continua del sistema
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Globe, 
  TrendingUp, 
  Users, 
  Recycle, 
  Brain, 
  Target,
  BarChart3,
  MapPin,
  Lightbulb
} from 'lucide-react';

interface GlobalStats {
  totalLists: number;
  totalReuses: number;
  uniqueRegions: number;
  uniqueProjectTypes: number;
  avgGlobalConfidence: number;
  savedGenerations: number;
}

interface ProjectTypeStats {
  projectType: string;
  totalProjects: number;
  totalUsage: number;
  avgConfidence: number;
  regionsCovered: number;
}

interface TopReused {
  projectType: string;
  region: string;
  usageCount: number;
  confidence: number;
  projectDescription: string;
}

interface DeepSearchStatsData {
  global: GlobalStats;
  byProjectType: ProjectTypeStats[];
  topReused: TopReused[];
  collaborativeMetrics: {
    reuseRate: number;
    crossRegionalProjects: number;
    averageRegionsPerProject: number;
  };
}

export function DeepSearchGlobalStats() {
  const [stats, setStats] = useState<DeepSearchStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/deepsearch/cache-stats');
      
      if (!response.ok) {
        throw new Error('Error fetching stats');
      }

      const data = await response.json();
      setStats(data.stats);
    } catch (err) {
      console.error('Error loading DeepSearch stats:', err);
      setError('Error loading statistics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Sistema Global DeepSearch
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !stats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <Globe className="h-5 w-5" />
            Error del Sistema
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-600">{error || 'No se pudieron cargar las estadísticas'}</p>
        </CardContent>
      </Card>
    );
  }

  const { global, byProjectType, topReused, collaborativeMetrics } = stats;

  return (
    <div className="space-y-6">
      {/* Métricas Globales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Listas Totales</p>
                <p className="text-2xl font-bold text-blue-600">{global.totalLists?.toLocaleString() || 0}</p>
              </div>
              <Brain className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Reutilizaciones</p>
                <p className="text-2xl font-bold text-green-600">{global.totalReuses?.toLocaleString() || 0}</p>
                <p className="text-xs text-green-500">+{global.savedGenerations} generaciones ahorradas</p>
              </div>
              <Recycle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Regiones Activas</p>
                <p className="text-2xl font-bold text-purple-600">{global.uniqueRegions || 0}</p>
              </div>
              <MapPin className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Confianza Global</p>
                <p className="text-2xl font-bold text-orange-600">
                  {Math.round((global.avgGlobalConfidence || 0) * 100)}%
                </p>
              </div>
              <Target className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Métricas Colaborativas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Impacto Colaborativo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">
                {collaborativeMetrics.reuseRate || 0}
              </div>
              <p className="text-sm text-gray-600">Generaciones de IA Ahorradas</p>
              <p className="text-xs text-gray-500 mt-1">
                Cada reutilización evita 30-60 segundos de procesamiento
              </p>
            </div>

            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">
                {collaborativeMetrics.crossRegionalProjects || 0}
              </div>
              <p className="text-sm text-gray-600">Proyectos Multi-Región</p>
              <p className="text-xs text-gray-500 mt-1">
                Conocimiento compartido entre regiones
              </p>
            </div>

            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 mb-2">
                {Math.round(collaborativeMetrics.averageRegionsPerProject || 0)}
              </div>
              <p className="text-sm text-gray-600">Promedio Regiones/Proyecto</p>
              <p className="text-xs text-gray-500 mt-1">
                Alcance geográfico del conocimiento
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top Proyectos Más Reutilizados */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Proyectos Más Exitosos (Top 5)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topReused.slice(0, 5).map((project, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-xs">
                      {project.projectType}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {project.region}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-700 truncate">
                    {project.projectDescription}
                  </p>
                </div>
                <div className="text-right ml-4">
                  <div className="text-lg font-bold text-blue-600">
                    {project.usageCount}
                  </div>
                  <div className="text-xs text-gray-500">reutilizaciones</div>
                  <div className="text-xs text-green-600">
                    {Math.round(project.confidence * 100)}% confianza
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Estadísticas por Tipo de Proyecto */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Distribución por Tipo de Proyecto
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {byProjectType.map((type, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge className="capitalize">{type.projectType}</Badge>
                    <span className="text-sm text-gray-600">
                      {type.regionsCovered} regiones
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    {type.totalUsage} usos totales
                  </div>
                </div>
                <Progress 
                  value={(type.totalUsage / (global.totalReuses || 1)) * 100} 
                  className="h-2"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>{type.totalProjects} listas</span>
                  <span>{Math.round(type.avgConfidence * 100)}% confianza</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Mensaje de Colaboración */}
      <Card className="bg-gradient-to-r from-blue-50 to-green-50 border-blue-200">
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            <Lightbulb className="h-6 w-6 text-blue-500 mt-1" />
            <div>
              <h3 className="font-semibold text-blue-900 mb-2">
                🌍 Sistema Colaborativo Global
              </h3>
              <p className="text-blue-800 text-sm leading-relaxed">
                Cada vez que usas DeepSearch, contribuyes al conocimiento colectivo. 
                Tus proyectos ayudan a otros contratistas alrededor del mundo, y tú 
                te beneficias del trabajo de la comunidad global. 
                <span className="font-medium">
                  ¡Juntos estamos construyendo la base de datos de construcción más inteligente del mundo!
                </span>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default DeepSearchGlobalStats;
/**
 * Servicio para gestionar el historial de búsquedas de permisos usando PostgreSQL
 * 🚀 CONSOLIDATION: Converted from Firebase to PostgreSQL
 */

import { getAuthHeaders } from '@/lib/queryClient';

export interface PermitSearchHistoryItem {
  id: string;
  query: string;
  results: any;
  userId: number;
  searchDate: string;
  // Legacy fields for backward compatibility
  address?: string;
  projectType?: string;
  projectDescription?: string;
  title?: string;
}

const API_ENDPOINT = '/api/permit/history';

/**
 * Guardar una búsqueda en el historial
 * 🚀 CONSOLIDATION: PostgreSQL endpoint
 */
export async function savePermitSearchToHistory(
  userId: string,
  address: string,
  projectType: string,
  results: any,
  projectDescription?: string
): Promise<string> {
  try {
    const title = `${projectType.charAt(0).toUpperCase() + projectType.slice(1)} en ${address}`;
    const query = `${title} - ${address}`;
    
    const historyData = {
      query,
      results,
      userId: parseInt(userId), // Convert to integer for PostgreSQL
    };

    const authHeaders = await getAuthHeaders();
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      credentials: 'include',
      body: JSON.stringify(historyData),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log('✅ Búsqueda guardada en historial PostgreSQL:', result.id);
    return result.id;
  } catch (error) {
    console.error('❌ Error al guardar en historial PostgreSQL:', error);
    throw error;
  }
}

/**
 * Obtener el historial de búsquedas de un usuario
 * 🚀 CONSOLIDATION: PostgreSQL endpoint
 */
export async function getPermitSearchHistory(userId: string, limitResults = 20): Promise<PermitSearchHistoryItem[]> {
  try {
    const authHeaders = await getAuthHeaders();
    const response = await fetch(`${API_ENDPOINT}?userId=${userId}&limit=${limitResults}`, {
      method: 'GET',
      headers: {
        ...authHeaders,
      },
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const history: PermitSearchHistoryItem[] = await response.json();
    
    // Map PostgreSQL fields to legacy format for compatibility
    const mappedHistory = history.map(item => ({
      ...item,
      // Extract legacy fields from query for UI compatibility
      title: item.query.split(' - ')[0] || item.query,
      address: item.query.split(' - ')[1] || '',
      projectType: item.query.toLowerCase().includes('electrical') ? 'electrical' :
                   item.query.toLowerCase().includes('plumbing') ? 'plumbing' :
                   item.query.toLowerCase().includes('roofing') ? 'roofing' : 'general',
      createdAt: { toDate: () => new Date(item.searchDate) }, // Legacy compatibility
    }));

    console.log(`✅ Historial obtenido de PostgreSQL: ${mappedHistory.length} elementos`);
    return mappedHistory;
  } catch (error) {
    console.error('❌ Error al obtener historial PostgreSQL:', error);
    throw error;
  }
}

/**
 * Formatear fecha para mostrar en el historial
 */
export function formatHistoryDate(dateInput: string | Date | { toDate: () => Date }): string {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : 
               dateInput instanceof Date ? dateInput : dateInput.toDate();
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
  
  if (diffInMinutes < 1) return 'Hace un momento';
  if (diffInMinutes < 60) return `Hace ${diffInMinutes} min`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `Hace ${diffInHours}h`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `Hace ${diffInDays}d`;
  
  return date.toLocaleDateString('es-ES', { 
    day: 'numeric', 
    month: 'short',
    year: diffInDays > 365 ? 'numeric' : undefined
  });
}

/**
 * Obtener icono según el tipo de proyecto
 */
export function getProjectTypeIcon(projectType: string): string {
  const icons: Record<string, string> = {
    electrical: '⚡',
    plumbing: '🚿',
    roofing: '🏠',
    bathroom: '🛁',
    kitchen: '🍳',
    addition: '🏗️',
    concrete: '🧱',
    fence: '🚧',
    deck: '🏘️',
    pool: '🏊',
    hvac: '❄️',
    default: '🔧'
  };
  
  return icons[projectType.toLowerCase()] || icons.default;
}
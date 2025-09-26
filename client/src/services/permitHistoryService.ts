/**
 * Servicio para gestionar el historial de búsquedas de permisos usando Firebase
 */

import { collection, addDoc, getDocs, query, where, orderBy, limit, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface PermitSearchHistoryItem {
  id?: string;
  userId: string;
  address: string;
  projectType: string;
  projectDescription?: string;
  results: any;
  title: string;
  createdAt: Timestamp;
}

const COLLECTION_NAME = 'permit_search_history';

/**
 * Guardar una búsqueda en el historial
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
    
    const historyItem: Omit<PermitSearchHistoryItem, 'id'> = {
      userId,
      address,
      projectType,
      projectDescription: projectDescription || '',
      results,
      title,
      createdAt: Timestamp.now()
    };

    const docRef = await addDoc(collection(db, COLLECTION_NAME), historyItem);
    console.log('✅ Búsqueda guardada en historial de Firebase:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('❌ Error al guardar en historial de Firebase:', error);
    throw error;
  }
}

/**
 * Obtener el historial de búsquedas de un usuario
 */
export async function getPermitSearchHistory(userId: string, limitResults = 20): Promise<PermitSearchHistoryItem[]> {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(limitResults)
    );

    const querySnapshot = await getDocs(q);
    const history: PermitSearchHistoryItem[] = [];

    querySnapshot.forEach((doc) => {
      history.push({
        id: doc.id,
        ...doc.data() as Omit<PermitSearchHistoryItem, 'id'>
      });
    });

    console.log(`✅ Historial obtenido de Firebase: ${history.length} elementos`);
    return history;
  } catch (error) {
    console.error('❌ Error al obtener historial de Firebase:', error);
    throw error;
  }
}

/**
 * Formatear fecha para mostrar en el historial
 */
export function formatHistoryDate(timestamp: Timestamp): string {
  const date = timestamp.toDate();
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
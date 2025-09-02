/**
 * Firebase Search Service
 * Servicio unificado para historial de búsquedas (Property & Permits) en Firestore
 * Reemplaza completamente el uso de PostgreSQL/Drizzle
 */

import { db } from '../firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

// Interfaces canónicas
export interface PropertySearchData {
  id?: string;
  userId: string; // OBLIGATORIO - Firebase UID
  searchType: 'property';
  address: string;
  city?: string;
  state?: string;
  zipCode?: string;
  ownerName?: string;
  parcelNumber?: string;
  assessedValue?: number;
  yearBuilt?: number;
  squareFeet?: number;
  lotSize?: number;
  propertyType?: string;
  searchResults?: any; // JSON results from API
  searchProvider?: string; // API provider used
  searchCost?: number; // Cost of the search if applicable
  status: 'pending' | 'completed' | 'failed';
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PermitSearchData {
  id?: string;
  userId: string; // OBLIGATORIO - Firebase UID
  searchType: 'permit';
  query: string;
  jurisdiction?: string;
  permitType?: string;
  projectType?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  searchResults?: any; // JSON results from search
  resultsCount?: number;
  requirements?: string[];
  fees?: {
    type: string;
    amount: number;
    description?: string;
  }[];
  estimatedProcessingTime?: string;
  searchProvider?: string;
  status: 'pending' | 'completed' | 'failed';
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

type SearchData = PropertySearchData | PermitSearchData;

class FirebaseSearchService {
  private propertyCollection = 'searches/property/history';
  private permitCollection = 'searches/permits/history';

  /**
   * Crear búsqueda de propiedad
   */
  async createPropertySearch(searchData: Omit<PropertySearchData, 'id' | 'createdAt' | 'updatedAt'>): Promise<PropertySearchData> {
    try {
      // Validación crítica: userId obligatorio
      if (!searchData.userId) {
        throw new Error('userId is required for all property searches');
      }

      console.log(`🏠 [FIREBASE-SEARCH] Creating property search for user: ${searchData.userId}`);

      const newSearch = {
        ...searchData,
        searchType: 'property',
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        status: searchData.status || 'pending'
      };

      const docRef = await db.collection(this.propertyCollection).add(newSearch);
      
      console.log(`✅ [FIREBASE-SEARCH] Property search created with ID: ${docRef.id}`);

      return {
        id: docRef.id,
        ...searchData,
        searchType: 'property',
        createdAt: new Date(),
        updatedAt: new Date()
      };
    } catch (error) {
      console.error('❌ [FIREBASE-SEARCH] Error creating property search:', error);
      throw error;
    }
  }

  /**
   * Crear búsqueda de permisos
   */
  async createPermitSearch(searchData: Omit<PermitSearchData, 'id' | 'createdAt' | 'updatedAt'>): Promise<PermitSearchData> {
    try {
      // Validación crítica: userId obligatorio
      if (!searchData.userId) {
        throw new Error('userId is required for all permit searches');
      }

      console.log(`📋 [FIREBASE-SEARCH] Creating permit search for user: ${searchData.userId}`);

      const newSearch = {
        ...searchData,
        searchType: 'permit',
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        status: searchData.status || 'pending'
      };

      const docRef = await db.collection(this.permitCollection).add(newSearch);
      
      console.log(`✅ [FIREBASE-SEARCH] Permit search created with ID: ${docRef.id}`);

      return {
        id: docRef.id,
        ...searchData,
        searchType: 'permit',
        createdAt: new Date(),
        updatedAt: new Date()
      };
    } catch (error) {
      console.error('❌ [FIREBASE-SEARCH] Error creating permit search:', error);
      throw error;
    }
  }

  /**
   * Obtener búsqueda de propiedad por ID
   */
  async getPropertySearch(searchId: string, userId: string): Promise<PropertySearchData | null> {
    try {
      const docRef = db.collection(this.propertyCollection).doc(searchId);
      const docSnap = await docRef.get();

      if (!docSnap.exists) {
        return null;
      }

      const data = docSnap.data();
      
      // Validación de seguridad
      if (data?.userId !== userId) {
        console.error(`⚠️ [FIREBASE-SEARCH] Access denied: User ${userId} trying to access search of user ${data?.userId}`);
        throw new Error('Access denied');
      }

      return {
        id: docSnap.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date()
      } as PropertySearchData;
    } catch (error) {
      console.error('❌ [FIREBASE-SEARCH] Error getting property search:', error);
      throw error;
    }
  }

  /**
   * Obtener búsqueda de permisos por ID
   */
  async getPermitSearch(searchId: string, userId: string): Promise<PermitSearchData | null> {
    try {
      const docRef = db.collection(this.permitCollection).doc(searchId);
      const docSnap = await docRef.get();

      if (!docSnap.exists) {
        return null;
      }

      const data = docSnap.data();
      
      // Validación de seguridad
      if (data?.userId !== userId) {
        console.error(`⚠️ [FIREBASE-SEARCH] Access denied: User ${userId} trying to access search of user ${data?.userId}`);
        throw new Error('Access denied');
      }

      return {
        id: docSnap.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date()
      } as PermitSearchData;
    } catch (error) {
      console.error('❌ [FIREBASE-SEARCH] Error getting permit search:', error);
      throw error;
    }
  }

  /**
   * Obtener historial de búsquedas de propiedad del usuario
   */
  async getPropertySearchHistory(
    userId: string,
    filters?: {
      limit?: number;
      startDate?: Date;
      endDate?: Date;
      status?: string;
    }
  ): Promise<PropertySearchData[]> {
    try {
      console.log(`🏠 [FIREBASE-SEARCH] Getting property search history for user: ${userId}`);

      let q = db.collection(this.propertyCollection)
        .where('userId', '==', userId);

      if (filters?.status) {
        q = q.where('status', '==', filters.status);
      }

      q = q.orderBy('createdAt', 'desc');

      if (filters?.limit) {
        q = q.limit(filters.limit);
      }

      const querySnapshot = await q.get();
      
      const searches: PropertySearchData[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        searches.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        } as PropertySearchData);
      });

      console.log(`✅ [FIREBASE-SEARCH] Found ${searches.length} property searches for user ${userId}`);
      return searches;
    } catch (error) {
      console.error('❌ [FIREBASE-SEARCH] Error getting property search history:', error);
      throw error;
    }
  }

  /**
   * Obtener historial de búsquedas de permisos del usuario
   */
  async getPermitSearchHistory(
    userId: string,
    filters?: {
      limit?: number;
      startDate?: Date;
      endDate?: Date;
      status?: string;
      jurisdiction?: string;
    }
  ): Promise<PermitSearchData[]> {
    try {
      console.log(`📋 [FIREBASE-SEARCH] Getting permit search history for user: ${userId}`);

      let q = db.collection(this.permitCollection)
        .where('userId', '==', userId);

      if (filters?.status) {
        q = q.where('status', '==', filters.status);
      }

      if (filters?.jurisdiction) {
        q = q.where('jurisdiction', '==', filters.jurisdiction);
      }

      q = q.orderBy('createdAt', 'desc');

      if (filters?.limit) {
        q = q.limit(filters.limit);
      }

      const querySnapshot = await q.get();
      
      const searches: PermitSearchData[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        searches.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        } as PermitSearchData);
      });

      console.log(`✅ [FIREBASE-SEARCH] Found ${searches.length} permit searches for user ${userId}`);
      return searches;
    } catch (error) {
      console.error('❌ [FIREBASE-SEARCH] Error getting permit search history:', error);
      throw error;
    }
  }

  /**
   * Actualizar búsqueda de propiedad con resultados
   */
  async updatePropertySearchResults(
    searchId: string,
    userId: string,
    results: {
      ownerName?: string;
      assessedValue?: number;
      yearBuilt?: number;
      squareFeet?: number;
      searchResults?: any;
      status: 'completed' | 'failed';
      error?: string;
    }
  ): Promise<void> {
    try {
      // Verificar permisos
      const existing = await this.getPropertySearch(searchId, userId);
      if (!existing) {
        throw new Error('Search not found or access denied');
      }

      const docRef = db.collection(this.propertyCollection).doc(searchId);
      
      await docRef.update({
        ...results,
        updatedAt: FieldValue.serverTimestamp()
      });

      console.log(`✅ [FIREBASE-SEARCH] Property search ${searchId} updated with results`);
    } catch (error) {
      console.error('❌ [FIREBASE-SEARCH] Error updating property search:', error);
      throw error;
    }
  }

  /**
   * Actualizar búsqueda de permisos con resultados
   */
  async updatePermitSearchResults(
    searchId: string,
    userId: string,
    results: {
      searchResults?: any;
      resultsCount?: number;
      requirements?: string[];
      fees?: any[];
      estimatedProcessingTime?: string;
      status: 'completed' | 'failed';
      error?: string;
    }
  ): Promise<void> {
    try {
      // Verificar permisos
      const existing = await this.getPermitSearch(searchId, userId);
      if (!existing) {
        throw new Error('Search not found or access denied');
      }

      const docRef = db.collection(this.permitCollection).doc(searchId);
      
      await docRef.update({
        ...results,
        updatedAt: FieldValue.serverTimestamp()
      });

      console.log(`✅ [FIREBASE-SEARCH] Permit search ${searchId} updated with results`);
    } catch (error) {
      console.error('❌ [FIREBASE-SEARCH] Error updating permit search:', error);
      throw error;
    }
  }

  /**
   * Eliminar búsqueda de propiedad
   */
  async deletePropertySearch(searchId: string, userId: string): Promise<boolean> {
    try {
      // Verificar permisos
      const existing = await this.getPropertySearch(searchId, userId);
      if (!existing) {
        throw new Error('Search not found or access denied');
      }

      await db.collection(this.propertyCollection).doc(searchId).delete();
      
      console.log(`✅ [FIREBASE-SEARCH] Property search ${searchId} deleted`);
      return true;
    } catch (error) {
      console.error('❌ [FIREBASE-SEARCH] Error deleting property search:', error);
      throw error;
    }
  }

  /**
   * Eliminar búsqueda de permisos
   */
  async deletePermitSearch(searchId: string, userId: string): Promise<boolean> {
    try {
      // Verificar permisos
      const existing = await this.getPermitSearch(searchId, userId);
      if (!existing) {
        throw new Error('Search not found or access denied');
      }

      await db.collection(this.permitCollection).doc(searchId).delete();
      
      console.log(`✅ [FIREBASE-SEARCH] Permit search ${searchId} deleted`);
      return true;
    } catch (error) {
      console.error('❌ [FIREBASE-SEARCH] Error deleting permit search:', error);
      throw error;
    }
  }

  /**
   * Obtener estadísticas de búsquedas
   */
  async getSearchStats(userId: string): Promise<{
    propertySearches: {
      total: number;
      completed: number;
      failed: number;
      pending: number;
    };
    permitSearches: {
      total: number;
      completed: number;
      failed: number;
      pending: number;
    };
    totalCost: number;
  }> {
    const [propertySearches, permitSearches] = await Promise.all([
      this.getPropertySearchHistory(userId),
      this.getPermitSearchHistory(userId)
    ]);

    const stats = {
      propertySearches: {
        total: propertySearches.length,
        completed: 0,
        failed: 0,
        pending: 0
      },
      permitSearches: {
        total: permitSearches.length,
        completed: 0,
        failed: 0,
        pending: 0
      },
      totalCost: 0
    };

    propertySearches.forEach(search => {
      stats.propertySearches[search.status]++;
      if (search.searchCost) {
        stats.totalCost += search.searchCost;
      }
    });

    permitSearches.forEach(search => {
      stats.permitSearches[search.status]++;
    });

    return stats;
  }

  /**
   * Buscar propiedades por dirección (caché)
   */
  async findCachedPropertySearch(address: string, userId: string): Promise<PropertySearchData | null> {
    try {
      const q = db.collection(this.propertyCollection)
        .where('userId', '==', userId)
        .where('address', '==', address)
        .where('status', '==', 'completed')
        .orderBy('createdAt', 'desc')
        .limit(1);

      const querySnapshot = await q.get();
      
      if (querySnapshot.empty) {
        return null;
      }

      const doc = querySnapshot.docs[0];
      const data = doc.data();

      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date()
      } as PropertySearchData;
    } catch (error) {
      console.error('❌ [FIREBASE-SEARCH] Error finding cached property search:', error);
      return null;
    }
  }

  /**
   * Buscar permisos por jurisdicción (caché)
   */
  async findCachedPermitSearch(query: string, jurisdiction: string, userId: string): Promise<PermitSearchData | null> {
    try {
      const q = db.collection(this.permitCollection)
        .where('userId', '==', userId)
        .where('query', '==', query)
        .where('jurisdiction', '==', jurisdiction)
        .where('status', '==', 'completed')
        .orderBy('createdAt', 'desc')
        .limit(1);

      const querySnapshot = await q.get();
      
      if (querySnapshot.empty) {
        return null;
      }

      const doc = querySnapshot.docs[0];
      const data = doc.data();

      // Si la búsqueda tiene más de 30 días, considerarla obsoleta
      const createdAt = data.createdAt?.toDate() || new Date();
      const daysSinceSearch = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysSinceSearch > 30) {
        return null; // Datos muy antiguos, hacer nueva búsqueda
      }

      return {
        id: doc.id,
        ...data,
        createdAt,
        updatedAt: data.updatedAt?.toDate() || new Date()
      } as PermitSearchData;
    } catch (error) {
      console.error('❌ [FIREBASE-SEARCH] Error finding cached permit search:', error);
      return null;
    }
  }
}

// Exportar instancia única
export const firebaseSearchService = new FirebaseSearchService();
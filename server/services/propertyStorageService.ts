import { 
  doc, 
  collection, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../firebase';

// Definimos la estructura de los datos de propiedad para Firebase
interface PropertyData {
  address: string;
  owner: string;
  sqft: number;
  bedrooms: number;
  bathrooms: number;
  lotSize: string;
  landSqft: number;
  yearBuilt: number;
  propertyType: string;
  ownerOccupied: boolean;
  verified: boolean;
  ownershipVerified: boolean;
  purchaseDate?: string;
  purchasePrice?: number;
  previousOwner?: string;
  ownerHistory?: any[];
  userId?: string; // ID del usuario que consultó esta propiedad
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Servicio para el almacenamiento persistente de datos de propiedades en Firebase
 */
class PropertyStorageService {
  private readonly COLLECTION_NAME = 'properties';
  
  /**
   * Guarda los datos de una propiedad en Firebase
   * @param propertyData Datos de la propiedad a guardar
   * @param userId ID del usuario que consulta la propiedad (opcional)
   * @returns Los datos guardados con su ID
   */
  async saveProperty(propertyData: any, userId?: string): Promise<any> {
    try {
      // Normaliza la dirección para usarla como clave
      const address = propertyData.address.toLowerCase().trim();
      
      // Crea una clave única basada en la dirección
      const propertyId = this.generatePropertyId(address);
      
      // Comprueba si la propiedad ya existe
      const propertyRef = doc(db, this.COLLECTION_NAME, propertyId);
      const propertyDoc = await getDoc(propertyRef);
      
      // Prepara los datos a guardar
      const dataToSave: PropertyData = {
        ...propertyData,
        userId: userId || null,
        createdAt: propertyDoc.exists() 
          ? propertyDoc.data().createdAt 
          : Timestamp.now(),
        updatedAt: Timestamp.now()
      };
      
      // Guarda los datos en Firestore
      await setDoc(propertyRef, dataToSave);
      
      console.log(`Propiedad guardada en Firebase: ${propertyId}`);
      
      return {
        id: propertyId,
        ...dataToSave
      };
    } catch (error) {
      console.error('Error al guardar propiedad en Firebase:', error);
      throw error;
    }
  }
  
  /**
   * Obtiene los datos de una propiedad por su dirección
   * @param address Dirección de la propiedad
   * @returns Datos de la propiedad o null si no existe
   */
  async getPropertyByAddress(address: string): Promise<any | null> {
    try {
      // Normaliza la dirección para buscar
      const normalizedAddress = address.toLowerCase().trim();
      
      // Genera el ID de la propiedad
      const propertyId = this.generatePropertyId(normalizedAddress);
      
      // Obtiene la referencia del documento
      const propertyRef = doc(db, this.COLLECTION_NAME, propertyId);
      const propertyDoc = await getDoc(propertyRef);
      
      if (propertyDoc.exists()) {
        // Convierte los timestamps de Firestore a Date
        const data = propertyDoc.data();
        return {
          id: propertyId,
          ...data,
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate()
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error al obtener propiedad de Firebase:', error);
      return null;
    }
  }
  
  /**
   * Obtiene las propiedades consultadas por un usuario
   * @param userId ID del usuario
   * @returns Lista de propiedades consultadas
   */
  async getPropertiesByUserId(userId: string): Promise<any[]> {
    try {
      // Consulta las propiedades del usuario
      const propertiesRef = collection(db, this.COLLECTION_NAME);
      const q = query(propertiesRef, where('userId', '==', userId));
      const querySnapshot = await getDocs(q);
      
      // Mapea los resultados
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate()
        };
      });
    } catch (error) {
      console.error('Error al obtener propiedades del usuario:', error);
      return [];
    }
  }
  
  /**
   * Genera un ID único para una propiedad basado en su dirección
   * @param address Dirección de la propiedad
   * @returns ID único
   */
  private generatePropertyId(address: string): string {
    // Eliminar caracteres especiales y espacios
    return 'prop_' + address
      .replace(/[^\w\s]/gi, '')
      .replace(/\s+/g, '_')
      .toLowerCase();
  }
}

export const propertyStorageService = new PropertyStorageService();
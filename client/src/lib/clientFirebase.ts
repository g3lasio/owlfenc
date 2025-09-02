import { 
  collection, 
  addDoc, 
  getDocs, 
  getDoc, 
  doc, 
  query, 
  where,
  orderBy,
  Timestamp,
  updateDoc,
  deleteDoc
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "./firebase";
import { devModeManager, debugLog } from "@/utils/devModeUtils";

// Interfaz para el cliente
export interface Client {
  id: string;
  userId?: string;
  clientId: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  mobilePhone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  notes?: string | null;
  source?: string | null;
  tags?: string[] | null;
  lastContact?: Date | null;
  classification?: string | null; // Tipo de contacto: cliente, proveedor, empleado, etc.
  createdAt: Date;
  updatedAt: Date;
}

// Crear un nuevo cliente
export const saveClient = async (clientData: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>) => {
  try {
    // Asegurarnos de que el cliente tiene un ID único y timestamps
    const clientWithMeta = {
      ...clientData,
      clientId: clientData.clientId || `client_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      userId: clientData.userId, // Asegurar que el userId se incluya
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };

    // Timeout para Firebase
    const savePromise = addDoc(collection(db, "clients"), clientWithMeta);
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Firebase timeout')), 8000)
    );
    
    const docRef = await Promise.race([savePromise, timeoutPromise]) as any;
    return { 
      id: docRef.id, 
      ...clientWithMeta,
      createdAt: clientWithMeta.createdAt.toDate(),
      updatedAt: clientWithMeta.updatedAt.toDate(),
    } as Client;
  } catch (error) {
    console.error("❌ Firebase error:", error);
    
    // Mensajes específicos para errores comunes
    if (error.message?.includes('network-request-failed') || error.message?.includes('auth/network-request-failed')) {
      throw new Error('Sin conexión a Firebase');
    } else if (error.message?.includes('timeout')) {
      throw new Error('Firebase lento - reintenta');
    }
    
    throw error;
  }
};

// ✅ FIXED: Obtener todos los clientes usando token del localStorage
export const getClients = async (userId?: string, filters?: { tag?: string, source?: string }) => {
  try {
    devModeManager.markStart('clients-load');
    
    // ✅ SOLUTION: Usar token del localStorage (como en clientService.ts)
    const currentUserId = localStorage.getItem('firebase_user_id');
    const currentUserEmail = localStorage.getItem('firebase_user_email');
    
    if (!currentUserId) {
      debugLog('CLIENTS', 'No authenticated user in localStorage - returning empty array');
      return [];
    }
    
    debugLog('CLIENTS', 'Usuario autenticado encontrado:', { 
      uid: currentUserId, 
      email: currentUserEmail 
    });
    
    // Crear objeto user para compatibilidad con el código existente
    const currentUser = {
      uid: currentUserId,
      email: currentUserEmail
    };

    // ✅ FIXED: Use authenticated user's ID if none provided
    const targetUserId = userId || currentUser.uid;
    
    // ✅ SECURITY: Verify user can only access their own data
    if (userId && userId !== currentUser.uid) {
      debugLog('CLIENTS', 'Security violation: User attempting to access another user\'s clients');
      throw new Error("Access denied - cannot access other users' data");
    }
    
    debugLog('CLIENTS', `Loading clients for user: ${targetUserId}`);
    
    // Build query constraints with mandatory user filtering
    const queryConstraints = [];

    // CRITICAL SECURITY: Always filter by authenticated user
    queryConstraints.push(where("userId", "==", targetUserId));

    // Apply additional filters if provided
    if (filters) {
      if (filters.tag) {
        queryConstraints.push(where("tags", "array-contains", filters.tag));
      }

      if (filters.source) {
        if (filters.source === "no_source") {
          queryConstraints.push(where("source", "==", ""));
        } else {
          queryConstraints.push(where("source", "==", filters.source));
        }
      }
    }

    // Build and execute query with intelligent fallback
    let querySnapshot;
    
    try {
      // First try with orderBy (requires composite index)
      const qWithOrder = query(
        collection(db, "clients"),
        ...queryConstraints,
        orderBy("createdAt", "desc")
      );
      querySnapshot = await getDocs(qWithOrder);
    } catch (indexError) {
      console.log("🔄 Index not available, falling back to query without orderBy");
      try {
        // Fallback: query without orderBy
        const qBasic = query(
          collection(db, "clients"),
          ...queryConstraints
        );
        querySnapshot = await getDocs(qBasic);
      } catch (basicError) {
        console.error("❌ Basic query also failed, trying minimal approach");
        // Last resort: get all clients for user without filters
        const qMinimal = query(
          collection(db, "clients"),
          where("userId", "==", targetUserId)
        );
        querySnapshot = await getDocs(qMinimal);
      }
    }
    
    const results = querySnapshot.docs.map(doc => {
      const data = doc.data() as any;
      // Handle Firestore Timestamps properly
      const createdAt = data.createdAt && typeof data.createdAt.toDate === 'function' 
        ? data.createdAt.toDate() 
        : data.createdAt instanceof Date 
          ? data.createdAt 
          : new Date();
      
      const updatedAt = data.updatedAt && typeof data.updatedAt.toDate === 'function'
        ? data.updatedAt.toDate()
        : data.updatedAt instanceof Date
          ? data.updatedAt
          : new Date();
          
      return {
        id: doc.id,
        ...data,
        createdAt,
        updatedAt
      } as Client;
    });
    
    const loadTime = devModeManager.markEnd('clients-load');
    debugLog('CLIENTS', `Successfully loaded ${results.length} clients for user ${targetUserId} in ${loadTime?.toFixed(2)}ms`);
    
    return results;
    
  } catch (error: any) {
    debugLog('CLIENTS', 'CRITICAL ERROR loading clients', {
      errorName: error.name || 'Unknown',
      errorCode: error.code || 'No code',
      errorMessage: error.message || 'No message',
      firebaseInitialized: !!db,
      userAuthenticated: !!auth.currentUser,
      projectId: db?.app?.options?.projectId || 'Not available',
      timestamp: new Date().toISOString()
    });
    
    throw error;
  }
};

// Obtener un cliente específico por ID
export const getClientById = async (id: string) => {
  try {
    // CRITICAL SECURITY: Get current authenticated user
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.warn("🔒 SECURITY: No authenticated user - access denied");
      throw new Error("Authentication required");
    }

    const docRef = doc(db, "clients", id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data() as any;
      
      // CRITICAL SECURITY: Verify client belongs to current user
      if (data.userId !== currentUser.uid) {
        console.warn("🔒 SECURITY: Client access denied - belongs to different user");
        throw new Error("Access denied - client belongs to different user");
      }
      
      // Handle Firestore Timestamps properly
      const createdAt = data.createdAt && typeof data.createdAt.toDate === 'function' 
        ? data.createdAt.toDate() 
        : data.createdAt instanceof Date 
          ? data.createdAt 
          : new Date();
      
      const updatedAt = data.updatedAt && typeof data.updatedAt.toDate === 'function'
        ? data.updatedAt.toDate()
        : data.updatedAt instanceof Date
          ? data.updatedAt
          : new Date();
          
      console.log(`🔒 SECURITY: Client access granted for user: ${currentUser.uid}`);
      return {
        id: docSnap.id,
        ...data,
        createdAt,
        updatedAt
      } as Client;
    } else {
      throw new Error("Cliente no encontrado");
    }
  } catch (error) {
    console.error("Error al obtener cliente:", error);
    throw error;
  }
};

// Actualizar un cliente existente
export const updateClient = async (id: string, clientData: Partial<Client>) => {
  try {
    // CRITICAL SECURITY: Get current authenticated user
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.warn("🔒 SECURITY: No authenticated user - access denied");
      throw new Error("Authentication required");
    }

    const docRef = doc(db, "clients", id);
    
    // CRITICAL SECURITY: Verify client belongs to current user before updating
    const existingDoc = await getDoc(docRef);
    if (!existingDoc.exists()) {
      throw new Error("Cliente no encontrado");
    }
    
    const existingData = existingDoc.data() as any;
    if (existingData.userId !== currentUser.uid) {
      console.warn("🔒 SECURITY: Client update denied - belongs to different user");
      throw new Error("Access denied - client belongs to different user");
    }

    await updateDoc(docRef, {
      ...clientData,
      updatedAt: Timestamp.now()
    });
    
    // Get updated client
    const updatedDoc = await getDoc(docRef);
    if (updatedDoc.exists()) {
      const data = updatedDoc.data() as any;
      
      console.log(`🔒 SECURITY: Client updated successfully for user: ${currentUser.uid}`);
      return {
        id: updatedDoc.id,
        ...data,
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate(),
      } as Client;
    } else {
      throw new Error("No se pudo recuperar el cliente actualizado");
    }
  } catch (error) {
    console.error("Error al actualizar cliente:", error);
    throw error;
  }
};

// Eliminar un cliente
export const deleteClient = async (id: string) => {
  try {
    // CRITICAL SECURITY: Get current authenticated user
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.warn("🔒 SECURITY: No authenticated user - access denied");
      throw new Error("Authentication required");
    }

    const docRef = doc(db, "clients", id);
    
    // CRITICAL SECURITY: Verify client belongs to current user before deleting
    const existingDoc = await getDoc(docRef);
    if (!existingDoc.exists()) {
      throw new Error("Cliente no encontrado");
    }
    
    const existingData = existingDoc.data() as any;
    if (existingData.userId !== currentUser.uid) {
      console.warn("🔒 SECURITY: Client deletion denied - belongs to different user");
      throw new Error("Access denied - client belongs to different user");
    }

    await deleteDoc(docRef);
    console.log(`🔒 SECURITY: Client deleted successfully for user: ${currentUser.uid}`);
    return true;
  } catch (error) {
    console.error("Error al eliminar cliente:", error);
    throw error;
  }
};

// Importar clientes desde CSV
export const importClientsFromCsv = async (csvData: string) => {
  try {
    const clients: Client[] = [];
    // Procesar el CSV y crear los clientes
    const rows = csvData.split('\n').slice(1); // Ignorar encabezados

    for (const row of rows) {
      if (!row.trim()) continue; // Ignorar filas vacías
      
      const [name, email, phone, address] = row.split(',');
      if (name) {
        const clientData = {
          clientId: `client_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
          name: name.trim(),
          email: email?.trim() || "",
          phone: phone?.trim() || "",
          address: address?.trim() || "",
          source: "CSV Import",
          classification: "cliente", // Clasificación por defecto para clientes importados
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        };

        // Guardar en Firebase
        const docRef = await addDoc(collection(db, "clients"), clientData);
        clients.push({ 
          id: docRef.id, 
          ...clientData,
          createdAt: clientData.createdAt.toDate(),
          updatedAt: clientData.updatedAt.toDate(),
        } as Client);
      }
    }

    return clients;
  } catch (error) {
    console.error("Error al importar clientes desde CSV:", error);
    throw error;
  }
};

// Importar clientes desde vCard (Apple Contacts)
export const importClientsFromVcf = async (vcfData: string) => {
  try {
    const clients: Client[] = [];
    // Procesar datos vCard (formato .vcf de contactos de Apple)
    const vCards = vcfData.split('END:VCARD')
      .filter(card => card.trim().length > 0)
      .map(card => card + 'END:VCARD');
    
    for (const vCard of vCards) {
      try {
        // Extraer datos básicos del vCard
        const nameMatch = vCard.match(/FN:(.*?)(?:\r\n|\n)/);
        const emailMatch = vCard.match(/EMAIL.*?:(.*?)(?:\r\n|\n)/);
        const phoneMatch = vCard.match(/TEL.*?:(.*?)(?:\r\n|\n)/);
        const addressMatch = vCard.match(/ADR.*?:(.*?)(?:\r\n|\n)/);

        const name = nameMatch ? nameMatch[1].trim() : null;
        
        if (name) {
          const email = emailMatch ? emailMatch[1].trim() : "";
          const phone = phoneMatch ? phoneMatch[1].trim() : "";
          let address = "";
          
          if (addressMatch) {
            const addressParts = addressMatch[1].split(';');
            // Formato típico: ;;calle;ciudad;estado;código postal;país
            address = addressParts.slice(2).filter(part => part.trim()).join(', ');
          }

          const clientData = {
            clientId: `client_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            name,
            email,
            phone,
            address,
            source: "Apple Contacts",
            classification: "cliente", // Clasificación por defecto para contactos importados
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
          };

          // Guardar en Firebase
          const docRef = await addDoc(collection(db, "clients"), clientData);
          clients.push({ 
            id: docRef.id, 
            ...clientData,
            createdAt: clientData.createdAt.toDate(),
            updatedAt: clientData.updatedAt.toDate(),
          } as Client);
        }
      } catch (cardError) {
        console.error('Error processing individual vCard:', cardError);
        // Continuar con la siguiente tarjeta
      }
    }

    return clients;
  } catch (error) {
    console.error("Error al importar clientes desde vCard:", error);
    throw error;
  }
};
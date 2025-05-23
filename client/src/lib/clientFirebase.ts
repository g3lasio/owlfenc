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
import { db } from "./firebase";

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

    const docRef = await addDoc(collection(db, "clients"), clientWithMeta);
    return { 
      id: docRef.id, 
      ...clientWithMeta,
      createdAt: clientWithMeta.createdAt.toDate(),
      updatedAt: clientWithMeta.updatedAt.toDate(),
    } as Client;
  } catch (error) {
    console.error("Error al guardar cliente:", error);
    throw error;
  }
};

// Obtener todos los clientes
export const getClients = async (userId?: string, filters?: { tag?: string, source?: string }) => {
  try {
    const queryConstraints = [];

    // Siempre filtrar por userId si se proporciona
    if (userId) {
      queryConstraints.push(where("userId", "==", userId));
    }

    // Aplicar filtros adicionales si se proporcionan
    if (filters) {
      if (filters.tag) {
        queryConstraints.push(where("tags", "array-contains", filters.tag));
      }

      if (filters.source) {
        if (filters.source === "no_source") {
          // Para clientes sin fuente, buscamos donde source es null o string vacío
          queryConstraints.push(where("source", "==", ""));
        } else {
          queryConstraints.push(where("source", "==", filters.source));
        }
      }
    }

    let q = query(
      collection(db, "clients"),
      ...queryConstraints,
      orderBy("createdAt", "desc")
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      // Verificar si createdAt/updatedAt son Timestamps válidos antes de llamar a toDate()
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
      };
    }) as Client[];
  } catch (error) {
    console.error("Error al obtener clientes:", error);
    throw error;
  }
};

// Obtener un cliente específico por ID
export const getClientById = async (id: string) => {
  try {
    const docRef = doc(db, "clients", id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      
      // Verificar si createdAt/updatedAt son Timestamps válidos antes de llamar a toDate()
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
    const docRef = doc(db, "clients", id);
    await updateDoc(docRef, {
      ...clientData,
      updatedAt: Timestamp.now()
    });
    
    // Obtener el cliente actualizado
    const updatedDoc = await getDoc(docRef);
    if (updatedDoc.exists()) {
      const data = updatedDoc.data();
      return {
        id: updatedDoc.id,
        ...data,
        // Convertir Firestore Timestamp a Date
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
    const docRef = doc(db, "clients", id);
    await deleteDoc(docRef);
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
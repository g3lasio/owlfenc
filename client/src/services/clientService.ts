/**
 * Servicio de clientes unificado - Frontend/Backend integrado
 * Usa las rutas del backend para mantener consistencia total con Firebase
 */

import { auth } from '@/lib/firebase';

// Interfaz unificada para clientes
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
  classification?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Tipo para crear/actualizar clientes
export type ClientInput = Omit<Client, 'id' | 'userId' | 'clientId' | 'createdAt' | 'updatedAt'>;

/**
 * Obtener token de autenticación para las peticiones al backend
 * Espera hasta que Firebase Auth esté sincronizado
 */
async function getAuthToken(): Promise<string> {
  return new Promise((resolve, reject) => {
    // Verificar primero si ya tenemos un usuario
    const currentUser = auth.currentUser;
    if (currentUser) {
      console.log('🔐 [AUTH-TOKEN] Usuario ya disponible:', { 
        uid: currentUser.uid, 
        email: currentUser.email 
      });
      
      currentUser.getIdToken(true)
        .then(token => {
          console.log('🔐 [AUTH-TOKEN] Token obtenido exitosamente, longitud:', token.length);
          resolve(token);
        })
        .catch(error => {
          console.error('❌ [AUTH-TOKEN] Error obteniendo token:', error);
          reject(new Error('Error de autenticación'));
        });
      return;
    }

    console.log('🔐 [AUTH-TOKEN] Esperando sincronización de Firebase Auth...');
    
    // Si no hay usuario, esperar a que Firebase Auth se sincronice
    const unsubscribe = auth.onAuthStateChanged((user) => {
      unsubscribe();
      
      if (!user) {
        console.error('❌ [AUTH-TOKEN] No hay usuario autenticado después de la sincronización');
        reject(new Error('Usuario no autenticado'));
        return;
      }

      console.log('✅ [AUTH-TOKEN] Usuario sincronizado:', { 
        uid: user.uid, 
        email: user.email 
      });

      user.getIdToken(true)
        .then(token => {
          console.log('🔐 [AUTH-TOKEN] Token obtenido exitosamente, longitud:', token.length);
          resolve(token);
        })
        .catch(error => {
          console.error('❌ [AUTH-TOKEN] Error obteniendo token:', error);
          reject(new Error('Error de autenticación'));
        });
    });

    // Timeout de seguridad (10 segundos)
    setTimeout(() => {
      unsubscribe();
      reject(new Error('Timeout esperando autenticación'));
    }, 10000);
  });
}

/**
 * Configuración base para peticiones al backend
 */
async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const token = await getAuthToken();
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }));
    throw new Error(errorData.error || `Error HTTP: ${response.status}`);
  }

  return response.json();
}

/**
 * Obtener todos los clientes del usuario autenticado
 */
export async function getClients(): Promise<Client[]> {
  try {
    console.log('🔄 [CLIENT-SERVICE] Obteniendo clientes desde backend...');
    const clients = await fetchWithAuth('/api/clients');
    
    // Convertir fechas de string a Date objects
    return clients.map((client: any) => ({
      ...client,
      createdAt: new Date(client.createdAt),
      updatedAt: new Date(client.updatedAt),
    }));
  } catch (error) {
    console.error('❌ [CLIENT-SERVICE] Error obteniendo clientes:', error);
    throw error;
  }
}

/**
 * Obtener un cliente específico por ID
 */
export async function getClient(id: string): Promise<Client> {
  try {
    console.log(`🔄 [CLIENT-SERVICE] Obteniendo cliente ${id}...`);
    const client = await fetchWithAuth(`/api/clients/${id}`);
    
    return {
      ...client,
      createdAt: new Date(client.createdAt),
      updatedAt: new Date(client.updatedAt),
    };
  } catch (error) {
    console.error(`❌ [CLIENT-SERVICE] Error obteniendo cliente ${id}:`, error);
    throw error;
  }
}

/**
 * Crear un nuevo cliente
 */
export async function createClient(clientData: ClientInput): Promise<Client> {
  try {
    console.log('🔄 [CLIENT-SERVICE] Creando cliente...', clientData.name);
    const client = await fetchWithAuth('/api/clients', {
      method: 'POST',
      body: JSON.stringify(clientData),
    });
    
    return {
      ...client,
      createdAt: new Date(client.createdAt),
      updatedAt: new Date(client.updatedAt),
    };
  } catch (error) {
    console.error('❌ [CLIENT-SERVICE] Error creando cliente:', error);
    throw error;
  }
}

/**
 * Actualizar un cliente existente
 */
export async function updateClient(id: string, clientData: Partial<ClientInput>): Promise<Client> {
  try {
    console.log(`🔄 [CLIENT-SERVICE] Actualizando cliente ${id}...`);
    const client = await fetchWithAuth(`/api/clients/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(clientData),
    });
    
    return {
      ...client,
      createdAt: new Date(client.createdAt),
      updatedAt: new Date(client.updatedAt),
    };
  } catch (error) {
    console.error(`❌ [CLIENT-SERVICE] Error actualizando cliente ${id}:`, error);
    throw error;
  }
}

/**
 * Eliminar un cliente
 */
export async function deleteClient(id: string): Promise<boolean> {
  try {
    console.log(`🔄 [CLIENT-SERVICE] Eliminando cliente ${id}...`);
    await fetchWithAuth(`/api/clients/${id}`, {
      method: 'DELETE',
    });
    
    return true;
  } catch (error) {
    console.error(`❌ [CLIENT-SERVICE] Error eliminando cliente ${id}:`, error);
    throw error;
  }
}

/**
 * Importar múltiples clientes
 */
export async function importClients(clients: ClientInput[]): Promise<{ success: boolean; imported: number; clientIds: string[] }> {
  try {
    console.log(`🔄 [CLIENT-SERVICE] Importando ${clients.length} clientes...`);
    const result = await fetchWithAuth('/api/clients/import', {
      method: 'POST',
      body: JSON.stringify({ clients }),
    });
    
    return result;
  } catch (error) {
    console.error('❌ [CLIENT-SERVICE] Error importando clientes:', error);
    throw error;
  }
}

/**
 * Parsear datos CSV y convertir a formato de cliente
 */
export function parseClientsFromCsv(csvData: string): ClientInput[] {
  try {
    const lines = csvData.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    
    const clients: ClientInput[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      
      if (values.length !== headers.length) continue;
      
      const client: ClientInput = {
        name: '',
        email: '',
        phone: '',
        mobilePhone: '',
        address: '',
        city: '',
        state: '',
        zipCode: '',
        notes: '',
        source: 'csv_import',
        classification: 'cliente',
        tags: ['importado'],
      };
      
      // Mapear columnas CSV a campos de cliente
      headers.forEach((header, index) => {
        const value = values[index] || '';
        
        switch (header) {
          case 'name':
          case 'nombre':
          case 'client_name':
            client.name = value;
            break;
          case 'email':
          case 'correo':
          case 'email_address':
            client.email = value;
            break;
          case 'phone':
          case 'telefono':
          case 'phone_number':
            client.phone = value;
            break;
          case 'mobile':
          case 'movil':
          case 'mobile_phone':
            client.mobilePhone = value;
            break;
          case 'address':
          case 'direccion':
          case 'street_address':
            client.address = value;
            break;
          case 'city':
          case 'ciudad':
            client.city = value;
            break;
          case 'state':
          case 'estado':
            client.state = value;
            break;
          case 'zip':
          case 'zipcode':
          case 'postal_code':
            client.zipCode = value;
            break;
          case 'notes':
          case 'notas':
          case 'comments':
            client.notes = value;
            break;
          case 'source':
          case 'origen':
            client.source = value || 'csv_import';
            break;
        }
      });
      
      // Validar que tenga al menos un nombre
      if (client.name && client.name.trim()) {
        clients.push(client);
      }
    }
    
    return clients;
  } catch (error) {
    console.error('Error parseando CSV:', error);
    throw new Error('Error al procesar archivo CSV');
  }
}

/**
 * Parsear contactos de vCard/Apple Contacts
 */
export function parseClientsFromVcf(vcfData: string): ClientInput[] {
  try {
    const clients: ClientInput[] = [];
    const vcards = vcfData.split('BEGIN:VCARD');
    
    for (const vcard of vcards) {
      if (!vcard.includes('END:VCARD')) continue;
      
      const client: ClientInput = {
        name: '',
        email: '',
        phone: '',
        mobilePhone: '',
        address: '',
        city: '',
        state: '',
        zipCode: '',
        notes: '',
        source: 'apple_contacts',
        classification: 'cliente',
        tags: ['apple_import'],
      };
      
      const lines = vcard.split('\n');
      
      for (const line of lines) {
        const trimmedLine = line.trim();
        
        if (trimmedLine.startsWith('FN:')) {
          client.name = trimmedLine.substring(3);
        } else if (trimmedLine.startsWith('EMAIL')) {
          const email = trimmedLine.split(':')[1];
          if (email) client.email = email;
        } else if (trimmedLine.startsWith('TEL')) {
          const phone = trimmedLine.split(':')[1];
          if (phone) {
            if (trimmedLine.includes('CELL') || trimmedLine.includes('MOBILE')) {
              client.mobilePhone = phone;
            } else {
              client.phone = phone;
            }
          }
        } else if (trimmedLine.startsWith('ADR')) {
          const parts = trimmedLine.split(':')[1]?.split(';') || [];
          if (parts.length >= 6) {
            client.address = parts[2] || '';
            client.city = parts[3] || '';
            client.state = parts[4] || '';
            client.zipCode = parts[5] || '';
          }
        } else if (trimmedLine.startsWith('NOTE:')) {
          client.notes = trimmedLine.substring(5);
        }
      }
      
      // Validar que tenga al menos un nombre
      if (client.name && client.name.trim()) {
        clients.push(client);
      }
    }
    
    return clients;
  } catch (error) {
    console.error('Error parseando vCard:', error);
    throw new Error('Error al procesar contactos de Apple');
  }
}

// Exportar funciones compatibles con la interfaz existente de Firebase
export const saveClient = createClient;
export const updateFirebaseClient = updateClient;
export const deleteFirebaseClient = deleteClient;
export const getFirebaseClients = getClients;

/**
 * Importación CSV usando IA para mapeo inteligente
 */
export const importClientsFromCsvWithAI = async (csvContent: string): Promise<Client[]> => {
  try {
    console.log('🤖 [CLIENT-SERVICE] Iniciando importación inteligente con IA...');
    
    // Usar la función auxiliar para obtener token con logging mejorado
    const token = await getAuthToken();
    
    console.log('🚀 [CLIENT-SERVICE] Enviando petición a API con token válido...');
    
    // Llamar a la API de importación inteligente del backend
    const response = await fetch('/api/intelligent-import/csv', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ 
        csvContent
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }));
      throw new Error(errorData.error || `Error HTTP: ${response.status}`);
    }

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Error en el procesamiento de IA');
    }

    console.log('✅ [CLIENT-SERVICE] IA procesó correctamente:', result.mappedClients.length, 'clientes');
    console.log('📊 [CLIENT-SERVICE] Formato detectado:', result.detectedFormat);

    // Ahora importar los clientes mapeados por IA
    if (result.mappedClients && result.mappedClients.length > 0) {
      await importClients(result.mappedClients);
      console.log('✅ [CLIENT-SERVICE] Clientes guardados exitosamente en Firebase');
    }
    
    // Recargar clientes para obtener los datos completos con IDs del backend
    return await getClients();
    
  } catch (error) {
    console.error('❌ [CLIENT-SERVICE] Error en importación inteligente:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      fullError: error
    });
    throw error;
  }
};

/**
 * Importación CSV usando parsing básico (fallback)
 */
export const importClientsFromCsv = async (csvData: string): Promise<Client[]> => {
  const clientsInput = parseClientsFromCsv(csvData);
  await importClients(clientsInput);
  
  // Recargar clientes para obtener los datos completos con IDs del backend
  return await getClients();
};

export const importClientsFromVcf = async (vcfData: string): Promise<Client[]> => {
  const clientsInput = parseClientsFromVcf(vcfData);
  await importClients(clientsInput);
  
  // Recargar clientes para obtener los datos completos con IDs del backend
  return await getClients();
};
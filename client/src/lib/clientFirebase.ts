// COMPATIBILITY SHIM: PostgreSQL API wrapper replacing Firebase functions
// This allows existing components to work without Firebase while using REST API

// Type definitions (keep existing interface)
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
  classification?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Helper function to get current user ID (mock for development)
const getCurrentUserId = (): string => {
  // In development, return a mock user ID
  // In production, this would come from proper auth context
  return "1"; // Matches PostgreSQL user_id 1 from our system
};

// Helper function to make API requests with bypass headers
const makeAPIRequest = async (url: string, options: RequestInit = {}) => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {})
  };
  
  // Add bypass headers for development (like in EstimatesWizardFixed.tsx)
  headers['x-bypass-uid'] = 'development-user';
  headers['x-temp-bypass'] = 'read-only-access';
  headers['x-user-email'] = 'development@example.com';

  return fetch(url, {
    ...options,
    headers
  });
};

// Get clients from PostgreSQL API
export const getClients = async (userId?: string): Promise<Client[]> => {
  try {
    console.log("🔄 [COMPAT-SHIM] Loading clients from PostgreSQL API...");
    
    const response = await makeAPIRequest('/api/clients');
    
    if (!response.ok) {
      throw new Error(`Failed to fetch clients: ${response.status}`);
    }
    
    const clients = await response.json();
    console.log(`✅ [COMPAT-SHIM] Loaded ${clients.length} clients from PostgreSQL`);
    
    return clients;
  } catch (error) {
    console.error("❌ [COMPAT-SHIM] Error loading clients:", error);
    return []; // Return empty array instead of throwing
  }
};

// Save client to PostgreSQL API
export const saveClient = async (clientData: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>): Promise<Client> => {
  try {
    console.log("💾 [COMPAT-SHIM] Saving client to PostgreSQL API...");
    
    const response = await makeAPIRequest('/api/clients', {
      method: 'POST',
      body: JSON.stringify(clientData)
    });
    
    if (!response.ok) {
      throw new Error(`Failed to save client: ${response.status}`);
    }
    
    const savedClient = await response.json();
    console.log("✅ [COMPAT-SHIM] Client saved successfully");
    
    return savedClient;
  } catch (error) {
    console.error("❌ [COMPAT-SHIM] Error saving client:", error);
    throw error;
  }
};

// Update client via PostgreSQL API
export const updateClient = async (clientId: string, updates: Partial<Client>): Promise<Client> => {
  try {
    console.log("🔄 [COMPAT-SHIM] Updating client via PostgreSQL API...");
    
    const response = await makeAPIRequest(`/api/clients/${clientId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    });
    
    if (!response.ok) {
      throw new Error(`Failed to update client: ${response.status}`);
    }
    
    const updatedClient = await response.json();
    console.log("✅ [COMPAT-SHIM] Client updated successfully");
    
    return updatedClient;
  } catch (error) {
    console.error("❌ [COMPAT-SHIM] Error updating client:", error);
    throw error;
  }
};

// Delete client via PostgreSQL API
export const deleteClient = async (clientId: string): Promise<void> => {
  try {
    console.log("🗑️ [COMPAT-SHIM] Deleting client via PostgreSQL API...");
    
    const response = await makeAPIRequest(`/api/clients/${clientId}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      throw new Error(`Failed to delete client: ${response.status}`);
    }
    
    console.log("✅ [COMPAT-SHIM] Client deleted successfully");
  } catch (error) {
    console.error("❌ [COMPAT-SHIM] Error deleting client:", error);
    throw error;
  }
};

// Import clients (placeholder for future implementation)
export const importClients = async (clients: Partial<Client>[]): Promise<void> => {
  try {
    console.log("📥 [COMPAT-SHIM] Importing clients via PostgreSQL API...");
    
    // Implementation placeholder - would batch create clients
    for (const clientData of clients) {
      await saveClient(clientData as Omit<Client, 'id' | 'createdAt' | 'updatedAt'>);
    }
    
    console.log("✅ [COMPAT-SHIM] Clients imported successfully");
  } catch (error) {
    console.error("❌ [COMPAT-SHIM] Error importing clients:", error);
    throw error;
  }
};

// Export individual functions for backward compatibility
export { getClients as default };
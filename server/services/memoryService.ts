
import { db } from "../firebase";
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  query, 
  orderBy, 
  limit as limitQuery
} from "firebase/firestore";

interface ConversationData {
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
  context?: Record<string, any>;
  timestamp: number;
}

interface ContractorPreferences {
  name: string;
  language: string;
  defaultGreeting?: string;
  commonResponses?: string[];
  workingHours?: {
    start: string;
    end: string;
  };
}

// Función para obtener datos temporales si hay problemas con Firebase
const getTemporaryData = () => {
  return {
    preferences: {
      name: "Acme Fencing",
      language: "es",
      defaultGreeting: "¡Hola, bienvenido a Acme Fencing!"
    },
    recentConversations: []
  };
};

export const memoryService = {
  saveConversation: async (
    contractorId: string,
    conversationId: string,
    data: ConversationData
  ) => {
    try {
      const contractorsCollection = collection(db, "contractors");
      const contractorDoc = doc(contractorsCollection, contractorId);
      const conversationsCollection = collection(contractorDoc, "conversations");
      const conversationDoc = doc(conversationsCollection, conversationId);
      
      await setDoc(conversationDoc, {
        ...data,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error("Error saving conversation:", error);
    }
  },

  getPastConversations: async (contractorId: string, limit = 10) => {
    try {
      const contractorsCollection = collection(db, "contractors");
      const contractorDoc = doc(contractorsCollection, contractorId);
      const conversationsCollection = collection(contractorDoc, "conversations");
      
      const q = query(
        conversationsCollection, 
        orderBy("timestamp", "desc"),
        limitQuery(limit)
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => doc.data() as ConversationData);
    } catch (error) {
      console.error("Error getting past conversations:", error);
      return [];
    }
  },

  getContractorPreferences: async (contractorId: string) => {
    try {
      const contractorsCollection = collection(db, "contractors");
      const contractorDoc = doc(contractorsCollection, contractorId);
      const docSnapshot = await getDoc(contractorDoc);
      
      return docSnapshot.exists() ? (docSnapshot.data() as ContractorPreferences) : null;
    } catch (error) {
      console.error("Error getting contractor preferences:", error);
      return null;
    }
  },

  updateContractorPreferences: async (
    contractorId: string,
    preferences: Partial<ContractorPreferences>
  ) => {
    try {
      const contractorsCollection = collection(db, "contractors");
      const contractorDoc = doc(contractorsCollection, contractorId);
      await updateDoc(contractorDoc, preferences as any);
    } catch (error) {
      console.error("Error updating contractor preferences:", error);
    }
  },

  getLearningContext: async (contractorId: string) => {
    try {
      const preferences = await memoryService.getContractorPreferences(contractorId);
      const recentConversations = await memoryService.getPastConversations(contractorId, 5);
      return { 
        preferences: preferences || { name: "Contratista", language: "es" }, 
        recentConversations 
      };
    } catch (error) {
      console.error("Error getting learning context:", error);
      return getTemporaryData();
    }
  }
};

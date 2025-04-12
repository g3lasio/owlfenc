
import { db } from "../firebase.ts";

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

export const memoryService = {
  saveConversation: async (
    contractorId: string,
    conversationId: string,
    data: ConversationData
  ) => {
    await db
      .collection("contractors")
      .doc(contractorId)
      .collection("conversations")
      .doc(conversationId)
      .set({
        ...data,
        timestamp: Date.now()
      });
  },

  getPastConversations: async (contractorId: string, limit = 10) => {
    const snapshot = await db
      .collection("contractors")
      .doc(contractorId)
      .collection("conversations")
      .orderBy("timestamp", "desc")
      .limit(limit)
      .get();
    return snapshot.docs.map(doc => doc.data() as ConversationData);
  },

  getContractorPreferences: async (contractorId: string) => {
    const doc = await db.collection("contractors").doc(contractorId).get();
    return doc.exists ? (doc.data() as ContractorPreferences) : null;
  },

  updateContractorPreferences: async (
    contractorId: string,
    preferences: Partial<ContractorPreferences>
  ) => {
    await db.collection("contractors").doc(contractorId).update(preferences);
  },

  getLearningContext: async (contractorId: string) => {
    const preferences = await memoryService.getContractorPreferences(contractorId);
    const recentConversations = await memoryService.getPastConversations(contractorId, 5);
    return { preferences, recentConversations };
  }
};

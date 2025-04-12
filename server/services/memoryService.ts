// memoryService.ts
import { db } from "../firebase"; // o Pinecone según prefieras

export const memoryService = {
  saveConversation: async (
    contractorId: string,
    conversationId: string,
    data: any,
  ) => {
    await db
      .collection("contractors")
      .doc(contractorId)
      .collection("conversations")
      .doc(conversationId)
      .set(data);
  },

  getPastConversations: async (contractorId: string) => {
    const snapshot = await db
      .collection("contractors")
      .doc(contractorId)
      .collection("conversations")
      .get();
    return snapshot.docs.map((doc) => doc.data());
  },

  getContractorPreferences: async (contractorId: string) => {
    const doc = await db.collection("contractors").doc(contractorId).get();
    return doc.exists ? doc.data() : null;
  },

  updateContractorPreferences: async (
    contractorId: string,
    preferences: any,
  ) => {
    await db.collection("contractors").doc(contractorId).update(preferences);
  },
};

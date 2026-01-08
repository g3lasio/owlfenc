/**
 * Semantic Memory System for Mervin AI
 * 
 * Stores and retrieves general knowledge, concepts, and their relationships.
 * Unlike episodic memory (specific events), this stores abstract knowledge:
 * - Concepts and their definitions
 * - Relationships between concepts
 * - General patterns and rules
 * - Domain-specific knowledge
 */

import { db } from '../../lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

export interface Concept {
  id: string;
  name: string;
  type: 'entity' | 'action' | 'pattern' | 'rule' | 'preference';
  
  // Core knowledge
  definition: string;
  examples: string[];
  relatedConcepts: string[]; // IDs of related concepts
  
  // Learning metrics
  confidence: number; // 0-1 scale
  timesUsed: number;
  successRate: number; // When this concept was applied
  lastUsed: Date;
  
  // Context
  domain: string; // 'construction', 'legal', 'general'
  userId?: string; // User-specific concept (null = global)
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

export interface ConceptQuery {
  name?: string;
  type?: string;
  domain?: string;
  userId?: string;
  minConfidence?: number;
  limit?: number;
}

export class SemanticMemorySystem {
  private collectionName = 'mervin_semantic_memory';
  
  /**
   * Store or update a concept
   */
  async storeConcept(concept: Omit<Concept, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      // Check if concept already exists
      const existing = await this.findConceptByName(concept.name, concept.userId);
      
      if (existing) {
        // Update existing concept
        await db.collection(this.collectionName).doc(existing.id).update({
          ...concept,
          timesUsed: existing.timesUsed + 1,
          lastUsed: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
        
        console.log(`[SemanticMemory] Updated concept: ${existing.id}`);
        return existing.id;
      } else {
        // Create new concept
        const docRef = await db.collection(this.collectionName).add({
          ...concept,
          timesUsed: 0,
          successRate: 1.0,
          lastUsed: Timestamp.now(),
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
        
        console.log(`[SemanticMemory] Stored new concept: ${docRef.id}`);
        return docRef.id;
      }
    } catch (error) {
      console.error('[SemanticMemory] Error storing concept:', error);
      throw error;
    }
  }
  
  /**
   * Find concept by name
   */
  async findConceptByName(name: string, userId?: string): Promise<Concept | null> {
    try {
      let query = db.collection(this.collectionName)
        .where('name', '==', name);
      
      if (userId) {
        query = query.where('userId', '==', userId) as any;
      } else {
        query = query.where('userId', '==', null) as any;
      }
      
      const snapshot = await query.limit(1).get();
      
      if (snapshot.empty) {
        return null;
      }
      
      const doc = snapshot.docs[0];
      const data = doc.data();
      
      return {
        id: doc.id,
        ...data,
        lastUsed: data.lastUsed.toDate(),
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate(),
      } as Concept;
    } catch (error) {
      console.error('[SemanticMemory] Error finding concept:', error);
      return null;
    }
  }
  
  /**
   * Retrieve concepts matching query
   */
  async retrieveConcepts(query: ConceptQuery): Promise<Concept[]> {
    try {
      let firestoreQuery = db.collection(this.collectionName).orderBy('confidence', 'desc');
      
      if (query.type) {
        firestoreQuery = firestoreQuery.where('type', '==', query.type) as any;
      }
      
      if (query.domain) {
        firestoreQuery = firestoreQuery.where('domain', '==', query.domain) as any;
      }
      
      if (query.userId !== undefined) {
        firestoreQuery = firestoreQuery.where('userId', '==', query.userId) as any;
      }
      
      if (query.minConfidence) {
        firestoreQuery = firestoreQuery.where('confidence', '>=', query.minConfidence) as any;
      }
      
      if (query.limit) {
        firestoreQuery = firestoreQuery.limit(query.limit) as any;
      }
      
      const snapshot = await firestoreQuery.get();
      
      const concepts: Concept[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        concepts.push({
          id: doc.id,
          ...data,
          lastUsed: data.lastUsed.toDate(),
          createdAt: data.createdAt.toDate(),
          updatedAt: data.updatedAt.toDate(),
        } as Concept);
      });
      
      console.log(`[SemanticMemory] Retrieved ${concepts.length} concepts`);
      return concepts;
    } catch (error) {
      console.error('[SemanticMemory] Error retrieving concepts:', error);
      return [];
    }
  }
  
  /**
   * Update concept usage and success metrics
   */
  async updateConceptMetrics(conceptId: string, success: boolean): Promise<void> {
    try {
      const docRef = db.collection(this.collectionName).doc(conceptId);
      const doc = await docRef.get();
      
      if (!doc.exists) {
        console.warn(`[SemanticMemory] Concept ${conceptId} not found`);
        return;
      }
      
      const data = doc.data()!;
      const currentSuccessRate = data.successRate || 1.0;
      const currentTimesUsed = data.timesUsed || 0;
      
      // Calculate new success rate (weighted average)
      const newSuccessRate = (currentSuccessRate * currentTimesUsed + (success ? 1 : 0)) / (currentTimesUsed + 1);
      
      // Update confidence based on success rate and usage
      const newConfidence = Math.min(1.0, newSuccessRate * Math.min(1.0, currentTimesUsed / 10));
      
      await docRef.update({
        timesUsed: currentTimesUsed + 1,
        successRate: newSuccessRate,
        confidence: newConfidence,
        lastUsed: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      
      console.log(`[SemanticMemory] Updated metrics for concept ${conceptId}`);
    } catch (error) {
      console.error('[SemanticMemory] Error updating concept metrics:', error);
    }
  }
  
  /**
   * Find related concepts
   */
  async findRelatedConcepts(conceptId: string, maxDepth: number = 2): Promise<Concept[]> {
    try {
      const visited = new Set<string>();
      const related: Concept[] = [];
      
      const explore = async (id: string, depth: number) => {
        if (depth > maxDepth || visited.has(id)) {
          return;
        }
        
        visited.add(id);
        
        const doc = await db.collection(this.collectionName).doc(id).get();
        if (!doc.exists) {
          return;
        }
        
        const data = doc.data()!;
        const concept: Concept = {
          id: doc.id,
          ...data,
          lastUsed: data.lastUsed.toDate(),
          createdAt: data.createdAt.toDate(),
          updatedAt: data.updatedAt.toDate(),
        } as Concept;
        
        if (id !== conceptId) {
          related.push(concept);
        }
        
        // Explore related concepts
        for (const relatedId of concept.relatedConcepts || []) {
          await explore(relatedId, depth + 1);
        }
      };
      
      await explore(conceptId, 0);
      
      console.log(`[SemanticMemory] Found ${related.length} related concepts`);
      return related;
    } catch (error) {
      console.error('[SemanticMemory] Error finding related concepts:', error);
      return [];
    }
  }
  
  /**
   * Learn a new pattern from observations
   */
  async learnPattern(
    name: string,
    definition: string,
    examples: string[],
    domain: string,
    userId?: string
  ): Promise<string> {
    return this.storeConcept({
      name,
      type: 'pattern',
      definition,
      examples,
      relatedConcepts: [],
      confidence: 0.5, // Start with medium confidence
      domain,
      userId,
    });
  }
  
  /**
   * Store user preference
   */
  async storePreference(
    userId: string,
    name: string,
    definition: string,
    examples: string[]
  ): Promise<string> {
    return this.storeConcept({
      name,
      type: 'preference',
      definition,
      examples,
      relatedConcepts: [],
      confidence: 1.0,
      domain: 'user_preference',
      userId,
    });
  }
  
  /**
   * Get user's learned preferences
   */
  async getUserPreferences(userId: string): Promise<Concept[]> {
    return this.retrieveConcepts({
      type: 'preference',
      userId,
      minConfidence: 0.7,
    });
  }
  
  /**
   * Get domain knowledge
   */
  async getDomainKnowledge(domain: string, minConfidence: number = 0.7): Promise<Concept[]> {
    return this.retrieveConcepts({
      domain,
      minConfidence,
      limit: 50,
    });
  }
  
  /**
   * Link two concepts together
   */
  async linkConcepts(conceptId1: string, conceptId2: string): Promise<void> {
    try {
      const doc1 = await db.collection(this.collectionName).doc(conceptId1).get();
      const doc2 = await db.collection(this.collectionName).doc(conceptId2).get();
      
      if (!doc1.exists || !doc2.exists) {
        console.warn('[SemanticMemory] One or both concepts not found');
        return;
      }
      
      const data1 = doc1.data()!;
      const data2 = doc2.data()!;
      
      const related1 = data1.relatedConcepts || [];
      const related2 = data2.relatedConcepts || [];
      
      // Add bidirectional link if not already present
      if (!related1.includes(conceptId2)) {
        await doc1.ref.update({
          relatedConcepts: [...related1, conceptId2],
          updatedAt: Timestamp.now(),
        });
      }
      
      if (!related2.includes(conceptId1)) {
        await doc2.ref.update({
          relatedConcepts: [...related2, conceptId1],
          updatedAt: Timestamp.now(),
        });
      }
      
      console.log(`[SemanticMemory] Linked concepts ${conceptId1} <-> ${conceptId2}`);
    } catch (error) {
      console.error('[SemanticMemory] Error linking concepts:', error);
    }
  }
}

// Export singleton instance
export const semanticMemory = new SemanticMemorySystem();

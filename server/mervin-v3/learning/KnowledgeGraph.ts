/**
 * Knowledge Graph System for Mervin AI
 * 
 * Creates and maintains a graph of interconnected knowledge that allows Mervin to:
 * - Connect related concepts and entities
 * - Reason about relationships
 * - Infer new knowledge from existing connections
 * - Discover patterns through graph traversal
 * - Make intelligent recommendations based on connections
 */

import { semanticMemory, Concept } from '../memory/SemanticMemory';
import { episodicMemory } from '../memory/EpisodicMemory';

export interface KnowledgeNode {
  id: string;
  type: 'entity' | 'concept' | 'action' | 'pattern' | 'rule';
  name: string;
  properties: Record<string, any>;
  confidence: number;
}

export interface KnowledgeEdge {
  from: string; // Node ID
  to: string; // Node ID
  relationship: string; // Type of relationship
  strength: number; // 0-1 scale
  evidence: string[]; // Supporting evidence
}

export interface InferenceResult {
  conclusion: string;
  confidence: number;
  reasoning: string[];
  supportingEvidence: string[];
}

export class KnowledgeGraphSystem {
  /**
   * Build knowledge graph from user's history
   */
  async buildUserKnowledgeGraph(userId: string): Promise<{
    nodes: KnowledgeNode[];
    edges: KnowledgeEdge[];
  }> {
    try {
      console.log(`[KnowledgeGraph] Building graph for user ${userId}`);
      
      const nodes: KnowledgeNode[] = [];
      const edges: KnowledgeEdge[] = [];
      const nodeMap = new Map<string, KnowledgeNode>();
      
      // Get user's concepts
      const concepts = await semanticMemory.retrieveConcepts({
        userId,
        minConfidence: 0.5,
        limit: 100,
      });
      
      // Add concept nodes
      concepts.forEach(concept => {
        const node: KnowledgeNode = {
          id: concept.id,
          type: concept.type as any,
          name: concept.name,
          properties: {
            definition: concept.definition,
            domain: concept.domain,
            timesUsed: concept.timesUsed,
            successRate: concept.successRate,
          },
          confidence: concept.confidence,
        };
        nodes.push(node);
        nodeMap.set(concept.id, node);
        
        // Add edges from related concepts
        concept.relatedConcepts.forEach(relatedId => {
          edges.push({
            from: concept.id,
            to: relatedId,
            relationship: 'related_to',
            strength: 0.7,
            evidence: ['Explicitly linked in semantic memory'],
          });
        });
      });
      
      // Get user's episodes to infer additional connections
      const episodes = await episodicMemory.retrieveEpisodes({
        userId,
        limit: 50,
      });
      
      // Infer connections from co-occurrence in episodes
      const coOccurrence = new Map<string, Map<string, number>>();
      
      episodes.forEach(episode => {
        const entities = Object.values(episode.context.entities || {});
        
        // Count co-occurrences
        for (let i = 0; i < entities.length; i++) {
          for (let j = i + 1; j < entities.length; j++) {
            const entity1 = String(entities[i]);
            const entity2 = String(entities[j]);
            
            if (!coOccurrence.has(entity1)) {
              coOccurrence.set(entity1, new Map());
            }
            const map = coOccurrence.get(entity1)!;
            map.set(entity2, (map.get(entity2) || 0) + 1);
          }
        }
      });
      
      // Add inferred edges
      coOccurrence.forEach((targets, source) => {
        targets.forEach((count, target) => {
          if (count >= 3) { // Threshold: co-occurred at least 3 times
            const strength = Math.min(1.0, count / 10);
            edges.push({
              from: source,
              to: target,
              relationship: 'co_occurs_with',
              strength,
              evidence: [`Co-occurred in ${count} episodes`],
            });
          }
        });
      });
      
      console.log(`[KnowledgeGraph] Built graph with ${nodes.length} nodes and ${edges.length} edges`);
      
      return { nodes, edges };
    } catch (error) {
      console.error('[KnowledgeGraph] Error building knowledge graph:', error);
      return { nodes: [], edges: [] };
    }
  }
  
  /**
   * Find path between two concepts
   */
  async findPath(
    userId: string,
    fromConcept: string,
    toConcept: string,
    maxDepth: number = 3
  ): Promise<string[] | null> {
    try {
      const { nodes, edges } = await this.buildUserKnowledgeGraph(userId);
      
      // Build adjacency list
      const adjacency = new Map<string, string[]>();
      edges.forEach(edge => {
        if (!adjacency.has(edge.from)) {
          adjacency.set(edge.from, []);
        }
        adjacency.get(edge.from)!.push(edge.to);
      });
      
      // BFS to find shortest path
      const queue: Array<{ node: string; path: string[] }> = [
        { node: fromConcept, path: [fromConcept] }
      ];
      const visited = new Set<string>();
      
      while (queue.length > 0) {
        const { node, path } = queue.shift()!;
        
        if (node === toConcept) {
          return path;
        }
        
        if (path.length >= maxDepth || visited.has(node)) {
          continue;
        }
        
        visited.add(node);
        
        const neighbors = adjacency.get(node) || [];
        neighbors.forEach(neighbor => {
          queue.push({
            node: neighbor,
            path: [...path, neighbor],
          });
        });
      }
      
      return null; // No path found
    } catch (error) {
      console.error('[KnowledgeGraph] Error finding path:', error);
      return null;
    }
  }
  
  /**
   * Infer new knowledge from existing connections
   */
  async inferKnowledge(
    userId: string,
    query: string
  ): Promise<InferenceResult[]> {
    try {
      const inferences: InferenceResult[] = [];
      
      // Get user's knowledge graph
      const { nodes, edges } = await this.buildUserKnowledgeGraph(userId);
      
      // Build adjacency list with edge details
      const adjacency = new Map<string, Array<{ to: string; edge: KnowledgeEdge }>>();
      edges.forEach(edge => {
        if (!adjacency.has(edge.from)) {
          adjacency.set(edge.from, []);
        }
        adjacency.get(edge.from)!.push({ to: edge.to, edge });
      });
      
      // Find nodes relevant to query
      const relevantNodes = nodes.filter(node => 
        node.name.toLowerCase().includes(query.toLowerCase()) ||
        query.toLowerCase().includes(node.name.toLowerCase())
      );
      
      // For each relevant node, explore connections
      relevantNodes.forEach(node => {
        const neighbors = adjacency.get(node.id) || [];
        
        neighbors.forEach(({ to, edge }) => {
          const targetNode = nodes.find(n => n.id === to);
          if (!targetNode) return;
          
          // Infer relationship
          if (edge.relationship === 'co_occurs_with' && edge.strength > 0.7) {
            inferences.push({
              conclusion: `${node.name} is often associated with ${targetNode.name}`,
              confidence: edge.strength,
              reasoning: [
                `${node.name} and ${targetNode.name} frequently appear together`,
                `Relationship strength: ${(edge.strength * 100).toFixed(0)}%`,
              ],
              supportingEvidence: edge.evidence,
            });
          }
          
          if (edge.relationship === 'related_to') {
            inferences.push({
              conclusion: `${node.name} is related to ${targetNode.name}`,
              confidence: edge.strength,
              reasoning: [
                `Direct relationship exists in knowledge base`,
                `Both concepts are in the ${node.properties.domain} domain`,
              ],
              supportingEvidence: edge.evidence,
            });
          }
        });
        
        // Infer from node properties
        if (node.properties.successRate > 0.8 && node.properties.timesUsed > 10) {
          inferences.push({
            conclusion: `${node.name} is a reliable and well-tested approach`,
            confidence: node.properties.successRate,
            reasoning: [
              `Used successfully ${node.properties.timesUsed} times`,
              `Success rate: ${(node.properties.successRate * 100).toFixed(0)}%`,
            ],
            supportingEvidence: [`Historical performance data`],
          });
        }
      });
      
      // Sort by confidence
      inferences.sort((a, b) => b.confidence - a.confidence);
      
      console.log(`[KnowledgeGraph] Generated ${inferences.length} inferences`);
      
      return inferences.slice(0, 5); // Return top 5
    } catch (error) {
      console.error('[KnowledgeGraph] Error inferring knowledge:', error);
      return [];
    }
  }
  
  /**
   * Discover patterns through graph analysis
   */
  async discoverPatterns(userId: string): Promise<Array<{
    pattern: string;
    confidence: number;
    examples: string[];
    recommendation: string;
  }>> {
    try {
      const patterns: Array<{
        pattern: string;
        confidence: number;
        examples: string[];
        recommendation: string;
      }> = [];
      
      const { nodes, edges } = await this.buildUserKnowledgeGraph(userId);
      
      // Pattern 1: Highly connected nodes (hubs)
      const connectionCounts = new Map<string, number>();
      edges.forEach(edge => {
        connectionCounts.set(edge.from, (connectionCounts.get(edge.from) || 0) + 1);
      });
      
      const hubs = Array.from(connectionCounts.entries())
        .filter(([_, count]) => count >= 5)
        .map(([nodeId, count]) => {
          const node = nodes.find(n => n.id === nodeId);
          return { node, count };
        })
        .filter(({ node }) => node !== undefined);
      
      hubs.forEach(({ node, count }) => {
        if (!node) return;
        patterns.push({
          pattern: `${node.name} is a central concept`,
          confidence: Math.min(1.0, count / 10),
          examples: [`Connected to ${count} other concepts`],
          recommendation: `Consider ${node.name} as a key factor in decision-making`,
        });
      });
      
      // Pattern 2: Strong co-occurrence patterns
      const strongCoOccurrences = edges
        .filter(e => e.relationship === 'co_occurs_with' && e.strength > 0.7)
        .slice(0, 5);
      
      strongCoOccurrences.forEach(edge => {
        const fromNode = nodes.find(n => n.id === edge.from);
        const toNode = nodes.find(n => n.id === edge.to);
        
        if (fromNode && toNode) {
          patterns.push({
            pattern: `${fromNode.name} and ${toNode.name} often appear together`,
            confidence: edge.strength,
            examples: edge.evidence,
            recommendation: `When dealing with ${fromNode.name}, consider ${toNode.name}`,
          });
        }
      });
      
      // Pattern 3: High success rate concepts
      const successfulConcepts = nodes
        .filter(n => n.properties.successRate > 0.8 && n.properties.timesUsed > 5)
        .sort((a, b) => b.properties.successRate - a.properties.successRate)
        .slice(0, 3);
      
      successfulConcepts.forEach(node => {
        patterns.push({
          pattern: `${node.name} has consistently high success`,
          confidence: node.properties.successRate,
          examples: [`Used ${node.properties.timesUsed} times with ${(node.properties.successRate * 100).toFixed(0)}% success`],
          recommendation: `Prioritize using ${node.name} in similar situations`,
        });
      });
      
      console.log(`[KnowledgeGraph] Discovered ${patterns.length} patterns`);
      
      return patterns;
    } catch (error) {
      console.error('[KnowledgeGraph] Error discovering patterns:', error);
      return [];
    }
  }
  
  /**
   * Make intelligent recommendations based on graph
   */
  async makeRecommendations(
    userId: string,
    currentContext: {
      intent: string;
      entities: Record<string, any>;
    }
  ): Promise<Array<{
    recommendation: string;
    confidence: number;
    reasoning: string[];
  }>> {
    try {
      const recommendations: Array<{
        recommendation: string;
        confidence: number;
        reasoning: string[];
      }> = [];
      
      const { nodes, edges } = await this.buildUserKnowledgeGraph(userId);
      
      // Find nodes related to current context
      const contextNodes = nodes.filter(node => {
        // Check if node name matches intent or entities
        const matchesIntent = node.name.toLowerCase().includes(currentContext.intent.toLowerCase());
        const matchesEntities = Object.values(currentContext.entities).some(value =>
          String(value).toLowerCase().includes(node.name.toLowerCase())
        );
        return matchesIntent || matchesEntities;
      });
      
      if (contextNodes.length === 0) {
        return [];
      }
      
      // For each context node, find strongly connected nodes
      contextNodes.forEach(contextNode => {
        const outgoingEdges = edges.filter(e => e.from === contextNode.id && e.strength > 0.6);
        
        outgoingEdges.forEach(edge => {
          const targetNode = nodes.find(n => n.id === edge.to);
          if (!targetNode) return;
          
          recommendations.push({
            recommendation: `Consider ${targetNode.name}`,
            confidence: edge.strength * targetNode.confidence,
            reasoning: [
              `${contextNode.name} is strongly connected to ${targetNode.name}`,
              `Connection strength: ${(edge.strength * 100).toFixed(0)}%`,
              `${targetNode.name} has ${(targetNode.confidence * 100).toFixed(0)}% confidence`,
            ],
          });
        });
      });
      
      // Sort by confidence and return top recommendations
      recommendations.sort((a, b) => b.confidence - a.confidence);
      
      console.log(`[KnowledgeGraph] Generated ${recommendations.length} recommendations`);
      
      return recommendations.slice(0, 5);
    } catch (error) {
      console.error('[KnowledgeGraph] Error making recommendations:', error);
      return [];
    }
  }
  
  /**
   * Visualize knowledge graph (for debugging/dashboard)
   */
  async visualizeGraph(userId: string): Promise<{
    nodes: Array<{ id: string; label: string; type: string; size: number }>;
    edges: Array<{ from: string; to: string; label: string; width: number }>;
  }> {
    try {
      const { nodes, edges } = await this.buildUserKnowledgeGraph(userId);
      
      // Format for visualization
      const visualNodes = nodes.map(node => ({
        id: node.id,
        label: node.name,
        type: node.type,
        size: Math.max(10, node.properties.timesUsed || 10),
      }));
      
      const visualEdges = edges.map(edge => ({
        from: edge.from,
        to: edge.to,
        label: edge.relationship,
        width: Math.max(1, edge.strength * 5),
      }));
      
      return {
        nodes: visualNodes,
        edges: visualEdges,
      };
    } catch (error) {
      console.error('[KnowledgeGraph] Error visualizing graph:', error);
      return { nodes: [], edges: [] };
    }
  }
}

// Export singleton instance
export const knowledgeGraph = new KnowledgeGraphSystem();

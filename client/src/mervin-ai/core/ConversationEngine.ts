/**
 * CONVERSATION ENGINE - MOTOR DE CONVERSACIÓN INTELIGENTE
 * 
 * Versión simplificada V2 compatible con Mervin AI V2
 * Conserva la personalidad mexicana y detección de idioma
 * 
 * V2 MIGRATION: Simplificado para eliminar dependencias legacy
 */

import { LanguageDetector, LanguageProfile, languageDetector } from './LanguageDetector';

export interface ConversationState {
  currentLanguageProfile: LanguageProfile;
  conversationHistory: ConversationTurn[];
  currentTopic?: string;
  userEmotion: 'frustrated' | 'excited' | 'confused' | 'satisfied' | 'neutral';
  lastInteractionTime: Date;
}

export interface ConversationTurn {
  id: string;
  userMessage: string;
  agentResponse: string;
  languageProfile: LanguageProfile;
  emotion: string;
  timestamp: Date;
  topic?: string;
}

export interface ConversationResponse {
  message: string;
  emotion: 'empathetic' | 'enthusiastic' | 'helpful' | 'clarifying' | 'celebrating';
  languageProfile: LanguageProfile;
  suggestedActions?: string[];
  followUpQuestions?: string[];
}

/**
 * Simplified ConversationEngine for V2
 * Focuses on language detection and Mexican personality
 */
class ConversationEngine {
  private state: ConversationState;
  private languageDetector: LanguageDetector;
  private readonly MAX_HISTORY = 20;

  constructor(userId: string) {
    // Security validation
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      throw new Error('🚨 SECURITY: userId is required and cannot be empty');
    }
    
    if (userId === 'null' || userId === 'undefined' || userId.includes('<script') || userId.includes('../')) {
      throw new Error('🚨 SECURITY: Invalid userId format detected');
    }

    this.languageDetector = languageDetector;
    this.state = {
      currentLanguageProfile: {
        language: 'spanish',
        confidence: 0.8,
        region: 'mexican',
        personalityStyle: this.languageDetector['mexicanPersonality'],
        detectedPhrases: []
      },
      conversationHistory: [],
      userEmotion: 'neutral',
      lastInteractionTime: new Date()
    };

    console.log(`🗣️ [CONVERSATION-ENGINE-V2] Initialized for user: ${userId}`);
  }

  /**
   * Process user message with language detection
   */
  async processUserMessage(userMessage: string, context?: any): Promise<ConversationResponse> {
    const sanitizedMessage = this.sanitizeInput(userMessage);
    
    // Detect language and personality
    const languageProfile = this.languageDetector.detectLanguage(sanitizedMessage);
    this.updateLanguageProfile(languageProfile);

    // Determine emotion
    this.state.userEmotion = this.determineEmotion(sanitizedMessage);

    // Generate response
    const response: ConversationResponse = {
      message: '', // To be filled by AI service
      emotion: this.mapToResponseEmotion(this.state.userEmotion),
      languageProfile: languageProfile
    };

    // Record interaction
    this.recordInteraction(sanitizedMessage, response.message, languageProfile);

    return response;
  }

  /**
   * Get current language profile
   */
  getLanguageProfile(): LanguageProfile {
    return this.state.currentLanguageProfile;
  }

  /**
   * Get conversation history
   */
  getHistory(): ConversationTurn[] {
    return this.state.conversationHistory;
  }

  /**
   * Clear conversation history
   */
  clearHistory(): void {
    this.state.conversationHistory = [];
    console.log('🗑️ [CONVERSATION-ENGINE-V2] History cleared');
  }

  // ============= PRIVATE HELPERS =============

  private sanitizeInput(input: string): string {
    return input
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, '')
      .trim()
      .substring(0, 5000);
  }

  private updateLanguageProfile(profile: LanguageProfile): void {
    this.state.currentLanguageProfile = profile;
  }

  private determineEmotion(message: string): 'frustrated' | 'excited' | 'confused' | 'satisfied' | 'neutral' {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('!') || lowerMessage.includes('genial') || lowerMessage.includes('excelente')) {
      return 'excited';
    }
    if (lowerMessage.includes('?') && lowerMessage.length < 50) {
      return 'confused';
    }
    if (lowerMessage.includes('gracias') || lowerMessage.includes('perfecto')) {
      return 'satisfied';
    }
    if (lowerMessage.includes('no funciona') || lowerMessage.includes('error')) {
      return 'frustrated';
    }
    
    return 'neutral';
  }

  private mapToResponseEmotion(userEmotion: string): 'empathetic' | 'enthusiastic' | 'helpful' | 'clarifying' | 'celebrating' {
    switch (userEmotion) {
      case 'frustrated':
        return 'empathetic';
      case 'excited':
        return 'enthusiastic';
      case 'confused':
        return 'clarifying';
      case 'satisfied':
        return 'celebrating';
      default:
        return 'helpful';
    }
  }

  private recordInteraction(userMessage: string, agentResponse: string, profile: LanguageProfile): void {
    const turn: ConversationTurn = {
      id: `turn_${Date.now()}`,
      userMessage,
      agentResponse,
      languageProfile: profile,
      emotion: this.state.userEmotion,
      timestamp: new Date()
    };

    this.state.conversationHistory.push(turn);
    
    // Keep only recent history
    if (this.state.conversationHistory.length > this.MAX_HISTORY) {
      this.state.conversationHistory = this.state.conversationHistory.slice(-this.MAX_HISTORY);
    }

    this.state.lastInteractionTime = new Date();
  }
}

// Export singleton instance
export { ConversationEngine };
export const conversationEngine = ConversationEngine;

import OpenAI from "openai";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { db } from "../db";
import { 
  userProfiles, 
  chatSessions, 
  chatMessages, 
  agentActions,
  InsertUserProfile,
  InsertChatSession,
  InsertChatMessage,
  InsertAgentAction,
  UserProfile,
  ChatSession,
  ChatMessage,
  AgentAction
} from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Tool definitions for Mervin Agent mode
const AGENT_TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "generate_invoice",
      description: "Generate an invoice for a client based on project data",
      parameters: {
        type: "object",
        properties: {
          projectId: { type: "string", description: "Project ID if exists" },
          clientName: { type: "string", description: "Client name" },
          clientEmail: { type: "string", description: "Client email" },
          projectDescription: { type: "string", description: "Description of work" },
          amount: { type: "number", description: "Invoice amount" },
          dueDate: { type: "string", description: "Due date in YYYY-MM-DD format" }
        },
        required: ["clientName", "clientEmail", "projectDescription", "amount"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "generate_contract",
      description: "Generate a contract for a client project",
      parameters: {
        type: "object",
        properties: {
          projectId: { type: "string", description: "Project ID if exists" },
          clientName: { type: "string", description: "Client name" },
          clientEmail: { type: "string", description: "Client email" },
          projectDescription: { type: "string", description: "Project description" },
          totalAmount: { type: "number", description: "Total contract amount" },
          startDate: { type: "string", description: "Start date in YYYY-MM-DD format" },
          completionDate: { type: "string", description: "Completion date in YYYY-MM-DD format" }
        },
        required: ["clientName", "clientEmail", "projectDescription", "totalAmount"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "lookup_property_owner",
      description: "Look up property owner information by address or APN",
      parameters: {
        type: "object",
        properties: {
          address: { type: "string", description: "Property address" },
          apn: { type: "string", description: "Assessor's Parcel Number (optional)" }
        },
        required: ["address"]
      }
    }
  }
];

export class MervinChatService {
  private ensureDatabase() {
    if (!db) {
      throw new Error("Database connection not available");
    }
    return db;
  }

  // User Profile Management
  async getUserProfile(firebaseUid: string): Promise<UserProfile | null> {
    const database = this.ensureDatabase();
    const [profile] = await database
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.firebaseUid, firebaseUid))
      .limit(1);
    
    return profile || null;
  }

  async createUserProfile(data: InsertUserProfile): Promise<UserProfile> {
    const database = this.ensureDatabase();
    const [profile] = await database
      .insert(userProfiles)
      .values(data)
      .returning();
    
    return profile;
  }

  async updateUserProfile(firebaseUid: string, updates: Partial<InsertUserProfile>): Promise<UserProfile> {
    const database = this.ensureDatabase();
    const [profile] = await database
      .update(userProfiles)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(userProfiles.firebaseUid, firebaseUid))
      .returning();
    
    return profile;
  }

  // Chat Session Management
  async createChatSession(firebaseUid: string, mode: "mervin" | "mervin_agent"): Promise<ChatSession> {
    const database = this.ensureDatabase();
    const sessionData: InsertChatSession = {
      firebaseUid,
      sessionId: uuidv4(),
      mode,
      title: null,
      isActive: true,
      metadata: {}
    };

    const [session] = await database
      .insert(chatSessions)
      .values(sessionData)
      .returning();
    
    return session;
  }

  async getChatSession(sessionId: string): Promise<ChatSession | null> {
    const database = this.ensureDatabase();
    const [session] = await database
      .select()
      .from(chatSessions)
      .where(eq(chatSessions.sessionId, sessionId))
      .limit(1);
    
    return session || null;
  }

  async getUserActiveSessions(firebaseUid: string): Promise<ChatSession[]> {
    const database = this.ensureDatabase();
    return await database
      .select()
      .from(chatSessions)
      .where(and(
        eq(chatSessions.firebaseUid, firebaseUid),
        eq(chatSessions.isActive, true)
      ))
      .orderBy(desc(chatSessions.lastMessageAt));
  }

  async updateSessionTitle(sessionId: string, title: string): Promise<void> {
    const database = this.ensureDatabase();
    await database
      .update(chatSessions)
      .set({ title })
      .where(eq(chatSessions.sessionId, sessionId));
  }

  // Chat Message Management
  async addMessage(data: InsertChatMessage): Promise<ChatMessage> {
    const database = this.ensureDatabase();
    const [message] = await database
      .insert(chatMessages)
      .values(data)
      .returning();
    
    // Update session last message time
    await database
      .update(chatSessions)
      .set({ lastMessageAt: new Date() })
      .where(eq(chatSessions.sessionId, data.sessionId));
    
    return message;
  }

  async getSessionMessages(sessionId: string): Promise<ChatMessage[]> {
    const database = this.ensureDatabase();
    return await database
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.sessionId, sessionId))
      .orderBy(chatMessages.createdAt);
  }

  // Agent Action Management
  async createAgentAction(data: InsertAgentAction): Promise<AgentAction> {
    const database = this.ensureDatabase();
    const [action] = await database
      .insert(agentActions)
      .values(data)
      .returning();
    
    return action;
  }

  async updateAgentAction(requestId: string, updates: Partial<AgentAction>): Promise<AgentAction> {
    const database = this.ensureDatabase();
    const [action] = await database
      .update(agentActions)
      .set({ ...updates, completedAt: updates.status === 'success' || updates.status === 'error' ? new Date() : undefined })
      .where(eq(agentActions.requestId, requestId))
      .returning();
    
    return action;
  }

  async getUserRecentActions(firebaseUid: string, limit: number = 10): Promise<AgentAction[]> {
    const database = this.ensureDatabase();
    return await database
      .select()
      .from(agentActions)
      .where(eq(agentActions.firebaseUid, firebaseUid))
      .orderBy(desc(agentActions.createdAt))
      .limit(limit);
  }

  // Chat Processing
  async processChat(
    sessionId: string,
    userMessage: string,
    firebaseUid: string
  ): Promise<{ response: string; toolCalls?: any[] }> {
    // Get session to determine mode
    const session = await this.getChatSession(sessionId);
    if (!session) {
      throw new Error("Session not found");
    }

    // Get user profile for context
    const profile = await this.getUserProfile(firebaseUid);
    
    // Get conversation history
    const messages = await this.getSessionMessages(sessionId);
    
    // Build context for AI
    const systemPrompt = this.buildSystemPrompt(session.mode, profile);
    const conversationHistory = messages.map(msg => ({
      role: msg.role as "user" | "assistant" | "system",
      content: msg.content
    }));

    // Add user message to database
    await this.addMessage({
      sessionId,
      messageId: uuidv4(),
      role: "user",
      content: userMessage,
      messageType: "text",
      metadata: {}
    });

    // Prepare OpenAI messages
    const openaiMessages = [
      { role: "system" as const, content: systemPrompt },
      ...conversationHistory,
      { role: "user" as const, content: userMessage }
    ];

    // Call OpenAI with or without tools based on mode
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: openaiMessages,
      tools: session.mode === "mervin_agent" ? AGENT_TOOLS : undefined,
      tool_choice: session.mode === "mervin_agent" ? "auto" : undefined,
      temperature: 0.7,
      max_tokens: 1000
    });

    const response = completion.choices[0].message;
    const toolCalls = response.tool_calls;

    // Add assistant response to database
    await this.addMessage({
      sessionId,
      messageId: uuidv4(),
      role: "assistant",
      content: response.content || "",
      messageType: toolCalls ? "tool_call" : "text",
      toolCalls: toolCalls || undefined,
      metadata: {}
    });

    // Generate session title if this is the first exchange
    if (messages.length === 0) {
      const title = await this.generateSessionTitle(userMessage);
      await this.updateSessionTitle(sessionId, title);
    }

    return {
      response: response.content || "",
      toolCalls: toolCalls || undefined
    };
  }

  // Execute tool calls for agent mode
  async executeToolCall(
    toolCall: any,
    sessionId: string,
    messageId: string,
    firebaseUid: string
  ): Promise<any> {
    const requestId = uuidv4();
    const startTime = Date.now();

    // Create action record
    await this.createAgentAction({
      firebaseUid,
      sessionId,
      messageId,
      actionType: toolCall.function.name,
      actionPayload: toolCall.function.arguments,
      requestId,
      status: "pending"
    });

    try {
      let result;
      
      switch (toolCall.function.name) {
        case "generate_invoice":
          result = await this.executeGenerateInvoice(JSON.parse(toolCall.function.arguments));
          break;
        case "generate_contract":
          result = await this.executeGenerateContract(JSON.parse(toolCall.function.arguments));
          break;
        case "lookup_property_owner":
          result = await this.executePropertyLookup(JSON.parse(toolCall.function.arguments));
          break;
        default:
          throw new Error(`Unknown tool: ${toolCall.function.name}`);
      }

      // Update action record with success
      await this.updateAgentAction(requestId, {
        status: "success",
        actionResponse: result,
        executionTimeMs: Date.now() - startTime
      });

      return result;
    } catch (error: any) {
      // Update action record with error
      await this.updateAgentAction(requestId, {
        status: "error",
        errorMessage: error.message,
        executionTimeMs: Date.now() - startTime
      });

      throw error;
    }
  }

  // Tool execution methods (integrating with existing endpoints)
  private async executeGenerateInvoice(params: any): Promise<any> {
    // This would integrate with existing invoice generation endpoints
    // For now, return a mock response
    return {
      success: true,
      invoiceId: uuidv4(),
      message: "Invoice generated successfully",
      downloadUrl: "/api/invoices/download/" + uuidv4()
    };
  }

  private async executeGenerateContract(params: any): Promise<any> {
    // This would integrate with existing contract generation endpoints
    // For now, return a mock response
    return {
      success: true,
      contractId: uuidv4(),
      message: "Contract generated successfully",
      downloadUrl: "/api/contracts/download/" + uuidv4()
    };
  }

  private async executePropertyLookup(params: any): Promise<any> {
    // This would integrate with existing property lookup endpoints
    // For now, return a mock response
    return {
      success: true,
      address: params.address,
      owner: "John Doe",
      propertyValue: "$450,000",
      message: "Property information retrieved successfully"
    };
  }

  // Helper methods
  private buildSystemPrompt(mode: string, profile: UserProfile | null): string {
    const basePrompt = `Eres Mervin, un asistente virtual experto en construcción especializado en cercas y proyectos de construcción en general. 

Características de tu personalidad:
- Profesional pero amigable
- Experto en materiales, estimaciones, permisos y regulaciones de construcción
- Hablas en español con el usuario
- Siempre das consejos prácticos y útiles

${profile ? `
Información del usuario:
- Nombre: ${profile.name || "No especificado"}
- Rol: ${profile.role || "No especificado"}
- Tipo de trabajo: ${profile.workType || "No especificado"}
- Ubicación: ${profile.location || "No especificada"}
- Nivel de experiencia: ${profile.experienceLevel || "No especificado"}
` : ""}`;

    if (mode === "mervin_agent") {
      return basePrompt + `

MODO AGENTE ACTIVADO:
Además de responder preguntas, puedes ejecutar acciones específicas:
- Generar facturas (generate_invoice)
- Generar contratos (generate_contract)  
- Buscar información de propietarios (lookup_property_owner)

Cuando el usuario te pida realizar alguna de estas acciones, usa las herramientas disponibles para ejecutarlas.
Siempre confirma los detalles antes de ejecutar una acción y explica qué vas a hacer.`;
    }

    return basePrompt;
  }

  private async generateSessionTitle(firstMessage: string): Promise<string> {
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "Genera un título breve (máximo 50 caracteres) para esta conversación de construcción basado en el primer mensaje del usuario."
          },
          {
            role: "user", 
            content: firstMessage
          }
        ],
        max_tokens: 50,
        temperature: 0.3
      });

      return completion.choices[0].message.content?.trim() || "Nueva conversación";
    } catch (error) {
      return "Nueva conversación";
    }
  }

  // Onboarding flow
  async processOnboarding(
    firebaseUid: string,
    step: number,
    userResponse: string
  ): Promise<{ message: string; nextStep: number; completed: boolean }> {
    const profile = await this.getUserProfile(firebaseUid);
    
    if (!profile) {
      // Create initial profile
      await this.createUserProfile({
        firebaseUid,
        userId: 0, // We'll need to resolve this properly
        onboardingStep: 1
      });
    }

    // Process onboarding steps
    switch (step) {
      case 1:
        // Welcome and name collection
        await this.updateUserProfile(firebaseUid, { 
          name: userResponse,
          onboardingStep: 2 
        });
        return {
          message: `¡Hola ${userResponse}! ¿Cuál es tu rol principal? (ej: contratista, propietario, gerente de proyecto)`,
          nextStep: 2,
          completed: false
        };

      case 2:
        // Role collection
        await this.updateUserProfile(firebaseUid, { 
          role: userResponse,
          onboardingStep: 3 
        });
        return {
          message: "¿Qué tipo de trabajo realizas principalmente? (ej: cercas, construcción general, remodelación)",
          nextStep: 3,
          completed: false
        };

      case 3:
        // Work type collection
        await this.updateUserProfile(firebaseUid, { 
          workType: userResponse,
          onboardingStep: 4 
        });
        return {
          message: "¿En qué ciudad o región trabajas principalmente?",
          nextStep: 4,
          completed: false
        };

      case 4:
        // Location and completion
        await this.updateUserProfile(firebaseUid, { 
          location: userResponse,
          onboardingCompleted: true,
          onboardingStep: 0
        });
        return {
          message: "¡Perfecto! Tu perfil está completo. Ahora puedo ayudarte mejor con tus proyectos de construcción. ¿En qué puedo asistirte hoy?",
          nextStep: 0,
          completed: true
        };

      default:
        return {
          message: "¡Hola! Soy Mervin, tu asistente de construcción. ¿Cómo te llamas?",
          nextStep: 1,
          completed: false
        };
    }
  }
}

export const mervinChatService = new MervinChatService();
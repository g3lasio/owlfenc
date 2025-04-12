
import { mervinProfile } from "./mervinProfile";
import { mervinRoles } from "./mervinRoles";
import { memoryService } from "./memoryService";
import OpenAI from "openai";

interface ChatContext {
  contractorId: string;
  conversationId: string;
  currentStep?: string;
  collectedData?: Record<string, any>;
}

export class ChatService {
  private context: ChatContext;

  constructor(
    private openai: OpenAI,
    private contractorId: string,
  ) {
    this.context = {
      contractorId,
      conversationId: `chat-${Date.now()}`,
      currentStep: mervinRoles.workflow.states.initial
    };
  }

  private async loadContextualData() {
    const { preferences, recentConversations } = await memoryService.getLearningContext(this.contractorId);
    return { preferences, recentConversations };
  }

  private async generateSystemPrompt() {
    const contextData = await this.loadContextualData();
    const basePrompt = `
      Eres Mervin, un asistente de ventas experto en cercas.
      Personalidad: ${JSON.stringify(mervinProfile)}
      Contexto: ${JSON.stringify(contextData)}
      Workflow actual: ${this.context.currentStep}
    `;
    return basePrompt;
  }

  private validateTransition(nextStep: string): boolean {
    return mervinRoles.workflow.transitions.validateStep(
      this.context.currentStep,
      this.context.collectedData
    );
  }

  async handleMessage(message: string, userContext: any = {}) {
    // Generar prompt del sistema
    const systemPrompt = await this.generateSystemPrompt();

    // Procesar mensaje con OpenAI
    const response = await this.openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message }
      ],
      temperature: 0.7,
      max_tokens: 150
    });

    // Actualizar contexto y memoria
    const aiResponse = response.choices[0].message.content;
    await this.updateContext(message, aiResponse);
    await this.saveConversationMemory();

    return {
      message: aiResponse,
      context: this.context
    };
  }

  private async updateContext(userMessage: string, aiResponse: string) {
    // Actualizar datos recopilados y estado del workflow
    const nextStep = mervinRoles.workflow.transitions.getNextStep(
      this.context.currentStep,
      this.context.collectedData
    );

    if (this.validateTransition(nextStep)) {
      this.context.currentStep = nextStep;
    }
  }

  private async saveConversationMemory() {
    await memoryService.saveConversation(
      this.context.contractorId,
      this.context.conversationId,
      {
        messages: [],
        context: this.context,
        timestamp: Date.now()
      }
    );
  }
}

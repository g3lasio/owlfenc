// chatService.ts
import { mervinProfile } from "./mervinProfile";
import { mervinRoles } from "./mervinRoles";
import { memoryService } from "./memoryService";
import OpenAI from "openai";

export class ChatService {
  constructor(
    private openai: OpenAI,
    private contractorId: string,
  ) {}

  async handleMessage(message: string, context: any) {
    // Cargar preferencias y memoria del contratista
    const preferences = await memoryService.getContractorPreferences(
      this.contractorId,
    );
    const pastConversations = await memoryService.getPastConversations(
      this.contractorId,
    );

    // Determinar estado actual y próximos pasos usando mervinRoles.workflow
    const conversationState = this.determineState(context);

    // Generar mensajes personalizados usando mervinProfile y contexto
    const greeting = mervinProfile.greeting(
      preferences.name,
      preferences.gender,
    );

    // Usar OpenAI con prompts adaptados a roles y perfil claramente definidos
    const response = await this.openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `Personalidad: ${JSON.stringify(mervinProfile)}. Tareas: ${JSON.stringify(mervinRoles.tasks)}.`,
        },
        { role: "user", content: message },
      ],
      max_tokens: 150,
    });

    // Guardar memoria de conversación actualizada
    await memoryService.saveConversation(
      this.contractorId,
      context.conversationId,
      context,
    );

    return response.choices[0].message.content;
  }

  determineState(context: any) {
    // lógica clara y robusta de estados
  }
}

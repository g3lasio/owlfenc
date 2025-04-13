import { ChatContext } from './chatService';

export interface WorkflowState {
  requiredFields?: string[];
  actions?: string[];
  nextState?: string;
  finalMessage?: string;
}

export const mervinRoles = {
  tasks: {
    collecting_customer_info: {
      requiredFields: ["clientName", "email", "phone", "address"],
      nextState: "collecting_project_info",
      confirmationMessage: "¿Confirmas que los datos del cliente son correctos?"
    },
    collecting_project_info: {
      requiredFields: ["fenceType", "fenceHeight", "linearFeet", "gates", "painting", "demolition"],
      nextState: "confirming_details",
      confirmationMessage: "¿Los detalles del proyecto están correctos?"
    },
    confirming_details: {
      actions: ["confirm_details", "edit_details"],
      nextState: "previewing_estimate",
      confirmationMessage: "¿Procedemos a generar el estimado?"
    },
    previewing_estimate: {
      actions: ["send_email_client", "edit_details", "download_pdf"],
      nextState: "awaiting_client_approval",
      confirmationMessage: "¿Deseas enviar el estimado al cliente?"
    },
    awaiting_client_approval: {
      actions: ["client_approved", "client_requested_changes"],
      nextState: "generating_contract",
      confirmationMessage: "¿El cliente ha aprobado el estimado?"
    },
    generating_contract: {
      actions: ["generate_contract", "edit_contract"],
      nextState: "previewing_contract",
      confirmationMessage: "¿Procedemos con la generación del contrato?"
    },
    previewing_contract: {
      actions: ["send_for_signature", "edit_contract", "download_pdf"],
      nextState: "awaiting_contract_signature",
      confirmationMessage: "¿Enviamos el contrato para firma?"
    },
    awaiting_contract_signature: {
      actions: ["contract_signed", "pending_signature"],
      nextState: "completed",
      confirmationMessage: "¿El contrato ha sido firmado?"
    },
    completed: {
      finalMessage: "¡Contrato firmado y guardado! Proyecto completado exitosamente."
    }
  },

  getNextState(currentState: string): string | null {
    return this.tasks[currentState]?.nextState || null;
  },

  getRequiredFields(state: string): string[] {
    return this.tasks[state]?.requiredFields || [];
  },

  getConfirmationMessage(state: string): string {
    return this.tasks[state]?.confirmationMessage || "¿Deseas continuar al siguiente paso?";
  },

  validateState(state: string, context: ChatContext): boolean {
    const requiredFields = this.getRequiredFields(state);
    return requiredFields.every(field => context[field] !== undefined);
  },

  getStateActions(state: string): string[] {
    return this.tasks[state]?.actions || [];
  },

  getClickableOptions(state: string): string[] {
    const actions = this.getStateActions(state);
    if (actions.length > 0) {
      return actions.map(action => {
        switch (action) {
          case "confirm_details": return "✅ Confirmar detalles";
          case "edit_details": return "📝 Editar detalles";
          case "download_pdf": return "📥 Descargar PDF";
          case "send_email_client": return "📧 Enviar por email";
          case "client_approved": return "👍 Cliente aprobó";
          case "client_requested_changes": return "🔄 Cliente solicitó cambios";
          case "generate_contract": return "📄 Generar contrato";
          case "edit_contract": return "✏️ Editar contrato";
          case "send_for_signature": return "✍️ Enviar para firma";
          case "contract_signed": return "✅ Contrato firmado";
          default: return action;
        }
      });
    }
    return ["✅ Confirmar y continuar", "🔄 Editar información"];
  },
  getOptionsForState(state: string, message: string = ""): string[] {
    // Opciones clickeables optimizadas por estado
    switch (state) {
      case "fence_type_selection":
        return ["🌲 Cerca de Madera", "🔗 Cerca de Chain Link", "🏠 Cerca de Vinilo"];

      case "height_selection":
        return ["3 pies", "4 pies", "6 pies", "8 pies"];

      case "asking_length":
        return ["50 pies", "75 pies", "100 pies", "150 pies", "200 pies"];

      case "asking_demolition":
        return ["✅ Sí, incluir demolición", "❌ No necesito demolición"];

      case "asking_painting":
        return ["✅ Sí, incluir pintura", "❌ No necesito pintura"];

      case "asking_gates":
        return ["✅ Sí, necesito puertas", "❌ No necesito puertas"];

      case "confirming_details":
        return ["✅ Generar Estimado", "📝 Editar Información"];

      case "preparing_estimate":
        return ["📄 Ver Estimado", "📧 Enviar por Email", "💾 Guardar PDF"];

      case "document_ready":
        return ["✅ Aprobar y Generar Contrato", "📝 Hacer Cambios", "📧 Enviar al Cliente"];

      default:
        return [];
    }
  }
};
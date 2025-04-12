
export interface WorkflowStep {
  id: string;
  name: string;
  requiredData: string[];
  nextSteps: string[];
  validations?: ((data: any) => boolean)[];
}

export const mervinRoles = {
  tasks: {
    dataCollection: [
      "Recopilar información del cliente",
      "Validar datos proporcionados",
      "Gestionar preferencias del contratista",
      "Mantener contexto de conversación"
    ],
    estimateGeneration: [
      "Calcular costos de materiales",
      "Aplicar reglas de negocio",
      "Generar vista previa de estimado",
      "Permitir ajustes y modificaciones"
    ],
    contractManagement: [
      "Generar contratos desde plantillas",
      "Validar información legal",
      "Gestionar firmas y aprobaciones"
    ]
  },

  workflow: {
    states: {
      initial: "greeting",
      final: "farewell",
      current: null
    },

    steps: {
      greeting: {
        id: "greeting",
        name: "Saludo Inicial",
        requiredData: ["contractorName"],
        nextSteps: ["clientData"]
      },
      clientData: {
        id: "clientData",
        name: "Datos del Cliente",
        requiredData: ["name", "phone", "email", "address"],
        nextSteps: ["fenceDetails"]
      },
      fenceDetails: {
        id: "fenceDetails",
        name: "Detalles de la Cerca",
        requiredData: ["type", "height", "length"],
        nextSteps: ["estimate"]
      }
    },

    transitions: {
      validateStep: (currentStep: string, data: any): boolean => {
        const step = mervinRoles.workflow.steps[currentStep];
        return step.requiredData.every(field => data[field]);
      },

      getNextStep: (currentStep: string, data: any): string => {
        if (!mervinRoles.workflow.transitions.validateStep(currentStep, data)) {
          return currentStep;
        }
        const step = mervinRoles.workflow.steps[currentStep];
        return step.nextSteps[0];
      }
    }
  },

  notifications: {
    types: {
      estimateApproval: "El cliente ha aprobado el estimado",
      estimateRevision: "Hay modificaciones pendientes",
      contractReady: "Contrato listo para revisión"
    },
    
    createNotification: (type: keyof typeof mervinRoles.notifications.types, data: any) => {
      return {
        type,
        message: mervinRoles.notifications.types[type],
        data,
        timestamp: new Date()
      };
    }
  }
};

// mervinRoles.ts

export const mervinRoles = {
  tasks: [
    "Recordar proyectos anteriores y clientes",
    "Recopilar información actualizada del cliente",
    "Consultar reglas (woodfencerules.js) y precios (materialParameters.json)",
    "Preparar estimados personalizados",
    "Generar preview interactivo para revisión antes del PDF",
    "Permitir modificaciones claras y precisas al estimado",
    "Notificar al contratista cuando se apruebe un estimado",
    "Generar contratos precisos usando templates HTML predefinidos",
  ],

  workflow: {
    newEstimate: [
      "Saludo inicial personalizado",
      "Recopilar datos cliente y proyecto",
      "Confirmar información recopilada",
      "Generar preview del estimado",
      "Esperar confirmación/modificaciones del contratista",
      "Generar PDF definitivo del estimado",
      "Almacenar proyecto en historial",
    ],
    contractGeneration: [
      "Detectar aprobación del estimado",
      "Recuperar datos completos del proyecto",
      "Realizar validación adicional con el contratista",
      "Generar contrato usando template específico",
      "Almacenar contrato generado y notificar al contratista",
    ],
  },

  adjustmentsAllowed: [
    "Agregar/quitar postes, concreto, pickets, tornillos, etc.",
    "Ajustar cantidades, dimensiones y materiales",
    "Modificar condiciones específicas y adicionales del proyecto",
  ],

  notifications: {
    onEstimateApproval:
      "El cliente ha aprobado el estimado, carnal. ¿Generamos contrato de una vez?",
    onEstimateRevision:
      "Hay modificaciones pendientes en este estimado, primo. Échales un ojo.",
  },

  responseTiming: {
    maxEstimateGenerationTime: 80000, // 80 segundos
  },
};

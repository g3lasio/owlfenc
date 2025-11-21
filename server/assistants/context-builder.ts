/**
 * CONTEXT BUILDER - CONSTRUIR INSTRUCCIONES CONTEXTUALES PARA MERVIN
 * 
 * Genera instrucciones adicionales basadas en el contexto de la página actual
 * para que Mervin pueda proporcionar ayuda específica y paso a paso.
 */

export type PageContext =
  | { type: 'estimate-editor'; estimateId?: string; step?: 'client' | 'materials' | 'preview' | 'complete' }
  | { type: 'estimate-list'; filter?: string }
  | { type: 'contract-editor'; contractId?: string; status?: 'draft' | 'sent' | 'signed' | 'completed' }
  | { type: 'contract-list'; filter?: string }
  | { type: 'permit-advisor'; projectId?: string; step?: 'address' | 'type' | 'description' | 'results' }
  | { type: 'property-verifier'; address?: string; step?: 'search' | 'results' }
  | { type: 'clients-list'; filter?: string }
  | { type: 'materials-list'; filter?: string }
  | { type: 'projects-list'; filter?: string }
  | { type: 'dashboard' }
  | { type: 'mervin-chat' }
  | { type: 'none' };

/**
 * Construir instrucciones adicionales basadas en el contexto de página
 */
export function buildContextualInstructions(pageContext?: PageContext): string {
  if (!pageContext || pageContext.type === 'none' || pageContext.type === 'mervin-chat') {
    return '';
  }

  let instructions = '\n\n## 👁️ CONTEXTO DE PÁGINA ACTUAL\n\n';

  switch (pageContext.type) {
    case 'estimate-editor':
      instructions += `El usuario está en el EDITOR DE ESTIMADOS.
${pageContext.estimateId ? `- ID del estimado: ${pageContext.estimateId}` : '- Creando un nuevo estimado'}
${pageContext.step ? `- Paso actual: ${pageContext.step}` : ''}

**Tu rol ahora es un COPILOTO para completar estimados:**
- Si están en el paso "client": Ayúdalos a seleccionar o crear un cliente
- Si están en "materials": Ayúdalos a agregar materiales y calcular cantidades
- Si están en "preview": Revisa el estimado con ellos antes de enviarlo
- Ofrece guía paso a paso específica para cada etapa
- Puedes crear o buscar información de clientes usando las herramientas disponibles`;
      break;

    case 'estimate-list':
      instructions += `El usuario está viendo su LISTA DE ESTIMADOS.
${pageContext.filter ? `- Filtro activo: ${pageContext.filter}` : ''}

**Tu rol ahora:**
- Ayúdalos a buscar estimados específicos
- Ofrece crear nuevos estimados
- Explica el estado de estimados existentes
- Sugiere acciones de seguimiento`;
      break;

    case 'contract-editor':
      instructions += `El usuario está en el EDITOR DE CONTRATOS.
${pageContext.contractId ? `- ID del contrato: ${pageContext.contractId}` : '- Creando un nuevo contrato'}
${pageContext.status ? `- Estado: ${pageContext.status}` : ''}

**Tu rol ahora es un COPILOTO para contratos:**
- Ayúdalos a completar la información del contrato
- Explica cláusulas legales de forma simple
- Guíalos en el proceso de firma dual
- Si está en estado "draft": Ayúdalos a finalizarlo
- Si está "sent": Explica el proceso de firma`;
      break;

    case 'contract-list':
      instructions += `El usuario está viendo su LISTA DE CONTRATOS.
${pageContext.filter ? `- Filtro activo: ${pageContext.filter}` : ''}

**Tu rol ahora:**
- Ayúdalos a encontrar contratos específicos
- Explica los estados de contratos
- Ofrece crear nuevos contratos
- Sugiere seguimiento de contratos pendientes`;
      break;

    case 'permit-advisor':
      instructions += `El usuario está en el ASESOR DE PERMISOS.
${pageContext.projectId ? `- ID del proyecto: ${pageContext.projectId}` : ''}
${pageContext.step ? `- Paso actual: ${pageContext.step}` : ''}

**Tu rol ahora es un COPILOTO para permisos de construcción:**
- Si están en "address": Ayúdalos a ingresar la dirección correcta
- Si están en "type": Guíalos en seleccionar el tipo de proyecto
- Si están en "results": Explica los permisos necesarios de forma clara
- Ofrece consejos sobre el proceso de obtención de permisos`;
      break;

    case 'property-verifier':
      instructions += `El usuario está en el VERIFICADOR DE PROPIEDADES.
${pageContext.address ? `- Dirección: ${pageContext.address}` : ''}
${pageContext.step ? `- Paso actual: ${pageContext.step}` : ''}

**Tu rol ahora:**
- Ayúdalos a verificar información de propiedades
- Explica los resultados de verificación
- Sugiere qué hacer con la información obtenida`;
      break;

    case 'clients-list':
      instructions += `El usuario está viendo su LISTA DE CLIENTES.
${pageContext.filter ? `- Búsqueda activa: ${pageContext.filter}` : ''}

**Tu rol ahora:**
- Ayúdalos a encontrar clientes específicos
- Ofrece crear nuevos clientes
- Sugiere acciones con clientes existentes`;
      break;

    case 'materials-list':
      instructions += `El usuario está viendo su CATÁLOGO DE MATERIALES.

**Tu rol ahora:**
- Ayúdalos a buscar materiales
- Ofrece agregar nuevos materiales
- Explica cómo usar materiales en estimados`;
      break;

    case 'dashboard':
      instructions += `El usuario está en el DASHBOARD principal.

**Tu rol ahora:**
- Ofrece un resumen de actividad reciente
- Sugiere próximas acciones
- Ayúdalos a navegar a las áreas que necesiten`;
      break;
  }

  instructions += '\n\n**IMPORTANTE**: Proporciona guía ESPECÍFICA y ACCIONABLE basada en dónde está el usuario ahora mismo.\n';

  return instructions;
}

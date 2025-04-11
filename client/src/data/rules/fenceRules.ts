
import { woodFenceRules } from './woodfencerules';
import config from '../prices/materialParameters.json';

export interface FenceRules {
  posts: {
    spacingFt: number;
    extraPost: number;
    postLengthForHeight: Record<string, string>;
    optionalTypes: string[];
    defaultType: string;
  };
  concrete: {
    bagsPerPost: number;
  };
  rails?: {
    quantity: number;
    segmentLengthFt: number;
  };
  pickets?: {
    coverageInches: number;
    extraFactor: number;
  };
  hangers?: {
    perPost: number;
  };
  screws?: {
    boxesPerFeet: number;
  };
  recargoMaterial: number;
  heightFactors: Record<string, number>;
}

export const fenceTypes = {
  wood: {
    name: "Wood Fence",
    rules: woodFenceRules,
    description: "Cerca de madera tratada a presión, diseñada para durabilidad y estética",
    questions: [
      "¿Qué altura necesitas para tu cerca?",
      "¿Prefieres un estilo tradicional o moderno?",
      "¿Qué tipo de postes prefieres usar (4x4, 6x6 o metal)?",
      "¿Necesitas remover una cerca existente?",
      "¿Te gustaría agregar algún acabado decorativo como lattice?",
      "¿Necesitas puertas? ¿De qué ancho?",
      "¿Te gustaría agregar un acabado protector o pintura?",
      "¿El terreno es plano o tiene desniveles?",
      "¿Hay obstáculos como árboles o rocas en la línea de la cerca?",
      "¿Necesitas permisos de construcción en tu zona?"
    ]
  },
  chainLink: {
    name: "Chain Link Fence",
    rules: {
      posts: {
        spacingFt: 10,
        extraPost: 1,
        postLengthForHeight: { "4": "6", "6": "8", "8": "10" },
        optionalTypes: ["galvanized", "black-coated"],
        defaultType: "galvanized"
      },
      concrete: { bagsPerPost: 1 },
      recargoMaterial: 1.05,
      heightFactors: { "4": 0.8, "6": 1.0, "8": 1.2 }
    },
    description: "Cerca de eslabones de cadena, ideal para seguridad y bajo mantenimiento",
    questions: [
      "¿Prefieres el acabado galvanizado tradicional o el recubrimiento negro?",
      "¿Necesitas privacidad adicional con tiras de vinilo?"
    ]
  },
  vinyl: {
    name: "Vinyl Fence",
    rules: {
      posts: {
        spacingFt: 6,
        extraPost: 1,
        postLengthForHeight: { "4": "6", "6": "8", "8": "10" },
        optionalTypes: ["standard", "heavy-duty"],
        defaultType: "standard"
      },
      concrete: { bagsPerPost: 2 },
      recargoMaterial: 1.15,
      heightFactors: { "4": 0.9, "6": 1.0, "8": 1.3 }
    },
    description: "Cerca de vinilo de alta calidad, sin mantenimiento y elegante",
    questions: [
      "¿Qué estilo de cerca de vinilo prefieres: privacidad completa o semi-privacidad?",
      "¿Te gustaría agregar detalles decorativos como postes con tapas?"
    ]
  }
};

export function getFenceRules(fenceType: string): FenceRules {
  const type = fenceType.toLowerCase();
  if (type.includes('wood')) return fenceTypes.wood.rules;
  if (type.includes('chain')) return fenceTypes.chainLink.rules;
  if (type.includes('vinyl')) return fenceTypes.vinyl.rules;
  throw new Error(`Tipo de cerca no soportado: ${fenceType}`);
}

export function getFenceQuestions(fenceType: string): string[] {
  const type = fenceType.toLowerCase();
  if (type.includes('wood')) return fenceTypes.wood.questions;
  if (type.includes('chain')) return fenceTypes.chainLink.questions;
  if (type.includes('vinyl')) return fenceTypes.vinyl.questions;
  return [];
}

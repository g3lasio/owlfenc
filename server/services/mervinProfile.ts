
export interface MervinPersonality {
  name: string;
  nationality: string;
  accent: string;
  senseOfHumorLevel: number;
  commonExpressions: string[];
  emotionalIntelligence: boolean;
  adaptivePersonality: boolean;
}

export const mervinProfile = {
  name: "Mervin",
  nationality: "Mexicano",
  accent: "Norteño-Chilango (50%-50%)",
  senseOfHumorLevel: 0.3,
  commonExpressions: [
    "¡Órale!",
    "¡Ya dijo!",
    "¡A darle!",
    "¡Está al tiro!",
    "¡Sobres pues!",
    "¡Arre, primo!"
  ],
  emotionalIntelligence: true,
  adaptivePersonality: true,

  greeting: (contractorName: string, gender: "male" | "female", timeOfDay: string) => {
    const greetings = {
      morning: "¡Buenos días",
      afternoon: "¡Buenas tardes",
      evening: "¡Buenas noches"
    };
    const genderSuffix = gender === "male" ? "primo" : "prima";
    return `${greetings[timeOfDay]}, ${genderSuffix} ${contractorName}! ¿Qué tal va el día?`;
  },

  farewell: (gender: "male" | "female", context: string = "normal") => {
    const farewells = {
      normal: gender === "male" ? "¡Ahí nos vemos, carnal!" : "¡Ahí nos vemos, carnala!",
      urgent: "¡Me apuro con ese estimado!",
      followUp: "¡Te aviso en cuanto tenga noticias!"
    };
    return farewells[context];
  },

  getContextualResponse: (mood: string, formality: number) => {
    const responses = {
      professional: {
        positive: "Excelente elección. Procedemos con el siguiente paso.",
        negative: "Entiendo su preocupación. Permítame proponer alternativas."
      },
      casual: {
        positive: "¡Órale, así se habla! ¡Vamos con todo!",
        negative: "No hay bronca, podemos buscar otra forma de hacerlo."
      }
    };
    return formality > 0.5 ? responses.professional[mood] : responses.casual[mood];
  }
};

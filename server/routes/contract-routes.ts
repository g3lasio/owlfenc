import express from "express";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";
import { MistralService } from "../services/mistralService";
import generateContract from "../services/generateContract";
import OpenAI from "openai";

// Inicializar router y servicios
const router = express.Router();
const mistralService = new MistralService();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Configurar multer para procesar archivos subidos
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // Límite de 10MB
});

// Tipos de datos para la API
interface DatosExtraidos {
  cliente?: {
    nombre?: string;
    direccion?: string;
    telefono?: string;
    email?: string;
  };
  contratista?: {
    nombre?: string;
    direccion?: string;
    telefono?: string;
    email?: string;
    licencia?: string;
  };
  proyecto?: {
    tipoObra?: string;
    descripcion?: string;
    longitud?: string;
    altura?: string;
    total?: number;
    fechaInicio?: string;
    fechaFinalizacion?: string;
  };
  detallesAdicionales?: Record<string, any>;
}

// Generate contract pdf
router.post("/generate-contract", async (req, res) => {
  try {
    const contract = req.body;
    const result = await generateContract(contract);
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({
      message: "Error generating contract",
      // @ts-expect-error
      error: err.message,
    });
  }
});

// Función para guardar temporalmente el PDF (para depuración)
function guardarPDFTemporal(buffer: Buffer): string {
  const tempDir = "./temp";

  // Crear directorio temporal si no existe
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const filename = `estimate-${Date.now()}.pdf`;
  const filePath = path.join(tempDir, filename);

  fs.writeFileSync(filePath, buffer);
  console.log(`PDF guardado temporalmente en: ${filePath}`);

  return filePath;
}

// Ruta para generar contrato a partir de un PDF
// API para manejar el flujo secuencial de preguntas para contratos
router.post("/questions/next", async (req, res) => {
  try {
    const { currentQuestionId, answers } = req.body;

    // Aquí se definirían las preguntas del flujo y sus validaciones
    const contractQuestions = [
      {
        id: "contractor_name",
        field: "contractor.name",
        prompt: "¿Cuál es el nombre completo de tu empresa o nombre comercial?",
        type: "text",
        required: true,
        validate: (val: string) =>
          val.length >= 2 ? null : "El nombre debe tener al menos 2 caracteres",
      },
      {
        id: "contractor_address",
        field: "contractor.address",
        prompt: "¿Cuál es la dirección completa de tu empresa?",
        type: "multiline",
        required: true,
        validate: (val: string) =>
          val.length >= 10
            ? null
            : "Por favor proporciona una dirección completa",
      },
      {
        id: "client_name",
        field: "client.name",
        prompt: "¿Cuál es el nombre completo del cliente?",
        type: "text",
        required: true,
        validate: (val: string) =>
          val.length >= 2 ? null : "El nombre debe tener al menos 2 caracteres",
      },
      {
        id: "client_address",
        field: "client.address",
        prompt: "¿Cuál es la dirección completa donde se instalará la cerca?",
        type: "multiline",
        required: true,
        validate: (val: string) =>
          val.length >= 10
            ? null
            : "Por favor proporciona una dirección completa",
      },
      {
        id: "fence_type",
        field: "project.fenceType",
        prompt: "¿Qué tipo de cerca se instalará?",
        type: "choice",
        options: [
          "Privacidad",
          "Residencial",
          "Comercial",
          "Seguridad",
          "Picket",
          "Split Rail",
          "Vinilo",
          "Madera",
          "Aluminio",
          "Acero",
          "Otro",
        ],
        required: true,
        validate: (val: string) =>
          val ? null : "Por favor selecciona un tipo de cerca",
      },
      {
        id: "fence_height",
        field: "project.fenceHeight",
        prompt: "¿Cuál será la altura de la cerca (en pies)?",
        type: "number",
        required: true,
        validate: (val: number) =>
          val > 0 && val <= 12
            ? null
            : "La altura debe estar entre 1 y 12 pies",
      },
      {
        id: "fence_length",
        field: "project.fenceLength",
        prompt: "¿Cuál es la longitud total de la cerca (en pies lineales)?",
        type: "number",
        required: true,
        validate: (val: number) =>
          val > 0 ? null : "La longitud debe ser mayor que 0",
      },
      {
        id: "project_total",
        field: "payment.total",
        prompt: "¿Cuál es el costo total del proyecto?",
        type: "number",
        required: true,
        validate: (val: number) =>
          val > 0 ? null : "El costo total debe ser mayor que 0",
      },
      {
        id: "payment_terms",
        field: "payment.terms",
        prompt: "¿Cuáles son los términos de pago?",
        type: "text",
        required: true,
        validate: (val: string) =>
          val.length > 0 ? null : "Por favor especifica los términos de pago",
      },
    ];

    // Validar la respuesta actual si existe
    if (currentQuestionId) {
      const currentQuestion = contractQuestions.find(
        (q) => q.id === currentQuestionId,
      );

      if (currentQuestion && currentQuestion.required) {
        const fieldPath = currentQuestion.field.split(".");
        let value = answers;

        // Acceder al valor anidado usando la ruta de campo
        for (const part of fieldPath) {
          value = value?.[part];
          if (value === undefined) break;
        }

        if (value === undefined || value === "") {
          return res.status(400).json({
            validationError: `El campo ${currentQuestion.prompt} es obligatorio.`,
          });
        }

        // Validar usando la función específica si existe
        if (currentQuestion.validate && typeof value !== "undefined") {
          const validationError = currentQuestion.validate(value);
          if (validationError) {
            return res.status(400).json({ validationError });
          }
        }
      }
    }

    // Obtener la siguiente pregunta
    let nextQuestion = null;

    if (!currentQuestionId) {
      // Si no hay pregunta actual, devolver la primera
      nextQuestion = contractQuestions[0];
    } else {
      // Encontrar el índice de la pregunta actual
      const currentIndex = contractQuestions.findIndex(
        (q) => q.id === currentQuestionId,
      );

      // Si no se encuentra o es la última, devolver null
      if (currentIndex !== -1 && currentIndex < contractQuestions.length - 1) {
        nextQuestion = contractQuestions[currentIndex + 1];
      }
    }

    // Si no hay más preguntas, indicar que se ha completado
    if (!nextQuestion) {
      return res.json({ completed: true });
    }

    // Devolver la siguiente pregunta
    return res.json({ nextQuestion });
  } catch (error) {
    console.error("Error procesando pregunta del contrato:", error);
    res.status(500).json({
      message: "Error en el procesamiento de la pregunta",
      error: error instanceof Error ? error.message : "Error desconocido",
    });
  }
});

router.post("/generar-contrato", upload.single("pdf"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No se ha subido ningún archivo" });
    }

    // Extraer el buffer del archivo
    const pdfBuffer = req.file.buffer;

    // Para debugging, guardar el PDF temporalmente
    const tempPath = guardarPDFTemporal(pdfBuffer);

    console.log(
      `Procesando PDF (${req.file.originalname}, ${req.file.size} bytes)`,
    );

    // Verificar que hay una API key configurada
    if (!process.env.MISTRAL_API_KEY && !process.env.OPENAI_API_KEY) {
      console.error(
        "Error: No hay API keys configuradas (MISTRAL_API_KEY o OPENAI_API_KEY)",
      );
      return res
        .status(500)
        .json({ error: "Error de configuración: API keys no disponibles" });
    }

    try {
      // Extraer información del PDF usando Mistral OCR o OpenAI como respaldo
      let datosExtraidos: DatosExtraidos;

      if (process.env.MISTRAL_API_KEY) {
        try {
          datosExtraidos =
            await mistralService.extraerInformacionPDF(pdfBuffer);
        } catch (mistralError) {
          console.error("Error con Mistral API:", mistralError);

          if (!process.env.OPENAI_API_KEY) {
            throw mistralError;
          }

          // Si Mistral falla y hay OpenAI, usar OpenAI como respaldo
          console.log("Intentando con OpenAI como respaldo...");
          datosExtraidos = await procesarPDFConOpenAI(pdfBuffer);
        }
      } else {
        // Si no hay Mistral configurado, usar OpenAI directamente
        console.log("Usando OpenAI para procesar el PDF...");
        datosExtraidos = await procesarPDFConOpenAI(pdfBuffer);
      }

      console.log("Datos extraídos del PDF:", datosExtraidos);

      // Generar el contrato HTML usando los datos extraídos
      let contratoHTML: string;

      try {
        if (process.env.MISTRAL_API_KEY) {
          contratoHTML = await mistralService.generarContrato(datosExtraidos);
        } else {
          contratoHTML = await generarContratoConOpenAI(datosExtraidos);
        }
      } catch (generacionError) {
        console.error("Error generando contrato:", generacionError);
        contratoHTML = generarContratoHTML(datosExtraidos);
      }

      // Retornar los datos extraídos y el contrato generado
      res.status(200).json({
        success: true,
        datos_extraidos: datosExtraidos,
        contrato_html: contratoHTML,
        message: "Contrato generado exitosamente",
      });
    } catch (error: any) {
      console.error("Error procesando el PDF:", error);
      return res.status(500).json({
        error: "Error procesando el PDF",
        details: error.message || "Error desconocido",
      });
    }
  } catch (error: any) {
    console.error("Error en la ruta /generar-contrato:", error);
    res.status(500).json({
      error: "Error interno del servidor",
      details: error.message || "Error desconocido",
    });
  }
});

// Función para procesar el PDF con OpenAI como respaldo
async function procesarPDFConOpenAI(
  pdfBuffer: Buffer,
): Promise<DatosExtraidos> {
  try {
    // Extraer texto del PDF (usando la misma función que Mistral)
    const pdfText = await mistralService.extractTextFromPDF(pdfBuffer);

    // Prompt para extraer información
    const prompt = `
Eres un asistente especializado en extraer información estructurada de PDFs de estimados de construcción de cercas.
Tu tarea es extraer la siguiente información del texto extraído de un PDF de estimación de cercas y devolverla en formato JSON:

1. Información del Cliente:
   - Nombre
   - Dirección
   - Teléfono
   - Email

2. Información del Contratista:
   - Nombre de la empresa
   - Dirección
   - Teléfono
   - Email
   - Número de licencia

3. Información del Proyecto:
   - Tipo de obra/cerca
   - Descripción
   - Longitud
   - Altura
   - Costo total
   - Fecha de inicio (si está disponible)
   - Fecha de finalización (si está disponible)

Texto del PDF:
${pdfText}

Responde solo con un objeto JSON limpio con la estructura:
{
  "cliente": {
    "nombre": "...",
    "direccion": "...",
    "telefono": "...",
    "email": "..."
  },
  "contratista": {
    "nombre": "...",
    "direccion": "...",
    "telefono": "...",
    "email": "...",
    "licencia": "..."
  },
  "proyecto": {
    "tipoObra": "...",
    "descripcion": "...",
    "longitud": "...",
    "altura": "...",
    "total": 0,
    "fechaInicio": "...",
    "fechaFinalizacion": "..."
  }
}

Para los campos no encontrados, déjalos como cadenas vacías ("") o como 0 para valores numéricos. NO inventes información que no esté en el documento.
`;

    // Llamar a OpenAI para extraer información
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content:
            "Eres un especialista en extraer información estructurada de documentos. Devuelve solo el JSON solicitado sin texto adicional.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.1,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("OpenAI devolvió una respuesta vacía");
    }

    // Parsear la respuesta JSON
    const datosExtraidos: DatosExtraidos = JSON.parse(content);
    console.log("Datos extraídos correctamente con OpenAI:", datosExtraidos);
    return datosExtraidos;
  } catch (error) {
    console.error("Error procesando PDF con OpenAI:", error);
    throw error;
  }
}

// Función para generar el contrato con OpenAI
async function generarContratoConOpenAI(
  datos: DatosExtraidos,
): Promise<string> {
  try {
    const prompt = `
Genera un contrato HTML completo y legal para un proyecto de construcción de cerca con los siguientes datos:

Cliente: ${datos.cliente?.nombre || "N/A"}
Dirección del cliente: ${datos.cliente?.direccion || "N/A"}
Teléfono del cliente: ${datos.cliente?.telefono || "N/A"}
Email del cliente: ${datos.cliente?.email || "N/A"}

Contratista: ${datos.contratista?.nombre || "N/A"}
Dirección del contratista: ${datos.contratista?.direccion || "N/A"}
Teléfono del contratista: ${datos.contratista?.telefono || "N/A"}
Email del contratista: ${datos.contratista?.email || "N/A"}
Licencia del contratista: ${datos.contratista?.licencia || "N/A"}

Tipo de obra: ${datos.proyecto?.tipoObra || "N/A"}
Descripción: ${datos.proyecto?.descripcion || "N/A"}
Longitud: ${datos.proyecto?.longitud || "N/A"}
Altura: ${datos.proyecto?.altura || "N/A"}
Costo total: ${datos.proyecto?.total || "N/A"}
Fecha de inicio: ${datos.proyecto?.fechaInicio || "N/A"}
Fecha de finalización: ${datos.proyecto?.fechaFinalizacion || "N/A"}

Debe ser un contrato legal completo con:
1. Nombre del contrato y encabezado
2. Partes involucradas
3. Alcance del trabajo
4. Términos de pago (incluyendo un adelanto del 50% y el restante al finalizar)
5. Plazos de ejecución
6. Materiales y mano de obra
7. Garantías
8. Terminación y modificaciones
9. Ley aplicable
10. Espacios para firmas de ambas partes

El documento debe tener un diseño profesional con CSS incluido (estilo en el mismo HTML), usando una fuente legible y una estructura clara.
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content:
            "Eres un abogado especializado en contratos de construcción. Genera un contrato HTML completo y profesional.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.3,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("OpenAI devolvió una respuesta vacía");
    }

    return content;
  } catch (error) {
    console.error("Error generando contrato con OpenAI:", error);
    throw error;
  }
}

// Generador de contrato HTML de respaldo
function generarContratoHTML(datos: DatosExtraidos): string {
  const fechaActual = new Date().toLocaleDateString();
  const deposit = datos.proyecto?.total ? datos.proyecto.total * 0.5 : 0;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Contrato de Construcción de Cerca</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .header h1 {
      color: #2a5885;
      margin-bottom: 5px;
    }
    .header p {
      color: #666;
      font-style: italic;
    }
    .section {
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 1px solid #eee;
    }
    .section-title {
      font-weight: bold;
      margin-bottom: 10px;
      color: #2a5885;
    }
    .signature-section {
      display: flex;
      justify-content: space-between;
      margin-top: 50px;
    }
    .signature {
      width: 45%;
    }
    .signature-line {
      border-bottom: 1px solid #000;
      height: 40px;
      margin-bottom: 5px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>CONTRATO DE CONSTRUCCIÓN DE CERCA</h1>
    <p>Fecha: ${fechaActual}</p>
  </div>
  
  <div class="section">
    <div class="section-title">1. PARTES</div>
    <p><strong>CONTRATISTA:</strong> ${datos.contratista?.nombre || "___________________"}<br>
    Dirección: ${datos.contratista?.direccion || "___________________"}<br>
    Teléfono: ${datos.contratista?.telefono || "___________________"}<br>
    Email: ${datos.contratista?.email || "___________________"}<br>
    Licencia: ${datos.contratista?.licencia || "___________________"}</p>
    
    <p><strong>CLIENTE:</strong> ${datos.cliente?.nombre || "___________________"}<br>
    Dirección: ${datos.cliente?.direccion || "___________________"}<br>
    Teléfono: ${datos.cliente?.telefono || "___________________"}<br>
    Email: ${datos.cliente?.email || "___________________"}</p>
  </div>
  
  <div class="section">
    <div class="section-title">2. ALCANCE DEL TRABAJO</div>
    <p>El CONTRATISTA acuerda construir e instalar una cerca para el CLIENTE de acuerdo con las especificaciones siguientes:</p>
    <p><strong>Tipo de Cerca:</strong> ${datos.proyecto?.tipoObra || "___________________"}<br>
    <strong>Descripción:</strong> ${datos.proyecto?.descripcion || "Cerca de acuerdo a las especificaciones acordadas"}<br>
    <strong>Longitud:</strong> ${datos.proyecto?.longitud || "___"} pies/metros<br>
    <strong>Altura:</strong> ${datos.proyecto?.altura || "___"} pies/metros</p>
  </div>
  
  <div class="section">
    <div class="section-title">3. PRECIO Y FORMA DE PAGO</div>
    <p>El precio total acordado por el trabajo descrito en este contrato es de $${datos.proyecto?.total || "___________________"}.</p>
    <p>La forma de pago será la siguiente:</p>
    <ul>
      <li>Depósito inicial (50%): $${deposit} a la firma de este contrato.</li>
      <li>Pago final (50%): $${deposit} a la finalización satisfactoria del trabajo.</li>
    </ul>
  </div>
  
  <div class="section">
    <div class="section-title">4. PLAZO DE EJECUCIÓN</div>
    <p>El trabajo comenzará aproximadamente el ${datos.proyecto?.fechaInicio || "___________________"} y se completará aproximadamente el ${datos.proyecto?.fechaFinalizacion || "___________________"}, sujeto a condiciones climáticas y disponibilidad de materiales.</p>
  </div>
  
  <div class="section">
    <div class="section-title">5. MATERIALES Y MANO DE OBRA</div>
    <p>El CONTRATISTA proporcionará todos los materiales, herramientas, equipos y mano de obra necesarios para completar el trabajo según lo especificado. Todos los materiales serán nuevos y de buena calidad.</p>
  </div>
  
  <div class="section">
    <div class="section-title">6. GARANTÍA</div>
    <p>El CONTRATISTA garantiza que todos los materiales y mano de obra estarán libres de defectos por un período de un (1) año a partir de la fecha de finalización. Esta garantía no cubre daños causados por el uso indebido, eventos naturales o falta de mantenimiento adecuado.</p>
  </div>
  
  <div class="section">
    <div class="section-title">7. PERMISOS Y CUMPLIMIENTO</div>
    <p>El CONTRATISTA será responsable de obtener todos los permisos necesarios y asegurarse de que el trabajo cumpla con todos los códigos y ordenanzas locales aplicables.</p>
  </div>
  
  <div class="section">
    <div class="section-title">8. TERMINACIÓN</div>
    <p>Cualquiera de las partes puede terminar este contrato en caso de que la otra parte incumpla sustancialmente cualquier disposición de este contrato y no corrija dicho incumplimiento dentro de los 10 días posteriores a la recepción de una notificación por escrito de dicho incumplimiento.</p>
  </div>
  
  <div class="section">
    <div class="section-title">9. ACUERDO COMPLETO</div>
    <p>Este contrato constituye el acuerdo completo entre las partes y reemplaza cualquier acuerdo anterior, escrito u oral. Cualquier modificación debe ser por escrito y firmada por ambas partes.</p>
  </div>
  
  <div class="signature-section">
    <div class="signature">
      <div class="signature-line"></div>
      <p>CONTRATISTA: ${datos.contratista?.nombre || "___________________"}</p>
      <p>Fecha: ___________________</p>
    </div>
    
    <div class="signature">
      <div class="signature-line"></div>
      <p>CLIENTE: ${datos.cliente?.nombre || "___________________"}</p>
      <p>Fecha: ___________________</p>
    </div>
  </div>
</body>
</html>
  `;
}

export default router;

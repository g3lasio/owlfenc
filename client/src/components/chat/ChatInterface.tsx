import { useRef, useEffect, useState } from "react";
import ChatMessage from "./ChatMessage";
import ChatInput from "./ChatInput";
import ChatFooter from "./ChatFooter";
import TypingIndicator from "./TypingIndicator";
import EstimatePreview from "../templates/EstimatePreview";
import ContractPreview from "../templates/ContractPreview";
import ManualEstimateForm from "../estimates/ManualEstimateForm";
import { AnalysisEffect } from "../effects/AnalysisEffect";
import { processChatMessage, processPDFForContract, actualizarContrato, generateContract } from "@/lib/openai";
import { downloadEstimatePDF, downloadContractPDF, downloadPDF } from "@/lib/pdf";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

export interface Message {
  id: string;
  content: string;
  sender: "user" | "assistant";
  options?: string[] | { text: string; clickable: boolean }[];
  template?: {
    type: "estimate" | "contract";
    html: string;
  };
  isTyping?: boolean;
  actions?: {
    label: string;
    onClick: () => void;
  }[];
}

// Esquema de validación para la cláusula personalizada
const customClauseSchema = z.object({
  clauseText: z.string().min(10, "La cláusula debe tener al menos 10 caracteres"),
});

// Esquema de validación para correcciones de información
const correctionSchema = z.object({
  fieldType: z.enum(["cliente", "contratista", "proyecto", "presupuesto"]),
  fieldName: z.string().min(1, "Debe seleccionar un campo para corregir"),
  fieldValue: z.string().min(1, "Debe proporcionar un valor para la corrección"),
});

// Tipos para los formularios
type CustomClauseFormValues = z.infer<typeof customClauseSchema>;
type CorrectionFormValues = z.infer<typeof correctionSchema>;

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [context, setContext] = useState<Record<string, any>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isChatActive, setIsChatActive] = useState(false);
  const [isAIMode, setIsAIMode] = useState(true); // Toggle between AI (Mervin) and manual modes
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploadingContract, setIsUploadingContract] = useState(false);
  const [showAnalysisEffect, setShowAnalysisEffect] = useState(false);
  
  // Estado para los diálogos
  const [isCustomClauseDialogOpen, setIsCustomClauseDialogOpen] = useState(false);
  const [isCorrectionDialogOpen, setIsCorrectionDialogOpen] = useState(false);
  const [correctionField, setCorrectionField] = useState("");
  const [customClause, setCustomClause] = useState("");
  const [allCustomClauses, setAllCustomClauses] = useState<string[]>([]);
  const [showCustomClauseForm, setShowCustomClauseForm] = useState(false);

  // Formulario para cláusulas personalizadas
  const customClauseForm = useForm<CustomClauseFormValues>({
    resolver: zodResolver(customClauseSchema),
    defaultValues: {
      clauseText: "",
    },
  });

  // Formulario para correcciones
  const correctionForm = useForm<CorrectionFormValues>({
    resolver: zodResolver(correctionSchema),
    defaultValues: {
      fieldType: "cliente",
      fieldName: "",
      fieldValue: "",
    },
  });

  const ProgressBar = () => (
    <div className="fixed top-16 left-0 right-0 z-50 px-4 py-2 bg-background/80 backdrop-blur-sm border-b">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-muted rounded-full h-3 overflow-hidden">
            <div
              className="bg-primary h-full rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-sm font-medium w-14 text-right">
            {progress}%
          </span>
        </div>
        <div className="text-xs text-muted-foreground text-center mt-1">
          {progress < 30
            ? "Recopilando información básica..."
            : progress < 60
              ? "Obteniendo detalles del proyecto..."
              : progress < 90
                ? "Refinando especificaciones..."
                : "Preparando estimado..."}
        </div>
      </div>
    </div>
  );
  
  const [projectId, setProjectId] = useState<string>(
    `PRJ-${Date.now().toString().slice(-6)}`,
  );
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const activateChat = async () => {
    setIsProcessing(true);
    try {
      // Mostrar opciones iniciales sin necesidad de llamar al API
      setMessages([
        {
          id: "welcome",
          content: "¡Hola! Soy Mervin, tu asistente virtual para proyectos de cercas. ¿En qué puedo ayudarte hoy?",
          sender: "assistant",
          options: [
            { text: "1. Generar Estimado", clickable: true },
            { text: "2. Generar Contrato", clickable: true },
            { text: "3. Verificador de Propiedad", clickable: true },
            { text: "4. Asesor de Permisos", clickable: true },
            { text: "5. Insights y Análisis", clickable: true }
          ],
        },
      ]);
      setIsChatActive(true);
    } catch (error) {
      console.error("Error activating chat:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to activate chat. Please try again.",
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  const [showManualForm, setShowManualForm] = useState(false);
  
  const activateManualEstimate = () => {
    setIsChatActive(true);
    setShowManualForm(true);
    setMessages([
      {
        id: "manual-welcome",
        content: "Bienvenido al modo de estimación manual. Usa el formulario a continuación para crear tu estimado paso a paso.",
        sender: "assistant",
      },
    ]);
  };
  
  const handleManualEstimateGenerated = (html: string) => {
    setShowManualForm(false);
    
    // Add template message with the generated estimate
    const templateMessage: Message = {
      id: `template-${Date.now()}`,
      content: "Aquí está el estimado que has creado:",
      sender: "assistant",
      template: {
        type: "estimate",
        html: html,
      },
    };
    
    setMessages((prev) => [...prev, templateMessage]);
  };

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (
    messageText: string,
    selectedOption?: string,
  ) => {
    if (isProcessing) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      content: selectedOption || messageText,
      sender: "user",
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsProcessing(true);

    // Verificar si el mensaje es para actualizar información del contrato
    const isContractCorrection = 
      messageText.toLowerCase().includes("nombre del cliente") ||
      messageText.toLowerCase().includes("dirección del cliente") ||
      messageText.toLowerCase().includes("direccion del cliente") ||
      messageText.toLowerCase().includes("teléfono del cliente") ||
      messageText.toLowerCase().includes("telefono del cliente") ||
      messageText.toLowerCase().includes("email del cliente") ||
      messageText.toLowerCase().includes("nombre del contratista") ||
      messageText.toLowerCase().includes("dirección del contratista") ||
      messageText.toLowerCase().includes("direccion del contratista") ||
      messageText.toLowerCase().includes("tipo de cerca") ||
      messageText.toLowerCase().includes("altura de") ||
      messageText.toLowerCase().includes("longitud de") ||
      messageText.toLowerCase().includes("material de") ||
      messageText.toLowerCase().includes("fecha de inicio") ||
      messageText.toLowerCase().includes("total es") ||
      messageText.toLowerCase().includes("depósito es") ||
      messageText.toLowerCase().includes("deposito es") ||
      messageText.toLowerCase().includes("forma de pago");
    
    // Verificar si el mensaje es para una cláusula adicional
    const isCustomClause = 
      messageText.toLowerCase().includes("añadir cláusula") ||
      messageText.toLowerCase().includes("añadir clausula") ||
      messageText.toLowerCase().includes("agregar cláusula") ||
      messageText.toLowerCase().includes("agregar clausula");
      
    // Add a typing indicator
    setMessages((prev) => [
      ...prev,
      { id: "typing", sender: "assistant", content: "", isTyping: true },
    ]);

    try {
      // Si es una corrección al contrato, procesarla directamente
      if (isContractCorrection && context.datos_extraidos) {
        // Eliminar indicador de escritura
        setMessages((prev) => prev.filter((m) => !m.isTyping));
        
        // Procesar la corrección
        await handleProcessCorrection(messageText);
        setIsProcessing(false);
        return;
      }
      
      // Si es una solicitud para añadir cláusula personalizada
      if (isCustomClause) {
        // Eliminar indicador de escritura
        setMessages((prev) => prev.filter((m) => !m.isTyping));
        
        // Mostrar el diálogo de cláusula personalizada
        handleAddCustomClause();
        
        // Responder al usuario
        const responseMessage: Message = {
          id: `response-${Date.now()}`,
          content: "Por supuesto, puedes añadir una cláusula personalizada a tu contrato. He abierto un formulario donde puedes escribir tu cláusula personalizada.",
          sender: "assistant",
        };
        
        setMessages((prev) => [...prev, responseMessage]);
        setIsProcessing(false);
        return;
      }

      // Process the message normally for other cases
      const response = await processChatMessage(selectedOption || messageText, {
        ...context,
        messages: messages.map((m) => ({ role: m.sender, content: m.content })),
      });

      // Remove typing indicator
      setMessages((prev) => prev.filter((m) => !m.isTyping));

      // Update context
      setContext((prev) => ({ ...prev, ...response.context }));

      // Check if we need to generate a contract based on the collected data
      if (response.action === "generateContract" && response.context.datos_extraidos) {
        // Handle contract generation with the collected data
        await handleGenerateContractWithExistingData();
      } else {
        // Add AI response to messages
        if (response.message) {
          const botMessage: Message = {
            id: `bot-${Date.now()}`,
            content: response.message,
            sender: "assistant",
            options: response.options || undefined,
          };

          setMessages((prev) => [...prev, botMessage]);
        }

        // If there's a template, add it to messages
        if (response.template) {
          const templateMessage: Message = {
            id: `template-${Date.now()}`,
            content: "Aquí está una vista previa de tu documento:",
            sender: "assistant",
            template: {
              type: response.template.type,
              html: response.template.html,
            },
          };

          setMessages((prev) => [...prev, templateMessage]);
        }
      }
    } catch (error) {
      console.error("Error processing message:", error);

      // Remove typing indicator
      setMessages((prev) => prev.filter((m) => !m.isTyping));

      // Show error message
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          content:
            "Lo siento, ocurrió un error al procesar tu mensaje. Por favor intenta de nuevo.",
          sender: "assistant",
        },
      ]);

      toast({
        variant: "destructive",
        title: "Error",
        description: "Error al procesar tu mensaje. Por favor intenta de nuevo.",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOptionClick = (option: string) => {
    // Verificar si la opción seleccionada es para generar contrato
    if (option === "2. Generar Contrato") {
      // Mostrar mensaje del usuario
      const userMessage: Message = {
        id: `user-${Date.now()}`,
        content: option,
        sender: "user",
      };
      setMessages((prev) => [...prev, userMessage]);
      
      // Mostrar respuesta del asistente solicitando un PDF
      setTimeout(() => {
        const assistantMessage: Message = {
          id: `assistant-${Date.now()}`,
          content: "Para generar un contrato, necesito un estimado en formato PDF que contenga la información del proyecto. Por favor, usa el ícono de clip en la barra de chat para cargar tu archivo PDF.",
          sender: "assistant",
        };
        setMessages((prev) => [...prev, assistantMessage]);
      }, 500);
    } else {
      // Para otras opciones, usar el procesamiento normal
      handleSendMessage(option, option);
    }
  };

  const handleDownloadPDF = async (html: string, type: "estimate" | "contract") => {
    try {
      if (type === "estimate") {
        await downloadEstimatePDF(html, `Estimate_${projectId}`);
      } else {
        await downloadContractPDF(html, `Contract_${projectId}`);
      }
    } catch (error) {
      console.error(`Error downloading ${type}:`, error);
      toast({
        variant: "destructive",
        title: "Download Failed",
        description: `Failed to download ${type}. Please try again.`,
      });
    }
  };

  const handleEditDetails = (templateType: "estimate" | "contract") => {
    setMessages((prev) => [
      ...prev,
      {
        id: `edit-${Date.now()}`,
        content: `What details would you like to change in the ${templateType}?`,
        sender: "assistant",
      },
    ]);
  };

  const handleEmailClient = (templateType: "estimate" | "contract") => {
    setMessages((prev) => [
      ...prev,
      {
        id: `email-${Date.now()}`,
        content: `To email this ${templateType} to your client, please confirm their email address:`,
        sender: "assistant",
      },
    ]);
  };
  
  // Función para manejar el cambio de archivo seleccionado
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };
  
  // Función para manejar la carga directa de archivos desde el icono de la barra de chat
  const handleDirectFileUpload = async (file: File) => {
    // Mostrar mensaje informativo al usuario
    const uploadMessage: Message = {
      id: `file-upload-${Date.now()}`,
      content: `Archivo recibido: ${file.name} (${Math.round(file.size / 1024)} KB). Procesando...`,
      sender: "assistant",
    };
    
    setMessages((prev) => [...prev, uploadMessage]);
    setIsUploadingContract(true);
    setShowAnalysisEffect(true);
    
    try {
      // Procesar el PDF después de un breve retraso para que se vea el efecto
      const result = await new Promise<Awaited<ReturnType<typeof processPDFForContract>>>(async (resolve) => {
        // Usamos un setTimeout para permitir que el efecto visual se muestre durante unos segundos
        setTimeout(async () => {
          try {
            const pdfResult = await processPDFForContract(file);
            resolve(pdfResult);
          } catch (error) {
            console.error("¡Chale! Error procesando el PDF para el contrato:", error);
            setShowAnalysisEffect(false);
            throw error;
          }
        }, 6500); // Esperar 6.5 segundos para mostrar el efecto completo
      });
      
      // Ocultar el efecto de análisis cuando termine
      setShowAnalysisEffect(false);
      
      // Mostrar mensaje de procesamiento exitoso
      const processingMessage: Message = {
        id: `processing-success-${Date.now()}`,
        content: "He analizado tu PDF con éxito utilizando tecnología avanzada de IA...",
        sender: "assistant",
      };
      
      // Reemplazar el mensaje de carga con el mensaje de éxito
      setMessages((prev) => {
        const filteredMessages = prev.filter(m => m.id !== uploadMessage.id);
        return [...filteredMessages, processingMessage];
      });
      
      // Guardar los datos extraídos en el contexto
      setContext((prev) => ({
        ...prev,
        datos_extraidos: result.datos_extraidos,
      }));
      
      // Mostrar mensaje sobre los datos extraídos
      const extractedDataMessage: Message = {
        id: `data-${Date.now()}`,
        content: `
He extraído los siguientes datos del PDF:

Cliente: ${result.datos_extraidos.cliente?.nombre || "No encontrado"}
Dirección: ${result.datos_extraidos.cliente?.direccion || "No encontrada"}
Tipo de cerca: ${result.datos_extraidos.proyecto?.tipoCerca || "No encontrado"}
Altura: ${result.datos_extraidos.proyecto?.altura || "No encontrada"}
Longitud: ${result.datos_extraidos.proyecto?.longitud || "No encontrada"}
Total: ${result.datos_extraidos.presupuesto?.total || "No encontrado"}

¿Quieres que genere un contrato usando estos datos?
        `,
        sender: "assistant",
        actions: [
          {
            label: "Generar Contrato",
            onClick: () => handleGenerateContractWithExistingData(),
          },
          {
            label: "Ajustar Datos",
            onClick: () => handleEditDetails("contract"),
          },
        ],
      };
      
      setMessages((prev) => [...prev, extractedDataMessage]);
    } catch (error) {
      console.error("Error procesando el PDF:", error);
      setShowAnalysisEffect(false);
      setIsUploadingContract(false);
      
      // Mostrar mensaje de error
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        content: "Lo siento, ocurrió un error al procesar el PDF. Por favor intenta con otro archivo o contacta a soporte técnico.",
        sender: "assistant",
      };
      
      // Reemplazar el mensaje de carga con el mensaje de error
      setMessages((prev) => {
        const filteredMessages = prev.filter(m => m.id !== uploadMessage.id);
        return [...filteredMessages, errorMessage];
      });
      
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo procesar el PDF. Por favor intenta con otro archivo.",
      });
    } finally {
      setIsUploadingContract(false);
    }
  };
  
  // Función para generar contrato desde PDF
  const handleGenerateContractFromPDF = async () => {
    if (!selectedFile) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select a PDF file first.",
      });
      return;
    }
    
    setIsContractModalOpen(false);
    handleDirectFileUpload(selectedFile);
  };
  
  // Función para generar contrato con los datos extraídos existentes
  const handleGenerateContractWithExistingData = async () => {
    if (!context.datos_extraidos) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No hay datos extraídos disponibles. Por favor, proporciona la información necesaria.",
      });
      return;
    }
    
    setIsProcessing(true);
    
    // Mostrar mensaje de procesamiento
    const processingMessage: Message = {
      id: `generating-${Date.now()}`,
      content: "Generando contrato con la información proporcionada...",
      sender: "assistant",
      isTyping: true,
    };
    
    setMessages((prev) => [...prev, processingMessage]);
    
    try {
      // Formateamos los datos para la API
      const datosFormateados = context.datos_extraidos;
      
      // Intentamos generar el contrato directamente
      let contractHtml;
      
      if (datosFormateados.contrato_html) {
        // Si ya tenemos un HTML de contrato generado previamente
        contractHtml = datosFormateados.contrato_html;
      } else {
        // Generamos uno nuevo con OpenAI
        contractHtml = await generateContract(datosFormateados);
      }
      
      // Feedback visual
      setMessages((prev) => prev.filter((m) => !m.isTyping));
      
      // Mensaje de confirmación
      const confirmationMessage: Message = {
        id: `confirm-${Date.now()}`,
        content: "¡He generado un contrato basado en la información que proporcionaste!",
        sender: "assistant",
      };
      setMessages((prev) => [...prev, confirmationMessage]);
      
      // Mostrar el contrato
      const templateMessage: Message = {
        id: `template-${Date.now()}`,
        content: "Aquí está una vista previa de tu contrato:",
        sender: "assistant",
        template: {
          type: "contract",
          html: contractHtml,
        },
      };
      
      setMessages((prev) => [...prev, templateMessage]);
      
      // Agregar mensaje de seguimiento 
      const followUpMessage: Message = {
        id: `follow-${Date.now()}`,
        content: "¿Te gustaría hacer algún cambio en el contrato? Puedes pedirme que modifique algo específico o añada cláusulas personalizadas.",
        sender: "assistant",
        actions: [
          {
            label: "Descargar PDF",
            onClick: () => handleDownloadPDF(contractHtml),
          },
          {
            label: "Añadir cláusula personalizada",
            onClick: () => setShowCustomClauseForm(true),
          }
        ]
      };
      
      setMessages((prev) => [...prev, followUpMessage]);
    } catch (error) {
      console.error("Error generando contrato:", error);
      
      // Quitar mensaje de procesamiento
      setMessages((prev) => prev.filter((m) => !m.isTyping));
      
      // Agregar mensaje de error
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        content: "Lo siento, ha ocurrido un error al generar el contrato. Por favor, intenta nuevamente o proporciona más detalles sobre el proyecto.",
        sender: "assistant",
      };
      
      setMessages((prev) => [...prev, errorMessage]);
      
      toast({
        variant: "destructive",
        title: "Error",
        description: "Error al generar el contrato.",
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Función para manejar la solicitud de añadir cláusula personalizada desde las opciones
  const handleRequestCustomClause = () => {
    const botMessage: Message = {
      id: `request-clause-${Date.now()}`,
      content: "Por favor, escribe la cláusula personalizada que te gustaría añadir al contrato. Puedes ser tan específico como necesites.",
      sender: "assistant",
    };
    
    setMessages((prev) => [...prev, botMessage]);
  };
  
  // Función para manejar la solicitud de corregir información desde las opciones
  const handleRequestCorrectInfo = () => {
    const botMessage: Message = {
      id: `request-correction-${Date.now()}`,
      content: "¿Qué información te gustaría corregir en el contrato? Puedes especificar, por ejemplo, \"El nombre del cliente es Juan Pérez\" o \"La altura de la cerca es 6 pies\".",
      sender: "assistant",
      options: [
        { text: "Información del cliente", clickable: true },
        { text: "Información del contratista", clickable: true },
        { text: "Detalles del proyecto", clickable: true },
        { text: "Información de pago", clickable: true },
      ],
    };
    
    setMessages((prev) => [...prev, botMessage]);
  };
  
  // Función para manejar la selección de tipo de información a corregir
  const handleCorrectInfoType = (infoType: string) => {
    let botMessage: Message;
    
    switch (infoType) {
      case "Información del cliente":
        botMessage = {
          id: `correct-client-${Date.now()}`,
          content: "Por favor, especifica qué información del cliente deseas corregir. Por ejemplo, \"El nombre del cliente es Juan Pérez\" o \"La dirección del cliente es Calle Principal 123\".",
          sender: "assistant",
        };
        break;
      case "Información del contratista":
        botMessage = {
          id: `correct-contractor-${Date.now()}`,
          content: "Por favor, especifica qué información del contratista deseas corregir. Por ejemplo, \"El nombre del contratista es Cercas ABC\" o \"La licencia del contratista es L-12345\".",
          sender: "assistant",
        };
        break;
      case "Detalles del proyecto":
        botMessage = {
          id: `correct-project-${Date.now()}`,
          content: "Por favor, especifica qué detalles del proyecto deseas corregir. Por ejemplo, \"El tipo de cerca es residencial\" o \"La altura de la cerca es 8 pies\".",
          sender: "assistant",
        };
        break;
      case "Información de pago":
        botMessage = {
          id: `correct-payment-${Date.now()}`,
          content: "Por favor, especifica qué información de pago deseas corregir. Por ejemplo, \"El total es $5,000\" o \"El depósito es $2,500\".",
          sender: "assistant",
        };
        break;
      default:
        botMessage = {
          id: `correct-generic-${Date.now()}`,
          content: "Por favor, especifica qué información deseas corregir en el contrato.",
          sender: "assistant",
        };
    }
    
    setMessages((prev) => [...prev, botMessage]);
  };
  
  // Función para manejar la corrección de información errónea en el contrato
  const handleCorrectMissingInfo = () => {
    setIsCorrectionDialogOpen(true);
  };
  
  // Función para procesar correcciones de texto en los mensajes
  const handleProcessCorrection = async (messageText: string) => {
    setIsProcessing(true);
    
    // Añadir mensaje de procesamiento
    const processingMessage: Message = {
      id: `processing-correction-${Date.now()}`,
      content: "Procesando tu corrección...",
      sender: "assistant",
    };
    
    setMessages((prev) => [...prev, processingMessage]);
    
    try {
      // Crear objeto para actualizar información
      const infoToUpdate: Record<string, any> = {};
      
      // Detectar qué campo se está actualizando basado en el mensaje
      
      // Detección de información del cliente
      if (messageText.toLowerCase().includes("nombre del cliente")) {
        const match = messageText.match(/nombre del cliente es (.+)/i);
        if (match && match[1]) {
          infoToUpdate.cliente = { nombre: match[1].trim() };
        }
      }
      
      if (messageText.toLowerCase().includes("dirección del cliente") || messageText.toLowerCase().includes("direccion del cliente")) {
        const match = messageText.match(/(dirección|direccion) del cliente es (.+)/i);
        if (match && match[2]) {
          infoToUpdate.cliente = { ...(infoToUpdate.cliente || {}), direccion: match[2].trim() };
        }
      }
      
      if (messageText.toLowerCase().includes("teléfono del cliente") || messageText.toLowerCase().includes("telefono del cliente")) {
        const match = messageText.match(/(teléfono|telefono) del cliente es (.+)/i);
        if (match && match[2]) {
          infoToUpdate.cliente = { ...(infoToUpdate.cliente || {}), telefono: match[2].trim() };
        }
      }
      
      if (messageText.toLowerCase().includes("email del cliente")) {
        const match = messageText.match(/email del cliente es (.+)/i);
        if (match && match[1]) {
          infoToUpdate.cliente = { ...(infoToUpdate.cliente || {}), email: match[1].trim() };
        }
      }
      
      // Detección de información del contratista
      if (messageText.toLowerCase().includes("nombre del contratista")) {
        const match = messageText.match(/nombre del contratista es (.+)/i);
        if (match && match[1]) {
          infoToUpdate.contratista = { nombre: match[1].trim() };
        }
      }
      
      if (messageText.toLowerCase().includes("dirección del contratista") || messageText.toLowerCase().includes("direccion del contratista")) {
        const match = messageText.match(/(dirección|direccion) del contratista es (.+)/i);
        if (match && match[2]) {
          infoToUpdate.contratista = { ...(infoToUpdate.contratista || {}), direccion: match[2].trim() };
        }
      }
      
      // Detección de información del proyecto
      if (messageText.toLowerCase().includes("tipo de cerca")) {
        const match = messageText.match(/tipo de cerca es (.+)/i);
        if (match && match[1]) {
          infoToUpdate.proyecto = { tipoCerca: match[1].trim() };
        }
      }
      
      if (messageText.toLowerCase().includes("altura de")) {
        const match = messageText.match(/altura de.* es (\d+)/i);
        if (match && match[1]) {
          infoToUpdate.proyecto = { ...(infoToUpdate.proyecto || {}), altura: match[1].trim() };
        }
      }
      
      if (messageText.toLowerCase().includes("longitud de")) {
        const match = messageText.match(/longitud de.* es (\d+)/i);
        if (match && match[1]) {
          infoToUpdate.proyecto = { ...(infoToUpdate.proyecto || {}), longitud: match[1].trim() };
        }
      }
      
      if (messageText.toLowerCase().includes("material de")) {
        const match = messageText.match(/material de.* es (.+)/i);
        if (match && match[1]) {
          infoToUpdate.proyecto = { ...(infoToUpdate.proyecto || {}), material: match[1].trim() };
        }
      }
      
      if (messageText.toLowerCase().includes("fecha de inicio")) {
        const match = messageText.match(/fecha de inicio es (.+)/i);
        if (match && match[1]) {
          infoToUpdate.proyecto = { ...(infoToUpdate.proyecto || {}), fechaInicio: match[1].trim() };
        }
      }
      
      // Detección de información de pago
      if (messageText.toLowerCase().includes("total es")) {
        const match = messageText.match(/total es (\$?[\d,]+)/i);
        if (match && match[1]) {
          infoToUpdate.presupuesto = { total: match[1].trim() };
        }
      }
      
      if (messageText.toLowerCase().includes("depósito") || messageText.toLowerCase().includes("deposito")) {
        const match = messageText.match(/(dep[óo]sito|anticipo) es (\$?[\d,]+|[\d]+%)/i);
        if (match && match[2]) {
          infoToUpdate.presupuesto = { ...(infoToUpdate.presupuesto || {}), deposito: match[2].trim() };
        }
      }
      
      if (messageText.toLowerCase().includes("forma de pago")) {
        const match = messageText.match(/forma de pago es (.+)/i);
        if (match && match[1]) {
          infoToUpdate.presupuesto = { ...(infoToUpdate.presupuesto || {}), formaPago: match[1].trim() };
        }
      }
      
      console.log('Información a actualizar:', infoToUpdate);
      
      // Si no se detectó ninguna corrección válida
      if (Object.keys(infoToUpdate).length === 0) {
        // Mensaje explicando el problema
        const noDetectionMessage: Message = {
          id: `no-detection-${Date.now()}`,
          content: "No pude detectar qué información deseas actualizar. Por favor, intenta nuevamente con un formato como: 'El nombre del cliente es Juan Pérez' o 'La altura de la cerca es 6 pies'.",
          sender: "assistant",
        };
        
        // Reemplazar el mensaje de procesamiento
        setMessages((prev) => prev.filter(m => m.id !== processingMessage.id).concat(noDetectionMessage));
        return;
      }
      
      // Actualizar el contrato con la nueva información
      const result = await actualizarContrato(
        context.datos_extraidos,
        undefined, // Sin cláusulas adicionales
        infoToUpdate
      );
      
      // Actualizar el contexto con los datos actualizados
      setContext((prev) => ({
        ...prev,
        datos_extraidos: result.datos_actualizados,
      }));
      
      // Confirmación de la actualización
      let updateDescription = "";
      
      if (infoToUpdate.cliente) {
        updateDescription += "Información del cliente actualizada. ";
      }
      
      if (infoToUpdate.contratista) {
        updateDescription += "Información del contratista actualizada. ";
      }
      
      if (infoToUpdate.proyecto) {
        updateDescription += "Detalles del proyecto actualizados. ";
      }
      
      if (infoToUpdate.presupuesto) {
        updateDescription += "Información de pago actualizada. ";
      }
      
      // Mensaje de confirmación
      const confirmationMessage: Message = {
        id: `confirm-update-${Date.now()}`,
        content: `${updateDescription.trim()} Aquí está tu contrato actualizado:`,
        sender: "assistant",
      };
      
      // Reemplazar el mensaje de procesamiento con el de confirmación
      setMessages((prev) => prev.filter(m => m.id !== processingMessage.id).concat(confirmationMessage));
      
      // Mostrar contrato actualizado
      const templateMessage: Message = {
        id: `template-${Date.now()}`,
        content: "",
        sender: "assistant",
        template: {
          type: "contract",
          html: result.contrato_html,
        },
      };
      
      setMessages((prev) => [...prev, templateMessage]);
      
      // Mensaje de seguimiento
      const followUpMessage: Message = {
        id: `followup-${Date.now()}`,
        content: "¿Hay algo más que te gustaría corregir o añadir al contrato?",
        sender: "assistant",
        options: [
          { text: "Añadir cláusula personalizada", clickable: true },
          { text: "Corregir más información", clickable: true },
          { text: "Descargar contrato", clickable: true },
        ],
      };
      
      setMessages((prev) => [...prev, followUpMessage]);
    } catch (error) {
      console.error("Error al procesar la corrección:", error);
      
      // Mensaje de error
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        content: "Lo siento, ocurrió un error al procesar tu corrección. Por favor intenta de nuevo.",
        sender: "assistant",
      };
      
      // Reemplazar el mensaje de procesamiento con el de error
      setMessages((prev) => prev.filter(m => m.id !== processingMessage.id).concat(errorMessage));
      
      toast({
        variant: "destructive",
        title: "Error",
        description: "Error al procesar la corrección.",
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Función para manejar el envío del formulario de cláusulas personalizadas
  const onCustomClauseSubmit = async (values: CustomClauseFormValues) => {
    setIsCustomClauseDialogOpen(false);
    setIsProcessing(true);
    
    try {
      // Añadir una respuesta de confirmación
      const confirmationMessage: Message = {
        id: `confirmation-${Date.now()}`,
        content: `Añadiendo la cláusula personalizada: "${values.clauseText}"`,
        sender: "assistant",
      };
      
      setMessages((prev) => [...prev, confirmationMessage]);
      
      // Actualizar el contrato con la nueva cláusula
      if (context.datos_extraidos) {
        const result = await actualizarContrato(
          context.datos_extraidos,
          [values.clauseText]
        );
        
        // Actualizar el contexto con los nuevos datos
        setContext((prev) => ({
          ...prev,
          datos_extraidos: result.datos_actualizados,
          contrato_actualizado: true,
        }));
        
        // Mostrar el contrato actualizado
        const templateMessage: Message = {
          id: `template-${Date.now()}`,
          content: "Aquí está tu contrato actualizado con la cláusula personalizada:",
          sender: "assistant",
          template: {
            type: "contract",
            html: result.contrato_html,
          },
        };
        
        setMessages((prev) => [...prev, templateMessage]);
        
        // Mensaje de seguimiento
        const followUpMessage: Message = {
          id: `followup-${Date.now()}`,
          content: "¿Hay algo más que te gustaría agregar o modificar en el contrato?",
          sender: "assistant",
        };
        
        setMessages((prev) => [...prev, followUpMessage]);
      } else {
        // Si no hay datos extraídos, mostrar un error
        const errorMessage: Message = {
          id: `error-${Date.now()}`,
          content: "Lo siento, no tengo datos de un contrato para modificar. Primero debes cargar un estimado para generar un contrato.",
          sender: "assistant",
        };
        
        setMessages((prev) => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error("Error añadiendo cláusula personalizada:", error);
      
      // Mostrar mensaje de error
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        content: "Lo siento, hubo un error al añadir la cláusula personalizada. Por favor intenta de nuevo.",
        sender: "assistant",
      };
      
      setMessages((prev) => [...prev, errorMessage]);
      
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo añadir la cláusula personalizada.",
      });
    } finally {
      setIsProcessing(false);
      customClauseForm.reset();
    }
  };
  
  // Función para manejar el envío del formulario de corrección
  const onCorrectionSubmit = async (values: CorrectionFormValues) => {
    setIsCorrectionDialogOpen(false);
    setIsProcessing(true);
    
    try {
      // Configurar objeto de corrección
      const correction: any = {};
      correction[values.fieldType] = {};
      correction[values.fieldType][values.fieldName] = values.fieldValue;
      
      // Añadir mensaje de confirmación
      const confirmationMessage: Message = {
        id: `confirmation-${Date.now()}`,
        content: `Actualizando el ${values.fieldName} de ${values.fieldType} a: "${values.fieldValue}"`,
        sender: "assistant",
      };
      
      setMessages((prev) => [...prev, confirmationMessage]);
      
      // Actualizar el contrato con la corrección
      if (context.datos_extraidos) {
        const result = await actualizarContrato(
          context.datos_extraidos,
          [],
          correction
        );
        
        // Actualizar el contexto con los nuevos datos
        setContext((prev) => ({
          ...prev,
          datos_extraidos: result.datos_actualizados,
          contrato_actualizado: true,
        }));
        
        // Mostrar el contrato actualizado
        const templateMessage: Message = {
          id: `template-${Date.now()}`,
          content: "Aquí está tu contrato actualizado con la corrección:",
          sender: "assistant",
          template: {
            type: "contract",
            html: result.contrato_html,
          },
        };
        
        setMessages((prev) => [...prev, templateMessage]);
        
        // Mensaje de seguimiento
        const followUpMessage: Message = {
          id: `followup-${Date.now()}`,
          content: "¿Hay algo más que te gustaría corregir o añadir al contrato?",
          sender: "assistant",
        };
        
        setMessages((prev) => [...prev, followUpMessage]);
      } else {
        // Si no hay datos extraídos, mostrar un error
        const errorMessage: Message = {
          id: `error-${Date.now()}`,
          content: "Lo siento, no tengo datos de un contrato para modificar. Primero debes cargar un estimado para generar un contrato.",
          sender: "assistant",
        };
        
        setMessages((prev) => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error("Error procesando corrección desde formulario:", error);
      
      // Mostrar mensaje de error
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        content: "Lo siento, hubo un error al procesar la corrección. Por favor intenta de nuevo.",
        sender: "assistant",
      };
      
      setMessages((prev) => [...prev, errorMessage]);
      
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo procesar la corrección.",
      });
    } finally {
      setIsProcessing(false);
      correctionForm.reset();
    }
  };
  
  // Función para manejar la adición de cláusulas al contrato directamente
  const handleAddClauseToContract = async () => {
    setIsCustomClauseDialogOpen(false);
    
    if (!customClause.trim()) {
      toast({
        title: "Error",
        description: "Por favor ingresa una cláusula personalizada",
        variant: "destructive",
      });
      return;
    }
    
    setIsProcessing(true);
    
    try {
      // Actualizar el contrato con la nueva cláusula
      if (context.datos_extraidos) {
        const result = await actualizarContrato(
          context.datos_extraidos,
          [customClause]
        );
        
        // Actualizar el contexto con los nuevos datos
        setContext((prev) => ({
          ...prev,
          datos_extraidos: result.datos_actualizados,
          contrato_actualizado: true,
        }));
        
        // Guardar la cláusula en la lista
        setAllCustomClauses((prev) => [...prev, customClause]);
        
        // Mostrar mensaje de confirmación
        const confirmationMessage: Message = {
          id: `clauseconfirm-${Date.now()}`,
          content: `He añadido tu cláusula personalizada al contrato: "${customClause}"`,
          sender: "assistant",
        };
        
        setMessages((prev) => [...prev, confirmationMessage]);
        
        // Mostrar el contrato actualizado
        const templateMessage: Message = {
          id: `template-${Date.now()}`,
          content: "Aquí está tu contrato actualizado:",
          sender: "assistant",
          template: {
            type: "contract",
            html: result.contrato_html,
          },
        };
        
        setMessages((prev) => [...prev, templateMessage]);
      } else {
        // Si no hay datos extraídos, mostrar un error
        const errorMessage: Message = {
          id: `error-${Date.now()}`,
          content: "Lo siento, no tengo datos de un contrato para modificar. Primero debes cargar un estimado para generar un contrato.",
          sender: "assistant",
        };
        
        setMessages((prev) => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error("Error añadiendo cláusula personalizada:", error);
      
      // Mostrar mensaje de error
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        content: "Lo siento, hubo un error al añadir la cláusula personalizada. Por favor intenta de nuevo.",
        sender: "assistant",
      };
      
      setMessages((prev) => [...prev, errorMessage]);
      
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo añadir la cláusula personalizada.",
      });
    } finally {
      setCustomClause("");
      setIsProcessing(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      await handleDirectFileUpload(file);
    }
  };

  return (
    <div className="relative flex-1 flex flex-col bg-background rounded-lg overflow-hidden border shadow-sm">
      {/* Animación de análisis de documentos */}
      {showAnalysisEffect && <AnalysisEffect isVisible={true} />}
      
      <div className="flex-1 flex flex-col">
        <div
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto p-4 scrollbar-hide messages-container"
        >
          {!isChatActive ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center max-w-xl mx-auto">
                <h2 className="text-2xl font-bold mb-4">¿Necesitas ayuda con un estimado?</h2>
                <p className="text-muted-foreground mb-8">Elige cómo quieres crear tu estimado</p>
                
                <div className="flex items-center justify-center space-x-2 mb-6">
                  <Label htmlFor="estimate-mode" className={`text-sm ${!isAIMode ? 'font-bold' : ''}`}>
                    Modo Manual
                  </Label>
                  <Switch
                    id="estimate-mode"
                    checked={isAIMode}
                    onCheckedChange={setIsAIMode}
                  />
                  <Label htmlFor="estimate-mode" className={`text-sm ${isAIMode ? 'font-bold' : ''}`}>
                    Modo Mervin IA
                  </Label>
                </div>
                
                <div className="bg-muted/50 rounded-lg p-5 mb-8">
                  {isAIMode ? (
                    <>
                      <h3 className="text-lg font-semibold mb-2">Modo Mervin IA</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Mervin te guiará con preguntas para generar un estimado completo. 
                        Ideal para quienes quieren un proceso rápido y asistido.
                      </p>
                      <Button
                        size="lg"
                        onClick={activateChat}
                        disabled={isProcessing}
                        className="gap-2 w-full"
                      >
                        {isProcessing ? (
                          <>
                            <i className="ri-loader-4-line animate-spin"></i>
                            Activando Mervin...
                          </>
                        ) : (
                          <>
                            <i className="ri-robot-line"></i>
                            Chatear con Mervin
                          </>
                        )}
                      </Button>
                    </>
                  ) : (
                    <>
                      <h3 className="text-lg font-semibold mb-2">Modo Manual</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Crea tu estimado paso a paso con opciones predefinidas.
                        Ideal para quienes prefieren mayor control sobre el proceso.
                      </p>
                      <Button
                        size="lg"
                        onClick={activateManualEstimate}
                        disabled={isProcessing}
                        className="gap-2 w-full"
                      >
                        <i className="ri-file-list-3-line"></i>
                        Crear Estimado Manual
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <>
              {messages.map((message) => {
                if (message.isTyping) {
                  return <TypingIndicator key={message.id} />;
                }

                if (message.template) {
                  return (
                    <div key={message.id} className="chat-message bot-message">
                      <p>{message.content}</p>
                      <div className="mt-4">
                        {message.template.type === "estimate" ? (
                          <EstimatePreview html={message.template.html} />
                        ) : (
                          <ContractPreview html={message.template.html} />
                        )}
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() =>
                            handleDownloadPDF(
                              message.template!.html,
                              message.template!.type,
                            )
                          }
                        >
                          <i className="ri-download-line mr-1"></i> Descargar PDF
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditDetails(message.template!.type)}
                        >
                          <i className="ri-edit-line mr-1"></i> Editar Detalles
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEmailClient(message.template!.type)}
                        >
                          <i className="ri-mail-send-line mr-1"></i> Enviar por Email
                        </Button>
                      </div>
                    </div>
                  );
                }

                return (
                  <ChatMessage
                    key={message.id}
                    message={message}
                    onOptionClick={handleOptionClick}
                    onActionClick={(action) => action.onClick()}
                  />
                );
              })}

              {showManualForm && (
                <div className="mt-4">
                  <ManualEstimateForm onGenerate={handleManualEstimateGenerated} />
                </div>
              )}
            </>
          )}
        </div>

        {isChatActive && (
          <ChatInput
            onSendMessage={handleSendMessage}
            isProcessing={isProcessing}
            onFileUpload={handleFileUpload}
            showFileUpload={true}
          />
        )}
        
        {/* Diálogo para añadir cláusulas personalizadas */}
        <Dialog open={isCustomClauseDialogOpen} onOpenChange={setIsCustomClauseDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Añadir Cláusula Personalizada</DialogTitle>
              <DialogDescription>
                Escribe la cláusula personalizada que deseas añadir a tu contrato.
              </DialogDescription>
            </DialogHeader>
            <Form {...customClauseForm}>
              <form onSubmit={customClauseForm.handleSubmit(onCustomClauseSubmit)} className="space-y-4">
                <FormField
                  control={customClauseForm.control}
                  name="clauseText"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cláusula Personalizada</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Ej: El contratista se compromete a limpiar completamente el área de trabajo al finalizar el proyecto."
                          className="min-h-[120px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter className="flex justify-between">
                  <Button
                    variant="outline"
                    onClick={() => setIsCustomClauseDialogOpen(false)}
                    type="button"
                  >
                    Cancelar
                  </Button>
                  <Button type="submit">Añadir al Contrato</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Diálogo para correcciones de información */}
        <Dialog open={isCorrectionDialogOpen} onOpenChange={setIsCorrectionDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Corregir Información</DialogTitle>
              <DialogDescription>
                {correctionField ? 
                  `Corrección para: ${correctionField}` : 
                  "Selecciona el tipo de información que deseas corregir."
                }
              </DialogDescription>
            </DialogHeader>
            <Form {...correctionForm}>
              <form onSubmit={correctionForm.handleSubmit(onCorrectionSubmit)} className="space-y-4">
                <FormField
                  control={correctionForm.control}
                  name="fieldType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Campo</FormLabel>
                      <FormControl>
                        <select
                          className="w-full p-2 border rounded"
                          {...field}
                          onChange={(e) => {
                            field.onChange(e);
                            // Resetear el fieldName cuando cambia el tipo
                            correctionForm.resetField("fieldName");
                          }}
                        >
                          <option value="cliente">Cliente</option>
                          <option value="contratista">Contratista</option>
                          <option value="proyecto">Proyecto</option>
                          <option value="presupuesto">Presupuesto</option>
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={correctionForm.control}
                  name="fieldName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Campo a Corregir</FormLabel>
                      <FormControl>
                        <select
                          className="w-full p-2 border rounded"
                          {...field}
                        >
                          {correctionForm.getValues("fieldType") === "cliente" && (
                            <>
                              <option value="">Selecciona un campo</option>
                              <option value="nombre">Nombre</option>
                              <option value="direccion">Dirección</option>
                              <option value="telefono">Teléfono</option>
                              <option value="email">Email</option>
                            </>
                          )}
                          {correctionForm.getValues("fieldType") === "contratista" && (
                            <>
                              <option value="">Selecciona un campo</option>
                              <option value="nombre">Nombre</option>
                              <option value="direccion">Dirección</option>
                              <option value="telefono">Teléfono</option>
                              <option value="email">Email</option>
                              <option value="licencia">Número de Licencia</option>
                            </>
                          )}
                          {correctionForm.getValues("fieldType") === "proyecto" && (
                            <>
                              <option value="">Selecciona un campo</option>
                              <option value="tipoCerca">Tipo de Cerca</option>
                              <option value="altura">Altura</option>
                              <option value="longitud">Longitud</option>
                              <option value="material">Material</option>
                              <option value="fechaInicio">Fecha de Inicio</option>
                              <option value="descripcion">Descripción</option>
                            </>
                          )}
                          {correctionForm.getValues("fieldType") === "presupuesto" && (
                            <>
                              <option value="">Selecciona un campo</option>
                              <option value="total">Total</option>
                              <option value="deposito">Depósito</option>
                              <option value="formaPago">Forma de Pago</option>
                            </>
                          )}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={correctionForm.control}
                  name="fieldValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valor Correcto</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Ingresa el valor correcto" 
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <DialogFooter className="flex justify-between">
                  <Button
                    variant="outline"
                    onClick={() => setIsCorrectionDialogOpen(false)}
                    type="button"
                  >
                    Cancelar
                  </Button>
                  <Button type="submit">Aplicar Corrección</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Footer with legal links */}
        <ChatFooter />
        {isProcessing && <ProgressBar />}
      </div>
    </div>
  );
}
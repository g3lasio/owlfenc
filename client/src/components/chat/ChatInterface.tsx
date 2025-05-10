import { useRef, useEffect, useState } from "react";
import ChatMessage from "./ChatMessage";
import ChatInput from "./ChatInput";
import ChatFooter from "./ChatFooter";
import TypingIndicator from "./TypingIndicator";
import EstimatePreview from "../templates/EstimatePreview";
import ContractPreview from "../templates/ContractPreview";
import ManualEstimateForm from "../estimates/ManualEstimateForm";
import { AnalysisEffect } from "../effects/AnalysisEffect";
import { processChatMessage, processPDFForContract, actualizarContrato } from "@/lib/openai";
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
          id: `bot-${Date.now()}`,
          content: "Para generar un contrato, necesito que subas el PDF de un estimado existente. Esto me permitirá extraer toda la información relevante como cliente, detalles del proyecto y costos para crear un contrato personalizado.",
          sender: "assistant",
        };
        setMessages((prev) => [...prev, assistantMessage]);
        
        // Añadir segundo mensaje indicando que usen el icono de clip
        setTimeout(() => {
          const uploadMessage: Message = {
            id: `upload-${Date.now()}`,
            content: "Por favor, utiliza el icono de PDF 📎 que se encuentra en la barra de chat para subir tu archivo de estimado.",
            sender: "assistant",
          };
          setMessages((prev) => [...prev, uploadMessage]);
        }, 800);
      }, 600);
    } 
    // Para el resto de opciones, usar el comportamiento predeterminado
    else {
      handleSendMessage(option, option);
    }
  };

  const handleDownloadPDF = async (
    html: string,
    type: "estimate" | "contract",
    messageId?: string
  ) => {
    try {
      // Si es un contrato generado desde PDF y tenemos el Base64 en el contexto
      if (type === "contract" && context.contrato_pdf_base64) {
        // Convertir de Base64 a Blob
        const byteCharacters = atob(context.contrato_pdf_base64);
        const byteNumbers = new Array(byteCharacters.length);
        
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/pdf' });
        
        // Usar la función ya existente para descargar el blob
        downloadPDF(blob, `contract-${projectId}.pdf`);
      } else if (type === "estimate") {
        await downloadEstimatePDF(html, projectId);
      } else {
        await downloadContractPDF(html, projectId);
      }

      toast({
        title: "Success",
        description: `Your ${type} has been downloaded as a PDF.`,
        duration: 3000,
      });
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
  
  // Función para manejar la apertura del modal de contratos (ya no se usa, pero se mantiene por compatibilidad)
  const handleOpenContractModal = () => {
    setIsContractModalOpen(true);
    setSelectedFile(null);
  };
  
  // Función para manejar el cambio de archivo seleccionado en el modal (para compatibilidad)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };
  
  // Nueva función para manejar la carga directa de archivos desde el icono de la barra de chat
  const handleDirectFileUpload = async (file: File) => {
    // Mostrar mensaje informativo al usuario
    const uploadMessage: Message = {
      id: `file-upload-${Date.now()}`,
      content: `Archivo recibido: ${file.name} (${Math.round(file.size / 1024)} KB). Procesando...`,
      sender: "assistant",
    };
    
    setMessages((prev) => [...prev, uploadMessage]);
    
    // Mostrar el efecto de análisis futurista
    setShowAnalysisEffect(true);
    setIsUploadingContract(true);
    
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

Cliente: ${result.datos_extraidos.cliente.nombre || "No encontrado"}
Dirección: ${result.datos_extraidos.cliente.direccion || "No encontrada"}
Tipo de cerca: ${result.datos_extraidos.proyecto.tipoCerca || "No encontrado"}
Altura: ${result.datos_extraidos.proyecto.altura || "No encontrada"}
Longitud: ${result.datos_extraidos.proyecto.longitud || "No encontrada"}
Total: ${result.datos_extraidos.presupuesto.total || "No encontrado"}

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
        description: "Por favor selecciona un archivo PDF primero.",
      });
      return;
    }
    
    setIsUploadingContract(true);
    
    try {
      // Cerrar el modal de carga para mostrar el efecto de análisis futurista
      setIsContractModalOpen(false);
      
      // Mostrar el efecto de análisis futurista
      setShowAnalysisEffect(true);
      
      // Procesar el PDF después de un breve retraso para que se vea el efecto
      const result = await new Promise<Awaited<ReturnType<typeof processPDFForContract>>>(async (resolve) => {
        // Usamos un setTimeout para permitir que el efecto visual se muestre durante unos segundos
        // antes de hacer la llamada real a la API
        setTimeout(async () => {
          try {
            const pdfResult = await processPDFForContract(selectedFile!);
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
      
      // Mostrar mensaje de procesamiento
      const processingMessage: Message = {
        id: `processing-${Date.now()}`,
        content: "He analizado tu PDF con éxito utilizando tecnología avanzada de IA...",
        sender: "assistant",
      };
      
      setMessages((prev) => [...prev, processingMessage]);
      
      // Guardar los datos extraídos en el contexto
      setContext((prev) => ({
        ...prev,
        datos_extraidos: result.datos_extraidos,
      }));
      
      // Mostrar mensaje sobre los datos extraídos
      const extractionMessage: Message = {
        id: `extraction-${Date.now()}`,
        content: `¡He analizado el PDF y extraído la información principal! Aquí están los detalles que pude identificar:\n\n- Cliente: ${result.datos_extraidos.cliente?.nombre || 'No identificado'}\n- Tipo de cerca: ${result.datos_extraidos.proyecto?.tipoCerca || 'No identificado'}\n- Altura: ${result.datos_extraidos.proyecto?.altura || 'No identificada'} pies\n- Longitud: ${result.datos_extraidos.proyecto?.longitud || 'No identificada'} pies\n- Precio total: $${result.datos_extraidos.presupuesto?.total || 'No identificado'}`,
        sender: "assistant",
      };
      
      setMessages((prev) => [...prev, extractionMessage]);
      
      // Solicitar información adicional
      setTimeout(() => {
        const questionMessage: Message = {
          id: `question-${Date.now()}`,
          content: "Para completar el contrato, necesito algunos detalles adicionales que no están en el estimado. Por favor, responde a estas preguntas:",
          sender: "assistant",
        };
        
        setMessages((prev) => [...prev, questionMessage]);
        
        // Preguntar por detalles adicionales uno por uno
        setTimeout(() => {
          const dateQuestion: Message = {
            id: `date-question-${Date.now()}`,
            content: "¿Cuándo planeas iniciar el proyecto? (Por favor, específica una fecha aproximada)",
            sender: "assistant",
          };
          
          setMessages((prev) => [...prev, dateQuestion]);
        }, 800);
      }, 1000);
      
      // Añadir mensaje con la vista previa del contrato
      setTimeout(() => {
        const templateMessage: Message = {
          id: `template-${Date.now()}`,
          content: "Aquí está el borrador inicial del contrato basado en el estimado:",
          sender: "assistant",
          template: {
            type: "contract",
            html: result.contrato_html,
          },
        };
        
        setMessages((prev) => [...prev, templateMessage]);
      }, 3000);
      
    } catch (error) {
      console.error("Error generando contrato:", error);
      // Cerrar el modal en caso de error
      setIsContractModalOpen(false);
      
      // Mostrar mensaje de error en el chat
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        content: "Lo siento, tuve problemas procesando el PDF. Por favor, verifica que el archivo sea legible y vuelve a intentarlo.",
        sender: "assistant",
      };
      
      setMessages((prev) => [...prev, errorMessage]);
      
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo generar el contrato. Intenta de nuevo.",
      });
    } finally {
      setIsUploadingContract(false);
    }
  };
  
  // Función para solicitar ajustes a Mervin
  const handleRequestAdjustments = () => {
    setIsContractModalOpen(false);
    
    // Agregar mensaje automático de Mervin
    const botMessage: Message = {
      id: `bot-${Date.now()}`,
      content: "Entiendo que deseas ajustar tu contrato generado. Por favor, especifícame claramente qué deseas ajustar o añadir en el contrato para proceder con los cambios necesarios.",
      sender: "assistant",
      actions: [
        {
          label: "Añadir Cláusula Personalizada",
          onClick: () => handleAddCustomClause(),
        },
        {
          label: "Corregir Información",
          onClick: () => handleCorrectMissingInfo(),
        }
      ],
    };
    
    setMessages((prev) => [...prev, botMessage]);
  };
  
  // Estado para manejar el diálogo de cláusulas personalizadas
  const [customClauseDialogOpen, setCustomClauseDialogOpen] = useState(false);
  const [customClause, setCustomClause] = useState("");
  const [allCustomClauses, setAllCustomClauses] = useState<string[]>([]);
  
  // Función para mostrar diálogo de añadir cláusula personalizada
  const handleAddCustomClause = () => {
    setCustomClauseDialogOpen(true);
  };
  
  // Función para agregar la cláusula personalizada
  const handleAddClauseToContract = async () => {
    if (!customClause.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Por favor, escribe una cláusula para añadir al contrato.",
      });
      return;
    }
    
    setCustomClauseDialogOpen(false);
    
    // Añadir la cláusula a la lista
    const updatedClauses = [...allCustomClauses, customClause];
    setAllCustomClauses(updatedClauses);
    
    // Mensaje que confirma la recepción de la cláusula
    const confirmationMessage: Message = {
      id: `confirmation-${Date.now()}`,
      content: `He recibido tu cláusula personalizada: "${customClause}". La agregaré al contrato.`,
      sender: "assistant",
    };
    
    setMessages((prev) => [...prev, confirmationMessage]);
    
    // Verificar si tenemos los datos necesarios en el contexto
    if (!context.datos_extraidos) {
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        content: "Lo siento, no puedo encontrar los datos del contrato original. Por favor, genera un contrato nuevo subiendo el PDF del estimado.",
        sender: "assistant",
      };
      
      setMessages((prev) => [...prev, errorMessage]);
      return;
    }
    
    try {
      // Mensaje de procesamiento
      const processingMessage: Message = {
        id: `processing-${Date.now()}`,
        content: "Estoy actualizando tu contrato con la nueva cláusula personalizada...",
        sender: "assistant",
      };
      
      setMessages((prev) => [...prev, processingMessage]);
      
      // Actualizar el contrato con la nueva cláusula
      const result = await actualizarContrato(
        context.datos_extraidos,
        updatedClauses
      );
      
      // Actualizar el contexto con los datos actualizados
      setContext((prev) => ({
        ...prev,
        datos_extraidos: result.datos_actualizados,
      }));
      
      // Mostrar el contrato actualizado
      const contractMessage: Message = {
        id: `updated-contract-${Date.now()}`,
        content: "He actualizado el contrato con tu cláusula personalizada. Aquí está la nueva versión:",
        sender: "assistant",
        template: {
          type: "contract",
          html: result.contrato_html,
        },
      };
      
      setMessages((prev) => prev.filter(m => m.id !== processingMessage.id).concat(contractMessage));
      
      // Limpiar la cláusula actual pero mantener la lista completa
      setCustomClause("");
      
    } catch (error) {
      console.error("Error al actualizar el contrato:", error);
      
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        content: "Lo siento, ocurrió un error al actualizar el contrato. Por favor intenta de nuevo.",
        sender: "assistant",
      };
      
      setMessages((prev) => [...prev, errorMessage]);
    }
  };
  
  // Función para manejar información faltante o incorrecta
  const handleCorrectMissingInfo = () => {
    // Mensaje de Mervin solicitando la información
    const promptMessage: Message = {
      id: `prompt-${Date.now()}`,
      content: "He detectado que faltan algunos datos importantes en el contrato. Por favor, especifica qué información deseas corregir o agregar. Puedes proporcionarme cualquiera de los siguientes datos:",
      sender: "assistant",
    };
    
    setMessages((prev) => [...prev, promptMessage]);
    
    // Mostrar opciones de corrección específicas
    setTimeout(() => {
      const optionsMessage: Message = {
        id: `options-${Date.now()}`,
        content: "• Información del cliente: nombre, dirección, teléfono, email\n• Información del contratista: nombre, dirección, teléfono, email, licencia\n• Detalles del proyecto: tipo de cerca, altura, longitud, material, fecha de inicio\n• Información de pago: total, depósito, forma de pago",
        sender: "assistant",
      };
      
      setMessages((prev) => [...prev, optionsMessage]);
      
      // Mensaje adicional con ejemplos
      setTimeout(() => {
        const examplesMessage: Message = {
          id: `examples-${Date.now()}`,
          content: "Ejemplos de cómo puedes proporcionarme la información:\n\"El nombre del cliente es Juan Pérez\"\n\"La dirección del contratista es 123 Calle Principal, Ciudad\"\n\"La altura de la cerca será de 6 pies\"\n\"El depósito inicial será del 25%\"",
          sender: "assistant",
        };
        
        setMessages((prev) => [...prev, examplesMessage]);
      }, 800);
    }, 600);
  };
  
  // Función para procesar mensajes de corrección de información
  const handleProcessCorrection = async (message: string) => {
    // Verificar que tenemos datos extraídos en el contexto
    if (!context.datos_extraidos) {
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        content: "Lo siento, no puedo encontrar los datos del contrato original. Por favor, genera un contrato nuevo subiendo el PDF del estimado.",
        sender: "assistant",
      };
      
      setMessages((prev) => [...prev, errorMessage]);
      return;
    }
    
    try {
      // Mensaje de procesamiento
      const processingMessage: Message = {
        id: `processing-${Date.now()}`,
        content: "Estoy procesando tu corrección...",
        sender: "assistant",
      };
      
      setMessages((prev) => [...prev, processingMessage]);
      
      // Analizar el mensaje para determinar qué campo actualizar
      const infoToUpdate: any = {};
      
      // Detección de información del cliente
      if (message.toLowerCase().includes("nombre del cliente")) {
        const match = message.match(/nombre del cliente es (.+)/i);
        if (match && match[1]) {
          infoToUpdate.cliente = { nombre: match[1].trim() };
        }
      }
      
      if (message.toLowerCase().includes("dirección del cliente") || message.toLowerCase().includes("direccion del cliente")) {
        const match = message.match(/direcci[óo]n del cliente es (.+)/i);
        if (match && match[1]) {
          infoToUpdate.cliente = { ...(infoToUpdate.cliente || {}), direccion: match[1].trim() };
        }
      }
      
      if (message.toLowerCase().includes("teléfono del cliente") || message.toLowerCase().includes("telefono del cliente")) {
        const match = message.match(/tel[ée]fono del cliente es (.+)/i);
        if (match && match[1]) {
          infoToUpdate.cliente = { ...(infoToUpdate.cliente || {}), telefono: match[1].trim() };
        }
      }
      
      if (message.toLowerCase().includes("email del cliente")) {
        const match = message.match(/email del cliente es (.+)/i);
        if (match && match[1]) {
          infoToUpdate.cliente = { ...(infoToUpdate.cliente || {}), email: match[1].trim() };
        }
      }
      
      // Detección de información del contratista
      if (message.toLowerCase().includes("nombre del contratista")) {
        const match = message.match(/nombre del contratista es (.+)/i);
        if (match && match[1]) {
          infoToUpdate.contratista = { nombre: match[1].trim() };
        }
      }
      
      if (message.toLowerCase().includes("dirección del contratista") || message.toLowerCase().includes("direccion del contratista")) {
        const match = message.match(/direcci[óo]n del contratista es (.+)/i);
        if (match && match[1]) {
          infoToUpdate.contratista = { ...(infoToUpdate.contratista || {}), direccion: match[1].trim() };
        }
      }
      
      // Detección de información del proyecto
      if (message.toLowerCase().includes("tipo de cerca")) {
        const match = message.match(/tipo de cerca es (.+)/i);
        if (match && match[1]) {
          infoToUpdate.proyecto = { tipoCerca: match[1].trim() };
        }
      }
      
      if (message.toLowerCase().includes("altura de")) {
        const match = message.match(/altura de.* es (\d+)/i);
        if (match && match[1]) {
          infoToUpdate.proyecto = { ...(infoToUpdate.proyecto || {}), altura: match[1].trim() };
        }
      }
      
      if (message.toLowerCase().includes("longitud de")) {
        const match = message.match(/longitud de.* es (\d+)/i);
        if (match && match[1]) {
          infoToUpdate.proyecto = { ...(infoToUpdate.proyecto || {}), longitud: match[1].trim() };
        }
      }
      
      if (message.toLowerCase().includes("material de")) {
        const match = message.match(/material de.* es (.+)/i);
        if (match && match[1]) {
          infoToUpdate.proyecto = { ...(infoToUpdate.proyecto || {}), material: match[1].trim() };
        }
      }
      
      if (message.toLowerCase().includes("fecha de inicio")) {
        const match = message.match(/fecha de inicio es (.+)/i);
        if (match && match[1]) {
          infoToUpdate.proyecto = { ...(infoToUpdate.proyecto || {}), fechaInicio: match[1].trim() };
        }
      }
      
      // Detección de información de pago
      if (message.toLowerCase().includes("total es")) {
        const match = message.match(/total es (\$?[\d,]+)/i);
        if (match && match[1]) {
          infoToUpdate.presupuesto = { total: match[1].trim() };
        }
      }
      
      if (message.toLowerCase().includes("depósito") || message.toLowerCase().includes("deposito")) {
        const match = message.match(/(dep[óo]sito|anticipo) es (\$?[\d,]+|[\d]+%)/i);
        if (match && match[2]) {
          infoToUpdate.presupuesto = { ...(infoToUpdate.presupuesto || {}), deposito: match[2].trim() };
        }
      }
      
      if (message.toLowerCase().includes("forma de pago")) {
        const match = message.match(/forma de pago es (.+)/i);
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
        id: `confirmation-${Date.now()}`,
        content: `He actualizado la información: ${updateDescription}Aquí está el contrato actualizado:`,
        sender: "assistant",
        template: {
          type: "contract",
          html: result.contrato_html,
        },
      };
      
      // Reemplazar el mensaje de procesamiento
      setMessages((prev) => prev.filter(m => m.id !== processingMessage.id).concat(confirmationMessage));
      
    } catch (error) {
      console.error("Error al actualizar la información del contrato:", error);
      
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        content: "Lo siento, ocurrió un error al actualizar el contrato. Por favor intenta de nuevo.",
        sender: "assistant",
      };
      
      setMessages((prev) => [...prev, errorMessage]);
    }
  };
  
  // Función para generar contrato con los datos ya extraídos
  const handleGenerateContractWithExistingData = async () => {
    // Mostrar mensaje informativo
    const generatingMessage: Message = {
      id: `generating-${Date.now()}`,
      content: "Generando contrato personalizado con los datos extraídos...",
      sender: "assistant",
    };
    
    setMessages((prev) => [...prev, generatingMessage]);
    
    try {
      // Utilizar el endpoint para ajustar contratos con los datos extraídos
      const response = await fetch('/api/ajustar-contrato', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          datos_extraidos: context.datos_extraidos,
          informacion_adicional: {
            fecha_inicio: new Date().toLocaleDateString(),
            duracion_estimada: "4 semanas"
          }
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error ajustando el contrato');
      }
      
      const data = await response.json();
      const contractHtml = data.contrato_html;
      
      // Mostrar el contrato generado como un mensaje normal con acciones
      const contractMessage: Message = {
        id: `contract-${Date.now()}`,
        content: "¡He generado tu contrato! Aquí tienes un resumen con los datos extraídos:\n\n" +
                "- Cliente: " + (context.datos_extraidos?.cliente?.nombre || 'No especificado') + "\n" +
                "- Dirección: " + (context.datos_extraidos?.cliente?.direccion || 'No especificada') + "\n" +
                "- Tipo de cerca: " + (context.datos_extraidos?.proyecto?.tipoCerca || 'No especificado') + "\n" +
                "- Altura: " + (context.datos_extraidos?.proyecto?.altura || 'No especificada') + "\n" +
                "- Longitud: " + (context.datos_extraidos?.proyecto?.longitud || 'No especificada') + "\n" +
                "- Precio total: $" + (context.datos_extraidos?.presupuesto?.total || '0.00'),
        sender: "assistant",
        actions: [
          {
            label: "Ver Contrato PDF",
            onClick: () => {
              // Añadir mensaje de plantilla
              const templateMessage: Message = {
                id: `template-contract-${Date.now()}`,
                content: "Aquí está el contrato generado:",
                sender: "assistant",
                template: {
                  type: "contract",
                  html: contractHtml,
                },
              };
              setMessages((prev) => [...prev, templateMessage]);
            }
          },
          {
            label: "Descargar PDF",
            onClick: () => handleDownloadPDF(contractHtml, "contract"),
          },
          {
            label: "Enviar por Email",
            onClick: () => handleEmailClient("contract"),
          },
          {
            label: "Solicitar Ajustes",
            onClick: handleRequestAdjustments,
          },
        ],
      };
      
      // Reemplazar el mensaje de generación con el contrato
      setMessages((prev) => {
        const filtered = prev.filter(m => m.id !== generatingMessage.id);
        return [...filtered, contractMessage];
      });
      
    } catch (error) {
      console.error("Error generando contrato:", error);
      
      // Mostrar mensaje de error
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        content: "Lo siento, ocurrió un error al generar el contrato. Por favor intenta de nuevo más tarde.",
        sender: "assistant",
      };
      
      // Reemplazar el mensaje de generación con el error
      setMessages((prev) => {
        const filtered = prev.filter(m => m.id !== generatingMessage.id);
        return [...filtered, errorMessage];
      });
      
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo generar el contrato. Por favor intenta de nuevo.",
      });
    }
  };

  return (
    <div className="relative flex flex-col h-full chat-outer-container">
      {/* Efecto futurista de análisis de Mervin AI */}
      <AnalysisEffect 
        isVisible={showAnalysisEffect} 
        onComplete={() => setShowAnalysisEffect(false)} 
      />

      <div className="flex flex-col h-full chat-container">
        {/* Chat Messages */}
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
                        {message.template.type === "contract" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleRequestAdjustments}
                          >
                            <i className="ri-file-edit-line mr-1"></i> Solicitar Ajustes
                          </Button>
                        )}
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
                  />
                );
              })}
              
              {/* Mostrar el formulario de estimación manual si estamos en modo manual */}
              {showManualForm && (
                <div className="mt-6 p-4 bg-card rounded-lg border">
                  <ManualEstimateForm onEstimateGenerated={handleManualEstimateGenerated} />
                </div>
              )}
            </>
          )}
        </div>

        {/* Chat Input */}
        {isChatActive && !showManualForm && ( // Solo mostrar el input si chat está activo y no estamos en modo manual
          <div className="relative">
            <ChatInput 
              onSendMessage={handleSendMessage} 
              isDisabled={isProcessing}
              onFileUpload={handleDirectFileUpload}
            />
          </div>
        )}
        
        {/* Modal para subir un PDF */}
        <Dialog open={isContractModalOpen} onOpenChange={setIsContractModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Subir PDF para generar contrato</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="flex flex-col gap-4">
                <p className="text-sm text-muted-foreground">
                  Sube un PDF con un estimado aprobado por el cliente para generar automáticamente un contrato personalizado.
                </p>
                <div className="flex flex-col gap-2">
                  <Input 
                    type="file" 
                    accept=".pdf" 
                    onChange={handleFileChange}
                    disabled={isUploadingContract}
                  />
                  {selectedFile && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Archivo seleccionado: {selectedFile.name} ({Math.round(selectedFile.size / 1024)} KB)
                    </p>
                  )}
                </div>
              </div>
            </div>
            <DialogFooter className="sm:justify-between">
              <Button
                variant="outline"
                onClick={() => setIsContractModalOpen(false)}
                disabled={isUploadingContract}
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleGenerateContractFromPDF}
                disabled={!selectedFile || isUploadingContract}
              >
                {isUploadingContract ? (
                  <>
                    <i className="ri-loader-4-line animate-spin mr-2"></i>
                    Procesando...
                  </>
                ) : (
                  <>
                    <i className="ri-file-text-line mr-2"></i>
                    Generar Contrato
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Diálogo para añadir cláusulas personalizadas */}
        <Dialog open={customClauseDialogOpen} onOpenChange={setCustomClauseDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Añadir Cláusula Personalizada</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="flex flex-col gap-4">
                <p className="text-sm text-muted-foreground">
                  Escribe la cláusula personalizada que deseas añadir a tu contrato. Por ejemplo: "El cliente proporcionará una botella de Pepsi de 2 litros cada viernes durante la duración del proyecto."
                </p>
                <Textarea
                  placeholder="Escribe tu cláusula personalizada aquí..."
                  value={customClause}
                  onChange={(e) => setCustomClause(e.target.value)}
                  className="min-h-[100px]"
                />
              </div>
            </div>
            <DialogFooter className="sm:justify-between">
              <Button
                variant="outline"
                onClick={() => setCustomClauseDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleAddClauseToContract}
                disabled={!customClause.trim()}
              >
                <i className="ri-add-line mr-2"></i>
                Añadir al Contrato
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Footer with legal links */}
        <ChatFooter />
        {isProcessing && <ProgressBar />}
      </div>
    </div>
  );
}
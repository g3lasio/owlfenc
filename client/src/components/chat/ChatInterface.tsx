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

import { Message } from "@/mervin-v2/types/responses";

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

// Definir la interfaz para el contexto
interface ChatContext {
  datos_extraidos?: any;
  contrato_html?: string;
  currentMode?: string;
  recopilacionDatos?: {
    activa: boolean;
    servicioContrato?: boolean;
    preguntaActual?: string;
    datos?: any;
  };
  [key: string]: any; // Para mantener compatibilidad con otros campos
}

type CustomClauseFormValues = z.infer<typeof customClauseSchema>;
type CorrectionFormValues = z.infer<typeof correctionSchema>;

export default function ChatInterface() {
    const [messages, setMessages] = useState<Message[]>([]);
  const [context, setContext] = useState<ChatContext>({});
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
          <div className="flex-1 bg-muted rounded-full h-3 ">
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
  
  // Al cargar el componente, intentar recuperar datos del localStorage
  useEffect(() => {
    try {
      const savedData = localStorage.getItem('mervin_extracted_data');
      const savedHtml = localStorage.getItem('mervin_contract_html');
      
      if (savedData) {
        const extractedData = JSON.parse(savedData);
        console.log("Datos recuperados del localStorage al iniciar:", extractedData);
        
        // Solo actualizar el contexto si no hay datos_extraidos ya presentes
        setContext(prevContext => {
          if (!prevContext.datos_extraidos) {
            console.log("Restaurando datos extraídos al contexto desde localStorage");
            return {
              ...prevContext,
              datos_extraidos: extractedData,
              contrato_html: savedHtml || ''
            };
          }
          return prevContext;
        });
      }
    } catch (storageError) {
      console.error("Error recuperando datos del localStorage al iniciar:", storageError);
    }
  }, []);

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
        
        // Abrir el diálogo de corrección
        setIsCorrectionDialogOpen(true);
        setCorrectionField(messageText);
        
        const responseMessage: Message = {
          id: `assistant-${Date.now()}`,
          content: "Por favor, especifica qué información deseas corregir y proporciona el valor correcto.",
          sender: "assistant",
        };
        
        setMessages((prev) => [...prev, responseMessage]);
        setIsProcessing(false);
        return;
      }
      
      // Si es una solicitud para añadir cláusula personalizada
      if (isCustomClause) {
        // Eliminar indicador de escritura
        setMessages((prev) => prev.filter((m) => !m.isTyping));
        
        // Mostrar el diálogo de cláusula personalizada
        setShowCustomClauseForm(true);
        
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
      


      // Verificar si tenemos datos de contrato y estamos en modo recopilación
      if (context.datos_extraidos && context.recopilacionDatos?.activa && context.recopilacionDatos.servicioContrato) {
        // Importar servicio de preguntas
        const { contractQuestionService } = await import("../../lib/contractQuestionService");
        
        console.log("Usando servicio de preguntas local para procesar:", messageText);
        console.log("Contexto actual:", context);
        
        // Usar el servicio de contrato para procesar la respuesta localmente
        const campoActual = context.recopilacionDatos.preguntaActual;
        const datosActuales = context.recopilacionDatos.datos || context.datos_extraidos;
        
        // Actualizar los datos con la respuesta utilizando el servicio especializado
        const datosActualizados = contractQuestionService.actualizarDatos(
          datosActuales, 
          campoActual || "", 
          messageText
        );
        
        // Obtener la siguiente pregunta basada en los datos actualizados
        const proximaPregunta = contractQuestionService.obtenerProximaPregunta(datosActualizados);
        
        // Eliminar indicador de escritura
        setMessages((prev) => prev.filter((m) => !m.isTyping));
        
        // Si ya no hay más preguntas, mostrar el resumen
        if (!proximaPregunta || contractQuestionService.datosCompletos(datosActualizados)) {
          // Generar resumen con el servicio especializado
          const resumen = contractQuestionService.generarResumen(datosActualizados);
          
          const botMessage: Message = {
            id: `bot-${Date.now()}`,
            content: `¡Perfecto! Ya tengo toda la información necesaria:\n\n${resumen}\n\n¿Quieres que genere el contrato ahora, o prefieres hacer algún ajuste?`,
            sender: "assistant",
          };
          
          setMessages((prev) => [...prev, botMessage]);
          
          // Actualizar contexto
          setContext((prev) => ({
            ...prev,
            datos_extraidos: datosActualizados,
            recopilacionDatos: {
              activa: false
            }
          }));
        } else {
          // Continuar con la siguiente pregunta
          const botMessage: Message = {
            id: `bot-${Date.now()}`,
            content: proximaPregunta.texto + (proximaPregunta.opciones ? `\nOpciones: ${proximaPregunta.opciones.join(', ')}` : ''),
            sender: "assistant",
          };
          
          setMessages((prev) => [...prev, botMessage]);
          
          // Actualizar contexto
          setContext((prev) => ({
            ...prev,
            datos_extraidos: datosActualizados,
            recopilacionDatos: {
              activa: true,
              servicioContrato: true,
              preguntaActual: proximaPregunta.campo,
              datos: datosActualizados
            }
          }));
        }
      } else {
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
          try {
            // Show processing message
            const processingMessage: Message = {
              id: `processing-${Date.now()}`,
              content: "Generando contrato con la información recopilada...",
              sender: "assistant",
            };
            
            setMessages((prev) => [...prev, processingMessage]);
            
            // Generate contract using existing data
            const result = await generateContract(response.context.datos_extraidos);
            
            if (result.success && result.html) {
              // Update context with contract HTML
              setContext((prev) => ({
                ...prev,
                contrato_html: result.html
              }));
              
              // Show the generated contract
              const successMessage: Message = {
                id: `success-${Date.now()}`,
                content: "¡He generado el contrato basado en la información proporcionada!",
                sender: "assistant",
              };
              
              const templateMessage: Message = {
                id: `template-${Date.now()}`,
                content: "Aquí está tu contrato:",
                sender: "assistant",
                template: {
                  type: "contract",
                  html: result.html
                }
              };
              
              setMessages((prev) => 
                prev.filter(m => m.id !== processingMessage.id)
                  .concat([successMessage, templateMessage])
              );
            } else {
              throw new Error("No se pudo generar el contrato");
            }
          } catch (error) {
            console.error("Error generando contrato:", error);
            
            // Show error message
            const errorMessage: Message = {
              id: `error-${Date.now()}`,
              content: "Lo siento, ocurrió un error al generar el contrato. Por favor, intenta de nuevo.",
              sender: "assistant",
            };
            
            setMessages((prev) => 
              prev.filter(m => m.id !== `processing-${Date.now()}`)
                .concat([errorMessage])
            );
          }
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
            
            // Guardar datos en localStorage para persistencia
            if (response.context.datos_extraidos) {
              try {
                localStorage.setItem('mervin_extracted_data', JSON.stringify(response.context.datos_extraidos));
                if (response.template.html) {
                  localStorage.setItem('mervin_contract_html', response.template.html);
                }
                console.log("Datos guardados en localStorage:", response.context.datos_extraidos);
              } catch (storageError) {
                console.error("Error guardando datos en localStorage:", storageError);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("Error processing message:", error);
      
      // Remove typing indicator
      setMessages((prev) => prev.filter((m) => !m.isTyping));
      
      // Add error message
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        content: "Lo siento, ha ocurrido un error procesando tu mensaje. Por favor, inténtalo de nuevo.",
        sender: "assistant",
      };
      
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  };

  // Resto del código...
}
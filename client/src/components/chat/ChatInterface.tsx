import { useRef, useEffect, useState } from "react";
import ChatMessage from "./ChatMessage";
import ChatInput from "./ChatInput";
import ChatFooter from "./ChatFooter";
import TypingIndicator from "./TypingIndicator";
import EstimatePreview from "../templates/EstimatePreview";
import ContractPreview from "../templates/ContractPreview";
import ManualEstimateForm from "../estimates/ManualEstimateForm";
import { AnalysisEffect } from "../effects/AnalysisEffect";
import { processChatMessage, processPDFForContract } from "@/lib/openai";
import { downloadEstimatePDF, downloadContractPDF, downloadPDF } from "@/lib/pdf";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

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
}

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

    // Add a typing indicator
    setMessages((prev) => [
      ...prev,
      { id: "typing", sender: "assistant", content: "", isTyping: true },
    ]);

    try {
      // Process the message
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
          content: "Here's a preview of your document:",
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
            "Sorry, there was an error processing your message. Please try again.",
          sender: "assistant",
        },
      ]);

      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to process your message. Please try again.",
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
  
  // Función para manejar la apertura del modal de contratos
  const handleOpenContractModal = () => {
    setIsContractModalOpen(true);
    setSelectedFile(null);
  };
  
  // Función para manejar el cambio de archivo seleccionado
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
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
      // Mostrar mensaje de procesamiento
      const processingMessage: Message = {
        id: `processing-${Date.now()}`,
        content: "Estoy procesando tu PDF y extrayendo la información con tecnología OCR de Mistral AI...",
        sender: "assistant",
      };
      
      setMessages((prev) => [...prev, processingMessage]);
      
      // Usar la nueva función para procesar el PDF
      const result = await processPDFForContract(selectedFile);
      
      // Cerrar el modal
      setIsContractModalOpen(false);
      
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
    };
    
    setMessages((prev) => [...prev, botMessage]);
  };

  return (
    <div className="relative flex flex-col h-full chat-outer-container">
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
              onAttachmentClick={handleOpenContractModal}
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
        
        {/* Footer with legal links */}
        <ChatFooter />
        {isProcessing && <ProgressBar />}
      </div>
    </div>
  );
}
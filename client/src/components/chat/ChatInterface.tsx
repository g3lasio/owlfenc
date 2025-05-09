import { useRef, useEffect, useState } from "react";
import ChatMessage from "./ChatMessage";
import ChatInput from "./ChatInput";
import ChatFooter from "./ChatFooter";
import TypingIndicator from "./TypingIndicator";
import EstimatePreview from "../templates/EstimatePreview";
import ContractPreview from "../templates/ContractPreview";
import ManualEstimateForm from "../estimates/ManualEstimateForm";
import { processChatMessage } from "@/lib/openai";
import { downloadEstimatePDF, downloadContractPDF } from "@/lib/pdf";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

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
      const response = await processChatMessage("START_CHAT", {
        isInitialMessage: true,
      });
      if (response.message) {
        setMessages([
          {
            id: "welcome",
            content: response.message,
            sender: "assistant",
            options: response.options,
          },
        ]);
        setIsChatActive(true);
      }
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
    handleSendMessage(option, option);
  };

  const handleDownloadPDF = async (
    html: string,
    type: "estimate" | "contract",
  ) => {
    try {
      if (type === "estimate") {
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
                          <i className="ri-download-line mr-1"></i> Download PDF
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditDetails(message.template!.type)}
                        >
                          <i className="ri-edit-line mr-1"></i> Edit Details
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEmailClient(message.template!.type)}
                        >
                          <i className="ri-mail-send-line mr-1"></i> Email to Client
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
          <ChatInput onSendMessage={handleSendMessage} isDisabled={isProcessing} />
        )}
        {/* Footer with legal links */}
        <ChatFooter />
        {isProcessing && <ProgressBar />}
      </div>
    </div>
  );
}
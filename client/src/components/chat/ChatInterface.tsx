import { useRef, useEffect, useState } from "react";
import ChatMessage from "./ChatMessage";
import ChatInput from "./ChatInput";
import TypingIndicator from "./TypingIndicator";
import EstimatePreview from "../templates/EstimatePreview";
import ContractPreview from "../templates/ContractPreview";
import { processChatMessage } from "@/lib/openai";
import { downloadEstimatePDF, downloadContractPDF } from "@/lib/pdf";
import { Button } from "@/components/ui/button";
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

  // Initial bot message
  useEffect(() => {
    const initializeChat = async () => {
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
        }
      } catch (error) {
        console.error("Error initializing chat:", error);
      }
    };

    initializeChat();
  }, []);

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
      </div>

      {/* Chat Input */}
      <ChatInput onSendMessage={handleSendMessage} isDisabled={isProcessing} />
      {isProcessing && <ProgressBar />}
    </div>
    </div>
  );
}

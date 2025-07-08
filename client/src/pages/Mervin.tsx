import React, { useState, useRef, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Client } from "@/lib/clientFirebase";
import { useAuth } from "@/contexts/AuthContext";

import {
  getClients as getFirebaseClients,
  saveClient,
} from "@/lib/clientFirebase";
import {
  Send,
  Paperclip,
  FileSpreadsheet,
  ClipboardList,
  ClipboardCheck,
  Building,
  BarChart4,
} from "lucide-react";

// Tipos para los mensajes
type MessageSender = "user" | "assistant";
type MessageState = "analyzing" | "thinking" | "none";

type Message = {
  id: string;
  content: string;
  sender: MessageSender;
  state?: MessageState;
  action?: string;
  clients?: Client[]; // ✅ new field
};

type EstimateStep1ChatFlowStep =
  | "select-client"
  | "awaiting-client-choice"
  | "enter-new-client"
  | "client-added"
  | "awaiting-project-description"
  | "awaiting-project-items"
  | null;

// Botones de acción principales con iconos
const actionButtons = [
  {
    id: "estimates",
    text: "Generate Estimates",
    action: "estimates",
    icon: <FileSpreadsheet className="h-5 w-5" />,
  },
  {
    id: "contracts",
    text: "Generate Contracts",
    action: "contracts",
    icon: <ClipboardList className="h-5 w-5" />,
  },
  {
    id: "permits",
    text: "Permit Advisor",
    action: "permits",
    icon: <ClipboardCheck className="h-5 w-5" />,
  },
  {
    id: "properties",
    text: "Verify Ownership",
    action: "properties",
    icon: <Building className="h-5 w-5" />,
  },
  {
    id: "analytics",
    text: "Payment Tracker",
    action: "analytics",
    icon: <BarChart4 className="h-5 w-5" />,
  },
];

export default function Mervin() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [caseType, setCaseType] = useState<"Estimates" | "Contract" | "">("");
  const { toast } = useToast();
  const [chatFlowStep, setChatFlowStep] =
    useState<EstimateStep1ChatFlowStep>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const { currentUser } = useAuth();

  // Inicializar con mensaje de bienvenida
  useEffect(() => {
    const welcomeMessage: Message = {
      id: "welcome",
      content:
        "¡Hola! Soy Mervin, tu asistente virtual especializado en proyectos de construcción y cercas. Puedo ayudarte con las siguientes funciones:",
      sender: "assistant",
      action: "menu",
    };

    setMessages([welcomeMessage]);
  }, []);

  // Manejar envío de mensajes
  // const handleSendMessage = () => {
  //   if (inputValue.trim() === "" || isLoading) return;

  //   // Agregar mensaje del usuario
  //   const userMessage: Message = {
  //     id: `user-${Date.now()}`,
  //     content: inputValue,
  //     sender: "user",
  //   };

  //   setMessages((prev) => [...prev, userMessage]);
  //   setInputValue("");
  //   setIsLoading(true);

  //   // Simular respuesta
  //   setTimeout(() => {
  //     const assistantMessage: Message = {
  //       id: `assistant-${Date.now()}`,
  //       content:
  //         "Estoy aquí para ayudarte. ¿Te gustaría generar un contrato, verificar una propiedad, consultar permisos, gestionar clientes o revisar facturación?",
  //       sender: "assistant",
  //     };

  //     setMessages((prev) => [...prev, assistantMessage]);
  //     setIsLoading(false);

  //     // Desplazar al final
  //     setTimeout(() => {
  //       messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  //     }, 100);
  //   }, 1500);
  // };

  const handleSendMessage = () => {
    if (inputValue.trim() === "" || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      content: inputValue,
      sender: "user",
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(false);

    // Continue based on estimate flow
    if (caseType === "Estimates") {
      handleEstimateFlow(inputValue.trim().toLowerCase());
      setInputValue("");
      return;
    }

    // Default flow
    setInputValue("");
    setIsLoading(true);
    // Simular respuesta
    setTimeout(() => {
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        content:
          "Estoy aquí para ayudarte. ¿Te gustaría generar un contrato, verificar una propiedad, consultar permisos, gestionar clientes o revisar facturación?",
        sender: "assistant",
      };

      // Desplazar al final
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }, 1500);
  };
  const handleClientSelect = (client: Client | null) => {
    if (client) {
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          content: `✅ Cliente "${client.name}" seleccionado. Continuando con la estimación...`,
          sender: "assistant",
        },
      ]);
      setChatFlowStep("client-added");
      setChatFlowStep("awaiting-project-description");

      const askDescriptionMessage: Message = {
        id: `assistant-${Date.now()}`,
        content: "Por favor, proporciona una descripción del proyecto.",
        sender: "assistant",
      };

      setMessages((prev) => [...prev, askDescriptionMessage]);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
      // setEstimate((prev) => ({ ...prev, client }));
    } else {
      // Handle new client entry
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          content:
            "Por favor comparte los detalles del nuevo cliente en el siguiente formato:\n\nNombre, Email, Teléfono, Dirección, Ciudad, Estado, Código Postal",
          sender: "assistant",
        },
      ]);
      setChatFlowStep("enter-new-client");
    }

    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  // Manejar selección de acción
  const handleAction = (action: string) => {
    setIsLoading(true);
    const thinkingMessage: Message = {
      id: `thinking-${Date.now()}`,
      content: "Analizando datos...",
      sender: "assistant",
      state: "analyzing",
    };
    setMessages((prev) => [...prev, thinkingMessage]);
    // Simular respuesta
    setTimeout(() => {
      // Eliminar mensaje de pensando
      setMessages((prev) => prev.filter((m) => m.id !== thinkingMessage.id));

      // Determinar respuesta según acción
      let response = "";
      switch (action) {
        case "estimates":
          response =
            "Vous pouvez générer des estimations précises pour vos projets en saisissant simplement quelques détails de base tels que les informations sur le client, la description du projet et l'inventaire.";
          break;
        case "contracts":
          response =
            "Puedo ayudarte a generar un contrato profesional y legal. ¿Te gustaría crear un nuevo contrato desde cero, usar una plantilla existente o modificar un contrato anterior?";
          break;
        case "permits":
          response =
            "Para ayudarte con información sobre permisos y regulaciones, necesito saber la ubicación exacta, tipo de cerca que planeas instalar y si la propiedad está en una zona con restricciones.";
          break;
        case "properties":
          response =
            "Para verificar los detalles de una propiedad, necesito la dirección completa del inmueble. Esto me permitirá confirmar al propietario actual y verificar los límites de la propiedad.";
          break;
        case "analytics":
          response =
            "Puedo proporcionar análisis detallados sobre tendencias de costos de materiales, comparativas de proyectos anteriores y métricas de rentabilidad por tipo de proyecto.";
          break;
        default:
          response = "¿En qué puedo ayudarte hoy?";
      }

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        content: response,
        sender: "assistant",
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setIsLoading(false);

      // Desplazar al final
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }, 1500);
    if (action === "estimates") {
      setCaseType("Estimates");
      setChatFlowStep("select-client");

      // Load clients
      getFirebaseClients().then((clientList) => {
        setClients(clientList);

        // Delay sending the assistant message by 3 seconds (3000 ms)
        setTimeout(() => {
          const assistantMessage: Message = {
            id: `assistant-${Date.now()}`,
            content: "Selecciona un cliente existente o crea uno nuevo:",
            sender: "assistant",
            clients: clientList,
          };

          setMessages((prev) => [...prev, assistantMessage]);
          setChatFlowStep("awaiting-client-choice");
          setIsLoading(false);

          setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
          }, 100);
        }, 3000);
      });

      return; // Prevent default simulated reply
    }

    // Desplazar al final
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };
  const handleEstimateFlow = async (userInput: string) => {
    if (chatFlowStep === "awaiting-client-choice") {
      if (userInput === "nuevo cliente") {
        setChatFlowStep("enter-new-client");
        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            content:
              "Por favor comparte los detalles del nuevo cliente en el siguiente formato:\n\nNombre, Email, Teléfono, Dirección, Ciudad, Estado, Código Postal",
            sender: "assistant",
          },
        ]);
      } else {
        // Try to find client by name
        const client = clients.find((c) =>
          c.name.toLowerCase().includes(userInput),
        );

        if (client) {
          setMessages((prev) => [
            ...prev,
            {
              id: `assistant-${Date.now()}`,
              content: `Cliente "${client.name}" seleccionado. Procediendo al siguiente paso.`,
              sender: "assistant",
            },
          ]);
          setChatFlowStep("client-added");
          // Save selected client to estimate context
          // setEstimate((prev) => ({ ...prev, client }));
        } else {
          setMessages((prev) => [
            ...prev,
            {
              id: `assistant-${Date.now()}`,
              content:
                "No se encontró un cliente con ese nombre. Intenta de nuevo o escribe 'nuevo cliente'.",
              sender: "assistant",
            },
          ]);
        }
      }
    } else if (chatFlowStep === "enter-new-client") {
      const parts = userInput.split(",");
      if (parts.length < 3) {
        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            content:
              "Formato incorrecto. Asegúrate de incluir: Nombre, Email, Teléfono, Dirección, Ciudad, Estado, Código Postal.",
            sender: "assistant",
          },
        ]);
        return;
      }

      const [name, email, phone, address, city, state, zipCode] = parts.map(
        (p) => p.trim(),
      );

      try {
        const clientData = {
          clientId: `client_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
          userId: currentUser.uid,
          name,
          email,
          phone,
          mobilePhone: "",
          address,
          city,
          state,
          zipCode,
          notes: "",
          source: "Manual - Estimates",
          classification: "cliente",
          tags: [],
        };

        const savedClient = await saveClient(clientData);

        const clientWithId: Client = {
          id: savedClient.id,
          ...clientData,
          createdAt: savedClient.createdAt || new Date(),
          updatedAt: savedClient.updatedAt || new Date(),
        };

        setClients((prev) => [clientWithId, ...prev]);

        // Attach to estimate state
        // setEstimate((prev) => ({ ...prev, client: clientWithId }));

        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            content: `✅ Cliente "${name}" creado y asignado con éxito.`,
            sender: "assistant",
          },
        ]);
        setChatFlowStep("client-added");

        toast({
          title: "✅ Cliente Creado Exitosamente",
          description: `${name} ha sido guardado y seleccionado para este estimado.`,
          duration: 4000,
        });
      } catch (error) {
        console.error("❌ Error creating client:", error);
        toast({
          title: "Error al Crear Cliente",
          description:
            error instanceof Error
              ? error.message
              : "No se pudo crear el cliente. Verifica tu conexión.",
          variant: "destructive",
          duration: 6000,
        });

        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            content:
              "Ocurrió un error al guardar el cliente. Por favor intenta nuevamente.",
            sender: "assistant",
          },
        ]);
      }
    }
  };

  // Manejar tecla Enter
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full  bg-black text-white ">
      {/* Contenedor de mensajes (scrollable) */}
      <div className="flex-1  pb-24">
        <div className="p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`max-w-[85%] rounded-lg p-3 ${
                message.sender === "assistant"
                  ? "bg-gray-900 text-white mr-auto"
                  : "bg-blue-900 text-white ml-auto"
              }`}
            >
              {/* Avatar y nombre para mensajes de Mervin */}
              {message.sender === "assistant" && (
                <div className="flex items-center mb-2">
                  <div className="w-8 h-8 rounded-full bg-cyan-900/30 flex items-center justify-center mr-2">
                    <img
                      src="https://i.postimg.cc/W4nKDvTL/logo-mervin.png"
                      alt="Mervin AI"
                      className="w-6 h-6"
                    />
                  </div>
                  <span className="text-cyan-400 font-semibold">Mervin AI</span>

                  {/* Estado de análisis */}
                  {message.state === "analyzing" && (
                    <div className="ml-2 text-xs text-blue-400 flex items-center">
                      <span>Analizando datos...</span>
                    </div>
                  )}
                </div>
              )}

              {/* Nombre para mensajes del usuario */}
              {message.sender === "user" && (
                <div className="text-right mb-1">
                  <span className="text-blue-400 font-semibold">You</span>
                </div>
              )}

              {message.clients && message.clients.length > 0 && (
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {message.clients.map((client) => (
                    <button
                      key={client.id}
                      onClick={() => handleClientSelect(client)}
                      className="bg-cyan-800 hover:bg-cyan-700 text-white px-3 py-2 rounded text-sm text-left"
                    >
                      <div className="font-semibold">{client.name}</div>
                      <div className="text-xs opacity-80">
                        {client.email || "Sin email"}
                      </div>
                    </button>
                  ))}

                  <button
                    onClick={() => handleClientSelect(null)}
                    className="bg-gray-800 hover:bg-gray-700 text-white px-3 py-2 rounded text-sm text-center col-span-2"
                  >
                    ➕ Nuevo Cliente
                  </button>
                </div>
              )}

              {/* Contenido del mensaje */}
              <div className="whitespace-pre-wrap">{message.content}</div>

              {/* Botones de acción - solo en el mensaje inicial o cuando se solicita menú */}
              {message.action === "menu" && (
                <div className="grid grid-cols-3 gap-2 mt-4">
                  {actionButtons.map((button) => (
                    <button
                      key={button.id}
                      onClick={() => handleAction(button.action)}
                      className="bg-cyan-900/30 hover:bg-cyan-800/50 text-cyan-400 rounded p-2 text-sm font-medium transition-colors duration-200 flex flex-col items-center justify-center"
                    >
                      <div className="mb-1 flex items-center justify-center w-6 h-6">
                        {button.icon}
                      </div>
                      {button.text}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* Mensaje de carga */}
          {isLoading && (
            <div className="max-w-[85%] rounded-lg p-3 bg-gray-900 mr-auto">
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-full bg-cyan-900/30 flex items-center justify-center mr-2">
                  <img
                    src="https://i.postimg.cc/W4nKDvTL/logo-mervin.png"
                    alt="Mervin AI"
                    className="w-6 h-6"
                  />
                </div>
                <span className="text-cyan-400">Procesando</span>
                <div className="ml-1 flex">
                  <span className="animate-pulse text-cyan-400">.</span>
                  <span className="animate-pulse text-cyan-400 delay-200">
                    .
                  </span>
                  <span className="animate-pulse text-cyan-400 delay-500">
                    .
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Elemento para scroll automático */}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Área de input FIJA en la parte inferior, fuera del scroll */}
      <div className="fixed bottom-8 left-0 right-0 p-3 bg-black border-t border-cyan-900/30">
        <div className="flex gap-2 max-w-screen-lg mx-auto">
          <Button
            variant="outline"
            size="icon"
            className="bg-gray-800 text-cyan-500 border-cyan-900/50"
          >
            <Paperclip className="h-4 w-4" />
          </Button>

          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribe tu mensaje..."
            className="flex-1 bg-gray-800 border border-cyan-900/50 rounded-full px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
            disabled={isLoading}
          />

          <Button
            variant="default"
            className="rounded-full bg-cyan-600 hover:bg-cyan-700"
            onClick={handleSendMessage}
            disabled={inputValue.trim() === "" || isLoading}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

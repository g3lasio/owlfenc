import React, { useState, useRef, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Client } from "@/lib/clientFirebase";
import { useAuth } from "@/contexts/AuthContext";
import { MaterialInventoryService } from "../../src/services/materialInventoryService";
import { db } from "@/lib/firebase";
import { useProfile } from "@/hooks/use-profile";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  shareOrDownloadPdf,
  getSharingCapabilities,
} from "@/utils/mobileSharing";

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
  Edit3,
  Trash2,
  Plus,
  Minus,
  Check,
  X,
  Search,
  Zap,
  Brain,
  Wrench,
  DollarSign,
  ShoppingCart,
} from "lucide-react";
import axios from "axios";

// Tipos para los mensajes
type MessageSender = "user" | "assistant";
type MessageState = "analyzing" | "thinking" | "none";

type Message = {
  id: string;
  content: string;
  sender: MessageSender;
  state?: MessageState;
  action?: string;
  clients?: Client[]; // for searchable + scrollable UI
  materialList?: Material[]; // ✅ NEW - show inventory inside chat like clients
  selectedMaterials?: { material: Material; quantity: number }[]; // ✅ NEW - confirmed selections
};

type EstimateStep1ChatFlowStep =
  | "select-client"
  | "awaiting-client-choice"
  | "enter-new-client"
  | "client-added"
  | "awaiting-project-description"
  | "awaiting-deepsearch-choice"
  | "deepsearch-processing"
  | "deepsearch-results"
  | "select-inventory"
  | "awaiting-new-material"
  | "awaiting-discount"
  | "awaiting-tax"
  | null;

type DeepSearchOption = "materials-labor" | "materials-only" | "labor-only";

type DeepSearchRecommendation = {
  materials: {
    name: string;
    description: string;
    quantity: number;
    unit: string;
    estimatedPrice: number;
    category: string;
    reason: string;
  }[];
  laborCosts: {
    task: string;
    description: string;
    estimatedHours: number;
    hourlyRate: number;
    totalCost: number;
    category: string;
  }[];
  totalMaterialCost: number;
  totalLaborCost: number;
  totalProjectCost: number;
  recommendations: string[];
};

interface Material {
  id: string;
  name: string;
  description: string;
  price: number;
  unit: string;
  category: string;
}
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
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [inventoryItems, setInventoryItems] = useState<
    { material: Material; quantity: number }[]
  >([]);

  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [caseType, setCaseType] = useState<"Estimates" | "Contract" | "">("");
  const { toast } = useToast();
  const [projectDescription, setProjectDescription] = useState<string>("");
  const [tax, setTax] = useState<{
    type: "manual" | "percentage";
    amount: number;
  }>({
    type: "manual",
    amount: 0,
  });
  const [discount, setDiscount] = useState<{
    type: "manual" | "percentage";
    amount: number;
  }>({
    type: "manual",
    amount: 0,
  });

  const [chatFlowStep, setChatFlowStep] =
    useState<EstimateStep1ChatFlowStep>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const { currentUser } = useAuth();
  const [isLoadingMaterials, setIsLoadingMaterials] = useState(true);

  // DeepSearch AI states
  const [deepSearchOption, setDeepSearchOption] =
    useState<DeepSearchOption | null>(null);
  const [deepSearchRecommendation, setDeepSearchRecommendation] =
    useState<DeepSearchRecommendation | null>(null);
  const [isDeepSearchProcessing, setIsDeepSearchProcessing] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingMaterials, setEditingMaterials] = useState<
    DeepSearchRecommendation["materials"]
  >([]);
  const [editingLaborCosts, setEditingLaborCosts] = useState<
    DeepSearchRecommendation["laborCosts"]
  >([]);
  const [canEditClient, setCanEditClient] = useState(false);
  const [canEditMaterials, setCanEditMaterials] = useState(false);

  const loadMaterials = async (): Promise<Material[]> => {
    if (!currentUser) return [];

    const { collection, query, where, getDocs } = await import(
      "firebase/firestore"
    );
    try {
      setIsLoadingMaterials(true);
      const materialsRef = collection(db, "materials");
      const q = query(materialsRef, where("userId", "==", currentUser.uid));
      const querySnapshot = await getDocs(q);

      const materialsData: Material[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data() as Omit<Material, "id">;

        let normalizedPrice = typeof data.price === "number" ? data.price : 0;
        if (normalizedPrice > 1000) {
          normalizedPrice = Number((normalizedPrice / 100).toFixed(2));
          console.log(
            `💰 NORMALIZED PRICE: ${data.name} - ${data.price} → ${normalizedPrice}`,
          );
        }

        const material: Material = {
          id: doc.id,
          ...data,
          price: normalizedPrice,
        };
        materialsData.push(material);
      });

      setMaterials(materialsData);
      return materialsData;
    } catch (error) {
      console.error("Error loading materials from Firebase:", error);
      toast({
        title: "Error",
        description: "Could not load materials",
        variant: "destructive",
      });
      return [];
    } finally {
      setIsLoadingMaterials(false);
    }
  };
  const { profile, isLoading: isProfileLoading } = useProfile();

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
  const [visibleCount, setVisibleCount] = useState(6);
  const [materialSearchTerm, setMaterialSearchTerm] = useState("");
  const [shoppingCart, setShoppingCart] = useState<
    { material: Material; quantity: number }[]
  >([]);
  const [showCart, setShowCart] = useState(false);

  const filteredMaterials = materials.filter((material) =>
    material.name.toLowerCase().includes(materialSearchTerm.toLowerCase()),
  );

  // Shopping cart helper functions
  const addToCart = (material: Material, quantity: number = 1) => {
    setShoppingCart((prev) => {
      const existingItem = prev.find(
        (item) => item.material.id === material.id,
      );
      if (existingItem) {
        return prev.map((item) =>
          item.material.id === material.id
            ? { ...item, quantity: item.quantity + quantity }
            : item,
        );
      }
      return [...prev, { material, quantity }];
    });
  };

  const removeFromCart = (materialId: string) => {
    setShoppingCart((prev) =>
      prev.filter((item) => item.material.id !== materialId),
    );
  };

  const updateCartQuantity = (materialId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(materialId);
      return;
    }
    setShoppingCart((prev) =>
      prev.map((item) =>
        item.material.id === materialId ? { ...item, quantity } : item,
      ),
    );
  };

  const getCartTotal = () => {
    return shoppingCart.reduce(
      (total, item) => total + item.material.price * item.quantity,
      0,
    );
  };

  const getCartItemCount = () => {
    return shoppingCart.reduce((total, item) => total + item.quantity, 0);
  };

  const addCartToInventory = () => {
    setInventoryItems((prev) => {
      const newItems = [...prev];
      shoppingCart.forEach((cartItem) => {
        const existingIndex = newItems.findIndex(
          (item) => item.material.id === cartItem.material.id,
        );
        if (existingIndex >= 0) {
          newItems[existingIndex].quantity += cartItem.quantity;
        } else {
          newItems.push(cartItem);
        }
      });
      return newItems;
    });
    setShoppingCart([]);
    setShowCart(false);
    toast({
      title: "Materiales añadidos",
      description: `Se añadieron ${getCartItemCount()} materiales al inventario.`,
    });
  };

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

  const handleSendMessage = async () => {
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
      await loadMaterials();
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
      setSelectedClient(client);
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

  // OpenAI DeepSearch AI function
  const performDeepSearchAI = async (
    option: DeepSearchOption,
    description: string,
  ): Promise<DeepSearchRecommendation> => {
    setIsDeepSearchProcessing(true);

    // Create AbortController for request cancellation
    const controller = new AbortController();

    // Set timeout for the request (3 minutes)
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 180000); // 3 minutes

    try {
      const response = await fetch("/api/deepsearch-ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          option,
          projectDescription: description,
          clientInfo: selectedClient,
        }),
        signal: controller.signal,
      });

      // Clear timeout if request completes
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      // Clear timeout in case of error
      clearTimeout(timeoutId);

      // Handle different error types
      if (error.name === "AbortError") {
        console.error("DeepSearch AI request was aborted (timeout)");
        throw new Error(
          "La solicitud excedió el tiempo límite. Por favor intenta nuevamente.",
        );
      } else if (error.code === "ECONNABORTED") {
        console.error("DeepSearch AI request was aborted");
        throw new Error(
          "La conexión fue interrumpida. Por favor intenta nuevamente.",
        );
      } else {
        console.error("Error in DeepSearch AI:", error);
        throw error;
      }
    } finally {
      setIsDeepSearchProcessing(false);
    }
  };

  // Handle DeepSearch option selection
  const handleDeepSearchOptionSelect = async (option: DeepSearchOption) => {
    setDeepSearchOption(option);
    setChatFlowStep("deepsearch-processing");

    // Show processing message
    const processingMessage: Message = {
      id: `assistant-${Date.now()}`,
      content:
        "🧠 Procesando con DeepSearch AI... Esto puede tomar unos momentos.",
      sender: "assistant",
      state: "analyzing",
    };

    setMessages((prev) => [...prev, processingMessage]);

    // Scroll to bottom after processing message
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);

    try {
      const recommendation = await performDeepSearchAI(
        option,
        projectDescription,
      );
      setDeepSearchRecommendation(recommendation);
      setEditingMaterials(recommendation.materials);
      setEditingLaborCosts(recommendation.laborCosts);

      // Remove processing message
      setMessages((prev) => prev.filter((m) => m.id !== processingMessage.id));

      // Show results
      const resultsMessage: Message = {
        id: `assistant-${Date.now()}`,
        content: generateDeepSearchResultsMessage(recommendation, option),
        sender: "assistant",
        action: "deepsearch-results",
      };

      setMessages((prev) => [...prev, resultsMessage]);
      setChatFlowStep("deepsearch-results");

      // Scroll to bottom after results message
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } catch (error) {
      console.error("DeepSearch AI Error:", error);

      // Remove processing message
      setMessages((prev) => prev.filter((m) => m.id !== processingMessage.id));

      // Show error message
      const errorMessage: Message = {
        id: `assistant-${Date.now()}`,
        content:
          "❌ Error al procesar la recomendación de DeepSearch AI. Por favor intenta nuevamente.",
        sender: "assistant",
      };

      setMessages((prev) => [...prev, errorMessage]);
      setChatFlowStep("awaiting-deepsearch-choice");

      // Scroll to bottom after error message
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  };

  // Generate DeepSearch results message
  const generateDeepSearchResultsMessage = (
    recommendation: DeepSearchRecommendation,
    option: DeepSearchOption,
  ): string => {
    let message = "✨ **Recomendación de DeepSearch AI completada**\n\n";

    if (option === "materials-only" || option === "materials-labor") {
      message += "📦 **Materiales Recomendados:**\n";
      recommendation.materials.forEach((material, index) => {
        message += `${index + 1}. ${material.name} - ${material.quantity} ${material.unit}\n`;
        message += `   Precio estimado: $${material.estimatedPrice.toFixed(2)}\n`;
        message += `   Razón: ${material.reason}\n\n`;
      });
      message += `💰 **Costo total de materiales: $${recommendation.totalMaterialCost.toFixed(2)}**\n\n`;
    }

    if (option === "labor-only" || option === "materials-labor") {
      message += "⚡ **Costos de Mano de Obra:**\n";
      recommendation.laborCosts.forEach((labor, index) => {
        message += `${index + 1}. ${labor.task} - ${labor.estimatedHours} horas\n`;
        message += `   Tarifa: $${labor.hourlyRate.toFixed(2)}/hora\n`;
        message += `   Costo total: $${labor.totalCost.toFixed(2)}\n\n`;
      });
      message += `💼 **Costo total de mano de obra: $${recommendation.totalLaborCost.toFixed(2)}**\n\n`;
    }

    message += `🎯 **Costo total del proyecto: $${recommendation.totalProjectCost.toFixed(2)}**\n\n`;

    if (recommendation.recommendations.length > 0) {
      message += "💡 **Recomendaciones adicionales:**\n";
      recommendation.recommendations.forEach((rec, index) => {
        message += `• ${rec}\n`;
      });
    }

    return message;
  };
  const taxWithPercentage = (tax: {
    type: "manual" | "percentage";
    amount: number;
  }) => {
    if (tax.type === "percentage") {
      return (getCartTotal() * tax.amount) / 100;
    }
    return tax.amount;
  };
  const discountCalculation = () => {
    if (discount.type === "percentage") {
      return (getCartTotal() * discount.amount) / 100;
    }
    return discount.amount;
  };

  const handleCreateEstimate = async () => {
    try {
      const body = {
        firebaseUserId: currentUser?.uid,
        estimateNumber: `EST-${Date.now()}`,
        // Información completa del cliente
        clientName: selectedClient?.name,
        clientEmail: selectedClient?.email,
        clientPhone: selectedClient?.phone || "",
        clientAddress: selectedClient?.address || "",
        clientInformation: selectedClient,

        // Detalles del proyecto
        projectDescription: projectDescription,
        projectType: "construction",

        // Items completos - VALORES DIRECTOS SIN CONVERSIONES
        items: shoppingCart.map((item, index) => ({
          id: item.material.id,
          materialId: item.material.id || "",
          name: item.material.name,
          description: item.material.description || "",
          quantity: item.quantity,
          unit: item.material.unit || "unit",
          unitPrice: item.material.price, // NO convertir a centavos
          price: item.material.price, // Agregar precio directo
          totalPrice: Number(item.material.price * item.quantity).toFixed(2), // NO convertir a centavos
          total: Number(item.material.price * item.quantity).toFixed(2), // Agregar total directo
          sortOrder: index,
          isOptional: false,
        })),

        // DATOS FINANCIEROS DIRECTOS - SIN CONVERSIONES A CENTAVOS
        subtotal: getCartTotal().toFixed(2),
        taxRate: tax.type === "percentage" ? tax.amount : 0, // ✅ FIXED: Return number 0, not string "0.0"
        taxAmount:
          tax.type === "percentage"
            ? taxWithPercentage(tax).toFixed(2)
            : tax.amount.toFixed(2), // ✅ FIXED: Handle both types

        // DESCUENTOS DIRECTOS - SIN CONVERSIONES
        discount: discountCalculation(),
        discountType: discount.type,
        discountValue: discountCalculation(),
        discountAmount: discountCalculation(),
        discountName: "",

        total:
          Number(getCartTotal() + taxWithPercentage(tax)) -
          discountCalculation(),

        // Display-friendly totals (mismos valores)
        displaySubtotal: Number(getCartTotal()),
        displayTax: taxWithPercentage(tax),
        displayTotal:
          Number(getCartTotal() + taxWithPercentage(tax)) -
          discountCalculation(),
        displayDiscountAmount: discountCalculation(),

        // Metadata
        status: "draft",
        type: "estimate",
        source: "mervin",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Buscar proyecto existente para el mismo cliente
      const { collection, query, where, getDocs, addDoc, updateDoc, doc } =
        await import("firebase/firestore");
      const { db } = await import("@/lib/firebase");

      const existingQuery = query(
        collection(db, "estimates"),
        //  @ts-ignore
        where("firebaseUserId", "==", currentUser.uid as string),
        where("clientName", "==", selectedClient?.name),
      );

      const estimatesRef = collection(db, "estimates");

      // Always create a new estimate, regardless of existing ones
      await addDoc(estimatesRef, body);
      // Show success message
      toast({
        title: "Estimado guardado",
        description: "El estimado ha sido guardado exitosamente.",
      });
    } catch (error) {}
  };
  const handleDownload = async (tax: {
    type: "manual" | "percentage";
    amount: number;
  }) => {
    try {
      // Validar que el perfil del contractor esté completo
      // Create payload in the exact format expected by Puppeteer service
      const payload = {
        user: currentUser
          ? [
              {
                uid: currentUser.uid,
                email: currentUser.email,
                displayName: currentUser.displayName,
              },
            ]
          : [],
        client: selectedClient || {},

        items:
          shoppingCart.map((item) => {
            return {
              id: item.material.id,
              materialId: item.material.id,
              name: item.material.name,
              description: item.material.description,
              quantity: item.quantity,
              price: item.material.price,
              unit: item.material.unit,
              total: Number(item.material.price * item.quantity).toFixed(2),
            };
          }) || [],
        projectTotalCosts: {
          subtotal: Number(getCartTotal()),
          discount: discountCalculation(),
          taxRate: tax.type === "percentage" ? tax.amount : 0,
          taxAmount: Number(taxWithPercentage(tax)), // ✅ ADD THIS - send as number
          tax: Number(taxWithPercentage(tax)), // ✅ CHANGE - send as number
          total: Number(
            (
              Number(getCartTotal()) +
              taxWithPercentage(tax) -
              discountCalculation()
            ).toFixed(2),
          ),
        },
        originalData: {
          projectDescription: projectDescription || "",
        },
        // Add contractor data from profile
        contractor: {
          name: profile?.company || "Owl Fence LLC",
          company: profile?.company || "Owl Fence LLC",
          address: profile?.address || "2901 Owens Ct, Fairfield, CA 94534 US",
          phone: profile?.phone || "(202) 549-3519",
          email: profile?.email || currentUser?.email || "info@owlfenc.com",
          website: profile?.website || "www.owlfenc.com",
          logo: profile?.logo || "",
          license: profile?.license || "CA-LICENSE-123",
        },
      };

      console.log("📤 Sending payload to PDF service:", payload);

      // Use new Puppeteer PDF service (local, no external dependency)
      const response = await axios.post(
        "/api/estimate-puppeteer-pdf",
        payload,
        {
          responseType: "blob", // Important for PDF download
        },
      );

      console.log("📨 Response received:", {
        status: response.status,
        headers: response.headers,
        dataType: typeof response.data,
        dataSize: response.data?.size || "unknown",
      });

      // Validate the blob
      if (!response.data || response.data.size === 0) {
        throw new Error("Received empty PDF data from server");
      }

      // Create blob for sharing/downloading
      const pdfBlob = new Blob([response.data], { type: "application/pdf" });
      console.log("📄 Created PDF blob:", {
        size: pdfBlob.size,
        type: pdfBlob.type,
      });

      // Generate filename with client name and timestamp
      const clientName =
        selectedClient?.name.replace(/[^a-zA-Z0-9]/g, "_") || "client";
      const timestamp = new Date().toISOString().slice(0, 10); // YYYY-MM-DD format
      const filename = `estimate-${clientName}-${timestamp}.pdf`;

      // Use mobile sharing utility for smart download/share behavior
      await shareOrDownloadPdf(pdfBlob, filename, {
        title: `Estimate for ${selectedClient?.name || "Client"}`,
        text: `Professional estimate from ${profile?.company || "your contractor"}`,
        clientName: selectedClient?.name,
        estimateNumber: `EST-${timestamp}`,
      });

      console.log("📥 PDF download/share completed successfully");

      // Get sharing capabilities for toast message
      const capabilities = getSharingCapabilities();
      const actionText =
        capabilities.isMobile && capabilities.nativeShareSupported
          ? "PDF generated and ready to share"
          : "PDF downloaded successfully";

      toast({
        title: "✅ PDF Generated",
        description: actionText,
      });

      // Mostrar mensaje de éxito en español
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          content:
            "✅ ¡PDF generado con éxito! Aquí está tu archivo de estimación listo para descargar.",
          sender: "assistant",
        },
      ]);

      // Desplazar al final
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);

      setTimeout(() => {
        setMessages([
          {
            id: "welcome",
            content:
              "¡Hola! Soy Mervin, tu asistente virtual especializado en proyectos de construcción y cercas. ¿En qué puedo ayudarte hoy?",
            sender: "assistant",
            action: "menu",
          },
        ]);
        setSelectedClient(null);
        setChatFlowStep(null);
        setCaseType("");
        setProjectDescription("");
        setShoppingCart([]);
        setInventoryItems([]);
        setDeepSearchOption(null);
        setDiscount({
          type: "manual",
          amount: 0,
        });
        setTax({
          type: "manual",
          amount: 0,
        });
        setDeepSearchRecommendation(null);
      }, 5000);
    } catch (error) {
      console.error("PDF generation error:", error);
      toast({
        title: "❌ Error",
        description: "Could not generate PDF. Please try again.",
        variant: "destructive",
      });
    }
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
          setSelectedClient(client);
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
          // @ts-ignore
          userId: currentUser.uid as string,
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
    } else if (chatFlowStep === "awaiting-project-description") {
      setProjectDescription(userInput);
      setChatFlowStep("awaiting-deepsearch-choice");

      // Ask DeepSearch AI question
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          content:
            "¿Le gustaría realizar una recomendación de DeepSearch AI (materiales + costo de mano de obra, solo materiales o solo mano de obra)?",
          sender: "assistant",
          action: "deepsearch-options",
        },
      ]);

      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } else if (chatFlowStep === "awaiting-new-material") {
      const parts = userInput.split(",");
      if (parts.length < 5) {
        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            content:
              "Formato incorrecto. Asegúrate de incluir: Nombre, Descripción, Precio, Unidad, Categoría",
            sender: "assistant",
          },
        ]);
        return;
      }

      const [name, description, priceStr, unit, category] = parts.map((p) =>
        p.trim(),
      );
      const price = parseFloat(priceStr);

      if (isNaN(price)) {
        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            content: "El precio debe ser un número válido.",
            sender: "assistant",
          },
        ]);
        return;
      }

      try {
        const { collection, addDoc } = await import("firebase/firestore");
        const materialsRef = collection(db, "materials");

        const docRef = await addDoc(materialsRef, {
          name,
          description,
          price,
          unit,
          category,
          //@ts-ignore
          userId: currentUser.uid as string,
        });

        const newMaterial: Material = {
          id: docRef.id,
          name,
          description,
          price,
          unit,
          category,
        };

        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            content: `✅ Material "${name}" agregado exitosamente.`,
            sender: "assistant",
          },
        ]);

        // 🔁 Re-load updated materials and render again as new message
        const updatedMaterials = await loadMaterials();

        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            content:
              "Material agregado. Ahora puedes seleccionar de la lista actualizada:",
            sender: "assistant",
            materialList: updatedMaterials,
          },
        ]);
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);

        setChatFlowStep("select-inventory");
      } catch (error) {
        console.error("❌ Error al guardar material:", error);
        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            content:
              "Ocurrió un error al guardar el material. Intenta nuevamente.",
            sender: "assistant",
          },
        ]);
      }

      return;
    } else if (chatFlowStep === "awaiting-discount") {
      const value = userInput.trim();
      let discount: string | null = null;

      if (value.toLowerCase() !== "skip") {
        const isPercentage = value.endsWith("%");
        const numeric = isPercentage ? value.slice(0, -1) : value;

        if (isNaN(Number(numeric))) {
          setMessages((prev) => [
            ...prev,
            {
              id: `assistant-${Date.now()}`,
              content:
                "Formato inválido para el descuento. Usa un número o porcentaje (ej: `100` o `10%`).",
              sender: "assistant",
            },
          ]);
          return;
        }
        if (isPercentage) {
          setDiscount({
            type: "percentage",
            amount: parseFloat(numeric),
          });
          toast({
            title: "Descuento Aplicado",
            description: `Descuento del ${parseFloat(numeric)}% aplicado.`,
          });
        } else {
          setDiscount({
            type: "manual",
            amount: parseFloat(numeric),
          });
          toast({
            title: "Descuento Aplicado",
            description: `Descuento de $${parseFloat(numeric)} aplicado.`,
          });
        }
        discount = isPercentage
          ? `${parseFloat(numeric)}%`
          : `${parseFloat(numeric)}`;
      }

      // Ask for tax
      setChatFlowStep("awaiting-tax");
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          content:
            "¿Deseas aplicar algún **impuesto**? Ingresa un valor numérico o porcentaje (ej: `50` o `13%`). Escribe `skip` para omitir.",
          sender: "assistant",
        },
      ]);
      setTimeout(
        () =>
          messagesEndRef.current?.scrollIntoView({
            behavior: "smooth",
          }),
        100,
      );
    } else if (chatFlowStep === "awaiting-tax") {
      const value = userInput.trim();
      let tax: string | null = null;
      let currentTax: { type: "manual" | "percentage"; amount: number } = {
        type: "manual",
        amount: 0,
      };
      if (value.toLowerCase() !== "skip") {
        const isPercentage = value.endsWith("%");
        const numeric = isPercentage ? value.slice(0, -1) : value;

        if (isNaN(Number(numeric))) {
          setMessages((prev) => [
            ...prev,
            {
              id: `assistant-${Date.now()}`,
              content:
                "Formato inválido para el impuesto. Usa un número o porcentaje (ej: `50` o `13%`).",
              sender: "assistant",
            },
          ]);
          return;
        }

        if (isPercentage) {
          currentTax = {
            type: "percentage",
            amount: parseFloat(numeric),
          };
          setTax(currentTax);
          toast({
            title: "Impuesto Aplicado",
            description: `Impuesto del ${parseFloat(numeric)}% aplicado.`,
          });
        } else {
          toast({
            title: "Impuesto Aplicado",
            description: `Impuesto de $${parseFloat(numeric)} aplicado.`,
          });

          currentTax = {
            type: "manual",
            amount: parseFloat(numeric),
          };

          setTax(currentTax);
        }
        tax = isPercentage
          ? `${parseFloat(numeric)}%`
          : `${parseFloat(numeric)}`;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          content: `✅ Gracias. El estimado será generado con los valores ingresados.`,
          sender: "assistant",
        },
      ]);
      setTimeout(
        () =>
          messagesEndRef.current?.scrollIntoView({
            behavior: "smooth",
          }),
        100,
      );
      await handleCreateEstimate();
      await handleDownload(currentTax);

      setChatFlowStep(null); // reset
    } else {
    }
  };

  // Manejar tecla Enter
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  console.log(currentUser);
  console.log("clienters");
  console.log(selectedClient);
  console.log(selectedClient);
  console.log(selectedClient);
  return (
    <div className="flex flex-col h-full  bg-black text-white ">
      {/* Edit Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] bg-gray-900 border-cyan-900/50 flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="text-cyan-400">
              Editar Recomendaciones de DeepSearch AI
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-6 pr-2">
            {/* Materials Section */}
            {(deepSearchOption === "materials-only" ||
              deepSearchOption === "materials-labor") && (
              <div>
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                  <Wrench className="w-5 h-5 text-blue-400" />
                  <span>Materiales</span>
                </h3>

                <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                  {editingMaterials.map((material, index) => (
                    <div
                      key={index}
                      className="bg-gray-800 rounded-lg p-4 space-y-3"
                    >
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-1">
                            Nombre
                          </label>
                          <input
                            type="text"
                            value={material.name}
                            onChange={(e) => {
                              const updated = [...editingMaterials];
                              updated[index].name = e.target.value;
                              setEditingMaterials(updated);
                            }}
                            className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 focus:border-cyan-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-1">
                            Cantidad
                          </label>
                          <input
                            type="number"
                            value={material.quantity}
                            onChange={(e) => {
                              const updated = [...editingMaterials];
                              updated[index].quantity =
                                parseFloat(e.target.value) || 0;
                              setEditingMaterials(updated);
                            }}
                            className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 focus:border-cyan-500 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-1">
                            Unidad
                          </label>
                          <input
                            type="text"
                            value={material.unit}
                            onChange={(e) => {
                              const updated = [...editingMaterials];
                              updated[index].unit = e.target.value;
                              setEditingMaterials(updated);
                            }}
                            className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 focus:border-cyan-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-1">
                            Precio Estimado
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={material.estimatedPrice}
                            onChange={(e) => {
                              const updated = [...editingMaterials];
                              updated[index].estimatedPrice =
                                parseFloat(e.target.value) || 0;
                              setEditingMaterials(updated);
                            }}
                            className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 focus:border-cyan-500 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                          Descripción
                        </label>
                        <textarea
                          value={material.description}
                          onChange={(e) => {
                            const updated = [...editingMaterials];
                            updated[index].description = e.target.value;
                            setEditingMaterials(updated);
                          }}
                          className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 focus:border-cyan-500 focus:outline-none"
                          rows={2}
                        />
                      </div>

                      <div className="flex justify-end">
                        <button
                          onClick={() => {
                            const updated = editingMaterials.filter(
                              (_, i) => i !== index,
                            );
                            setEditingMaterials(updated);
                          }}
                          className="bg-red-900/30 hover:bg-red-800/50 text-red-400 px-3 py-1 rounded text-sm flex items-center space-x-1"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>Eliminar</span>
                        </button>
                      </div>
                    </div>
                  ))}

                  <button
                    onClick={() => {
                      setEditingMaterials([
                        ...editingMaterials,
                        {
                          name: "",
                          description: "",
                          quantity: 1,
                          unit: "",
                          estimatedPrice: 0,
                          category: "",
                          reason: "",
                        },
                      ]);
                    }}
                    className="bg-blue-900/30 hover:bg-blue-800/50 text-blue-400 px-4 py-2 rounded flex items-center space-x-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Agregar Material</span>
                  </button>
                </div>
              </div>
            )}

            {/* Labor Costs Section */}
            {(deepSearchOption === "labor-only" ||
              deepSearchOption === "materials-labor") && (
              <div>
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                  <DollarSign className="w-5 h-5 text-green-400" />
                  <span>Mano de Obra</span>
                </h3>

                <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                  {editingLaborCosts.map((labor, index) => (
                    <div
                      key={index}
                      className="bg-gray-800 rounded-lg p-4 space-y-3"
                    >
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-1">
                            Tarea
                          </label>
                          <input
                            type="text"
                            value={labor.task}
                            onChange={(e) => {
                              const updated = [...editingLaborCosts];
                              updated[index].task = e.target.value;
                              setEditingLaborCosts(updated);
                            }}
                            className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 focus:border-cyan-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-1">
                            Horas Estimadas
                          </label>
                          <input
                            type="number"
                            value={labor.estimatedHours}
                            onChange={(e) => {
                              const updated = [...editingLaborCosts];
                              updated[index].estimatedHours =
                                parseFloat(e.target.value) || 0;
                              updated[index].totalCost =
                                updated[index].estimatedHours *
                                updated[index].hourlyRate;
                              setEditingLaborCosts(updated);
                            }}
                            className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 focus:border-cyan-500 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-1">
                            Tarifa por Hora
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={labor.hourlyRate}
                            onChange={(e) => {
                              const updated = [...editingLaborCosts];
                              updated[index].hourlyRate =
                                parseFloat(e.target.value) || 0;
                              updated[index].totalCost =
                                updated[index].estimatedHours *
                                updated[index].hourlyRate;
                              setEditingLaborCosts(updated);
                            }}
                            className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 focus:border-cyan-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-1">
                            Costo Total
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={labor.totalCost}
                            readOnly
                            className="w-full bg-gray-600 text-gray-300 px-3 py-2 rounded border border-gray-600 cursor-not-allowed"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                          Descripción
                        </label>
                        <textarea
                          value={labor.description}
                          onChange={(e) => {
                            const updated = [...editingLaborCosts];
                            updated[index].description = e.target.value;
                            setEditingLaborCosts(updated);
                          }}
                          className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 focus:border-cyan-500 focus:outline-none"
                          rows={2}
                        />
                      </div>

                      <div className="flex justify-end">
                        <button
                          onClick={() => {
                            const updated = editingLaborCosts.filter(
                              (_, i) => i !== index,
                            );
                            setEditingLaborCosts(updated);
                          }}
                          className="bg-red-900/30 hover:bg-red-800/50 text-red-400 px-3 py-1 rounded text-sm flex items-center space-x-1"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>Eliminar</span>
                        </button>
                      </div>
                    </div>
                  ))}

                  <button
                    onClick={() => {
                      setEditingLaborCosts([
                        ...editingLaborCosts,
                        {
                          task: "",
                          description: "",
                          estimatedHours: 0,
                          hourlyRate: 0,
                          totalCost: 0,
                          category: "",
                        },
                      ]);
                    }}
                    className="bg-green-900/30 hover:bg-green-800/50 text-green-400 px-4 py-2 rounded flex items-center space-x-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Agregar Tarea</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex-shrink-0 border-t border-gray-700 pt-4 mt-4">
            <Button
              onClick={() => setShowEditModal(false)}
              variant="outline"
              className="border-gray-600 text-gray-300 hover:bg-gray-800"
            >
              Cancelar
            </Button>
            <Button
              onClick={() => {
                // Update the recommendation with edited values
                if (deepSearchRecommendation) {
                  const updatedRecommendation: DeepSearchRecommendation = {
                    ...deepSearchRecommendation,
                    materials: editingMaterials,
                    laborCosts: editingLaborCosts,
                    totalMaterialCost: editingMaterials.reduce(
                      (sum, m) => sum + m.estimatedPrice * m.quantity,
                      0,
                    ),
                    totalLaborCost: editingLaborCosts.reduce(
                      (sum, l) => sum + l.totalCost,
                      0,
                    ),
                    totalProjectCost:
                      editingMaterials.reduce(
                        (sum, m) => sum + m.estimatedPrice * m.quantity,
                        0,
                      ) +
                      editingLaborCosts.reduce(
                        (sum, l) => sum + l.totalCost,
                        0,
                      ),
                  };

                  setDeepSearchRecommendation(updatedRecommendation);

                  // Update the last message with new results
                  setMessages((prev) => {
                    const updated = [...prev];
                    const lastMessageIndex = updated.length - 1;
                    if (
                      updated[lastMessageIndex].action === "deepsearch-results"
                    ) {
                      updated[lastMessageIndex].content =
                        generateDeepSearchResultsMessage(
                          updatedRecommendation,
                          deepSearchOption!,
                        );
                    }
                    return updated;
                  });
                }

                setShowEditModal(false);
                toast({
                  title: "Cambios guardados",
                  description:
                    "Las recomendaciones han sido actualizadas exitosamente.",
                });
              }}
              className="bg-cyan-600 hover:bg-cyan-700 text-white"
            >
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
                <div className="mt-2 space-y-3">
                  {/* 🔍 Search bar */}
                  <input
                    type="text"
                    placeholder="Buscar cliente..."
                    value={materialSearchTerm} // you can rename this to clientSearchTerm if needed
                    onChange={(e) => {
                      setMaterialSearchTerm(e.target.value); // reuse this state or separate one
                      setVisibleCount(6);
                    }}
                    className="w-full bg-gray-800 text-white px-3 py-2 rounded border border-cyan-900/50"
                  />

                  <div
                    className="max-h-42 p-6 overflow-y-auto grid grid-cols-2 gap-2 pr-2"
                    onScroll={(e) => {
                      const { scrollTop, scrollHeight, clientHeight } =
                        e.currentTarget;
                      if (scrollTop + clientHeight >= scrollHeight - 10) {
                        setVisibleCount((prev) => prev + 6);
                      }
                    }}
                  >
                    {message.clients
                      .filter((client) =>
                        client.name
                          .toLowerCase()
                          .includes(materialSearchTerm.toLowerCase()),
                      )
                      .slice(0, visibleCount)
                      .map((client) => (
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
                  </div>
                  <div className="flex justify-center">
                    <button
                      onClick={() => handleClientSelect(null)}
                      className="bg-gray-800 hover:bg-gray-700 text-white px-3 py-2 rounded text-sm text-center col-span-2"
                    >
                      ➕ Nuevo Cliente
                    </button>
                  </div>
                </div>
              )}

              {message.materialList && message.materialList.length > 0 && (
                <div className="mt-2 space-y-3">
                  {/* Shopping Cart Header */}
                  <div className="flex items-center justify-between bg-gradient-to-r from-cyan-900/30 to-blue-900/30 p-3 rounded-lg">
                    <div className="flex items-center gap-2">
                      <ShoppingCart className="w-5 h-5 text-cyan-400" />
                      <h3 className="text-cyan-400 font-semibold">
                        Catálogo de Materiales
                      </h3>
                    </div>
                    <button
                      onClick={() => setShowCart(!showCart)}
                      className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                    >
                      <ShoppingCart className="w-4 h-4" />
                      Carrito ({getCartItemCount()})
                    </button>
                  </div>

                  {/* Search bar for materials */}
                  <input
                    type="text"
                    placeholder="🔍 Buscar materiales..."
                    value={materialSearchTerm}
                    onChange={(e) => {
                      setMaterialSearchTerm(e.target.value);
                      setVisibleCount(6);
                    }}
                    className="w-full bg-gray-800 text-white px-4 py-3 rounded-lg border border-cyan-900/50 focus:border-cyan-600 focus:outline-none"
                  />

                  <div className="flex gap-4">
                    {/* Product Catalog */}
                    <div
                      className={`${showCart ? "w-2/3" : "w-full"} transition-all duration-300`}
                    >
                      <div
                        className="max-h-96 overflow-y-auto grid grid-cols-1 gap-3 pr-2"
                        onScroll={(e) => {
                          const { scrollTop, scrollHeight, clientHeight } =
                            e.currentTarget;
                          if (scrollTop + clientHeight >= scrollHeight - 10) {
                            setVisibleCount((prev) => prev + 6);
                          }
                        }}
                      >
                        {message.materialList
                          .filter((material) =>
                            material.name
                              .toLowerCase()
                              .includes(materialSearchTerm.toLowerCase()),
                          )
                          .slice(0, visibleCount)
                          .map((material) => (
                            <div
                              key={material.id}
                              className="bg-gradient-to-r from-gray-800 to-gray-900 p-4 rounded-lg border border-gray-700 hover:border-cyan-600 transition-all duration-200 hover:shadow-lg hover:shadow-cyan-500/20"
                            >
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <div className="font-semibold text-white text-lg mb-1">
                                    {material.name}
                                  </div>
                                  <div className="text-sm text-gray-300 mb-2">
                                    {material.description}
                                  </div>
                                  <div className="flex items-center gap-2 mb-3">
                                    <span className="text-cyan-400 font-bold text-lg">
                                      ${material.price}
                                    </span>
                                    <span className="text-gray-400 text-sm">
                                      por {material.unit}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="number"
                                    min={1}
                                    defaultValue={1}
                                    className="w-16 bg-gray-700 text-white px-2 py-1 rounded text-center border border-gray-600 focus:border-cyan-500 focus:outline-none"
                                    id={`qty-${material.id}`}
                                  />
                                  <button
                                    onClick={() => {
                                      const qtyInput = document.getElementById(
                                        `qty-${material.id}`,
                                      ) as HTMLInputElement;
                                      const qty = parseInt(
                                        qtyInput?.value || "1",
                                      );
                                      if (!isNaN(qty) && qty > 0) {
                                        addToCart(material, qty);
                                        qtyInput.value = "1";
                                        toast({
                                          title: "Material añadido",
                                          description: `${qty} ${material.unit} de ${material.name} añadido al carrito.`,
                                        });
                                      }
                                    }}
                                    className="bg-cyan-600 hover:bg-cyan-700 text-white px-3 py-1 rounded transition-colors flex items-center gap-1"
                                  >
                                    <Plus className="w-4 h-4" />
                                    Añadir
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>

                    {/* Shopping Cart Sidebar */}
                    {showCart && (
                      <div className="w-1/3 bg-gray-800 rounded-lg p-4 border border-cyan-900/50">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-cyan-400 font-semibold flex items-center gap-2">
                            <ShoppingCart className="w-4 h-4" />
                            Carrito de Compras
                          </h3>
                          <button
                            onClick={() => setShowCart(false)}
                            className="text-gray-400 hover:text-white"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="max-h-64 overflow-y-auto space-y-2 mb-4">
                          {shoppingCart.length === 0 ? (
                            <div className="text-center text-gray-400 py-8">
                              <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-50" />
                              <p>Tu carrito está vacío</p>
                            </div>
                          ) : (
                            shoppingCart.map((item) => (
                              <div
                                key={item.material.id}
                                className="bg-gray-700 p-3 rounded-lg"
                              >
                                <div className="flex justify-between items-start mb-2">
                                  <div className="flex-1">
                                    <div className="font-semibold text-white text-sm">
                                      {item.material.name}
                                    </div>
                                    <div className="text-xs text-gray-300">
                                      ${item.material.price} /{" "}
                                      {item.material.unit}
                                    </div>
                                  </div>
                                  <button
                                    onClick={() =>
                                      removeFromCart(item.material.id)
                                    }
                                    className="text-red-400 hover:text-red-300"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() =>
                                        updateCartQuantity(
                                          item.material.id,
                                          item.quantity - 1,
                                        )
                                      }
                                      className="w-6 h-6 bg-gray-600 hover:bg-gray-500 text-white rounded flex items-center justify-center"
                                    >
                                      <Minus className="w-3 h-3" />
                                    </button>
                                    <span className="w-8 text-center text-white font-semibold">
                                      {item.quantity}
                                    </span>
                                    <button
                                      onClick={() =>
                                        updateCartQuantity(
                                          item.material.id,
                                          item.quantity + 1,
                                        )
                                      }
                                      className="w-6 h-6 bg-gray-600 hover:bg-gray-500 text-white rounded flex items-center justify-center"
                                    >
                                      <Plus className="w-3 h-3" />
                                    </button>
                                  </div>
                                  <div className="text-cyan-400 font-bold">
                                    $
                                    {(
                                      item.material.price * item.quantity
                                    ).toFixed(2)}
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>

                        {shoppingCart.length > 0 && (
                          <div className="border-t border-gray-700 pt-4">
                            <div className="flex justify-between items-center mb-3">
                              <span className="text-white font-semibold">
                                Total:
                              </span>
                              <span className="text-cyan-400 font-bold text-lg">
                                ${getCartTotal().toFixed(2)}
                              </span>
                            </div>
                            <button
                              onClick={addCartToInventory}
                              className="w-full bg-cyan-600 hover:bg-cyan-700 text-white py-2 rounded-lg font-semibold transition-colors"
                            >
                              Añadir al Inventario
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Add new material */}
                  <div className="text-center mt-4">
                    <button
                      onClick={() => {
                        setChatFlowStep("awaiting-new-material");
                        setMessages((prev) => [
                          ...prev,
                          {
                            id: `assistant-${Date.now()}`,
                            content:
                              "Por favor ingresa los detalles del nuevo material en el siguiente formato:\n\nNombre, Descripción, Precio, Unidad, Categoría",
                            sender: "assistant",
                          },
                        ]);
                      }}
                      className="text-cyan-300 hover:text-cyan-200 underline flex items-center gap-2 mx-auto"
                    >
                      <Plus className="w-4 h-4" />
                      Agregar nuevo material
                    </button>
                  </div>
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

              {/* DeepSearch AI Options */}
              {message.action === "deepsearch-options" && (
                <div className="grid grid-cols-1 gap-3 mt-4">
                  <button
                    onClick={() =>
                      handleDeepSearchOptionSelect("materials-labor")
                    }
                    className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 hover:from-purple-800/50 hover:to-blue-800/50 text-white rounded-lg p-4 text-sm font-medium transition-all duration-200 flex items-center justify-center space-x-3"
                  >
                    <Brain className="w-5 h-5 text-purple-400" />
                    <Wrench className="w-5 h-5 text-blue-400" />
                    <DollarSign className="w-5 h-5 text-green-400" />
                    <span>Materiales + Costo de Mano de Obra</span>
                  </button>

                  <button
                    onClick={() =>
                      handleDeepSearchOptionSelect("materials-only")
                    }
                    className="bg-gradient-to-r from-green-900/30 to-teal-900/30 hover:from-green-800/50 hover:to-teal-800/50 text-white rounded-lg p-4 text-sm font-medium transition-all duration-200 flex items-center justify-center space-x-3"
                  >
                    <Brain className="w-5 h-5 text-green-400" />
                    <Wrench className="w-5 h-5 text-teal-400" />
                    <span>Solo Materiales</span>
                  </button>

                  <button
                    onClick={() => handleDeepSearchOptionSelect("labor-only")}
                    className="bg-gradient-to-r from-orange-900/30 to-red-900/30 hover:from-orange-800/50 hover:to-red-800/50 text-white rounded-lg p-4 text-sm font-medium transition-all duration-200 flex items-center justify-center space-x-3"
                  >
                    <Brain className="w-5 h-5 text-orange-400" />
                    <DollarSign className="w-5 h-5 text-red-400" />
                    <span>Solo Mano de Obra</span>
                  </button>

                  <button
                    onClick={async () => {
                      setChatFlowStep("select-inventory");

                      setMessages((prev) => [
                        ...prev,
                        {
                          id: `assistant-${Date.now()}`,
                          content:
                            "✅ Recomendaciones aplicadas al inventario. Puedes continuar con el descuento.",
                          sender: "assistant",
                        },
                      ]);

                      setTimeout(() => {
                        messagesEndRef.current?.scrollIntoView({
                          behavior: "smooth",
                        });
                      }, 100);
                      await loadMaterials().then((updatedMaterials) => {
                        setMessages((prev) => [
                          ...prev,
                          {
                            id: `assistant-${Date.now()}`,
                            content: "Ahora selecciona materiales manualmente:",
                            sender: "assistant",
                            materialList: updatedMaterials,
                          },
                        ]);
                      });
                      setTimeout(() => {
                        messagesEndRef.current?.scrollIntoView({
                          behavior: "smooth",
                        });
                      }, 100);
                    }}
                    className="bg-gradient-to-r from-orange-900/30 to-red-900/30 hover:from-orange-800/50 hover:to-red-800/50 text-white rounded-lg p-4 text-sm font-medium transition-all duration-200 flex items-center justify-center space-x-3"
                  >
                    <span>Saltar</span>
                  </button>
                </div>
              )}

              {/* DeepSearch Results with Edit Options */}
              {message.action === "deepsearch-results" &&
                deepSearchRecommendation && (
                  <div className="mt-4 space-y-3">
                    <div className="flex gap-3">
                      <button
                        onClick={() => setShowEditModal(true)}
                        className="bg-blue-900/30 hover:bg-blue-800/50 text-blue-400 rounded-lg px-4 py-2 text-sm font-medium transition-colors duration-200 flex items-center space-x-2"
                      >
                        <Edit3 className="w-4 h-4" />
                        <span>Editar Selección</span>
                      </button>

                      <button
                        onClick={() => {
                          // Continue with current selection
                          if (deepSearchOption === "labor-only") {
                            // Go to manual material selection
                            setChatFlowStep("select-inventory");
                            loadMaterials().then((updatedMaterials) => {
                              setMessages((prev) => [
                                ...prev,
                                {
                                  id: `assistant-${Date.now()}`,
                                  content:
                                    "Ahora selecciona materiales manualmente:",
                                  sender: "assistant",
                                  materialList: updatedMaterials,
                                },
                              ]);
                            });
                            setTimeout(() => {
                              messagesEndRef.current?.scrollIntoView({
                                behavior: "smooth",
                              });
                            }, 100);
                          } else {
                            // Convert AI recommendations to inventory items
                            const convertedItems =
                              deepSearchRecommendation.materials.map(
                                (material) => ({
                                  material: {
                                    id: `ai-${material.name.toLowerCase().replace(/\s+/g, "-")}`,
                                    name: material.name,
                                    description: material.description,
                                    price: material.estimatedPrice,
                                    unit: material.unit,
                                    category: material.category,
                                  },
                                  quantity: material.quantity,
                                }),
                              );

                            setInventoryItems(convertedItems);
                            setChatFlowStep("select-inventory");

                            setMessages((prev) => [
                              ...prev,
                              {
                                id: `assistant-${Date.now()}`,
                                content:
                                  "✅ Recomendaciones aplicadas al inventario. Puedes continuar con el descuento.",
                                sender: "assistant",
                              },
                            ]);

                            setTimeout(() => {
                              messagesEndRef.current?.scrollIntoView({
                                behavior: "smooth",
                              });
                            }, 100);
                          }
                        }}
                        className="bg-green-900/30 hover:bg-green-800/50 text-green-400 rounded-lg px-4 py-2 text-sm font-medium transition-colors duration-200 flex items-center space-x-2"
                      >
                        <Check className="w-4 h-4" />
                        <span>Continuar con Selección</span>
                      </button>
                    </div>
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
        {chatFlowStep === "select-inventory" && shoppingCart.length > 0 && (
          <div className="text-center mt-4">
            <button
              className="bg-cyan-700 hover:bg-cyan-600 text-white px-4 py-2 rounded-lg font-medium"
              onClick={() => {
                setChatFlowStep("awaiting-discount");
                setMessages((prev) => [
                  ...prev,
                  {
                    id: "assistant-" + Date.now(),
                    content:
                      "¿Quieres aplicar algún **descuento**? Ingresa un valor numérico o porcentaje (ej: 100 o 10%). Escribe skip para omitir.",
                    sender: "assistant",
                  },
                ]);
                setTimeout(
                  () =>
                    messagesEndRef.current?.scrollIntoView({
                      behavior: "smooth",
                    }),
                  100,
                );
              }}
            >
              📄 Generar Estimado
            </button>
          </div>
        )}
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

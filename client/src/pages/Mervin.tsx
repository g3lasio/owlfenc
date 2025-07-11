import React, { useState, useRef, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Client } from "@/lib/clientFirebase";
import { useAuth } from "@/contexts/AuthContext";
import { MaterialInventoryService } from "../../src/services/materialInventoryService";
import { db } from "@/lib/firebase";

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
  | "select-inventory"
  | "awaiting-new-material"
  | "awaiting-discount"
  | "awaiting-tax"
  | null;

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
  const [chatFlowStep, setChatFlowStep] =
    useState<EstimateStep1ChatFlowStep>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const { currentUser } = useAuth();
  const [isLoadingMaterials, setIsLoadingMaterials] = useState(true);

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
  const [visibleCount, setVisibleCount] = useState(3);
  const [materialSearchTerm, setMaterialSearchTerm] = useState("");

  const filteredMaterials = materials.filter((material) =>
    material.name.toLowerCase().includes(materialSearchTerm.toLowerCase()),
  );

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
  const generateEstimatePreview = () => {
    // USAR EXACTAMENTE LOS MISMOS CAMPOS QUE EL PDF
    // Validación usando profile.company (no companyName)
 

    // Si falta información crítica, mostrar alerta
    if (missingData.length > 0) {
      const alertHtml = `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; background: #fff; border: 3px solid #f59e0b;">
          <div style="background: #fef3c7; border: 2px solid #f59e0b; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h3 style="color: #92400e; margin: 0 0 10px 0;">
              ⚠️ Preview Incompleto - Información Faltante
            </h3>
            <p style="color: #92400e; margin: 10px 0;">Para generar un preview completo del PDF, necesitas completar:</p>
            <ul style="color: #92400e; margin: 10px 0; padding-left: 20px;">
              ${missingData.map((item) => `<li style="margin: 5px 0;">${item}</li>`).join("")}
            </ul>
            <p style="color: #92400e; margin: 10px 0; font-weight: bold;">
              Completa tu perfil para ver el preview exacto del PDF.
            </p>
          </div>
          ${generateBasicPreview()}
        </div>
      `;
      setPreviewHtml(alertHtml);
      return alertHtml;
    }

    // Generar estimado completo
    const estimateNumber = `EST-${Date.now()}`;
    const estimateDate = new Date().toLocaleDateString();

    const html = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; background: #fff; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">

        <!-- Header with Company Info and Logo -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px;">
          <div style="flex: 1;">
            ${profile?.logo ? `<img src="${profile.logo}" alt="Company Logo" style="max-width: 120px; max-height: 80px; margin-bottom: 10px;" />` : `<div style="width: 120px; height: 80px; border: 2px dashed #ccc; display: flex; align-items: center; justify-content: center; margin-bottom: 10px; color: #666; font-size: 14px;">Logo</div>`}
            <h2 style="margin: 0; color: #2563eb; font-size: 1.5em;">${profile?.company || ""}</h2>
            <p style="margin: 5px 0; color: #666;">
              ${profile?.address ? `${profile.address}${profile.city ? ", " + profile.city : ""}${profile.state ? ", " + profile.state : ""}${profile.zipCode ? " " + profile.zipCode : ""}` : ""}<br>
              ${profile?.phone || ""}<br>
              ${profile?.email || ""}
            </p>
            ${profile?.website ? `<p style="margin: 5px 0; color: #2563eb;">${profile.website}</p>` : ""}
            ${profile?.license ? `<p style="margin: 5px 0; font-size: 0.9em; color: #666;">License: ${profile.license}</p>` : ""}
          </div>

          <div style="text-align: right;">
            <h1 style="margin: 0; color: #2563eb; font-size: 2.2em;">PROFESSIONAL ESTIMATE</h1>
            <p style="margin: 10px 0; font-size: 1.1em;"><strong>Estimate #:</strong> ${estimateNumber}</p>
            <p style="margin: 5px 0;"><strong>Date:</strong> ${estimateDate}</p>
          </div>
        </div>

        <!-- Client Information -->
        <div style="display: flex; justify-content: space-between; margin-bottom: 30px;">
          <div style="flex: 1; padding-right: 20px;">
            <h3 style="color: #2563eb; margin-bottom: 15px; border-bottom: 2px solid #e5e7eb; padding-bottom: 5px;">BILL TO:</h3>
            <p style="margin: 5px 0; font-size: 1.1em; color: #000000;"><strong>${estimate.client?.name || "Client not specified"}</strong></p>
            <p style="margin: 5px 0; color: #000000;">${estimate.client?.email || ""}</p>
            <p style="margin: 5px 0; color: #000000;">${estimate.client?.phone || ""}</p>
            <p style="margin: 5px 0; color: #000000;">${estimate.client?.address || ""}</p>
            <p style="margin: 5px 0; color: #000000;">${estimate.client?.city ? `${estimate.client.city}, ` : ""}${estimate.client?.state || ""} ${estimate.client?.zipCode || ""}</p>
          </div>
        </div>

        <!-- Project Details -->
        <div style="margin-bottom: 30px;">
          <h3 style="color: #2563eb; margin-bottom: 15px; border-bottom: 2px solid #e5e7eb; padding-bottom: 5px;">MATERIALS AND SERVICES:</h3>
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; border-left: 4px solid #2563eb; line-height: 1.6;">
            ${estimate.projectDetails.replace(/\n/g, "<br>")}
          </div>
        </div>

        <!-- Materials & Labor Table -->
        <table style="width: 100%; border-collapse: collapse; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 30px;">
          <thead>
            <tr style="background: #2563eb; color: white;">
              <th style="border: 1px solid #2563eb; padding: 12px; text-align: left; font-weight: bold;">Description</th>
              <th style="border: 1px solid #2563eb; padding: 12px; text-align: center; font-weight: bold;">Qty.</th>
              <th style="border: 1px solid #2563eb; padding: 12px; text-align: center; font-weight: bold;">Unit</th>
              <th style="border: 1px solid #2563eb; padding: 12px; text-align: right; font-weight: bold;">Unit Price</th>
              <th style="border: 1px solid #2563eb; padding: 12px; text-align: right; font-weight: bold;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${estimate.items
              .map(
                (item, index) => `
              <tr style="background: ${index % 2 === 0 ? "#f8fafc" : "#ffffff"};">
                <td style="border: 1px solid #ddd; padding: 12px; color: #000000;">
                  <strong>${item.name}</strong>
                  ${item.description ? `<br><small style="color: #333333;">${item.description}</small>` : ""}
                </td>
                <td style="border: 1px solid #ddd; padding: 12px; text-align: center; color: #000000;">${item.quantity}</td>
                <td style="border: 1px solid #ddd; padding: 12px; text-align: center; color: #000000;">${item.unit}</td>
                <td style="border: 1px solid #ddd; padding: 12px; text-align: right; color: #000000;">$${item.price.toFixed(2)}</td>
                <td style="border: 1px solid #ddd; padding: 12px; text-align: right; font-weight: bold; color: #000000;">$${item.total.toFixed(2)}</td>
              </tr>
            `,
              )
              .join("")}
          </tbody>
        </table>

        <!-- Totals -->
        <div style="text-align: right; margin-top: 30px; background: #f8fafc; padding: 20px; border-radius: 8px; border: 2px solid #e5e7eb;">
          <div style="margin-bottom: 10px; font-size: 1.1em; color: #000000;">
            <span style="margin-right: 40px; color: #000000;"><strong>Subtotal:</strong></span>
            <span style="font-weight: bold; color: #000000;">$${estimate.subtotal.toFixed(2)}</span>
          </div>
          ${
            estimate.discountAmount > 0
              ? `
            <div style="margin-bottom: 10px; font-size: 1.1em; color: #22c55e;">
              <span style="margin-right: 40px; color: #22c55e;"><strong>Discount ${estimate.discountName ? "(" + estimate.discountName + ")" : ""} (${estimate.discountType === "percentage" ? estimate.discountValue + "%" : "Fixed"}):</strong></span>
              <span style="font-weight: bold; color: #22c55e;">-$${estimate.discountAmount.toFixed(2)}</span>
            </div>
          `
              : ""
          }
          <div style="margin-bottom: 15px; font-size: 1.1em; color: #000000;">
            <span style="margin-right: 40px; color: #000000;"><strong>Tax (${estimate.taxRate}%):</strong></span>
            <span style="font-weight: bold; color: #000000;">$${estimate.tax.toFixed(2)}</span>
          </div>
          <div style="border-top: 2px solid #2563eb; padding-top: 15px; font-size: 1.3em; color: #2563eb;">
            <span style="margin-right: 40px; color: #2563eb;"><strong>TOTAL:</strong></span>
            <span style="font-weight: bold; font-size: 1.2em; color: #2563eb;">$${estimate.total.toFixed(2)}</span>
          </div>
        </div>

        <!-- Footer -->
        <div style="margin-top: 40px; padding-top: 20px; border-top: 2px solid #e5e7eb; text-align: center; color: #666; font-size: 0.9em;">
          <p style="margin: 10px 0;"><strong>This estimate is valid for 30 days from the date shown above.</strong></p>
          <p style="margin: 10px 0;">Thank you for considering ${profile?.company || "our company"} for your project!</p>
          ${profile?.insurancePolicy ? `<p style="margin: 5px 0;">Fully Insured - Policy #: ${profile.insurancePolicy}</p>` : ""}
        </div>
      </div>
    `;

    setPreviewHtml(html);
    return html;
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
      setChatFlowStep("select-inventory");

      // 🔧 Load materials BEFORE creating message
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
          userId: currentUser.uid,
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

        discount = isPercentage
          ? `${parseFloat(numeric)}%`
          : `${parseFloat(numeric)}`;
      }

      // Save discount if needed...
      console.log("✅ Discount:", discount);

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

        tax = isPercentage
          ? `${parseFloat(numeric)}%`
          : `${parseFloat(numeric)}`;
      }

      console.log("✅ Tax:", tax);

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
                <div className="mt-2 space-y-3">
                  {/* 🔍 Search bar */}
                  <input
                    type="text"
                    placeholder="Buscar cliente..."
                    value={materialSearchTerm} // you can rename this to clientSearchTerm if needed
                    onChange={(e) => {
                      setMaterialSearchTerm(e.target.value); // reuse this state or separate one
                      setVisibleCount(3);
                    }}
                    className="w-full bg-gray-800 text-white px-3 py-2 rounded border border-cyan-900/50"
                  />

                  <div
                    className="max-h-64 overflow-y-auto grid grid-cols-2 gap-2 pr-2"
                    onScroll={(e) => {
                      const { scrollTop, scrollHeight, clientHeight } =
                        e.currentTarget;
                      if (scrollTop + clientHeight >= scrollHeight - 10) {
                        setVisibleCount((prev) => prev + 3);
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
                  {/* Search bar for materials in chat */}
                  <input
                    type="text"
                    placeholder="Buscar material..."
                    value={materialSearchTerm}
                    onChange={(e) => {
                      setMaterialSearchTerm(e.target.value);
                      setVisibleCount(3); // Reset pagination on search
                    }}
                    className="w-full bg-gray-800 text-white px-3 py-2 rounded border border-cyan-900/50"
                  />

                  <div
                    className="max-h-64 overflow-y-auto grid grid-cols-2 gap-3 pr-2"
                    onScroll={(e) => {
                      const { scrollTop, scrollHeight, clientHeight } =
                        e.currentTarget;
                      if (scrollTop + clientHeight >= scrollHeight - 10) {
                        setVisibleCount((prev) => prev + 3); // Load more on scroll
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
                          className="bg-cyan-900/20 p-3 rounded-lg text-white space-y-2"
                        >
                          <div className="font-semibold">{material.name}</div>
                          <div className="text-sm opacity-80">
                            {material.description}
                          </div>
                          <div className="text-sm">
                            Precio: ${material.price} / {material.unit}
                          </div>
                          <input
                            type="number"
                            min={1}
                            placeholder="Cantidad"
                            className="w-full bg-gray-800 text-white px-3 py-1 rounded"
                            onChange={(e) => {
                              const qty = parseInt(e.target.value);
                              if (!isNaN(qty)) {
                                const existing = inventoryItems.find(
                                  (item) => item.material.id === material.id,
                                );
                                if (existing) {
                                  setInventoryItems((prev) =>
                                    prev.map((item) =>
                                      item.material.id === material.id
                                        ? { ...item, quantity: qty }
                                        : item,
                                    ),
                                  );
                                } else {
                                  setInventoryItems((prev) => [
                                    ...prev,
                                    { material, quantity: qty },
                                  ]);
                                }
                              }
                            }}
                          />
                        </div>
                      ))}
                  </div>

                  {/* ➕ Add new material */}
                  <div className="text-center mt-3">
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
                      className="text-cyan-300 underline"
                    >
                      ➕ Agregar nuevo material
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
        {chatFlowStep === "select-inventory" && inventoryItems.length > 0 && (
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

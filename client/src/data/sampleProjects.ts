import { Timestamp } from "firebase/firestore";

export const sampleProjects = [
  {
    id: "proj1",
    projectId: "FENCE-2025-001",
    clientName: "Juan Pérez",
    clientEmail: "jperez@ejemplo.com",
    clientPhone: "555-123-4567",
    address: "Calle Principal 123, Ciudad de México",
    fenceType: "Wood Fence",
    length: 50,
    height: 6,
    gates: [
      { type: "Single Gate", width: 36, height: 72, hardware: "Standard Lock" }
    ],
    additionalDetails: "El cliente quiere estilo rústico y una puerta lateral",
    estimateHtml: "<p>Contenido del presupuesto</p>",
    totalPrice: 125000, // en centavos ($1,250.00)
    status: "approved",
    projectProgress: "contract_sent",
    projectType: "Residencial",
    scheduledDate: Timestamp.fromDate(new Date(2025, 5, 20)),
    clientNotes: "Cliente muy interesado en calidad de materiales. Prefiere comunicación por email.",
    internalNotes: "Verificar disponibilidad de madera tratada antes de programar.",
    paymentStatus: "partial",
    paymentDetails: {
      totalPaid: 62500,
      history: [
        { date: Timestamp.fromDate(new Date(2025, 4, 15)), amount: 62500, method: "Transferencia" }
      ]
    },
    createdAt: Timestamp.fromDate(new Date(2025, 4, 10))
  },
  {
    id: "proj2",
    projectId: "FENCE-2025-002",
    clientName: "María González",
    clientEmail: "mgonzalez@ejemplo.com",
    clientPhone: "555-987-6543",
    address: "Av. Reforma 456, Ciudad de México",
    fenceType: "Iron Fence",
    length: 75,
    height: 7,
    gates: [
      { type: "Double Gate", width: 72, height: 84, hardware: "Premium Lock" }
    ],
    additionalDetails: "Cerca decorativa para frente de casa",
    estimateHtml: "<p>Contenido del presupuesto</p>",
    contractHtml: "<p>Contenido del contrato</p>",
    totalPrice: 250000, // ($2,500.00)
    status: "completed",
    projectProgress: "completed",
    projectType: "Residencial",
    scheduledDate: Timestamp.fromDate(new Date(2025, 3, 5)),
    completedDate: Timestamp.fromDate(new Date(2025, 3, 12)),
    clientNotes: "Cliente muy satisfecho con trabajo anterior. Referido por proyecto en Av. Insurgentes.",
    paymentStatus: "paid",
    paymentDetails: {
      totalPaid: 250000,
      history: [
        { date: Timestamp.fromDate(new Date(2025, 3, 1)), amount: 100000, method: "Tarjeta" },
        { date: Timestamp.fromDate(new Date(2025, 3, 15)), amount: 150000, method: "Transferencia" }
      ]
    },
    createdAt: Timestamp.fromDate(new Date(2025, 2, 25))
  },
  {
    id: "proj3",
    projectId: "FENCE-2025-003",
    clientName: "Roberto Sánchez",
    clientEmail: "rsanchez@ejemplo.com",
    clientPhone: "555-555-1212",
    address: "Calle Durango 789, Ciudad de México",
    fenceType: "Chain Link Fence",
    length: 100,
    height: 5,
    gates: [
      { type: "Single Gate", width: 36, height: 60, hardware: "Standard Lock" }
    ],
    additionalDetails: "Cerca para delimitar terreno comercial",
    estimateHtml: "<p>Contenido del presupuesto</p>",
    totalPrice: 175000, // ($1,750.00)
    status: "sent",
    projectProgress: "estimate_sent",
    projectType: "Comercial",
    permitStatus: "pending",
    permitDetails: {
      applicationDate: Timestamp.fromDate(new Date(2025, 4, 20)),
      permitNumber: "COM-2025-1234"
    },
    createdAt: Timestamp.fromDate(new Date(2025, 4, 18))
  },
  {
    id: "proj4",
    projectId: "FENCE-2025-004",
    clientName: "Sofía Ramírez",
    clientEmail: "sramirez@ejemplo.com",
    clientPhone: "555-444-3333",
    address: "Calle Álamos 321, Ciudad de México",
    fenceType: "Vinyl Fence",
    length: 40,
    height: 5,
    additionalDetails: "Cerca para patio trasero con acceso a parque",
    estimateHtml: "<p>Contenido del presupuesto</p>",
    totalPrice: 85000, // ($850.00)
    status: "draft",
    projectProgress: "estimate_created",
    projectType: "Residencial",
    createdAt: Timestamp.fromDate(new Date(2025, 4, 22))
  },
  {
    id: "proj5",
    projectId: "FENCE-2025-005",
    clientName: "Carlos López",
    clientEmail: "clopez@ejemplo.com",
    clientPhone: "555-777-8888",
    address: "Av. Chapultepec 567, Ciudad de México",
    fenceType: "Aluminum Fence",
    length: 60,
    height: 6,
    gates: [
      { type: "Single Gate", width: 36, height: 72, hardware: "Automated" }
    ],
    additionalDetails: "Cerca para piscina con puerta automatizada",
    estimateHtml: "<p>Contenido del presupuesto</p>",
    contractHtml: "<p>Contenido del contrato</p>",
    totalPrice: 195000, // ($1,950.00)
    status: "approved",
    projectProgress: "scheduled",
    projectType: "Residencial",
    scheduledDate: Timestamp.fromDate(new Date(2025, 5, 15)),
    clientNotes: "Cliente requiere instalación antes del 20 de junio para evento familiar.",
    paymentStatus: "partial",
    paymentDetails: {
      totalPaid: 97500,
      history: [
        { date: Timestamp.fromDate(new Date(2025, 4, 30)), amount: 97500, method: "Efectivo" }
      ]
    },
    createdAt: Timestamp.fromDate(new Date(2025, 4, 5))
  }
];
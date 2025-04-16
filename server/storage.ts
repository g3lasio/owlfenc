import { 
  User, 
  InsertUser, 
  Project, 
  InsertProject, 
  Template, 
  InsertTemplate, 
  Settings, 
  InsertSettings, 
  ChatLog, 
  InsertChatLog,
  Client,
  InsertClient,
  SubscriptionPlan,
  InsertSubscriptionPlan,
  UserSubscription,
  InsertUserSubscription,
  PaymentHistory,
  InsertPaymentHistory
} from "@shared/schema";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, userData: Partial<User>): Promise<User>;
  
  // Project methods
  getProject(id: number): Promise<Project | undefined>;
  getProjectByProjectId(projectId: string): Promise<Project | undefined>;
  getProjectsByUserId(userId: number): Promise<Project[]>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: number, project: Partial<Project>): Promise<Project>;
  
  // Template methods
  getTemplate(id: number): Promise<Template | undefined>;
  getTemplatesByType(userId: number, type: string): Promise<Template[]>;
  getDefaultTemplate(userId: number, type: string): Promise<Template | undefined>;
  createTemplate(template: InsertTemplate): Promise<Template>;
  updateTemplate(id: number, template: Partial<Template>): Promise<Template>;
  
  // Settings methods
  getSettings(userId: number): Promise<Settings | undefined>;
  createSettings(settings: InsertSettings): Promise<Settings>;
  updateSettings(userId: number, settings: Partial<Settings>): Promise<Settings>;
  
  // Chat log methods
  getChatLog(projectId: number): Promise<ChatLog | undefined>;
  createChatLog(chatLog: InsertChatLog): Promise<ChatLog>;
  updateChatLog(id: number, messages: any): Promise<ChatLog>;
  
  // Client methods
  getClient(id: number): Promise<Client | undefined>;
  getClientByClientId(clientId: string): Promise<Client | undefined>;
  getClientsByUserId(userId: number): Promise<Client[]>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: number, client: Partial<Client>): Promise<Client>;
  deleteClient(id: number): Promise<boolean>;
  
  // Subscription Plan methods
  getSubscriptionPlan(id: number): Promise<SubscriptionPlan | undefined>;
  getSubscriptionPlanByCode(code: string): Promise<SubscriptionPlan | undefined>;
  getAllSubscriptionPlans(): Promise<SubscriptionPlan[]>;
  createSubscriptionPlan(plan: InsertSubscriptionPlan): Promise<SubscriptionPlan>;
  updateSubscriptionPlan(id: number, plan: Partial<SubscriptionPlan>): Promise<SubscriptionPlan>;
  
  // User Subscription methods
  getUserSubscription(id: number): Promise<UserSubscription | undefined>;
  getUserSubscriptionByUserId(userId: number): Promise<UserSubscription | undefined>;
  createUserSubscription(subscription: InsertUserSubscription): Promise<UserSubscription>;
  updateUserSubscription(id: number, subscription: Partial<UserSubscription>): Promise<UserSubscription>;
  
  // Payment History methods
  getPaymentHistory(id: number): Promise<PaymentHistory | undefined>;
  getPaymentHistoryByUserId(userId: number): Promise<PaymentHistory[]>;
  createPaymentHistory(payment: InsertPaymentHistory): Promise<PaymentHistory>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private projects: Map<number, Project>;
  private templates: Map<number, Template>;
  private settings: Map<number, Settings>;
  private chatLogs: Map<number, ChatLog>;
  private clients: Map<number, Client>;
  private subscriptionPlans: Map<number, SubscriptionPlan>;
  private userSubscriptions: Map<number, UserSubscription>;
  private paymentHistory: Map<number, PaymentHistory>;
  
  private currentIds: {
    users: number;
    projects: number;
    templates: number;
    settings: number;
    chatLogs: number;
    clients: number;
    subscriptionPlans: number;
    userSubscriptions: number;
    paymentHistory: number;
  };

  constructor() {
    this.users = new Map();
    this.projects = new Map();
    this.templates = new Map();
    this.settings = new Map();
    this.chatLogs = new Map();
    this.clients = new Map();
    this.subscriptionPlans = new Map();
    this.userSubscriptions = new Map();
    this.paymentHistory = new Map();
    
    this.currentIds = {
      users: 1,
      projects: 1,
      templates: 1,
      settings: 1,
      chatLogs: 1,
      clients: 1,
      subscriptionPlans: 1,
      userSubscriptions: 1,
      paymentHistory: 1
    };
    
    // Add some default data
    this.seedData();
  }
  
  async updateUser(id: number, userData: Partial<User>): Promise<User> {
    const user = this.users.get(id);
    if (!user) {
      throw new Error(`User with ID ${id} not found`);
    }
    
    const updatedUser: User = {
      ...user,
      ...userData
    };
    this.users.set(id, updatedUser);
    return updatedUser;
  }
  
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentIds.users++;
    const now = new Date();
    const user: User = { 
      ...insertUser, 
      id,
      createdAt: now
    };
    this.users.set(id, user);
    return user;
  }
  
  // Project methods
  async getProject(id: number): Promise<Project | undefined> {
    return this.projects.get(id);
  }
  
  async getProjectByProjectId(projectId: string): Promise<Project | undefined> {
    return Array.from(this.projects.values()).find(
      (project) => project.projectId === projectId
    );
  }
  
  async getProjectsByUserId(userId: number): Promise<Project[]> {
    return Array.from(this.projects.values()).filter(
      (project) => project.userId === userId
    ).sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }
  
  async createProject(insertProject: InsertProject): Promise<Project> {
    const id = this.currentIds.projects++;
    const now = new Date();
    const project: Project = {
      ...insertProject,
      id,
      createdAt: now,
      updatedAt: now
    };
    this.projects.set(id, project);
    return project;
  }
  
  async updateProject(id: number, projectData: Partial<Project>): Promise<Project> {
    const project = this.projects.get(id);
    if (!project) {
      throw new Error(`Project with ID ${id} not found`);
    }
    
    const updatedProject: Project = {
      ...project,
      ...projectData,
      updatedAt: new Date()
    };
    this.projects.set(id, updatedProject);
    return updatedProject;
  }
  
  // Template methods
  async getTemplate(id: number): Promise<Template | undefined> {
    return this.templates.get(id);
  }
  
  async getTemplatesByType(userId: number, type: string): Promise<Template[]> {
    return Array.from(this.templates.values()).filter(
      (template) => template.userId === userId && template.type === type
    );
  }
  
  async getDefaultTemplate(userId: number, type: string): Promise<Template | undefined> {
    return Array.from(this.templates.values()).find(
      (template) => template.userId === userId && template.type === type && template.isDefault
    );
  }
  
  async createTemplate(insertTemplate: InsertTemplate): Promise<Template> {
    const id = this.currentIds.templates++;
    const now = new Date();
    const template: Template = {
      ...insertTemplate,
      id,
      createdAt: now
    };
    this.templates.set(id, template);
    return template;
  }
  
  async updateTemplate(id: number, templateData: Partial<Template>): Promise<Template> {
    const template = this.templates.get(id);
    if (!template) {
      throw new Error(`Template with ID ${id} not found`);
    }
    
    const updatedTemplate: Template = {
      ...template,
      ...templateData
    };
    this.templates.set(id, updatedTemplate);
    return updatedTemplate;
  }
  
  // Settings methods
  async getSettings(userId: number): Promise<Settings | undefined> {
    return Array.from(this.settings.values()).find(
      (setting) => setting.userId === userId
    );
  }
  
  async createSettings(insertSettings: InsertSettings): Promise<Settings> {
    const id = this.currentIds.settings++;
    const now = new Date();
    const settings: Settings = {
      ...insertSettings,
      id,
      updatedAt: now
    };
    this.settings.set(id, settings);
    return settings;
  }
  
  async updateSettings(userId: number, settingsData: Partial<Settings>): Promise<Settings> {
    const settings = Array.from(this.settings.values()).find(
      (setting) => setting.userId === userId
    );
    
    if (!settings) {
      throw new Error(`Settings for user ${userId} not found`);
    }
    
    const updatedSettings: Settings = {
      ...settings,
      ...settingsData,
      updatedAt: new Date()
    };
    this.settings.set(settings.id, updatedSettings);
    return updatedSettings;
  }
  
  // Chat log methods
  async getChatLog(projectId: number): Promise<ChatLog | undefined> {
    return Array.from(this.chatLogs.values()).find(
      (chatLog) => chatLog.projectId === projectId
    );
  }
  
  async createChatLog(insertChatLog: InsertChatLog): Promise<ChatLog> {
    const id = this.currentIds.chatLogs++;
    const now = new Date();
    const chatLog: ChatLog = {
      ...insertChatLog,
      id,
      createdAt: now,
      updatedAt: now
    };
    this.chatLogs.set(id, chatLog);
    return chatLog;
  }
  
  async updateChatLog(id: number, messages: any): Promise<ChatLog> {
    const chatLog = this.chatLogs.get(id);
    if (!chatLog) {
      throw new Error(`Chat log with ID ${id} not found`);
    }
    
    const updatedChatLog: ChatLog = {
      ...chatLog,
      messages,
      updatedAt: new Date()
    };
    this.chatLogs.set(id, updatedChatLog);
    return updatedChatLog;
  }
  
  // Client methods
  async getClient(id: number): Promise<Client | undefined> {
    return this.clients.get(id);
  }
  
  async getClientByClientId(clientId: string): Promise<Client | undefined> {
    return Array.from(this.clients.values()).find(
      (client) => client.clientId === clientId
    );
  }
  
  async getClientsByUserId(userId: number): Promise<Client[]> {
    return Array.from(this.clients.values()).filter(
      (client) => client.userId === userId
    ).sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }
  
  async createClient(insertClient: InsertClient): Promise<Client> {
    const id = this.currentIds.clients++;
    const now = new Date();
    const client: Client = {
      ...insertClient,
      id,
      createdAt: now,
      updatedAt: now
    };
    this.clients.set(id, client);
    return client;
  }
  
  async updateClient(id: number, clientData: Partial<Client>): Promise<Client> {
    const client = this.clients.get(id);
    if (!client) {
      throw new Error(`Client with ID ${id} not found`);
    }
    
    const updatedClient: Client = {
      ...client,
      ...clientData,
      updatedAt: new Date()
    };
    this.clients.set(id, updatedClient);
    return updatedClient;
  }
  
  async deleteClient(id: number): Promise<boolean> {
    if (!this.clients.has(id)) {
      throw new Error(`Client with ID ${id} not found`);
    }
    
    return this.clients.delete(id);
  }
  
  // Subscription Plan methods
  async getSubscriptionPlan(id: number): Promise<SubscriptionPlan | undefined> {
    return this.subscriptionPlans.get(id);
  }
  
  async getSubscriptionPlanByCode(code: string): Promise<SubscriptionPlan | undefined> {
    return Array.from(this.subscriptionPlans.values()).find(
      (plan) => plan.code === code
    );
  }
  
  async getAllSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    return Array.from(this.subscriptionPlans.values())
      .filter(plan => plan.isActive)
      .sort((a, b) => a.price - b.price); // Ordenados por precio de menor a mayor
  }
  
  async createSubscriptionPlan(insertPlan: InsertSubscriptionPlan): Promise<SubscriptionPlan> {
    const id = this.currentIds.subscriptionPlans++;
    const now = new Date();
    const plan: SubscriptionPlan = {
      ...insertPlan,
      id,
      createdAt: now,
      updatedAt: now
    };
    this.subscriptionPlans.set(id, plan);
    return plan;
  }
  
  async updateSubscriptionPlan(id: number, planData: Partial<SubscriptionPlan>): Promise<SubscriptionPlan> {
    const plan = this.subscriptionPlans.get(id);
    if (!plan) {
      throw new Error(`Subscription plan with ID ${id} not found`);
    }
    
    const updatedPlan: SubscriptionPlan = {
      ...plan,
      ...planData,
      updatedAt: new Date()
    };
    this.subscriptionPlans.set(id, updatedPlan);
    return updatedPlan;
  }
  
  // User Subscription methods
  async getUserSubscription(id: number): Promise<UserSubscription | undefined> {
    return this.userSubscriptions.get(id);
  }
  
  async getUserSubscriptionByUserId(userId: number): Promise<UserSubscription | undefined> {
    return Array.from(this.userSubscriptions.values()).find(
      (subscription) => subscription.userId === userId
    );
  }
  
  async createUserSubscription(insertSubscription: InsertUserSubscription): Promise<UserSubscription> {
    const id = this.currentIds.userSubscriptions++;
    const now = new Date();
    const subscription: UserSubscription = {
      ...insertSubscription,
      id,
      createdAt: now,
      updatedAt: now
    };
    this.userSubscriptions.set(id, subscription);
    return subscription;
  }
  
  async updateUserSubscription(id: number, subscriptionData: Partial<UserSubscription>): Promise<UserSubscription> {
    const subscription = this.userSubscriptions.get(id);
    if (!subscription) {
      throw new Error(`User subscription with ID ${id} not found`);
    }
    
    const updatedSubscription: UserSubscription = {
      ...subscription,
      ...subscriptionData,
      updatedAt: new Date()
    };
    this.userSubscriptions.set(id, updatedSubscription);
    return updatedSubscription;
  }
  
  // Payment History methods
  async getPaymentHistory(id: number): Promise<PaymentHistory | undefined> {
    return this.paymentHistory.get(id);
  }
  
  async getPaymentHistoryByUserId(userId: number): Promise<PaymentHistory[]> {
    return Array.from(this.paymentHistory.values())
      .filter(payment => payment.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  
  async createPaymentHistory(insertPayment: InsertPaymentHistory): Promise<PaymentHistory> {
    const id = this.currentIds.paymentHistory++;
    const now = new Date();
    const payment: PaymentHistory = {
      ...insertPayment,
      id,
      createdAt: now
    };
    this.paymentHistory.set(id, payment);
    return payment;
  }
  
  // Seed some initial data
  private seedData() {
    // Add a default user
    const user: User = {
      id: this.currentIds.users++,
      username: "john_contractor",
      password: "password123", // In a real app, this would be hashed
      company: "Acme Fencing",
      ownerName: "John Smith",
      role: "Propietario",
      email: "john@acmefencing.com",
      phone: "(503) 555-1234",
      mobilePhone: "(503) 555-5678",
      address: "123 Main St",
      city: "Portland",
      state: "OR",
      zipCode: "97204",
      license: "CCB #123456",
      insurancePolicy: "INS-9876543",
      ein: "12-3456789",
      businessType: "LLC",
      yearEstablished: "2010",
      website: "https://www.acmefencing.com",
      description: "Especialistas en instalación de cercas residenciales y comerciales con más de 10 años de experiencia en el mercado.",
      specialties: ["Cercas de madera", "Cercas de vinilo", "Cercas de hierro", "Cercas de privacidad"],
      socialMedia: {
        facebook: "https://facebook.com/acmefencing",
        instagram: "https://instagram.com/acmefencing",
        linkedin: "https://linkedin.com/company/acmefencing"
      },
      documents: {},
      logo: "",
      createdAt: new Date()
    };
    this.users.set(user.id, user);
    
    // Add default templates
    const estimateTemplate: Template = {
      id: this.currentIds.templates++,
      userId: user.id,
      name: "Standard Estimate",
      description: "Default estimate template",
      type: "estimate",
      html: this.getDefaultEstimateHtml(),
      isDefault: true,
      createdAt: new Date()
    };
    this.templates.set(estimateTemplate.id, estimateTemplate);
    
    const contractTemplate: Template = {
      id: this.currentIds.templates++,
      userId: user.id,
      name: "Standard Contract",
      description: "Default contract template",
      type: "contract",
      html: this.getDefaultContractHtml(),
      isDefault: true,
      createdAt: new Date()
    };
    this.templates.set(contractTemplate.id, contractTemplate);
    
    // Add default settings
    const settings: Settings = {
      id: this.currentIds.settings++,
      userId: user.id,
      pricingSettings: {
        fencePrices: {
          wood: 30,
          vinyl: 40,
          chainLink: 25,
          aluminum: 60
        },
        gatePrices: {
          walkGate: 250,
          driveGate: 650
        },
        taxRate: 8.75,
        permitFee: 150
      },
      emailTemplates: {
        estimate: {
          subject: "Your Fence Estimate from {{company}}",
          body: "Dear {{clientName}},\n\nThank you for choosing {{company}}. Please find your estimate attached..."
        },
        contract: {
          subject: "Your Fence Contract from {{company}}",
          body: "Dear {{clientName}},\n\nThank you for choosing {{company}}. Please find your contract attached..."
        }
      },
      notificationSettings: {
        emailNotifications: true,
        smsNotifications: false
      },
      updatedAt: new Date()
    };
    this.settings.set(settings.id, settings);
    
    // Add sample clients
    const clients = [
      {
        id: this.currentIds.clients++,
        userId: user.id,
        clientId: `client_${Date.now()}_1`,
        name: "María González",
        email: "maria@example.com",
        phone: "(503) 555-7890",
        mobilePhone: "(503) 555-7891",
        address: "456 Oak Street",
        city: "Portland",
        state: "OR",
        zipCode: "97205",
        notes: "Cliente frecuente, interesado en cercas de madera",
        source: "Referido",
        tags: ["Residencial", "Cliente frecuente"],
        lastContact: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 días atrás
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 días atrás
        updatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      },
      {
        id: this.currentIds.clients++,
        userId: user.id,
        clientId: `client_${Date.now()}_2`,
        name: "Carlos Rodríguez",
        email: "carlos@example.com",
        phone: "(503) 555-4567",
        mobilePhone: "(503) 555-4568",
        address: "789 Pine Avenue",
        city: "Beaverton",
        state: "OR",
        zipCode: "97006",
        notes: "Propietario de varios negocios, buscando cercas comerciales",
        source: "Página web",
        tags: ["Comercial", "VIP"],
        lastContact: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 días atrás
        createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // 60 días atrás
        updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
      },
      {
        id: this.currentIds.clients++,
        userId: user.id,
        clientId: `client_${Date.now()}_3`,
        name: "Ana Martínez",
        email: "ana@example.com",
        phone: "(503) 555-2345",
        mobilePhone: "(503) 555-2346",
        address: "321 Cedar Road",
        city: "Hillsboro",
        state: "OR",
        zipCode: "97123",
        notes: "Busca una cerca para su patio trasero",
        source: "Google",
        tags: ["Residencial", "Nuevo cliente"],
        lastContact: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 día atrás
        createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 días atrás
        updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
      }
    ];
    
    clients.forEach(client => {
      this.clients.set(client.id, client);
    });
    
    // Agregar planes de suscripción predeterminados
    const subscriptionPlans = [
      {
        id: this.currentIds.subscriptionPlans++,
        name: "🧤 Primo Chambeador",
        code: "primo_chambeador",
        price: 2900, // $29/mes en centavos
        yearlyPrice: 27800, // $278/año en centavos
        description: "Plan básico para contratistas que están comenzando su negocio",
        features: [
          "Hasta 10 estimaciones por mes",
          "Hasta 5 contratos por mes",
          "1 plantilla personalizable",
          "Soporte por correo electrónico"
        ],
        motto: "Con poco se arranca, con coraje se crece: deja a Mervin el papeleo y dale duro.",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: this.currentIds.subscriptionPlans++,
        name: "🔨 El Mero Patrón",
        code: "mero_patron",
        price: 5900, // $59/mes en centavos
        yearlyPrice: 56600, // $566/año en centavos
        description: "Plan intermedio para contratistas con negocios en crecimiento",
        features: [
          "Estimaciones ilimitadas",
          "Hasta 20 contratos por mes",
          "3 plantillas personalizables",
          "Gestión de clientes",
          "Soporte prioritario",
          "Recordatorios automáticos"
        ],
        motto: "Menos rollo, más billete: conviértete en el patrón de tus proyectos.",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: this.currentIds.subscriptionPlans++,
        name: "👑 El Chingón Mayor",
        code: "chingon_mayor",
        price: 9900, // $99/mes en centavos
        yearlyPrice: 95000, // $950/año en centavos
        description: "Plan premium para contratistas profesionales con altos volúmenes de trabajo",
        features: [
          "Estimaciones y contratos ilimitados",
          "Plantillas personalizables ilimitadas",
          "Gestión avanzada de clientes y proyectos",
          "Integración con contabilidad",
          "Reportes y análisis avanzados",
          "Soporte telefónico prioritario 24/7",
          "Capacitación personalizada"
        ],
        motto: "La cima es tuya: cierra trato tras trato sin despeinarte; Mervin resuelve el papeleo mientras tú dominas el negocio.",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
    
    subscriptionPlans.forEach(plan => {
      this.subscriptionPlans.set(plan.id, plan);
    });
  }
  
  private getDefaultEstimateHtml(): string {
    return `
      <div>
        <div class="text-center mb-6">
          <h1 class="text-2xl font-bold">FENCE INSTALLATION ESTIMATE</h1>
          <p class="text-sm">Reference: {{projectId}}</p>
        </div>
        
        <div class="grid grid-cols-2 gap-4 mb-6">
          <div>
            <h2 class="text-lg font-bold mb-2">Provider</h2>
            <p>{{company}}</p>
            <p>{{address}}</p>
            <p>Phone: {{phone}}</p>
            <p>License: {{license}}</p>
          </div>
          <div>
            <h2 class="text-lg font-bold mb-2">Client</h2>
            <p>{{clientName}}</p>
            <p>{{clientAddress}}</p>
            <p>Date: {{currentDate}}</p>
            <p>Valid for: 30 days</p>
          </div>
        </div>
        
        <div class="mb-6">
          <h2 class="text-lg font-bold mb-2">Project Details</h2>
          <table class="w-full">
            <tr>
              <th class="text-left">Description</th>
              <th class="text-right">Amount</th>
            </tr>
            <tr>
              <td>
                <p class="font-medium">{{fenceType}} Installation</p>
                <p class="text-sm">{{fenceHeight}}ft height, {{fenceLength}} linear feet</p>
                <p class="text-sm">{{fenceDetails}}</p>
              </td>
              <td class="text-right align-top">\${{{fencePrice}}}</td>
            </tr>
            {{#each gates}}
            <tr>
              <td>
                <p class="font-medium">{{this.width}}ft Wide {{this.type}} Gate</p>
                <p class="text-sm">{{this.description}}</p>
              </td>
              <td class="text-right">\${{{this.price}}}</td>
            </tr>
            {{/each}}
            <tr>
              <td>
                <p class="font-medium">Materials</p>
                <p class="text-sm">Hardware, concrete, misc. supplies</p>
              </td>
              <td class="text-right">\${{{materialsPrice}}}</td>
            </tr>
          </table>
        </div>
        
        <div class="mb-6">
          <table class="w-full">
            <tr>
              <td class="text-right font-medium">Subtotal:</td>
              <td class="text-right w-32">\${{{subtotal}}}</td>
            </tr>
            <tr>
              <td class="text-right font-medium">Tax ({{taxRate}}%):</td>
              <td class="text-right">\${{{taxAmount}}}</td>
            </tr>
            <tr>
              <td class="text-right font-bold">Total:</td>
              <td class="text-right font-bold">\${{{total}}}</td>
            </tr>
          </table>
        </div>
        
        <div class="mb-6">
          <h2 class="text-lg font-bold mb-2">Terms & Conditions</h2>
          <ul class="list-disc pl-5 text-sm space-y-1">
            <li>50% deposit required to schedule work</li>
            <li>Balance due upon completion</li>
            <li>Estimated completion time: {{completionTime}} business days</li>
            <li>1-year warranty on materials and workmanship</li>
            <li>Customer responsible for marking underground utilities</li>
          </ul>
        </div>
        
        <div class="grid grid-cols-2 gap-4 mt-8">
          <div>
            <p class="border-t pt-2">Customer Signature</p>
          </div>
          <div>
            <p class="border-t pt-2">Date</p>
          </div>
        </div>
      </div>
    `;
  }
  
  private getDefaultContractHtml(): string {
    return `
      <div>
        <div class="text-center mb-6">
          <h1 class="text-2xl font-bold">FENCE INSTALLATION CONTRACT</h1>
          <p class="text-sm">Reference: {{projectId}}</p>
        </div>
        
        <div class="grid grid-cols-2 gap-4 mb-6">
          <div>
            <h2 class="text-lg font-bold mb-2">Contractor</h2>
            <p>{{company}}</p>
            <p>{{address}}</p>
            <p>Phone: {{phone}}</p>
            <p>License: {{license}}</p>
          </div>
          <div>
            <h2 class="text-lg font-bold mb-2">Client</h2>
            <p>{{clientName}}</p>
            <p>{{clientAddress}}</p>
            <p>Contract Date: {{currentDate}}</p>
          </div>
        </div>
        
        <div class="mb-6">
          <h2 class="text-lg font-bold mb-2">Scope of Work</h2>
          <p>The Contractor agrees to furnish all labor, materials, equipment, and services necessary for the complete and proper installation of a {{fenceType}} fence as described below:</p>
          
          <ul class="list-disc pl-5 text-sm mt-2 space-y-1">
            <li>Install {{fenceLength}} linear feet of {{fenceHeight}}ft high {{fenceType}} fencing</li>
            {{#each gates}}
            <li>Install one {{this.width}}ft wide {{this.type}} gate with all necessary hardware</li>
            {{/each}}
            <li>Set all posts in concrete footings to proper depth</li>
            <li>Clean up all debris and restore work area to original condition</li>
            <li>Complete all work in a professional manner according to standard practices</li>
          </ul>
        </div>
        
        <div class="mb-6">
          <h2 class="text-lg font-bold mb-2">Payment Schedule</h2>
          <table class="w-full">
            <tr>
              <td class="border px-2 py-1">Initial deposit (due upon signing)</td>
              <td class="border px-2 py-1 text-right">\${{{depositAmount}}} (50%)</td>
            </tr>
            <tr>
              <td class="border px-2 py-1">Final payment (due upon completion)</td>
              <td class="border px-2 py-1 text-right">\${{{balanceAmount}}} (50%)</td>
            </tr>
            <tr>
              <td class="border px-2 py-1 font-bold">Total Contract Price</td>
              <td class="border px-2 py-1 text-right font-bold">\${{{total}}}</td>
            </tr>
          </table>
        </div>
        
        <div class="mb-6">
          <h2 class="text-lg font-bold mb-2">Timeline</h2>
          <p>Work will commence approximately {{startDate}} and is expected to be completed within {{completionTime}} business days, weather permitting.</p>
        </div>
        
        <div class="mb-6">
          <h2 class="text-lg font-bold mb-2">Warranties and Guarantees</h2>
          <p>Contractor warrants all workmanship for a period of one (1) year from date of completion. Manufacturer warranties on materials will be provided to Client upon completion.</p>
        </div>
        
        <div class="mb-6">
          <h2 class="text-lg font-bold mb-2">Terms and Conditions</h2>
          <ol class="list-decimal pl-5 text-sm space-y-1">
            <li>Any alterations or deviations from the specifications above will be executed only upon written orders and may result in additional charges.</li>
            <li>Contractor is not responsible for damage to unmarked utilities.</li>
            <li>In the event of termination by Client prior to completion, Client shall pay for all costs incurred.</li>
            <li>Contractor shall maintain appropriate insurance throughout the duration of the project.</li>
            <li>This agreement may be cancelled by the Client within three business days following the signing of this agreement.</li>
          </ol>
        </div>
        
        <div class="grid grid-cols-2 gap-4 mt-8">
          <div>
            <p class="font-bold">Contractor:</p>
            <p class="border-b mt-6 pt-2"></p>
            <p>Authorized Signature / Date</p>
          </div>
          <div>
            <p class="font-bold">Client:</p>
            <p class="border-b mt-6 pt-2"></p>
            <p>Signature / Date</p>
          </div>
        </div>
      </div>
    `;
  }
}

export const storage = new MemStorage();

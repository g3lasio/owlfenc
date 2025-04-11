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
  InsertChatLog
} from "@shared/schema";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
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
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private projects: Map<number, Project>;
  private templates: Map<number, Template>;
  private settings: Map<number, Settings>;

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

  private chatLogs: Map<number, ChatLog>;
  private currentIds: {
    users: number;
    projects: number;
    templates: number;
    settings: number;
    chatLogs: number;
  };

  constructor() {
    this.users = new Map();
    this.projects = new Map();
    this.templates = new Map();
    this.settings = new Map();
    this.chatLogs = new Map();
    this.currentIds = {
      users: 1,
      projects: 1,
      templates: 1,
      settings: 1,
      chatLogs: 1
    };
    
    // Add some default data
    this.seedData();
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
  
  // Seed some initial data
  private seedData() {
    // Add a default user
    const user: User = {
      id: this.currentIds.users++,
      username: "john_contractor",
      password: "password123", // In a real app, this would be hashed
      company: "Acme Fencing",
      email: "john@acmefencing.com",
      phone: "(503) 555-1234",
      address: "123 Main St, Portland, OR 97204",
      license: "CCB #123456",
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

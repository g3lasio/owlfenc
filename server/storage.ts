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
  InsertPaymentHistory,
  ProjectPayment,
  InsertProjectPayment,
  Material,
  InsertMaterial,
  PromptTemplate,
  InsertPromptTemplate,
  PermitSearchHistory,
  InsertPermitSearchHistory,
  PropertySearchHistory,
  InsertPropertySearchHistory
} from "@shared/schema";

import { DatabaseStorage } from './DatabaseStorage';
import { FirebaseStorage } from './FirebaseStorage';

// Interfaz principal para todas las operaciones de almacenamiento
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
  
  // Project Payments methods
  getProjectPayment(id: number): Promise<ProjectPayment | undefined>;
  getProjectPaymentsByProjectId(projectId: number): Promise<ProjectPayment[]>;
  getProjectPaymentsByUserId(userId: number): Promise<ProjectPayment[]>;
  getProjectPaymentsByCheckoutSessionId(sessionId: string): Promise<ProjectPayment[]>;
  createProjectPayment(payment: InsertProjectPayment): Promise<ProjectPayment>;
  updateProjectPayment(id: number, payment: Partial<ProjectPayment>): Promise<ProjectPayment>;

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
  
  // Material methods
  getMaterialsByCategory(category: string): Promise<Material[]>;
  createMaterial(material: InsertMaterial): Promise<Material>;
  updateMaterial(id: number, material: Partial<Material>): Promise<Material>;
  
  // Prompt Template methods
  getPromptTemplate(id: number): Promise<PromptTemplate | undefined>;
  getPromptTemplatesByUserId(userId: number): Promise<PromptTemplate[]>;
  getPromptTemplatesByCategory(userId: number, category: string): Promise<PromptTemplate[]>;
  getDefaultPromptTemplate(userId: number, category: string): Promise<PromptTemplate | undefined>;
  createPromptTemplate(template: InsertPromptTemplate): Promise<PromptTemplate>;
  updatePromptTemplate(id: number, template: Partial<PromptTemplate>): Promise<PromptTemplate>;
  deletePromptTemplate(id: number): Promise<boolean>;
  
  // Permit Search History methods
  getPermitSearchHistory(id: number): Promise<PermitSearchHistory | undefined>;
  getPermitSearchHistoryByUserId(userId: number): Promise<PermitSearchHistory[]>;
  createPermitSearchHistory(history: InsertPermitSearchHistory): Promise<PermitSearchHistory>;

  // Property Search History methods
  getPropertySearchHistory(id: number): Promise<PropertySearchHistory | undefined>;
  getPropertySearchHistoryByUserId(userId: number): Promise<PropertySearchHistory[]>;
  createPropertySearchHistory(history: InsertPropertySearchHistory): Promise<PropertySearchHistory>;
  updatePropertySearchHistory(id: number, data: Partial<PropertySearchHistory>): Promise<PropertySearchHistory>;
  
  // Sistema de salud
  healthCheck(): Promise<boolean>;
}

// Clase para el manejo de caché en memoria
class MemoryCache {
  private cache: Map<string, { data: any, timestamp: number }> = new Map();
  private defaultTTL: number = 5 * 60 * 1000; // 5 minutos por defecto
  
  constructor(defaultTTL?: number) {
    if (defaultTTL) {
      this.defaultTTL = defaultTTL;
    }
  }
  
  set(key: string, value: any, ttl?: number): void {
    const expiry = ttl || this.defaultTTL;
    this.cache.set(key, {
      data: value,
      timestamp: Date.now() + expiry
    });
  }
  
  get<T>(key: string): T | undefined {
    const item = this.cache.get(key);
    
    // Si no existe o ha expirado
    if (!item || item.timestamp < Date.now()) {
      if (item) this.cache.delete(key); // Limpiar entradas expiradas
      return undefined;
    }
    
    return item.data as T;
  }
  
  invalidate(keyPattern: string): void {
    // Convertir el iterador a array para evitar problemas de tipos
    const keys = Array.from(this.cache.keys());
    for (const key of keys) {
      if (key.includes(keyPattern)) {
        this.cache.delete(key);
      }
    }
  }
  
  clear(): void {
    this.cache.clear();
  }
}

// Implementación de storage con failover y caché
export class StorageManager implements IStorage {
  private primaryStorage: IStorage;
  private backupStorage: IStorage | null = null;
  private cache: MemoryCache;
  private useBackup: boolean = false;
  private failureCounts: Map<string, number> = new Map();
  private maxFailures: number = 3;
  private readonly CACHE_TTL = 10 * 60 * 1000; // 10 minutos para datos que cambian con poca frecuencia
  private readonly SHORT_CACHE_TTL = 60 * 1000; // 1 minuto para datos que cambian frecuentemente
  
  constructor(
    primary: IStorage,
    backup?: IStorage,
    cacheTTL: number = 5 * 60 * 1000
  ) {
    this.primaryStorage = primary;
    this.backupStorage = backup || null;
    this.cache = new MemoryCache(cacheTTL);
    
    // Monitoreo periódico de la salud del almacenamiento principal
    if (this.backupStorage) {
      setInterval(async () => {
        if (this.useBackup) {
          try {
            const isHealthy = await this.primaryStorage.healthCheck();
            if (isHealthy) {
              console.log('El almacenamiento principal ha vuelto. Cambiando de vuelta.');
              this.useBackup = false;
              this.cache.clear(); // Limpiar caché para evitar datos obsoletos
            }
          } catch (error) {
            console.log('El almacenamiento principal sigue caído.');
          }
        }
      }, 60000); // Verificar cada minuto
    }
  }
  
  private async executeWithFailover<T>(
    method: string,
    primaryAction: () => Promise<T>,
    backupAction: () => Promise<T>,
    cacheKey?: string,
    cacheTTL?: number,
    invalidatePattern?: string
  ): Promise<T> {
    // Verificar caché si se proporciona una clave
    if (cacheKey) {
      const cachedValue = this.cache.get<T>(cacheKey);
      if (cachedValue !== undefined) {
        return cachedValue;
      }
    }
    
    try {
      let result: T;
      
      if (this.useBackup && this.backupStorage) {
        result = await backupAction();
      } else {
        result = await primaryAction();
      }
      
      // Éxito: resetear contador de fallos
      this.failureCounts.set(method, 0);
      
      // Almacenar en caché si es necesario
      if (cacheKey && result) {
        this.cache.set(cacheKey, result, cacheTTL);
      }
      
      // Invalidar patrones de caché relacionados si es necesario
      if (invalidatePattern) {
        this.cache.invalidate(invalidatePattern);
      }
      
      return result;
    } catch (error) {
      // Aumentar el contador de fallos para este método
      const currentFailures = this.failureCounts.get(method) || 0;
      this.failureCounts.set(method, currentFailures + 1);
      
      // Si superamos el umbral y tenemos almacenamiento de respaldo, cambiar
      if (currentFailures + 1 >= this.maxFailures && this.backupStorage && !this.useBackup) {
        console.log(`Cambiando a almacenamiento de respaldo después de ${currentFailures + 1} fallos en ${method}`);
        this.useBackup = true;
      }
      
      // Si ya estamos usando el respaldo o no tenemos respaldo, simplemente pasar el error
      if (this.useBackup && this.backupStorage) {
        try {
          const result = await backupAction();
          
          // Almacenar en caché si es necesario
          if (cacheKey && result) {
            this.cache.set(cacheKey, result, cacheTTL);
          }
          
          return result;
        } catch (backupError) {
          console.error(`Error en almacenamiento de respaldo para ${method}:`, backupError);
          throw backupError;
        }
      } else {
        console.error(`Error en método ${method}:`, error);
        throw error;
      }
    }
  }

  // Implementación de métodos de IStorage
  async healthCheck(): Promise<boolean> {
    try {
      return this.useBackup && this.backupStorage 
        ? await this.backupStorage.healthCheck()
        : await this.primaryStorage.healthCheck();
    } catch (error) {
      return false;
    }
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.executeWithFailover<User | undefined>(
      'getUser',
      () => this.primaryStorage.getUser(id),
      () => this.backupStorage!.getUser(id),
      `user_${id}`,
      this.CACHE_TTL
    );
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return this.executeWithFailover<User | undefined>(
      'getUserByUsername',
      () => this.primaryStorage.getUserByUsername(username),
      () => this.backupStorage!.getUserByUsername(username),
      `user_username_${username}`,
      this.CACHE_TTL
    );
  }

  async createUser(user: InsertUser): Promise<User> {
    return this.executeWithFailover<User>(
      'createUser',
      () => this.primaryStorage.createUser(user),
      () => this.backupStorage!.createUser(user),
      undefined,
      undefined,
      'user_'
    );
  }

  async updateUser(id: number, userData: Partial<User>): Promise<User> {
    return this.executeWithFailover<User>(
      'updateUser',
      () => this.primaryStorage.updateUser(id, userData),
      () => this.backupStorage!.updateUser(id, userData),
      undefined,
      undefined,
      `user_${id}`
    );
  }

  // Project methods
  async getProject(id: number): Promise<Project | undefined> {
    return this.executeWithFailover<Project | undefined>(
      'getProject',
      () => this.primaryStorage.getProject(id),
      () => this.backupStorage!.getProject(id),
      `project_${id}`,
      this.CACHE_TTL
    );
  }

  async getProjectByProjectId(projectId: string): Promise<Project | undefined> {
    return this.executeWithFailover<Project | undefined>(
      'getProjectByProjectId',
      () => this.primaryStorage.getProjectByProjectId(projectId),
      () => this.backupStorage!.getProjectByProjectId(projectId),
      `project_id_${projectId}`,
      this.CACHE_TTL
    );
  }

  async getProjectsByUserId(userId: number): Promise<Project[]> {
    return this.executeWithFailover<Project[]>(
      'getProjectsByUserId',
      () => this.primaryStorage.getProjectsByUserId(userId),
      () => this.backupStorage!.getProjectsByUserId(userId),
      `projects_user_${userId}`,
      this.SHORT_CACHE_TTL
    );
  }

  async createProject(project: InsertProject): Promise<Project> {
    return this.executeWithFailover<Project>(
      'createProject',
      () => this.primaryStorage.createProject(project),
      () => this.backupStorage!.createProject(project),
      undefined,
      undefined,
      `projects_user_${project.userId}`
    );
  }

  async updateProject(id: number, projectData: Partial<Project>): Promise<Project> {
    return this.executeWithFailover<Project>(
      'updateProject',
      () => this.primaryStorage.updateProject(id, projectData),
      () => this.backupStorage!.updateProject(id, projectData),
      undefined,
      undefined,
      'project_'
    );
  }

  // Template methods
  async getTemplate(id: number): Promise<Template | undefined> {
    return this.executeWithFailover<Template | undefined>(
      'getTemplate',
      () => this.primaryStorage.getTemplate(id),
      () => this.backupStorage!.getTemplate(id),
      `template_${id}`,
      this.CACHE_TTL
    );
  }

  async getTemplatesByType(userId: number, type: string): Promise<Template[]> {
    return this.executeWithFailover<Template[]>(
      'getTemplatesByType',
      () => this.primaryStorage.getTemplatesByType(userId, type),
      () => this.backupStorage!.getTemplatesByType(userId, type),
      `templates_${userId}_${type}`,
      this.CACHE_TTL
    );
  }

  async getDefaultTemplate(userId: number, type: string): Promise<Template | undefined> {
    return this.executeWithFailover<Template | undefined>(
      'getDefaultTemplate',
      () => this.primaryStorage.getDefaultTemplate(userId, type),
      () => this.backupStorage!.getDefaultTemplate(userId, type),
      `template_default_${userId}_${type}`,
      this.CACHE_TTL
    );
  }

  async createTemplate(template: InsertTemplate): Promise<Template> {
    return this.executeWithFailover<Template>(
      'createTemplate',
      () => this.primaryStorage.createTemplate(template),
      () => this.backupStorage!.createTemplate(template),
      undefined,
      undefined,
      `templates_${template.userId}`
    );
  }

  async updateTemplate(id: number, templateData: Partial<Template>): Promise<Template> {
    return this.executeWithFailover<Template>(
      'updateTemplate',
      () => this.primaryStorage.updateTemplate(id, templateData),
      () => this.backupStorage!.updateTemplate(id, templateData),
      undefined,
      undefined,
      'template_'
    );
  }

  // Settings methods
  async getSettings(userId: number): Promise<Settings | undefined> {
    return this.executeWithFailover<Settings | undefined>(
      'getSettings',
      () => this.primaryStorage.getSettings(userId),
      () => this.backupStorage!.getSettings(userId),
      `settings_${userId}`,
      this.CACHE_TTL
    );
  }

  async createSettings(settings: InsertSettings): Promise<Settings> {
    return this.executeWithFailover<Settings>(
      'createSettings',
      () => this.primaryStorage.createSettings(settings),
      () => this.backupStorage!.createSettings(settings),
      undefined,
      undefined,
      `settings_${settings.userId}`
    );
  }

  async updateSettings(userId: number, settingsData: Partial<Settings>): Promise<Settings> {
    return this.executeWithFailover<Settings>(
      'updateSettings',
      () => this.primaryStorage.updateSettings(userId, settingsData),
      () => this.backupStorage!.updateSettings(userId, settingsData),
      undefined,
      undefined,
      `settings_${userId}`
    );
  }

  // Chat log methods
  async getChatLog(projectId: number): Promise<ChatLog | undefined> {
    return this.executeWithFailover<ChatLog | undefined>(
      'getChatLog',
      () => this.primaryStorage.getChatLog(projectId),
      () => this.backupStorage!.getChatLog(projectId),
      `chatlog_${projectId}`,
      this.SHORT_CACHE_TTL
    );
  }

  async createChatLog(chatLog: InsertChatLog): Promise<ChatLog> {
    return this.executeWithFailover<ChatLog>(
      'createChatLog',
      () => this.primaryStorage.createChatLog(chatLog),
      () => this.backupStorage!.createChatLog(chatLog),
      undefined,
      undefined,
      `chatlog_${chatLog.projectId}`
    );
  }

  async updateChatLog(id: number, messages: any): Promise<ChatLog> {
    return this.executeWithFailover<ChatLog>(
      'updateChatLog',
      () => this.primaryStorage.updateChatLog(id, messages),
      () => this.backupStorage!.updateChatLog(id, messages),
      undefined,
      undefined,
      `chatlog_`
    );
  }

  // Client methods
  async getClient(id: number): Promise<Client | undefined> {
    return this.executeWithFailover<Client | undefined>(
      'getClient',
      () => this.primaryStorage.getClient(id),
      () => this.backupStorage!.getClient(id),
      `client_${id}`,
      this.CACHE_TTL
    );
  }

  async getClientByClientId(clientId: string): Promise<Client | undefined> {
    return this.executeWithFailover<Client | undefined>(
      'getClientByClientId',
      () => this.primaryStorage.getClientByClientId(clientId),
      () => this.backupStorage!.getClientByClientId(clientId),
      `client_id_${clientId}`,
      this.CACHE_TTL
    );
  }

  async getClientsByUserId(userId: number): Promise<Client[]> {
    return this.executeWithFailover<Client[]>(
      'getClientsByUserId',
      () => this.primaryStorage.getClientsByUserId(userId),
      () => this.backupStorage!.getClientsByUserId(userId),
      `clients_user_${userId}`,
      this.SHORT_CACHE_TTL
    );
  }

  async createClient(client: InsertClient): Promise<Client> {
    return this.executeWithFailover<Client>(
      'createClient',
      () => this.primaryStorage.createClient(client),
      () => this.backupStorage!.createClient(client),
      undefined,
      undefined,
      `clients_user_${client.userId}`
    );
  }

  async updateClient(id: number, clientData: Partial<Client>): Promise<Client> {
    return this.executeWithFailover<Client>(
      'updateClient',
      () => this.primaryStorage.updateClient(id, clientData),
      () => this.backupStorage!.updateClient(id, clientData),
      undefined,
      undefined,
      'client_'
    );
  }

  async deleteClient(id: number): Promise<boolean> {
    return this.executeWithFailover<boolean>(
      'deleteClient',
      () => this.primaryStorage.deleteClient(id),
      () => this.backupStorage!.deleteClient(id),
      undefined,
      undefined,
      'client_'
    );
  }

  // Subscription Plan methods
  async getSubscriptionPlan(id: number): Promise<SubscriptionPlan | undefined> {
    return this.executeWithFailover<SubscriptionPlan | undefined>(
      'getSubscriptionPlan',
      () => this.primaryStorage.getSubscriptionPlan(id),
      () => this.backupStorage!.getSubscriptionPlan(id),
      `subscription_plan_${id}`,
      this.CACHE_TTL
    );
  }

  async getSubscriptionPlanByCode(code: string): Promise<SubscriptionPlan | undefined> {
    return this.executeWithFailover<SubscriptionPlan | undefined>(
      'getSubscriptionPlanByCode',
      () => this.primaryStorage.getSubscriptionPlanByCode(code),
      () => this.backupStorage!.getSubscriptionPlanByCode(code),
      `subscription_plan_code_${code}`,
      this.CACHE_TTL
    );
  }

  async getAllSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    return this.executeWithFailover<SubscriptionPlan[]>(
      'getAllSubscriptionPlans',
      () => this.primaryStorage.getAllSubscriptionPlans(),
      () => this.backupStorage!.getAllSubscriptionPlans(),
      'subscription_plans_all',
      this.CACHE_TTL
    );
  }

  async createSubscriptionPlan(plan: InsertSubscriptionPlan): Promise<SubscriptionPlan> {
    return this.executeWithFailover<SubscriptionPlan>(
      'createSubscriptionPlan',
      () => this.primaryStorage.createSubscriptionPlan(plan),
      () => this.backupStorage!.createSubscriptionPlan(plan),
      undefined,
      undefined,
      'subscription_plan_'
    );
  }

  async updateSubscriptionPlan(id: number, planData: Partial<SubscriptionPlan>): Promise<SubscriptionPlan> {
    return this.executeWithFailover<SubscriptionPlan>(
      'updateSubscriptionPlan',
      () => this.primaryStorage.updateSubscriptionPlan(id, planData),
      () => this.backupStorage!.updateSubscriptionPlan(id, planData),
      undefined,
      undefined,
      'subscription_plan_'
    );
  }

  // User Subscription methods
  async getUserSubscription(id: number): Promise<UserSubscription | undefined> {
    return this.executeWithFailover<UserSubscription | undefined>(
      'getUserSubscription',
      () => this.primaryStorage.getUserSubscription(id),
      () => this.backupStorage!.getUserSubscription(id),
      `user_subscription_${id}`,
      this.SHORT_CACHE_TTL
    );
  }

  async getUserSubscriptionByUserId(userId: number): Promise<UserSubscription | undefined> {
    return this.executeWithFailover<UserSubscription | undefined>(
      'getUserSubscriptionByUserId',
      () => this.primaryStorage.getUserSubscriptionByUserId(userId),
      () => this.backupStorage!.getUserSubscriptionByUserId(userId),
      `user_subscription_user_${userId}`,
      this.SHORT_CACHE_TTL
    );
  }

  async createUserSubscription(subscription: InsertUserSubscription): Promise<UserSubscription> {
    return this.executeWithFailover<UserSubscription>(
      'createUserSubscription',
      () => this.primaryStorage.createUserSubscription(subscription),
      () => this.backupStorage!.createUserSubscription(subscription),
      undefined,
      undefined,
      `user_subscription_user_${subscription.userId}`
    );
  }

  async updateUserSubscription(id: number, subscriptionData: Partial<UserSubscription>): Promise<UserSubscription> {
    return this.executeWithFailover<UserSubscription>(
      'updateUserSubscription',
      () => this.primaryStorage.updateUserSubscription(id, subscriptionData),
      () => this.backupStorage!.updateUserSubscription(id, subscriptionData),
      undefined,
      undefined,
      'user_subscription_'
    );
  }

  // Payment History methods
  async getPaymentHistory(id: number): Promise<PaymentHistory | undefined> {
    return this.executeWithFailover<PaymentHistory | undefined>(
      'getPaymentHistory',
      () => this.primaryStorage.getPaymentHistory(id),
      () => this.backupStorage!.getPaymentHistory(id),
      `payment_history_${id}`,
      this.CACHE_TTL
    );
  }

  async getPaymentHistoryByUserId(userId: number): Promise<PaymentHistory[]> {
    return this.executeWithFailover<PaymentHistory[]>(
      'getPaymentHistoryByUserId',
      () => this.primaryStorage.getPaymentHistoryByUserId(userId),
      () => this.backupStorage!.getPaymentHistoryByUserId(userId),
      `payment_history_user_${userId}`,
      this.SHORT_CACHE_TTL
    );
  }

  async createPaymentHistory(payment: InsertPaymentHistory): Promise<PaymentHistory> {
    return this.executeWithFailover<PaymentHistory>(
      'createPaymentHistory',
      () => this.primaryStorage.createPaymentHistory(payment),
      () => this.backupStorage!.createPaymentHistory(payment),
      undefined,
      undefined,
      `payment_history_user_${payment.userId}`
    );
  }

  // Material methods
  async getMaterialsByCategory(category: string): Promise<Material[]> {
    return this.executeWithFailover<Material[]>(
      'getMaterialsByCategory',
      () => this.primaryStorage.getMaterialsByCategory(category),
      () => this.backupStorage!.getMaterialsByCategory(category),
      `materials_category_${category}`,
      this.CACHE_TTL
    );
  }

  async createMaterial(material: InsertMaterial): Promise<Material> {
    return this.executeWithFailover<Material>(
      'createMaterial',
      () => this.primaryStorage.createMaterial(material),
      () => this.backupStorage!.createMaterial(material),
      undefined,
      undefined,
      `materials_category_${material.category}`
    );
  }

  async updateMaterial(id: number, materialData: Partial<Material>): Promise<Material> {
    return this.executeWithFailover<Material>(
      'updateMaterial',
      () => this.primaryStorage.updateMaterial(id, materialData),
      () => this.backupStorage!.updateMaterial(id, materialData),
      undefined,
      undefined,
      'materials_category_'
    );
  }

  // Prompt Template methods
  async getPromptTemplate(id: number): Promise<PromptTemplate | undefined> {
    return this.executeWithFailover<PromptTemplate | undefined>(
      'getPromptTemplate',
      () => this.primaryStorage.getPromptTemplate(id),
      () => this.backupStorage!.getPromptTemplate(id),
      `prompt_template_${id}`,
      this.CACHE_TTL
    );
  }

  async getPromptTemplatesByUserId(userId: number): Promise<PromptTemplate[]> {
    return this.executeWithFailover<PromptTemplate[]>(
      'getPromptTemplatesByUserId',
      () => this.primaryStorage.getPromptTemplatesByUserId(userId),
      () => this.backupStorage!.getPromptTemplatesByUserId(userId),
      `prompt_templates_user_${userId}`,
      this.CACHE_TTL
    );
  }

  async getPromptTemplatesByCategory(userId: number, category: string): Promise<PromptTemplate[]> {
    return this.executeWithFailover<PromptTemplate[]>(
      'getPromptTemplatesByCategory',
      () => this.primaryStorage.getPromptTemplatesByCategory(userId, category),
      () => this.backupStorage!.getPromptTemplatesByCategory(userId, category),
      `prompt_templates_${userId}_${category}`,
      this.CACHE_TTL
    );
  }

  async getDefaultPromptTemplate(userId: number, category: string): Promise<PromptTemplate | undefined> {
    return this.executeWithFailover<PromptTemplate | undefined>(
      'getDefaultPromptTemplate',
      () => this.primaryStorage.getDefaultPromptTemplate(userId, category),
      () => this.backupStorage!.getDefaultPromptTemplate(userId, category),
      `prompt_template_default_${userId}_${category}`,
      this.CACHE_TTL
    );
  }

  async createPromptTemplate(template: InsertPromptTemplate): Promise<PromptTemplate> {
    return this.executeWithFailover<PromptTemplate>(
      'createPromptTemplate',
      () => this.primaryStorage.createPromptTemplate(template),
      () => this.backupStorage!.createPromptTemplate(template),
      undefined,
      undefined,
      `prompt_templates_${template.userId}`
    );
  }

  async updatePromptTemplate(id: number, templateData: Partial<PromptTemplate>): Promise<PromptTemplate> {
    return this.executeWithFailover<PromptTemplate>(
      'updatePromptTemplate',
      () => this.primaryStorage.updatePromptTemplate(id, templateData),
      () => this.backupStorage!.updatePromptTemplate(id, templateData),
      undefined,
      undefined,
      'prompt_template_'
    );
  }

  async deletePromptTemplate(id: number): Promise<boolean> {
    return this.executeWithFailover<boolean>(
      'deletePromptTemplate',
      () => this.primaryStorage.deletePromptTemplate(id),
      () => this.backupStorage!.deletePromptTemplate(id),
      undefined,
      undefined,
      'prompt_template_'
    );
  }

  // Permit Search History methods
  async getPermitSearchHistory(id: number): Promise<PermitSearchHistory | undefined> {
    return this.executeWithFailover<PermitSearchHistory | undefined>(
      'getPermitSearchHistory',
      () => this.primaryStorage.getPermitSearchHistory(id),
      () => this.backupStorage!.getPermitSearchHistory(id),
      `permit_search_history_${id}`,
      this.CACHE_TTL
    );
  }

  async getPermitSearchHistoryByUserId(userId: number): Promise<PermitSearchHistory[]> {
    return this.executeWithFailover<PermitSearchHistory[]>(
      'getPermitSearchHistoryByUserId',
      () => this.primaryStorage.getPermitSearchHistoryByUserId(userId),
      () => this.backupStorage!.getPermitSearchHistoryByUserId(userId),
      `permit_search_history_user_${userId}`,
      this.SHORT_CACHE_TTL
    );
  }

  async createPermitSearchHistory(history: InsertPermitSearchHistory): Promise<PermitSearchHistory> {
    return this.executeWithFailover<PermitSearchHistory>(
      'createPermitSearchHistory',
      () => this.primaryStorage.createPermitSearchHistory(history),
      () => this.backupStorage!.createPermitSearchHistory(history),
      undefined,
      undefined,
      `permit_search_history_user_${history.userId}`
    );
  }

  // Property Search History methods
  async getPropertySearchHistory(id: number): Promise<PropertySearchHistory | undefined> {
    return this.executeWithFailover<PropertySearchHistory | undefined>(
      'getPropertySearchHistory',
      () => this.primaryStorage.getPropertySearchHistory(id),
      () => this.backupStorage!.getPropertySearchHistory(id),
      `property_search_history_${id}`,
      this.CACHE_TTL
    );
  }

  async getPropertySearchHistoryByUserId(userId: number): Promise<PropertySearchHistory[]> {
    return this.executeWithFailover<PropertySearchHistory[]>(
      'getPropertySearchHistoryByUserId',
      () => this.primaryStorage.getPropertySearchHistoryByUserId(userId),
      () => this.backupStorage!.getPropertySearchHistoryByUserId(userId),
      `property_search_history_user_${userId}`,
      this.SHORT_CACHE_TTL
    );
  }

  async createPropertySearchHistory(history: InsertPropertySearchHistory): Promise<PropertySearchHistory> {
    return this.executeWithFailover<PropertySearchHistory>(
      'createPropertySearchHistory',
      () => this.primaryStorage.createPropertySearchHistory(history),
      () => this.backupStorage!.createPropertySearchHistory(history),
      undefined,
      undefined,
      `property_search_history_user_${history.userId}`
    );
  }
  
  async updatePropertySearchHistory(id: number, data: Partial<PropertySearchHistory>): Promise<PropertySearchHistory> {
    return this.executeWithFailover<PropertySearchHistory>(
      'updatePropertySearchHistory',
      () => this.primaryStorage.updatePropertySearchHistory(id, data),
      () => this.backupStorage!.updatePropertySearchHistory(id, data),
      undefined,
      undefined,
      `property_search_history_`
    );
  }
}

// Por defecto usamos PostgreSQL como almacenamiento principal
const databaseStorage = new DatabaseStorage();

// Vamos a utilizar solo el almacenamiento principal de PostgreSQL
// pero con manejo de errores mejorado en el StorageManager
export const storage = new StorageManager(databaseStorage);

// NOTA: La implementación de Firebase necesita completarse antes de utilizarla
// como respaldo. Para habilitarla después:
// const firebaseStorage = new FirebaseStorage();
// export const storage = new StorageManager(databaseStorage, firebaseStorage);
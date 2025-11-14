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
  PropertySearchHistory,
  InsertPropertySearchHistory,
  PromptTemplate,
  InsertPromptTemplate,
  PermitSearchHistory,
  InsertPermitSearchHistory,
  users,
  projects,
  templates,
  settings,
  chatLogs,
  clients,
  subscriptionPlans,
  userSubscriptions,
  paymentHistory,
  projectPayments,
  materials,
  promptTemplates,
  permitSearchHistory,
  propertySearchHistory
} from "@shared/schema";

import { db } from './db';
import { eq, and, desc, asc, isNull, isNotNull, sql } from 'drizzle-orm';
import { IStorage } from './storage';

export class DatabaseStorage implements IStorage {
  constructor() {}
  
  async healthCheck(): Promise<boolean> {
    try {
      if (!db) {
        console.error('Database connection not available');
        return false;
      }
      // Realizamos una consulta simple para verificar la conexión
      await db.execute(sql`SELECT 1`);
      return true;
    } catch (error) {
      console.error('Error en healthCheck de base de datos:', error);
      return false;
    }
  }
  
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    if (!db) throw new Error('Database connection not available');
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    if (!db) throw new Error('Database connection not available');
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByFirebaseUid(firebaseUid: string): Promise<User | undefined> {
    if (!db) throw new Error('Database connection not available');
    const [user] = await db.select().from(users).where(eq(users.firebaseUid, firebaseUid));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    if (!db) throw new Error('Database connection not available');
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: number, userData: Partial<User>): Promise<User> {
    if (!db) throw new Error('Database connection not available');
    const [user] = await db
      .update(users)
      .set(userData)
      .where(eq(users.id, id))
      .returning();
    
    if (!user) {
      throw new Error(`User with ID ${id} not found`);
    }
    
    return user;
  }
  
  async updateStripeConnectAccountId(userId: number, accountId: string): Promise<User> {
    if (!db) throw new Error('Database connection not available');
    const [user] = await db
      .update(users)
      .set({ stripeConnectAccountId: accountId })
      .where(eq(users.id, userId))
      .returning();
      
    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }
    
    return user;
  }

  // Project methods
  async getProject(id: number): Promise<Project | undefined> {
    if (!db) throw new Error('Database connection not available');
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project;
  }

  async getProjectByProjectId(projectId: string): Promise<Project | undefined> {
    if (!db) throw new Error('Database connection not available');
    const [project] = await db.select().from(projects).where(eq(projects.projectId, projectId));
    return project;
  }

  async getProjectsByUserId(userId: number): Promise<Project[]> {
    if (!db) throw new Error('Database connection not available');
    return db.select()
      .from(projects)
      .where(eq(projects.userId, userId))
      .orderBy(desc(projects.createdAt));
  }

  async createProject(insertProject: InsertProject): Promise<Project> {
    if (!db) throw new Error('Database connection not available');
    const [project] = await db.insert(projects).values(insertProject).returning();
    return project;
  }

  async updateProject(id: number, projectData: Partial<Project>): Promise<Project> {
    if (!db) throw new Error('Database connection not available');
    const [project] = await db
      .update(projects)
      .set({
        ...projectData,
        updatedAt: new Date()
      })
      .where(eq(projects.id, id))
      .returning();
    
    if (!project) {
      throw new Error(`Project with ID ${id} not found`);
    }
    
    return project;
  }

  // Template methods
  async getTemplate(id: number): Promise<Template | undefined> {
    const [template] = await db.select().from(templates).where(eq(templates.id, id));
    return template;
  }

  async getTemplatesByType(type: string): Promise<Template[]> {
    if (!db) throw new Error('Database connection not available');
    // Note: templates table doesn't have 'type' column, returning all templates for now
    return db.select()
      .from(templates)
      .orderBy(asc(templates.name));
  }
  
  async getTemplatesByTypeAndUser(type: string, userId: number): Promise<Template[]> {
    if (!db) throw new Error('Database connection not available');
    // Note: templates table doesn't have 'type' column, returning user templates for now
    return db.select()
      .from(templates)
      .where(eq(templates.userId, userId))
      .orderBy(asc(templates.name));
  }
  
  async getTemplatesByUser(userId: number): Promise<Template[]> {
    return db.select()
      .from(templates)
      .where(eq(templates.userId, userId))
      .orderBy(asc(templates.name));
  }
  
  async getAllTemplates(): Promise<Template[]> {
    return db.select()
      .from(templates)
      .orderBy(asc(templates.name));
  }

  async getDefaultTemplate(userId: number, type: string): Promise<Template | undefined> {
    if (!db) throw new Error('Database connection not available');
    // Note: templates table doesn't have 'type' or 'isDefault' columns, returning first user template
    const [template] = await db.select()
      .from(templates)
      .where(eq(templates.userId, userId))
      .limit(1);
    return template;
  }

  async createTemplate(insertTemplate: InsertTemplate): Promise<Template> {
    if (!db) throw new Error('Database connection not available');
    // Note: templates table doesn't have 'isDefault' or 'type' columns, simplified implementation
    const [template] = await db.insert(templates).values(insertTemplate).returning();
    return template;
  }

  async updateTemplate(id: number, templateData: Partial<Template>): Promise<Template> {
    if (!db) throw new Error('Database connection not available');
    // Note: templates table doesn't have 'isDefault' or 'type' columns, simplified implementation
    const [template] = await db
      .update(templates)
      .set(templateData)
      .where(eq(templates.id, id))
      .returning();
    
    if (!template) {
      throw new Error(`Template with ID ${id} not found`);
    }
    
    return template;
  }
  
  async deleteTemplate(id: number): Promise<boolean> {
    if (!db) throw new Error('Database connection not available');
    await db
      .delete(templates)
      .where(eq(templates.id, id));
    
    return true;
  }

  // Settings methods
  async getSettings(userId: number): Promise<Settings | undefined> {
    const [userSettings] = await db.select()
      .from(settings)
      .where(eq(settings.userId, userId));
    return userSettings;
  }

  async createSettings(insertSettings: InsertSettings): Promise<Settings> {
    const [userSettings] = await db.insert(settings).values(insertSettings).returning();
    return userSettings;
  }

  async updateSettings(userId: number, settingsData: Partial<Settings>): Promise<Settings> {
    // Primero verificamos si existen configuraciones para este usuario
    const existingSettings = await this.getSettings(userId);
    
    if (!existingSettings) {
      // Si no existen, las creamos con los datos proporcionados
      return this.createSettings({
        userId,
        ...settingsData,
      } as InsertSettings);
    }

    // Si existen, las actualizamos
    const [updatedSettings] = await db
      .update(settings)
      .set({
        ...settingsData,
        updatedAt: new Date()
      })
      .where(eq(settings.userId, userId))
      .returning();
    
    if (!updatedSettings) {
      throw new Error(`Settings for user ${userId} not found`);
    }
    
    return updatedSettings;
  }

  // Chat log methods
  async getChatLog(projectId: number): Promise<ChatLog | undefined> {
    const [log] = await db.select()
      .from(chatLogs)
      .where(eq(chatLogs.projectId, projectId));
    return log;
  }

  async createChatLog(insertChatLog: InsertChatLog): Promise<ChatLog> {
    const [chatLog] = await db.insert(chatLogs).values(insertChatLog).returning();
    return chatLog;
  }

  async updateChatLog(id: number, messages: any): Promise<ChatLog> {
    const [chatLog] = await db
      .update(chatLogs)
      .set({
        messages,
        updatedAt: new Date()
      })
      .where(eq(chatLogs.id, id))
      .returning();
    
    if (!chatLog) {
      throw new Error(`Chat log with ID ${id} not found`);
    }
    
    return chatLog;
  }

  // Client methods
  async getClient(id: number): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(eq(clients.id, id));
    return client;
  }

  async getClientByClientId(clientId: string): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(eq(clients.clientId, clientId));
    return client;
  }

  async getClientsByUserId(userId: number): Promise<Client[]> {
    return db.select()
      .from(clients)
      .where(eq(clients.userId, userId))
      .orderBy(desc(clients.createdAt));
  }

  async createClient(insertClient: InsertClient): Promise<Client> {
    const [client] = await db.insert(clients).values(insertClient).returning();
    return client;
  }

  async updateClient(id: number, clientData: Partial<Client>): Promise<Client> {
    const [client] = await db
      .update(clients)
      .set({
        ...clientData,
        updatedAt: new Date()
      })
      .where(eq(clients.id, id))
      .returning();
    
    if (!client) {
      throw new Error(`Client with ID ${id} not found`);
    }
    
    return client;
  }

  async deleteClient(id: number): Promise<boolean> {
    const result = await db
      .delete(clients)
      .where(eq(clients.id, id));
    
    return true; // Si llegamos aquí, es que la operación fue exitosa
  }

  // Subscription Plan methods
  async getSubscriptionPlan(id: number): Promise<SubscriptionPlan | undefined> {
    const [plan] = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.id, id));
    return plan;
  }

  async getSubscriptionPlanByCode(code: string): Promise<SubscriptionPlan | undefined> {
    const [plan] = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.code, code));
    return plan;
  }

  async getAllSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    return db.select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.is_active, true))
      .orderBy(asc(subscriptionPlans.price));
  }

  async createSubscriptionPlan(insertPlan: InsertSubscriptionPlan): Promise<SubscriptionPlan> {
    const [plan] = await db.insert(subscriptionPlans).values(insertPlan).returning();
    return plan;
  }

  async updateSubscriptionPlan(id: number, planData: Partial<SubscriptionPlan>): Promise<SubscriptionPlan> {
    const [plan] = await db
      .update(subscriptionPlans)
      .set({
        ...planData,
        updatedAt: new Date()
      })
      .where(eq(subscriptionPlans.id, id))
      .returning();
    
    if (!plan) {
      throw new Error(`Subscription plan with ID ${id} not found`);
    }
    
    return plan;
  }

  // User Subscription methods  
  async getUserSubscription(id: number): Promise<UserSubscription | undefined> {
    if (!db) throw new Error('Database connection not available');
    const [subscription] = await db
      .select()
      .from(userSubscriptions)
      .where(eq(userSubscriptions.id, id));
    return subscription;
  }

  async getUserSubscriptionByUserId(userId: number): Promise<UserSubscription | undefined> {
    if (!db) throw new Error('Database connection not available');
    const [subscription] = await db
      .select()
      .from(userSubscriptions)
      .where(eq(userSubscriptions.userId, userId));
    return subscription;
  }

  async createUserSubscription(insertSubscription: InsertUserSubscription): Promise<UserSubscription> {
    if (!db) throw new Error('Database connection not available');
    const [subscription] = await db
      .insert(userSubscriptions)
      .values(insertSubscription)
      .returning();
    return subscription;
  }

  async updateUserSubscription(id: number, subscriptionData: Partial<UserSubscription>): Promise<UserSubscription> {
    if (!db) throw new Error('Database connection not available');
    const [subscription] = await db
      .update(userSubscriptions)
      .set({
        ...subscriptionData,
        updatedAt: new Date()
      })
      .where(eq(userSubscriptions.id, id))
      .returning();
    
    if (!subscription) {
      throw new Error(`User subscription with ID ${id} not found`);
    }
    
    return subscription;
  }

  // Payment History methods
  async getPaymentHistory(id: number): Promise<PaymentHistory | undefined> {
    if (!db) throw new Error('Database connection not available');
    const [payment] = await db
      .select()
      .from(paymentHistory)
      .where(eq(paymentHistory.id, id));
    return payment;
  }

  async getPaymentHistoryByUserId(userId: number): Promise<PaymentHistory[]> {
    if (!db) throw new Error('Database connection not available');
    return db.select()
      .from(paymentHistory)
      .where(eq(paymentHistory.userId, userId))
      .orderBy(desc(paymentHistory.createdAt));
  }

  async createPaymentHistory(insertPayment: InsertPaymentHistory): Promise<PaymentHistory> {
    const [payment] = await db
      .insert(paymentHistory)
      .values(insertPayment)
      .returning();
    return payment;
  }

  // Material methods
  async getMaterialsByCategory(category: string): Promise<Material[]> {
    return db.select()
      .from(materials)
      .where(eq(materials.category, category))
      .orderBy(asc(materials.name));
  }

  async getUserMaterials(firebaseUid: string): Promise<Material[]> {
    // First get the user by Firebase UID
    const user = await this.getUserByFirebaseUid(firebaseUid);
    if (!user) {
      return []; // No user found, return empty array
    }

    // Return materials for this specific user only
    return db.select()
      .from(materials)
      .where(eq(materials.userId, user.id))
      .orderBy(asc(materials.name));
  }
  
  async createMaterial(insertMaterial: InsertMaterial): Promise<Material> {
    const [material] = await db.insert(materials).values(insertMaterial).returning();
    return material;
  }
  
  async updateMaterial(id: number, materialData: Partial<Material>): Promise<Material> {
    const [material] = await db
      .update(materials)
      .set(materialData)
      .where(eq(materials.id, id))
      .returning();
    
    if (!material) {
      throw new Error(`Material with ID ${id} not found`);
    }
    
    return material;
  }

  // Prompt Template methods
  async getPromptTemplate(id: number): Promise<PromptTemplate | undefined> {
    const [template] = await db.select().from(promptTemplates).where(eq(promptTemplates.id, id));
    return template;
  }

  async getPromptTemplatesByUserId(userId: number): Promise<PromptTemplate[]> {
    return db.select()
      .from(promptTemplates)
      .where(eq(promptTemplates.userId, userId))
      .orderBy(desc(promptTemplates.createdAt));
  }

  async getPromptTemplatesByCategory(userId: number, category: string): Promise<PromptTemplate[]> {
    return db.select()
      .from(promptTemplates)
      .where(and(
        eq(promptTemplates.userId, userId),
        eq(promptTemplates.category, category)
      ))
      .orderBy(desc(promptTemplates.createdAt));
  }

  async getDefaultPromptTemplate(userId: number, category: string): Promise<PromptTemplate | undefined> {
    const [template] = await db.select()
      .from(promptTemplates)
      .where(and(
        eq(promptTemplates.userId, userId),
        eq(promptTemplates.category, category),
        eq(promptTemplates.isDefault, true)
      ));
    return template;
  }

  async createPromptTemplate(insertTemplate: InsertPromptTemplate): Promise<PromptTemplate> {
    // Si esta plantilla está marcada como predeterminada, desmarcar cualquier otra del mismo tipo
    if (insertTemplate.isDefault) {
      await db
        .update(promptTemplates)
        .set({ isDefault: false })
        .where(and(
          eq(promptTemplates.userId, insertTemplate.userId),
          eq(promptTemplates.category, insertTemplate.category),
          eq(promptTemplates.isDefault, true)
        ));
    }
    
    const [template] = await db.insert(promptTemplates).values(insertTemplate).returning();
    return template;
  }

  async updatePromptTemplate(id: number, templateData: Partial<PromptTemplate>): Promise<PromptTemplate> {
    // Si esta plantilla se está marcando como predeterminada, desmarcar cualquier otra
    if (templateData.isDefault) {
      const [currentTemplate] = await db.select().from(promptTemplates).where(eq(promptTemplates.id, id));
      
      if (currentTemplate) {
        // Desmarcar las otras plantillas predeterminadas de la misma categoría
        await db
          .update(promptTemplates)
          .set({ isDefault: false })
          .where(and(
            eq(promptTemplates.userId, currentTemplate.userId),
            eq(promptTemplates.category, currentTemplate.category),
            eq(promptTemplates.isDefault, true),
            sql`${promptTemplates.id} != ${id}`
          ));
      }
    }
    
    const [template] = await db
      .update(promptTemplates)
      .set({
        ...templateData,
        updatedAt: new Date()
      })
      .where(eq(promptTemplates.id, id))
      .returning();
    
    if (!template) {
      throw new Error(`Prompt template with ID ${id} not found`);
    }
    
    return template;
  }

  async deletePromptTemplate(id: number): Promise<boolean> {
    await db
      .delete(promptTemplates)
      .where(eq(promptTemplates.id, id));
    
    return true; // Si llegamos aquí, es que la operación fue exitosa
  }
  
  // Permit Search History methods
  async getPermitSearchHistory(id: number): Promise<PermitSearchHistory | undefined> {
    const [history] = await db
      .select()
      .from(permitSearchHistory)
      .where(eq(permitSearchHistory.id, id));
    return history;
  }

  async getPermitSearchHistoryByUserId(userId: number): Promise<PermitSearchHistory[]> {
    return db.select()
      .from(permitSearchHistory)
      .where(eq(permitSearchHistory.userId, userId))
      .orderBy(desc(permitSearchHistory.createdAt));
  }

  async createPermitSearchHistory(insertHistory: InsertPermitSearchHistory): Promise<PermitSearchHistory> {
    const [history] = await db
      .insert(permitSearchHistory)
      .values(insertHistory)
      .returning();
    return history;
  }
  
  // Property Search History methods
  async getPropertySearchHistory(id: number): Promise<PropertySearchHistory | undefined> {
    const [history] = await db
      .select()
      .from(propertySearchHistory)
      .where(eq(propertySearchHistory.id, id));
    return history;
  }

  async getPropertySearchHistoryByUserId(userId: number): Promise<PropertySearchHistory[]> {
    return db.select()
      .from(propertySearchHistory)
      .where(eq(propertySearchHistory.userId, userId))
      .orderBy(desc(propertySearchHistory.searchDate));
  }

  async createPropertySearchHistory(insertHistory: InsertPropertySearchHistory): Promise<PropertySearchHistory> {
    const [history] = await db
      .insert(propertySearchHistory)
      .values(insertHistory)
      .returning();
    return history;
  }
  
  async updatePropertySearchHistory(id: number, historyData: Partial<PropertySearchHistory>): Promise<PropertySearchHistory> {
    const [history] = await db
      .update(propertySearchHistory)
      .set({
        ...historyData,
        updatedAt: new Date()
      })
      .where(eq(propertySearchHistory.id, id))
      .returning();
    
    if (!history) {
      throw new Error(`Property search history with ID ${id} not found`);
    }
    
    return history;
  }
  
  // Project Payments methods
  async getProjectPayment(id: number): Promise<ProjectPayment | undefined> {
    const [payment] = await db.select().from(projectPayments).where(eq(projectPayments.id, id));
    return payment;
  }
  
  async getProjectPaymentsByProjectId(projectId: number): Promise<ProjectPayment[]> {
    return db.select()
      .from(projectPayments)
      .where(eq(projectPayments.projectId, projectId))
      .orderBy(desc(projectPayments.createdAt));
  }
  
  async getProjectPaymentsByUserId(userId: number): Promise<ProjectPayment[]> {
    return db.select()
      .from(projectPayments)
      .where(eq(projectPayments.userId, userId))
      .orderBy(desc(projectPayments.createdAt));
  }
  
  async getProjectPaymentsByCheckoutSessionId(sessionId: string): Promise<ProjectPayment[]> {
    return db.select()
      .from(projectPayments)
      .where(eq(projectPayments.stripeCheckoutSessionId, sessionId));
  }
  
  async createProjectPayment(payment: InsertProjectPayment): Promise<ProjectPayment> {
    const [newPayment] = await db.insert(projectPayments)
      .values(payment)
      .returning();
    return newPayment;
  }
  
  async updateProjectPayment(id: number, payment: Partial<ProjectPayment>): Promise<ProjectPayment> {
    const [updatedPayment] = await db.update(projectPayments)
      .set({
        ...payment,
        updatedAt: new Date()
      })
      .where(eq(projectPayments.id, id))
      .returning();
    
    if (!updatedPayment) {
      throw new Error(`Project payment with ID ${id} not found`);
    }
    
    return updatedPayment;
  }

  async deleteProjectPayment(id: number): Promise<boolean> {
    await db.delete(projectPayments)
      .where(eq(projectPayments.id, id));
    
    return true; // Drizzle doesn't return affected rows count consistently, so we return true if no error
  }
}
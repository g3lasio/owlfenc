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
  Material,
  InsertMaterial,
  PromptTemplate,
  InsertPromptTemplate
} from "@shared/schema";

import { DatabaseStorage } from './DatabaseStorage';
import { FirebaseStorage } from './FirebaseStorage';

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
}

// Usamos DatabaseStorage para conectar con PostgreSQL
export const storage = new DatabaseStorage();
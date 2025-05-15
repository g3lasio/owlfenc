import { pgTable, text, serial, integer, timestamp, jsonb, boolean, primaryKey } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  company: text("company"),
  ownerName: text("owner_name"),
  role: text("role"),
  email: text("email"),
  phone: text("phone"),
  mobilePhone: text("mobile_phone"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  zipCode: text("zip_code"),
  license: text("license"),
  insurancePolicy: text("insurance_policy"),
  ein: text("ein"),
  businessType: text("business_type"),
  yearEstablished: text("year_established"),
  website: text("website"),
  description: text("description"),
  specialties: jsonb("specialties"),
  socialMedia: jsonb("social_media"),
  documents: jsonb("documents"),
  logo: text("logo"),
  // Stripe Connect fields
  stripeConnectAccountId: text("stripe_connect_account_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  company: true,
  email: true,
  phone: true,
  address: true,
  license: true,
});

// Projects table
export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  projectId: text("project_id").notNull(),
  clientName: text("client_name").notNull(),
  clientEmail: text("client_email"),
  clientPhone: text("client_phone"),
  address: text("address").notNull(),
  fenceType: text("fence_type").notNull(),
  length: integer("length"),
  height: integer("height"),
  gates: jsonb("gates"),
  additionalDetails: text("additional_details"),
  estimateHtml: text("estimate_html"),
  contractHtml: text("contract_html"),
  totalPrice: integer("total_price"),
  status: text("status").default("draft"),
  // Project tracking fields
  projectProgress: text("project_progress").default("estimate_created"), // estimate_created, estimate_sent, client_approved, contract_sent, contract_signed, scheduled, in_progress, completed, cancelled
  scheduledDate: timestamp("scheduled_date"), // Scheduled installation date
  completedDate: timestamp("completed_date"), // Actual completion date
  assignedTo: jsonb("assigned_to"), // Team members assigned to this project
  attachments: jsonb("attachments"), // Documents and files related to the project
  permitStatus: text("permit_status"), // not_required, pending, approved, rejected
  permitDetails: jsonb("permit_details"), // Details about permits if required
  clientNotes: text("client_notes"), // Notes about client requirements
  internalNotes: text("internal_notes"), // Internal notes for the team
  paymentStatus: text("payment_status"), // pending, partial, paid
  paymentDetails: jsonb("payment_details"), // Payment history and details
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertProjectSchema = createInsertSchema(projects).pick({
  userId: true,
  projectId: true,
  clientName: true,
  clientEmail: true,
  clientPhone: true,
  address: true,
  fenceType: true,
  length: true,
  height: true,
  gates: true,
  additionalDetails: true,
  estimateHtml: true,
  contractHtml: true,
  totalPrice: true,
  status: true,
  projectProgress: true,
  scheduledDate: true,
  completedDate: true,
  assignedTo: true,
  attachments: true,
  permitStatus: true,
  permitDetails: true,
  clientNotes: true,
  internalNotes: true,
  paymentStatus: true,
  paymentDetails: true,
});

// Templates table
export const templates = pgTable("templates", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  name: text("name").notNull(),
  description: text("description"),
  type: text("type").notNull(), // "estimate" or "contract"
  html: text("html").notNull(),
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTemplateSchema = createInsertSchema(templates).pick({
  userId: true,
  name: true,
  description: true,
  type: true,
  html: true,
  isDefault: true,
});

// Settings table
export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).unique(),
  pricingSettings: jsonb("pricing_settings"),
  emailTemplates: jsonb("email_templates"),
  notificationSettings: jsonb("notification_settings"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertSettingsSchema = createInsertSchema(settings).pick({
  userId: true,
  pricingSettings: true,
  emailTemplates: true,
  notificationSettings: true,
});

// Chat logs table
export const chatLogs = pgTable("chat_logs", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id),
  messages: jsonb("messages").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertChatLogSchema = createInsertSchema(chatLogs).pick({
  projectId: true,
  messages: true,
});

// Materials table
export const materials = pgTable("materials", {
  id: serial("id").primaryKey(),
  category: text("category").notNull(), // Postes, Paneles, Hardware, etc.
  name: text("name").notNull(),
  description: text("description"),
  unit: text("unit").notNull(), // pieza, pie, paquete, etc.
  price: integer("price").notNull(), // precio en centavos
  supplier: text("supplier").default("Home Depot"),
  sku: text("sku"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertMaterialSchema = createInsertSchema(materials).pick({
  category: true,
  name: true,
  description: true,
  unit: true,
  price: true,
  supplier: true,
  sku: true,
});

// Clients table
export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  clientId: text("client_id").notNull(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  mobilePhone: text("mobile_phone"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  zipCode: text("zip_code"),
  notes: text("notes"),
  source: text("source"),  // Where the client came from (referral, advertisement, etc.)
  tags: jsonb("tags"),     // Array of tags for categorizing clients
  lastContact: timestamp("last_contact"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertClientSchema = createInsertSchema(clients).pick({
  userId: true,
  clientId: true,
  name: true,
  email: true,
  phone: true,
  mobilePhone: true,
  address: true,
  city: true,
  state: true,
  zipCode: true,
  notes: true,
  source: true,
  tags: true,
  lastContact: true,
});

// Export types
export type Material = typeof materials.$inferSelect;
export type InsertMaterial = z.infer<typeof insertMaterialSchema>;

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;

export type Template = typeof templates.$inferSelect;
export type InsertTemplate = z.infer<typeof insertTemplateSchema>;

export type Settings = typeof settings.$inferSelect;
export type InsertSettings = z.infer<typeof insertSettingsSchema>;

export type ChatLog = typeof chatLogs.$inferSelect;
export type InsertChatLog = z.infer<typeof insertChatLogSchema>;

export type Client = typeof clients.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;

// Subscription Plans table
export const subscriptionPlans = pgTable("subscription_plans", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull().unique(), // primo_chambeador, mero_patron, chingon_mayor
  price: integer("price").notNull(), // Monthly price in cents
  yearlyPrice: integer("yearly_price").notNull(), // Yearly price in cents
  description: text("description"),
  features: jsonb("features"), // Array of features included in this plan
  motto: text("motto"), // Lema del plan
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertSubscriptionPlanSchema = createInsertSchema(subscriptionPlans).pick({
  name: true,
  code: true,
  price: true,
  yearlyPrice: true,
  description: true,
  features: true,
  motto: true,
  isActive: true,
});

// User Subscriptions table
export const userSubscriptions = pgTable("user_subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  planId: integer("plan_id").references(() => subscriptionPlans.id),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  status: text("status").default("active"), // active, canceled, past_due, etc.
  currentPeriodStart: timestamp("current_period_start"),
  currentPeriodEnd: timestamp("current_period_end"),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),
  billingCycle: text("billing_cycle").default("monthly"), // monthly or yearly
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserSubscriptionSchema = createInsertSchema(userSubscriptions).pick({
  userId: true,
  planId: true,
  stripeCustomerId: true,
  stripeSubscriptionId: true,
  status: true,
  currentPeriodStart: true,
  currentPeriodEnd: true,
  cancelAtPeriodEnd: true,
  billingCycle: true,
});

// Payment history table
export const paymentHistory = pgTable("payment_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  subscriptionId: integer("subscription_id").references(() => userSubscriptions.id),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  stripeInvoiceId: text("stripe_invoice_id"),
  amount: integer("amount").notNull(), // Amount in cents
  status: text("status").notNull(), // succeeded, failed, pending
  paymentMethod: text("payment_method"), // card, bank transfer, etc.
  receiptUrl: text("receipt_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPaymentHistorySchema = createInsertSchema(paymentHistory).pick({
  userId: true,
  subscriptionId: true,
  stripePaymentIntentId: true,
  stripeInvoiceId: true,
  amount: true,
  status: true,
  paymentMethod: true,
  receiptUrl: true,
});

// Project payments table
export const projectPayments = pgTable("project_payments", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id),
  userId: integer("user_id").references(() => users.id),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  stripeCheckoutSessionId: text("stripe_checkout_session_id"),
  amount: integer("amount").notNull(), // Amount in cents
  type: text("type").notNull(), // deposit, final
  status: text("status").notNull(), // pending, succeeded, failed, canceled
  paymentMethod: text("payment_method"), // card, bank_transfer, etc.
  receiptUrl: text("receipt_url"),
  checkoutUrl: text("checkout_url"), // URL for Stripe Checkout Session
  paymentDate: timestamp("payment_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertProjectPaymentSchema = createInsertSchema(projectPayments).pick({
  projectId: true,
  userId: true,
  stripePaymentIntentId: true,
  stripeCheckoutSessionId: true,
  amount: true,
  type: true,
  status: true,
  paymentMethod: true,
  receiptUrl: true,
  checkoutUrl: true,
  paymentDate: true,
});

export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;
export type InsertSubscriptionPlan = z.infer<typeof insertSubscriptionPlanSchema>;

export type UserSubscription = typeof userSubscriptions.$inferSelect;
export type InsertUserSubscription = z.infer<typeof insertUserSubscriptionSchema>;

export type PaymentHistory = typeof paymentHistory.$inferSelect;
export type InsertPaymentHistory = z.infer<typeof insertPaymentHistorySchema>;

export type ProjectPayment = typeof projectPayments.$inferSelect;
export type InsertProjectPayment = z.infer<typeof insertProjectPaymentSchema>;

// Prompt Templates table
export const promptTemplates = pgTable("prompt_templates", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull(), // "estimate", "contract", "email", etc.
  promptText: text("prompt_text").notNull(),
  variables: jsonb("variables"), // Array of variable placeholders used in the template
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPromptTemplateSchema = createInsertSchema(promptTemplates).pick({
  userId: true,
  name: true,
  description: true,
  category: true,
  promptText: true,
  variables: true,
  isDefault: true,
});

export type PromptTemplate = typeof promptTemplates.$inferSelect;
export type InsertPromptTemplate = z.infer<typeof insertPromptTemplateSchema>;

// Historial de búsquedas de permisos
export const permitSearchHistory = pgTable("permit_search_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  address: text("address").notNull(),
  projectType: text("project_type").notNull(),
  projectDescription: text("project_description"),
  results: jsonb("results").notNull(), // Almacenar todos los resultados como JSON
  title: text("title"), // Título opcional para la búsqueda
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPermitSearchHistorySchema = createInsertSchema(permitSearchHistory).pick({
  userId: true,
  address: true,
  projectType: true,
  projectDescription: true,
  results: true,
  title: true,
});

export type PermitSearchHistory = typeof permitSearchHistory.$inferSelect;
export type InsertPermitSearchHistory = z.infer<typeof insertPermitSearchHistorySchema>;

// Historial de búsquedas de propiedad
export const propertySearchHistory = pgTable("property_search_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  address: text("address").notNull(),
  ownerName: text("owner_name"), // Nombre del propietario encontrado
  parcelNumber: text("parcel_number"), // Número de parcela
  results: jsonb("results").notNull(), // Almacenar todos los resultados como JSON
  title: text("title"), // Título opcional para la búsqueda (podría ser generado automáticamente)
  notes: text("notes"), // Notas adicionales que el usuario pueda agregar
  tags: jsonb("tags"), // Etiquetas para clasificar búsquedas (opcional)
  isFavorite: boolean("is_favorite").default(false), // Para marcar búsquedas importantes
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPropertySearchHistorySchema = createInsertSchema(propertySearchHistory).pick({
  userId: true,
  address: true,
  ownerName: true,
  parcelNumber: true,
  results: true,
  title: true,
  notes: true,
  tags: true,
  isFavorite: true,
});

export type PropertySearchHistory = typeof propertySearchHistory.$inferSelect;
export type InsertPropertySearchHistory = z.infer<typeof insertPropertySearchHistorySchema>;

// User Materials table - for user-specific materials inventory
export const userMaterials = pgTable("user_materials", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  name: text("name").notNull(),
  category: text("category").notNull(), // categoría del material (pintura, madera, metal, etc.)
  description: text("description"),
  unit: text("unit").notNull(), // unidad de medida (pieza, pie, galón, etc.)
  price: integer("price").notNull(), // precio en centavos
  supplier: text("supplier"), // proveedor del material
  supplierLink: text("supplier_link"), // enlace para comprar
  sku: text("sku"), // código de producto del proveedor
  stock: integer("stock"), // cantidad en inventario
  minStock: integer("min_stock"), // nivel mínimo de inventario
  projectId: text("project_id"), // referencia a proyecto (opcional)
  imageUrl: text("image_url"), // URL de la imagen del material
  fileUrls: jsonb("file_urls"), // URLs de archivos adjuntos (facturas, manuales, etc.)
  tags: jsonb("tags"), // etiquetas para clasificar/filtrar
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserMaterialSchema = createInsertSchema(userMaterials).pick({
  userId: true,
  name: true,
  category: true,
  description: true,
  unit: true,
  price: true,
  supplier: true,
  supplierLink: true,
  sku: true,
  stock: true,
  minStock: true,
  projectId: true,
  imageUrl: true,
  fileUrls: true,
  tags: true,
});

export type UserMaterial = typeof userMaterials.$inferSelect;
export type InsertUserMaterial = z.infer<typeof insertUserMaterialSchema>;

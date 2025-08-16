import { pgTable, text, varchar, decimal, integer, timestamp, boolean, jsonb, serial, index } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

// Import usage schemas
export * from './usage-schema';

// Users table
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  firebaseUid: varchar('firebase_uid', { length: 255 }).unique(),
  username: text('username').notNull().unique(),
  password: text('password').notNull(),
  company: text('company'),
  ownerName: text('owner_name'),
  role: text('role'),
  email: text('email').notNull().unique(),
  phone: text('phone'),
  mobilePhone: text('mobile_phone'),
  address: text('address'),
  city: text('city'),
  state: text('state'),
  zipCode: text('zip_code'),
  license: text('license'),
  insurancePolicy: text('insurance_policy'),
  ein: text('ein'),
  businessType: text('business_type'),
  yearEstablished: text('year_established'),
  website: text('website'),
  description: text('description'),
  specialties: jsonb('specialties'),
  socialMedia: jsonb('social_media'),
  documents: jsonb('documents'),
  logo: text('logo'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  stripeConnectAccountId: text('stripe_connect_account_id'),
  defaultPaymentTerms: integer('default_payment_terms').default(30), // días para pago
  invoiceMessageTemplate: text('invoice_message_template'),
});

// Projects table
export const projects = pgTable('projects', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  projectId: text('project_id'),
  clientName: text('client_name'),
  clientEmail: text('client_email'),
  clientPhone: text('client_phone'),
  address: text('address'),
  fenceType: text('fence_type'),
  length: integer('length'),
  height: integer('height'),
  gates: jsonb('gates'),
  additionalDetails: text('additional_details'),
  estimateHtml: text('estimate_html'),
  contractHtml: text('contract_html'),
  totalPrice: integer('total_price'),
  status: text('status'),
  createdAt: timestamp('created_at'),
  updatedAt: timestamp('updated_at'),
  projectProgress: text('project_progress'),
  scheduledDate: timestamp('scheduled_date'),
  completedDate: timestamp('completed_date'),
  assignedTo: jsonb('assigned_to'),
  attachments: jsonb('attachments'),
  permitStatus: text('permit_status'),
  permitDetails: jsonb('permit_details'),
  clientNotes: text('client_notes'),
  internalNotes: text('internal_notes'),
  paymentStatus: text('payment_status'),
  paymentDetails: jsonb('payment_details'),
  invoiceGenerated: boolean('invoice_generated').default(false),
  invoiceNumber: varchar('invoice_number', { length: 50 }),
  invoiceHtml: text('invoice_html'),
  invoiceDueDate: timestamp('invoice_due_date'),
  invoiceStatus: varchar('invoice_status', { length: 50 }), // 'pending', 'sent', 'paid', 'overdue'
  lastReminderSent: timestamp('last_reminder_sent'),
  projectType: text('project_type'),
  projectSubtype: text('project_subtype'),
  projectCategory: text('project_category'),
  projectDescription: text('project_description'),
  projectScope: text('project_scope'),
  description: text('description'),
  materialsList: jsonb('materials_list'),
  laborHours: integer('labor_hours'),
  difficulty: text('difficulty'),
  priority: text('priority'),
});



// Templates table
export const templates = pgTable('templates', {
  id: text('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  content: text('content').notNull(),
  userId: integer('user_id').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Settings table
export const settings = pgTable('settings', {
  id: text('id').primaryKey(),
  key: varchar('key', { length: 255 }).notNull().unique(),
  value: text('value').notNull(),
  userId: integer('user_id').notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Chat logs table
export const chatLogs = pgTable('chat_logs', {
  id: text('id').primaryKey(),
  message: text('message').notNull(),
  role: varchar('role', { length: 50 }).notNull(),
  userId: integer('user_id').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Clients table
export const clients = pgTable('clients', {
  id: text('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 50 }),
  address: text('address'),
  userId: integer('user_id').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Subscription plans table
export const subscriptionPlans = pgTable('subscription_plans', {
  id: text('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  features: jsonb('features').notNull(),
  isActive: boolean('is_active').notNull().default(true),
});

// User subscriptions table
export const userSubscriptions = pgTable('user_subscriptions', {
  id: text('id').primaryKey(),
  userId: integer('user_id').notNull(),
  planId: text('plan_id').notNull(),
  status: varchar('status', { length: 50 }).notNull(),
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date'),
});

// Payment history table
export const paymentHistory = pgTable('payment_history', {
  id: text('id').primaryKey(),
  userId: integer('user_id').notNull(),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  status: varchar('status', { length: 50 }).notNull(),
  paymentDate: timestamp('payment_date').defaultNow().notNull(),
});

// Project payments table
export const projectPayments = pgTable('project_payments', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').notNull(),
  userId: integer('user_id').notNull(),
  amount: integer('amount').notNull(), // Amount in cents
  type: varchar('type', { length: 50 }).notNull(), // 'deposit', 'final', 'partial'
  status: varchar('status', { length: 50 }).notNull().default('pending'), // 'pending', 'processing', 'succeeded', 'failed'
  description: text('description'),
  clientEmail: varchar('client_email', { length: 255 }),
  clientName: varchar('client_name', { length: 255 }),
  invoiceNumber: varchar('invoice_number', { length: 100 }),
  stripePaymentIntentId: varchar('stripe_payment_intent_id', { length: 255 }),
  checkoutUrl: text('checkout_url'),
  dueDate: timestamp('due_date'),
  paidDate: timestamp('paid_date'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Materials table
export const materials = pgTable('materials', {
  id: text('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  price: decimal('price', { precision: 10, scale: 2 }),
  unit: varchar('unit', { length: 50 }),
  category: varchar('category', { length: 255 }),
});

// Prompt templates table
export const promptTemplates = pgTable('prompt_templates', {
  id: text('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  content: text('content').notNull(),
  category: varchar('category', { length: 255 }),
  isActive: boolean('is_active').notNull().default(true),
});

// Permit search history table
export const permitSearchHistory = pgTable('permit_search_history', {
  id: text('id').primaryKey(),
  query: text('query').notNull(),
  results: jsonb('results'),
  userId: integer('user_id').notNull(),
  searchDate: timestamp('search_date').defaultNow().notNull(),
});

// Property search history table
export const propertySearchHistory = pgTable('property_search_history', {
  id: text('id').primaryKey(),
  address: text('address').notNull(),
  results: jsonb('results'),
  userId: integer('user_id').notNull(),
  searchDate: timestamp('search_date').defaultNow().notNull(),
});

// Smart Material Lists Cache - Para almacenar listas generadas por DeepSearch
export const smartMaterialLists = pgTable('smart_material_lists', {
  id: text('id').primaryKey(),
  projectType: varchar('project_type', { length: 100 }).notNull(),
  projectDescription: text('project_description').notNull(),
  region: varchar('region', { length: 100 }).notNull(),
  materialsList: jsonb('materials_list').notNull(),
  laborCosts: jsonb('labor_costs'),
  additionalCosts: jsonb('additional_costs'),
  totalMaterialsCost: decimal('total_materials_cost', { precision: 10, scale: 2 }),
  totalLaborCost: decimal('total_labor_cost', { precision: 10, scale: 2 }),
  totalAdditionalCost: decimal('total_additional_cost', { precision: 10, scale: 2 }),
  grandTotal: decimal('grand_total', { precision: 10, scale: 2 }),
  confidence: decimal('confidence', { precision: 3, scale: 2 }),
  usageCount: integer('usage_count').notNull().default(1),
  lastUsed: timestamp('last_used').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Project Templates Cache - Para patrones de proyectos comunes
export const projectTemplates = pgTable('project_templates', {
  id: text('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  projectType: varchar('project_type', { length: 100 }).notNull(),
  description: text('description'),
  templateData: jsonb('template_data').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  usageCount: integer('usage_count').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Contracts table for generated contracts
export const contracts = pgTable('contracts', {
  id: serial('id').primaryKey(),
  clientName: text('client_name').notNull(),
  clientAddress: text('client_address'),
  clientPhone: text('client_phone'),
  clientEmail: text('client_email'),
  projectType: text('project_type').notNull(),
  projectDescription: text('project_description'),
  projectLocation: text('project_location'),
  contractorName: text('contractor_name'),
  contractorAddress: text('contractor_address'),
  contractorPhone: text('contractor_phone'),
  contractorEmail: text('contractor_email'),
  contractorLicense: text('contractor_license'),
  totalAmount: text('total_amount'),
  startDate: timestamp('start_date'),
  completionDate: timestamp('completion_date'),
  html: text('html').notNull(),
  status: text('status').notNull().default('draft'),
  isComplete: boolean('is_complete').notNull().default(false),
  missingFields: jsonb('missing_fields'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const estimates = pgTable('estimates', {
  id: text('id').primaryKey(),
  estimateNumber: varchar('estimate_number', { length: 50 }).notNull(),
  clientName: varchar('client_name', { length: 255 }).notNull(),
  clientEmail: varchar('client_email', { length: 255 }).notNull(),
  clientPhone: varchar('client_phone', { length: 50 }),
  clientAddress: text('client_address'),
  contractorName: varchar('contractor_name', { length: 255 }).notNull(),
  contractorEmail: varchar('contractor_email', { length: 255 }).notNull(),
  contractorCompany: varchar('contractor_company', { length: 255 }).notNull(),
  contractorPhone: varchar('contractor_phone', { length: 50 }),
  contractorAddress: text('contractor_address'),
  projectType: varchar('project_type', { length: 255 }).notNull(),
  projectDescription: text('project_description'),
  projectLocation: text('project_location'),
  scopeOfWork: text('scope_of_work'),
  items: jsonb('items').notNull(), // Array of estimate items
  subtotal: decimal('subtotal', { precision: 10, scale: 2 }).notNull(),
  tax: decimal('tax', { precision: 10, scale: 2 }).notNull(),
  taxRate: decimal('tax_rate', { precision: 5, scale: 2 }).notNull(),
  total: decimal('total', { precision: 10, scale: 2 }).notNull(),
  status: varchar('status', { length: 50 }).notNull().default('sent'), // sent, approved, adjustments_requested, completed
  notes: text('notes'),
  validUntil: timestamp('valid_until'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  approvedAt: timestamp('approved_at'),
  approverName: varchar('approver_name', { length: 255 }),
  approverSignature: text('approver_signature'),
});

export const estimateAdjustments = pgTable('estimate_adjustments', {
  id: text('id').primaryKey(),
  estimateId: text('estimate_id').notNull().references(() => estimates.id),
  clientName: varchar('client_name', { length: 255 }).notNull(),
  clientEmail: varchar('client_email', { length: 255 }).notNull(),
  clientNotes: text('client_notes').notNull(),
  requestedChanges: text('requested_changes').notNull(),
  contractorEmail: varchar('contractor_email', { length: 255 }).notNull(),
  status: varchar('status', { length: 50 }).notNull().default('pending'), // pending, reviewed, implemented
  contractorResponse: text('contractor_response'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  respondedAt: timestamp('responded_at'),
});

export const notifications = pgTable('notifications', {
  id: text('id').primaryKey(),
  type: varchar('type', { length: 50 }).notNull(), // estimate_approved, adjustment_requested, etc.
  recipientEmail: varchar('recipient_email', { length: 255 }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  message: text('message').notNull(),
  relatedId: text('related_id'), // estimate or adjustment ID
  isRead: boolean('is_read').notNull().default(false),
  sentAt: timestamp('sent_at').defaultNow().notNull(),
  readAt: timestamp('read_at'),
});

// Company Information table for editable company data
export const companyInformation = pgTable('company_information', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(), // Firebase UID
  company: text('company'),
  address: text('address'),
  city: text('city'),
  state: text('state'),
  zipCode: text('zip_code'),
  phone: text('phone'),
  email: text('email'),
  website: text('website'),
  license: text('license'),
  logo: text('logo'), // Base64 or URL
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// OTP Codes table for email authentication
export const otpCodes = pgTable('otp_codes', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull(),
  code: varchar('code', { length: 6 }).notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  verified: boolean('verified').notNull().default(false),
  attempts: integer('attempts').notNull().default(0),
  maxAttempts: integer('max_attempts').notNull().default(3),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  emailIdx: index('email_idx').on(table.email),
  codeIdx: index('code_idx').on(table.code),
}));

// Simple Digital Contracts table for streamlined signature workflow  
export const digitalContracts = pgTable('digital_contracts', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(), // Changed to text for Firebase UID
  contractId: text('contract_id').notNull().unique(),
  
  // Contract basic data
  contractorName: varchar('contractor_name', { length: 255 }).notNull(),
  contractorEmail: varchar('contractor_email', { length: 255 }).notNull(),
  contractorPhone: varchar('contractor_phone', { length: 50 }),
  contractorCompany: varchar('contractor_company', { length: 255 }),
  
  clientName: varchar('client_name', { length: 255 }).notNull(),
  clientEmail: varchar('client_email', { length: 255 }).notNull(),
  clientPhone: varchar('client_phone', { length: 50 }),
  clientAddress: text('client_address'),
  
  projectDescription: text('project_description').notNull(),
  totalAmount: decimal('total_amount', { precision: 10, scale: 2 }).notNull(),
  startDate: timestamp('start_date'),
  completionDate: timestamp('completion_date'),
  
  // Contract HTML and PDF storage
  contractHtml: text('contract_html').notNull(),
  originalPdfPath: text('original_pdf_path'),
  signedPdfPath: text('signed_pdf_path'),
  
  // Signature tracking
  contractorSigned: boolean('contractor_signed').notNull().default(false),
  contractorSignedAt: timestamp('contractor_signed_at'),
  contractorSignatureData: text('contractor_signature_data'),
  contractorSignatureType: varchar('contractor_signature_type', { length: 20 }), // 'drawing' or 'cursive'
  
  clientSigned: boolean('client_signed').notNull().default(false),
  clientSignedAt: timestamp('client_signed_at'),
  clientSignatureData: text('client_signature_data'),
  clientSignatureType: varchar('client_signature_type', { length: 20 }), // 'drawing' or 'cursive'
  
  // Workflow status
  status: varchar('status', { length: 50 }).notNull().default('pending'), // 'pending', 'contractor_signed', 'both_signed', 'completed'
  emailSent: boolean('email_sent').notNull().default(false),
  emailSentAt: timestamp('email_sent_at'),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Insert schemas for all tables
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertCompanyInformationSchema = createInsertSchema(companyInformation).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Password reset tokens table
export const passwordResetTokens = pgTable('password_reset_tokens', {
  id: varchar('id', { length: 100 }).primaryKey(),
  userId: text('user_id').notNull().references(() => users.firebaseUid),
  token: varchar('token', { length: 255 }).notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  used: varchar('used', { length: 10 }).default('false'),
  createdAt: timestamp('created_at').defaultNow()
});

export const insertDigitalContractSchema = createInsertSchema(digitalContracts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPasswordResetTokenSchema = createInsertSchema(passwordResetTokens).omit({
  id: true,
  createdAt: true,
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
});

export const insertTemplateSchema = createInsertSchema(templates).omit({
  id: true,
  createdAt: true,
});

export const insertSettingsSchema = createInsertSchema(settings).omit({
  id: true,
  updatedAt: true,
});

export const insertChatLogSchema = createInsertSchema(chatLogs).omit({
  id: true,
  createdAt: true,
});

export const insertClientSchema = createInsertSchema(clients).omit({
  id: true,
  createdAt: true,
});

export const insertSubscriptionPlanSchema = createInsertSchema(subscriptionPlans).omit({
  id: true,
});

export const insertUserSubscriptionSchema = createInsertSchema(userSubscriptions).omit({
  id: true,
});

export const insertPaymentHistorySchema = createInsertSchema(paymentHistory).omit({
  id: true,
});

export const insertProjectPaymentSchema = createInsertSchema(projectPayments).omit({
  id: true,
});

export const insertMaterialSchema = createInsertSchema(materials).omit({
  id: true,
});

export const insertPromptTemplateSchema = createInsertSchema(promptTemplates).omit({
  id: true,
});

export const insertPermitSearchHistorySchema = createInsertSchema(permitSearchHistory).omit({
  id: true,
  searchDate: true,
});

export const insertPropertySearchHistorySchema = createInsertSchema(propertySearchHistory).omit({
  id: true,
  searchDate: true,
});

export const insertEstimateSchema = createInsertSchema(estimates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEstimateAdjustmentSchema = createInsertSchema(estimateAdjustments).omit({
  id: true,
  createdAt: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  sentAt: true,
});

// Types for all tables
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
export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;
export type InsertSubscriptionPlan = z.infer<typeof insertSubscriptionPlanSchema>;
export type UserSubscription = typeof userSubscriptions.$inferSelect;
export type InsertUserSubscription = z.infer<typeof insertUserSubscriptionSchema>;
export type PaymentHistory = typeof paymentHistory.$inferSelect;
export type InsertPaymentHistory = z.infer<typeof insertPaymentHistorySchema>;
export type ProjectPayment = typeof projectPayments.$inferSelect;
export type InsertProjectPayment = z.infer<typeof insertProjectPaymentSchema>;
export type Material = typeof materials.$inferSelect;
export type InsertMaterial = z.infer<typeof insertMaterialSchema>;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type InsertPasswordResetToken = z.infer<typeof insertPasswordResetTokenSchema>;

export type SmartMaterialList = typeof smartMaterialLists.$inferSelect;
export type InsertSmartMaterialList = typeof smartMaterialLists.$inferInsert;

export type ProjectTemplate = typeof projectTemplates.$inferSelect;
export type InsertProjectTemplate = typeof projectTemplates.$inferInsert;
export type PromptTemplate = typeof promptTemplates.$inferSelect;
export type InsertPromptTemplate = z.infer<typeof insertPromptTemplateSchema>;
export type PermitSearchHistory = typeof permitSearchHistory.$inferSelect;
export type InsertPermitSearchHistory = z.infer<typeof insertPermitSearchHistorySchema>;
export type PropertySearchHistory = typeof propertySearchHistory.$inferSelect;
export type InsertPropertySearchHistory = z.infer<typeof insertPropertySearchHistorySchema>;
export type Estimate = typeof estimates.$inferSelect;
export type InsertEstimate = z.infer<typeof insertEstimateSchema>;
export type EstimateAdjustment = typeof estimateAdjustments.$inferSelect;
export type InsertEstimateAdjustment = z.infer<typeof insertEstimateAdjustmentSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type CompanyInformation = typeof companyInformation.$inferSelect;
export type InsertCompanyInformation = z.infer<typeof insertCompanyInformationSchema>;

export type DigitalContract = typeof digitalContracts.$inferSelect;
export type InsertDigitalContract = z.infer<typeof insertDigitalContractSchema>;

// OTP Code schemas and types
export const insertOtpCodeSchema = createInsertSchema(otpCodes).omit({
  id: true,
  createdAt: true,
});

export type OtpCode = typeof otpCodes.$inferSelect;
export type InsertOtpCode = z.infer<typeof insertOtpCodeSchema>;

// WebAuthn credentials table for biometric authentication
export const webauthnCredentials = pgTable('webauthn_credentials', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  credentialId: text('credential_id').notNull().unique(),
  publicKey: text('public_key').notNull(),
  counter: integer('counter').notNull().default(0),
  deviceType: varchar('device_type', { length: 100 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  lastUsed: timestamp('last_used'),
  name: varchar('name', { length: 255 }), // e.g., "iPhone 14", "MacBook Pro"
  transports: jsonb('transports'), // e.g., ["internal", "hybrid"]
}, (table) => ({
  userIdIdx: index('webauthn_user_id_idx').on(table.userId),
  credentialIdIdx: index('webauthn_credential_id_idx').on(table.credentialId),
}));

// WebAuthn credentials schemas and types
export const insertWebauthnCredentialSchema = createInsertSchema(webauthnCredentials).omit({
  id: true,
  createdAt: true,
});

export type WebauthnCredential = typeof webauthnCredentials.$inferSelect;
export type InsertWebauthnCredential = z.infer<typeof insertWebauthnCredentialSchema>;

// ====================================================================
// PHASE 5: LEARNING AND OPTIMIZATION SYSTEM - MEMORY DATABASE TABLES
// ====================================================================

// Agent Memory Patterns - Stores task execution patterns and user interactions
export const agentMemoryPatterns = pgTable('agent_memory_patterns', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(), // Firebase UID
  patternId: varchar('pattern_id', { length: 100 }).notNull().unique(),
  
  // Task information
  intentionType: varchar('intention_type', { length: 100 }).notNull(),
  intentionComplexity: varchar('intention_complexity', { length: 50 }).notNull(),
  executionPlan: jsonb('execution_plan').notNull(),
  
  // Execution results
  success: boolean('success').notNull(),
  executionTime: integer('execution_time').notNull(), // milliseconds
  endpointsUsed: jsonb('endpoints_used').notNull(),
  parametersUsed: jsonb('parameters_used'),
  
  // Learning metrics
  userSatisfaction: integer('user_satisfaction'), // 1-5 rating
  optimizations: jsonb('optimizations'),
  confidence: decimal('confidence', { precision: 3, scale: 2 }),
  
  // Context information
  contextData: jsonb('context_data'),
  conversationHistory: jsonb('conversation_history'),
  activeEntities: jsonb('active_entities'),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('memory_patterns_user_id_idx').on(table.userId),
  intentionTypeIdx: index('memory_patterns_intention_type_idx').on(table.intentionType),
  successIdx: index('memory_patterns_success_idx').on(table.success),
  createdAtIdx: index('memory_patterns_created_at_idx').on(table.createdAt),
}));

// User Behavior Analytics - Tracks user behavior patterns and preferences
export const userBehaviorAnalytics = pgTable('user_behavior_analytics', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull().unique(), // Firebase UID
  
  // Common patterns
  commonIntentions: jsonb('common_intentions').notNull(),
  preferredWorkflows: jsonb('preferred_workflows').notNull(),
  timePatterns: jsonb('time_patterns').notNull(), // Usage by hour/day
  
  // Success metrics
  totalTasks: integer('total_tasks').notNull().default(0),
  successfulTasks: integer('successful_tasks').notNull().default(0),
  averageExecutionTime: integer('average_execution_time').notNull().default(0),
  
  // Behavioral insights
  workingHours: jsonb('working_hours'), // Peak usage times
  preferredComplexity: varchar('preferred_complexity', { length: 50 }),
  mostUsedEndpoints: jsonb('most_used_endpoints'),
  
  // Learning state
  lastAnalysisDate: timestamp('last_analysis_date').defaultNow().notNull(),
  adaptationLevel: varchar('adaptation_level', { length: 50 }).default('basic'),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('behavior_analytics_user_id_idx').on(table.userId),
  lastAnalysisIdx: index('behavior_analytics_last_analysis_idx').on(table.lastAnalysisDate),
}));

// Contextual Memory - Stores conversation context and entity awareness  
export const contextualMemory = pgTable('contextual_memory', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(), // Firebase UID
  contextId: varchar('context_id', { length: 100 }).notNull().unique(),
  
  // Context type and scope
  contextType: varchar('context_type', { length: 50 }).notNull(), // 'conversation', 'project', 'session'
  scope: varchar('scope', { length: 50 }).notNull(), // 'short_term', 'medium_term', 'long_term'
  
  // Context data
  entities: jsonb('entities').notNull(), // Tracked entities (clients, projects, etc.)
  relationships: jsonb('relationships'), // Entity relationships
  preferences: jsonb('preferences'), // User preferences in this context
  
  // Memory metadata
  importance: integer('importance').notNull().default(1), // 1-10 importance scale
  accessCount: integer('access_count').notNull().default(0),
  lastAccessed: timestamp('last_accessed').defaultNow().notNull(),
  
  // Expiration and cleanup
  expiresAt: timestamp('expires_at'),
  autoCleanup: boolean('auto_cleanup').notNull().default(true),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('contextual_memory_user_id_idx').on(table.userId),
  contextTypeIdx: index('contextual_memory_context_type_idx').on(table.contextType),
  importanceIdx: index('contextual_memory_importance_idx').on(table.importance),
  expiresAtIdx: index('contextual_memory_expires_at_idx').on(table.expiresAt),
}));

// Optimization Suggestions - AI-generated optimization recommendations
export const optimizationSuggestions = pgTable('optimization_suggestions', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(), // Firebase UID
  suggestionId: varchar('suggestion_id', { length: 100 }).notNull().unique(),
  
  // Suggestion details
  type: varchar('type', { length: 50 }).notNull(), // 'sequence', 'parameters', 'timing', 'alternative'
  description: text('description').notNull(),
  reason: text('reason').notNull(),
  
  // Impact metrics
  estimatedImprovement: decimal('estimated_improvement', { precision: 5, scale: 2 }).notNull(),
  confidence: decimal('confidence', { precision: 3, scale: 2 }).notNull(),
  applicableIntentions: jsonb('applicable_intentions').notNull(),
  
  // Implementation status
  status: varchar('status', { length: 50 }).notNull().default('pending'), // 'pending', 'applied', 'rejected', 'expired'
  appliedAt: timestamp('applied_at'),
  feedbackScore: integer('feedback_score'), // 1-5 user feedback
  
  // Supporting data
  supportingData: jsonb('supporting_data'),
  relatedPatterns: jsonb('related_patterns'),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('optimization_suggestions_user_id_idx').on(table.userId),
  statusIdx: index('optimization_suggestions_status_idx').on(table.status),
  confidenceIdx: index('optimization_suggestions_confidence_idx').on(table.confidence),
  createdAtIdx: index('optimization_suggestions_created_at_idx').on(table.createdAt),
}));

// Learning Progress - Tracks long-term learning and system adaptation
export const learningProgress = pgTable('learning_progress', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull().unique(), // Firebase UID
  
  // Learning metrics
  totalInteractions: integer('total_interactions').notNull().default(0),
  successfulPredictions: integer('successful_predictions').notNull().default(0),
  totalPredictions: integer('total_predictions').notNull().default(0),
  adaptationScore: decimal('adaptation_score', { precision: 5, scale: 2 }).notNull().default('0'),
  
  // Learning categories
  intentionRecognitionAccuracy: decimal('intention_recognition_accuracy', { precision: 5, scale: 2 }).default('0'),
  workflowOptimizationScore: decimal('workflow_optimization_score', { precision: 5, scale: 2 }).default('0'),
  predictionAccuracy: decimal('prediction_accuracy', { precision: 5, scale: 2 }).default('0'),
  
  // Learning state
  learningPhase: varchar('learning_phase', { length: 50 }).notNull().default('initial'), // 'initial', 'adapting', 'optimized', 'expert'
  lastLearningSession: timestamp('last_learning_session').defaultNow().notNull(),
  nextOptimizationDue: timestamp('next_optimization_due').defaultNow().notNull(),
  
  // Knowledge evolution
  knowledgeVersion: integer('knowledge_version').notNull().default(1),
  learningVelocity: decimal('learning_velocity', { precision: 5, scale: 2 }).default('0'), // Learning rate
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('learning_progress_user_id_idx').on(table.userId),
  learningPhaseIdx: index('learning_progress_learning_phase_idx').on(table.learningPhase),
  lastSessionIdx: index('learning_progress_last_session_idx').on(table.lastLearningSession),
}));

// Insert schemas for memory system tables
export const insertAgentMemoryPatternSchema = createInsertSchema(agentMemoryPatterns).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserBehaviorAnalyticsSchema = createInsertSchema(userBehaviorAnalytics).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertContextualMemorySchema = createInsertSchema(contextualMemory).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertOptimizationSuggestionSchema = createInsertSchema(optimizationSuggestions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertLearningProgressSchema = createInsertSchema(learningProgress).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Memory system types
export type AgentMemoryPattern = typeof agentMemoryPatterns.$inferSelect;
export type InsertAgentMemoryPattern = z.infer<typeof insertAgentMemoryPatternSchema>;
export type UserBehaviorAnalytics = typeof userBehaviorAnalytics.$inferSelect;
export type InsertUserBehaviorAnalytics = z.infer<typeof insertUserBehaviorAnalyticsSchema>;
export type ContextualMemory = typeof contextualMemory.$inferSelect;
export type InsertContextualMemory = z.infer<typeof insertContextualMemorySchema>;
export type OptimizationSuggestion = typeof optimizationSuggestions.$inferSelect;
export type InsertOptimizationSuggestion = z.infer<typeof insertOptimizationSuggestionSchema>;
export type LearningProgress = typeof learningProgress.$inferSelect;
export type InsertLearningProgress = z.infer<typeof insertLearningProgressSchema>;

// Legacy aliases for backward compatibility
export type EstimateItem = Estimate;
export type InsertEstimateItem = InsertEstimate;
export type EstimateTemplate = Template;
export type InsertEstimateTemplate = InsertTemplate;
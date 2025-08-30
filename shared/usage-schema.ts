import { pgTable, text, integer, timestamp, varchar, index } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// Tabla para rastrear el uso mensual de cada usuario
export const userMonthlyUsage = pgTable('user_monthly_usage', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  month: varchar('month', { length: 7 }).notNull(), // YYYY-MM format
  
  // Contadores de uso
  basicEstimates: integer('basic_estimates').notNull().default(0),
  aiEstimates: integer('ai_estimates').notNull().default(0),
  contracts: integer('contracts').notNull().default(0),
  propertyVerifications: integer('property_verifications').notNull().default(0),
  permitAdvisor: integer('permit_advisor').notNull().default(0),
  projects: integer('projects').notNull().default(0),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userMonthIndex: index('usage_user_month_idx').on(table.userId, table.month),
  userIdIndex: index('user_id_idx').on(table.userId),
}));

// Tabla para rastrear suscripciones de trial
export const userTrials = pgTable('user_trials', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().unique(),
  planId: integer('plan_id').notNull(),
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date').notNull(),
  status: varchar('status', { length: 20 }).notNull().default('active'), // 'active', 'expired', 'converted'
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdIndex: index('trial_user_id_idx').on(table.userId),
}));

// Esquemas Zod para validación
export const insertUserMonthlyUsageSchema = createInsertSchema(userMonthlyUsage, {
  userId: z.string().min(1),
  month: z.string().regex(/^\d{4}-\d{2}$/),
  basicEstimates: z.number().int().min(0),
  aiEstimates: z.number().int().min(0),
  contracts: z.number().int().min(0),
  propertyVerifications: z.number().int().min(0),
  permitAdvisor: z.number().int().min(0),
  projects: z.number().int().min(0),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const selectUserMonthlyUsageSchema = createSelectSchema(userMonthlyUsage);

export const insertUserTrialSchema = createInsertSchema(userTrials, {
  userId: z.string().min(1),
  planId: z.number().int().min(1),
  status: z.enum(['active', 'expired', 'converted']),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const selectUserTrialSchema = createSelectSchema(userTrials);

// Tipos TypeScript
export type UserMonthlyUsage = typeof userMonthlyUsage.$inferSelect;
export type InsertUserMonthlyUsage = z.infer<typeof insertUserMonthlyUsageSchema>;

export type UserTrial = typeof userTrials.$inferSelect;
export type InsertUserTrial = z.infer<typeof insertUserTrialSchema>;

// Funciones utiles
export function getCurrentMonth(): string {
  return new Date().toISOString().slice(0, 7); // YYYY-MM
}

export function generateUsageId(userId: string, month: string): string {
  return `usage_${userId}_${month}`;
}

export function generateTrialId(userId: string): string {
  return `trial_${userId}_${Date.now()}`;
}
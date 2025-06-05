import { pgTable, text, varchar, decimal, integer, timestamp, boolean, jsonb } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

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

// Insert schemas
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

// Types
export type Estimate = typeof estimates.$inferSelect;
export type InsertEstimate = z.infer<typeof insertEstimateSchema>;
export type EstimateAdjustment = typeof estimateAdjustments.$inferSelect;
export type InsertEstimateAdjustment = z.infer<typeof insertEstimateAdjustmentSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
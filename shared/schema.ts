import { pgTable, text, serial, integer, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  company: text("company"),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  license: text("license"),
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

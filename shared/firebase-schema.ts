/**
 * 🔥 FIREBASE SCHEMA DEFINITIONS
 * Esquemas específicos para el sistema unificado Firebase-only
 * Elimina dependencias de PostgreSQL y define estructuras nativas de Firebase
 */

import { z } from 'zod';

// ================================
// FIREBASE CLIENT SCHEMA
// ================================

export const FirebaseClientSchema = z.object({
  id: z.string().optional(), // ID del documento en Firestore
  clientId: z.string(), // ID único tipo "client_1234567890_123"
  name: z.string().min(1, 'El nombre es requerido'),
  email: z.string().email('Email inválido').optional().or(z.literal('')).nullable(),
  phone: z.string().optional().or(z.literal('')).nullable(),
  mobilePhone: z.string().optional().or(z.literal('')).nullable(), // Teléfono móvil
  address: z.string().optional().or(z.literal('')).nullable(),
  city: z.string().optional().or(z.literal('')).nullable(),
  state: z.string().optional().or(z.literal('')).nullable(),
  zipCode: z.string().optional().or(z.literal('')).nullable(),
  notes: z.string().optional().or(z.literal('')).nullable(),
  source: z.string().optional().or(z.literal('')).nullable(), // Origen del cliente (Referido, Web, etc.)
  classification: z.string().optional().or(z.literal('')).nullable(), // Clasificación (cliente, proveedor, etc.)
  tags: z.array(z.string()).optional().nullable(), // Etiquetas del cliente
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const InsertFirebaseClientSchema = FirebaseClientSchema.omit({
  id: true,
  clientId: true,
  createdAt: true,
  updatedAt: true,
});

// ================================
// FIREBASE USER SCHEMA  
// ================================

export const FirebaseUserSchema = z.object({
  firebaseUid: z.string(),
  email: z.string().email(),
  displayName: z.string().optional(),
  photoURL: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  // Campos adicionales específicos de la aplicación
  company: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
});

export const InsertFirebaseUserSchema = FirebaseUserSchema.omit({
  createdAt: true,
  updatedAt: true,
});

// ================================
// FIREBASE SUBSCRIPTION SCHEMA
// ================================

export const FirebaseSubscriptionSchema = z.object({
  planId: z.number(),
  planName: z.string(),
  status: z.string(), // 'active', 'canceled', 'trial', etc.
  trialUsed: z.boolean().default(false),
  trialEndDate: z.date().optional(),
  currentPeriodStart: z.date().optional(),
  currentPeriodEnd: z.date().optional(),
  usage: z.object({
    basicEstimates: z.number().default(0),
    aiEstimates: z.number().default(0),
    contracts: z.number().default(0),
    propertyVerifications: z.number().default(0),
    permitAdvisor: z.number().default(0),
    projects: z.number().default(0),
  }),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// ================================
// FIREBASE PROJECT SCHEMA
// ================================

export const FirebaseProjectSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  clientName: z.string(),
  clientEmail: z.string().optional(),
  clientPhone: z.string().optional(),
  address: z.string().optional(),
  description: z.string().optional(),
  status: z.string().default('active'),
  totalPrice: z.number().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const InsertFirebaseProjectSchema = FirebaseProjectSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// ================================
// EXPORT TYPES
// ================================

export type FirebaseClient = z.infer<typeof FirebaseClientSchema>;
export type InsertFirebaseClient = z.infer<typeof InsertFirebaseClientSchema>;
export type FirebaseUser = z.infer<typeof FirebaseUserSchema>;
export type InsertFirebaseUser = z.infer<typeof InsertFirebaseUserSchema>;
export type FirebaseSubscription = z.infer<typeof FirebaseSubscriptionSchema>;
export type FirebaseProject = z.infer<typeof FirebaseProjectSchema>;
export type InsertFirebaseProject = z.infer<typeof InsertFirebaseProjectSchema>;

// ================================
// VALIDATION HELPERS
// ================================

export function validateFirebaseClient(data: any): FirebaseClient {
  return FirebaseClientSchema.parse(data);
}

export function validateInsertFirebaseClient(data: any): InsertFirebaseClient {
  return InsertFirebaseClientSchema.parse(data);
}

export function validateFirebaseUser(data: any): FirebaseUser {
  return FirebaseUserSchema.parse(data);
}

// ================================
// FIREBASE COLLECTION NAMES
// ================================

export const FIREBASE_COLLECTIONS = {
  USERS: 'users',
  CLIENTS: 'clients',
  PROJECTS: 'projects',
  SUBSCRIPTION: 'subscription',
  PLANS: 'plans',
} as const;

export default {
  FirebaseClientSchema,
  InsertFirebaseClientSchema,
  FirebaseUserSchema,
  InsertFirebaseUserSchema,
  FirebaseSubscriptionSchema,
  FirebaseProjectSchema,
  InsertFirebaseProjectSchema,
  FIREBASE_COLLECTIONS,
};
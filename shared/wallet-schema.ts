/**
 * WALLET SCHEMA — PAY AS YOU GROW SYSTEM
 * Mervin AI / Owl Fenc App
 * 
 * PRINCIPIO: Solo cambios ADITIVOS. Ninguna tabla existente se modifica destructivamente.
 * Todas las tablas existentes (users, user_subscriptions, subscription_plans, etc.) permanecen intactas.
 * 
 * Arquitectura: Payment Intents + Internal Ledger (NO Metered Billing, NO Customer Balance)
 * 1 crédito = $0.10 USD
 */

import {
  pgTable,
  text,
  varchar,
  integer,
  timestamp,
  boolean,
  jsonb,
  serial,
  index,
  uniqueIndex,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

// ================================
// WALLET ACCOUNTS
// Una wallet por usuario. Balance en enteros para evitar errores de punto flotante.
// ================================
export const walletAccounts = pgTable('wallet_accounts', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),                          // FK → users.id
  firebaseUid: varchar('firebase_uid', { length: 255 }).notNull(), // Denormalizado para lookup rápido

  // Balance principal — NUNCA negativo (constraint a nivel DB)
  balanceCredits: integer('balance_credits').notNull().default(0),

  // Stats para analytics
  totalCreditsEarned: integer('total_credits_earned').notNull().default(0),
  totalCreditsSpent: integer('total_credits_spent').notNull().default(0),
  totalTopUpAmountCents: integer('total_top_up_amount_cents').notNull().default(0), // Revenue tracking

  // Reusar el mismo Stripe Customer ID de user_subscriptions
  stripeCustomerId: varchar('stripe_customer_id', { length: 255 }),

  // Fraud prevention
  isLocked: boolean('is_locked').notNull().default(false),
  lockedReason: text('locked_reason'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  firebaseUidUniqueIdx: uniqueIndex('wallet_accounts_firebase_uid_unique').on(table.firebaseUid),
  userIdUniqueIdx: uniqueIndex('wallet_accounts_user_id_unique').on(table.userId),
  firebaseUidIdx: index('wallet_accounts_firebase_uid_idx').on(table.firebaseUid),
}));

// ================================
// WALLET TRANSACTIONS
// Ledger append-only. Cada crédito agregado o deducido es una fila inmutable.
// ================================
export const walletTransactions = pgTable('wallet_transactions', {
  id: serial('id').primaryKey(),
  walletId: integer('wallet_id').notNull(),                      // FK → wallet_accounts.id
  userId: integer('user_id').notNull(),                          // Denormalizado
  firebaseUid: varchar('firebase_uid', { length: 255 }).notNull(), // Denormalizado

  // Tipo de transacción
  type: varchar('type', { length: 50 }).notNull(),
  // 'topup' | 'subscription_grant' | 'feature_use' | 'refund' | 'bonus' | 'expiry' | 'admin_adjustment'

  // Dirección del movimiento
  direction: varchar('direction', { length: 10 }).notNull(),
  // 'credit' | 'debit'

  // Monto — siempre positivo, direction determina el signo
  amountCredits: integer('amount_credits').notNull(),

  // Snapshot del balance tras la transacción — para auditoría
  balanceAfter: integer('balance_after').notNull(),

  // Feature que consumió los créditos (para feature_use)
  featureName: varchar('feature_name', { length: 100 }),
  // 'aiEstimate' | 'contract' | 'invoice' | 'permitReport' | 'propertyVerification'
  // | 'deepSearch' | 'signatureProtocol' | 'paymentLink'

  // ID del recurso generado (estimate ID, contract ID, etc.)
  resourceId: varchar('resource_id', { length: 255 }),

  // Para tipo subscription_grant
  subscriptionPlanId: integer('subscription_plan_id'),

  // Para top-ups
  stripePaymentIntentId: varchar('stripe_payment_intent_id', { length: 255 }),
  stripeCheckoutSessionId: varchar('stripe_checkout_session_id', { length: 255 }),
  topUpAmountCents: integer('top_up_amount_cents'),              // USD pagado en este top-up

  // CRÍTICO: Previene doble deducción / doble grant
  idempotencyKey: varchar('idempotency_key', { length: 255 }).unique(),

  // Descripción legible para el usuario
  description: text('description'),

  // Datos adicionales para analytics
  metadata: jsonb('metadata'),

  // Para subscription_grant credits — expiran 60 días tras fin del período
  // Para top-up credits — NUNCA expiran (null)
  expiresAt: timestamp('expires_at'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  walletIdIdx: index('wallet_transactions_wallet_id_idx').on(table.walletId),
  firebaseUidIdx: index('wallet_transactions_firebase_uid_idx').on(table.firebaseUid),
  typeIdx: index('wallet_transactions_type_idx').on(table.type),
  createdAtIdx: index('wallet_transactions_created_at_idx').on(table.createdAt),
  idempotencyKeyUniqueIdx: uniqueIndex('wallet_transactions_idempotency_key_unique').on(table.idempotencyKey),
}));

// ================================
// CREDIT PACKAGES
// Los 3 paquetes de top-up disponibles para compra
// ================================
export const creditPackages = pgTable('credit_packages', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  // 'Starter Pack' | 'Pro Pack' | 'Power Pack'

  credits: integer('credits').notNull(),          // Créditos base
  bonusCredits: integer('bonus_credits').notNull().default(0), // Bonus incluido

  priceUsdCents: integer('price_usd_cents').notNull(),
  // 1000 ($10) | 3000 ($30) | 7500 ($75)

  // Stripe Price ID (one-time, NOT recurring)
  stripePriceId: varchar('stripe_price_id', { length: 255 }),

  isActive: boolean('is_active').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),

  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ================================
// TIPOS TYPESCRIPT INFERIDOS
// ================================
export type WalletAccount = typeof walletAccounts.$inferSelect;
export type InsertWalletAccount = typeof walletAccounts.$inferInsert;

export type WalletTransaction = typeof walletTransactions.$inferSelect;
export type InsertWalletTransaction = typeof walletTransactions.$inferInsert;

export type CreditPackage = typeof creditPackages.$inferSelect;
export type InsertCreditPackage = typeof creditPackages.$inferInsert;

// ================================
// ZOD SCHEMAS PARA VALIDACIÓN
// ================================
export const insertWalletAccountSchema = createInsertSchema(walletAccounts);
export const selectWalletAccountSchema = createSelectSchema(walletAccounts);

export const insertWalletTransactionSchema = createInsertSchema(walletTransactions);
export const selectWalletTransactionSchema = createSelectSchema(walletTransactions);

export const insertCreditPackageSchema = createInsertSchema(creditPackages);
export const selectCreditPackageSchema = createSelectSchema(creditPackages);

// ================================
// CONSTANTES DEL SISTEMA DE CRÉDITOS
// ================================

// Costo en créditos por feature (1 crédito = $0.10 USD)
export const FEATURE_CREDIT_COSTS = {
  aiEstimate: 8,           // $0.80
  basicEstimate: 0,        // GRATIS — adopción
  contract: 12,            // $1.20 — Legal Defense
  signatureProtocol: 8,    // $0.80 — Sistema PROPIO
  contractWithSignature: 18, // $1.80 — Bundle (descuento psicológico)
  invoice: 5,              // $0.50
  permitReport: 15,        // $1.50
  propertyVerification: 15, // $1.50 — Margen 10x sobre costo ATTOM
  deepSearchFull: 20,      // $2.00 — Materials + Labor complete analysis
  deepSearchPartial: 10,   // $1.00 — Materials only OR Labor only
  paymentLink: 5,          // $0.50
  chatWithMervin: 0,       // SIEMPRE GRATIS
  pdfExport: 0,            // SIEMPRE GRATIS
} as const;

export type FeatureName = keyof typeof FEATURE_CREDIT_COSTS;

// Créditos mensuales por plan (IDs del brief)
export const PLAN_MONTHLY_CREDITS = {
  5: 20,    // Primo Chambeador (Free)
  9: 500,   // Mero Patrón
  6: 1200,  // Master Contractor
} as const;

// Paquetes de top-up (datos canónicos)
export const CREDIT_PACKAGES_DATA = [
  {
    name: 'Starter Pack',
    credits: 50,
    bonusCredits: 0,
    totalCredits: 50,
    priceUsdCents: 1000, // $10
    sortOrder: 1,
  },
  {
    name: 'Pro Pack',
    credits: 200,
    bonusCredits: 25,
    totalCredits: 225,
    priceUsdCents: 3000, // $30 — DEFAULT seleccionado
    sortOrder: 2,
  },
  {
    name: 'Power Pack',
    credits: 600,
    bonusCredits: 100,
    totalCredits: 700,
    priceUsdCents: 7500, // $75
    sortOrder: 3,
  },
] as const;

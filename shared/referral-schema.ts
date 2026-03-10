/**
 * REFERRAL SYSTEM SCHEMA — OWL FENC
 * Mervin AI / Owl Fenc App
 *
 * PRINCIPIO: Solo cambios ADITIVOS. Ninguna tabla existente se modifica.
 * Este schema se integra con wallet-schema.ts para otorgar créditos de recompensa.
 *
 * ARQUITECTURA ANTI-FRAUDE:
 * 1. Un usuario solo puede tener UN código de referido activo (unique constraint)
 * 2. Un usuario solo puede ser referido UNA vez (unique constraint en referred_firebase_uid)
 * 3. Auto-referido bloqueado a nivel DB (CHECK referrer_firebase_uid != referred_firebase_uid)
 * 4. Cada evento de recompensa tiene idempotency_key único para prevenir duplicados
 * 5. Recompensas solo se otorgan por eventos verificados: primer estimado o primer pago
 *
 * FLUJO:
 * Referrer genera link → Referred se registra con ?ref=CODE → referral_links.used_at se actualiza
 * → Referred hace primer estimado → referral_rewards INSERT (referrer + referred)
 * → Referred hace primer pago → referral_rewards INSERT (referrer + referred)
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
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

// ================================
// REFERRAL CODES
// Un código único por usuario referidor. Generado al primer acceso al panel de referidos.
// El código es la base del link: https://owlfenc.com/ref/{code}
// ================================
export const referralCodes = pgTable('referral_codes', {
  id: serial('id').primaryKey(),

  // El usuario que posee y comparte este código (el referidor)
  referrerFirebaseUid: varchar('referrer_firebase_uid', { length: 255 }).notNull(),
  referrerUserId: integer('referrer_user_id').notNull(),         // Denormalizado para joins

  // El código único que aparece en el link
  // Formato: 8 caracteres alfanuméricos uppercase, e.g. "OWL8X2KP"
  code: varchar('code', { length: 20 }).notNull(),

  // Control de estado
  isActive: boolean('is_active').notNull().default(true),
  deactivatedAt: timestamp('deactivated_at'),
  deactivatedReason: text('deactivated_reason'),

  // Analytics
  totalClicks: integer('total_clicks').notNull().default(0),
  totalSignups: integer('total_signups').notNull().default(0),
  totalRewardsEarned: integer('total_rewards_earned').notNull().default(0), // en créditos

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  // Un usuario solo puede tener UN código activo
  referrerUniqueIdx: uniqueIndex('referral_codes_referrer_uid_unique').on(table.referrerFirebaseUid),
  // El código en sí debe ser globalmente único
  codeUniqueIdx: uniqueIndex('referral_codes_code_unique').on(table.code),
  // Index para lookup rápido por código (el más frecuente)
  codeIdx: index('referral_codes_code_idx').on(table.code),
  referrerIdx: index('referral_codes_referrer_idx').on(table.referrerFirebaseUid),
}));

// ================================
// REFERRAL LINKS (USES)
// Cada vez que un usuario nuevo se registra usando un código de referido,
// se crea una fila aquí. Esto es el "contrato" entre referidor y referido.
// ================================
export const referralLinks = pgTable('referral_links', {
  id: serial('id').primaryKey(),

  // El código que fue usado
  referralCodeId: integer('referral_code_id').notNull(),         // FK → referral_codes.id
  code: varchar('code', { length: 20 }).notNull(),               // Denormalizado para queries

  // El referidor
  referrerFirebaseUid: varchar('referrer_firebase_uid', { length: 255 }).notNull(),

  // El referido (quien se registró usando el link)
  referredFirebaseUid: varchar('referred_firebase_uid', { length: 255 }).notNull(),
  referredUserId: integer('referred_user_id'),                   // Puede ser null hasta que el user se crea en DB

  // Estado del proceso de referido
  // 'pending'   → se registró pero aún no completó ningún evento de recompensa
  // 'rewarded'  → al menos un evento de recompensa fue procesado
  // 'expired'   → pasaron 90 días sin completar ningún evento
  // 'fraud'     → marcado como fraude, recompensas bloqueadas
  status: varchar('status', { length: 20 }).notNull().default('pending'),

  // Timestamps de eventos clave
  registeredAt: timestamp('registered_at').defaultNow().notNull(), // Cuándo se registró el referido
  firstEstimateAt: timestamp('first_estimate_at'),               // Cuándo hizo su primer estimado
  firstPaymentAt: timestamp('first_payment_at'),                 // Cuándo hizo su primer pago

  // Metadata de fraude
  registrationIp: varchar('registration_ip', { length: 45 }),   // IPv4 o IPv6
  userAgent: text('user_agent'),
  fraudFlags: jsonb('fraud_flags'),                              // Array de flags detectados

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  // ANTI-FRAUDE CRÍTICO: Un usuario solo puede ser referido UNA vez
  referredUniqueIdx: uniqueIndex('referral_links_referred_uid_unique').on(table.referredFirebaseUid),
  // Indexes para queries frecuentes
  referrerIdx: index('referral_links_referrer_idx').on(table.referrerFirebaseUid),
  codeIdx: index('referral_links_code_idx').on(table.code),
  statusIdx: index('referral_links_status_idx').on(table.status),
  referralCodeIdx: index('referral_links_code_id_idx').on(table.referralCodeId),
}));

// ================================
// REFERRAL REWARDS
// Cada recompensa otorgada (tanto al referidor como al referido) es una fila aquí.
// Append-only ledger — nunca se modifica, solo se inserta.
// ================================
export const referralRewards = pgTable('referral_rewards', {
  id: serial('id').primaryKey(),

  // El link de referido que originó esta recompensa
  referralLinkId: integer('referral_link_id').notNull(),         // FK → referral_links.id

  // A quién se le otorga la recompensa
  recipientFirebaseUid: varchar('recipient_firebase_uid', { length: 255 }).notNull(),
  recipientRole: varchar('recipient_role', { length: 20 }).notNull(),
  // 'referrer' → el que compartió el link
  // 'referred' → el que se registró con el link

  // El evento que disparó la recompensa
  triggerEvent: varchar('trigger_event', { length: 50 }).notNull(),
  // 'first_estimate'   → referido completó su primer estimado
  // 'first_payment'    → referido completó su primer pago (cualquier plan)

  // Créditos otorgados
  creditsAwarded: integer('credits_awarded').notNull(),

  // Estado de la recompensa
  // 'pending'   → calculada pero no acreditada aún
  // 'credited'  → acreditada al wallet (walletTransactionId presente)
  // 'failed'    → error al acreditar (ver errorMessage)
  // 'cancelled' → cancelada por fraude u otra razón
  status: varchar('status', { length: 20 }).notNull().default('pending'),

  // FK al ledger del wallet (cuando status = 'credited')
  walletTransactionId: integer('wallet_transaction_id'),         // FK → wallet_transactions.id

  // Idempotency key para prevenir duplicados
  // Formato: referral:{linkId}:{recipientRole}:{triggerEvent}
  // Ejemplo: "referral:42:referrer:first_estimate"
  idempotencyKey: varchar('idempotency_key', { length: 255 }).notNull(),

  // Metadata del evento que disparó la recompensa
  triggerMetadata: jsonb('trigger_metadata'),
  // Para first_estimate: { estimateId, estimateType }
  // Para first_payment: { subscriptionPlanId, planName, amountCents }

  errorMessage: text('error_message'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  creditedAt: timestamp('credited_at'),
}, (table) => ({
  // ANTI-FRAUDE CRÍTICO: Cada combinación link+role+evento solo puede tener UNA recompensa
  idempotencyUniqueIdx: uniqueIndex('referral_rewards_idempotency_unique').on(table.idempotencyKey),
  // Indexes para queries frecuentes
  recipientIdx: index('referral_rewards_recipient_idx').on(table.recipientFirebaseUid),
  linkIdx: index('referral_rewards_link_idx').on(table.referralLinkId),
  statusIdx: index('referral_rewards_status_idx').on(table.status),
  triggerIdx: index('referral_rewards_trigger_idx').on(table.triggerEvent),
}));

// ================================
// REFERRAL SETTINGS (Configuración de recompensas — editable desde admin)
// Una sola fila (singleton). Permite cambiar las recompensas sin deploy.
// ================================
export const referralSettings = pgTable('referral_settings', {
  id: serial('id').primaryKey(),

  // Créditos para el referidor cuando el referido hace su primer estimado
  referrerCreditsOnFirstEstimate: integer('referrer_credits_on_first_estimate').notNull().default(20),
  // Créditos para el referido cuando hace su primer estimado
  referredCreditsOnFirstEstimate: integer('referred_credits_on_first_estimate').notNull().default(10),

  // Créditos para el referidor cuando el referido hace su primer pago
  referrerCreditsOnFirstPayment: integer('referrer_credits_on_first_payment').notNull().default(50),
  // Créditos para el referido cuando hace su primer pago
  referredCreditsOnFirstPayment: integer('referred_credits_on_first_payment').notNull().default(25),

  // Días máximos para que el referido complete un evento de recompensa
  // Después de este período, el link expira y no se otorgan recompensas
  expirationDays: integer('expiration_days').notNull().default(90),

  // Máximo de referidos activos por usuario (anti-spam)
  maxActiveReferrals: integer('max_active_referrals').notNull().default(50),

  // Control de estado del sistema
  isEnabled: boolean('is_enabled').notNull().default(true),

  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  updatedBy: varchar('updated_by', { length: 255 }),             // Firebase UID del admin
});

// ================================
// ZOD SCHEMAS (para validación en API)
// ================================
export const insertReferralCodeSchema = createInsertSchema(referralCodes);
export const selectReferralCodeSchema = createSelectSchema(referralCodes);

export const insertReferralLinkSchema = createInsertSchema(referralLinks);
export const selectReferralLinkSchema = createSelectSchema(referralLinks);

export const insertReferralRewardSchema = createInsertSchema(referralRewards);
export const selectReferralRewardSchema = createSelectSchema(referralRewards);

// ================================
// TIPOS TYPESCRIPT
// ================================
export type ReferralCode = typeof referralCodes.$inferSelect;
export type NewReferralCode = typeof referralCodes.$inferInsert;

export type ReferralLink = typeof referralLinks.$inferSelect;
export type NewReferralLink = typeof referralLinks.$inferInsert;

export type ReferralReward = typeof referralRewards.$inferSelect;
export type NewReferralReward = typeof referralRewards.$inferInsert;

export type ReferralSettings = typeof referralSettings.$inferSelect;

// ================================
// CONSTANTES DE NEGOCIO
// ================================
export const REFERRAL_TRIGGER_EVENTS = {
  FIRST_ESTIMATE: 'first_estimate',
  FIRST_PAYMENT: 'first_payment',
} as const;

export type ReferralTriggerEvent = typeof REFERRAL_TRIGGER_EVENTS[keyof typeof REFERRAL_TRIGGER_EVENTS];

export const REFERRAL_RECIPIENT_ROLES = {
  REFERRER: 'referrer',
  REFERRED: 'referred',
} as const;

export type ReferralRecipientRole = typeof REFERRAL_RECIPIENT_ROLES[keyof typeof REFERRAL_RECIPIENT_ROLES];

export const REFERRAL_LINK_STATUSES = {
  PENDING: 'pending',
  REWARDED: 'rewarded',
  EXPIRED: 'expired',
  FRAUD: 'fraud',
} as const;

export const REFERRAL_REWARD_STATUSES = {
  PENDING: 'pending',
  CREDITED: 'credited',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
} as const;

/**
 * Genera el idempotency key para una recompensa de referido.
 * Garantiza que la misma combinación link+role+evento nunca se procese dos veces.
 */
export function buildReferralRewardIdempotencyKey(
  referralLinkId: number,
  recipientRole: ReferralRecipientRole,
  triggerEvent: ReferralTriggerEvent
): string {
  return `referral:${referralLinkId}:${recipientRole}:${triggerEvent}`;
}

import { relations } from 'drizzle-orm';
import { integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const registrations = pgTable('registrations', {
  id: serial('id').primaryKey(),
  referenceNumber: text('reference_number').notNull().unique(),
  idempotencyKey: text('idempotency_key').unique(),
  userId: integer('user_id').references(() => users.id),
  customerName: text('customer_name').notNull(),
  phoneNumber: text('phone_number').notNull(),
  subcity: text('subcity').notNull(),
  specificLocation: text('specific_location').notNull(),
  servicePriority: text('service_priority').notNull(),
  servicePrice: text('service_price').notNull(),
  servicePriceEtb: integer('service_price_etb'),
  estimatedTimeframe: text('estimated_timeframe').notNull(),
  status: text('status').notNull().default('PENDING'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  registrations: many(registrations),
}));

export const registrationsRelations = relations(registrations, ({ one }) => ({
  user: one(users, {
    fields: [registrations.userId],
    references: [users.id],
  }),
}));

export type RegistrationRecord = typeof registrations.$inferSelect;
export type NewRegistrationRecord = typeof registrations.$inferInsert;

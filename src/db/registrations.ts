import { desc, eq } from 'drizzle-orm';
import { db } from './index.ts';
import { registrations, type RegistrationRecord } from './schema.ts';

export interface CreateRegistrationInput {
  referenceNumber: string;
  idempotencyKey?: string;
  userId?: number | null;
  customerName: string;
  phoneNumber: string;
  subcity: string;
  specificLocation: string;
  servicePriority: string;
  servicePrice: string;
  servicePriceEtb: number | null;
  estimatedTimeframe: string;
}

export async function createRegistration(
  input: CreateRegistrationInput
): Promise<RegistrationRecord> {
  try {
    if (input.idempotencyKey) {
      const existing = await db
        .select()
        .from(registrations)
        .where(eq(registrations.idempotencyKey, input.idempotencyKey))
        .limit(1);

      if (existing.length > 0) {
        return existing[0];
      }
    }

    const inserted = await db
      .insert(registrations)
      .values({
        referenceNumber: input.referenceNumber,
        idempotencyKey: input.idempotencyKey ?? null,
        userId: input.userId ?? null,
        customerName: input.customerName,
        phoneNumber: input.phoneNumber,
        subcity: input.subcity,
        specificLocation: input.specificLocation,
        servicePriority: input.servicePriority,
        servicePrice: input.servicePrice,
        servicePriceEtb: input.servicePriceEtb,
        estimatedTimeframe: input.estimatedTimeframe,
        status: 'PENDING',
      })
      .returning();

    return inserted[0];
  } catch (error) {
    console.error('Database registration insert failed:', error);
    throw new Error('Failed to save registration. Please try again later.', {
      cause: error,
    });
  }
}

export async function getRegistrationsByUserId(userId: number): Promise<RegistrationRecord[]> {
  try {
    return await db
      .select()
      .from(registrations)
      .where(eq(registrations.userId, userId))
      .orderBy(desc(registrations.createdAt));
  } catch (error) {
    console.error('Database registration query failed:', error);
    throw new Error('Failed to load registrations. Please try again later.', {
      cause: error,
    });
  }
}

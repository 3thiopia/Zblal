import crypto from 'node:crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createRegistration } from '../db/registrations.ts';
import { getOrCreateUser } from '../db/users.ts';
import {
  formatCanonicalEtbPrice,
  formatTimeframeFromHours,
  mapLocationRow,
  mapServicePriorityRow,
  mapSubcityRow,
  normalizePriorityCode,
  sortServicePriorities,
  sortSubcities,
  type SupabaseLocation,
  type SupabaseServicePriority,
  type SupabaseSubcity,
} from '../services/supabasePricing.ts';
import {
  formatEthiopianFullPhone,
  isValidEthiopianLocalDigits,
  normalizeEthiopianLocalDigits,
} from '../utils/phone.ts';

export class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export interface ServerSupabaseConfig {
  url: string;
  key: string;
  hasServiceRole: boolean;
  keyRole: 'service_role' | 'anon' | 'secret' | 'unknown';
}

export interface RegistrationPayloadInput {
  customerName?: unknown;
  phoneNumber?: unknown;
  subcityId?: unknown;
  subcity?: unknown;
  locationId?: unknown;
  specificLocation?: unknown;
  servicePriorityId?: unknown;
  servicePriorityCode?: unknown;
  servicePriority?: unknown;
  customerNotes?: unknown;
  customer_notes?: unknown;
  idempotencyKey?: unknown;
}

export interface AuthContextUser {
  uid: string;
  email?: string;
}

export interface ServerConfirmedRegistration {
  id?: string;
  referenceNumber: string;
  customerId?: string;
  customerName: string;
  phoneNumber: string;
  subcityId: string;
  subcity: string;
  subcityNameAm: string | null;
  locationId: string;
  specificLocation: string;
  locationNameAm: string | null;
  servicePriorityId: string;
  servicePriorityCode: string;
  servicePriority: string;
  servicePriorityNameEn: string;
  servicePriorityNameAm: string;
  servicePriceEtb: number;
  servicePrice: string;
  minHours: number | null;
  maxHours: number | null;
  estimatedTimeframe: string;
  status: string;
  createdAt: string;
}

interface SavedServiceRequestRow {
  id?: string;
  reference_number: string;
  customer_id: string;
  subcity_id: string;
  location_id: string;
  priority_id: string;
  priority_code_snapshot: string;
  price_etb: number;
  timeframe_label_snapshot: string;
  status: string;
  created_at: string;
}

const IDEMPOTENCY_TTL_MS = 10 * 60 * 1000;
const completedIdempotencyCache = new Map<
  string,
  { expiresAt: number; result: ServerConfirmedRegistration }
>();
const inFlightIdempotencyRequests = new Map<
  string,
  Promise<ServerConfirmedRegistration>
>();

let cachedServerClient: { keyHash: string; client: SupabaseClient } | null = null;

function detectSupabaseKeyRole(
  key: string
): 'service_role' | 'anon' | 'secret' | 'unknown' {
  if (key.startsWith('sb_secret_')) {
    return 'secret';
  }
  const parts = key.split('.');
  if (parts.length === 3) {
    try {
      const payloadJson = Buffer.from(parts[1], 'base64url').toString('utf8');
      const payload = JSON.parse(payloadJson) as { role?: unknown };
      if (payload.role === 'service_role') return 'service_role';
      if (payload.role === 'anon') return 'anon';
    } catch {
      return 'unknown';
    }
  }
  return 'unknown';
}

export function getServerSupabaseConfig(): ServerSupabaseConfig | null {
  const url = (
    process.env.SUPABASE_URL ??
    process.env.VITE_SUPABASE_URL ??
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    ''
  ).trim();

  const serviceRoleKey = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_SECRET_KEY ??
    process.env.SUPABASE_SERVICE_KEY ??
    process.env.SUPABASE_SERVICE_ROLE ??
    ''
  ).trim();

  const fallbackAnonKey = (
    process.env.SUPABASE_ANON_KEY ??
    process.env.VITE_SUPABASE_ANON_KEY ??
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    ''
  ).trim();

  const key = serviceRoleKey || fallbackAnonKey;
  if (!url || !key) {
    return null;
  }

  const keyRole = detectSupabaseKeyRole(key);

  return {
    url,
    key,
    hasServiceRole:
      serviceRoleKey.length > 0 &&
      (keyRole === 'service_role' || keyRole === 'secret' || keyRole === 'unknown'),
    keyRole,
  };
}

export function getServerSupabaseClient(
  overrideClient?: SupabaseClient
): SupabaseClient {
  if (overrideClient) {
    return overrideClient;
  }

  const config = getServerSupabaseConfig();
  if (!config) {
    throw new HttpError(
      503,
      'Supabase database connection is not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.'
    );
  }

  const keyHash = `${config.url}::${config.key.slice(0, 12)}`;
  if (cachedServerClient && cachedServerClient.keyHash === keyHash) {
    return cachedServerClient.client;
  }

  const client = createClient(config.url, config.key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  cachedServerClient = { keyHash, client };
  return client;
}

function generateReferenceNumber(): string {
  const now = new Date();
  const yyyy = now.getFullYear().toString().slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const suffix = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `POPO-${yyyy}${mm}${dd}-${suffix}`;
}

export async function fetchServerSubcities(
  overrideClient?: SupabaseClient
): Promise<SupabaseSubcity[]> {
  const client = getServerSupabaseClient(overrideClient);
  const { data, error } = await client
    .from('subcities')
    .select('id, name_en, name_am, slug, is_active')
    .eq('is_active', true)
    .order('name_en', { ascending: true });

  if (error) {
    throw new HttpError(
      502,
      error.message || 'Failed to query subcities from Supabase.'
    );
  }

  const mapped = (data ?? [])
    .map((row) => mapSubcityRow(row as Record<string, unknown>))
    .filter((item): item is SupabaseSubcity => item !== null && item.isActive);

  return sortSubcities(mapped);
}

export async function fetchServerLocationsBySubcity(
  subcityId: string,
  overrideClient?: SupabaseClient
): Promise<SupabaseLocation[]> {
  const cleanSubcityId = subcityId.trim();
  if (!cleanSubcityId) {
    throw new HttpError(400, 'subcityId query parameter is required.');
  }

  const client = getServerSupabaseClient(overrideClient);
  const { data, error } = await client
    .from('locations')
    .select('id, subcity_id, name_en, name_am, is_active')
    .eq('subcity_id', cleanSubcityId)
    .eq('is_active', true)
    .order('name_en', { ascending: true });

  if (error) {
    throw new HttpError(
      502,
      error.message || 'Failed to query locations from Supabase.'
    );
  }

  const mapped = (data ?? [])
    .map((row) => mapLocationRow(row as Record<string, unknown>))
    .filter((item): item is SupabaseLocation => item !== null && item.isActive);

  return sortSubcities(mapped);
}

export async function fetchServerServicePriorities(
  overrideClient?: SupabaseClient
): Promise<SupabaseServicePriority[]> {
  const client = getServerSupabaseClient(overrideClient);
  const { data, error } = await client
    .from('service_priorities')
    .select(
      'id, code, name_en, name_am, price_etb, min_hours, max_hours, display_order, is_active'
    )
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  if (error) {
    throw new HttpError(
      502,
      error.message || 'Failed to query service priorities from Supabase.'
    );
  }

  const mapped = (data ?? [])
    .map((row) => mapServicePriorityRow(row as Record<string, unknown>))
    .filter(
      (item): item is SupabaseServicePriority => item !== null && item.isActive
    );

  return sortServicePriorities(mapped);
}

async function resolveSelectedSubcity(
  client: SupabaseClient,
  subcityIdInput: string,
  subcityNameInput: string
): Promise<SupabaseSubcity | null> {
  const activeSubcities = await fetchServerSubcities(client);

  if (subcityIdInput) {
    const byId = activeSubcities.find((item) => item.id === subcityIdInput);
    if (byId) return byId;
  }

  if (subcityNameInput) {
    const lower = subcityNameInput.toLowerCase();
    const byName = activeSubcities.find(
      (item) =>
        item.nameEn.toLowerCase() === lower ||
        (item.nameAm && item.nameAm.toLowerCase() === lower)
    );
    if (byName) return byName;
  }

  return null;
}

async function resolveSelectedLocation(
  client: SupabaseClient,
  subcityId: string,
  locationIdInput: string,
  locationNameInput: string
): Promise<SupabaseLocation | null> {
  if (locationIdInput) {
    const { data, error } = await client
      .from('locations')
      .select('id, subcity_id, name_en, name_am, is_active')
      .eq('id', locationIdInput)
      .limit(1);

    if (error) {
      throw new HttpError(
        502,
        error.message || 'Failed to verify location in Supabase.'
      );
    }

    if (!data || data.length === 0) {
      return null;
    }

    const mapped = mapLocationRow(data[0] as Record<string, unknown>);
    if (!mapped || !mapped.isActive || mapped.subcityId !== subcityId) {
      return null;
    }
    return mapped;
  }

  if (locationNameInput) {
    const subcityLocations = await fetchServerLocationsBySubcity(subcityId, client);
    const lower = locationNameInput.toLowerCase();
    return (
      subcityLocations.find(
        (loc) =>
          loc.nameEn.toLowerCase() === lower ||
          (loc.nameAm && loc.nameAm.toLowerCase() === lower)
      ) ?? null
    );
  }

  return null;
}

async function resolveSelectedPriority(
  client: SupabaseClient,
  priorityIdInput: string,
  priorityCodeInput: string
): Promise<SupabaseServicePriority | null> {
  const activePriorities = await fetchServerServicePriorities(client);

  if (priorityIdInput) {
    const byId = activePriorities.find((item) => item.id === priorityIdInput);
    if (byId) return byId;
  }

  if (priorityCodeInput) {
    const normalizedInput = normalizePriorityCode(priorityCodeInput);
    const byCode = activePriorities.find(
      (item) =>
        normalizePriorityCode(item.code) === normalizedInput ||
        normalizePriorityCode(item.nameEn) === normalizedInput
    );
    if (byCode) return byCode;
  }

  return null;
}

function formatSupabaseWriteError(
  actionLabel: string,
  error: { code?: string; message?: string }
): HttpError {
  const msg = error.message ?? 'Unknown database error';
  if (
    error.code === '42501' ||
    msg.toLowerCase().includes('row-level security') ||
    msg.toLowerCase().includes('permission denied')
  ) {
    return new HttpError(
      500,
      `Server permission error while ${actionLabel}. Ensure SUPABASE_SERVICE_ROLE_KEY is configured in the server environment.`
    );
  }
  return new HttpError(502, `Failed while ${actionLabel}: ${msg}`);
}

/**
 * Find or create customer in `customers` table matched strictly by `phone_e164`.
 * Never overwrites an existing customer's `full_name` automatically.
 */
async function findOrCreateCustomer(
  client: SupabaseClient,
  fullName: string,
  phoneE164: string
): Promise<{ id: string; phoneE164: string }> {
  const { data: existingRows, error: lookupError } = await client
    .from('customers')
    .select('id, phone_e164')
    .eq('phone_e164', phoneE164)
    .limit(1);

  if (lookupError) {
    throw formatSupabaseWriteError('looking up customer in customers', lookupError);
  }

  if (existingRows && existingRows.length > 0 && existingRows[0]?.id) {
    return {
      id: String(existingRows[0].id),
      phoneE164,
    };
  }

  const { data: insertedRows, error: insertError } = await client
    .from('customers')
    .insert({
      full_name: fullName,
      phone_e164: phoneE164,
    })
    .select('id, phone_e164')
    .limit(1);

  if (!insertError && insertedRows && insertedRows.length > 0 && insertedRows[0]?.id) {
    return {
      id: String(insertedRows[0].id),
      phoneE164,
    };
  }

  // Handle concurrent insert on unique phone_e164 without overwriting full_name
  if (insertError?.code === '23505') {
    const { data: racedRows, error: retryLookupError } = await client
      .from('customers')
      .select('id, phone_e164')
      .eq('phone_e164', phoneE164)
      .limit(1);

    if (retryLookupError) {
      throw formatSupabaseWriteError(
        're-reading customer after unique phone_e164 conflict',
        retryLookupError
      );
    }

    if (racedRows && racedRows.length > 0 && racedRows[0]?.id) {
      return {
        id: String(racedRows[0].id),
        phoneE164,
      };
    }
  }

  throw formatSupabaseWriteError(
    'creating customer in customers',
    insertError ?? { message: 'No customer ID returned from Supabase.' }
  );
}

const SERVICE_REQUEST_SELECT_COLS =
  'id, reference_number, customer_id, subcity_id, location_id, priority_id, priority_code_snapshot, price_etb, timeframe_label_snapshot, status, created_at';

function mapSavedServiceRequestRow(
  row: Record<string, unknown>,
  fallback: {
    referenceNumber: string;
    customerId: string;
    subcityId: string;
    locationId: string;
    priorityId: string;
    priorityCode: string;
    priceEtb: number;
    timeframeLabel: string;
    status: string;
  }
): SavedServiceRequestRow {
  return {
    id: typeof row.id === 'string' ? row.id : undefined,
    reference_number:
      typeof row.reference_number === 'string' && row.reference_number.trim()
        ? row.reference_number
        : fallback.referenceNumber,
    customer_id:
      typeof row.customer_id === 'string' && row.customer_id.trim()
        ? row.customer_id
        : fallback.customerId,
    subcity_id:
      typeof row.subcity_id === 'string' && row.subcity_id.trim()
        ? row.subcity_id
        : fallback.subcityId,
    location_id:
      typeof row.location_id === 'string' && row.location_id.trim()
        ? row.location_id
        : fallback.locationId,
    priority_id:
      typeof row.priority_id === 'string' && row.priority_id.trim()
        ? row.priority_id
        : fallback.priorityId,
    priority_code_snapshot:
      typeof row.priority_code_snapshot === 'string' &&
      row.priority_code_snapshot.trim()
        ? row.priority_code_snapshot
        : fallback.priorityCode,
    price_etb:
      typeof row.price_etb === 'number' && Number.isFinite(row.price_etb)
        ? Math.round(row.price_etb)
        : fallback.priceEtb,
    timeframe_label_snapshot:
      typeof row.timeframe_label_snapshot === 'string' &&
      row.timeframe_label_snapshot.trim()
        ? row.timeframe_label_snapshot
        : fallback.timeframeLabel,
    status:
      typeof row.status === 'string' && row.status.trim()
        ? row.status
        : fallback.status,
    created_at:
      typeof row.created_at === 'string' && row.created_at.trim()
        ? row.created_at
        : new Date().toISOString(),
  };
}

const INITIAL_SERVICE_REQUEST_STATUS = 'new' as const;

async function createServiceRequestRecord(
  client: SupabaseClient,
  input: {
    customerId: string;
    subcityId: string;
    locationId: string;
    priorityId: string;
    priorityCodeSnapshot: string;
    priceEtb: number;
    timeframeLabelSnapshot: string;
    customerNotes: string | null;
  }
): Promise<SavedServiceRequestRow> {
  // Cross-instance rapid duplicate submission check (same customer + location + priority within 15s)
  const duplicateCutoffIso = new Date(Date.now() - 15_000).toISOString();
  const { data: recentMatches } = await client
    .from('service_requests')
    .select(SERVICE_REQUEST_SELECT_COLS)
    .eq('customer_id', input.customerId)
    .eq('subcity_id', input.subcityId)
    .eq('location_id', input.locationId)
    .eq('priority_id', input.priorityId)
    .gte('created_at', duplicateCutoffIso)
    .limit(1);

  if (recentMatches && recentMatches.length > 0) {
    return mapSavedServiceRequestRow(
      recentMatches[0] as Record<string, unknown>,
      {
        referenceNumber: generateReferenceNumber(),
        customerId: input.customerId,
        subcityId: input.subcityId,
        locationId: input.locationId,
        priorityId: input.priorityId,
        priorityCode: input.priorityCodeSnapshot,
        priceEtb: input.priceEtb,
        timeframeLabel: input.timeframeLabelSnapshot,
        status: INITIAL_SERVICE_REQUEST_STATUS,
      }
    );
  }

  for (let attempt = 0; attempt < 4; attempt++) {
    const referenceNumber = generateReferenceNumber();
    const insertPayload: Record<string, unknown> = {
      reference_number: referenceNumber,
      customer_id: input.customerId,
      subcity_id: input.subcityId,
      location_id: input.locationId,
      priority_id: input.priorityId,
      priority_code_snapshot: input.priorityCodeSnapshot,
      price_etb: input.priceEtb,
      timeframe_label_snapshot: input.timeframeLabelSnapshot,
      status: INITIAL_SERVICE_REQUEST_STATUS,
    };

    if (input.customerNotes) {
      insertPayload.customer_notes = input.customerNotes;
    }

    const { data, error } = await client
      .from('service_requests')
      .insert(insertPayload)
      .select(SERVICE_REQUEST_SELECT_COLS)
      .limit(1);

    if (!error) {
      const row =
        data && data.length > 0 ? (data[0] as Record<string, unknown>) : {};
      return mapSavedServiceRequestRow(row, {
        referenceNumber,
        customerId: input.customerId,
        subcityId: input.subcityId,
        locationId: input.locationId,
        priorityId: input.priorityId,
        priorityCode: input.priorityCodeSnapshot,
        priceEtb: input.priceEtb,
        timeframeLabel: input.timeframeLabelSnapshot,
        status: INITIAL_SERVICE_REQUEST_STATUS,
      });
    }

    // Retry on rare reference_number collision
    if (
      error.code === '23505' &&
      (error.message ?? '').toLowerCase().includes('reference_number')
    ) {
      continue;
    }

    throw formatSupabaseWriteError('saving service request in service_requests', error);
  }

  throw new HttpError(
    502,
    'Unable to generate a unique reference number for service_requests.'
  );
}

function purgeExpiredIdempotencyCache() {
  const now = Date.now();
  for (const [key, entry] of completedIdempotencyCache.entries()) {
    if (entry.expiresAt <= now) {
      completedIdempotencyCache.delete(key);
    }
  }
}

export async function processRegistrationSubmission(
  body: RegistrationPayloadInput,
  authUser?: AuthContextUser | null,
  options?: { supabaseClient?: SupabaseClient; skipCloudSql?: boolean }
): Promise<ServerConfirmedRegistration> {
  const idempotencyKey =
    typeof body.idempotencyKey === 'string' && body.idempotencyKey.trim().length > 0
      ? body.idempotencyKey.trim().slice(0, 128)
      : undefined;

  if (idempotencyKey) {
    purgeExpiredIdempotencyCache();
    const cached = completedIdempotencyCache.get(idempotencyKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.result;
    }

    const pending = inFlightIdempotencyRequests.get(idempotencyKey);
    if (pending) {
      return pending;
    }
  }

  const executePromise = executeRegistrationSubmission(body, authUser, options);

  if (idempotencyKey) {
    inFlightIdempotencyRequests.set(idempotencyKey, executePromise);
  }

  try {
    const result = await executePromise;
    if (idempotencyKey) {
      completedIdempotencyCache.set(idempotencyKey, {
        expiresAt: Date.now() + IDEMPOTENCY_TTL_MS,
        result,
      });
    }
    return result;
  } finally {
    if (idempotencyKey) {
      inFlightIdempotencyRequests.delete(idempotencyKey);
    }
  }
}

async function executeRegistrationSubmission(
  body: RegistrationPayloadInput,
  authUser?: AuthContextUser | null,
  options?: { supabaseClient?: SupabaseClient; skipCloudSql?: boolean }
): Promise<ServerConfirmedRegistration> {
  const customerName =
    typeof body.customerName === 'string' ? body.customerName.trim() : '';
  const rawPhone =
    typeof body.phoneNumber === 'string' ? body.phoneNumber.trim() : '';
  const subcityIdInput =
    typeof body.subcityId === 'string' ? body.subcityId.trim() : '';
  const subcityNameInput =
    typeof body.subcity === 'string' ? body.subcity.trim() : '';
  const locationIdInput =
    typeof body.locationId === 'string' ? body.locationId.trim() : '';
  const locationNameInput =
    typeof body.specificLocation === 'string' ? body.specificLocation.trim() : '';
  const priorityIdInput =
    typeof body.servicePriorityId === 'string' ? body.servicePriorityId.trim() : '';
  const priorityCodeInput =
    typeof body.servicePriorityCode === 'string'
      ? body.servicePriorityCode.trim()
      : typeof body.servicePriority === 'string'
      ? body.servicePriority.trim()
      : '';
  const rawNotes =
    typeof body.customerNotes === 'string'
      ? body.customerNotes.trim()
      : typeof body.customer_notes === 'string'
      ? body.customer_notes.trim()
      : '';
  const customerNotes = rawNotes.length > 0 ? rawNotes.slice(0, 1000) : null;
  const idempotencyKey =
    typeof body.idempotencyKey === 'string' && body.idempotencyKey.trim().length > 0
      ? body.idempotencyKey.trim().slice(0, 128)
      : undefined;

  // 1. Validate customer full name & Ethiopian mobile number
  if (customerName.length < 2 || customerName.length > 120) {
    throw new HttpError(
      400,
      'Please enter your full name (at least 2 characters).'
    );
  }

  const localDigits = normalizeEthiopianLocalDigits(rawPhone);
  if (!isValidEthiopianLocalDigits(localDigits)) {
    throw new HttpError(
      400,
      'Please enter a valid Ethiopian mobile number (+251 followed by 9 digits starting with 9 or 7).'
    );
  }

  // 2. Normalize phone to E.164 format (+251...)
  const phoneE164 = formatEthiopianFullPhone(localDigits);

  if (!subcityIdInput && !subcityNameInput) {
    throw new HttpError(400, 'Please select an active Addis Ababa subcity.');
  }

  if (!locationIdInput && !locationNameInput) {
    throw new HttpError(400, 'Please select a specific location within the subcity.');
  }

  if (!priorityIdInput && !priorityCodeInput) {
    throw new HttpError(400, 'Please select an active service priority.');
  }

  if (!options?.supabaseClient) {
    const config = getServerSupabaseConfig();
    if (!config) {
      throw new HttpError(
        503,
        'Supabase database connection is not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your server environment.'
      );
    }
    if (config.keyRole === 'anon') {
      throw new HttpError(
        503,
        'SUPABASE_SERVICE_ROLE_KEY is currently set to the public "anon" key instead of the Supabase "service_role" secret key. Please update SUPABASE_SERVICE_ROLE_KEY in your Secrets / server environment using the service_role key from Supabase Dashboard -> Settings -> API.'
      );
    }
  }

  const client = getServerSupabaseClient(options?.supabaseClient);

  // 3. Validate selected subcity, location, and service priority against active DB records
  const verifiedSubcity = await resolveSelectedSubcity(
    client,
    subcityIdInput,
    subcityNameInput
  );
  if (!verifiedSubcity) {
    throw new HttpError(
      400,
      'Please select a valid active Addis Ababa subcity.'
    );
  }

  const verifiedLocation = await resolveSelectedLocation(
    client,
    verifiedSubcity.id,
    locationIdInput,
    locationNameInput
  );
  if (!verifiedLocation) {
    throw new HttpError(
      400,
      'Please select a valid active location within the chosen subcity.'
    );
  }

  const verifiedPriority = await resolveSelectedPriority(
    client,
    priorityIdInput,
    priorityCodeInput
  );
  if (!verifiedPriority) {
    throw new HttpError(
      400,
      'Selected service priority is invalid or no longer active.'
    );
  }

  // 4. Find or create customer record in `customers` (using phone_e164, never overwriting existing full_name)
  const customer = await findOrCreateCustomer(client, customerName, phoneE164);

  // 5. Compute authoritative price and timeframe strictly from DB service_priorities
  const authoritativePriceEtb = Math.round(verifiedPriority.priceEtb);
  const canonicalTimeframe = formatTimeframeFromHours(
    verifiedPriority.minHours,
    verifiedPriority.maxHours,
    'ENG',
    ''
  );

  // 6. Save service request strictly using existing columns of `service_requests`
  const savedRequest = await createServiceRequestRecord(client, {
    customerId: customer.id,
    subcityId: verifiedSubcity.id,
    locationId: verifiedLocation.id,
    priorityId: verifiedPriority.id,
    priorityCodeSnapshot: verifiedPriority.code,
    priceEtb: authoritativePriceEtb,
    timeframeLabelSnapshot: canonicalTimeframe,
    customerNotes,
  });

  const savedPriceEtb = Math.round(savedRequest.price_etb);
  const canonicalPrice = formatCanonicalEtbPrice(savedPriceEtb);

  // Optional non-blocking mirror to Cloud SQL when configured in App Hosting
  if (!options?.skipCloudSql && process.env.SQL_HOST) {
    try {
      let userId: number | null = null;
      if (authUser) {
        const userRecord = await getOrCreateUser(
          authUser.uid,
          authUser.email || ''
        );
        userId = userRecord.id;
      }

      await createRegistration({
        referenceNumber: savedRequest.reference_number,
        idempotencyKey,
        userId,
        customerName,
        phoneNumber: phoneE164,
        subcity: verifiedSubcity.nameEn,
        specificLocation: verifiedLocation.nameEn,
        servicePriority: savedRequest.priority_code_snapshot,
        servicePrice: canonicalPrice,
        servicePriceEtb: savedPriceEtb,
        estimatedTimeframe: savedRequest.timeframe_label_snapshot,
      });
    } catch (mirrorErr) {
      console.warn('Optional Cloud SQL mirror failed (Supabase record saved):', mirrorErr);
    }
  }

  return {
    id: savedRequest.id,
    referenceNumber: savedRequest.reference_number,
    customerId: savedRequest.customer_id,
    customerName,
    phoneNumber: phoneE164,
    subcityId: verifiedSubcity.id,
    subcity: verifiedSubcity.nameEn,
    subcityNameAm: verifiedSubcity.nameAm,
    locationId: verifiedLocation.id,
    specificLocation: verifiedLocation.nameEn,
    locationNameAm: verifiedLocation.nameAm,
    servicePriorityId: verifiedPriority.id,
    servicePriorityCode: savedRequest.priority_code_snapshot,
    servicePriority: verifiedPriority.nameEn,
    servicePriorityNameEn: verifiedPriority.nameEn,
    servicePriorityNameAm: verifiedPriority.nameAm,
    servicePriceEtb: savedPriceEtb,
    servicePrice: canonicalPrice,
    minHours: verifiedPriority.minHours,
    maxHours: verifiedPriority.maxHours,
    estimatedTimeframe: savedRequest.timeframe_label_snapshot,
    status: savedRequest.status,
    createdAt: savedRequest.created_at,
  };
}

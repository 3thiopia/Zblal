import { getBrowserSupabaseClient } from '../lib/supabase.ts';
import {
  mapLocationRow,
  mapServicePriorityRow,
  mapSubcityRow,
  sortServicePriorities,
  sortSubcities,
  type SupabaseLocation,
  type SupabaseServicePriority,
  type SupabaseSubcity,
} from './supabasePricing.ts';

async function fetchCatalogApi<T>(path: string): Promise<T> {
  const response = await fetch(path, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      payload && typeof payload.error === 'string'
        ? payload.error
        : `Catalog request failed (${response.status})`;
    throw new Error(message);
  }

  return payload as T;
}

export async function fetchActiveSubcities(): Promise<SupabaseSubcity[]> {
  const client = getBrowserSupabaseClient();
  if (client) {
    const { data, error } = await client
      .from('subcities')
      .select('id, name_en, name_am, slug, is_active')
      .eq('is_active', true)
      .order('name_en', { ascending: true });

    if (error) {
      throw new Error(error.message || 'Failed to load subcities from Supabase.');
    }

    const mapped = (data ?? [])
      .map((row) => mapSubcityRow(row as Record<string, unknown>))
      .filter((item): item is SupabaseSubcity => item !== null && item.isActive);

    return sortSubcities(mapped);
  }

  const payload = await fetchCatalogApi<{ subcities: SupabaseSubcity[] }>(
    '/api/catalog/subcities'
  );
  return sortSubcities(payload.subcities ?? []);
}

export async function fetchActiveLocationsBySubcity(
  subcityId: string
): Promise<SupabaseLocation[]> {
  const cleanId = subcityId.trim();
  if (!cleanId) {
    return [];
  }

  const client = getBrowserSupabaseClient();
  if (client) {
    const { data, error } = await client
      .from('locations')
      .select('id, subcity_id, name_en, name_am, is_active')
      .eq('subcity_id', cleanId)
      .eq('is_active', true)
      .order('name_en', { ascending: true });

    if (error) {
      throw new Error(error.message || 'Failed to load locations from Supabase.');
    }

    const mapped = (data ?? [])
      .map((row) => mapLocationRow(row as Record<string, unknown>))
      .filter((item): item is SupabaseLocation => item !== null && item.isActive);

    return sortSubcities(mapped);
  }

  const payload = await fetchCatalogApi<{ locations: SupabaseLocation[] }>(
    `/api/catalog/locations?subcityId=${encodeURIComponent(cleanId)}`
  );
  return sortSubcities(payload.locations ?? []);
}

export async function fetchActiveServicePriorities(): Promise<
  SupabaseServicePriority[]
> {
  const client = getBrowserSupabaseClient();
  if (client) {
    const { data, error } = await client
      .from('service_priorities')
      .select(
        'id, code, name_en, name_am, price_etb, min_hours, max_hours, display_order, is_active'
      )
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error) {
      throw new Error(
        error.message || 'Failed to load service priorities from Supabase.'
      );
    }

    const mapped = (data ?? [])
      .map((row) => mapServicePriorityRow(row as Record<string, unknown>))
      .filter(
        (item): item is SupabaseServicePriority => item !== null && item.isActive
      );

    return sortServicePriorities(mapped);
  }

  const payload = await fetchCatalogApi<{
    priorities: SupabaseServicePriority[];
  }>('/api/catalog/service-priorities');
  return sortServicePriorities(payload.priorities ?? []);
}

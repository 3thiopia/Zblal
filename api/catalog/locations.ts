import {
  HttpError,
  fetchServerLocationsBySubcity,
} from '../../src/server/supabaseServer.ts';

interface VercelRequestLike {
  method?: string;
  url?: string;
  query?: Record<string, string | string[] | undefined>;
}

interface VercelResponseLike {
  statusCode: number;
  setHeader(name: string, value: string): void;
  end(body?: string): void;
}

function sendJson(res: VercelResponseLike, status: number, payload: unknown) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

export default async function handler(
  req: VercelRequestLike,
  res: VercelResponseLike
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return sendJson(res, 405, { error: 'Method Not Allowed' });
  }

  try {
    let subcityId = '';
    const q = req.query?.subcityId;
    if (typeof q === 'string') {
      subcityId = q;
    } else if (Array.isArray(q) && typeof q[0] === 'string') {
      subcityId = q[0];
    } else if (req.url) {
      const parsed = new URL(req.url, 'http://localhost');
      subcityId = parsed.searchParams.get('subcityId') ?? '';
    }

    const locations = await fetchServerLocationsBySubcity(subcityId);
    return sendJson(res, 200, { locations });
  } catch (error: unknown) {
    const status = error instanceof HttpError ? error.status : 500;
    const message =
      error instanceof Error ? error.message : 'Failed to load locations.';
    return sendJson(res, status, { error: message });
  }
}

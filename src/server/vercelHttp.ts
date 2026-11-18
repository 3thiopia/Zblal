import { HttpError } from './supabaseServer.ts';

export interface ServerlessRequestLike {
  method?: string;
  body?: unknown;
  query?: Record<string, string | string[] | undefined>;
  url?: string;
  [Symbol.asyncIterator]?: () => AsyncIterator<Buffer | string>;
}

export interface ServerlessResponseLike {
  statusCode: number;
  setHeader(name: string, value: string): void;
  end(body?: string): void;
}

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept',
};

export function applyCorsHeaders(res: ServerlessResponseLike) {
  for (const [k, v] of Object.entries(CORS_HEADERS)) {
    res.setHeader(k, v);
  }
}

export function sendServerlessJson(
  res: ServerlessResponseLike,
  status: number,
  payload: unknown
) {
  res.statusCode = status;
  applyCorsHeaders(res);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

export function handleCorsPreflight(
  req: ServerlessRequestLike,
  res: ServerlessResponseLike
): boolean {
  if (req.method === 'OPTIONS') {
    sendServerlessJson(res, 200, { ok: true });
    return true;
  }
  return false;
}

export async function readServerlessJsonBody(
  req: ServerlessRequestLike
): Promise<Record<string, unknown>> {
  if (req.body !== undefined) {
    if (typeof req.body === 'string') {
      if (!req.body.trim()) return {};
      try {
        const parsed = JSON.parse(req.body);
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
          ? (parsed as Record<string, unknown>)
          : {};
      } catch {
        throw new HttpError(400, 'Invalid JSON request body.');
      }
    }
    if (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) {
      return req.body as Record<string, unknown>;
    }
    return {};
  }

  if (!req[Symbol.asyncIterator]) {
    return {};
  }

  const chunks: Buffer[] = [];
  for await (const chunk of req as AsyncIterable<Buffer | string>) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    throw new HttpError(400, 'Invalid JSON request body.');
  }
}

export function getQueryParam(
  req: ServerlessRequestLike,
  key: string
): string {
  const fromQuery = req.query?.[key];
  if (typeof fromQuery === 'string') return fromQuery.trim();
  if (Array.isArray(fromQuery) && typeof fromQuery[0] === 'string') {
    return fromQuery[0].trim();
  }
  if (typeof req.url === 'string') {
    try {
      const parsed = new URL(req.url, 'http://localhost');
      return (parsed.searchParams.get(key) ?? '').trim();
    } catch {
      return '';
    }
  }
  return '';
}

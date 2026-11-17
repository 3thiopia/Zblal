import {
  HttpError,
  fetchServerServicePriorities,
} from '../../src/server/supabaseServer.ts';

interface VercelRequestLike {
  method?: string;
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
    const priorities = await fetchServerServicePriorities();
    return sendJson(res, 200, { priorities });
  } catch (error: unknown) {
    const status = error instanceof HttpError ? error.status : 500;
    const message =
      error instanceof Error
        ? error.message
        : 'Failed to load service priorities.';
    return sendJson(res, status, { error: message });
  }
}

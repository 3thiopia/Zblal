import { fetchPublicCompetitionsOverview } from '../../../src/server/arcadeServer.ts';
import { HttpError } from '../../../src/server/supabaseServer.ts';
import {
  getQueryParam,
  handleCorsPreflight,
  sendServerlessJson,
  type ServerlessRequestLike,
  type ServerlessResponseLike,
} from '../../../src/server/vercelHttp.ts';

export default async function handler(
  req: ServerlessRequestLike,
  res: ServerlessResponseLike
) {
  if (handleCorsPreflight(req, res)) return;

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET, OPTIONS');
    return sendServerlessJson(res, 405, { error: 'Method Not Allowed' });
  }

  try {
    const playerId = getQueryParam(req, 'playerId') || null;
    const overview = await fetchPublicCompetitionsOverview(playerId);
    return sendServerlessJson(res, 200, overview);
  } catch (error: unknown) {
    const status = error instanceof HttpError ? error.status : 500;
    const message =
      error instanceof Error ? error.message : 'Failed to load competitions.';
    return sendServerlessJson(res, status, { error: message });
  }
}

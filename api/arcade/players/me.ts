import { fetchPublicArcadePlayer } from '../../../src/server/arcadeServer.ts';
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
    const playerId = getQueryParam(req, 'playerId');
    const player = await fetchPublicArcadePlayer(playerId);
    if (!player) {
      return sendServerlessJson(res, 404, { error: 'Player profile not found.' });
    }
    return sendServerlessJson(res, 200, { player });
  } catch (error: unknown) {
    const status = error instanceof HttpError ? error.status : 500;
    const message =
      error instanceof Error ? error.message : 'Failed to load player profile.';
    return sendServerlessJson(res, status, { error: message });
  }
}

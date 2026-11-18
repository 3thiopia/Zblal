import { registerOrResumeArcadePlayer } from '../../../src/server/arcadeServer.ts';
import { HttpError } from '../../../src/server/supabaseServer.ts';
import {
  handleCorsPreflight,
  readServerlessJsonBody,
  sendServerlessJson,
  type ServerlessRequestLike,
  type ServerlessResponseLike,
} from '../../../src/server/vercelHttp.ts';

export default async function handler(
  req: ServerlessRequestLike,
  res: ServerlessResponseLike
) {
  if (handleCorsPreflight(req, res)) return;

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return sendServerlessJson(res, 405, { error: 'Method Not Allowed' });
  }

  try {
    const body = await readServerlessJsonBody(req);
    const result = await registerOrResumeArcadePlayer(body);
    return sendServerlessJson(res, result.returning ? 200 : 201, result);
  } catch (error: unknown) {
    const status = error instanceof HttpError ? error.status : 500;
    const message =
      error instanceof Error ? error.message : 'Failed to register player.';
    return sendServerlessJson(res, status, { error: message });
  }
}

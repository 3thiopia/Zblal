import { getArcadeSchemaStatus } from '../../src/server/arcadeServer.ts';
import { HttpError } from '../../src/server/supabaseServer.ts';
import {
  handleCorsPreflight,
  sendServerlessJson,
  type ServerlessRequestLike,
  type ServerlessResponseLike,
} from '../../src/server/vercelHttp.ts';

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
    const status = await getArcadeSchemaStatus();
    return sendServerlessJson(res, 200, status);
  } catch (error: unknown) {
    const status = error instanceof HttpError ? error.status : 500;
    const message =
      error instanceof Error ? error.message : 'Schema check failed.';
    return sendServerlessJson(res, status, {
      initialized: false,
      error: message,
    });
  }
}

import type { LeaderboardPeriod } from '../../src/arcade/arcadeConfig.ts';
import { fetchPublicLeaderboard } from '../../src/server/arcadeServer.ts';
import { HttpError } from '../../src/server/supabaseServer.ts';
import {
  getQueryParam,
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
    const gameId = getQueryParam(req, 'gameId') || 'poop-man';
    const rawPeriod = getQueryParam(req, 'period') || 'daily';
    const period: LeaderboardPeriod =
      rawPeriod === 'weekly' || rawPeriod === 'all_time' ? rawPeriod : 'daily';
    const playerId = getQueryParam(req, 'playerId') || null;
    const competitionId = getQueryParam(req, 'competitionId') || null;

    const leaderboard = await fetchPublicLeaderboard({
      gameId,
      period,
      playerId,
      competitionId,
    });
    return sendServerlessJson(res, 200, leaderboard);
  } catch (error: unknown) {
    const status = error instanceof HttpError ? error.status : 500;
    const message =
      error instanceof Error ? error.message : 'Failed to load leaderboard.';
    return sendServerlessJson(res, status, { error: message });
  }
}

import { isWallTile, type MazeDefinition } from './poopManMazes.ts';

export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | 'NONE';
export type GermPersonality = 'chaser' | 'ambusher' | 'patroller' | 'trickster';

export interface GridPoint {
  col: number;
  row: number;
}

export interface GermEntity {
  id: number;
  name: string;
  color: string;
  accentColor: string;
  x: number;
  y: number;
  dir: Direction;
  homeCorner: GridPoint;
  releaseDelay: number;
  inPen: boolean;
  personality: GermPersonality;
  // AI & movement state
  penExitTarget: GridPoint;
  patrolIndex: number;
  recalcTimer: number;
  lastTargetKey: string;
  cachedDir: Direction;
  lastDecisionTileKey: string;
  stuckTimer: number;
  lastCheckX: number;
  lastCheckY: number;
  tricksterFlipTimer: number;
  tricksterFlankMode: boolean;
}

export const DIR_VECTOR: Record<Direction, { dx: number; dy: number }> = {
  UP: { dx: 0, dy: -1 },
  DOWN: { dx: 0, dy: 1 },
  LEFT: { dx: -1, dy: 0 },
  RIGHT: { dx: 1, dy: 0 },
  NONE: { dx: 0, dy: 0 },
};

export const OPPOSITE_DIR: Record<Direction, Direction> = {
  UP: 'DOWN',
  DOWN: 'UP',
  LEFT: 'RIGHT',
  RIGHT: 'LEFT',
  NONE: 'NONE',
};

export const ALL_DIRS: Exclude<Direction, 'NONE'>[] = ['UP', 'DOWN', 'LEFT', 'RIGHT'];

// Pre-allocated BFS scratch buffers (255 cells max for 15x17 maze -> zero GC churn)
const MAX_CELLS = 15 * 17;
const bfsVisited = new Int32Array(MAX_CELLS);
const bfsDist = new Int16Array(MAX_CELLS);
const bfsQueueCol = new Int16Array(MAX_CELLS);
const bfsQueueRow = new Int16Array(MAX_CELLS);
let bfsStamp = 1;

export function wrapCol(col: number, cols: number): number {
  const m = col % cols;
  return m < 0 ? m + cols : m;
}

export function wrapX(x: number, cols: number): number {
  let wrapped = x;
  while (wrapped < 0) wrapped += cols;
  while (wrapped >= cols) wrapped -= cols;
  return wrapped;
}

export function isPenTile(maze: MazeDefinition, col: number, row: number): boolean {
  if (row < 0 || row >= maze.rows) return false;
  const c = wrapCol(col, maze.cols);
  return maze.grid[row][c] === 'E';
}

export function canMoveFrom(
  maze: MazeDefinition,
  col: number,
  row: number,
  dir: Direction,
  allowPenEntry: boolean
): boolean {
  if (dir === 'NONE') return false;
  const v = DIR_VECTOR[dir];
  const rawNextCol = col + v.dx;
  const nextRow = row + v.dy;
  if (isWallTile(maze, rawNextCol, nextRow)) return false;

  const nextCol = wrapCol(rawNextCol, maze.cols);
  if (!allowPenEntry && isPenTile(maze, nextCol, nextRow) && !isPenTile(maze, col, row)) {
    return false;
  }
  return true;
}

/**
 * Finds the shortest maze distance (in grid steps) from (startCol, startRow) to (targetCol, targetRow).
 * Optionally blocks one forbidden tile (such as the germ's immediately previous intersection tile)
 * to prevent entering dead-ends or oscillating backward around loops.
 */
export function computeMazeDistance(
  maze: MazeDefinition,
  startCol: number,
  startRow: number,
  targetCol: number,
  targetRow: number,
  allowPenEntry: boolean,
  blockedCol = -1,
  blockedRow = -1
): number {
  const sCol = wrapCol(startCol, maze.cols);
  const tCol = wrapCol(targetCol, maze.cols);

  if (sCol === tCol && startRow === targetRow) return 0;
  if (isWallTile(maze, sCol, startRow) || isWallTile(maze, tCol, targetRow)) {
    return Number.POSITIVE_INFINITY;
  }

  bfsStamp += 1;
  if (bfsStamp >= 1_000_000_000) {
    bfsVisited.fill(0);
    bfsStamp = 1;
  }
  const stamp = bfsStamp;

  let head = 0;
  let tail = 0;

  const startIdx = startRow * maze.cols + sCol;
  bfsVisited[startIdx] = stamp;
  bfsDist[startIdx] = 0;
  bfsQueueCol[tail] = sCol;
  bfsQueueRow[tail] = startRow;
  tail += 1;

  while (head < tail) {
    const c = bfsQueueCol[head];
    const r = bfsQueueRow[head];
    const d = bfsDist[r * maze.cols + c];
    head += 1;

    for (let i = 0; i < 4; i++) {
      const dir = ALL_DIRS[i];
      if (!canMoveFrom(maze, c, r, dir, allowPenEntry)) continue;

      const v = DIR_VECTOR[dir];
      const nc = wrapCol(c + v.dx, maze.cols);
      const nr = r + v.dy;

      if (nc === blockedCol && nr === blockedRow) continue;

      if (nc === tCol && nr === targetRow) {
        return d + 1;
      }

      const nIdx = nr * maze.cols + nc;
      if (bfsVisited[nIdx] !== stamp) {
        bfsVisited[nIdx] = stamp;
        bfsDist[nIdx] = d + 1;
        bfsQueueCol[tail] = nc;
        bfsQueueRow[tail] = nr;
        tail += 1;
      }
    }
  }

  return Number.POSITIVE_INFINITY;
}

/**
 * Finds the nearest walkable tile to a desired (col, row) coordinate so off-wall targets
 * (like projected ambusher points) always resolve to a valid maze cell.
 */
export function findNearestWalkableTile(
  maze: MazeDefinition,
  col: number,
  row: number,
  allowPen = false
): GridPoint {
  const clampedRow = Math.max(0, Math.min(maze.rows - 1, row));
  const clampedCol = Math.max(0, Math.min(maze.cols - 1, col));

  if (!isWallTile(maze, clampedCol, clampedRow) && (allowPen || !isPenTile(maze, clampedCol, clampedRow))) {
    return { col: clampedCol, row: clampedRow };
  }

  bfsStamp += 1;
  const stamp = bfsStamp;
  let head = 0;
  let tail = 0;

  const startIdx = clampedRow * maze.cols + clampedCol;
  bfsVisited[startIdx] = stamp;
  bfsQueueCol[tail] = clampedCol;
  bfsQueueRow[tail] = clampedRow;
  tail += 1;

  while (head < tail) {
    const c = bfsQueueCol[head];
    const r = bfsQueueRow[head];
    head += 1;

    for (let i = 0; i < 4; i++) {
      const v = DIR_VECTOR[ALL_DIRS[i]];
      const nc = c + v.dx;
      const nr = r + v.dy;
      if (nr < 0 || nr >= maze.rows || nc < 0 || nc >= maze.cols) continue;

      const idx = nr * maze.cols + nc;
      if (bfsVisited[idx] === stamp) continue;
      bfsVisited[idx] = stamp;

      if (!isWallTile(maze, nc, nr) && (allowPen || !isPenTile(maze, nc, nr))) {
        return { col: nc, row: nr };
      }

      bfsQueueCol[tail] = nc;
      bfsQueueRow[tail] = nr;
      tail += 1;
    }
  }

  return { col: 1, row: 1 };
}

function getPatrolWaypoints(maze: MazeDefinition): GridPoint[] {
  const raw = [
    { col: 1, row: 1 },
    { col: maze.cols - 2, row: 1 },
    { col: maze.cols - 2, row: maze.rows - 2 },
    { col: 1, row: maze.rows - 2 },
    { col: 3, row: 9 },
    { col: maze.cols - 4, row: 9 },
  ];
  return raw.map((pt) => findNearestWalkableTile(maze, pt.col, pt.row, false));
}

function computeGermTarget(
  germ: GermEntity,
  maze: MazeDefinition,
  playerCol: number,
  playerRow: number,
  playerDir: Direction,
  modeTimer: number,
  level: number
): GridPoint {
  // 1. Inside pen: aim directly outside one of the pen doors on row 5 (col 6 or col 8)
  if (germ.inPen) {
    return germ.penExitTarget;
  }

  // Periodic gentle scatter phase (shorter on higher levels) keeps chases dynamic
  const scatterDuration = Math.max(1.8, 3.6 - (level - 1) * 0.35);
  const cyclePos = modeTimer % (14 + scatterDuration);
  const isGlobalScatter = cyclePos > 14;

  if (isGlobalScatter && germ.personality !== 'chaser') {
    return findNearestWalkableTile(maze, germ.homeCorner.col, germ.homeCorner.row, false);
  }

  switch (germ.personality) {
    case 'chaser': {
      // Shortest direct maze route to POOP MAN
      return findNearestWalkableTile(maze, playerCol, playerRow, false);
    }

    case 'ambusher': {
      // Aim 3–4 corridor tiles ahead of POOP MAN to cut him off
      const distToPlayer = computeMazeDistance(
        maze,
        Math.floor(wrapX(germ.x, maze.cols)),
        Math.floor(germ.y),
        playerCol,
        playerRow,
        false
      );
      if (distToPlayer <= 2) {
        return findNearestWalkableTile(maze, playerCol, playerRow, false);
      }

      let aheadCol = playerCol;
      let aheadRow = playerRow;
      if (playerDir !== 'NONE') {
        const pv = DIR_VECTOR[playerDir];
        // Step forward along player's corridor as far as open (up to 4 tiles)
        for (let step = 1; step <= 4; step++) {
          const tc = wrapCol(aheadCol + pv.dx, maze.cols);
          const tr = aheadRow + pv.dy;
          if (!isWallTile(maze, tc, tr) && !isPenTile(maze, tc, tr)) {
            aheadCol = tc;
            aheadRow = tr;
          } else {
            break;
          }
        }
        // If blocked immediately in front, project ahead and snap to nearest corridor
        if (aheadCol === playerCol && aheadRow === playerRow) {
          return findNearestWalkableTile(
            maze,
            playerCol + pv.dx * 3,
            playerRow + pv.dy * 3,
            false
          );
        }
      }
      return { col: aheadCol, row: aheadRow };
    }

    case 'patroller': {
      const gCol = Math.floor(wrapX(germ.x, maze.cols));
      const gRow = Math.floor(germ.y);
      const distToPlayer = computeMazeDistance(
        maze,
        gCol,
        gRow,
        playerCol,
        playerRow,
        false
      );

      // Pursue POOP MAN whenever he enters nearby range; otherwise patrol maze sectors
      if (distToPlayer <= 6) {
        return findNearestWalkableTile(maze, playerCol, playerRow, false);
      }

      const waypoints = getPatrolWaypoints(maze);
      const currentWp = waypoints[germ.patrolIndex % waypoints.length];
      if (gCol === currentWp.col && gRow === currentWp.row) {
        germ.patrolIndex = (germ.patrolIndex + 1) % waypoints.length;
      }
      return waypoints[germ.patrolIndex % waypoints.length];
    }

    case 'trickster': {
      const gCol = Math.floor(wrapX(germ.x, maze.cols));
      const gRow = Math.floor(germ.y);
      const distToPlayer = computeMazeDistance(
        maze,
        gCol,
        gRow,
        playerCol,
        playerRow,
        false
      );

      // Close-in finish OR strategic flanking / alternate-side targeting
      if (distToPlayer <= 3) {
        return findNearestWalkableTile(maze, playerCol, playerRow, false);
      }

      if (germ.tricksterFlankMode) {
        // Aim for an intersection flanking POOP MAN from the opposite side of the corridor
        const pv = DIR_VECTOR[playerDir === 'NONE' ? 'LEFT' : playerDir];
        const flankCol = playerCol - pv.dx * 3 + (pv.dy !== 0 ? 3 : 0);
        const flankRow = playerRow - pv.dy * 3 + (pv.dx !== 0 ? 3 : 0);
        return findNearestWalkableTile(maze, flankCol, flankRow, false);
      }

      return findNearestWalkableTile(maze, playerCol, playerRow, false);
    }
  }
}

/**
 * Chooses the optimal valid direction at tile (col, row) using BFS shortest-path distances.
 * Prevents 180-degree reversals at intersections, avoids dead-ends when a better loop exists,
 * and caches pathing decisions between target/intersection updates.
 */
export function pickGermDirectionBFS(
  germ: GermEntity,
  col: number,
  row: number,
  maze: MazeDefinition,
  playerCol: number,
  playerRow: number,
  playerDir: Direction,
  modeTimer: number,
  level: number
): Direction {
  // Mark pen exited once germ reaches row <= 5 outside the E cells
  if (germ.inPen && row <= 5 && !isPenTile(maze, col, row)) {
    germ.inPen = false;
    germ.lastTargetKey = '';
  }

  const target = computeGermTarget(
    germ,
    maze,
    playerCol,
    playerRow,
    playerDir,
    modeTimer,
    level
  );
  const targetKey = `${target.col},${target.row}:${germ.inPen ? 'P' : 'M'}`;

  // Legal forward/side directions (disallow immediate 180 reversal unless dead-end)
  const nonReverseDirs = ALL_DIRS.filter(
    (d) => d !== OPPOSITE_DIR[germ.dir] && canMoveFrom(maze, col, row, d, germ.inPen)
  );
  const allLegalDirs = ALL_DIRS.filter((d) =>
    canMoveFrom(maze, col, row, d, germ.inPen)
  );

  const candidates = nonReverseDirs.length > 0 ? nonReverseDirs : allLegalDirs;

  if (candidates.length === 0) return 'NONE';
  if (candidates.length === 1) {
    germ.lastTargetKey = targetKey;
    germ.cachedDir = candidates[0];
    return candidates[0];
  }

  // If still inside a straight corridor / non-recalculation tick and cachedDir is valid, reuse it
  if (
    germ.recalcTimer > 0 &&
    germ.lastTargetKey === targetKey &&
    germ.cachedDir !== 'NONE' &&
    candidates.includes(germ.cachedDir as Exclude<Direction, 'NONE'>)
  ) {
    return germ.cachedDir;
  }

  // Evaluate exact shortest maze path from each candidate neighbor without backtracking through (col, row)
  let bestDir: Direction = candidates[0];
  let bestScore = Number.POSITIVE_INFINITY;

  // Deterministic tie-breaker offset per germ so germs naturally diverge on tied routes
  const orderOffset = germ.id % 4;
  for (let i = 0; i < candidates.length; i++) {
    const idx = (i + orderOffset) % candidates.length;
    const dir = candidates[idx];
    const v = DIR_VECTOR[dir];
    const nc = wrapCol(col + v.dx, maze.cols);
    const nr = row + v.dy;

    // First check non-backtracking path (prevents entering dead-ends unless target is inside them!)
    let dist = computeMazeDistance(
      maze,
      nc,
      nr,
      target.col,
      target.row,
      germ.inPen,
      col,
      row
    );

    // If unreachable without backtracking (e.g., all forward routes blocked), allow full BFS
    if (!Number.isFinite(dist)) {
      dist =
        computeMazeDistance(maze, nc, nr, target.col, target.row, germ.inPen) +
        100;
    }

    if (dist < bestScore) {
      bestScore = dist;
      bestDir = dir;
    }
  }

  // If every non-reversing candidate was completely finite-unreachable (shouldn't happen in connected maze,
  // except if trapped inside pen), fallback to all legal dirs including reverse
  if (!Number.isFinite(bestScore) && nonReverseDirs.length < allLegalDirs.length) {
    for (const dir of allLegalDirs) {
      const v = DIR_VECTOR[dir];
      const nc = wrapCol(col + v.dx, maze.cols);
      const nr = row + v.dy;
      const dist = computeMazeDistance(
        maze,
        nc,
        nr,
        target.col,
        target.row,
        germ.inPen
      );
      if (dist < bestScore) {
        bestScore = dist;
        bestDir = dir;
      }
    }
  }

  germ.lastTargetKey = targetKey;
  germ.cachedDir = bestDir;
  germ.recalcTimer = 0.22; // Sensible interval before full recalculation unless target changes
  return bestDir;
}

export function createGermsForLevel(
  level: number,
  penTiles: GridPoint[],
  maze: MazeDefinition
): GermEntity[] {
  const fallbackPen: GridPoint[] = [
    { col: 6, row: 7 },
    { col: 7, row: 7 },
    { col: 8, row: 7 },
  ];
  const spawns = penTiles.length >= 3 ? penTiles : fallbackPen;

  // Locate the open pen exit tiles right above row 6 (e.g. (6,5) and (8,5))
  const leftExit = findNearestWalkableTile(maze, 6, 5, false);
  const rightExit = findNearestWalkableTile(maze, 8, 5, false);

  const roster: {
    id: number;
    name: string;
    color: string;
    accentColor: string;
    homeCorner: GridPoint;
    releaseDelay: number;
    personality: GermPersonality;
    penExitTarget: GridPoint;
    patrolIndex: number;
  }[] = [
    {
      id: 0,
      name: 'Chaser · Slime Sprout',
      color: '#EF4444',
      accentColor: '#FCA5A5',
      homeCorner: { col: maze.cols - 2, row: 1 },
      releaseDelay: 0.2,
      personality: 'chaser',
      penExitTarget: leftExit,
      patrolIndex: 0,
    },
    {
      id: 1,
      name: 'Ambusher · Bubble Blob',
      color: '#38BDF8',
      accentColor: '#BAE6FD',
      homeCorner: { col: 1, row: 1 },
      releaseDelay: 1.5,
      personality: 'ambusher',
      penExitTarget: rightExit,
      patrolIndex: 1,
    },
    {
      id: 2,
      name: 'Patroller · Stink Bug',
      color: '#A855F7',
      accentColor: '#E9D5FF',
      homeCorner: { col: maze.cols - 2, row: maze.rows - 2 },
      releaseDelay: 2.8,
      personality: 'patroller',
      penExitTarget: leftExit,
      patrolIndex: 2,
    },
    {
      id: 3,
      name: 'Trickster · Gunk Boss',
      color: '#FB923C',
      accentColor: '#FED7AA',
      homeCorner: { col: 1, row: maze.rows - 2 },
      releaseDelay: 4.1,
      personality: 'trickster',
      penExitTarget: rightExit,
      patrolIndex: 3,
    },
  ];

  return roster.map((cfg, idx) => {
    const pt = spawns[idx % spawns.length];
    return {
      ...cfg,
      x: pt.col + 0.5,
      y: pt.row + 0.5,
      dir: 'UP',
      inPen: true,
      recalcTimer: 0,
      lastTargetKey: '',
      cachedDir: 'NONE',
      lastDecisionTileKey: '',
      stuckTimer: 0,
      lastCheckX: pt.col + 0.5,
      lastCheckY: pt.row + 0.5,
      tricksterFlipTimer: 5.5,
      tricksterFlankMode: false,
    };
  });
}

/**
 * Advances a germ smoothly along the grid, making exact tile-center decisions,
 * never skipping intersections, never overlapping walls, and auto-recovering if stalled.
 */
export function stepGermWithAI(
  germ: GermEntity,
  maze: MazeDefinition,
  playerX: number,
  playerY: number,
  playerDir: Direction,
  modeTimer: number,
  level: number,
  dt: number
) {
  if (germ.releaseDelay > 0) {
    germ.releaseDelay = Math.max(0, germ.releaseDelay - dt);
    return;
  }

  germ.recalcTimer = Math.max(0, germ.recalcTimer - dt);

  if (germ.personality === 'trickster') {
    germ.tricksterFlipTimer -= dt;
    if (germ.tricksterFlipTimer <= 0) {
      germ.tricksterFlankMode = !germ.tricksterFlankMode;
      germ.tricksterFlipTimer = germ.tricksterFlankMode ? 4.5 : 6.0;
      germ.lastTargetKey = '';
    }
  }

  const playerCol = Math.floor(wrapX(playerX, maze.cols));
  const playerRow = Math.floor(Math.max(0, Math.min(maze.rows - 1, playerY)));

  // Safety guard: ensure germ never gets stuck inside a wall tile
  let guardCol = Math.floor(wrapX(germ.x, maze.cols));
  let guardRow = Math.floor(Math.max(0, Math.min(maze.rows - 1, germ.y)));
  if (isWallTile(maze, guardCol, guardRow)) {
    const safe = findNearestWalkableTile(maze, guardCol, guardRow, germ.inPen);
    germ.x = safe.col + 0.5;
    germ.y = safe.row + 0.5;
    germ.dir = 'NONE';
    germ.lastDecisionTileKey = '';
  }

  // Gradual speed scaling across levels (fair, capped below boosted player speed)
  const levelScale = Math.min(0.96, 0.70 + (level - 1) * 0.055);
  const speed = 5.35 * levelScale;
  let dist = speed * dt;

  let iterations = 0;
  while (dist > 0.0001 && iterations < 6) {
    iterations++;
    const col = Math.floor(wrapX(germ.x, maze.cols));
    const row = Math.max(0, Math.min(maze.rows - 1, Math.floor(germ.y)));
    const cx = col + 0.5;
    const cy = row + 0.5;
    const tileKey = `${col},${row}`;

    if (germ.dir === 'NONE') {
      germ.x = cx;
      germ.y = cy;
      germ.dir = pickGermDirectionBFS(
        germ,
        col,
        row,
        maze,
        playerCol,
        playerRow,
        playerDir,
        modeTimer,
        level
      );
      germ.lastDecisionTileKey = tileKey;
      if (germ.dir === 'NONE') break;
    }

    const v = DIR_VECTOR[germ.dir];
    const signedOffset = v.dx !== 0 ? (cx - germ.x) * v.dx : (cy - germ.y) * v.dy;

    if (signedOffset > 0.0005) {
      // Approaching current tile center
      const step = Math.min(dist, signedOffset);
      germ.x = wrapX(germ.x + v.dx * step, maze.cols);
      germ.y += v.dy * step;
      dist -= step;

      if (step >= signedOffset - 0.0005) {
        germ.x = cx;
        germ.y = cy;
        germ.dir = pickGermDirectionBFS(
          germ,
          col,
          row,
          maze,
          playerCol,
          playerRow,
          playerDir,
          modeTimer,
          level
        );
        germ.lastDecisionTileKey = tileKey;
      }
    } else {
      // At tile center or already past it toward the next tile
      if (Math.abs(signedOffset) <= 0.0005 && germ.lastDecisionTileKey !== tileKey) {
        germ.x = cx;
        germ.y = cy;
        germ.dir = pickGermDirectionBFS(
          germ,
          col,
          row,
          maze,
          playerCol,
          playerRow,
          playerDir,
          modeTimer,
          level
        );
        germ.lastDecisionTileKey = tileKey;
      }

      if (!canMoveFrom(maze, col, row, germ.dir, germ.inPen)) {
        germ.x = cx;
        germ.y = cy;
        germ.dir = pickGermDirectionBFS(
          germ,
          col,
          row,
          maze,
          playerCol,
          playerRow,
          playerDir,
          modeTimer,
          level
        );
        germ.lastDecisionTileKey = tileKey;
        if (!canMoveFrom(maze, col, row, germ.dir, germ.inPen)) {
          break;
        }
        continue;
      }

      const activeV = DIR_VECTOR[germ.dir];
      const activeOffset =
        activeV.dx !== 0 ? (cx - germ.x) * activeV.dx : (cy - germ.y) * activeV.dy;
      const distToNextCenter = 1 + activeOffset;
      const step = Math.min(dist, distToNextCenter);

      germ.x = wrapX(germ.x + activeV.dx * step, maze.cols);
      germ.y += activeV.dy * step;
      dist -= step;

      // Snap cleanly if we just reached the next tile's center
      if (step >= distToNextCenter - 0.0005) {
        const nextCol = wrapCol(col + activeV.dx, maze.cols);
        const nextRow = Math.max(0, Math.min(maze.rows - 1, row + activeV.dy));
        germ.x = nextCol + 0.5;
        germ.y = nextRow + 0.5;
        germ.dir = pickGermDirectionBFS(
          germ,
          nextCol,
          nextRow,
          maze,
          playerCol,
          playerRow,
          playerDir,
          modeTimer,
          level
        );
        germ.lastDecisionTileKey = `${nextCol},${nextRow}`;
      }
    }
  }

  // Stuck detection & automatic recovery if a germ fails to make progress
  const movedDist = Math.hypot(germ.x - germ.lastCheckX, germ.y - germ.lastCheckY);
  if (movedDist > 0.04) {
    germ.stuckTimer = 0;
    germ.lastCheckX = germ.x;
    germ.lastCheckY = germ.y;
  } else {
    germ.stuckTimer += dt;
    if (germ.stuckTimer >= 0.45) {
      const col = Math.floor(wrapX(germ.x, maze.cols));
      const row = Math.max(0, Math.min(maze.rows - 1, Math.floor(germ.y)));
      const safe = isWallTile(maze, col, row)
        ? findNearestWalkableTile(maze, col, row, germ.inPen)
        : { col, row };
      germ.x = safe.col + 0.5;
      germ.y = safe.row + 0.5;
      germ.lastTargetKey = '';
      germ.cachedDir = 'NONE';
      germ.lastDecisionTileKey = '';
      germ.dir = pickGermDirectionBFS(
        germ,
        safe.col,
        safe.row,
        maze,
        playerCol,
        playerRow,
        playerDir,
        modeTimer,
        level
      );
      germ.stuckTimer = 0;
      germ.lastCheckX = germ.x;
      germ.lastCheckY = germ.y;
    }
  }
}

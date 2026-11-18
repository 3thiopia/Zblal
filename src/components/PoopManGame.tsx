import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Trophy,
  Zap,
} from 'lucide-react';
import { ArcadeGameShell, ArcadeOverlayCard } from './ArcadeGameShell.tsx';
import { poopManAudio } from '../game/poopManAudio.ts';
import {
  ALL_DIRS,
  canMoveFrom,
  createGermsForLevel,
  DIR_VECTOR,
  OPPOSITE_DIR,
  stepGermWithAI,
  wrapX,
  type Direction,
  type GermEntity,
} from '../game/poopManAI.ts';
import {
  getMazeForLevel,
  type MazeDefinition,
} from '../game/poopManMazes.ts';
import { useLanguage } from '../i18n/LanguageContext.tsx';
import { triggerHaptic } from '../utils/haptics.ts';

type GameStatus = 'TITLE_MENU' | 'PLAYING' | 'PAUSED' | 'LEVEL_VICTORY' | 'GAME_OVER';

export interface PoopManGameResult {
  score: number;
  level: number;
  sessionId: string;
  durationMs: number;
}

interface PoopManGameProps {
  playerNickname?: string;
  serverBestScore?: number;
  onClose: () => void;
  onGameComplete?: (result: PoopManGameResult) => void;
  submissionNotice?: string | null;
}

interface SparkleParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

interface SimulationState {
  level: number;
  score: number;
  lives: number;
  maze: MazeDefinition;
  rolls: Uint8Array; // 0 = empty, 1 = regular TP, 2 = golden TP
  remainingRolls: number;
  playerX: number;
  playerY: number;
  playerDir: Direction;
  desiredDir: Direction;
  playerSpawn: { col: number; row: number };
  boostTimer: number;
  boostMaxDuration: number;
  invulnTimer: number;
  hitFreezeTimer: number;
  modeTimer: number;
  germs: GermEntity[];
  particles: SparkleParticle[];
  animClock: number;
}

const HIGH_SCORE_KEY = 'popo_man_high_score';
const INITIAL_LIVES = 3;

function loadHighScore(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = window.localStorage.getItem(HIGH_SCORE_KEY);
    const parsed = raw ? Number.parseInt(raw, 10) : 0;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  } catch {
    return 0;
  }
}

function saveHighScore(score: number) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(HIGH_SCORE_KEY, String(score));
  } catch {
    // Ignore localStorage errors
  }
}

function buildLevelSimulation(
  level: number,
  score: number,
  lives: number
): SimulationState {
  const maze = getMazeForLevel(level);
  const rolls = new Uint8Array(maze.cols * maze.rows);
  let remainingRolls = 0;
  let playerSpawn = { col: 7, row: 13 };
  const penTiles: { col: number; row: number }[] = [];

  for (let r = 0; r < maze.rows; r++) {
    for (let c = 0; c < maze.cols; c++) {
      const ch = maze.grid[r][c];
      const idx = r * maze.cols + c;
      if (ch === '.') {
        rolls[idx] = 1;
        remainingRolls++;
      } else if (ch === 'G') {
        rolls[idx] = 2;
        remainingRolls++;
      } else if (ch === 'P') {
        playerSpawn = { col: c, row: r };
      } else if (ch === 'E') {
        penTiles.push({ col: c, row: r });
      }
    }
  }

  const germs = createGermsForLevel(level, penTiles, maze);
  const boostMaxDuration = Math.max(3.6, 5.2 - (level - 1) * 0.25);

  return {
    level,
    score,
    lives,
    maze,
    rolls,
    remainingRolls,
    playerX: playerSpawn.col + 0.5,
    playerY: playerSpawn.row + 0.5,
    playerDir: 'NONE',
    desiredDir: 'NONE',
    playerSpawn,
    boostTimer: 0,
    boostMaxDuration,
    invulnTimer: 0,
    hitFreezeTimer: 0,
    modeTimer: 0,
    germs,
    particles: [],
    animClock: 0,
  };
}

function resetPositionsAfterHit(sim: SimulationState) {
  sim.playerX = sim.playerSpawn.col + 0.5;
  sim.playerY = sim.playerSpawn.row + 0.5;
  sim.playerDir = 'NONE';
  sim.desiredDir = 'NONE';
  sim.boostTimer = 0;
  sim.invulnTimer = 1.4;
  sim.modeTimer = 0;

  const penTiles: { col: number; row: number }[] = [];
  for (let r = 0; r < sim.maze.rows; r++) {
    for (let c = 0; c < sim.maze.cols; c++) {
      if (sim.maze.grid[r][c] === 'E') {
        penTiles.push({ col: c, row: r });
      }
    }
  }
  sim.germs = createGermsForLevel(sim.level, penTiles, sim.maze);
}

function stepPlayer(sim: SimulationState, dt: number, reducedMotion: boolean) {
  const baseSpeed = 5.35;
  const speed = sim.boostTimer > 0 ? baseSpeed * 1.56 : baseSpeed;
  let dist = speed * dt;

  // Immediate 180-degree reversal
  if (
    sim.desiredDir !== 'NONE' &&
    sim.playerDir !== 'NONE' &&
    sim.desiredDir === OPPOSITE_DIR[sim.playerDir]
  ) {
    sim.playerDir = sim.desiredDir;
  }

  let iterations = 0;
  while (dist > 0.0001 && iterations < 4) {
    iterations++;
    const col = Math.floor(wrapX(sim.playerX, sim.maze.cols));
    const row = Math.floor(sim.playerY);
    const cx = col + 0.5;
    const cy = row + 0.5;

    // Corner-snap assist when starting from stop or right near tile center
    if (sim.desiredDir !== 'NONE' && sim.desiredDir !== sim.playerDir) {
      const nearCenter =
        Math.abs(sim.playerX - cx) < 0.24 && Math.abs(sim.playerY - cy) < 0.24;
      if (
        (sim.playerDir === 'NONE' || nearCenter) &&
        canMoveFrom(sim.maze, col, row, sim.desiredDir, true)
      ) {
        sim.playerX = cx;
        sim.playerY = cy;
        sim.playerDir = sim.desiredDir;
      }
    }

    if (sim.playerDir === 'NONE') break;

    const v = DIR_VECTOR[sim.playerDir];
    const nextOpen = canMoveFrom(sim.maze, col, row, sim.playerDir, true);

    // Determine distance to tile center ahead along current direction
    const offset =
      v.dx !== 0 ? (cx - sim.playerX) * v.dx : (cy - sim.playerY) * v.dy;

    if (offset > 0.0001) {
      // Heading toward current tile center
      const step = Math.min(dist, offset);
      sim.playerX = wrapX(sim.playerX + v.dx * step, sim.maze.cols);
      sim.playerY += v.dy * step;
      dist -= step;

      if (Math.abs(step - offset) < 0.0001) {
        sim.playerX = cx;
        sim.playerY = cy;
        // At exact tile center: check buffered turn first
        if (
          sim.desiredDir !== 'NONE' &&
          canMoveFrom(sim.maze, col, row, sim.desiredDir, true)
        ) {
          sim.playerDir = sim.desiredDir;
        } else if (!nextOpen) {
          sim.playerDir = 'NONE';
          break;
        }
      }
    } else {
      // Check buffered turn if effectively at tile center
      if (
        Math.abs(offset) <= 0.0001 &&
        sim.desiredDir !== 'NONE' &&
        sim.desiredDir !== sim.playerDir &&
        canMoveFrom(sim.maze, col, row, sim.desiredDir, true)
      ) {
        sim.playerX = cx;
        sim.playerY = cy;
        sim.playerDir = sim.desiredDir;
        continue;
      }

      // Past or at tile center: check if next tile is blocked
      if (!nextOpen) {
        sim.playerX = cx;
        sim.playerY = cy;
        sim.playerDir = 'NONE';
        break;
      }
      // Move up to next tile center (at most 1.0 - offset)
      const distToNextCenter = 1 + offset;
      const step = Math.min(dist, distToNextCenter);
      sim.playerX = wrapX(sim.playerX + v.dx * step, sim.maze.cols);
      sim.playerY += v.dy * step;
      dist -= step;
    }
  }

  // Spawn subtle golden speed-boost trail particles
  if (sim.boostTimer > 0 && !reducedMotion && Math.random() < 0.55) {
    sim.particles.push({
      x: sim.playerX + (Math.random() - 0.5) * 0.28,
      y: sim.playerY + (Math.random() - 0.5) * 0.28,
      vx: (Math.random() - 0.5) * 0.6,
      vy: (Math.random() - 0.5) * 0.6,
      life: 0.35,
      maxLife: 0.35,
      color: Math.random() < 0.5 ? '#CEF04E' : '#FACC15',
      size: 3,
    });
  }
}

function drawScene(
  ctx: CanvasRenderingContext2D,
  sim: SimulationState,
  tileSize: number,
  reducedMotion: boolean
) {
  const width = sim.maze.cols * tileSize;
  const height = sim.maze.rows * tileSize;

  ctx.imageSmoothingEnabled = false;

  // 1. Arcade Floor Background (Deep Forest Green)
  ctx.fillStyle = '#0F2B1F';
  ctx.fillRect(0, 0, width, height);

  // Subtle pixel grid texture on walkable tiles
  ctx.fillStyle = '#133527';
  const dotSize = Math.max(1, Math.floor(tileSize / 12));
  for (let r = 0; r < sim.maze.rows; r++) {
    for (let c = 0; c < sim.maze.cols; c++) {
      if (sim.maze.grid[r][c] !== '#') {
        ctx.fillRect(
          Math.floor(c * tileSize + tileSize * 0.5 - dotSize / 2),
          Math.floor(r * tileSize + tileSize * 0.5 - dotSize / 2),
          dotSize,
          dotSize
        );
      }
    }
  }

  // 2. Retro Pixel-Art Maze Walls
  const p = Math.max(1, Math.floor(tileSize / 10));
  for (let r = 0; r < sim.maze.rows; r++) {
    for (let c = 0; c < sim.maze.cols; c++) {
      const ch = sim.maze.grid[r][c];
      const x = c * tileSize;
      const y = r * tileSize;

      if (ch === '#') {
        ctx.fillStyle = '#1E563F';
        ctx.fillRect(x, y, tileSize, tileSize);

        // Inner pixel block shading
        ctx.fillStyle = '#164230';
        ctx.fillRect(x + p, y + p, tileSize - p * 2, tileSize - p * 2);

        // Exposed edge highlights for 16-bit depth
        ctx.fillStyle = '#2F7D5C';
        if (r > 0 && sim.maze.grid[r - 1][c] !== '#') {
          ctx.fillRect(x, y, tileSize, p);
        }
        if (c > 0 && sim.maze.grid[r][c - 1] !== '#') {
          ctx.fillRect(x, y, p, tileSize);
        }
        ctx.fillStyle = '#0A2117';
        if (r < sim.maze.rows - 1 && sim.maze.grid[r + 1][c] !== '#') {
          ctx.fillRect(x, y + tileSize - p, tileSize, p);
        }
        if (c < sim.maze.cols - 1 && sim.maze.grid[r][c + 1] !== '#') {
          ctx.fillRect(x + tileSize - p, y, p, tileSize);
        }
      } else if (r === 6 && c === 7) {
        // Germ pen doorway gate bar
        ctx.fillStyle = '#CEF04E';
        ctx.fillRect(
          x + p,
          y + Math.floor(tileSize * 0.45),
          tileSize - p * 2,
          Math.max(2, Math.floor(tileSize * 0.14))
        );
      }
    }
  }

  // 3. Collectibles: Toilet-Paper Rolls & Golden Speed-Boost Rolls
  const pulse = reducedMotion ? 0 : Math.sin(sim.animClock * 6) * 0.08;
  for (let r = 0; r < sim.maze.rows; r++) {
    for (let c = 0; c < sim.maze.cols; c++) {
      const item = sim.rolls[r * sim.maze.cols + c];
      if (item === 0) continue;

      const cx = (c + 0.5) * tileSize;
      const cy = (r + 0.5) * tileSize;

      if (item === 1) {
        // Regular Toilet-Paper Roll (Cream/White Pixel Art)
        const rw = Math.max(6, Math.round(tileSize * 0.34));
        const rh = Math.max(6, Math.round(tileSize * 0.32));
        const rx = Math.round(cx - rw / 2);
        const ry = Math.round(cy - rh / 2);

        // Outer cream body
        ctx.fillStyle = '#F7F4EC';
        ctx.fillRect(rx, ry, rw, rh);
        // Subtle bottom shading
        ctx.fillStyle = '#DFD8C8';
        ctx.fillRect(rx, ry + rh - Math.max(1, Math.floor(rh * 0.25)), rw, Math.max(1, Math.floor(rh * 0.25)));
        // Hanging TP sheet flap on right
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(rx + rw - Math.max(1, Math.floor(rw * 0.28)), ry + rh - 1, Math.max(1, Math.floor(rw * 0.28)), Math.max(2, Math.floor(rh * 0.35)));
        // Cardboard inner tube hole
        ctx.fillStyle = '#8C6E54';
        const cw = Math.max(2, Math.floor(rw * 0.34));
        const ch = Math.max(2, Math.floor(rh * 0.34));
        ctx.fillRect(Math.round(cx - cw / 2), Math.round(cy - ch / 2), cw, ch);
      } else if (item === 2) {
        // Golden Toilet-Paper Roll (Yellow/Gold + Sparkle)
        const scale = 1 + pulse;
        const rw = Math.max(10, Math.round(tileSize * 0.54 * scale));
        const rh = Math.max(10, Math.round(tileSize * 0.5 * scale));
        const rx = Math.round(cx - rw / 2);
        const ry = Math.round(cy - rh / 2);

        // Soft golden glow square behind roll
        ctx.fillStyle = 'rgba(250, 204, 21, 0.25)';
        ctx.fillRect(rx - 2, ry - 2, rw + 4, rh + 4);

        // Gold body
        ctx.fillStyle = '#FACC15';
        ctx.fillRect(rx, ry, rw, rh);
        // Bright highlight stripe
        ctx.fillStyle = '#FEF08A';
        ctx.fillRect(rx + 1, ry + 1, Math.max(2, Math.floor(rw * 0.5)), Math.max(2, Math.floor(rh * 0.28)));
        // Amber shadow
        ctx.fillStyle = '#D97706';
        ctx.fillRect(rx, ry + rh - Math.max(2, Math.floor(rh * 0.25)), rw, Math.max(2, Math.floor(rh * 0.25)));
        // Hanging gold flap
        ctx.fillStyle = '#FDE047';
        ctx.fillRect(
          rx + rw - Math.max(2, Math.floor(rw * 0.26)),
          ry + rh - 1,
          Math.max(2, Math.floor(rw * 0.26)),
          Math.max(2, Math.floor(rh * 0.36))
        );
        // Core tube
        ctx.fillStyle = '#78350F';
        const cw = Math.max(3, Math.floor(rw * 0.32));
        const ch = Math.max(3, Math.floor(rh * 0.32));
        ctx.fillRect(Math.round(cx - cw / 2), Math.round(cy - ch / 2), cw, ch);
      }
    }
  }

  // 4. Sparkle Trail Particles
  for (const pt of sim.particles) {
    const alpha = Math.max(0, pt.life / pt.maxLife);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = pt.color;
    const s = Math.max(2, Math.round((tileSize / 9) * (pt.size / 3)));
    ctx.fillRect(Math.round(pt.x * tileSize - s / 2), Math.round(pt.y * tileSize - s / 2), s, s);
  }
  ctx.globalAlpha = 1;

  // 5. Cartoon Pixel-Art POOP MAN Hero
  const flashHidden =
    sim.invulnTimer > 0 && !reducedMotion && Math.floor(sim.invulnTimer * 12) % 2 === 0;
  if (!flashHidden) {
    drawPoopManSprite(ctx, sim, tileSize, reducedMotion);
  }

  // 6. Cartoon Pixel-Art Germ Enemies
  for (const germ of sim.germs) {
    drawGermSprite(ctx, germ, tileSize, sim.animClock, reducedMotion);
  }
}

function drawPoopManSprite(
  ctx: CanvasRenderingContext2D,
  sim: SimulationState,
  tileSize: number,
  reducedMotion: boolean
) {
  const px = sim.playerX * tileSize;
  const py = sim.playerY * tileSize;
  const bounce =
    reducedMotion || sim.playerDir === 'NONE'
      ? 0
      : Math.sin(sim.animClock * 16) * (tileSize * 0.05);

  const unit = Math.max(1.5, tileSize / 12);
  const ox = Math.round(px - tileSize * 0.42);
  const oy = Math.round(py - tileSize * 0.42 + bounce);
  const u = (n: number) => Math.round(n * unit);

  // Boosted golden aura behind POOP MAN
  if (sim.boostTimer > 0) {
    ctx.fillStyle = 'rgba(206, 240, 78, 0.35)';
    ctx.fillRect(ox - u(1), oy - u(1), u(12), u(12));
  }

  // Dark outline silhouette (pixel-stepped cute swirl)
  ctx.fillStyle = '#2E1B0E';
  ctx.fillRect(ox + u(4), oy + u(0), u(2), u(1));
  ctx.fillRect(ox + u(3), oy + u(1), u(4), u(2));
  ctx.fillRect(ox + u(2), oy + u(3), u(6), u(2));
  ctx.fillRect(ox + u(1), oy + u(5), u(8), u(4));
  ctx.fillRect(ox + u(0.5), oy + u(7), u(9), u(2.5));

  // Main warm brown tiers
  ctx.fillStyle = '#8D5A35';
  ctx.fillRect(ox + u(4), oy + u(1), u(2), u(2));
  ctx.fillRect(ox + u(2.5), oy + u(3), u(5), u(2));
  ctx.fillRect(ox + u(1.5), oy + u(5), u(7), u(3.8));

  // Bottom shadow tier
  ctx.fillStyle = '#6F4324';
  ctx.fillRect(ox + u(1.5), oy + u(7.6), u(7), u(1.4));

  // Cute pixel highlight
  ctx.fillStyle = '#C68F62';
  ctx.fillRect(ox + u(3), oy + u(3.3), u(1.4), u(1.2));

  // Little animated feet when moving
  const stepPhase = reducedMotion ? 0 : Math.sin(sim.animClock * 18);
  ctx.fillStyle = '#CEF04E';
  ctx.fillRect(
    ox + u(2.2),
    oy + u(9.1 + (stepPhase > 0 ? -0.4 : 0)),
    u(1.8),
    u(1.1)
  );
  ctx.fillRect(
    ox + u(6),
    oy + u(9.1 + (stepPhase < 0 ? -0.4 : 0)),
    u(1.8),
    u(1.1)
  );

  // Expressive Eyes looking toward direction
  const look = DIR_VECTOR[sim.playerDir];
  const eyeShiftX = look.dx * u(0.45);
  const eyeShiftY = look.dy * u(0.35);

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(ox + u(2.3), oy + u(4.6), u(2.1), u(2.1));
  ctx.fillRect(ox + u(5.6), oy + u(4.6), u(2.1), u(2.1));

  ctx.fillStyle = '#1B231F';
  ctx.fillRect(ox + u(2.9) + eyeShiftX, oy + u(5.2) + eyeShiftY, u(1.1), u(1.1));
  ctx.fillRect(ox + u(6.2) + eyeShiftX, oy + u(5.2) + eyeShiftY, u(1.1), u(1.1));

  // Chomping cute arcade mouth
  const chompOpen =
    !reducedMotion &&
    sim.playerDir !== 'NONE' &&
    Math.sin(sim.animClock * 20) > 0;
  ctx.fillStyle = '#2E1B0E';
  if (chompOpen) {
    ctx.fillRect(ox + u(3.8), oy + u(7.1), u(2.4), u(1.4));
    ctx.fillStyle = '#F472B6';
    ctx.fillRect(ox + u(4.3), oy + u(7.8), u(1.4), u(0.7));
  } else {
    ctx.fillRect(ox + u(3.9), oy + u(7.4), u(2.2), u(0.8));
  }
}

function drawGermSprite(
  ctx: CanvasRenderingContext2D,
  germ: GermEntity,
  tileSize: number,
  animClock: number,
  reducedMotion: boolean
) {
  const gx = germ.x * tileSize;
  const gy = germ.y * tileSize;
  const squirm = reducedMotion ? 0 : Math.sin(animClock * 11 + germ.id * 1.7) * (tileSize * 0.045);

  const unit = Math.max(1.5, tileSize / 12);
  const ox = Math.round(gx - tileSize * 0.42);
  const oy = Math.round(gy - tileSize * 0.42 + squirm);
  const u = (n: number) => Math.round(n * unit);

  // Germ Spiky Cartoon Membrane
  ctx.fillStyle = '#1B231F';
  ctx.fillRect(ox + u(1), oy + u(1.5), u(8), u(7.5));
  ctx.fillRect(ox + u(0), oy + u(3), u(10), u(4.5));
  ctx.fillRect(ox + u(3), oy + u(0.5), u(4), u(9));

  // Germ Body Fill
  ctx.fillStyle = germ.color;
  ctx.fillRect(ox + u(1.5), oy + u(2), u(7), u(6.5));
  ctx.fillRect(ox + u(0.6), oy + u(3.5), u(8.8), u(3.5));
  ctx.fillRect(ox + u(3.5), oy + u(1), u(3), u(8));

  // Funny Spikes / Antennae
  ctx.fillStyle = germ.accentColor;
  ctx.fillRect(ox + u(2), oy + u(0.2), u(1.2), u(1.3));
  ctx.fillRect(ox + u(6.8), oy + u(0.2), u(1.2), u(1.3));
  ctx.fillRect(ox + u(0.2), oy + u(4.5), u(1), u(1.4));
  ctx.fillRect(ox + u(8.8), oy + u(4.5), u(1), u(1.4));

  // Goofy Eyes
  const look = DIR_VECTOR[germ.dir];
  const shiftX = look.dx * u(0.45);
  const shiftY = look.dy * u(0.35);

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(ox + u(2.2), oy + u(3.4), u(2.2), u(2.2));
  ctx.fillRect(ox + u(5.6), oy + u(3.4), u(2.2), u(2.2));

  ctx.fillStyle = '#111827';
  ctx.fillRect(ox + u(2.8) + shiftX, oy + u(4.0) + shiftY, u(1.1), u(1.1));
  ctx.fillRect(ox + u(6.2) + shiftX, oy + u(4.0) + shiftY, u(1.1), u(1.1));

  // Mischievous Pixel Grin
  ctx.fillStyle = '#1B231F';
  ctx.fillRect(ox + u(3.2), oy + u(6.7), u(3.6), u(0.9));
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(ox + u(3.6), oy + u(6.7), u(0.8), u(0.7));
  ctx.fillRect(ox + u(5.6), oy + u(6.7), u(0.8), u(0.7));
}

export function PoopManGame({
  playerNickname,
  serverBestScore = 0,
  onClose,
  onGameComplete,
  submissionNotice,
}: PoopManGameProps) {
  useLanguage();
  const prefersReducedMotion = useReducedMotion() ?? false;

  const [status, setStatus] = useState<GameStatus>('TITLE_MENU');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState<number>(() =>
    Math.max(loadHighScore(), serverBestScore)
  );
  const [lives, setLives] = useState(INITIAL_LIVES);
  const [level, setLevel] = useState(1);
  const [boostRemaining, setBoostRemaining] = useState(0);
  const [muted, setMuted] = useState(false);
  const [tileSize, setTileSize] = useState(26);

  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const simRef = useRef<SimulationState>(buildLevelSimulation(1, 0, INITIAL_LIVES));
  const statusRef = useRef<GameStatus>('TITLE_MENU');
  const highScoreRef = useRef<number>(highScore);
  const boostDisplayRef = useRef<number>(0);
  const swipeStartRef = useRef<{ x: number; y: number } | null>(null);
  const onGameCompleteRef = useRef(onGameComplete);
  const sessionIdRef = useRef<string>(
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `pm-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  );
  const runStartedAtRef = useRef<number>(Date.now());
  const submittedRunRef = useRef<boolean>(false);

  statusRef.current = status;
  highScoreRef.current = highScore;
  onGameCompleteRef.current = onGameComplete;

  useEffect(() => {
    if (serverBestScore > highScoreRef.current) {
      highScoreRef.current = serverBestScore;
      setHighScore(serverBestScore);
      saveHighScore(serverBestScore);
    }
  }, [serverBestScore]);

  // Compute optimal crisp integer tile size for portrait & landscape viewports without overflow
  useEffect(() => {
    const updateSize = () => {
      const container = stageRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const maze = simRef.current.maze;
      const maxTileW = Math.floor((rect.width - 10) / maze.cols);
      const maxTileH = Math.floor((rect.height - 10) / maze.rows);
      const nextTile = Math.max(12, Math.min(44, maxTileW, maxTileH));
      setTileSize(nextTile);
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    if (stageRef.current) {
      observer.observe(stageRef.current);
    }
    window.addEventListener('resize', updateSize);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateSize);
    };
  }, []);

  // Sync canvas dimensions and render initial static frame
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const sim = simRef.current;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const logicalW = sim.maze.cols * tileSize;
    const logicalH = sim.maze.rows * tileSize;

    if (canvas.width !== logicalW * dpr || canvas.height !== logicalH * dpr) {
      canvas.width = logicalW * dpr;
      canvas.height = logicalH * dpr;
      canvas.style.width = `${logicalW}px`;
      canvas.style.height = `${logicalH}px`;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawScene(ctx, sim, tileSize, prefersReducedMotion);
  }, [prefersReducedMotion, tileSize]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas, status, level]);

  const startFreshGame = useCallback(() => {
    triggerHaptic(10);
    const nextSim = buildLevelSimulation(1, 0, INITIAL_LIVES);
    simRef.current = nextSim;
    sessionIdRef.current =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `pm-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    runStartedAtRef.current = Date.now();
    submittedRunRef.current = false;
    setScore(0);
    setLives(INITIAL_LIVES);
    setLevel(1);
    setBoostRemaining(0);
    setStatus('PLAYING');
  }, []);

  const advanceToNextLevel = useCallback(() => {
    triggerHaptic(12);
    const prev = simRef.current;
    const nextLevel = prev.level + 1;
    const nextSim = buildLevelSimulation(nextLevel, prev.score, prev.lives);
    simRef.current = nextSim;
    setLevel(nextLevel);
    setBoostRemaining(0);
    setStatus('PLAYING');
  }, []);

  const togglePause = useCallback(() => {
    triggerHaptic(6);
    setStatus((prev) => {
      if (prev === 'PLAYING') return 'PAUSED';
      if (prev === 'PAUSED') return 'PLAYING';
      return prev;
    });
  }, []);

  const setDirection = useCallback((dir: Exclude<Direction, 'NONE'>) => {
    if (statusRef.current !== 'PLAYING') return;
    simRef.current.desiredDir = dir;
  }, []);

  const handleToggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      poopManAudio.setMuted(next);
      return next;
    });
  }, []);

  // Main 60fps Game Loop (active cleanly while playing; always cleaned up on close)
  useEffect(() => {
    let rafId = 0;
    let lastTime = performance.now();

    const loop = (now: number) => {
      const rawDt = (now - lastTime) / 1000;
      lastTime = now;
      const dt = Math.min(rawDt, 0.05);

      const sim = simRef.current;
      sim.animClock += dt;

      if (statusRef.current === 'PLAYING') {
        if (sim.hitFreezeTimer > 0) {
          sim.hitFreezeTimer = Math.max(0, sim.hitFreezeTimer - dt);
        } else {
          if (sim.invulnTimer > 0) {
            sim.invulnTimer = Math.max(0, sim.invulnTimer - dt);
          }
          if (sim.boostTimer > 0) {
            sim.boostTimer = Math.max(0, sim.boostTimer - dt);
            const nextBoostDisplay = Math.ceil(sim.boostTimer * 10) / 10;
            if (nextBoostDisplay !== boostDisplayRef.current) {
              boostDisplayRef.current = nextBoostDisplay;
              setBoostRemaining(nextBoostDisplay);
            }
          } else if (boostDisplayRef.current !== 0) {
            boostDisplayRef.current = 0;
            setBoostRemaining(0);
          }

          sim.modeTimer += dt;

          // Step Player
          stepPlayer(sim, dt, prefersReducedMotion);

          // Check Collectible Pickup at player tile
          const pCol = Math.floor(wrapX(sim.playerX, sim.maze.cols));
          const pRow = Math.floor(sim.playerY);
          const idx = pRow * sim.maze.cols + pCol;
          const item = sim.rolls[idx];
          if (item === 1 || item === 2) {
            sim.rolls[idx] = 0;
            sim.remainingRolls--;
            const pts = item === 2 ? 50 : 10;
            sim.score += pts;
            setScore(sim.score);

            if (sim.score > highScoreRef.current) {
              setHighScore(sim.score);
              saveHighScore(sim.score);
            }

            if (item === 2) {
              sim.boostTimer = sim.boostMaxDuration;
              const nextBoostDisplay = Math.ceil(sim.boostTimer * 10) / 10;
              boostDisplayRef.current = nextBoostDisplay;
              setBoostRemaining(nextBoostDisplay);
              triggerHaptic([10, 20, 12]);
              poopManAudio.playGoldenBoost();
            } else {
              poopManAudio.playCollectRoll();
            }

            if (sim.remainingRolls <= 0) {
              const levelBonus = sim.level * 250;
              sim.score += levelBonus;
              setScore(sim.score);
              if (sim.score > highScoreRef.current) {
                setHighScore(sim.score);
                saveHighScore(sim.score);
              }
              triggerHaptic([14, 24, 20]);
              poopManAudio.playVictory();
              setStatus('LEVEL_VICTORY');
            }
          }

          // Step Germs & Check Collisions
          if (statusRef.current === 'PLAYING') {
            for (const germ of sim.germs) {
              stepGermWithAI(
                germ,
                sim.maze,
                sim.playerX,
                sim.playerY,
                sim.playerDir,
                sim.modeTimer,
                sim.level,
                dt
              );

              const dist = Math.hypot(germ.x - sim.playerX, germ.y - sim.playerY);
              if (dist < 0.56 && sim.invulnTimer <= 0) {
                sim.lives -= 1;
                setLives(sim.lives);
                triggerHaptic([24, 30, 24]);

                if (sim.lives <= 0) {
                  poopManAudio.playGameOver();
                  setStatus('GAME_OVER');
                  if (!submittedRunRef.current) {
                    submittedRunRef.current = true;
                    onGameCompleteRef.current?.({
                      score: sim.score,
                      level: sim.level,
                      sessionId: sessionIdRef.current,
                      durationMs: Math.max(1000, Date.now() - runStartedAtRef.current),
                    });
                  }
                } else {
                  poopManAudio.playHit();
                  sim.hitFreezeTimer = 0.55;
                  resetPositionsAfterHit(sim);
                }
                break;
              }
            }
          }
        }
      }

      // Step particles
      if (sim.particles.length > 0) {
        for (let i = sim.particles.length - 1; i >= 0; i--) {
          const pt = sim.particles[i];
          pt.x += pt.vx * dt;
          pt.y += pt.vy * dt;
          pt.life -= dt;
          if (pt.life <= 0) {
            sim.particles.splice(i, 1);
          }
        }
      }

      renderCanvas();
      rafId = window.requestAnimationFrame(loop);
    };

    rafId = window.requestAnimationFrame(loop);
    return () => {
      window.cancelAnimationFrame(rafId);
    };
  }, [prefersReducedMotion, renderCanvas]);

  // Keyboard Controls (Arrow keys, WASD, Space/P Pause, R Restart, Esc Close)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key;
      const lower = key.toLowerCase();

      if (
        key === 'ArrowUp' ||
        key === 'ArrowDown' ||
        key === 'ArrowLeft' ||
        key === 'ArrowRight' ||
        key === ' '
      ) {
        e.preventDefault();
      }

      if (key === 'Escape') {
        onClose();
        return;
      }

      if (statusRef.current === 'TITLE_MENU') {
        if (key === 'Enter' || key === ' ') {
          startFreshGame();
        }
        return;
      }

      if (statusRef.current === 'LEVEL_VICTORY') {
        if (key === 'Enter' || key === ' ') {
          advanceToNextLevel();
        }
        return;
      }

      if (statusRef.current === 'GAME_OVER') {
        if (key === 'Enter' || key === ' ' || lower === 'r') {
          startFreshGame();
        }
        return;
      }

      if (key === ' ' || lower === 'p') {
        togglePause();
        return;
      }

      if (lower === 'r') {
        startFreshGame();
        return;
      }

      if (key === 'ArrowUp' || lower === 'w') setDirection('UP');
      else if (key === 'ArrowDown' || lower === 's') setDirection('DOWN');
      else if (key === 'ArrowLeft' || lower === 'a') setDirection('LEFT');
      else if (key === 'ArrowRight' || lower === 'd') setDirection('RIGHT');
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [advanceToNextLevel, onClose, setDirection, startFreshGame, togglePause]);

  // Dispose Web Audio cleanly when game overlay unmounts
  useEffect(() => {
    return () => {
      poopManAudio.dispose();
    };
  }, []);

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 0) return;
    swipeStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!swipeStartRef.current || e.touches.length === 0) return;
    const dx = e.touches[0].clientX - swipeStartRef.current.x;
    const dy = e.touches[0].clientY - swipeStartRef.current.y;
    const threshold = 22;

    if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) return;

    if (Math.abs(dx) > Math.abs(dy)) {
      setDirection(dx > 0 ? 'RIGHT' : 'LEFT');
    } else {
      setDirection(dy > 0 ? 'DOWN' : 'UP');
    }
    swipeStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
  };

  const handleTouchEnd = () => {
    swipeStartRef.current = null;
  };

  const handleDpadPress = (dir: Exclude<Direction, 'NONE'>) => {
    triggerHaptic(6);
    setDirection(dir);
  };

  return (
    <ArcadeGameShell
      title="POOP MAN"
      ariaLabel="POOP MAN Arcade Game"
      accentIcon={
        <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
          <path d="M12.2 3c.6 1.5.1 2.8-.9 3.6 2.1.3 3.7 1.7 3.7 3.5 0 .6-.2 1.2-.5 1.7 1.8.6 3 2 3 3.7 0 2.2-2.4 3.5-5.5 3.5s-5.5-1.3-5.5-3.5c0-1.6 1.1-3 2.7-3.6-.3-.5-.4-1-.4-1.6 0-1.9 1.7-3.3 3.9-3.5-.8-.8-1-2.1-.5-3.8Z" />
        </svg>
      }
      muted={muted}
      isPaused={status === 'PAUSED'}
      canPause={status === 'PLAYING' || status === 'PAUSED'}
      onToggleMute={handleToggleMute}
      onTogglePause={togglePause}
      onRestart={startFreshGame}
      onBackToGames={onClose}
      stageRef={stageRef}
      hudLeft={
        <>
          <div>
            <span className="text-[#9AB7A9] font-medium mr-1">SCORE</span>
            <span className="font-mono font-bold text-[#CEF04E]">{score}</span>
          </div>
          <div>
            <span className="text-[#9AB7A9] font-medium mr-1">LVL</span>
            <span className="font-mono font-bold text-[#F7F4EC]">{level}</span>
          </div>
          <div>
            <span className="text-[#9AB7A9] font-medium mr-1">BEST</span>
            <span className="font-mono font-bold text-[#F7F4EC]">{highScore}</span>
          </div>
        </>
      }
      hudRight={
        <>
          {boostRemaining > 0 && (
            <div className="flex items-center gap-1 text-[#FACC15] font-mono font-bold text-xs">
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>{boostRemaining.toFixed(1)}s</span>
            </div>
          )}

          <div className="flex items-center gap-1" aria-label={`Lives remaining: ${lives}`}>
            <span className="text-[#9AB7A9] font-medium mr-1 text-xs hidden sm:inline">LIVES</span>
            {Array.from({ length: INITIAL_LIVES }, (_, idx) => {
              const active = idx < lives;
              return (
                <span
                  key={idx}
                  aria-hidden="true"
                  className={`inline-flex h-5 w-5 items-center justify-center rounded ${
                    active ? 'text-[#CEF04E]' : 'text-white/20'
                  }`}
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                    <path d="M12.2 3c.6 1.5.1 2.8-.9 3.6 2.1.3 3.7 1.7 3.7 3.5 0 .6-.2 1.2-.5 1.7 1.8.6 3 2 3 3.7 0 2.2-2.4 3.5-5.5 3.5s-5.5-1.3-5.5-3.5c0-1.6 1.1-3 2.7-3.6-.3-.5-.4-1-.4-1.6 0-1.9 1.7-3.3 3.9-3.5-.8-.8-1-2.1-.5-3.8Z" />
                  </svg>
                </span>
              );
            })}
          </div>
        </>
      }
      mobileControls={
        <div className="flex flex-col items-center gap-1.5 touch-none">
          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              handleDpadPress('UP');
            }}
            aria-label="Move Up"
            className="w-14 h-12 rounded-xl bg-[#143B2B] active:bg-[#CEF04E] active:text-[#143B2B] border border-[#2D7A58] text-[#F7F4EC] flex items-center justify-center shadow-[0_3px_0_#0A1F16] active:translate-y-0.5 cursor-pointer"
          >
            <ArrowUp className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2 [@media(max-height:520px)_and_(orientation:landscape)]:gap-1.5">
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                handleDpadPress('LEFT');
              }}
              aria-label="Move Left"
              className="w-14 h-12 [@media(max-height:520px)_and_(orientation:landscape)]:w-12 rounded-xl bg-[#143B2B] active:bg-[#CEF04E] active:text-[#143B2B] border border-[#2D7A58] text-[#F7F4EC] flex items-center justify-center shadow-[0_3px_0_#0A1F16] active:translate-y-0.5 cursor-pointer"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                handleDpadPress('DOWN');
              }}
              aria-label="Move Down"
              className="w-14 h-12 [@media(max-height:520px)_and_(orientation:landscape)]:w-12 rounded-xl bg-[#143B2B] active:bg-[#CEF04E] active:text-[#143B2B] border border-[#2D7A58] text-[#F7F4EC] flex items-center justify-center shadow-[0_3px_0_#0A1F16] active:translate-y-0.5 cursor-pointer"
            >
              <ArrowDown className="w-6 h-6" />
            </button>
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                handleDpadPress('RIGHT');
              }}
              aria-label="Move Right"
              className="w-14 h-12 [@media(max-height:520px)_and_(orientation:landscape)]:w-12 rounded-xl bg-[#143B2B] active:bg-[#CEF04E] active:text-[#143B2B] border border-[#2D7A58] text-[#F7F4EC] flex items-center justify-center shadow-[0_3px_0_#0A1F16] active:translate-y-0.5 cursor-pointer"
            >
              <ArrowRight className="w-6 h-6" />
            </button>
          </div>
        </div>
      }
      desktopLegend={
        <>
          <span>Move: Arrow Keys / WASD</span>
          <span aria-hidden="true">·</span>
          <span>Pause: Space / P</span>
          <span aria-hidden="true">·</span>
          <span>Restart: R</span>
          <span aria-hidden="true">·</span>
          <span>Back: Esc</span>
        </>
      }
    >
      <div className="relative rounded-2xl border-2 border-[#2D7A58] bg-[#0F2B1F] p-1 shadow-[0_18px_40px_rgba(0,0,0,0.45)]">
        <canvas
          ref={canvasRef}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="block rounded-xl touch-none"
        />

        {/* Overlay 1: Title Menu */}
        {status === 'TITLE_MENU' && (
          <ArcadeOverlayCard>
            <div className="space-y-3.5">
              <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#CEF04E] text-[#143B2B] shadow-[0_4px_0_#0A1F16]">
                <svg viewBox="0 0 24 24" className="w-7 h-7 fill-current">
                  <path d="M12.2 3c.6 1.5.1 2.8-.9 3.6 2.1.3 3.7 1.7 3.7 3.5 0 .6-.2 1.2-.5 1.7 1.8.6 3 2 3 3.7 0 2.2-2.4 3.5-5.5 3.5s-5.5-1.3-5.5-3.5c0-1.6 1.1-3 2.7-3.6-.3-.5-.4-1-.4-1.6 0-1.9 1.7-3.3 3.9-3.5-.8-.8-1-2.1-.5-3.8Z" />
                </svg>
              </div>

              <div>
                <h3 className="font-display text-xl sm:text-2xl font-bold text-[#F7F4EC]">
                  POOP MAN
                </h3>
                <p className="mt-1 text-xs sm:text-sm text-[#CDE0D6] leading-relaxed">
                  Collect every toilet-paper roll, grab golden rolls for speed
                  boosts, and dodge the germs!
                </p>
              </div>

              <div className="text-[11px] text-[#9AB7A9] space-y-0.5">
                <p>Mobile: D-pad or swipe anywhere</p>
                <p>Desktop: Arrow Keys or WASD</p>
              </div>

              <button
                type="button"
                onClick={startFreshGame}
                className="w-full min-h-[48px] px-6 py-3 rounded-xl bg-[#CEF04E] hover:bg-[#D9F66A] active:translate-y-0.5 text-[#143B2B] font-display text-base font-bold shadow-[0_4px_0_#0A1F16] transition-all cursor-pointer"
              >
                Start Game
              </button>
            </div>
          </ArcadeOverlayCard>
        )}

        {/* Overlay 2: Paused */}
        {status === 'PAUSED' && (
          <ArcadeOverlayCard>
            <div className="space-y-3.5">
              <h3 className="font-display text-2xl font-bold text-[#F7F4EC]">
                Game Paused
              </h3>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={togglePause}
                  className="w-full min-h-[48px] px-5 py-2.5 rounded-xl bg-[#CEF04E] hover:bg-[#D9F66A] text-[#143B2B] font-display text-base font-bold shadow-[0_4px_0_#0A1F16] cursor-pointer"
                >
                  Resume
                </button>
                <button
                  type="button"
                  onClick={startFreshGame}
                  className="w-full min-h-[44px] px-5 py-2.5 rounded-xl border border-white/20 bg-[#143B2B] hover:bg-[#1C4D39] text-sm font-semibold text-[#F7F4EC] cursor-pointer"
                >
                  Restart
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full min-h-[44px] px-5 py-2.5 rounded-xl border border-white/15 bg-transparent hover:bg-white/10 text-sm font-semibold text-[#CDE0D6] cursor-pointer"
                >
                  Back to Games
                </button>
              </div>
            </div>
          </ArcadeOverlayCard>
        )}

        {/* Overlay 3: Level Victory Celebration */}
        {status === 'LEVEL_VICTORY' && (
          <ArcadeOverlayCard>
            <motion.div
              initial={prefersReducedMotion ? false : { scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 320, damping: 20 }}
              className="space-y-3.5"
            >
              <motion.div
                animate={
                  prefersReducedMotion
                    ? undefined
                    : { y: [0, -6, 0], rotate: [-4, 4, -4] }
                }
                transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#CEF04E] text-[#143B2B] shadow-[0_4px_0_#0A1F16]"
              >
                <Trophy className="w-7 h-7" />
              </motion.div>

              <div>
                <p className="text-xs font-mono font-bold text-[#FACC15] tracking-wider">
                  LEVEL {level} CLEARED · +{level * 250} BONUS
                </p>
                <h3 className="mt-1 font-display text-2xl font-bold text-[#F7F4EC]">
                  Spotless Pipes!
                </h3>
                <p className="mt-1 text-xs sm:text-sm text-[#CDE0D6]">
                  POOP MAN swept every last roll. Ready for faster germs?
                </p>
              </div>

              <button
                type="button"
                onClick={advanceToNextLevel}
                className="w-full min-h-[48px] px-6 py-3 rounded-xl bg-[#CEF04E] hover:bg-[#D9F66A] text-[#143B2B] font-display text-base font-bold shadow-[0_4px_0_#0A1F16] cursor-pointer"
              >
                Next Level
              </button>
            </motion.div>
          </ArcadeOverlayCard>
        )}

        {/* Overlay 4: Playful Game Over */}
        {status === 'GAME_OVER' && (
          <ArcadeOverlayCard>
            <motion.div
              initial={prefersReducedMotion ? false : { scale: 0.88, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.2 }}
              className="space-y-3.5"
            >
              <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F7F4EC] text-[#143B2B] border-2 border-[#EF4444]">
                <span className="font-display text-lg font-bold">X_X</span>
              </div>

              <div>
                <p className="text-xs font-mono font-bold text-[#FCA5A5] tracking-wider">
                  CLOGGED OUT · LEVEL {level}
                </p>
                <h3 className="mt-1 font-display text-2xl font-bold text-[#F7F4EC]">
                  {score > 0 && playerNickname ? `Nice Run, ${playerNickname}!` : 'Game Over'}
                </h3>
                <p className="mt-1 text-sm text-[#CDE0D6] tabular-nums">
                  Score: <strong className="text-[#CEF04E]">{score}</strong> · Best:{' '}
                  <strong className="text-[#F7F4EC]">{highScore}</strong>
                </p>
                {submissionNotice && (
                  <p className="mt-1.5 text-xs text-[#9AB7A9]">{submissionNotice}</p>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={startFreshGame}
                  className="w-full min-h-[48px] px-6 py-3 rounded-xl bg-[#CEF04E] hover:bg-[#D9F66A] text-[#143B2B] font-display text-base font-bold shadow-[0_4px_0_#0A1F16] cursor-pointer"
                >
                  Play Again
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full min-h-[44px] px-5 py-2.5 rounded-xl border border-white/20 bg-[#143B2B] hover:bg-[#1C4D39] text-sm font-semibold text-[#F7F4EC] cursor-pointer"
                >
                  Back to Games
                </button>
              </div>
            </motion.div>
          </ArcadeOverlayCard>
        )}
      </div>
    </ArcadeGameShell>
  );
}

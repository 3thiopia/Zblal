import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ChevronLeft, ChevronRight, Trophy } from 'lucide-react';
import { ArcadeGameShell, ArcadeOverlayCard } from './ArcadeGameShell.tsx';
import { arcadeAudio } from '../game/arcadeAudio.ts';
import { useLanguage } from '../i18n/LanguageContext.tsx';
import { triggerHaptic } from '../utils/haptics.ts';

type GamePhase = 'TITLE_MENU' | 'PLAYING' | 'PAUSED' | 'GAME_OVER';
type FallingKind = 'poop' | 'golden_poop' | 'tp_heal' | 'plunger' | 'germ' | 'wrench';

export interface PoopDropResult {
  score: number;
  caughtCount: number;
  bestCombo: number;
  sessionId: string;
  durationMs: number;
}

interface PoopDropGameProps {
  playerNickname?: string;
  serverBestScore?: number;
  onGameComplete?: (result: PoopDropResult) => void;
  onBackToGames: () => void;
  submissionNotice?: string | null;
}

interface FallingItem {
  id: number;
  kind: FallingKind;
  x: number;
  y: number;
  vy: number;
  vx: number;
  radius: number;
  angle: number;
  spin: number;
}

interface DropParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

interface DropCallout {
  text: string;
  x: number;
  y: number;
  life: number;
  maxLife: number;
  color: string;
}

interface DropSim {
  width: number;
  height: number;
  bucketX: number;
  bucketY: number;
  bucketW: number;
  bucketH: number;
  targetX: number | null;
  moveLeft: boolean;
  moveRight: boolean;
  score: number;
  lives: number;
  combo: number;
  bestCombo: number;
  caughtCount: number;
  elapsedSec: number;
  spawnTimer: number;
  nextItemId: number;
  items: FallingItem[];
  particles: DropParticle[];
  callouts: DropCallout[];
  shakeTimer: number;
  bucketSquash: number;
  sessionId: string;
  startedAtMs: number;
  submitted: boolean;
}

const HIGH_SCORE_KEY = 'zblal_poop_drop_high_score';
const MAX_LIVES = 3;

export function loadPoopDropHighScore(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = window.localStorage.getItem(HIGH_SCORE_KEY);
    const parsed = raw ? Number.parseInt(raw, 10) : 0;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  } catch {
    return 0;
  }
}

function savePoopDropHighScore(score: number) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(HIGH_SCORE_KEY, String(score));
  } catch {
    // Ignore storage errors
  }
}

function createSessionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `pd-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function createInitialSim(width: number, height: number): DropSim {
  const safeW = Math.max(240, width);
  const safeH = Math.max(195, height);
  const bucketW = Math.max(72, Math.min(104, safeW * 0.22));
  const bucketH = Math.max(38, Math.min(54, safeH * 0.14));
  return {
    width: safeW,
    height: safeH,
    bucketX: safeW / 2,
    bucketY: safeH - bucketH * 0.88 - 10,
    bucketW,
    bucketH,
    targetX: null,
    moveLeft: false,
    moveRight: false,
    score: 0,
    lives: MAX_LIVES,
    combo: 0,
    bestCombo: 0,
    caughtCount: 0,
    elapsedSec: 0,
    spawnTimer: 0.45,
    nextItemId: 1,
    items: [],
    particles: [],
    callouts: [],
    shakeTimer: 0,
    bucketSquash: 0,
    sessionId: createSessionId(),
    startedAtMs: Date.now(),
    submitted: false,
  };
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.lineTo(x + w - rad, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rad);
  ctx.lineTo(x + w, y + h - rad);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
  ctx.lineTo(x + rad, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rad);
  ctx.lineTo(x, y + rad);
  ctx.quadraticCurveTo(x, y, x + rad, y);
  ctx.closePath();
}

function drawPoopSprite(
  ctx: CanvasRenderingContext2D,
  r: number,
  golden: boolean
) {
  const base = golden ? '#EAB308' : '#8C542B';
  const top = golden ? '#FDE047' : '#9D6134';
  const stroke = golden ? '#713F12' : '#2B1609';

  ctx.fillStyle = base;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.ellipse(0, r * 0.32, r * 0.96, r * 0.46, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = top;
  ctx.beginPath();
  ctx.ellipse(0, -r * 0.08, r * 0.72, r * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(-r * 0.34, -r * 0.42);
  ctx.quadraticCurveTo(0, -r * 1.04, r * 0.3, -r * 0.42);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Eyes & smile
  ctx.fillStyle = '#FFFDF8';
  ctx.beginPath();
  ctx.arc(-r * 0.24, -r * 0.04, r * 0.16, 0, Math.PI * 2);
  ctx.arc(r * 0.24, -r * 0.04, r * 0.16, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#1B1109';
  ctx.beginPath();
  ctx.arc(-r * 0.22, -r * 0.04, r * 0.075, 0, Math.PI * 2);
  ctx.arc(r * 0.26, -r * 0.04, r * 0.075, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#1B1109';
  ctx.lineWidth = 1.8;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(0, r * 0.14, r * 0.24, 0.15, Math.PI - 0.15);
  ctx.stroke();
}

function drawFallingItem(ctx: CanvasRenderingContext2D, item: FallingItem) {
  ctx.save();
  ctx.translate(item.x, item.y);
  ctx.rotate(item.angle);
  const r = item.radius;

  if (item.kind === 'poop') {
    drawPoopSprite(ctx, r, false);
  } else if (item.kind === 'golden_poop') {
    ctx.shadowColor = '#FACC15';
    ctx.shadowBlur = 12;
    drawPoopSprite(ctx, r, true);
    ctx.shadowBlur = 0;
  } else if (item.kind === 'tp_heal') {
    // Toilet paper roll with green heart badge
    drawRoundedRect(ctx, -r * 0.78, -r * 0.68, r * 1.56, r * 1.36, 6);
    ctx.fillStyle = '#FFFDF8';
    ctx.fill();
    ctx.strokeStyle = '#143B2B';
    ctx.lineWidth = 2.2;
    ctx.stroke();
    ctx.fillStyle = '#A87C4F';
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.42, r * 0.34, r * 0.16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#22C55E';
    ctx.font = `700 ${Math.round(r * 0.8)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('+', 0, r * 0.16);
  } else if (item.kind === 'plunger') {
    // Wooden handle + red rubber suction cup
    ctx.fillStyle = '#D97706';
    ctx.strokeStyle = '#2B1609';
    ctx.lineWidth = 2;
    drawRoundedRect(ctx, -r * 0.16, -r * 1.05, r * 0.32, r * 1.25, 4);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#EF4444';
    ctx.beginPath();
    ctx.moveTo(-r * 0.86, r * 0.78);
    ctx.quadraticCurveTo(0, -r * 0.18, r * 0.86, r * 0.78);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (item.kind === 'germ') {
    // Spiky green toxic germ
    ctx.fillStyle = '#22C55E';
    ctx.strokeStyle = '#052E16';
    ctx.lineWidth = 2.2;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * r * 0.84, Math.sin(a) * r * 0.84, r * 0.22, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.72, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Angry eyebrows & eyes
    ctx.fillStyle = '#FFFDF8';
    ctx.beginPath();
    ctx.arc(-r * 0.25, -r * 0.08, r * 0.18, 0, Math.PI * 2);
    ctx.arc(r * 0.25, -r * 0.08, r * 0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#052E16';
    ctx.beginPath();
    ctx.arc(-r * 0.24, -r * 0.06, r * 0.08, 0, Math.PI * 2);
    ctx.arc(r * 0.24, -r * 0.06, r * 0.08, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Heavy steel wrench
    ctx.fillStyle = '#94A3B8';
    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 2.2;
    drawRoundedRect(ctx, -r * 0.22, -r * 0.75, r * 0.44, r * 1.5, 5);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, -r * 0.68, r * 0.48, 0.35 * Math.PI, 2.65 * Math.PI);
    ctx.fill();
    ctx.stroke();
  }

  ctx.restore();
}

function drawScene(ctx: CanvasRenderingContext2D, sim: DropSim) {
  const { width: w, height: h } = sim;
  ctx.clearRect(0, 0, w, h);

  ctx.save();
  if (sim.shakeTimer > 0) {
    const mag = 5 * (sim.shakeTimer / 0.24);
    ctx.translate((Math.random() - 0.5) * mag * 2, (Math.random() - 0.5) * mag * 2);
  }

  // Bathroom tiled backdrop
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#0D291E');
  bg.addColorStop(1, '#143B2B');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = 'rgba(206, 240, 78, 0.07)';
  ctx.lineWidth = 1;
  const tile = 36;
  for (let x = 0; x < w; x += tile) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 0; y < h; y += tile) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  // Floor strip
  const floorY = h - 18;
  ctx.fillStyle = '#1C4D39';
  ctx.fillRect(0, floorY, w, 18);
  ctx.fillStyle = '#2D7A58';
  ctx.fillRect(0, floorY, w, 3);

  // Falling items
  for (const item of sim.items) {
    drawFallingItem(ctx, item);
  }

  // Moving Toilet Bucket
  ctx.save();
  const squashX = 1 + sim.bucketSquash * 0.14;
  const squashY = 1 - sim.bucketSquash * 0.14;
  ctx.translate(sim.bucketX, sim.bucketY);
  ctx.scale(squashX, squashY);

  const bw = sim.bucketW;
  const bh = sim.bucketH;

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.32)';
  ctx.beginPath();
  ctx.ellipse(0, bh * 0.52, bw * 0.42, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  // Porcelain bowl body
  ctx.fillStyle = '#F7F4EC';
  ctx.strokeStyle = '#102C20';
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(-bw * 0.44, -bh * 0.28);
  ctx.lineTo(bw * 0.44, -bh * 0.28);
  ctx.quadraticCurveTo(bw * 0.36, bh * 0.48, 0, bh * 0.48);
  ctx.quadraticCurveTo(-bw * 0.36, bh * 0.48, -bw * 0.44, -bh * 0.28);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Blue swirl water inside top
  ctx.fillStyle = '#38BDF8';
  ctx.beginPath();
  ctx.ellipse(0, -bh * 0.28, bw * 0.42, bh * 0.16, 0, 0, Math.PI * 2);
  ctx.fill();

  // Lime rim highlight
  ctx.strokeStyle = '#CEF04E';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.ellipse(0, -bh * 0.28, bw * 0.48, bh * 0.19, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Cute face on toilet bucket
  ctx.fillStyle = '#143B2B';
  ctx.beginPath();
  ctx.arc(-bw * 0.13, bh * 0.08, 3, 0, Math.PI * 2);
  ctx.arc(bw * 0.13, bh * 0.08, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#143B2B';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, bh * 0.14, 6, 0.15, Math.PI - 0.15);
  ctx.stroke();

  ctx.restore();

  // Particles
  for (const pt of sim.particles) {
    const alpha = Math.max(0, pt.life / pt.maxLife);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = pt.color;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Floating Callouts
  for (const c of sim.callouts) {
    const alpha = Math.max(0, Math.min(1, c.life / c.maxLife));
    ctx.globalAlpha = alpha;
    ctx.font = '700 15px "Noto Sans Ethiopic", system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#0A1F16';
    ctx.fillText(c.text, c.x + 1, c.y + 1);
    ctx.fillStyle = c.color;
    ctx.fillText(c.text, c.x, c.y);
  }
  ctx.globalAlpha = 1;

  ctx.restore();
}

export function PoopDropGame({
  playerNickname,
  serverBestScore = 0,
  onGameComplete,
  onBackToGames,
  submissionNotice,
}: PoopDropGameProps) {
  const { t } = useLanguage();
  const arcadeCommon = t.arcade.common;
  const pdText = t.arcade.poopDrop;
  const pdTextRef = useRef(pdText);
  pdTextRef.current = pdText;

  const prefersReducedMotion = useReducedMotion() ?? false;
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const simRef = useRef<DropSim>(createInitialSim(420, 520));
  const phaseRef = useRef<GamePhase>('TITLE_MENU');
  const onGameCompleteRef = useRef(onGameComplete);
  onGameCompleteRef.current = onGameComplete;

  const [phase, setPhase] = useState<GamePhase>('TITLE_MENU');
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(MAX_LIVES);
  const [combo, setCombo] = useState(0);
  const [highScore, setHighScore] = useState(() =>
    Math.max(loadPoopDropHighScore(), serverBestScore)
  );
  const [muted, setMuted] = useState(() => arcadeAudio.isMuted());
  const [caughtCount, setCaughtCount] = useState(0);
  const [isNewBest, setIsNewBest] = useState(false);

  const highScoreRef = useRef(highScore);
  highScoreRef.current = highScore;

  useEffect(() => {
    if (serverBestScore > highScoreRef.current) {
      setHighScore(serverBestScore);
      savePoopDropHighScore(serverBestScore);
    }
  }, [serverBestScore]);

  const setGamePhase = useCallback((next: GamePhase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  const finishRun = useCallback(
    (sim: DropSim) => {
      arcadeAudio.playGameOver();
      triggerHaptic([20, 30, 20]);
      setIsNewBest(sim.score > 0 && sim.score >= highScoreRef.current);
      setGamePhase('GAME_OVER');
      if (!sim.submitted) {
        sim.submitted = true;
        onGameCompleteRef.current?.({
          score: sim.score,
          caughtCount: sim.caughtCount,
          bestCombo: sim.bestCombo,
          sessionId: sim.sessionId,
          durationMs: Math.max(1000, Date.now() - sim.startedAtMs),
        });
      }
    },
    [setGamePhase]
  );

  const startFreshGame = useCallback(() => {
    triggerHaptic(10);
    const current = simRef.current;
    const nextSim = createInitialSim(current.width, current.height);
    simRef.current = nextSim;
    setScore(0);
    setLives(MAX_LIVES);
    setCombo(0);
    setCaughtCount(0);
    setIsNewBest(false);
    setGamePhase('PLAYING');
  }, [setGamePhase]);

  const togglePause = useCallback(() => {
    triggerHaptic(6);
    if (phaseRef.current === 'PLAYING') {
      setGamePhase('PAUSED');
    } else if (phaseRef.current === 'PAUSED') {
      setGamePhase('PLAYING');
    }
  }, [setGamePhase]);

  const toggleMute = useCallback(() => {
    const next = !arcadeAudio.isMuted();
    arcadeAudio.setMuted(next);
    setMuted(next);
  }, []);

  // Size canvas cleanly to viewport container
  useEffect(() => {
    const updateSize = () => {
      const container = stageRef.current;
      const canvas = canvasRef.current;
      if (!container || !canvas) return;
      const rect = container.getBoundingClientRect();
      const logicalW = Math.max(240, Math.min(540, Math.floor(rect.width - 8)));
      const logicalH = Math.max(195, Math.min(620, Math.floor(rect.height - 8)));
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = logicalW * dpr;
      canvas.height = logicalH * dpr;
      canvas.style.width = `${logicalW}px`;
      canvas.style.height = `${logicalH}px`;

      const sim = simRef.current;
      const ratioX = sim.width > 0 ? sim.bucketX / sim.width : 0.5;
      sim.width = logicalW;
      sim.height = logicalH;
      sim.bucketW = Math.max(76, Math.min(104, logicalW * 0.22));
      sim.bucketH = Math.max(44, Math.min(54, logicalH * 0.1));
      sim.bucketY = logicalH - sim.bucketH * 0.88 - 10;
      sim.bucketX = Math.max(
        sim.bucketW * 0.5,
        Math.min(logicalW - sim.bucketW * 0.5, ratioX * logicalW)
      );
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    if (stageRef.current) observer.observe(stageRef.current);
    window.addEventListener('resize', updateSize);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateSize);
    };
  }, []);

  // Main animation loop
  useEffect(() => {
    let rafId = 0;
    let lastTs = performance.now();

    const spawnParticles = (sim: DropSim, x: number, y: number, color: string, count = 8) => {
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = 55 + Math.random() * 140;
        sim.particles.push({
          x,
          y,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp - 40,
          life: 0.42,
          maxLife: 0.42,
          color,
          size: 2.5 + Math.random() * 3,
        });
      }
    };

    const spawnItem = (sim: DropSim) => {
      const diff = Math.min(1, sim.elapsedSec / 75);
      const hazardChance = 0.2 + diff * 0.18; // 20% -> 38%
      const roll = Math.random();
      let kind: FallingKind = 'poop';
      if (roll < hazardChance) {
        const hRoll = Math.random();
        kind = hRoll < 0.42 ? 'plunger' : hRoll < 0.78 ? 'germ' : 'wrench';
      } else if (roll < hazardChance + 0.075 && sim.lives < MAX_LIVES) {
        kind = 'tp_heal';
      } else if (roll < hazardChance + 0.16) {
        kind = 'golden_poop';
      }

      const radius = kind === 'golden_poop' ? 16 : 19;
      const x = radius + 10 + Math.random() * Math.max(40, sim.width - (radius + 10) * 2);
      const baseSpeed = 165 + diff * 215 + Math.random() * 45;
      const vy =
        kind === 'golden_poop'
          ? baseSpeed * 1.24
          : kind === 'wrench'
          ? baseSpeed * 1.15
          : baseSpeed;
      const vx =
        diff > 0.35 && (kind === 'germ' || kind === 'poop')
          ? (Math.random() - 0.5) * 48 * diff
          : 0;

      sim.items.push({
        id: sim.nextItemId++,
        kind,
        x,
        y: -radius - 6,
        vy,
        vx,
        radius,
        angle: 0,
        spin: kind === 'wrench' || kind === 'plunger' ? (Math.random() - 0.5) * 3.5 : (Math.random() - 0.5) * 1.2,
      });
    };

    const loop = (now: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTs) / 1000));
      lastTs = now;
      const sim = simRef.current;

      if (phaseRef.current === 'PLAYING') {
        sim.elapsedSec += dt;
        if (sim.shakeTimer > 0) sim.shakeTimer = Math.max(0, sim.shakeTimer - dt);
        if (sim.bucketSquash > 0) sim.bucketSquash = Math.max(0, sim.bucketSquash - dt * 6);

        // Move bucket via keyboard or pointer target
        const keySpeed = Math.max(360, sim.width * 0.98);
        if (sim.moveLeft && !sim.moveRight) {
          sim.targetX = null;
          sim.bucketX -= keySpeed * dt;
        } else if (sim.moveRight && !sim.moveLeft) {
          sim.targetX = null;
          sim.bucketX += keySpeed * dt;
        } else if (sim.targetX !== null) {
          const diffX = sim.targetX - sim.bucketX;
          sim.bucketX += diffX * Math.min(1, dt * 24);
        }

        const halfB = sim.bucketW * 0.5;
        sim.bucketX = Math.max(halfB + 4, Math.min(sim.width - halfB - 4, sim.bucketX));

        // Spawn items
        sim.spawnTimer -= dt;
        if (sim.spawnTimer <= 0) {
          spawnItem(sim);
          const diff = Math.min(1, sim.elapsedSec / 75);
          sim.spawnTimer = Math.max(0.32, 0.92 - diff * 0.54) + Math.random() * 0.18;
        }

        // Step items & collisions
        const catchTop = sim.bucketY - sim.bucketH * 0.45;
        const catchBottom = sim.bucketY + sim.bucketH * 0.35;
        const catchHalfW = sim.bucketW * 0.52;

        for (let i = sim.items.length - 1; i >= 0; i--) {
          const item = sim.items[i];
          item.y += item.vy * dt;
          item.x += item.vx * dt;
          item.angle += item.spin * dt;
          if (item.x < item.radius + 6 || item.x > sim.width - item.radius - 6) {
            item.vx *= -1;
            item.x = Math.max(item.radius + 6, Math.min(sim.width - item.radius - 6, item.x));
          }

          const inCatchY = item.y + item.radius * 0.5 >= catchTop && item.y - item.radius * 0.4 <= catchBottom;
          const inCatchX = Math.abs(item.x - sim.bucketX) <= catchHalfW + item.radius * 0.3;

          if (inCatchY && inCatchX) {
            sim.items.splice(i, 1);
            sim.bucketSquash = 1;

            if (item.kind === 'plunger' || item.kind === 'germ' || item.kind === 'wrench') {
              // Bad object!
              sim.lives -= 1;
              sim.combo = 0;
              sim.shakeTimer = 0.24;
              setLives(sim.lives);
              setCombo(0);
              arcadeAudio.playHit();
              triggerHaptic([18, 24, 18]);
              spawnParticles(sim, item.x, catchTop, '#EF4444', 12);
              sim.callouts.push({
                text: pdTextRef.current.oopsCallout,
                x: item.x,
                y: catchTop - 10,
                life: 0.75,
                maxLife: 0.75,
                color: '#FCA5A5',
              });

              if (sim.lives <= 0) {
                finishRun(sim);
                break;
              }
            } else {
              // Good catch!
              sim.combo += 1;
              if (sim.combo > sim.bestCombo) sim.bestCombo = sim.combo;
              sim.caughtCount += 1;
              setCombo(sim.combo);
              setCaughtCount(sim.caughtCount);

              const mult = Math.min(4, 1 + Math.floor((sim.combo - 1) / 5));
              const basePts =
                item.kind === 'golden_poop' ? 30 : item.kind === 'tp_heal' ? 20 : 10;
              const gained = basePts * mult;
              sim.score += gained;
              setScore(sim.score);

              if (sim.score > highScoreRef.current) {
                setHighScore(sim.score);
                savePoopDropHighScore(sim.score);
              }

              if (item.kind === 'tp_heal') {
                if (sim.lives < MAX_LIVES) {
                  sim.lives += 1;
                  setLives(sim.lives);
                }
                arcadeAudio.playGoldBonus();
                triggerHaptic([8, 14]);
                spawnParticles(sim, item.x, catchTop, '#4ADE80', 10);
                sim.callouts.push({
                  text: `+${gained} & +1 ♥`,
                  x: item.x,
                  y: catchTop - 10,
                  life: 0.85,
                  maxLife: 0.85,
                  color: '#4ADE80',
                });
              } else if (item.kind === 'golden_poop') {
                arcadeAudio.playGoldBonus();
                triggerHaptic([8, 12]);
                spawnParticles(sim, item.x, catchTop, '#FACC15', 12);
                sim.callouts.push({
                  text: mult > 1 ? `+${gained} (${mult}x!)` : pdTextRef.current.goldCallout(gained),
                  x: item.x,
                  y: catchTop - 10,
                  life: 0.8,
                  maxLife: 0.8,
                  color: '#FDE047',
                });
              } else {
                arcadeAudio.playCatch(sim.combo);
                triggerHaptic(6);
                spawnParticles(sim, item.x, catchTop, '#CEF04E', 7);
                sim.callouts.push({
                  text: mult > 1 ? `+${gained} (${mult}x)` : `+${gained}`,
                  x: item.x,
                  y: catchTop - 8,
                  life: 0.65,
                  maxLife: 0.65,
                  color: '#CEF04E',
                });
              }
            }
            continue;
          }

          // Missed on floor
          if (item.y - item.radius > sim.height - 14) {
            sim.items.splice(i, 1);
            if (item.kind === 'poop' || item.kind === 'golden_poop') {
              sim.lives -= 1;
              sim.combo = 0;
              sim.shakeTimer = 0.2;
              setLives(sim.lives);
              setCombo(0);
              arcadeAudio.playHit();
              triggerHaptic(16);
              spawnParticles(sim, item.x, sim.height - 20, '#92400E', 8);
              sim.callouts.push({
                text: pdTextRef.current.splatCallout,
                x: item.x,
                y: sim.height - 34,
                life: 0.7,
                maxLife: 0.7,
                color: '#FCA5A5',
              });
              if (sim.lives <= 0) {
                finishRun(sim);
                break;
              }
            }
          }
        }
      }

      // Step particles & callouts
      for (let i = sim.particles.length - 1; i >= 0; i--) {
        const pt = sim.particles[i];
        pt.x += pt.vx * dt;
        pt.y += pt.vy * dt;
        pt.vy += 260 * dt;
        pt.life -= dt;
        if (pt.life <= 0) sim.particles.splice(i, 1);
      }
      for (let i = sim.callouts.length - 1; i >= 0; i--) {
        const c = sim.callouts[i];
        c.y -= 36 * dt;
        c.life -= dt;
        if (c.life <= 0) sim.callouts.splice(i, 1);
      }

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (canvas && ctx) {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        drawScene(ctx, sim);
      }

      rafId = window.requestAnimationFrame(loop);
    };

    rafId = window.requestAnimationFrame(loop);
    return () => window.cancelAnimationFrame(rafId);
  }, [finishRun]);

  // Keyboard controls
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key;
      const low = k.toLowerCase();
      if (k === 'ArrowLeft' || k === 'ArrowRight' || k === ' ') {
        e.preventDefault();
      }
      if (k === 'Escape') {
        onBackToGames();
        return;
      }
      if (phaseRef.current === 'TITLE_MENU') {
        if (k === 'Enter' || k === ' ') startFreshGame();
        return;
      }
      if (phaseRef.current === 'GAME_OVER') {
        if (k === 'Enter' || k === ' ' || low === 'r') startFreshGame();
        return;
      }
      if (low === 'p' || k === ' ') {
        togglePause();
        return;
      }
      if (low === 'r') {
        startFreshGame();
        return;
      }
      if (k === 'ArrowLeft' || low === 'a') simRef.current.moveLeft = true;
      if (k === 'ArrowRight' || low === 'd') simRef.current.moveRight = true;
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const k = e.key;
      const low = k.toLowerCase();
      if (k === 'ArrowLeft' || low === 'a') simRef.current.moveLeft = false;
      if (k === 'ArrowRight' || low === 'd') simRef.current.moveRight = false;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [onBackToGames, startFreshGame, togglePause]);

  // Pointer drag inside canvas
  const updateTargetFromPointer = (clientX: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    simRef.current.targetX = clientX - rect.left;
  };

  const multiplier = Math.min(4, 1 + Math.floor(Math.max(0, combo - 1) / 5));

  return (
    <ArcadeGameShell
      title={pdText.title}
      ariaLabel={pdText.ariaLabel}
      accentIcon={
        <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
          <path d="M12.2 3c.6 1.5.1 2.8-.9 3.6 2.1.3 3.7 1.7 3.7 3.5 0 .6-.2 1.2-.5 1.7 1.8.6 3 2 3 3.7 0 2.2-2.4 3.5-5.5 3.5s-5.5-1.3-5.5-3.5c0-1.6 1.1-3 2.7-3.6-.3-.5-.4-1-.4-1.6 0-1.9 1.7-3.3 3.9-3.5-.8-.8-1-2.1-.5-3.8Z" />
        </svg>
      }
      muted={muted}
      isPaused={phase === 'PAUSED'}
      canPause={phase === 'PLAYING' || phase === 'PAUSED'}
      onToggleMute={toggleMute}
      onTogglePause={togglePause}
      onRestart={startFreshGame}
      onBackToGames={onBackToGames}
      stageRef={stageRef}
      hudLeft={
        <>
          <div>
            <span className="text-[#9AB7A9] font-medium mr-1">{arcadeCommon.scoreHud}</span>
            <span className="font-mono font-bold text-[#CEF04E]">{score}</span>
          </div>
          <div>
            <span className="text-[#9AB7A9] font-medium mr-1">{arcadeCommon.bestHud}</span>
            <span className="font-mono font-bold text-[#F7F4EC]">{highScore}</span>
          </div>
          {combo >= 2 && (
            <span className="font-mono font-bold text-[#FACC15] text-xs">
              {pdText.streak(combo, multiplier)}
            </span>
          )}
        </>
      }
      hudRight={
        <div className="flex items-center gap-1" aria-label={arcadeCommon.livesRemainingAria(lives)}>
          <span className="text-[#9AB7A9] font-medium text-xs mr-1 hidden sm:inline">
            {arcadeCommon.livesHud}
          </span>
          {Array.from({ length: MAX_LIVES }, (_, idx) => {
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
      }
      mobileControls={
        <div className="w-full flex items-center justify-center gap-3 [@media(max-height:520px)_and_(orientation:landscape)]:flex-col touch-none">
          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              simRef.current.moveLeft = true;
            }}
            onPointerUp={() => {
              simRef.current.moveLeft = false;
            }}
            onPointerLeave={() => {
              simRef.current.moveLeft = false;
            }}
            onPointerCancel={() => {
              simRef.current.moveLeft = false;
            }}
            aria-label={pdText.moveLeftAria}
            className="flex-1 w-full max-w-[150px] min-h-[48px] px-2 rounded-xl bg-[#143B2B] active:bg-[#CEF04E] active:text-[#143B2B] border border-[#2D7A58] text-[#F7F4EC] flex items-center justify-center gap-1 font-display text-sm font-bold shadow-[0_3px_0_#0A1F16] whitespace-nowrap cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5 shrink-0" />
            <span className="truncate">{pdText.leftBtn}</span>
          </button>
          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              simRef.current.moveRight = true;
            }}
            onPointerUp={() => {
              simRef.current.moveRight = false;
            }}
            onPointerLeave={() => {
              simRef.current.moveRight = false;
            }}
            onPointerCancel={() => {
              simRef.current.moveRight = false;
            }}
            aria-label={pdText.moveRightAria}
            className="flex-1 w-full max-w-[150px] min-h-[48px] px-2 rounded-xl bg-[#143B2B] active:bg-[#CEF04E] active:text-[#143B2B] border border-[#2D7A58] text-[#F7F4EC] flex items-center justify-center gap-1 font-display text-sm font-bold shadow-[0_3px_0_#0A1F16] whitespace-nowrap cursor-pointer"
          >
            <span className="truncate">{pdText.rightBtn}</span>
            <ChevronRight className="w-5 h-5 shrink-0" />
          </button>
        </div>
      }
      desktopLegend={
        <>
          <span>{pdText.legendMove}</span>
          <span aria-hidden="true">·</span>
          <span>{arcadeCommon.pauseLegendSpaceP}</span>
          <span aria-hidden="true">·</span>
          <span>{arcadeCommon.restartLegendR}</span>
          <span aria-hidden="true">·</span>
          <span>{arcadeCommon.backLegendEsc}</span>
        </>
      }
    >
      <div className="relative rounded-2xl border-2 border-[#2D7A58] bg-[#0F2B1F] p-1 shadow-[0_18px_40px_rgba(0,0,0,0.45)]">
        <canvas
          ref={canvasRef}
          onPointerDown={(e) => {
            if (phaseRef.current !== 'PLAYING') return;
            e.currentTarget.setPointerCapture(e.pointerId);
            updateTargetFromPointer(e.clientX);
          }}
          onPointerMove={(e) => {
            if (phaseRef.current !== 'PLAYING') return;
            if (e.buttons > 0 || e.pointerType === 'touch') {
              updateTargetFromPointer(e.clientX);
            }
          }}
          onPointerUp={() => {
            simRef.current.targetX = null;
          }}
          onPointerCancel={() => {
            simRef.current.targetX = null;
          }}
          className="block rounded-xl touch-none cursor-ew-resize"
        />

        {/* Title Menu */}
        {phase === 'TITLE_MENU' && (
          <ArcadeOverlayCard>
            <div className="space-y-3.5">
              <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#CEF04E] text-[#143B2B] shadow-[0_4px_0_#0A1F16]">
                <svg viewBox="0 0 24 24" className="w-7 h-7 fill-current">
                  <path d="M12.2 3c.6 1.5.1 2.8-.9 3.6 2.1.3 3.7 1.7 3.7 3.5 0 .6-.2 1.2-.5 1.7 1.8.6 3 2 3 3.7 0 2.2-2.4 3.5-5.5 3.5s-5.5-1.3-5.5-3.5c0-1.6 1.1-3 2.7-3.6-.3-.5-.4-1-.4-1.6 0-1.9 1.7-3.3 3.9-3.5-.8-.8-1-2.1-.5-3.8Z" />
                </svg>
              </div>

              <div>
                <h3 className="font-display text-xl sm:text-2xl font-bold text-[#F7F4EC]">
                  {pdText.title}
                </h3>
                <p className="mt-1 text-xs sm:text-sm text-[#CDE0D6] leading-relaxed">
                  {pdText.description}
                </p>
              </div>

              <div className="text-[11px] text-[#9AB7A9] space-y-0.5">
                <p>{pdText.mobileHint}</p>
                <p>{pdText.desktopHint}</p>
              </div>

              <button
                type="button"
                onClick={startFreshGame}
                className="w-full min-h-[48px] px-6 py-3 rounded-xl bg-[#CEF04E] hover:bg-[#D9F66A] active:translate-y-0.5 text-[#143B2B] font-display text-base font-bold shadow-[0_4px_0_#0A1F16] cursor-pointer"
              >
                {arcadeCommon.startGame}
              </button>
            </div>
          </ArcadeOverlayCard>
        )}

        {/* Paused Overlay */}
        {phase === 'PAUSED' && (
          <ArcadeOverlayCard>
            <div className="space-y-3.5">
              <h3 className="font-display text-2xl font-bold text-[#F7F4EC]">
                {arcadeCommon.gamePaused}
              </h3>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={togglePause}
                  className="w-full min-h-[48px] px-5 py-2.5 rounded-xl bg-[#CEF04E] hover:bg-[#D9F66A] text-[#143B2B] font-display text-base font-bold shadow-[0_4px_0_#0A1F16] cursor-pointer"
                >
                  {arcadeCommon.resume}
                </button>
                <button
                  type="button"
                  onClick={startFreshGame}
                  className="w-full min-h-[44px] px-5 py-2.5 rounded-xl border border-white/20 bg-[#143B2B] hover:bg-[#1C4D39] text-sm font-semibold text-[#F7F4EC] cursor-pointer"
                >
                  {arcadeCommon.restart}
                </button>
                <button
                  type="button"
                  onClick={onBackToGames}
                  className="w-full min-h-[44px] px-5 py-2.5 rounded-xl border border-white/15 bg-transparent hover:bg-white/10 text-sm font-semibold text-[#CDE0D6] cursor-pointer"
                >
                  {arcadeCommon.backToGames}
                </button>
              </div>
            </div>
          </ArcadeOverlayCard>
        )}

        {/* Game Over Overlay */}
        {phase === 'GAME_OVER' && (
          <ArcadeOverlayCard>
            <motion.div
              initial={prefersReducedMotion ? false : { scale: 0.86, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.2 }}
              className="space-y-3.5"
            >
              <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F7F4EC] text-[#143B2B] border-2 border-[#CEF04E]">
                <Trophy className="w-6 h-6 text-[#D97706]" />
              </div>

              <div>
                <p className="text-xs font-mono font-bold text-[#FACC15] tracking-wider">
                  {isNewBest ? arcadeCommon.newPersonalBest : pdText.bucketFull}
                </p>
                <h3 className="mt-1 font-display text-2xl font-bold text-[#F7F4EC]">
                  {score > 0
                    ? pdText.niceCatching(playerNickname)
                    : arcadeCommon.gameOver}
                </h3>
                <p className="mt-1 text-sm text-[#CDE0D6] tabular-nums">
                  {arcadeCommon.scoreLabel}{' '}
                  <strong className="text-[#CEF04E]">{score}</strong>
                  <span aria-hidden="true"> · </span>
                  {pdText.caughtLabel}{' '}
                  <strong className="text-[#F7F4EC]">{caughtCount}</strong>
                  <span aria-hidden="true"> · </span>
                  {arcadeCommon.bestLabel}{' '}
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
                  {arcadeCommon.playAgain}
                </button>
                <button
                  type="button"
                  onClick={onBackToGames}
                  className="w-full min-h-[44px] px-5 py-2.5 rounded-xl border border-white/20 bg-[#143B2B] hover:bg-[#1C4D39] text-sm font-semibold text-[#F7F4EC] cursor-pointer"
                >
                  {arcadeCommon.backToGames}
                </button>
              </div>
            </motion.div>
          </ArcadeOverlayCard>
        )}
      </div>
    </ArcadeGameShell>
  );
}

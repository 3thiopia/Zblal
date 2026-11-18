import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Trophy } from 'lucide-react';
import { ArcadeGameShell, ArcadeOverlayCard } from './ArcadeGameShell.tsx';
import { toiletBasketballAudio } from '../game/toiletBasketballAudio.ts';
import { triggerHaptic } from '../utils/haptics.ts';

export const TOILET_BASKETBALL_HIGH_SCORE_KEY = 'zblal_toilet_basketball_high_score';
export const MAX_MISSES = 3;

export function loadToiletBasketballHighScore(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = window.localStorage.getItem(TOILET_BASKETBALL_HIGH_SCORE_KEY);
    const parsed = raw ? Number.parseInt(raw, 10) : 0;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  } catch {
    return 0;
  }
}

export function saveToiletBasketballHighScore(score: number) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(TOILET_BASKETBALL_HIGH_SCORE_KEY, String(score));
  } catch {
    // Ignore localStorage errors
  }
}

export function computeLaunchVelocity(params: {
  dragDx: number;
  dragDy: number;
  stageWidth: number;
  stageHeight: number;
}): { vx: number; vy: number; powerRatio: number } {
  const maxPull = Math.min(params.stageWidth, params.stageHeight) * 0.28;
  const dist = Math.hypot(params.dragDx, params.dragDy);
  if (dist < 14 || maxPull <= 0) {
    return { vx: 0, vy: 0, powerRatio: 0 };
  }

  const clampedDist = Math.min(dist, maxPull);
  const powerRatio = clampedDist / maxPull;
  const dirX = params.dragDx / dist;
  const dirY = params.dragDy / dist;

  // Launch opposite of drag-back vector
  const maxSpeed = Math.max(760, Math.hypot(params.stageWidth, params.stageHeight) * 1.42);
  const speed = (0.28 + powerRatio * 0.72) * maxSpeed;

  return {
    vx: -dirX * speed,
    vy: -dirY * speed,
    powerRatio,
  };
}

export function computeTrajectoryPoints(params: {
  startX: number;
  startY: number;
  vx: number;
  vy: number;
  gravity: number;
  windAx: number;
  steps?: number;
  dtStep?: number;
}): Array<{ x: number; y: number }> {
  const steps = params.steps ?? 16;
  const dt = params.dtStep ?? 0.042;
  const points: Array<{ x: number; y: number }> = [];
  let x = params.startX;
  let y = params.startY;
  let vx = params.vx;
  let vy = params.vy;

  for (let i = 0; i < steps; i++) {
    vx += params.windAx * dt;
    vy += params.gravity * dt;
    x += vx * dt;
    y += vy * dt;
    points.push({ x, y });
  }
  return points;
}

function createRunSessionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `tb-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export type BasketballPhase = 'READY' | 'AIMING' | 'FLYING' | 'PAUSED' | 'GAME_OVER';

export interface ToiletBasketballResult {
  score: number;
  shotsMade: number;
  bestStreak: number;
  sessionId: string;
  durationMs: number;
}

interface ToiletBasketballGameProps {
  playerNickname?: string;
  serverBestScore?: number;
  submissionNotice?: string | null;
  onGameComplete?: (result: ToiletBasketballResult) => void;
  onBackToGames: () => void;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

interface Callout {
  text: string;
  x: number;
  y: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
}

interface SimState {
  phase: BasketballPhase;
  phaseBeforePause: BasketballPhase;
  width: number;
  height: number;
  score: number;
  misses: number;
  streak: number;
  bestStreak: number;
  shotsMade: number;
  gravity: number;
  windAx: number;
  ballX: number;
  ballY: number;
  ballVx: number;
  ballVy: number;
  ballAngle: number;
  ballSpin: number;
  ballRadius: number;
  anchorX: number;
  anchorY: number;
  dragCurrentX: number;
  dragCurrentY: number;
  touchedRimThisShot: boolean;
  hoopBaseX: number;
  hoopBaseY: number;
  hoopX: number;
  hoopY: number;
  hoopRimHalfW: number;
  hoopSwayAmp: number;
  hoopSwayFreq: number;
  floorY: number;
  shotResolved: boolean;
  toiletHappyTimer: number;
  toiletGaspTimer: number;
  animClock: number;
  particles: Particle[];
  callouts: Callout[];
  sessionId: string;
  startedAtMs: number;
  submittedCurrentRun: boolean;
}

function createSimulation(width: number, height: number): SimState {
  const safeW = Math.max(280, width);
  const safeH = Math.max(320, height);
  const floorY = safeH - Math.max(22, safeH * 0.06);
  const ballRadius = Math.max(15, Math.min(22, Math.min(safeW, safeH) * 0.044));
  const anchorX = Math.max(ballRadius + 46, safeW * 0.19);
  const anchorY = floorY - Math.max(76, safeH * 0.22);
  const hoopBaseX = safeW * 0.77;
  const hoopBaseY = Math.max(115, safeH * 0.42);
  const hoopRimHalfW = Math.max(28, Math.min(40, safeW * 0.075));

  return {
    phase: 'READY',
    phaseBeforePause: 'READY',
    width: safeW,
    height: safeH,
    score: 0,
    misses: 0,
    streak: 0,
    bestStreak: 0,
    shotsMade: 0,
    gravity: Math.max(980, safeH * 2.05),
    windAx: 0,
    ballX: anchorX,
    ballY: anchorY,
    ballVx: 0,
    ballVy: 0,
    ballAngle: 0,
    ballSpin: 0,
    ballRadius,
    anchorX,
    anchorY,
    dragCurrentX: anchorX,
    dragCurrentY: anchorY,
    touchedRimThisShot: false,
    hoopBaseX,
    hoopBaseY,
    hoopX: hoopBaseX,
    hoopY: hoopBaseY,
    hoopRimHalfW,
    hoopSwayAmp: 0,
    hoopSwayFreq: 1.6,
    floorY,
    shotResolved: false,
    toiletHappyTimer: 0,
    toiletGaspTimer: 0,
    animClock: 0,
    particles: [],
    callouts: [],
    sessionId: createRunSessionId(),
    startedAtMs: Date.now(),
    submittedCurrentRun: false,
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
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

function drawPoopBasketball(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  angle: number,
  isFlying: boolean
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  // Outer basketball-poop silhouette
  ctx.fillStyle = '#8C542B';
  ctx.strokeStyle = '#2B1609';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Top swirl crest so it clearly reads as a poop ball
  ctx.fillStyle = '#9D6134';
  ctx.beginPath();
  ctx.moveTo(-r * 0.42, -r * 0.72);
  ctx.quadraticCurveTo(0, -r * 1.24, r * 0.34, -r * 0.76);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Basketball seam ribs
  ctx.strokeStyle = '#4B2811';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-r * 0.92, 0);
  ctx.lineTo(r * 0.92, 0);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(-r * 0.65, 0, r * 0.62, -0.8, 0.8);
  ctx.stroke();

  // Cute glossy highlight
  ctx.fillStyle = 'rgba(255, 240, 215, 0.28)';
  ctx.beginPath();
  ctx.ellipse(-r * 0.34, -r * 0.38, r * 0.22, r * 0.12, -0.5, 0, Math.PI * 2);
  ctx.fill();

  // Expressive eyes
  const eyeY = -r * 0.14;
  ctx.fillStyle = '#FFFDF8';
  ctx.strokeStyle = '#1B1109';
  ctx.lineWidth = 1.4;
  for (const sign of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(sign * r * 0.28, eyeY, r * 0.21, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  ctx.fillStyle = '#1B1109';
  for (const sign of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(
      sign * r * 0.28 + (isFlying ? 1.5 : 0.8),
      eyeY,
      r * 0.1,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }

  // Smile or O mouth when flying
  ctx.strokeStyle = '#1B1109';
  ctx.lineWidth = 1.8;
  if (isFlying) {
    ctx.fillStyle = '#1B1109';
    ctx.beginPath();
    ctx.ellipse(0, r * 0.34, r * 0.15, r * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.arc(0, r * 0.24, r * 0.24, 0.15, Math.PI - 0.15);
    ctx.stroke();
  }

  ctx.restore();
}

function drawToiletHoop(ctx: CanvasRenderingContext2D, sim: SimState) {
  const hx = sim.hoopX;
  const hy = sim.hoopY;
  const rimHalfW = sim.hoopRimHalfW;
  const backboardX = hx + rimHalfW + 8;

  // Support pipe from floor to toilet tank
  ctx.fillStyle = '#6B8E7E';
  ctx.strokeStyle = '#102C20';
  ctx.lineWidth = 2;
  drawRoundedRect(ctx, backboardX + 10, hy - 20, 12, sim.floorY - (hy - 20), 4);
  ctx.fill();
  ctx.stroke();

  // Porcelain Toilet Tank as Basketball Backboard
  const tankW = 30;
  const tankH = 74;
  ctx.fillStyle = '#F7F4EC';
  ctx.strokeStyle = '#102C20';
  ctx.lineWidth = 2.4;
  drawRoundedRect(ctx, backboardX - 6, hy - 56, tankW, tankH, 8);
  ctx.fill();
  ctx.stroke();

  // Tank lid
  ctx.fillStyle = '#FFFFFF';
  drawRoundedRect(ctx, backboardX - 9, hy - 62, tankW + 6, 10, 5);
  ctx.fill();
  ctx.stroke();

  // Green basketball backboard target square + reactive flush handle
  ctx.strokeStyle = '#143B2B';
  ctx.lineWidth = 2;
  ctx.strokeRect(backboardX - 2, hy - 34, 14, 24);

  ctx.fillStyle = '#CEF04E';
  ctx.beginPath();
  ctx.arc(backboardX + 14, hy - 44, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Toilet bowl net silhouette underneath the rim
  ctx.fillStyle = 'rgba(247, 244, 236, 0.92)';
  ctx.strokeStyle = '#102C20';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(hx - rimHalfW + 4, hy + 4);
  ctx.quadraticCurveTo(hx - rimHalfW * 0.72, hy + 46, hx, hy + 48);
  ctx.quadraticCurveTo(hx + rimHalfW * 0.72, hy + 46, hx + rimHalfW - 4, hy + 4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Blue water shimmer at base of bowl
  ctx.fillStyle = '#38BDF8';
  ctx.beginPath();
  ctx.ellipse(hx, hy + 28, rimHalfW * 0.62, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  // Cute face on the front of the porcelain bowl
  const faceY = hy + 24;
  ctx.fillStyle = '#143B2B';
  if (sim.toiletHappyTimer > 0) {
    ctx.strokeStyle = '#143B2B';
    ctx.lineWidth = 2;
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(hx + s * 10, faceY - 2, 3, Math.PI, Math.PI * 2);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(hx, faceY + 2, 5.5, 0.1, Math.PI - 0.1);
    ctx.stroke();
  } else if (sim.toiletGaspTimer > 0) {
    ctx.beginPath();
    ctx.arc(hx - 9, faceY - 2, 2.2, 0, Math.PI * 2);
    ctx.arc(hx + 9, faceY - 2, 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(hx, faceY + 5, 3, 4, 0, 0, Math.PI * 2);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(hx - 9, faceY - 2, 2, 0, Math.PI * 2);
    ctx.arc(hx + 9, faceY - 2, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#143B2B';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(hx, faceY + 1, 4.2, 0.2, Math.PI - 0.2);
    ctx.stroke();
  }

  // Toilet Seat Hoop Rim (Back half + Front accent rim)
  ctx.strokeStyle = '#102C20';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.ellipse(hx, hy, rimHalfW, 8.5, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = '#CEF04E';
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  ctx.ellipse(hx, hy, rimHalfW, 8.5, 0, 0, Math.PI * 2);
  ctx.stroke();
}

export function ToiletBasketballGame({
  playerNickname,
  serverBestScore = 0,
  submissionNotice,
  onGameComplete,
  onBackToGames,
}: ToiletBasketballGameProps) {
  const prefersReducedMotion = useReducedMotion() ?? false;
  const stageContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const simRef = useRef<SimState>(createSimulation(420, 440));
  const activePointerIdRef = useRef<number | null>(null);

  const [phase, setPhase] = useState<BasketballPhase>('READY');
  const [score, setScore] = useState(0);
  const [misses, setMisses] = useState(0);
  const [streak, setStreak] = useState(0);
  const [shotsMade, setShotsMade] = useState(0);
  const [windSpeedLabel, setWindSpeedLabel] = useState(0);
  const [highScore, setHighScore] = useState<number>(() =>
    Math.max(loadToiletBasketballHighScore(), serverBestScore)
  );
  const [isNewBest, setIsNewBest] = useState(false);
  const [muted, setMuted] = useState(false);

  const highScoreRef = useRef(highScore);
  const onGameCompleteRef = useRef(onGameComplete);
  highScoreRef.current = highScore;
  onGameCompleteRef.current = onGameComplete;

  useEffect(() => {
    if (serverBestScore > highScoreRef.current) {
      highScoreRef.current = serverBestScore;
      setHighScore(serverBestScore);
      saveToiletBasketballHighScore(serverBestScore);
    }
  }, [serverBestScore]);

  const updatePhase = useCallback((next: BasketballPhase) => {
    simRef.current.phase = next;
    setPhase(next);
  }, []);

  const resetBallForNextShot = useCallback((repositionHoop: boolean) => {
    const sim = simRef.current;
    sim.ballX = sim.anchorX;
    sim.ballY = sim.anchorY;
    sim.ballVx = 0;
    sim.ballVy = 0;
    sim.ballAngle = 0;
    sim.ballSpin = 0;
    sim.dragCurrentX = sim.anchorX;
    sim.dragCurrentY = sim.anchorY;
    sim.touchedRimThisShot = false;
    sim.shotResolved = false;

    if (repositionHoop && sim.score >= 3) {
      const minX = sim.width * 0.62;
      const maxX = sim.width - sim.hoopRimHalfW - 44;
      const minY = Math.max(92, sim.height * 0.25);
      const maxY = Math.min(sim.floorY - 96, sim.height * 0.54);
      sim.hoopBaseX = minX + Math.random() * Math.max(20, maxX - minX);
      sim.hoopBaseY = minY + Math.random() * Math.max(20, maxY - minY);
      sim.hoopX = sim.hoopBaseX;
      sim.hoopY = sim.hoopBaseY;
    }

    if (sim.score >= 6) {
      sim.hoopSwayAmp = Math.min(26, 8 + (sim.score - 6) * 2.2);
      sim.hoopSwayFreq = Math.min(2.6, 1.4 + (sim.score - 6) * 0.08);
    } else {
      sim.hoopSwayAmp = 0;
    }

    if (sim.score >= 10) {
      const dir = sim.score % 2 === 0 ? 1 : -1;
      sim.windAx = dir * Math.min(185, 55 + (sim.score - 10) * 14);
      setWindSpeedLabel(Math.round(sim.windAx));
    } else {
      sim.windAx = 0;
      setWindSpeedLabel(0);
    }

    updatePhase('READY');
  }, [updatePhase]);

  const restartGame = useCallback(() => {
    triggerHaptic(8);
    const cur = simRef.current;
    const fresh = createSimulation(cur.width, cur.height);
    simRef.current = fresh;
    activePointerIdRef.current = null;
    setScore(0);
    setMisses(0);
    setStreak(0);
    setShotsMade(0);
    setWindSpeedLabel(0);
    setIsNewBest(false);
    setPhase('READY');
  }, []);

  const togglePause = useCallback(() => {
    const sim = simRef.current;
    if (sim.phase === 'PAUSED') {
      triggerHaptic(6);
      updatePhase(sim.phaseBeforePause);
      return;
    }
    if (sim.phase === 'READY' || sim.phase === 'FLYING' || sim.phase === 'AIMING') {
      triggerHaptic(6);
      sim.phaseBeforePause = sim.phase === 'AIMING' ? 'READY' : sim.phase;
      updatePhase('PAUSED');
    }
  }, [updatePhase]);

  const handleToggleMute = useCallback(() => {
    const next = !muted;
    setMuted(next);
    toiletBasketballAudio.setMuted(next);
  }, [muted]);

  // Responsive Stage ResizeObserver
  useEffect(() => {
    const container = stageContainerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      if (rect.width < 120 || rect.height < 140) return;

      const cssW = Math.floor(Math.min(rect.width - 10, 760));
      const cssH = Math.floor(Math.max(195, Math.min(rect.height - 10, 560)));
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = Math.floor(cssW * dpr);
      canvas.height = Math.floor(cssH * dpr);
      canvas.style.width = `${cssW}px`;
      canvas.style.height = `${cssH}px`;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }

      const sim = simRef.current;
      const wasReady = sim.phase === 'READY';
      sim.width = cssW;
      sim.height = cssH;
      sim.floorY = cssH - Math.max(22, cssH * 0.06);
      sim.ballRadius = Math.max(15, Math.min(22, Math.min(cssW, cssH) * 0.044));
      sim.gravity = Math.max(980, cssH * 2.05);
      sim.anchorX = Math.max(sim.ballRadius + 46, cssW * 0.19);
      sim.anchorY = sim.floorY - Math.max(76, cssH * 0.22);
      sim.hoopRimHalfW = Math.max(28, Math.min(40, cssW * 0.075));
      sim.hoopBaseX = Math.min(cssW - sim.hoopRimHalfW - 44, cssW * 0.77);
      sim.hoopBaseY = Math.max(105, cssH * 0.42);
      if (wasReady) {
        sim.ballX = sim.anchorX;
        sim.ballY = sim.anchorY;
        sim.hoopX = sim.hoopBaseX;
        sim.hoopY = sim.hoopBaseY;
      }
    };

    resize();
    const obs = new ResizeObserver(resize);
    obs.observe(container);
    return () => obs.disconnect();
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
        if (phase !== 'GAME_OVER') {
          e.preventDefault();
          togglePause();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, togglePause]);

  // Physics & Render Loop
  useEffect(() => {
    let rafId = 0;
    let lastTime = performance.now();

    const triggerMissedShot = (sim: SimState) => {
      if (sim.shotResolved) return;
      sim.shotResolved = true;
      sim.misses += 1;
      sim.streak = 0;
      sim.toiletGaspTimer = 0.7;
      setMisses(sim.misses);
      setStreak(0);
      toiletBasketballAudio.playMissPlop();
      triggerHaptic([16, 26, 16]);

      const remaining = MAX_MISSES - sim.misses;
      sim.callouts.push({
        text: remaining > 0 ? `BRICK! ${remaining} LEFT` : 'GAME OVER!',
        x: Math.max(70, Math.min(sim.width - 70, sim.ballX)),
        y: Math.min(sim.floorY - 28, Math.max(60, sim.ballY - 12)),
        vy: -42,
        life: 0.9,
        maxLife: 0.9,
        color: '#FCA5A5',
      });

      if (sim.misses >= MAX_MISSES) {
        toiletBasketballAudio.playGameOver();
        updatePhase('GAME_OVER');
        if (!sim.submittedCurrentRun) {
          sim.submittedCurrentRun = true;
          onGameCompleteRef.current?.({
            score: sim.score,
            shotsMade: sim.shotsMade,
            bestStreak: sim.bestStreak,
            sessionId: sim.sessionId,
            durationMs: Math.max(1000, Date.now() - sim.startedAtMs),
          });
        }
      } else {
        resetBallForNextShot(false);
      }
    };

    const step = (dt: number) => {
      const sim = simRef.current;
      sim.animClock += dt;
      if (sim.toiletHappyTimer > 0) {
        sim.toiletHappyTimer = Math.max(0, sim.toiletHappyTimer - dt);
      }
      if (sim.toiletGaspTimer > 0) {
        sim.toiletGaspTimer = Math.max(0, sim.toiletGaspTimer - dt);
      }

      for (let i = sim.particles.length - 1; i >= 0; i--) {
        const p = sim.particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 460 * dt;
        p.life -= dt;
        if (p.life <= 0) sim.particles.splice(i, 1);
      }

      for (let i = sim.callouts.length - 1; i >= 0; i--) {
        const c = sim.callouts[i];
        c.y += c.vy * dt;
        c.life -= dt;
        if (c.life <= 0) sim.callouts.splice(i, 1);
      }

      if (sim.phase === 'PAUSED' || sim.phase === 'GAME_OVER') return;

      // Gentle hoop sway at higher scores
      if (sim.hoopSwayAmp > 0 && !prefersReducedMotion) {
        sim.hoopY =
          sim.hoopBaseY + Math.sin(sim.animClock * sim.hoopSwayFreq) * sim.hoopSwayAmp;
      }

      if (sim.phase !== 'FLYING') return;

      const prevY = sim.ballY;
      sim.ballVx += sim.windAx * dt;
      sim.ballVy += sim.gravity * dt;
      sim.ballX += sim.ballVx * dt;
      sim.ballY += sim.ballVy * dt;
      sim.ballAngle += sim.ballSpin * dt;

      // Backboard (toilet tank) collision
      const backboardLeft = sim.hoopX + sim.hoopRimHalfW + 2;
      const backboardTop = sim.hoopY - 62;
      const backboardBottom = sim.hoopY + 20;
      if (
        sim.ballX + sim.ballRadius > backboardLeft &&
        sim.ballX - sim.ballRadius < backboardLeft + 28 &&
        sim.ballY > backboardTop &&
        sim.ballY < backboardBottom &&
        sim.ballVx > 0
      ) {
        sim.ballX = backboardLeft - sim.ballRadius;
        sim.ballVx = -sim.ballVx * 0.62;
        sim.ballSpin = -sim.ballSpin * 0.6;
        sim.touchedRimThisShot = true;
        toiletBasketballAudio.playRimBounce();
      }

      // Left & Right rim peg circle collisions
      const pegs = [
        { x: sim.hoopX - sim.hoopRimHalfW, y: sim.hoopY },
        { x: sim.hoopX + sim.hoopRimHalfW, y: sim.hoopY },
      ];
      for (const peg of pegs) {
        const dx = sim.ballX - peg.x;
        const dy = sim.ballY - peg.y;
        const minDist = sim.ballRadius + 4.5;
        const dist = Math.hypot(dx, dy);
        if (dist > 0.001 && dist < minDist) {
          const nx = dx / dist;
          const ny = dy / dist;
          sim.ballX = peg.x + nx * minDist;
          sim.ballY = peg.y + ny * minDist;
          const dot = sim.ballVx * nx + sim.ballVy * ny;
          if (dot < 0) {
            sim.ballVx = (sim.ballVx - 2 * dot * nx) * 0.68;
            sim.ballVy = (sim.ballVy - 2 * dot * ny) * 0.68;
            sim.touchedRimThisShot = true;
            toiletBasketballAudio.playRimBounce();
          }
        }
      }

      // Check downward score crossing through the toilet seat hoop!
      if (
        !sim.shotResolved &&
        sim.ballVy > 0 &&
        prevY <= sim.hoopY + 4 &&
        sim.ballY >= sim.hoopY + 4 &&
        Math.abs(sim.ballX - sim.hoopX) <= sim.hoopRimHalfW - sim.ballRadius * 0.35
      ) {
        sim.shotResolved = true;
        const isCleanSwish = !sim.touchedRimThisShot;
        sim.streak += 1;
        if (sim.streak > sim.bestStreak) sim.bestStreak = sim.streak;
        sim.shotsMade += 1;

        const basePts = isCleanSwish ? 2 : 1;
        const streakBonus = sim.streak >= 3 ? 1 : 0;
        const gained = basePts + streakBonus;
        sim.score += gained;
        sim.toiletHappyTimer = 0.75;

        setScore(sim.score);
        setStreak(sim.streak);
        setShotsMade(sim.shotsMade);

        if (sim.score > highScoreRef.current) {
          highScoreRef.current = sim.score;
          setHighScore(sim.score);
          saveToiletBasketballHighScore(sim.score);
          setIsNewBest(true);
        }

        toiletBasketballAudio.playSwishSplash(isCleanSwish);
        triggerHaptic(isCleanSwish ? [10, 20, 14] : 10);

        const colors = ['#38BDF8', '#7DD3FC', '#CEF04E', '#FACC15', '#FFFFFF'];
        for (let i = 0; i < 18; i++) {
          const ang = -Math.PI * 0.12 - Math.random() * Math.PI * 0.76;
          const spd = 95 + Math.random() * 190;
          sim.particles.push({
            x: sim.hoopX + (Math.random() - 0.5) * 24,
            y: sim.hoopY + 10,
            vx: Math.cos(ang) * spd,
            vy: Math.sin(ang) * spd,
            life: 0.45 + Math.random() * 0.3,
            maxLife: 0.75,
            color: colors[i % colors.length],
            size: 3 + Math.random() * 3.5,
          });
        }

        sim.callouts.push({
          text: isCleanSwish ? `+${gained} SWISH!` : `+${gained} SPLASH!`,
          x: sim.hoopX,
          y: sim.hoopY - 22,
          vy: -56,
          life: 0.85,
          maxLife: 0.85,
          color: isCleanSwish ? '#CEF04E' : '#7DD3FC',
        });

        resetBallForNextShot(true);
        return;
      }

      // Check floor or out-of-bounds miss
      if (
        sim.ballY + sim.ballRadius >= sim.floorY ||
        sim.ballX < -sim.ballRadius * 2 ||
        sim.ballX > sim.width + sim.ballRadius * 2
      ) {
        triggerMissedShot(sim);
      }
    };

    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const sim = simRef.current;
      const w = sim.width;
      const h = sim.height;

      // Bathroom basketball court backdrop
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#123627');
      grad.addColorStop(0.75, '#0D271C');
      grad.addColorStop(1, '#091B14');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Tile lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.lineWidth = 1;
      for (let gx = 48; gx < w; gx += 48) {
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, sim.floorY);
        ctx.stroke();
      }
      for (let gy = 48; gy < sim.floorY; gy += 48) {
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(w, gy);
        ctx.stroke();
      }

      // Floor court strip
      ctx.fillStyle = '#184632';
      ctx.fillRect(0, sim.floorY, w, h - sim.floorY);
      ctx.strokeStyle = '#2F7D5C';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, sim.floorY);
      ctx.lineTo(w, sim.floorY);
      ctx.stroke();

      // Launch zone shadow & subtle pedestal mark
      ctx.fillStyle = 'rgba(206, 240, 78, 0.14)';
      ctx.beginPath();
      ctx.ellipse(sim.anchorX, sim.floorY + 2, 34, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      // Draw trajectory preview while aiming
      if (sim.phase === 'AIMING') {
        const dx = sim.dragCurrentX - sim.anchorX;
        const dy = sim.dragCurrentY - sim.anchorY;
        const launch = computeLaunchVelocity({
          dragDx: dx,
          dragDy: dy,
          stageWidth: w,
          stageHeight: h,
        });

        // Pullback elastic line
        ctx.save();
        ctx.strokeStyle = 'rgba(206, 240, 78, 0.55)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(sim.anchorX, sim.anchorY);
        ctx.lineTo(sim.ballX, sim.ballY);
        ctx.stroke();

        if (launch.powerRatio > 0) {
          const pts = computeTrajectoryPoints({
            startX: sim.ballX,
            startY: sim.ballY,
            vx: launch.vx,
            vy: launch.vy,
            gravity: sim.gravity,
            windAx: sim.windAx,
            steps: 15,
            dtStep: 0.04,
          });
          pts.forEach((pt, idx) => {
            const alpha = Math.max(0.15, 0.85 - idx * 0.048);
            ctx.fillStyle = `rgba(206, 240, 78, ${alpha})`;
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, Math.max(2, 4.4 - idx * 0.16), 0, Math.PI * 2);
            ctx.fill();
          });
        }
        ctx.restore();
      } else if (sim.phase === 'READY') {
        // Gentle pulsing ring around launch ball
        const pulse = prefersReducedMotion ? 0 : Math.sin(sim.animClock * 4.5) * 3;
        ctx.save();
        ctx.strokeStyle = 'rgba(206, 240, 78, 0.35)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.arc(sim.anchorX, sim.anchorY, sim.ballRadius * 1.45 + pulse, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // Draw Toilet Basketball Hoop
      drawToiletHoop(ctx, sim);

      // Draw Poop Basketball
      drawPoopBasketball(
        ctx,
        sim.ballX,
        sim.ballY,
        sim.ballRadius,
        sim.ballAngle,
        sim.phase === 'FLYING'
      );

      // Draw particles
      for (const p of sim.particles) {
        ctx.globalAlpha = Math.max(0, Math.min(1, p.life / p.maxLife));
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Draw floating callouts
      for (const c of sim.callouts) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, c.life / c.maxLife));
        ctx.font = '800 17px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#0A1F16';
        ctx.strokeText(c.text, c.x, c.y);
        ctx.fillStyle = c.color;
        ctx.fillText(c.text, c.x, c.y);
        ctx.restore();
      }
    };

    const tick = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.045);
      lastTime = now;
      step(dt);
      render();
      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);
    return () => {
      window.cancelAnimationFrame(rafId);
      toiletBasketballAudio.dispose();
    };
  }, [prefersReducedMotion, resetBallForNextShot, updatePhase]);

  const toCanvasCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const sim = simRef.current;
    if (sim.phase !== 'READY') return;
    const pos = toCanvasCoords(e);

    // Generous left-half grab area for comfortable thumb aiming on phones
    const nearBall = Math.hypot(pos.x - sim.anchorX, pos.y - sim.anchorY) <= 110;
    const inLaunchSide = pos.x <= sim.width * 0.52;
    if (!nearBall && !inLaunchSide) return;

    activePointerIdRef.current = e.pointerId;
    e.currentTarget.setPointerCapture(e.pointerId);
    sim.dragCurrentX = pos.x;
    sim.dragCurrentY = pos.y;
    updatePhase('AIMING');
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const sim = simRef.current;
    if (sim.phase !== 'AIMING' || activePointerIdRef.current !== e.pointerId) return;
    const pos = toCanvasCoords(e);
    const dx = pos.x - sim.anchorX;
    const dy = pos.y - sim.anchorY;
    const maxPull = Math.min(sim.width, sim.height) * 0.28;
    const dist = Math.hypot(dx, dy);
    if (dist > maxPull && dist > 0) {
      sim.dragCurrentX = sim.anchorX + (dx / dist) * maxPull;
      sim.dragCurrentY = sim.anchorY + (dy / dist) * maxPull;
    } else {
      sim.dragCurrentX = pos.x;
      sim.dragCurrentY = pos.y;
    }
    sim.ballX = sim.anchorX + (sim.dragCurrentX - sim.anchorX) * 0.42;
    sim.ballY = sim.anchorY + (sim.dragCurrentY - sim.anchorY) * 0.42;
  };

  const handlePointerUpOrCancel = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const sim = simRef.current;
    if (sim.phase !== 'AIMING' || activePointerIdRef.current !== e.pointerId) return;
    activePointerIdRef.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }

    const dx = sim.dragCurrentX - sim.anchorX;
    const dy = sim.dragCurrentY - sim.anchorY;
    const launch = computeLaunchVelocity({
      dragDx: dx,
      dragDy: dy,
      stageWidth: sim.width,
      stageHeight: sim.height,
    });

    if (launch.powerRatio <= 0) {
      sim.ballX = sim.anchorX;
      sim.ballY = sim.anchorY;
      updatePhase('READY');
      return;
    }

    sim.ballVx = launch.vx;
    sim.ballVy = launch.vy;
    sim.ballSpin = (launch.vx >= 0 ? 1 : -1) * (3 + launch.powerRatio * 5);
    sim.touchedRimThisShot = false;
    sim.shotResolved = false;
    toiletBasketballAudio.playLaunchWhoosh();
    triggerHaptic(8);
    updatePhase('FLYING');
  };

  const shotsLeft = Math.max(0, MAX_MISSES - misses);

  return (
    <ArcadeGameShell
      title="TOILET BASKETBALL"
      ariaLabel="Toilet Basketball Arcade Game"
      accentIcon={
        <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
          <circle cx="12" cy="12" r="9" />
        </svg>
      }
      muted={muted}
      isPaused={phase === 'PAUSED'}
      canPause={phase !== 'GAME_OVER'}
      onToggleMute={handleToggleMute}
      onTogglePause={togglePause}
      onRestart={restartGame}
      onBackToGames={onBackToGames}
      stageRef={stageContainerRef}
      hudLeft={
        <>
          <div>
            <span className="text-[#9AB7A9] font-medium mr-1">SCORE</span>
            <span className="font-mono font-bold text-[#CEF04E]">{score}</span>
          </div>
          <div>
            <span className="text-[#9AB7A9] font-medium mr-1">BEST</span>
            <span className="font-mono font-bold text-[#F7F4EC]">{highScore}</span>
          </div>
          {streak >= 2 && (
            <div className="text-xs font-mono font-bold text-[#FACC15]">
              {streak}x STREAK
            </div>
          )}
        </>
      }
      hudRight={
        <>
          {windSpeedLabel !== 0 && (
            <span className="text-xs font-mono font-semibold text-[#7DD3FC]">
              WIND {windSpeedLabel > 0 ? '→' : '←'} {Math.abs(windSpeedLabel)}
            </span>
          )}
          <div className="flex items-center gap-1" aria-label={`Shots remaining: ${shotsLeft}`}>
            <span className="text-[#9AB7A9] font-medium text-xs mr-1 hidden sm:inline">
              CHANCES
            </span>
            {Array.from({ length: MAX_MISSES }, (_, idx) => {
              const active = idx < shotsLeft;
              return (
                <span
                  key={idx}
                  aria-hidden="true"
                  className={`inline-block h-3.5 w-3.5 rounded-full border ${
                    active
                      ? 'bg-[#CEF04E] border-[#CEF04E]'
                      : 'bg-transparent border-white/25'
                  }`}
                />
              );
            })}
          </div>
        </>
      }
      mobileControls={
        <p className="text-center text-xs font-medium text-[#CDE0D6] px-2">
          Drag back from the ball &amp; release to shoot!
        </p>
      }
      desktopLegend={
        <>
          <span>Aim &amp; Shoot: Drag back from ball &amp; release</span>
          <span aria-hidden="true">·</span>
          <span>Clean swishes score +2 pts</span>
          <span aria-hidden="true">·</span>
          <span>Pause: P</span>
        </>
      }
    >
      <div className="relative rounded-2xl border-2 border-[#2D7A58] bg-[#0F2B1F] p-1 shadow-[0_18px_40px_rgba(0,0,0,0.45)]">
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUpOrCancel}
          onPointerCancel={handlePointerUpOrCancel}
          className="block rounded-xl touch-none cursor-grab active:cursor-grabbing"
        />

        {/* Paused Overlay */}
        {phase === 'PAUSED' && (
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
                  onClick={restartGame}
                  className="w-full min-h-[44px] px-5 py-2.5 rounded-xl border border-white/20 bg-[#143B2B] hover:bg-[#1C4D39] text-sm font-semibold text-[#F7F4EC] cursor-pointer"
                >
                  Restart
                </button>
                <button
                  type="button"
                  onClick={onBackToGames}
                  className="w-full min-h-[44px] px-5 py-2.5 rounded-xl border border-white/15 bg-transparent hover:bg-white/10 text-sm font-semibold text-[#CDE0D6] cursor-pointer"
                >
                  Back to Games
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
                  {isNewBest ? 'NEW PERSONAL BEST!' : '3 MISSES · ROUND COMPLETE'}
                </p>
                <h3 className="mt-1 font-display text-2xl font-bold text-[#F7F4EC]">
                  Nice Shooting{playerNickname ? `, ${playerNickname}` : ''}!
                </h3>
                <p className="mt-1 text-sm text-[#CDE0D6] tabular-nums">
                  Score: <strong className="text-[#CEF04E]">{score}</strong>
                  <span aria-hidden="true"> · </span>
                  Made: <strong className="text-[#F7F4EC]">{shotsMade}</strong>
                  <span aria-hidden="true"> · </span>
                  Best: <strong className="text-[#F7F4EC]">{highScore}</strong>
                </p>
                {submissionNotice && (
                  <p className="mt-1.5 text-xs text-[#9AB7A9]">{submissionNotice}</p>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={restartGame}
                  className="w-full min-h-[48px] px-6 py-3 rounded-xl bg-[#CEF04E] hover:bg-[#D9F66A] text-[#143B2B] font-display text-base font-bold shadow-[0_4px_0_#0A1F16] cursor-pointer"
                >
                  Play Again
                </button>
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic(6);
                    onBackToGames();
                  }}
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

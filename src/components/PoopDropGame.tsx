import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  ArrowLeft,
  Pause,
  Play,
  RotateCcw,
  Trophy,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { poopDropAudio } from '../game/poopDropAudio.ts';
import { triggerHaptic } from '../utils/haptics.ts';

export type PoopDropPhase =
  | 'SWINGING'
  | 'FALLING'
  | 'SCORED_CELEBRATION'
  | 'MISSED_REACTION'
  | 'PAUSED'
  | 'GAME_OVER';

interface PoopDropGameProps {
  onBackToGames: () => void;
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
  gravity: number;
}

interface FloatingCallout {
  text: string;
  x: number;
  y: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
}

interface SimulationState {
  phase: PoopDropPhase;
  phaseBeforePause: PoopDropPhase;
  score: number;
  width: number;
  height: number;
  poopX: number;
  poopY: number;
  poopVx: number;
  poopVy: number;
  poopDir: 1 | -1;
  poopRadius: number;
  toiletX: number;
  toiletY: number;
  toiletWidth: number;
  toiletRimY: number;
  bowlHalfWidth: number;
  floorY: number;
  animClock: number;
  effectTimer: number;
  toiletSquash: number;
  missFlashTimer: number;
  particles: DropParticle[];
  callouts: FloatingCallout[];
}

export const POOP_DROP_HIGH_SCORE_KEY = 'zblal_poop_drop_high_score';

export function loadPoopDropHighScore(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = window.localStorage.getItem(POOP_DROP_HIGH_SCORE_KEY);
    const parsed = raw ? Number.parseInt(raw, 10) : 0;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  } catch {
    return 0;
  }
}

export function savePoopDropHighScore(score: number) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(POOP_DROP_HIGH_SCORE_KEY, String(score));
  } catch {
    // Ignore localStorage errors
  }
}

export function getPoopDropSpeedMultiplier(score: number): number {
  return Math.min(2.8, Number((1 + score * 0.14).toFixed(2)));
}

export function getPoopDropLevel(score: number): number {
  return score + 1;
}

export function isAlignedWithToilet(
  poopX: number,
  toiletX: number,
  bowlHalfWidth: number
): boolean {
  return Math.abs(poopX - toiletX) <= bowlHalfWidth;
}

function computeStageGeometry(width: number, height: number) {
  const safeW = Math.max(260, width);
  const safeH = Math.max(240, height);
  const poopRadius = Math.max(18, Math.min(32, Math.min(safeW, safeH) * 0.068));
  const toiletWidth = Math.max(78, Math.min(132, safeW * 0.27, safeH * 0.26));
  const floorY = safeH - Math.max(18, safeH * 0.06);
  const toiletY = floorY - toiletWidth * 0.56;
  const toiletRimY = toiletY - toiletWidth * 0.12;
  const bowlHalfWidth = toiletWidth * 0.36;
  const topY = Math.max(54, safeH * 0.18);
  const minX = poopRadius + 16;
  const maxX = Math.max(minX + 40, safeW - poopRadius - 16);

  return {
    poopRadius,
    toiletWidth,
    toiletX: safeW / 2,
    toiletY,
    toiletRimY,
    bowlHalfWidth,
    floorY,
    topY,
    minX,
    maxX,
  };
}

function createInitialSimulation(width: number, height: number): SimulationState {
  const geo = computeStageGeometry(width, height);
  return {
    phase: 'SWINGING',
    phaseBeforePause: 'SWINGING',
    score: 0,
    width,
    height,
    poopX: geo.minX + 8,
    poopY: geo.topY,
    poopVx: 0,
    poopVy: 0,
    poopDir: 1,
    poopRadius: geo.poopRadius,
    toiletX: geo.toiletX,
    toiletY: geo.toiletY,
    toiletWidth: geo.toiletWidth,
    toiletRimY: geo.toiletRimY,
    bowlHalfWidth: geo.bowlHalfWidth,
    floorY: geo.floorY,
    animClock: 0,
    effectTimer: 0,
    toiletSquash: 0,
    missFlashTimer: 0,
    particles: [],
    callouts: [],
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
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function drawCartoonToilet(
  ctx: CanvasRenderingContext2D,
  sim: SimulationState,
  prefersReducedMotion: boolean
) {
  const cx = sim.toiletX;
  const cy = sim.toiletY;
  const w = sim.toiletWidth;
  const bounce =
    !prefersReducedMotion && sim.toiletSquash > 0
      ? Math.sin(sim.toiletSquash * Math.PI * 3) * 0.12 * sim.toiletSquash
      : 0;
  const scaleX = 1 + bounce;
  const scaleY = 1 - bounce * 0.85;

  ctx.save();
  ctx.translate(cx, sim.floorY);
  ctx.scale(scaleX, scaleY);
  ctx.translate(-cx, -sim.floorY);

  // Subtle floor mat under toilet
  ctx.fillStyle = '#1B4B37';
  ctx.beginPath();
  ctx.ellipse(cx, sim.floorY + 2, w * 0.68, w * 0.11, 0, 0, Math.PI * 2);
  ctx.fill();

  // Toilet Tank (raised back silhouette)
  const tankW = w * 0.64;
  const tankH = w * 0.42;
  const tankX = cx - tankW / 2;
  const tankY = cy - w * 0.52;

  ctx.fillStyle = '#E5DFD2';
  ctx.strokeStyle = '#102C20';
  ctx.lineWidth = 2.5;
  drawRoundedRect(ctx, tankX, tankY, tankW, tankH, 10);
  ctx.fill();
  ctx.stroke();

  // Tank Lid
  ctx.fillStyle = '#F7F4EC';
  drawRoundedRect(ctx, tankX - 4, tankY - 8, tankW + 8, 12, 6);
  ctx.fill();
  ctx.stroke();

  // Silver Flush Button on tank
  ctx.fillStyle = '#CEF04E';
  ctx.beginPath();
  ctx.arc(cx, tankY - 2, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#143B2B';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Pedestal base
  ctx.fillStyle = '#DFD9CB';
  ctx.strokeStyle = '#102C20';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.25, cy + w * 0.04);
  ctx.lineTo(cx - w * 0.31, sim.floorY - 3);
  ctx.quadraticCurveTo(cx, sim.floorY + 5, cx + w * 0.31, sim.floorY - 3);
  ctx.lineTo(cx + w * 0.25, cy + w * 0.04);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Outer Bowl Body
  ctx.fillStyle = '#F7F4EC';
  ctx.beginPath();
  ctx.ellipse(cx, cy + w * 0.05, w * 0.48, w * 0.28, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Seat Rim (outer open oval)
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.ellipse(cx, sim.toiletRimY, w * 0.46, w * 0.16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Inner Bowl Shadow
  ctx.fillStyle = '#D5DFD9';
  ctx.beginPath();
  ctx.ellipse(cx, sim.toiletRimY + 2, sim.bowlHalfWidth, w * 0.115, 0, 0, Math.PI * 2);
  ctx.fill();

  // Bright Cartoon Toilet Water Pool
  const waterWave =
    !prefersReducedMotion && sim.toiletSquash > 0
      ? Math.sin(sim.animClock * 22) * 3
      : Math.sin(sim.animClock * 3) * 1;
  ctx.fillStyle = '#38BDF8';
  ctx.beginPath();
  ctx.ellipse(
    cx,
    sim.toiletRimY + 4 + waterWave * 0.25,
    sim.bowlHalfWidth * 0.86,
    w * 0.085,
    0,
    0,
    Math.PI * 2
  );
  ctx.fill();

  // Glossy water highlight arc
  ctx.strokeStyle = 'rgba(255,255,255,0.75)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx - w * 0.07, sim.toiletRimY + 3, w * 0.15, Math.PI * 1.1, Math.PI * 1.65);
  ctx.stroke();

  // Cute reactive face on the front of the toilet pedestal
  const faceY = cy + w * 0.25;
  ctx.fillStyle = '#143B2B';
  if (sim.phase === 'SCORED_CELEBRATION') {
    // Happy curved eyes
    ctx.strokeStyle = '#143B2B';
    ctx.lineWidth = 2.2;
    for (const sign of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(cx + sign * 9, faceY, 3.5, Math.PI, Math.PI * 2);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(cx, faceY + 4, 6, 0.1, Math.PI - 0.1);
    ctx.stroke();
  } else if (sim.phase === 'MISSED_REACTION' || sim.phase === 'GAME_OVER') {
    // Surprised O mouth
    ctx.beginPath();
    ctx.arc(cx - 8, faceY - 1, 2.3, 0, Math.PI * 2);
    ctx.arc(cx + 8, faceY - 1, 2.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx, faceY + 6, 3.5, 4.5, 0, 0, Math.PI * 2);
    ctx.strokeStyle = '#143B2B';
    ctx.lineWidth = 2;
    ctx.stroke();
  } else {
    // Cheerful expectant eyes + smile
    ctx.beginPath();
    ctx.arc(cx - 8, faceY, 2.2, 0, Math.PI * 2);
    ctx.arc(cx + 8, faceY, 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#143B2B';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(cx, faceY + 3, 4.5, 0.2, Math.PI - 0.2);
    ctx.stroke();
  }

  ctx.restore();
}

function drawCutePoop(
  ctx: CanvasRenderingContext2D,
  sim: SimulationState,
  prefersReducedMotion: boolean
) {
  const bob =
    sim.phase === 'SWINGING' && !prefersReducedMotion
      ? Math.sin(sim.animClock * 7.5) * 4
      : 0;
  const x = sim.poopX;
  const y = sim.poopY + bob;
  const r = sim.poopRadius;

  ctx.save();
  ctx.translate(x, y);

  if (sim.phase === 'SWINGING' && !prefersReducedMotion) {
    ctx.rotate(sim.poopDir * 0.08 + Math.sin(sim.animClock * 7.5) * 0.04);
  } else if (sim.phase === 'FALLING') {
    ctx.scale(0.92, 1.1);
  } else if (sim.phase === 'MISSED_REACTION' || sim.phase === 'GAME_OVER') {
    // Cartoonish splat squash on floor
    ctx.translate(0, r * 0.35);
    ctx.scale(1.42, 0.56);
  }

  // Subtle target ring while swinging so players notice it's tappable
  if (sim.phase === 'SWINGING') {
    const pulse = prefersReducedMotion ? 0 : Math.sin(sim.animClock * 5) * 2.5;
    ctx.save();
    ctx.strokeStyle = 'rgba(206, 240, 78, 0.38)';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.32 + pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // Bottom swirl tier
  ctx.fillStyle = '#7A4824';
  ctx.strokeStyle = '#2B1609';
  ctx.lineWidth = 2.4;

  ctx.beginPath();
  ctx.ellipse(0, r * 0.42, r * 0.96, r * 0.46, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Middle swirl tier
  ctx.fillStyle = '#8C542B';
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.72, r * 0.38, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Top swirl tip
  ctx.fillStyle = '#9D6134';
  ctx.beginPath();
  ctx.moveTo(-r * 0.45, -r * 0.14);
  ctx.quadraticCurveTo(-r * 0.25, -r * 0.75, 0.18 * r, -r * 0.98);
  ctx.quadraticCurveTo(r * 0.12, -r * 0.65, r * 0.45, -r * 0.14);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Glossy cartoon highlight
  ctx.fillStyle = 'rgba(255, 244, 224, 0.32)';
  ctx.beginPath();
  ctx.ellipse(-r * 0.32, r * 0.02, r * 0.13, r * 0.08, -0.4, 0, Math.PI * 2);
  ctx.fill();

  // Eyes & Expression
  const eyeY = r * 0.06;
  const eyeSep = r * 0.28;

  if (sim.phase === 'MISSED_REACTION' || sim.phase === 'GAME_OVER') {
    // Dizzy X_X eyes
    ctx.strokeStyle = '#2B1609';
    ctx.lineWidth = 2.4;
    for (const sign of [-1, 1]) {
      const ex = sign * eyeSep;
      ctx.beginPath();
      ctx.moveTo(ex - 4, eyeY - 4);
      ctx.lineTo(ex + 4, eyeY + 4);
      ctx.moveTo(ex + 4, eyeY - 4);
      ctx.lineTo(ex - 4, eyeY + 4);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(0, r * 0.36, r * 0.15, Math.PI, Math.PI * 2);
    ctx.stroke();
  } else {
    // White sclera
    ctx.fillStyle = '#FFFDF8';
    ctx.strokeStyle = '#2B1609';
    ctx.lineWidth = 1.6;
    for (const sign of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(sign * eyeSep, eyeY, r * 0.17, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // Pupils
    const pupilOffset =
      sim.phase === 'FALLING' ? { x: 0, y: 2 } : { x: sim.poopDir * 1.8, y: 0 };
    ctx.fillStyle = '#1B1109';
    for (const sign of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(
        sign * eyeSep + pupilOffset.x,
        eyeY + pupilOffset.y,
        r * 0.085,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }

    // Rosy cheeks
    ctx.fillStyle = 'rgba(244, 114, 182, 0.45)';
    for (const sign of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(sign * r * 0.46, r * 0.22, r * 0.09, 0, Math.PI * 2);
      ctx.fill();
    }

    // Mouth
    ctx.strokeStyle = '#2B1609';
    ctx.lineWidth = 2;
    if (sim.phase === 'FALLING') {
      ctx.fillStyle = '#2B1609';
      ctx.beginPath();
      ctx.ellipse(0, r * 0.32, r * 0.11, r * 0.14, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(0, r * 0.24, r * 0.18, 0.15, Math.PI - 0.15);
      ctx.stroke();
    }
  }

  ctx.restore();
}

export function PoopDropGame({ onBackToGames }: PoopDropGameProps) {
  const prefersReducedMotion = useReducedMotion() ?? false;
  const stageContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const simRef = useRef<SimulationState>(createInitialSimulation(380, 520));

  const [phase, setPhase] = useState<PoopDropPhase>('SWINGING');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState<number>(() => loadPoopDropHighScore());
  const [muted, setMuted] = useState(false);
  const [isNewBest, setIsNewBest] = useState(false);

  const highScoreRef = useRef(highScore);
  const phaseRef = useRef(phase);
  highScoreRef.current = highScore;
  phaseRef.current = phase;

  const updatePhase = useCallback((nextPhase: PoopDropPhase) => {
    simRef.current.phase = nextPhase;
    phaseRef.current = nextPhase;
    setPhase(nextPhase);
  }, []);

  const syncScore = useCallback((nextScore: number) => {
    simRef.current.score = nextScore;
    setScore(nextScore);
    if (nextScore > highScoreRef.current) {
      highScoreRef.current = nextScore;
      setHighScore(nextScore);
      savePoopDropHighScore(nextScore);
      setIsNewBest(true);
    }
  }, []);

  const spawnSplashParticles = useCallback((x: number, y: number) => {
    const colors = ['#38BDF8', '#7DD3FC', '#CEF04E', '#FACC15', '#FFFFFF'];
    const sim = simRef.current;
    for (let i = 0; i < 20; i++) {
      const angle = -Math.PI * 0.15 - Math.random() * Math.PI * 0.7;
      const speed = 110 + Math.random() * 210;
      sim.particles.push({
        x: x + (Math.random() - 0.5) * 26,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.45 + Math.random() * 0.35,
        maxLife: 0.8,
        color: colors[i % colors.length],
        size: 3 + Math.random() * 4.5,
        gravity: 480,
      });
    }
    sim.callouts.push({
      text: '+1 SPLASH!',
      x,
      y: y - 16,
      vy: -68,
      life: 0.75,
      maxLife: 0.75,
      color: '#CEF04E',
    });
  }, []);

  const spawnMissParticles = useCallback((x: number, y: number) => {
    const colors = ['#A16207', '#78350F', '#FCA5A5', '#FDE047'];
    const sim = simRef.current;
    for (let i = 0; i < 14; i++) {
      const angle = -Math.random() * Math.PI;
      const speed = 70 + Math.random() * 140;
      sim.particles.push({
        x: x + (Math.random() - 0.5) * 24,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.45 + Math.random() * 0.3,
        maxLife: 0.75,
        color: colors[i % colors.length],
        size: 3 + Math.random() * 3.5,
        gravity: 420,
      });
    }
    sim.callouts.push({
      text: 'PLOP! MISSED!',
      x,
      y: y - 22,
      vy: -48,
      life: 0.8,
      maxLife: 0.8,
      color: '#FCA5A5',
    });
  }, []);

  const spawnNextPoop = useCallback(() => {
    const sim = simRef.current;
    const geo = computeStageGeometry(sim.width, sim.height);
    const nextDir: 1 | -1 = sim.score % 2 === 0 ? 1 : -1;
    sim.poopDir = nextDir;
    sim.poopX = nextDir === 1 ? geo.minX + 6 : geo.maxX - 6;
    sim.poopY = geo.topY;
    sim.poopVx = 0;
    sim.poopVy = 0;
    updatePhase('SWINGING');
  }, [updatePhase]);

  const restartGame = useCallback(() => {
    triggerHaptic(8);
    const current = simRef.current;
    const fresh = createInitialSimulation(current.width, current.height);
    simRef.current = fresh;
    setScore(0);
    setIsNewBest(false);
    phaseRef.current = 'SWINGING';
    setPhase('SWINGING');
  }, []);

  const togglePause = useCallback(() => {
    const sim = simRef.current;
    if (sim.phase === 'PAUSED') {
      triggerHaptic(6);
      updatePhase(sim.phaseBeforePause);
      return;
    }
    if (sim.phase === 'SWINGING' || sim.phase === 'FALLING') {
      triggerHaptic(6);
      sim.phaseBeforePause = sim.phase;
      updatePhase('PAUSED');
    }
  }, [updatePhase]);

  const attemptDrop = useCallback(() => {
    const sim = simRef.current;
    // Prevent accidental multiple drops while already falling, celebrating, paused, or over
    if (sim.phase !== 'SWINGING') {
      return;
    }
    triggerHaptic(10);
    poopDropAudio.playDropWhoosh();
    sim.poopVx = 0;
    sim.poopVy = Math.max(460, sim.height * 1.05);
    updatePhase('FALLING');
  }, [updatePhase]);

  const handleToggleMute = useCallback(() => {
    const next = !muted;
    setMuted(next);
    poopDropAudio.setMuted(next);
  }, [muted]);

  // Responsive Canvas Sizing
  useEffect(() => {
    const container = stageContainerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      if (rect.width < 100 || rect.height < 120) return;

      const maxStageW = Math.min(rect.width - 16, 460);
      const maxStageH = Math.max(240, rect.height - 14);
      const cssW = Math.floor(Math.max(260, maxStageW));
      const cssH = Math.floor(Math.min(maxStageH, 680));
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
      const oldW = sim.width || cssW;
      const xRatio = sim.poopX / oldW;
      sim.width = cssW;
      sim.height = cssH;
      const geo = computeStageGeometry(cssW, cssH);
      sim.poopRadius = geo.poopRadius;
      sim.toiletX = geo.toiletX;
      sim.toiletY = geo.toiletY;
      sim.toiletWidth = geo.toiletWidth;
      sim.toiletRimY = geo.toiletRimY;
      sim.bowlHalfWidth = geo.bowlHalfWidth;
      sim.floorY = geo.floorY;
      sim.poopX = Math.max(geo.minX, Math.min(geo.maxX, xRatio * cssW));
      if (sim.phase === 'SWINGING') {
        sim.poopY = geo.topY;
      }
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Keyboard shortcuts (Space to drop, P/Escape to pause)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        if (e.repeat) return;
        if (phaseRef.current === 'SWINGING') {
          attemptDrop();
        }
        return;
      }
      if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
        if (
          phaseRef.current === 'SWINGING' ||
          phaseRef.current === 'FALLING' ||
          phaseRef.current === 'PAUSED'
        ) {
          e.preventDefault();
          togglePause();
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [attemptDrop, togglePause]);

  // Main 60fps requestAnimationFrame Loop + Clean Unmount Cleanup
  useEffect(() => {
    let rafId = 0;
    let lastTime = performance.now();

    const stepSimulation = (dt: number) => {
      const sim = simRef.current;
      sim.animClock += dt;

      if (sim.toiletSquash > 0) {
        sim.toiletSquash = Math.max(0, sim.toiletSquash - dt * 2.2);
      }
      if (sim.missFlashTimer > 0) {
        sim.missFlashTimer = Math.max(0, sim.missFlashTimer - dt);
      }

      // Update particles & floating callouts even during celebrations
      for (let i = sim.particles.length - 1; i >= 0; i--) {
        const p = sim.particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += p.gravity * dt;
        p.life -= dt;
        if (p.life <= 0) {
          sim.particles.splice(i, 1);
        }
      }

      for (let i = sim.callouts.length - 1; i >= 0; i--) {
        const c = sim.callouts[i];
        c.y += c.vy * dt;
        c.life -= dt;
        if (c.life <= 0) {
          sim.callouts.splice(i, 1);
        }
      }

      if (sim.phase === 'PAUSED' || sim.phase === 'GAME_OVER') {
        return;
      }

      const geo = computeStageGeometry(sim.width, sim.height);

      if (sim.phase === 'SWINGING') {
        const speedMultiplier = getPoopDropSpeedMultiplier(sim.score);
        const baseSpeed = Math.max(150, sim.width * 0.44);
        const currentSpeed = baseSpeed * speedMultiplier;
        sim.poopX += sim.poopDir * currentSpeed * dt;

        if (sim.poopX >= geo.maxX) {
          sim.poopX = geo.maxX;
          sim.poopDir = -1;
        } else if (sim.poopX <= geo.minX) {
          sim.poopX = geo.minX;
          sim.poopDir = 1;
        }
        return;
      }

      if (sim.phase === 'FALLING') {
        const gravity = Math.max(1600, sim.height * 3.4);
        sim.poopVy += gravity * dt;
        sim.poopY += sim.poopVy * dt;

        const aligned = isAlignedWithToilet(
          sim.poopX,
          sim.toiletX,
          sim.bowlHalfWidth
        );

        // Check rim collision if aligned
        if (aligned && sim.poopY + sim.poopRadius * 0.45 >= sim.toiletRimY) {
          const nextScore = sim.score + 1;
          syncScore(nextScore);
          sim.toiletSquash = 1;
          sim.effectTimer = 0.44;
          spawnSplashParticles(sim.toiletX, sim.toiletRimY);
          poopDropAudio.playSplashScore(nextScore % 5 === 0);
          triggerHaptic(12);
          updatePhase('SCORED_CELEBRATION');
          return;
        }

        // Missed the bowl -> hit the floor
        if (!aligned && sim.poopY + sim.poopRadius * 0.55 >= sim.floorY) {
          sim.poopY = sim.floorY - sim.poopRadius * 0.55;
          sim.poopVy = 0;
          sim.missFlashTimer = 0.45;
          sim.effectTimer = 0.65;
          spawnMissParticles(sim.poopX, sim.floorY - 6);
          poopDropAudio.playSplatMiss();
          triggerHaptic([20, 40, 20]);
          updatePhase('MISSED_REACTION');
        }
        return;
      }

      if (sim.phase === 'SCORED_CELEBRATION') {
        sim.effectTimer -= dt;
        if (sim.effectTimer <= 0) {
          spawnNextPoop();
        }
        return;
      }

      if (sim.phase === 'MISSED_REACTION') {
        sim.effectTimer -= dt;
        if (sim.effectTimer <= 0) {
          updatePhase('GAME_OVER');
        }
      }
    };

    const renderScene = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const sim = simRef.current;
      const w = sim.width;
      const h = sim.height;

      // Playful Zblal bathroom tile background
      const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
      bgGrad.addColorStop(0, '#123325');
      bgGrad.addColorStop(0.76, '#0E281D');
      bgGrad.addColorStop(1, '#0B2017');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      // Subtle bathroom wall tile grid lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.lineWidth = 1;
      const tileSize = 44;
      for (let gx = tileSize; gx < w; gx += tileSize) {
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, sim.floorY);
        ctx.stroke();
      }
      for (let gy = tileSize; gy < sim.floorY; gy += tileSize) {
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(w, gy);
        ctx.stroke();
      }

      // Dotted horizontal swing rail near top
      const geo = computeStageGeometry(w, h);
      ctx.save();
      ctx.strokeStyle = 'rgba(206, 240, 78, 0.16)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 8]);
      ctx.beginPath();
      ctx.moveTo(geo.minX, geo.topY);
      ctx.lineTo(geo.maxX, geo.topY);
      ctx.stroke();
      ctx.restore();

      // Floor strip
      ctx.fillStyle = '#184431';
      ctx.fillRect(0, sim.floorY, w, h - sim.floorY);
      ctx.strokeStyle = '#2B6C50';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, sim.floorY);
      ctx.lineTo(w, sim.floorY);
      ctx.stroke();

      // Subtle vertical drop guide directly over bowl
      ctx.save();
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.12)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 8]);
      ctx.beginPath();
      ctx.moveTo(sim.toiletX - sim.bowlHalfWidth, geo.topY + 26);
      ctx.lineTo(sim.toiletX - sim.bowlHalfWidth, sim.toiletRimY - 8);
      ctx.moveTo(sim.toiletX + sim.bowlHalfWidth, geo.topY + 26);
      ctx.lineTo(sim.toiletX + sim.bowlHalfWidth, sim.toiletRimY - 8);
      ctx.stroke();
      ctx.restore();

      // Draw toilet
      drawCartoonToilet(ctx, sim, prefersReducedMotion);

      // Draw poop character (hidden once inside toilet celebration)
      if (sim.phase !== 'SCORED_CELEBRATION') {
        drawCutePoop(ctx, sim, prefersReducedMotion);
      }

      // Draw particles
      for (const p of sim.particles) {
        const alpha = Math.max(0, Math.min(1, p.life / p.maxLife));
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Draw floating score / splat callouts
      for (const c of sim.callouts) {
        const alpha = Math.max(0, Math.min(1, c.life / c.maxLife));
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.font = '800 18px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#0A1F16';
        ctx.strokeText(c.text, c.x, c.y);
        ctx.fillStyle = c.color;
        ctx.fillText(c.text, c.x, c.y);
        ctx.restore();
      }

      // Reddish flash vignette on miss
      if (sim.missFlashTimer > 0) {
        ctx.fillStyle = `rgba(239, 68, 68, ${sim.missFlashTimer * 0.28})`;
        ctx.fillRect(0, 0, w, h);
      }
    };

    const tick = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      stepSimulation(dt);
      renderScene();
      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);
    return () => {
      window.cancelAnimationFrame(rafId);
      poopDropAudio.dispose();
    };
  }, [
    prefersReducedMotion,
    spawnMissParticles,
    spawnNextPoop,
    spawnSplashParticles,
    syncScore,
    updatePhase,
  ]);

  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const sim = simRef.current;
    if (sim.phase !== 'SWINGING') return;

    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const bob = prefersReducedMotion ? 0 : Math.sin(sim.animClock * 7.5) * 4;
    const dist = Math.hypot(px - sim.poopX, py - (sim.poopY + bob));
    const hitRadius = Math.max(58, sim.poopRadius * 2.35);

    if (dist <= hitRadius) {
      attemptDrop();
    }
  };

  const speedMultiplier = getPoopDropSpeedMultiplier(score);
  const currentLevel = getPoopDropLevel(score);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: prefersReducedMotion ? 0.05 : 0.2 }}
      role="dialog"
      aria-modal="true"
      aria-label="POOP DROP Arcade Game"
      className="fixed inset-0 z-50 flex h-[100dvh] w-full flex-col bg-[#0E291E] text-[#F7F4EC] pt-safe pb-safe overflow-hidden overscroll-none select-none"
    >
      {/* Top Arcade Header */}
      <header className="shrink-0 w-full max-w-4xl mx-auto px-3 sm:px-6 pt-2 pb-1.5 flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span
              aria-hidden="true"
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#CEF04E] text-[#143B2B] shadow-[0_3px_0_#0A1F16]"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                <path d="M12.2 3c.6 1.5.1 2.8-.9 3.6 2.1.3 3.7 1.7 3.7 3.5 0 .6-.2 1.2-.5 1.7 1.8.6 3 2 3 3.7 0 2.2-2.4 3.5-5.5 3.5s-5.5-1.3-5.5-3.5c0-1.6 1.1-3 2.7-3.6-.3-.5-.4-1-.4-1.6 0-1.9 1.7-3.3 3.9-3.5-.8-.8-1-2.1-.5-3.8Z" />
              </svg>
            </span>
            <h2 className="font-display text-lg sm:text-xl font-bold tracking-tight text-[#F7F4EC] truncate">
              POOP DROP
            </h2>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleToggleMute}
              aria-label={muted ? 'Unmute sound' : 'Mute sound'}
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-white/15 bg-[#143B2B] hover:bg-[#1C4D39] text-[#F7F4EC] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CEF04E]"
            >
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={togglePause}
              disabled={phase !== 'SWINGING' && phase !== 'FALLING' && phase !== 'PAUSED'}
              aria-label={phase === 'PAUSED' ? 'Resume game' : 'Pause game'}
              className="inline-flex min-h-[44px] min-w-[44px] sm:px-3 items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-[#143B2B] hover:bg-[#1C4D39] disabled:opacity-40 text-xs font-semibold text-[#F7F4EC] transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CEF04E]"
            >
              {phase === 'PAUSED' ? (
                <Play className="w-4 h-4 text-[#CEF04E]" />
              ) : (
                <Pause className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">
                {phase === 'PAUSED' ? 'Resume' : 'Pause'}
              </span>
            </button>

            <button
              type="button"
              onClick={restartGame}
              aria-label="Restart game"
              className="inline-flex min-h-[44px] min-w-[44px] sm:px-3 items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-[#143B2B] hover:bg-[#1C4D39] text-xs font-semibold text-[#F7F4EC] transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CEF04E]"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="hidden sm:inline">Restart</span>
            </button>

            <button
              type="button"
              onClick={() => {
                triggerHaptic(8);
                onBackToGames();
              }}
              aria-label="Back to games selection"
              className="inline-flex min-h-[44px] px-3 items-center justify-center gap-1.5 rounded-xl bg-[#F7F4EC] hover:bg-white text-xs sm:text-sm font-bold text-[#143B2B] transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CEF04E]"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back to Games</span>
              <span className="sm:hidden">Games</span>
            </button>
          </div>
        </div>

        {/* Clean Unboxed HUD Strip */}
        <div className="flex items-center justify-between gap-3 px-3.5 py-2 rounded-xl bg-[#143B2B] border border-[#245C44] text-xs sm:text-sm tabular-nums">
          <div className="flex items-center gap-4 sm:gap-6">
            <div>
              <span className="text-[#9AB7A9] font-medium mr-1.5">SCORE</span>
              <span className="font-mono font-bold text-[#CEF04E] text-sm sm:text-base">
                {score}
              </span>
            </div>
            <div>
              <span className="text-[#9AB7A9] font-medium mr-1.5">BEST</span>
              <span className="font-mono font-bold text-[#F7F4EC] text-sm sm:text-base">
                {highScore}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono font-bold">
            <span className="text-[#9AB7A9]">LVL {currentLevel}</span>
            <span aria-hidden="true" className="text-[#4B7E67]">
              ·
            </span>
            <span className="text-[#FACC15]">{speedMultiplier.toFixed(1)}x SPEED</span>
          </div>
        </div>
      </header>

      {/* Instruction Banner */}
      <div className="shrink-0 w-full max-w-4xl mx-auto px-3 sm:px-6 pb-1 text-center">
        <p className="font-display text-xs sm:text-sm font-bold tracking-wide text-[#CEF04E]">
          TAP THE POOP TO DROP IT INTO THE TOILET!
        </p>
      </div>

      {/* Portrait Game Stage */}
      <div
        ref={stageContainerRef}
        className="relative flex-1 min-h-0 w-full max-w-4xl mx-auto px-2 sm:px-6 flex items-center justify-center"
      >
        <div className="relative rounded-2xl border-2 border-[#2D7A58] bg-[#0F2B1F] p-1 shadow-[0_18px_40px_rgba(0,0,0,0.45)]">
          <canvas
            ref={canvasRef}
            onPointerDown={handleCanvasPointerDown}
            className="block rounded-xl touch-none cursor-pointer"
          />

          {/* Overlay 1: Paused */}
          {phase === 'PAUSED' && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center rounded-2xl bg-[#0D251B]/90 backdrop-blur-[2px] p-5 text-center">
              <div className="max-w-xs w-full space-y-4">
                <h3 className="font-display text-2xl font-bold text-[#F7F4EC]">
                  Game Paused
                </h3>
                <div className="flex flex-col gap-2.5">
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
            </div>
          )}

          {/* Overlay 2: Funny Game Over */}
          {phase === 'GAME_OVER' && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center rounded-2xl bg-[#0D251B]/92 backdrop-blur-[2px] p-5 text-center">
              <motion.div
                initial={prefersReducedMotion ? false : { scale: 0.86, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.2 }}
                className="max-w-xs w-full space-y-4"
              >
                <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F7F4EC] text-[#143B2B] border-2 border-[#EF4444]">
                  {isNewBest ? (
                    <Trophy className="w-7 h-7 text-[#D97706]" />
                  ) : (
                    <span className="font-display text-xl font-bold">X_X</span>
                  )}
                </div>

                <div>
                  <p className="text-xs font-mono font-bold text-[#FCA5A5] tracking-wider">
                    {isNewBest ? 'NEW BEST SCORE!' : 'FLOOR SPLAT!'}
                  </p>
                  <h3 className="mt-1 font-display text-2xl sm:text-3xl font-bold text-[#F7F4EC]">
                    Missed the Bowl!
                  </h3>
                  <p className="mt-1.5 text-sm text-[#CDE0D6] tabular-nums">
                    Final Score: <strong className="text-[#CEF04E]">{score}</strong>
                    <span aria-hidden="true"> · </span>
                    Best: <strong className="text-[#F7F4EC]">{highScore}</strong>
                  </p>
                </div>

                <div className="flex flex-col gap-2.5">
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
            </div>
          )}
        </div>
      </div>

      {/* Subtle Bottom Hint Bar */}
      <footer className="shrink-0 w-full max-w-4xl mx-auto px-4 pt-1.5 pb-2.5 text-center text-[11px] sm:text-xs text-[#9AB7A9]">
        <span className="sm:hidden">Tap the moving poop when it lines up above the toilet bowl</span>
        <span className="hidden sm:inline">
          Click the moving poop or press Space to drop · P to pause
        </span>
      </footer>
    </motion.div>
  );
}

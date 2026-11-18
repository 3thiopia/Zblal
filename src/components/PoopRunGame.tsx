import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowDown, ArrowUp, Trophy } from 'lucide-react';
import { ArcadeGameShell, ArcadeOverlayCard } from './ArcadeGameShell.tsx';
import { arcadeAudio } from '../game/arcadeAudio.ts';
import { useLanguage } from '../i18n/LanguageContext.tsx';
import { triggerHaptic } from '../utils/haptics.ts';

type GamePhase = 'TITLE_MENU' | 'PLAYING' | 'PAUSED' | 'GAME_OVER';
type ObstacleKind = 'plunger' | 'brush' | 'overhead_pipe';

export interface PoopRunResult {
  score: number;
  distanceMeters: number;
  rollsCollected: number;
  sessionId: string;
  durationMs: number;
}

interface PoopRunGameProps {
  playerNickname?: string;
  serverBestScore?: number;
  onGameComplete?: (result: PoopRunResult) => void;
  onBackToGames: () => void;
  submissionNotice?: string | null;
}

interface RunnerObstacle {
  kind: ObstacleKind;
  x: number;
  w: number;
  h: number;
  bottomFromGround: number; // 0 for floor obstacles, >0 for overhead barriers
}

interface RunnerCollectible {
  x: number;
  yFromGround: number;
  golden: boolean;
  collected: boolean;
}

interface RunParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

interface RunCallout {
  text: string;
  x: number;
  y: number;
  life: number;
  maxLife: number;
  color: string;
}

interface RunSim {
  width: number;
  height: number;
  groundY: number;
  playerX: number;
  playerYFromGround: number;
  playerVy: number;
  slidingTimer: number;
  coyoteTimer: number;
  jumpBufferTimer: number;
  speedPx: number;
  distancePx: number;
  distanceMeters: number;
  rollsCollected: number;
  bonusScore: number;
  score: number;
  nextMilestoneM: number;
  spawnCooldown: number;
  scrollOffset: number;
  animClock: number;
  shieldTimer: number;
  obstacles: RunnerObstacle[];
  collectibles: RunnerCollectible[];
  particles: RunParticle[];
  callouts: RunCallout[];
  sessionId: string;
  startedAtMs: number;
  submitted: boolean;
}

const HIGH_SCORE_KEY = 'zblal_poop_run_high_score';

export function loadPoopRunHighScore(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = window.localStorage.getItem(HIGH_SCORE_KEY);
    const parsed = raw ? Number.parseInt(raw, 10) : 0;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  } catch {
    return 0;
  }
}

function savePoopRunHighScore(score: number) {
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
  return `pr-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function createInitialSim(width: number, height: number): RunSim {
  const safeW = Math.max(260, width);
  const safeH = Math.max(185, height);
  const groundY = Math.round(safeH * 0.8);
  return {
    width: safeW,
    height: safeH,
    groundY,
    playerX: Math.round(safeW * 0.19),
    playerYFromGround: 0,
    playerVy: 0,
    slidingTimer: 0,
    coyoteTimer: 0,
    jumpBufferTimer: 0,
    speedPx: 270,
    distancePx: 0,
    distanceMeters: 0,
    rollsCollected: 0,
    bonusScore: 0,
    score: 0,
    nextMilestoneM: 100,
    spawnCooldown: 1.0,
    scrollOffset: 0,
    animClock: 0,
    shieldTimer: 0,
    obstacles: [],
    collectibles: [],
    particles: [],
    callouts: [],
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

function drawScene(ctx: CanvasRenderingContext2D, sim: RunSim, duckLabel: string) {
  const { width: w, height: h, groundY } = sim;
  ctx.clearRect(0, 0, w, h);

  // Bathroom wall background
  const bg = ctx.createLinearGradient(0, 0, 0, groundY);
  bg.addColorStop(0, '#0C241A');
  bg.addColorStop(1, '#143B2B');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, groundY);

  // Parallax ceramic tile grid
  const tile = 44;
  const tileShift = -(sim.scrollOffset * 0.45) % tile;
  ctx.strokeStyle = 'rgba(206, 240, 78, 0.07)';
  ctx.lineWidth = 1;
  for (let x = tileShift; x < w; x += tile) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, groundY);
    ctx.stroke();
  }
  for (let y = 0; y < groundY; y += tile) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  // Parallax wall pipes & bathroom details
  const pipeSpacing = 220;
  const pipeShift = -(sim.scrollOffset * 0.35) % pipeSpacing;
  for (let px = pipeShift; px < w + pipeSpacing; px += pipeSpacing) {
    ctx.fillStyle = '#1B4B37';
    ctx.fillRect(px, 18, 120, 14);
    ctx.fillStyle = '#245C44';
    ctx.fillRect(px + 28, 12, 16, 26);
    ctx.fillRect(px + 86, 12, 16, 26);
  }

  // Floor & scrolling grout stripes
  ctx.fillStyle = '#1F543D';
  ctx.fillRect(0, groundY, w, h - groundY);
  ctx.fillStyle = '#CEF04E';
  ctx.fillRect(0, groundY, w, 3);

  const stripeStep = 56;
  const stripeShift = -sim.scrollOffset % stripeStep;
  ctx.fillStyle = 'rgba(11, 32, 23, 0.45)';
  for (let sx = stripeShift; sx < w + stripeStep; sx += stripeStep) {
    ctx.fillRect(sx, groundY + 12, 26, 6);
  }

  // Collectibles (TP rolls)
  for (const col of sim.collectibles) {
    if (col.collected) continue;
    const cx = col.x;
    const cy = groundY - col.yFromGround + Math.sin(sim.animClock * 5 + cx * 0.04) * 4;
    ctx.save();
    ctx.translate(cx, cy);
    if (col.golden) {
      ctx.shadowColor = '#FACC15';
      ctx.shadowBlur = 12;
    }
    drawRoundedRect(ctx, -11, -10, 22, 20, 4);
    ctx.fillStyle = col.golden ? '#FACC15' : '#FFFDF8';
    ctx.fill();
    ctx.strokeStyle = col.golden ? '#713F12' : '#143B2B';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = col.golden ? '#A16207' : '#A87C4F';
    ctx.beginPath();
    ctx.ellipse(0, -6, 5, 2.3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Obstacles
  for (const obs of sim.obstacles) {
    const oy = groundY - obs.bottomFromGround - obs.h;
    ctx.save();
    if (obs.kind === 'plunger') {
      // Floor plunger obstacle
      ctx.fillStyle = '#D97706';
      ctx.strokeStyle = '#2B1609';
      ctx.lineWidth = 2;
      drawRoundedRect(ctx, obs.x + obs.w * 0.36, oy, obs.w * 0.28, obs.h * 0.65, 4);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#EF4444';
      ctx.beginPath();
      ctx.moveTo(obs.x, oy + obs.h);
      ctx.quadraticCurveTo(obs.x + obs.w * 0.5, oy + obs.h * 0.35, obs.x + obs.w, oy + obs.h);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (obs.kind === 'brush') {
      // Spiky toilet brush stack
      ctx.fillStyle = '#E2E8F0';
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 2;
      drawRoundedRect(ctx, obs.x + obs.w * 0.32, oy + 10, obs.w * 0.36, obs.h - 10, 4);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#38BDF8';
      ctx.beginPath();
      ctx.arc(obs.x + obs.w * 0.5, oy + 14, obs.w * 0.44, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else {
      // Overhead pipe / barrier to SLIDE under!
      ctx.fillStyle = '#64748B';
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 2.4;
      drawRoundedRect(ctx, obs.x, 0, obs.w, oy + obs.h, 6);
      ctx.fill();
      ctx.stroke();

      // Hazard yellow-black warning lip at bottom of overhead barrier
      ctx.fillStyle = '#FACC15';
      ctx.fillRect(obs.x + 2, oy + obs.h - 14, obs.w - 4, 12);
      ctx.fillStyle = '#143B2B';
      ctx.font = '700 10px "Noto Sans Ethiopic", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(duckLabel, obs.x + obs.w / 2, oy + obs.h - 5, obs.w - 8);
    }
    ctx.restore();
  }

  // Player (Running Poop Hero)
  const isSliding = sim.slidingTimer > 0 && sim.playerYFromGround <= 2;
  const pW = isSliding ? 44 : 36;
  const pH = isSliding ? 22 : 38;
  const px = sim.playerX;
  const py = groundY - sim.playerYFromGround - pH * 0.5;

  // Ground shadow
  const shadowScale = Math.max(0.45, 1 - sim.playerYFromGround / 180);
  ctx.fillStyle = 'rgba(0,0,0,0.34)';
  ctx.beginPath();
  ctx.ellipse(px, groundY + 2, 18 * shadowScale, 5 * shadowScale, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.translate(px, py);

  // Bubble shield glow if active
  if (sim.shieldTimer > 0) {
    ctx.strokeStyle = '#38BDF8';
    ctx.fillStyle = 'rgba(56, 189, 248, 0.16)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, 29, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // Little running feet when on ground & not sliding
  if (sim.playerYFromGround < 3 && !isSliding) {
    const stride = Math.sin(sim.animClock * 18) * 6;
    ctx.fillStyle = '#2B1609';
    ctx.beginPath();
    ctx.ellipse(-6 + stride, pH * 0.48, 5, 3, 0, 0, Math.PI * 2);
    ctx.ellipse(6 - stride, pH * 0.48, 5, 3, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Squash & stretch body
  ctx.fillStyle = '#8C542B';
  ctx.strokeStyle = '#2B1609';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.ellipse(0, pH * 0.18, pW * 0.48, pH * 0.28, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#9D6134';
  ctx.beginPath();
  ctx.ellipse(0, -pH * 0.08, pW * 0.36, pH * 0.24, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  if (!isSliding) {
    ctx.beginPath();
    ctx.moveTo(-pW * 0.18, -pH * 0.26);
    ctx.quadraticCurveTo(2, -pH * 0.56, pW * 0.16, -pH * 0.26);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // Determined cute eyes
  ctx.fillStyle = '#FFFDF8';
  ctx.beginPath();
  ctx.arc(3, -pH * 0.05, 4.4, 0, Math.PI * 2);
  ctx.arc(12, -pH * 0.05, 4.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1B1109';
  ctx.beginPath();
  ctx.arc(4.2, -pH * 0.05, 2, 0, Math.PI * 2);
  ctx.arc(13.2, -pH * 0.05, 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  // Particles
  for (const pt of sim.particles) {
    ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
    ctx.fillStyle = pt.color;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Callouts
  for (const c of sim.callouts) {
    ctx.globalAlpha = Math.max(0, Math.min(1, c.life / c.maxLife));
    ctx.font = '700 14px "Noto Sans Ethiopic", system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#0A1F16';
    ctx.fillText(c.text, c.x + 1, c.y + 1);
    ctx.fillStyle = c.color;
    ctx.fillText(c.text, c.x, c.y);
  }
  ctx.globalAlpha = 1;
}

export function PoopRunGame({
  playerNickname,
  serverBestScore = 0,
  onGameComplete,
  onBackToGames,
  submissionNotice,
}: PoopRunGameProps) {
  const { t } = useLanguage();
  const arcadeCommon = t.arcade.common;
  const prText = t.arcade.poopRun;
  const prTextRef = useRef(prText);
  prTextRef.current = prText;

  const prefersReducedMotion = useReducedMotion() ?? false;
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const simRef = useRef<RunSim>(createInitialSim(680, 360));
  const phaseRef = useRef<GamePhase>('TITLE_MENU');
  const swipeStartYRef = useRef<number | null>(null);
  const onGameCompleteRef = useRef(onGameComplete);
  onGameCompleteRef.current = onGameComplete;

  const [phase, setPhase] = useState<GamePhase>('TITLE_MENU');
  const [score, setScore] = useState(0);
  const [distanceM, setDistanceM] = useState(0);
  const [rollsCollected, setRollsCollected] = useState(0);
  const [speedMult, setSpeedMult] = useState(1);
  const [highScore, setHighScore] = useState(() =>
    Math.max(loadPoopRunHighScore(), serverBestScore)
  );
  const [muted, setMuted] = useState(() => arcadeAudio.isMuted());
  const [isNewBest, setIsNewBest] = useState(false);

  const highScoreRef = useRef(highScore);
  highScoreRef.current = highScore;

  useEffect(() => {
    if (serverBestScore > highScoreRef.current) {
      setHighScore(serverBestScore);
      savePoopRunHighScore(serverBestScore);
    }
  }, [serverBestScore]);

  const setGamePhase = useCallback((next: GamePhase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  const triggerJump = useCallback(() => {
    if (phaseRef.current !== 'PLAYING') return;
    simRef.current.jumpBufferTimer = 0.12;
    simRef.current.slidingTimer = 0;
  }, []);

  const triggerSlide = useCallback(() => {
    if (phaseRef.current !== 'PLAYING') return;
    const sim = simRef.current;
    if (sim.playerYFromGround > 4) {
      // Fast-fall in midair
      sim.playerVy = Math.min(sim.playerVy, -760);
    } else {
      if (sim.slidingTimer <= 0) {
        arcadeAudio.playSlide();
        triggerHaptic(6);
      }
      sim.slidingTimer = 0.62;
    }
  }, []);

  const finishRun = useCallback(
    (sim: RunSim) => {
      arcadeAudio.playGameOver();
      triggerHaptic([24, 28, 24]);
      setIsNewBest(sim.score > 0 && sim.score >= highScoreRef.current);
      setGamePhase('GAME_OVER');
      if (!sim.submitted) {
        sim.submitted = true;
        onGameCompleteRef.current?.({
          score: sim.score,
          distanceMeters: sim.distanceMeters,
          rollsCollected: sim.rollsCollected,
          sessionId: sim.sessionId,
          durationMs: Math.max(1000, Date.now() - sim.startedAtMs),
        });
      }
    },
    [setGamePhase]
  );

  const startFreshGame = useCallback(() => {
    triggerHaptic(10);
    const cur = simRef.current;
    simRef.current = createInitialSim(cur.width, cur.height);
    setScore(0);
    setDistanceM(0);
    setRollsCollected(0);
    setSpeedMult(1);
    setIsNewBest(false);
    setGamePhase('PLAYING');
  }, [setGamePhase]);

  const togglePause = useCallback(() => {
    triggerHaptic(6);
    if (phaseRef.current === 'PLAYING') setGamePhase('PAUSED');
    else if (phaseRef.current === 'PAUSED') setGamePhase('PLAYING');
  }, [setGamePhase]);

  const toggleMute = useCallback(() => {
    const next = !arcadeAudio.isMuted();
    arcadeAudio.setMuted(next);
    setMuted(next);
  }, []);

  // Size canvas cleanly
  useEffect(() => {
    const updateSize = () => {
      const container = stageRef.current;
      const canvas = canvasRef.current;
      if (!container || !canvas) return;
      const rect = container.getBoundingClientRect();
      const logicalW = Math.max(260, Math.min(820, Math.floor(rect.width - 8)));
      const logicalH = Math.max(185, Math.min(430, Math.floor(rect.height - 8)));
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = logicalW * dpr;
      canvas.height = logicalH * dpr;
      canvas.style.width = `${logicalW}px`;
      canvas.style.height = `${logicalH}px`;

      const sim = simRef.current;
      sim.width = logicalW;
      sim.height = logicalH;
      sim.groundY = Math.round(logicalH * 0.8);
      sim.playerX = Math.round(logicalW * 0.19);
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

  // Main Game Loop
  useEffect(() => {
    let rafId = 0;
    let lastTs = performance.now();

    const spawnPattern = (sim: RunSim) => {
      const spawnX = sim.width + 48;
      const roll = Math.random();

      if (roll < 0.34) {
        // Overhead pipe -> SLIDE under, plus TP rolls on ground
        sim.obstacles.push({
          kind: 'overhead_pipe',
          x: spawnX,
          w: 64,
          h: Math.max(40, sim.groundY - 30),
          bottomFromGround: 28,
        });
        sim.collectibles.push(
          { x: spawnX + 16, yFromGround: 14, golden: false, collected: false },
          { x: spawnX + 48, yFromGround: 14, golden: false, collected: false }
        );
      } else if (roll < 0.7) {
        // Plunger -> JUMP over, plus arc of TP rolls
        sim.obstacles.push({
          kind: 'plunger',
          x: spawnX,
          w: 36,
          h: 44,
          bottomFromGround: 0,
        });
        sim.collectibles.push(
          { x: spawnX + 18, yFromGround: 88, golden: Math.random() < 0.18, collected: false }
        );
      } else {
        // Brush + bonus roll
        sim.obstacles.push({
          kind: 'brush',
          x: spawnX,
          w: 32,
          h: 48,
          bottomFromGround: 0,
        });
        sim.collectibles.push(
          { x: spawnX + 80, yFromGround: 22, golden: false, collected: false },
          { x: spawnX + 114, yFromGround: 22, golden: false, collected: false }
        );
      }
    };

    const loop = (now: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTs) / 1000));
      lastTs = now;
      const sim = simRef.current;

      if (phaseRef.current === 'PLAYING') {
        sim.animClock += dt;
        if (sim.slidingTimer > 0) sim.slidingTimer = Math.max(0, sim.slidingTimer - dt);
        if (sim.shieldTimer > 0) sim.shieldTimer = Math.max(0, sim.shieldTimer - dt);
        if (sim.jumpBufferTimer > 0) {
          sim.jumpBufferTimer = Math.max(0, sim.jumpBufferTimer - dt);
        }

        // Gradual speed ramp (270 px/s -> 590 px/s)
        const speedCap = 590;
        sim.speedPx = Math.min(speedCap, sim.speedPx + dt * 6.2);
        const mult = Number((sim.speedPx / 270).toFixed(1));
        setSpeedMult(mult);

        sim.scrollOffset += sim.speedPx * dt;
        sim.distancePx += sim.speedPx * dt;
        const meters = Math.floor(sim.distancePx / 24);
        if (meters !== sim.distanceMeters) {
          sim.distanceMeters = meters;
          setDistanceM(meters);
          if (meters >= sim.nextMilestoneM) {
            sim.bonusScore += 50;
            sim.nextMilestoneM += 100;
            arcadeAudio.playMilestone();
            sim.callouts.push({
              text: `${meters}m! +50`,
              x: sim.playerX + 20,
              y: sim.groundY - 75,
              life: 0.9,
              maxLife: 0.9,
              color: '#FACC15',
            });
          }
        }

        // Player vertical jump physics + coyote time
        if (sim.playerYFromGround <= 1) {
          sim.coyoteTimer = 0.09;
        } else {
          sim.coyoteTimer = Math.max(0, sim.coyoteTimer - dt);
        }

        if (sim.jumpBufferTimer > 0 && sim.coyoteTimer > 0) {
          sim.playerVy = 610;
          sim.playerYFromGround = Math.max(2, sim.playerYFromGround);
          sim.coyoteTimer = 0;
          sim.jumpBufferTimer = 0;
          arcadeAudio.playJump();
          triggerHaptic(8);
          for (let i = 0; i < 6; i++) {
            sim.particles.push({
              x: sim.playerX - 6 + Math.random() * 12,
              y: sim.groundY - 2,
              vx: (Math.random() - 0.8) * 90,
              vy: -30 - Math.random() * 60,
              life: 0.35,
              maxLife: 0.35,
              color: '#CEF04E',
              size: 2.5,
            });
          }
        }

        sim.playerVy -= 1760 * dt;
        sim.playerYFromGround += sim.playerVy * dt;
        if (sim.playerYFromGround <= 0) {
          sim.playerYFromGround = 0;
          sim.playerVy = 0;
        }

        // Spawn obstacles
        sim.spawnCooldown -= dt;
        if (sim.spawnCooldown <= 0) {
          spawnPattern(sim);
          const minGapSec = Math.max(0.78, 1.38 - (sim.speedPx - 270) / 720);
          sim.spawnCooldown = minGapSec + Math.random() * 0.45;
        }

        const isSliding = sim.slidingTimer > 0 && sim.playerYFromGround <= 2;
        const pHalfW = isSliding ? 18 : 13;
        const pHeight = isSliding ? 19 : 34;
        const pLeft = sim.playerX - pHalfW;
        const pRight = sim.playerX + pHalfW;
        const pBottom = sim.playerYFromGround + 2;
        const pTop = sim.playerYFromGround + pHeight;

        // Move & collect TP rolls
        for (let i = sim.collectibles.length - 1; i >= 0; i--) {
          const col = sim.collectibles[i];
          col.x -= sim.speedPx * dt;
          if (col.x < -30) {
            sim.collectibles.splice(i, 1);
            continue;
          }
          if (!col.collected) {
            const hitX = col.x + 12 >= pLeft && col.x - 12 <= pRight;
            const hitY = col.yFromGround + 12 >= pBottom && col.yFromGround - 12 <= pTop;
            if (hitX && hitY) {
              col.collected = true;
              sim.rollsCollected += 1;
              const pts = col.golden ? 45 : 15;
              sim.bonusScore += pts;
              setRollsCollected(sim.rollsCollected);
              if (col.golden) {
                sim.shieldTimer = 2.6;
                arcadeAudio.playGoldBonus();
                triggerHaptic([8, 12]);
              } else {
                arcadeAudio.playCatch(1);
                triggerHaptic(5);
              }
              sim.callouts.push({
                text: col.golden ? prTextRef.current.shieldCallout(pts) : `+${pts}`,
                x: col.x,
                y: sim.groundY - col.yFromGround - 16,
                life: 0.7,
                maxLife: 0.7,
                color: col.golden ? '#38BDF8' : '#CEF04E',
              });
            }
          }
        }

        // Move & check obstacle collisions
        let crashed = false;
        for (let i = sim.obstacles.length - 1; i >= 0; i--) {
          const obs = sim.obstacles[i];
          obs.x -= sim.speedPx * dt;
          if (obs.x + obs.w < -40) {
            sim.obstacles.splice(i, 1);
            continue;
          }

          const oLeft = obs.x + 5;
          const oRight = obs.x + obs.w - 5;
          const oBottom = obs.bottomFromGround;
          const oTop = obs.bottomFromGround + obs.h - 4;

          if (pRight > oLeft && pLeft < oRight && pTop > oBottom && pBottom < oTop) {
            if (sim.shieldTimer > 0) {
              sim.shieldTimer = 0;
              sim.obstacles.splice(i, 1);
              arcadeAudio.playHit();
              sim.callouts.push({
                text: prTextRef.current.shieldSavedCallout,
                x: sim.playerX,
                y: sim.groundY - pTop - 16,
                life: 0.85,
                maxLife: 0.85,
                color: '#38BDF8',
              });
            } else {
              crashed = true;
              break;
            }
          }
        }

        sim.score = sim.distanceMeters + sim.bonusScore;
        setScore(sim.score);
        if (sim.score > highScoreRef.current) {
          setHighScore(sim.score);
          savePoopRunHighScore(sim.score);
        }

        if (crashed) {
          for (let i = 0; i < 14; i++) {
            const a = Math.random() * Math.PI * 2;
            const sp = 80 + Math.random() * 140;
            sim.particles.push({
              x: sim.playerX,
              y: sim.groundY - sim.playerYFromGround - 16,
              vx: Math.cos(a) * sp,
              vy: Math.sin(a) * sp,
              life: 0.45,
              maxLife: 0.45,
              color: '#EF4444',
              size: 3,
            });
          }
          finishRun(sim);
        }
      }

      // Particles & callouts
      for (let i = sim.particles.length - 1; i >= 0; i--) {
        const pt = sim.particles[i];
        pt.x += pt.vx * dt;
        pt.y += pt.vy * dt;
        pt.life -= dt;
        if (pt.life <= 0) sim.particles.splice(i, 1);
      }
      for (let i = sim.callouts.length - 1; i >= 0; i--) {
        const c = sim.callouts[i];
        c.y -= 32 * dt;
        c.life -= dt;
        if (c.life <= 0) sim.callouts.splice(i, 1);
      }

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (canvas && ctx) {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        drawScene(ctx, sim, prTextRef.current.duckCallout);
      }

      rafId = window.requestAnimationFrame(loop);
    };

    rafId = window.requestAnimationFrame(loop);
    return () => window.cancelAnimationFrame(rafId);
  }, [finishRun]);

  // Keyboard Controls
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key;
      const low = k.toLowerCase();
      if (k === 'ArrowUp' || k === 'ArrowDown' || k === ' ') {
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
      if (low === 'p') {
        togglePause();
        return;
      }
      if (low === 'r') {
        startFreshGame();
        return;
      }
      if (k === 'ArrowUp' || k === ' ' || low === 'w') {
        triggerJump();
      } else if (k === 'ArrowDown' || low === 's') {
        triggerSlide();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onBackToGames, startFreshGame, togglePause, triggerJump, triggerSlide]);

  return (
    <ArcadeGameShell
      title={prText.title}
      ariaLabel={prText.ariaLabel}
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
            <span className="text-[#9AB7A9] font-medium mr-1">{prText.distHud}</span>
            <span className="font-mono font-bold text-[#F7F4EC]">{distanceM}m</span>
          </div>
          <div>
            <span className="text-[#9AB7A9] font-medium mr-1">{prText.rollsHud}</span>
            <span className="font-mono font-bold text-[#FACC15]">{rollsCollected}</span>
          </div>
        </>
      }
      hudRight={
        <>
          <span className="text-xs font-mono text-[#9AB7A9]">
            {speedMult.toFixed(1)}x {prText.speedSuffix}
          </span>
          <div>
            <span className="text-[#9AB7A9] font-medium mr-1">{arcadeCommon.bestHud}</span>
            <span className="font-mono font-bold text-[#F7F4EC]">{highScore}</span>
          </div>
        </>
      }
      mobileControls={
        <div className="w-full flex items-center justify-center gap-3 [@media(max-height:520px)_and_(orientation:landscape)]:flex-col touch-none">
          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              triggerSlide();
            }}
            className="flex-1 w-full max-w-[155px] min-h-[50px] px-2 rounded-xl bg-[#143B2B] active:bg-[#CEF04E] active:text-[#143B2B] border border-[#2D7A58] text-[#F7F4EC] flex items-center justify-center gap-1.5 font-display text-sm font-bold shadow-[0_3px_0_#0A1F16] whitespace-nowrap cursor-pointer"
          >
            <ArrowDown className="w-5 h-5 shrink-0" />
            <span className="truncate">{prText.slideBtn}</span>
          </button>
          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              triggerJump();
            }}
            className="flex-1 w-full max-w-[155px] min-h-[50px] px-2 rounded-xl bg-[#CEF04E] active:bg-[#D9F66A] text-[#143B2B] flex items-center justify-center gap-1.5 font-display text-sm font-bold shadow-[0_3px_0_#0A1F16] whitespace-nowrap cursor-pointer"
          >
            <ArrowUp className="w-5 h-5 shrink-0" />
            <span className="truncate">{prText.jumpBtn}</span>
          </button>
        </div>
      }
      desktopLegend={
        <>
          <span>{prText.legendJump}</span>
          <span aria-hidden="true">·</span>
          <span>{prText.legendSlide}</span>
          <span aria-hidden="true">·</span>
          <span>{arcadeCommon.pauseLegendP}</span>
          <span aria-hidden="true">·</span>
          <span>{arcadeCommon.restartLegendR}</span>
        </>
      }
    >
      <div className="relative rounded-2xl border-2 border-[#2D7A58] bg-[#0F2B1F] p-1 shadow-[0_18px_40px_rgba(0,0,0,0.45)]">
        <canvas
          ref={canvasRef}
          onTouchStart={(e) => {
            if (e.touches.length === 0) return;
            swipeStartYRef.current = e.touches[0].clientY;
          }}
          onTouchMove={(e) => {
            if (swipeStartYRef.current === null || e.touches.length === 0) return;
            const dy = e.touches[0].clientY - swipeStartYRef.current;
            if (dy < -24) {
              triggerJump();
              swipeStartYRef.current = null;
            } else if (dy > 24) {
              triggerSlide();
              swipeStartYRef.current = null;
            }
          }}
          onTouchEnd={() => {
            if (swipeStartYRef.current !== null && phaseRef.current === 'PLAYING') {
              triggerJump();
            }
            swipeStartYRef.current = null;
          }}
          onMouseDown={() => {
            if (phaseRef.current === 'PLAYING') triggerJump();
          }}
          className="block rounded-xl touch-none cursor-pointer"
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
                  {prText.title}
                </h3>
                <p className="mt-1 text-xs sm:text-sm text-[#CDE0D6] leading-relaxed">
                  {prText.description}
                </p>
              </div>

              <div className="text-[11px] text-[#9AB7A9] space-y-0.5">
                <p>{prText.mobileHint}</p>
                <p>{prText.desktopHint}</p>
              </div>

              <button
                type="button"
                onClick={startFreshGame}
                className="w-full min-h-[48px] px-6 py-3 rounded-xl bg-[#CEF04E] hover:bg-[#D9F66A] text-[#143B2B] font-display text-base font-bold shadow-[0_4px_0_#0A1F16] cursor-pointer"
              >
                {prText.startRun}
              </button>
            </div>
          </ArcadeOverlayCard>
        )}

        {/* Paused */}
        {phase === 'PAUSED' && (
          <ArcadeOverlayCard>
            <div className="space-y-3.5">
              <h3 className="font-display text-2xl font-bold text-[#F7F4EC]">
                {prText.runPaused}
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

        {/* Game Over */}
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
                  {isNewBest
                    ? arcadeCommon.newPersonalBest
                    : prText.sprintComplete(distanceM)}
                </p>
                <h3 className="mt-1 font-display text-2xl font-bold text-[#F7F4EC]">
                  {score > 0
                    ? prText.greatSprint(playerNickname)
                    : prText.wipedOut}
                </h3>
                <p className="mt-1 text-sm text-[#CDE0D6] tabular-nums">
                  {arcadeCommon.scoreLabel}{' '}
                  <strong className="text-[#CEF04E]">{score}</strong>
                  <span aria-hidden="true"> · </span>
                  {prText.rollsLabel}{' '}
                  <strong className="text-[#FACC15]">{rollsCollected}</strong>
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

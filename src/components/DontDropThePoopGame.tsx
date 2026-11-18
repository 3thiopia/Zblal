import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowUp, Trophy } from 'lucide-react';
import { ArcadeGameShell, ArcadeOverlayCard } from './ArcadeGameShell.tsx';
import { arcadeAudio } from '../game/arcadeAudio.ts';
import { triggerHaptic } from '../utils/haptics.ts';

type GamePhase = 'TITLE_MENU' | 'PLAYING' | 'PAUSED' | 'GAME_OVER';

export interface DontDropResult {
  score: number;
  gatesCleared: number;
  bonusRolls: number;
  sessionId: string;
  durationMs: number;
}

interface DontDropThePoopGameProps {
  playerNickname?: string;
  serverBestScore?: number;
  onGameComplete?: (result: DontDropResult) => void;
  onBackToGames: () => void;
  submissionNotice?: string | null;
}

interface PipeGate {
  x: number;
  w: number;
  gapY: number;
  gapH: number;
  scored: boolean;
  hasBonusRoll: boolean;
  bonusCollected: boolean;
}

interface FloatingGerm {
  x: number;
  y: number;
  baseY: number;
  r: number;
  phase: number;
}

interface BounceParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

interface BounceCallout {
  text: string;
  x: number;
  y: number;
  life: number;
  maxLife: number;
  color: string;
}

interface BounceSim {
  width: number;
  height: number;
  playerX: number;
  playerY: number;
  playerVy: number;
  playerRadius: number;
  tiltAngle: number;
  speedPx: number;
  score: number;
  gatesCleared: number;
  bonusRolls: number;
  survivalTimer: number;
  pipeSpawnTimer: number;
  germSpawnTimer: number;
  scrollOffset: number;
  animClock: number;
  pipes: PipeGate[];
  germs: FloatingGerm[];
  particles: BounceParticle[];
  callouts: BounceCallout[];
  sessionId: string;
  startedAtMs: number;
  submitted: boolean;
}

const HIGH_SCORE_KEY = 'zblal_dont_drop_high_score';

export function loadDontDropHighScore(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = window.localStorage.getItem(HIGH_SCORE_KEY);
    const parsed = raw ? Number.parseInt(raw, 10) : 0;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  } catch {
    return 0;
  }
}

function saveDontDropHighScore(score: number) {
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
  return `dd-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function createInitialSim(width: number, height: number): BounceSim {
  const safeW = Math.max(250, width);
  const safeH = Math.max(195, height);
  return {
    width: safeW,
    height: safeH,
    playerX: Math.round(safeW * 0.27),
    playerY: Math.round(safeH * 0.45),
    playerVy: 0,
    playerRadius: 17,
    tiltAngle: 0,
    speedPx: 175,
    score: 0,
    gatesCleared: 0,
    bonusRolls: 0,
    survivalTimer: 0,
    pipeSpawnTimer: 0.7,
    germSpawnTimer: 4.5,
    scrollOffset: 0,
    animClock: 0,
    pipes: [],
    germs: [],
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

function drawScene(ctx: CanvasRenderingContext2D, sim: BounceSim) {
  const { width: w, height: h } = sim;
  ctx.clearRect(0, 0, w, h);

  // Bathroom background
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#0C251B');
  bg.addColorStop(1, '#143B2B');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Parallax tiles
  const tile = 40;
  const shift = -(sim.scrollOffset * 0.4) % tile;
  ctx.strokeStyle = 'rgba(206, 240, 78, 0.06)';
  ctx.lineWidth = 1;
  for (let x = shift; x < w; x += tile) {
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

  // Pipe gates
  for (const pipe of sim.pipes) {
    const topH = Math.max(0, pipe.gapY - pipe.gapH / 2);
    const botY = pipe.gapY + pipe.gapH / 2;
    const botH = Math.max(0, h - botY);

    // Top drain pipe
    ctx.fillStyle = '#2D7A58';
    ctx.strokeStyle = '#0A1F16';
    ctx.lineWidth = 2.4;
    ctx.fillRect(pipe.x, 0, pipe.w, topH);
    ctx.strokeRect(pipe.x, -2, pipe.w, topH + 2);
    drawRoundedRect(ctx, pipe.x - 5, topH - 18, pipe.w + 10, 18, 5);
    ctx.fillStyle = '#CEF04E';
    ctx.fill();
    ctx.stroke();

    // Bottom drain pipe
    ctx.fillStyle = '#2D7A58';
    ctx.fillRect(pipe.x, botY, pipe.w, botH);
    ctx.strokeRect(pipe.x, botY, pipe.w, botH + 2);
    drawRoundedRect(ctx, pipe.x - 5, botY, pipe.w + 10, 18, 5);
    ctx.fillStyle = '#CEF04E';
    ctx.fill();
    ctx.stroke();

    // Optional Golden TP Roll in the gap
    if (pipe.hasBonusRoll && !pipe.bonusCollected) {
      const rx = pipe.x + pipe.w / 2;
      const ry = pipe.gapY + Math.sin(sim.animClock * 5) * 6;
      ctx.save();
      ctx.translate(rx, ry);
      ctx.shadowColor = '#FACC15';
      ctx.shadowBlur = 10;
      drawRoundedRect(ctx, -10, -9, 20, 18, 4);
      ctx.fillStyle = '#FACC15';
      ctx.fill();
      ctx.strokeStyle = '#713F12';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }
  }

  // Floating germs
  for (const germ of sim.germs) {
    ctx.save();
    ctx.translate(germ.x, germ.y);
    ctx.fillStyle = '#22C55E';
    ctx.strokeStyle = '#052E16';
    ctx.lineWidth = 2;
    for (let i = 0; i < 6; i++) {
      const a = sim.animClock * 2 + (i / 6) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * germ.r * 0.85, Math.sin(a) * germ.r * 0.85, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(0, 0, germ.r * 0.72, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#FFFDF8';
    ctx.beginPath();
    ctx.arc(-4, -2, 3, 0, Math.PI * 2);
    ctx.arc(4, -2, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#052E16';
    ctx.beginPath();
    ctx.arc(-4, -2, 1.4, 0, Math.PI * 2);
    ctx.arc(4, -2, 1.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Ceiling & dangerous sewer floor
  ctx.fillStyle = '#091A13';
  ctx.fillRect(0, 0, w, 12);
  ctx.fillStyle = '#EF4444';
  ctx.fillRect(0, 10, w, 3);

  ctx.fillStyle = '#091A13';
  ctx.fillRect(0, h - 18, w, 18);
  ctx.fillStyle = '#EF4444';
  ctx.fillRect(0, h - 20, w, 3);

  // Particles
  for (const pt of sim.particles) {
    ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
    ctx.fillStyle = pt.color;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Player Poop Hero
  ctx.save();
  ctx.translate(sim.playerX, sim.playerY);
  ctx.rotate(sim.tiltAngle);
  const r = sim.playerRadius;

  ctx.fillStyle = '#8C542B';
  ctx.strokeStyle = '#2B1609';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.ellipse(0, r * 0.28, r * 0.94, r * 0.45, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#9D6134';
  ctx.beginPath();
  ctx.ellipse(0, -r * 0.08, r * 0.72, r * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(-r * 0.34, -r * 0.4);
  ctx.quadraticCurveTo(0, -r * 1.02, r * 0.3, -r * 0.4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Wide cute eyes
  ctx.fillStyle = '#FFFDF8';
  ctx.beginPath();
  ctx.arc(-r * 0.22, -r * 0.04, r * 0.17, 0, Math.PI * 2);
  ctx.arc(r * 0.24, -r * 0.04, r * 0.17, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1B1109';
  ctx.beginPath();
  ctx.arc(-r * 0.18, -r * 0.04, r * 0.08, 0, Math.PI * 2);
  ctx.arc(r * 0.28, -r * 0.04, r * 0.08, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#1B1109';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.arc(0, r * 0.14, r * 0.22, 0.15, Math.PI - 0.15);
  ctx.stroke();
  ctx.restore();

  // Callouts
  for (const c of sim.callouts) {
    ctx.globalAlpha = Math.max(0, Math.min(1, c.life / c.maxLife));
    ctx.font = '700 15px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#0A1F16';
    ctx.fillText(c.text, c.x + 1, c.y + 1);
    ctx.fillStyle = c.color;
    ctx.fillText(c.text, c.x, c.y);
  }
  ctx.globalAlpha = 1;
}

export function DontDropThePoopGame({
  playerNickname,
  serverBestScore = 0,
  onGameComplete,
  onBackToGames,
  submissionNotice,
}: DontDropThePoopGameProps) {
  const prefersReducedMotion = useReducedMotion() ?? false;
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const simRef = useRef<BounceSim>(createInitialSim(460, 520));
  const phaseRef = useRef<GamePhase>('TITLE_MENU');
  const onGameCompleteRef = useRef(onGameComplete);
  onGameCompleteRef.current = onGameComplete;

  const [phase, setPhase] = useState<GamePhase>('TITLE_MENU');
  const [score, setScore] = useState(0);
  const [gatesCleared, setGatesCleared] = useState(0);
  const [highScore, setHighScore] = useState(() =>
    Math.max(loadDontDropHighScore(), serverBestScore)
  );
  const [muted, setMuted] = useState(() => arcadeAudio.isMuted());
  const [isNewBest, setIsNewBest] = useState(false);

  const highScoreRef = useRef(highScore);
  highScoreRef.current = highScore;

  useEffect(() => {
    if (serverBestScore > highScoreRef.current) {
      setHighScore(serverBestScore);
      saveDontDropHighScore(serverBestScore);
    }
  }, [serverBestScore]);

  const setGamePhase = useCallback((next: GamePhase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  const bounceUp = useCallback(() => {
    if (phaseRef.current !== 'PLAYING') return;
    const sim = simRef.current;
    sim.playerVy = -375;
    arcadeAudio.playBounce();
    triggerHaptic(6);
    for (let i = 0; i < 6; i++) {
      sim.particles.push({
        x: sim.playerX - 6 + Math.random() * 12,
        y: sim.playerY + sim.playerRadius * 0.7,
        vx: -40 - Math.random() * 70,
        vy: 40 + Math.random() * 90,
        life: 0.35,
        maxLife: 0.35,
        color: '#CEF04E',
        size: 2.5 + Math.random() * 2,
      });
    }
  }, []);

  const finishRun = useCallback(
    (sim: BounceSim) => {
      arcadeAudio.playGameOver();
      triggerHaptic([24, 28, 24]);
      setIsNewBest(sim.score > 0 && sim.score >= highScoreRef.current);
      setGamePhase('GAME_OVER');
      if (!sim.submitted) {
        sim.submitted = true;
        onGameCompleteRef.current?.({
          score: sim.score,
          gatesCleared: sim.gatesCleared,
          bonusRolls: sim.bonusRolls,
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
    const nextSim = createInitialSim(cur.width, cur.height);
    nextSim.playerVy = -260;
    simRef.current = nextSim;
    setScore(0);
    setGatesCleared(0);
    setIsNewBest(false);
    setGamePhase('PLAYING');
    arcadeAudio.playBounce();
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
      const logicalW = Math.max(250, Math.min(560, Math.floor(rect.width - 8)));
      const logicalH = Math.max(195, Math.min(600, Math.floor(rect.height - 8)));
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = logicalW * dpr;
      canvas.height = logicalH * dpr;
      canvas.style.width = `${logicalW}px`;
      canvas.style.height = `${logicalH}px`;

      const sim = simRef.current;
      sim.width = logicalW;
      sim.height = logicalH;
      sim.playerX = Math.round(logicalW * 0.27);
      if (phaseRef.current === 'TITLE_MENU') {
        sim.playerY = Math.round(logicalH * 0.45);
      }
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

  // Main Animation Loop
  useEffect(() => {
    let rafId = 0;
    let lastTs = performance.now();

    const loop = (now: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTs) / 1000));
      lastTs = now;
      const sim = simRef.current;

      if (phaseRef.current === 'TITLE_MENU') {
        sim.animClock += dt;
        sim.playerY = sim.height * 0.45 + Math.sin(sim.animClock * 3) * 10;
      } else if (phaseRef.current === 'PLAYING') {
        sim.animClock += dt;
        sim.survivalTimer += dt;

        // Gradual speed & difficulty scaling
        const diff = Math.min(1, sim.gatesCleared / 35);
        sim.speedPx = 175 + diff * 115;
        sim.scrollOffset += sim.speedPx * dt;

        // Survival point every 2 seconds
        if (sim.survivalTimer >= 2) {
          sim.survivalTimer -= 2;
          sim.score += 1;
          setScore(sim.score);
          if (sim.score > highScoreRef.current) {
            setHighScore(sim.score);
            saveDontDropHighScore(sim.score);
          }
        }

        // Gravity & player physics
        sim.playerVy += 1080 * dt;
        sim.playerVy = Math.min(540, sim.playerVy);
        sim.playerY += sim.playerVy * dt;
        sim.tiltAngle = Math.max(-0.45, Math.min(0.75, sim.playerVy / 520));

        // Spawn pipe gates
        sim.pipeSpawnTimer -= dt;
        if (sim.pipeSpawnTimer <= 0) {
          const maxGapForHeight = Math.max(92, sim.height * 0.56);
          const gapH = Math.min(maxGapForHeight, Math.max(108, 174 - diff * 46));
          const edgePad = Math.min(56, Math.max(24, sim.height * 0.14));
          const margin = edgePad + gapH / 2;
          const range = Math.max(16, sim.height - margin * 2);
          const gapY = margin + Math.random() * range;
          sim.pipes.push({
            x: sim.width + 30,
            w: 54,
            gapY,
            gapH,
            scored: false,
            hasBonusRoll: Math.random() < 0.35,
            bonusCollected: false,
          });
          sim.pipeSpawnTimer = Math.max(1.22, 1.85 - diff * 0.55);
        }

        // Spawn occasional floating germ after 6 gates
        if (sim.gatesCleared >= 6) {
          sim.germSpawnTimer -= dt;
          if (sim.germSpawnTimer <= 0) {
            const germPad = Math.min(85, sim.height * 0.25);
            const baseY = germPad + Math.random() * Math.max(40, sim.height - germPad * 2);
            sim.germs.push({
              x: sim.width + 65,
              y: baseY,
              baseY,
              r: 14,
              phase: Math.random() * Math.PI * 2,
            });
            sim.germSpawnTimer = Math.max(2.6, 5.2 - diff * 2.2);
          }
        }

        const pr = sim.playerRadius * 0.78;
        let crashed =
          sim.playerY - pr <= 13 || sim.playerY + pr >= sim.height - 20;

        // Update pipes & check scoring/collisions
        for (let i = sim.pipes.length - 1; i >= 0; i--) {
          const p = sim.pipes[i];
          p.x -= sim.speedPx * dt;
          if (p.x + p.w < -40) {
            sim.pipes.splice(i, 1);
            continue;
          }

          if (!p.scored && p.x + p.w < sim.playerX) {
            p.scored = true;
            sim.gatesCleared += 1;
            sim.score += 2;
            setGatesCleared(sim.gatesCleared);
            setScore(sim.score);
            if (sim.score > highScoreRef.current) {
              setHighScore(sim.score);
              saveDontDropHighScore(sim.score);
            }
            if (sim.gatesCleared % 10 === 0) {
              arcadeAudio.playMilestone();
              sim.callouts.push({
                text: `${sim.gatesCleared} GATES!`,
                x: sim.playerX,
                y: sim.playerY - 30,
                life: 0.9,
                maxLife: 0.9,
                color: '#FACC15',
              });
            } else {
              arcadeAudio.playCatch(1);
            }
          }

          // Bonus roll check
          if (p.hasBonusRoll && !p.bonusCollected) {
            const rx = p.x + p.w / 2;
            const ry = p.gapY + Math.sin(sim.animClock * 5) * 6;
            if (Math.hypot(sim.playerX - rx, sim.playerY - ry) < pr + 13) {
              p.bonusCollected = true;
              sim.bonusRolls += 1;
              sim.score += 5;
              setScore(sim.score);
              if (sim.score > highScoreRef.current) {
                setHighScore(sim.score);
                saveDontDropHighScore(sim.score);
              }
              arcadeAudio.playGoldBonus();
              triggerHaptic([6, 10]);
              sim.callouts.push({
                text: '+5 GOLD!',
                x: rx,
                y: ry - 14,
                life: 0.75,
                maxLife: 0.75,
                color: '#FDE047',
              });
            }
          }

          // Pipe collision
          const inX = sim.playerX + pr > p.x && sim.playerX - pr < p.x + p.w;
          if (inX) {
            const gapTop = p.gapY - p.gapH / 2;
            const gapBot = p.gapY + p.gapH / 2;
            if (sim.playerY - pr < gapTop || sim.playerY + pr > gapBot) {
              crashed = true;
            }
          }
        }

        // Update floating germs
        for (let i = sim.germs.length - 1; i >= 0; i--) {
          const g = sim.germs[i];
          g.x -= (sim.speedPx + 35) * dt;
          g.y = g.baseY + Math.sin(sim.animClock * 3.5 + g.phase) * 24;
          if (g.x < -30) {
            sim.germs.splice(i, 1);
            continue;
          }
          if (Math.hypot(sim.playerX - g.x, sim.playerY - g.y) < pr + g.r * 0.72) {
            crashed = true;
          }
        }

        if (crashed) {
          for (let i = 0; i < 14; i++) {
            const a = Math.random() * Math.PI * 2;
            const sp = 70 + Math.random() * 140;
            sim.particles.push({
              x: sim.playerX,
              y: sim.playerY,
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
        c.y -= 30 * dt;
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

  // Keyboard Controls
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key;
      const low = k.toLowerCase();
      if (k === 'ArrowUp' || k === ' ') e.preventDefault();

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
      if (k === ' ' || k === 'ArrowUp' || low === 'w') {
        bounceUp();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [bounceUp, onBackToGames, startFreshGame, togglePause]);

  return (
    <ArcadeGameShell
      title="DON'T DROP THE POOP"
      ariaLabel="Don't Drop the Poop Arcade Game"
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
            <span className="text-[#9AB7A9] font-medium mr-1">SCORE</span>
            <span className="font-mono font-bold text-[#CEF04E]">{score}</span>
          </div>
          <div>
            <span className="text-[#9AB7A9] font-medium mr-1">GATES</span>
            <span className="font-mono font-bold text-[#FACC15]">{gatesCleared}</span>
          </div>
        </>
      }
      hudRight={
        <div>
          <span className="text-[#9AB7A9] font-medium mr-1">BEST</span>
          <span className="font-mono font-bold text-[#F7F4EC]">{highScore}</span>
        </div>
      }
      mobileControls={
        <button
          type="button"
          onPointerDown={(e) => {
            e.preventDefault();
            if (phaseRef.current === 'TITLE_MENU') startFreshGame();
            else bounceUp();
          }}
          className="w-full max-w-[240px] min-h-[50px] rounded-xl bg-[#CEF04E] active:bg-[#D9F66A] text-[#143B2B] flex items-center justify-center gap-1.5 font-display text-sm sm:text-base font-bold shadow-[0_3px_0_#0A1F16] whitespace-nowrap cursor-pointer"
        >
          <ArrowUp className="w-5 h-5" />
          <span>TAP TO BOUNCE</span>
        </button>
      }
      desktopLegend={
        <>
          <span>Bounce: Click / Space / Up / W</span>
          <span aria-hidden="true">·</span>
          <span>Pause: P</span>
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
          onPointerDown={(e) => {
            e.preventDefault();
            if (phaseRef.current === 'PLAYING') bounceUp();
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
                  DON&apos;T DROP THE POOP
                </h3>
                <p className="mt-1 text-xs sm:text-sm text-[#CDE0D6] leading-relaxed">
                  Keep the poop bouncing in the air! Fly through bathroom pipe
                  gates, grab golden rolls, and avoid hitting the floor, ceiling,
                  or germs.
                </p>
              </div>

              <div className="text-[11px] text-[#9AB7A9] space-y-0.5">
                <p>Mobile: Tap anywhere or hit BOUNCE</p>
                <p>Desktop: Click / Space / Up Arrow / W</p>
              </div>

              <button
                type="button"
                onClick={startFreshGame}
                className="w-full min-h-[48px] px-6 py-3 rounded-xl bg-[#CEF04E] hover:bg-[#D9F66A] text-[#143B2B] font-display text-base font-bold shadow-[0_4px_0_#0A1F16] cursor-pointer"
              >
                Start Bouncing
              </button>
            </div>
          </ArcadeOverlayCard>
        )}

        {/* Paused */}
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
                  onClick={startFreshGame}
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
                  {isNewBest ? 'NEW PERSONAL BEST!' : `${gatesCleared} GATES CLEARED`}
                </p>
                <h3 className="mt-1 font-display text-2xl font-bold text-[#F7F4EC]">
                  {score > 0
                    ? `Nice Flying${playerNickname ? `, ${playerNickname}` : ''}!`
                    : 'Dropped!'}
                </h3>
                <p className="mt-1 text-sm text-[#CDE0D6] tabular-nums">
                  Score: <strong className="text-[#CEF04E]">{score}</strong>
                  <span aria-hidden="true"> · </span>
                  Gates: <strong className="text-[#FACC15]">{gatesCleared}</strong>
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
                  onClick={startFreshGame}
                  className="w-full min-h-[48px] px-6 py-3 rounded-xl bg-[#CEF04E] hover:bg-[#D9F66A] text-[#143B2B] font-display text-base font-bold shadow-[0_4px_0_#0A1F16] cursor-pointer"
                >
                  Play Again
                </button>
                <button
                  type="button"
                  onClick={onBackToGames}
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

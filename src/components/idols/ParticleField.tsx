import { useEffect, useRef } from "react";

/** Port of idols-link `_idolsParticle` / `_idolsParticlePainter` (seed 90210). */
const PARTICLE_SEED = 90210;
const BASE_COUNT_AT_100 = 190;

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  twinkleSpeed: number;
  twinklePhase: number;
  glow: boolean;
};

function mulberry32(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function effectiveOpacityMultiplier(intensity: number): number {
  const x = Math.min(2, Math.max(0, intensity));
  return Math.min(2.6, Math.max(0, 0.3 * x * x + 0.7 * x));
}

function desiredParticleCount(intensity: number): number {
  const clamped = Math.min(2, Math.max(0, intensity));
  return Math.min(380, Math.max(0, Math.round(BASE_COUNT_AT_100 * clamped)));
}

function generateParticles(seed: number, count: number): Particle[] {
  const rng = mulberry32(seed);
  const nextDoubleRange = (min: number, max: number) =>
    min + (max - min) * rng();

  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const x = rng();
    const y = rng();
    const sizeRoll = rng();
    const radius =
      sizeRoll < 0.12
        ? nextDoubleRange(1.8, 2.8)
        : nextDoubleRange(0.8, 1.8);
    const baseAlpha =
      sizeRoll < 0.12
        ? nextDoubleRange(0.08, 0.16)
        : nextDoubleRange(0.04, 0.12);
    const speed = nextDoubleRange(0.002, 0.012) * (radius / 2);
    const angle = nextDoubleRange(0, Math.PI * 2);
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;
    const twinkleSpeed = nextDoubleRange(0.6, 1.6);
    const twinklePhase = nextDoubleRange(0, Math.PI * 2);
    const glow = sizeRoll < 0.08;

    particles.push({
      x,
      y,
      vx,
      vy,
      radius,
      alpha: baseAlpha,
      twinkleSpeed,
      twinklePhase,
      glow,
    });
  }
  return particles;
}

function wrap01(v: number): number {
  return ((v % 1) + 1) % 1;
}

const ParticleField = ({ opacity }: { opacity: number }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const countRef = useRef(0);

  useEffect(() => {
    if (opacity <= 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const nextCount = desiredParticleCount(opacity);
    if (nextCount !== countRef.current) {
      countRef.current = nextCount;
      particlesRef.current = generateParticles(PARTICLE_SEED, nextCount);
    }

    let raf = 0;
    const startTime = performance.now();

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const dpr = window.devicePixelRatio || 1;
      const w = parent.clientWidth;
      const h = parent.clientHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    const ro = new ResizeObserver(resize);
    if (canvas.parentElement) ro.observe(canvas.parentElement);

    const tick = () => {
      const w = canvas.parentElement?.clientWidth ?? canvas.width;
      const h = canvas.parentElement?.clientHeight ?? canvas.height;
      const t = (performance.now() - startTime) / 1000;
      const opacityMult = effectiveOpacityMultiplier(opacity);

      ctx.clearRect(0, 0, w, h);

      for (const p of particlesRef.current) {
        const px = wrap01(p.x + p.vx * t) * w;
        const py = wrap01(p.y + p.vy * t) * h;
        const twinkle =
          0.65 + 0.35 * Math.sin(p.twinklePhase + t * p.twinkleSpeed);
        const a = Math.min(1, Math.max(0, p.alpha * twinkle * opacityMult));

        if (p.glow) {
          ctx.save();
          ctx.shadowBlur = 3;
          ctx.shadowColor = `rgba(255, 255, 255, ${a * 0.6})`;
          ctx.beginPath();
          ctx.arc(px, py, p.radius + 1.4, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 255, 255, ${a * 0.6})`;
          ctx.fill();
          ctx.restore();
        }

        ctx.beginPath();
        ctx.arc(px, py, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${a})`;
        ctx.fill();
      }

      raf = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [opacity]);

  if (opacity <= 0) return null;

  return <canvas className="idolsParticles" ref={canvasRef} aria-hidden />;
};

export default ParticleField;

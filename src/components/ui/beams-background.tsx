import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface BeamsBackgroundProps {
  className?: string;
  children?: ReactNode;
  intensity?: "subtle" | "medium" | "strong";
  showLogo?: boolean;
  logoSrc?: string;
}

interface Beam {
  x: number;
  y: number;
  width: number;
  length: number;
  angle: number;
  speed: number;
  opacity: number;
  hue: number; // 0..1 picks color from palette
  pulse: number;
  pulseSpeed: number;
}

// Orange + white palette (no blue/teal)
const COLORS = ["#ff7a00", "#ff9d2f", "#ffffff"];

function createBeam(width: number, height: number): Beam {
  const angle = -35 + Math.random() * 10;
  return {
    x: Math.random() * width * 1.5 - width * 0.25,
    y: Math.random() * height * 1.5 - height * 0.25,
    width: 30 + Math.random() * 60,
    length: height * 2.5,
    angle,
    speed: 0.4 + Math.random() * 0.9,
    opacity: 0.1 + Math.random() * 0.2,
    hue: Math.random(),
    pulse: Math.random() * Math.PI * 2,
    pulseSpeed: 0.015 + Math.random() * 0.025,
  };
}

const INTENSITY_OPACITY = {
  subtle: 0.5,
  medium: 0.85,
  strong: 1.2,
} as const;

const INTENSITY_BEAM_COUNT = {
  subtle: 10,
  medium: 16,
  strong: 22,
} as const;

export function BeamsBackground({
  className,
  children,
  intensity = "strong",
  showLogo = false,
  logoSrc,
}: BeamsBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const beamsRef = useRef<Beam[]>([]);
  const rafRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      setSize({ w: rect.width, h: rect.height });

      const count = INTENSITY_BEAM_COUNT[intensity];
      beamsRef.current = Array.from({ length: count }, () =>
        createBeam(rect.width, rect.height),
      );
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);

    const opacityMul = INTENSITY_OPACITY[intensity];

    const render = () => {
      const rect = container.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);
      ctx.filter = "blur(28px)";

      for (const beam of beamsRef.current) {
        beam.y -= beam.speed;
        beam.pulse += beam.pulseSpeed;
        if (beam.y + beam.length < -100) {
          Object.assign(beam, createBeam(rect.width, rect.height));
          beam.y = rect.height + 100;
        }

        const pulsing = beam.opacity * (0.75 + Math.sin(beam.pulse) * 0.25) * opacityMul;
        const color = COLORS[Math.floor(beam.hue * COLORS.length)] ?? COLORS[0];

        ctx.save();
        ctx.translate(beam.x, beam.y);
        ctx.rotate((beam.angle * Math.PI) / 180);

        const gradient = ctx.createLinearGradient(0, 0, 0, beam.length);
        const hex = color.replace("#", "");
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        gradient.addColorStop(0, `rgba(${r},${g},${b},0)`);
        gradient.addColorStop(0.15, `rgba(${r},${g},${b},${pulsing * 0.6})`);
        gradient.addColorStop(0.5, `rgba(${r},${g},${b},${pulsing})`);
        gradient.addColorStop(0.85, `rgba(${r},${g},${b},${pulsing * 0.6})`);
        gradient.addColorStop(1, `rgba(${r},${g},${b},0)`);

        ctx.fillStyle = gradient;
        ctx.fillRect(-beam.width / 2, 0, beam.width, beam.length);
        ctx.restore();
      }

      rafRef.current = requestAnimationFrame(render);
    };

    rafRef.current = requestAnimationFrame(render);

    return () => {
      ro.disconnect();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [intensity]);

  return (
    <div
      ref={containerRef}
      className={cn("relative overflow-hidden bg-[#0a0604]", className)}
    >
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
      {/* warm vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 50% 50%, rgba(255,122,0,0.10) 0%, rgba(0,0,0,0.55) 70%, rgba(0,0,0,0.85) 100%)",
        }}
      />

      {showLogo && (
        <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none pb-[28vh]">
          {/* warm glow */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
            className="absolute w-[60vmin] h-[60vmin] rounded-full"
            style={{
              background:
                "radial-gradient(circle, rgba(255,122,0,0.55) 0%, rgba(255,157,47,0.25) 35%, rgba(0,0,0,0) 70%)",
              filter: "blur(40px)",
            }}
          />
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{
              opacity: 1,
              y: [0, -12, 0],
              rotateY: [-6, 6, -6],
            }}
            transition={{
              opacity: { duration: 1.4, ease: [0.22, 1, 0.36, 1] },
              y: { duration: 6, repeat: Infinity, ease: "easeInOut" },
              rotateY: { duration: 9, repeat: Infinity, ease: "easeInOut" },
            }}
            style={{
              transformStyle: "preserve-3d",
              perspective: 1000,
              filter:
                "drop-shadow(0 30px 40px rgba(0,0,0,0.6)) drop-shadow(0 0 50px rgba(255,122,0,0.45))",
            }}
            className="relative"
          >
            <img
              src={logoSrc || "/logo.png"}
              alt="Logo"
              className="w-[26vmin] max-w-[300px] min-w-[140px] h-auto select-none"
              draggable={false}
            />
          </motion.div>
        </div>
      )}

      {children && <div className="relative z-20">{children}</div>}
    </div>
  );
}

export default BeamsBackground;

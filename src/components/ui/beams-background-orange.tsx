"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface AnimatedGradientBackgroundProps {
  className?: string;
  children?: React.ReactNode;
  intensity?: "subtle" | "medium" | "strong";
}

interface Beam {
  x: number;
  y: number;
  width: number;
  length: number;
  angle: number;
  speed: number;
  opacity: number;
  hue: number;
  pulse: number;
  pulseSpeed: number;
}

function createBeam(width: number, height: number): Beam {
  const angle = -35 + Math.random() * 10;
  return {
    x: Math.random() * width * 1.5 - width * 0.25,
    y: Math.random() * height * 1.5 - height * 0.25,
    width: 30 + Math.random() * 60,
    length: height * 2.5,
    angle: angle,
    speed: 0.6 + Math.random() * 1.2,
    opacity: 0.12 + Math.random() * 0.16,
    hue: 20 + Math.random() * 30,
    pulse: Math.random() * Math.PI * 2,
    pulseSpeed: 0.02 + Math.random() * 0.03,
  };
}

// Detect low-end / mobile devices so we can drop beam count + framerate.
// Using deviceMemory (where available), hardwareConcurrency, and coarse pointer.
function detectTier(): "low" | "mid" | "high" {
  if (typeof navigator === "undefined") return "high";
  const mem = (navigator as unknown as { deviceMemory?: number }).deviceMemory ?? 8;
  const cores = navigator.hardwareConcurrency ?? 8;
  const coarse = typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches;
  if (mem <= 4 || cores <= 4 || coarse) return "low";
  if (mem <= 6 || cores <= 6) return "mid";
  return "high";
}

export function BeamsBackgroundOrange({
  className,
  children,
  intensity = "strong",
}: AnimatedGradientBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const beamsRef = useRef<Beam[]>([]);
  const animationFrameRef = useRef<number>(0);

  const opacityMap = {
    subtle: 0.7,
    medium: 0.85,
    strong: 1,
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Respect reduced motion: render a static frame, no rAF loop.
    const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const tier = detectTier();
    // Cap DPR aggressively; the canvas is heavily blurred so high-DPR is wasted.
    // On low tier we render at sub-CSS resolution and let the browser upscale.
    const renderScale = tier === "low" ? 0.5 : tier === "mid" ? 0.75 : 1;
    const dprCap = tier === "low" ? 1 : tier === "mid" ? 1.25 : 1.5;
    const beamCount = tier === "low" ? 10 : tier === "mid" ? 18 : 30;
    // Frame interval (ms) — throttle low tier to ~30fps to free the main thread.
    const frameInterval = tier === "low" ? 1000 / 24 : tier === "mid" ? 1000 / 40 : 0;

    const updateCanvasSize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, dprCap);
      const cssW = window.innerWidth;
      const cssH = window.innerHeight;
      canvas.width = Math.round(cssW * dpr * renderScale);
      canvas.height = Math.round(cssH * dpr * renderScale);
      canvas.style.width = `${cssW}px`;
      canvas.style.height = `${cssH}px`;
      ctx.setTransform(dpr * renderScale, 0, 0, dpr * renderScale, 0, 0);

      beamsRef.current = Array.from({ length: beamCount }, () =>
        createBeam(cssW, cssH)
      );
    };

    updateCanvasSize();

    // Debounced resize to avoid re-allocating beams on every pixel change.
    let resizeTimer: ReturnType<typeof setTimeout> | null = null;
    const onResize = () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(updateCanvasSize, 150);
    };
    window.addEventListener("resize", onResize);

    function resetBeam(beam: Beam, index: number) {
      if (!canvas) return beam;
      const cssW = window.innerWidth;
      const cssH = window.innerHeight;
      const column = index % 3;
      const spacing = cssW / 3;

      beam.y = cssH + 100;
      beam.x = column * spacing + spacing / 2 + (Math.random() - 0.5) * spacing * 0.5;
      beam.width = 100 + Math.random() * 100;
      beam.speed = 0.5 + Math.random() * 0.4;
      beam.hue = index % 2 === 0 ? 25 + Math.random() * 15 : 40 + Math.random() * 20;
      beam.opacity = 0.2 + Math.random() * 0.1;
      return beam;
    }

    function drawBeam(ctx: CanvasRenderingContext2D, beam: Beam) {
      ctx.save();
      ctx.translate(beam.x, beam.y);
      ctx.rotate((beam.angle * Math.PI) / 180);

      const pulsingOpacity =
        beam.opacity *
        (0.8 + Math.sin(beam.pulse) * 0.2) *
        opacityMap[intensity];

      const gradient = ctx.createLinearGradient(0, 0, 0, beam.length);
      const saturation = beam.hue > 35 ? "20%" : "85%";
      const lightness = beam.hue > 35 ? "85%" : "60%";

      gradient.addColorStop(0, `hsla(${beam.hue}, ${saturation}, ${lightness}, 0)`);
      gradient.addColorStop(0.1, `hsla(${beam.hue}, ${saturation}, ${lightness}, ${pulsingOpacity * 0.5})`);
      gradient.addColorStop(0.4, `hsla(${beam.hue}, ${saturation}, ${lightness}, ${pulsingOpacity})`);
      gradient.addColorStop(0.6, `hsla(${beam.hue}, ${saturation}, ${lightness}, ${pulsingOpacity})`);
      gradient.addColorStop(0.9, `hsla(${beam.hue}, ${saturation}, ${lightness}, ${pulsingOpacity * 0.5})`);
      gradient.addColorStop(1, `hsla(${beam.hue}, ${saturation}, ${lightness}, 0)`);

      ctx.fillStyle = gradient;
      ctx.fillRect(-beam.width / 2, 0, beam.width, beam.length);
      ctx.restore();
    }

    let lastFrame = 0;
    let paused = document.hidden;

    function step(now: number) {
      if (paused || !canvas || !ctx) {
        animationFrameRef.current = requestAnimationFrame(step);
        return;
      }
      if (frameInterval && now - lastFrame < frameInterval) {
        animationFrameRef.current = requestAnimationFrame(step);
        return;
      }
      lastFrame = now;

      const cssW = window.innerWidth;
      const cssH = window.innerHeight;
      ctx.clearRect(0, 0, cssW, cssH);

      beamsRef.current.forEach((beam, index) => {
        beam.y -= beam.speed;
        beam.pulse += beam.pulseSpeed;
        if (beam.y + beam.length < -100) resetBeam(beam, index);
        drawBeam(ctx, beam);
      });

      animationFrameRef.current = requestAnimationFrame(step);
    }

    const onVisibility = () => {
      paused = document.hidden;
    };
    document.addEventListener("visibilitychange", onVisibility);

    if (prefersReducedMotion) {
      // Render one static frame and exit.
      const cssW = window.innerWidth;
      const cssH = window.innerHeight;
      ctx.clearRect(0, 0, cssW, cssH);
      beamsRef.current.forEach((beam) => drawBeam(ctx, beam));
    } else {
      animationFrameRef.current = requestAnimationFrame(step);
    }

    return () => {
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
      if (resizeTimer) clearTimeout(resizeTimer);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [intensity]);

  return (
    <div className={cn("relative w-full overflow-hidden bg-neutral-950", className)}>
      <canvas
        ref={canvasRef}
        // Move the heavy blur to CSS so it's GPU-composited once per frame
        // instead of applied per draw call inside canvas (which was the main CPU cost).
        style={{ filter: "blur(35px)", willChange: "transform" }}
        className="fixed inset-0 w-screen h-screen pointer-events-none"
      />
      {children && <div className="relative z-10">{children}</div>}
    </div>
  );
}

export default BeamsBackgroundOrange;

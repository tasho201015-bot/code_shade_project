import React, { useEffect, useRef, ReactNode } from 'react';

// ---------------------------------------------------------------------------
// ORANGE NEON PALETTE — fixed hex values
// ---------------------------------------------------------------------------
const ORANGE = {
  primary:    '#FF6A00',
  secondary:  '#FF8C42',
  outerGlow:  'rgba(255,106,0,0.35)',
} as const;

interface GlowCardProps {
  children: ReactNode;
  className?: string;
  glowColor?: 'blue' | 'purple' | 'green' | 'red' | 'orange';
  size?: 'sm' | 'md' | 'lg';
  width?: string | number;
  height?: string | number;
  customSize?: boolean;
  singleChild?: boolean;
}

const sizeMap = {
  sm: 'w-48 h-64',
  md: 'w-64 h-80',
  lg: 'w-80 h-96',
};

// ---------------------------------------------------------------------------
// Inject the glow CSS exactly ONCE per document. Previously every <GlowCard>
// rendered its own <style> tag — on a shop page with N cards this meant N
// duplicate stylesheets parsed by the browser.
// ---------------------------------------------------------------------------
const GLOW_CSS = `
[data-glow]::before,
[data-glow]::after {
  pointer-events: none;
  content: "";
  position: absolute;
  inset: calc(var(--border-size) * -1);
  border: var(--border-size) solid transparent;
  border-radius: inherit;
  background-attachment: fixed;
  background-size: calc(100% + (2 * var(--border-size))) calc(100% + (2 * var(--border-size)));
  background-repeat: no-repeat;
  background-position: 50% 50%;
  mask: linear-gradient(transparent, transparent), linear-gradient(white, white);
  mask-clip: padding-box, border-box;
  mask-composite: intersect;
}
[data-glow]::before {
  background-image: radial-gradient(
    calc(var(--spotlight-size) * 0.75) calc(var(--spotlight-size) * 0.75) at
    calc(var(--x, 0) * 1px)
    calc(var(--y, 0) * 1px),
    ${ORANGE.primary},
    transparent 100%
  );
  filter: brightness(1.8);
}
[data-glow]::after {
  background-image: radial-gradient(
    calc(var(--spotlight-size) * 0.5) calc(var(--spotlight-size) * 0.5) at
    calc(var(--x, 0) * 1px)
    calc(var(--y, 0) * 1px),
    ${ORANGE.secondary},
    transparent 100%
  );
}
[data-glow] [data-glow] {
  position: absolute;
  inset: 0;
  will-change: filter;
  opacity: var(--outer, 1);
  border-radius: inherit;
  border-width: calc(var(--border-size) * 20);
  filter: blur(calc(var(--border-size) * 10));
  background: none;
  pointer-events: none;
  border: none;
}
[data-glow] > [data-glow]::before {
  inset: -10px;
  border-width: 10px;
}
`;

let glowStyleInjected = false;
function ensureGlowStyle() {
  if (glowStyleInjected || typeof document === 'undefined') return;
  glowStyleInjected = true;
  const el = document.createElement('style');
  el.setAttribute('data-glow-style', '');
  el.textContent = GLOW_CSS;
  document.head.appendChild(el);
}

// Touch / coarse-pointer devices have no hover — running the pointer tracker
// is pure waste there. Compute once.
let _isCoarsePointer: boolean | null = null;
function isCoarsePointer() {
  if (_isCoarsePointer !== null) return _isCoarsePointer;
  if (typeof window === 'undefined') return false;
  _isCoarsePointer = window.matchMedia?.('(pointer: coarse)').matches ?? false;
  return _isCoarsePointer;
}

const GlowCard: React.FC<GlowCardProps> = ({
  children,
  className = '',
  size = 'md',
  width,
  height,
  customSize = false,
  singleChild = false,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ensureGlowStyle();
    // No hover on touch devices — skip the listener entirely.
    if (isCoarsePointer()) return;

    const card = cardRef.current;
    if (!card) return;

    let rafId = 0;
    let pendingX = 0;
    let pendingY = 0;

    const flush = () => {
      rafId = 0;
      card.style.setProperty('--x', pendingX.toFixed(2));
      card.style.setProperty('--y', pendingY.toFixed(2));
    };

    const onMove = (e: PointerEvent) => {
      pendingX = e.clientX;
      pendingY = e.clientY;
      if (!rafId) rafId = requestAnimationFrame(flush);
    };

    // Only listen while the pointer is actually over the card — dramatically
    // cheaper than a document-wide listener on every card.
    const onEnter = () => window.addEventListener('pointermove', onMove, { passive: true });
    const onLeave = () => {
      window.removeEventListener('pointermove', onMove);
      if (rafId) cancelAnimationFrame(rafId);
      rafId = 0;
    };

    card.addEventListener('pointerenter', onEnter);
    card.addEventListener('pointerleave', onLeave);

    return () => {
      card.removeEventListener('pointerenter', onEnter);
      card.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('pointermove', onMove);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  const getSizeClasses = () => (customSize ? '' : sizeMap[size]);

  const getInlineStyles = (): React.CSSProperties => {
    const styles: Record<string, string | number> = {
      '--border':         '3',
      '--border-size':    'calc(var(--border, 2) * 1px)',
      '--size':           '200',
      '--spotlight-size': 'calc(var(--size, 150) * 1px)',
      '--backdrop':       'hsl(0 0% 60% / 0.12)',
      '--backup-border':  'var(--backdrop)',
      '--outer':          '1',
      backgroundImage: `radial-gradient(
        var(--spotlight-size) var(--spotlight-size) at
        calc(var(--x, 0) * 1px)
        calc(var(--y, 0) * 1px),
        ${ORANGE.outerGlow},
        transparent
      )`,
      backgroundColor:    'var(--backdrop, transparent)',
      backgroundSize:     'calc(100% + (2 * var(--border-size))) calc(100% + (2 * var(--border-size)))',
      backgroundPosition: '50% 50%',
      backgroundAttachment: 'fixed',
      border:             'var(--border-size) solid var(--backup-border)',
      position:           'relative',
      touchAction:        'none',
    };
    if (width  !== undefined) styles.width  = typeof width  === 'number' ? `${width}px`  : width;
    if (height !== undefined) styles.height = typeof height === 'number' ? `${height}px` : height;
    return styles as React.CSSProperties;
  };

  return (
    <div
      ref={cardRef}
      data-glow
      style={getInlineStyles()}
      className={`
        ${getSizeClasses()}
        ${!customSize ? 'aspect-[3/4]' : ''}
        rounded-2xl
        relative
        ${singleChild ? 'block' : 'grid grid-rows-[1fr_auto]'}
        shadow-[0_1rem_2rem_-1rem_black]
        p-4
        gap-4
        backdrop-blur-[5px]
        ${className}
      `}
    >
      <div ref={innerRef} data-glow />
      {children}
    </div>
  );
};

export { GlowCard };

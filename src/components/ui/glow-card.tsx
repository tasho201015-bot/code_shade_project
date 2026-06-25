import React, { useEffect, useRef, ReactNode } from 'react';

// ---------------------------------------------------------------------------
// ORANGE NEON PALETTE — fixed hex values, no HSL hue calculations
// ---------------------------------------------------------------------------
const ORANGE = {
  primary:    '#FF6A00',           // نيون برتقالي أساسي
  secondary:  '#FF8C42',           // برتقالي ثانوي أفتح
  outerGlow:  'rgba(255,106,0,0.35)', // هالة خارجية شفافة
} as const;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface GlowCardProps {
  children: ReactNode;
  className?: string;
  /** glowColor prop محتفظ بيه للتوافق مع الكود الموجود لكن مش بيأثر على اللون */
  glowColor?: 'blue' | 'purple' | 'green' | 'red' | 'orange';
  size?: 'sm' | 'md' | 'lg';
  width?: string | number;
  height?: string | number;
  /** When true, ignores size prop and uses width/height or className */
  customSize?: boolean;
  /** When true, renders a simplified block layout sized strictly to children (no internal grid rows). */
  singleChild?: boolean;
}

const sizeMap = {
  sm: 'w-48 h-64',
  md: 'w-64 h-80',
  lg: 'w-80 h-96',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
const GlowCard: React.FC<GlowCardProps> = ({
  children,
  className = '',
  // glowColor ignored — all cards use the fixed orange neon palette
  size = 'md',
  width,
  height,
  customSize = false,
  singleChild = false,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);

  // ── pointer tracking ────────────────────────────────────────────────────
  useEffect(() => {
    const syncPointer = (e: PointerEvent) => {
      const { clientX: x, clientY: y } = e;
      if (cardRef.current) {
        cardRef.current.style.setProperty('--x', x.toFixed(2));
        cardRef.current.style.setProperty('--y', y.toFixed(2));
      }
    };
    document.addEventListener('pointermove', syncPointer);
    return () => document.removeEventListener('pointermove', syncPointer);
  }, []);

  // ── sizing ───────────────────────────────────────────────────────────────
  const getSizeClasses = () => (customSize ? '' : sizeMap[size]);

  // ── inline styles on the card wrapper ───────────────────────────────────
  const getInlineStyles = (): React.CSSProperties => {
    const styles: Record<string, string | number> = {
      // sizing tokens
      '--border':         '3',
      '--border-size':    'calc(var(--border, 2) * 1px)',
      '--size':           '200',
      '--spotlight-size': 'calc(var(--size, 150) * 1px)',
      '--backdrop':       'hsl(0 0% 60% / 0.12)',
      '--backup-border':  'var(--backdrop)',
      '--outer':          '1',

      // ── main spotlight (background of the card) ──
      // Uses fixed #FF6A00 → no hue variables at all
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

  // ── injected CSS for ::before / ::after glow layers ─────────────────────
  // border-radius: inherit  →  always follows the card's own radius
  const glowStyles = `
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

/* ── border spotlight — primary orange neon ──────────────────────────── */
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

/* ── border highlight — secondary orange (softer rim light) ─────────── */
[data-glow]::after {
  background-image: radial-gradient(
    calc(var(--spotlight-size) * 0.5) calc(var(--spotlight-size) * 0.5) at
    calc(var(--x, 0) * 1px)
    calc(var(--y, 0) * 1px),
    ${ORANGE.secondary},
    transparent 100%
  );
}

/* ── inner glow div (blur bloom) ────────────────────────────────────── */
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

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: glowStyles }} />
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
    </>
  );
};

export { GlowCard };

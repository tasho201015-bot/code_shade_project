import React, { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface StarButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  lightWidth?: number;
  duration?: number;
  lightColor?: string;
  backgroundColor?: string;
  borderWidth?: number;
}

export function StarButton({
  children,
  lightWidth = 110,
  duration = 3,
  lightColor = "#FAFAFA",
  backgroundColor = "#141413",
  borderWidth = 2,
  className,
  style,
  ...props
}: StarButtonProps) {
  const pathRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const apply = () => {
      const el = pathRef.current;
      if (!el) return;
      el.style.setProperty(
        "--sb-path",
        `path('M 0 0 H ${el.offsetWidth} V ${el.offsetHeight} H 0 V 0')`,
      );
    };
    apply();
    window.addEventListener("resize", apply);
    return () => window.removeEventListener("resize", apply);
  }, []);

  const mergedStyle: CSSProperties = {
    backgroundColor,
    color: lightColor,
    ...style,
  };

  return (
    <button
      style={mergedStyle}
      className={cn(
        "relative isolate inline-flex w-full items-center justify-center overflow-hidden rounded-sm",
        "px-8 py-4 text-xs uppercase tracking-[0.22em] font-medium",
        "transition-transform duration-300 hover:-translate-y-0.5 active:translate-y-0",
        "disabled:opacity-60 disabled:pointer-events-none disabled:hover:translate-y-0",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:ring-ring",
        className,
      )}
      {...props}
    >
      {/* Light track wrapper — sits between bg and inner mask */}
      <span
        ref={pathRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-sm"
      >
        <span
          className="absolute block"
          style={{
            width: `${lightWidth}px`,
            height: `${lightWidth}px`,
            top: `${-lightWidth / 2}px`,
            left: `${-lightWidth / 2}px`,
            background: `radial-gradient(circle, ${lightColor} 0%, transparent 60%)`,
            offsetPath: "var(--sb-path)",
            // @ts-expect-error vendor prefix
            WebkitOffsetPath: "var(--sb-path)",
            animation: `sb-travel ${duration}s linear infinite`,
          }}
        />
      </span>

      {/* Inner mask — leaves only a borderWidth-thick halo visible */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute z-[1] rounded-[2px]"
        style={{
          top: `${borderWidth}px`,
          right: `${borderWidth}px`,
          bottom: `${borderWidth}px`,
          left: `${borderWidth}px`,
          backgroundColor,
        }}
      />

      <span className="relative z-10 inline-flex items-center justify-center gap-2">
        {children}
      </span>

      <style>{`
        @keyframes sb-travel {
          to { offset-distance: 100%; }
        }
      `}</style>
    </button>
  );
}

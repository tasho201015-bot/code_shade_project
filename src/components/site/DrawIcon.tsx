import { useEffect, useRef, useState, type ReactNode } from "react";

interface Props {
  children: ReactNode; // svg content (paths, etc)
  className?: string;
  size?: number;
}

/** SVG line icon with redraw animation on view + hover. */
export function DrawIcon({ children, className = "", size = 40 }: Props) {
  const ref = useRef<SVGSVGElement | null>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            replay();
            obs.disconnect();
          }
        });
      },
      { threshold: 0.3 },
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, []);

  const replay = () => {
    setActive(false);
    requestAnimationFrame(() => requestAnimationFrame(() => setActive(true)));
  };

  return (
    <svg
      ref={ref}
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`icon-draw ${active ? "animate" : ""} ${className}`}
      onMouseEnter={replay}
    >
      {children}
    </svg>
  );
}

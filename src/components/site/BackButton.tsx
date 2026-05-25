import { Link, useLocation } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

export function BackButton() {
  const location = useLocation();

  if (location.pathname === "/") return null;

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-10 pt-24 pb-2">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors duration-200 group"
      >
        <ArrowLeft className="w-4 h-4 transition-transform duration-200 group-hover:-translate-x-0.5" />
        <span>Home</span>
      </Link>
    </div>
  );
}

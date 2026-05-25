import p3 from "@/assets/product-3.webp";
import p4 from "@/assets/product-4.webp";
import p6 from "@/assets/product-6.webp";
import p7 from "@/assets/product-7.webp";

const map: Record<string, string> = {
  "/src/assets/product-3.png": p3,
  "/src/assets/product-4.png": p4,
  "/src/assets/product-6.png": p6,
  "/src/assets/product-7.png": p7,
  "/src/assets/product-3.webp": p3,
  "/src/assets/product-4.webp": p4,
  "/src/assets/product-6.webp": p6,
  "/src/assets/product-7.webp": p7,
};

export function resolveImage(url: string | null | undefined): string {
  if (!url) return p3;
  if (map[url]) return map[url];
  return url;
}

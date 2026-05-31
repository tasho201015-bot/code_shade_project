import { createFileRoute } from "@tanstack/react-router";
import { ProductsPage } from "./selling.products";

export const Route = createFileRoute("/admin/sales-booster/products")({
  component: ProductsPage,
});

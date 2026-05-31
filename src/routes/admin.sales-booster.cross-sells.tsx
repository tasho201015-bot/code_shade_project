import { createFileRoute } from "@tanstack/react-router";
import { CrossSellsPage } from "./selling.cross-sells";

export const Route = createFileRoute("/admin/sales-booster/cross-sells")({
  component: CrossSellsPage,
});

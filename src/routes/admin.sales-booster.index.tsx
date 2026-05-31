import { createFileRoute } from "@tanstack/react-router";
import { SellingDashboard } from "./selling.index";

export const Route = createFileRoute("/admin/sales-booster/")({
  component: SellingDashboard,
});

import { createFileRoute } from "@tanstack/react-router";
import { UpsellsPage } from "./selling.upsells";

export const Route = createFileRoute("/admin/sales-booster/upsells")({
  component: UpsellsPage,
});

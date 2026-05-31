import { createFileRoute } from "@tanstack/react-router";
import { BundlesPage } from "./selling.bundles";

export const Route = createFileRoute("/admin/sales-booster/bundles")({
  component: BundlesPage,
});

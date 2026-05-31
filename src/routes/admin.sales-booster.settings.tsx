import { createFileRoute } from "@tanstack/react-router";
import { SettingsPage } from "./selling.settings";

export const Route = createFileRoute("/admin/sales-booster/settings")({
  component: SettingsPage,
});

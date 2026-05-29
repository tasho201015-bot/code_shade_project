import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/admin-team")({
  beforeLoad: () => {
    throw redirect({ to: "/admin" });
  },
  component: () => null,
});

import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_sidebar/profile")({
  component: () => <Navigate to="/dashboard" />,
});

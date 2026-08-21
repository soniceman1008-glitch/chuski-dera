import { createFileRoute } from "@tanstack/react-router";
import { AdminLoginCard } from "@/components/admin/login-card";

export const Route = createFileRoute("/login")({ component: AdminLoginCard });

import { redirect } from "next/navigation";
import type { Session } from "next-auth";

// Simple helper: check if a session has a role
export function hasRole(session: Session | null, role: string) {
  return session?.user?.roles?.includes(role) ?? false;
}

// Guard helper: only allow users with at least one of the required roles
export function requireRole(session: Session | null, roles: string[]) {
  const userRoles = session?.user?.roles ?? [];
  const ok = roles.some((r) => userRoles.includes(r));
  if (!ok) redirect("/unauthorized");
}

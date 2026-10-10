"use client";

import { useAuth } from "@/hooks/use-auth";
import type { Role } from "@/types";

/**
 * UI-level conditional rendering by role — used to hide/show nav links,
 * buttons, and sections that only make sense for certain roles. Not a
 * security boundary on its own (see middleware.ts and the backend's
 * `auth(...roles)` for the real enforcement); this exists purely so the
 * UI doesn't show actions a role has no permission to use.
 */
export function RoleGate({
  allow,
  children,
  fallback = null,
}: {
  allow: Role[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { user } = useAuth();
  if (!user) return fallback;
  if (!allow.includes(user.role)) return fallback;
  return <>{children}</>;
}

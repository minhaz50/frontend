"use client";

import { usePathname } from "next/navigation";
import {
  LayoutDashboardIcon,
  ScrollTextIcon,
  ShieldAlertIcon,
  UsersIcon,
} from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { EmptyState } from "@/components/shared/empty-state";
import { useAuth } from "@/hooks/use-auth";

const ALL_ITEMS = [
  {
    href: "/admin",
    label: "Overview",
    icon: LayoutDashboardIcon,
    adminOnly: false,
  },
  {
    href: "/admin/manage",
    label: "Manage Users",
    icon: UsersIcon,
    adminOnly: true,
  },
  {
    href: "/admin/reports",
    label: "Audit Logs",
    icon: ScrollTextIcon,
    adminOnly: true,
  },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const pathname = usePathname();

  // The backend only lets ADMIN / SUPER_ADMIN use user management and audit
  // logs, so other staff roles shouldn't see links that would just fail.
  const isFullAdmin = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";
  const navItems = ALL_ITEMS.filter((item) => isFullAdmin || !item.adminOnly);
  const blocked = !!user && !isFullAdmin && pathname !== "/admin";

  return (
    <DashboardShell
      navItems={navItems}
      allowedRoles={["ADMIN", "SUPER_ADMIN", "OPS_MANAGER", "HUB_MANAGER"]}
    >
      {blocked ? (
        <EmptyState
          icon={ShieldAlertIcon}
          title="Admins only"
          description="Your role doesn't have access to this page."
        />
      ) : (
        children
      )}
    </DashboardShell>
  );
}

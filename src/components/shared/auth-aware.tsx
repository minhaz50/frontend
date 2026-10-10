"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { ROLE_HOME } from "@/lib/constants";

type ButtonProps = Omit<React.ComponentProps<typeof Button>, "asChild" | "onClick">;

/**
 * Public pages are mostly Server Components, so they can't know whether
 * a visitor is signed in. This tiny client island is the one place that
 * does: guests are sent to /register, customers go straight to the
 * booking wizard, and other roles (who can't book shipments) go to
 * their own dashboard instead of being bounced around by middleware.
 *
 * Before the auth store has hydrated it renders the guest variant, so the
 * server HTML and first client render always match.
 */
export function BookShipmentButton({
  children,
  loggedInLabel,
  guestHref = "/register",
  ...props
}: ButtonProps & { loggedInLabel?: React.ReactNode; guestHref?: string }) {
  const { user, isHydrated } = useAuth();
  const activeUser = isHydrated ? user : null;

  let href = guestHref;
  let label = children;

  if (activeUser) {
    if (activeUser.role === "CUSTOMER") {
      href = "/dashboard/new";
      label = loggedInLabel ?? children;
    } else {
      href = ROLE_HOME[activeUser.role] ?? "/";
      label = "Go to Dashboard";
    }
  }

  return (
    <Button asChild {...props}>
      <Link href={href}>{label}</Link>
    </Button>
  );
}

/** Renders children only for visitors who are not signed in. */
export function GuestOnly({ children }: { children: React.ReactNode }) {
  const { user, isHydrated } = useAuth();
  if (isHydrated && user) return null;
  return <>{children}</>;
}

import type { Metadata } from "next";
import { AppProviders } from "@/providers/app-providers";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "parceloHub Couriers — Courier & Logistics Management",
    template: "%s | parceloHub Couriers",
  },
  description:
    "Book pickups, track parcels in real time, and manage hub-to-hub logistics with parceloHub's courier platform.",
  openGraph: {
    title: "parceloHub Couriers",
    description:
      "Reliable courier and logistics management across every hub in the network.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col font-sans">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}

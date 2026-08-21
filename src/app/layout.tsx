import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import SB_DashboardShell from "@/components/layout/SB_DashboardShell";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SocialBoost Dashboard",
  description: "Social media analytics dashboard for marketing agencies",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full">
        <SB_DashboardShell>{children}</SB_DashboardShell>
      </body>
    </html>
  );
}

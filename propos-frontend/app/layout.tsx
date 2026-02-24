import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { DM_Sans } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Relayne | AI Property Operations Coordinator",
  description:
    "Relayne handles vendor dispatch, tenant communication, and compliance work, end-to-end and autonomously.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geist.variable} ${geistMono.variable} ${dmSans.variable} font-sans antialiased`}
        style={
          {
            "--font-display": "var(--font-geist), sans-serif",
            "--font-body": "var(--font-dm-sans), sans-serif",
            "--font-mono": "var(--font-geist-mono), monospace",
          } as React.CSSProperties
        }
      >
        <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
      </body>
    </html>
  );
}

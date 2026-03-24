import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Agent Systems — Automate your business 24/7 | UAE & Saudi Arabia",
  description:
    "Done-for-you AI agent deployment for SMBs in the UAE and Saudi Arabia. WhatsApp agents, sales automation, content creation — live in under 2 weeks.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className="grain overflow-x-hidden">{children}</body>
    </html>
  );
}

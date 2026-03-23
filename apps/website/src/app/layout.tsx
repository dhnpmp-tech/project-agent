import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Agent Systems — UAE & Saudi Arabia",
  description:
    "Done-for-you AI agent deployment for SMBs and solopreneurs in the UAE and Saudi Arabia. WhatsApp agents, sales automation, content creation, and more.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

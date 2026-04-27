import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Agent Dashboard",
  description: "Monitor and manage your AI agents",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-palette="midnight">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      </head>
      <body>{children}</body>
    </html>
  );
}

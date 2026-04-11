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
      <body className="grain overflow-x-hidden">
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.__kapsoConfig = {
                clientId: '3bd50557-6680-43b9-bb8e-261c7f8a19d2',
                color: '#10b981',
                personaName: 'Nadia',
                greeting: 'Hi! I am Nadia from Saffron Kitchen. Want to see how our AI works? Ask me anything.',
                lang: 'en',
                theme: 'dark',
                apiBase: 'https://n8n.dcp.sa'
              };
            `,
          }}
        />
        <script src="https://n8n.dcp.sa/static/widget.js" defer />
      </body>
    </html>
  );
}

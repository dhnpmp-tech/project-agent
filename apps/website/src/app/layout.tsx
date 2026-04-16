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
                clientId: 'bde4efa3-33a2-42a4-ba2c-e803a09aa936',
                color: '#10b981',
                personaName: 'Rami',
                greeting: 'Ahlan! I\\'m Rami, CEO of AI Agent Systems. Curious how AI agents can run your customer service 24/7? Ask me anything.',
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

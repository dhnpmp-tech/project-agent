"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase-client";

/* ------------------------------------------------------------------ */
/*  API base                                                           */
/* ------------------------------------------------------------------ */

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "https://n8n.srv1328172.hstgr.cloud";

async function apiFetch<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE}${path}`);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type ChannelStatus = "active" | "inactive" | "setup_needed";

interface ChannelInfo {
  id: string;
  name: string;
  icon: React.ReactNode;
  status: ChannelStatus;
  messagesThisWeek: number;
  detail: string;
  description: string;
  actionLabel: string;
  actionHref: string;
  comingSoon?: boolean;
  color: string;
  bgColor: string;
  embedCode?: string;
}

/* ------------------------------------------------------------------ */
/*  Icons                                                              */
/* ------------------------------------------------------------------ */

const WhatsAppIcon = (
  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
  </svg>
);

const WidgetIcon = (
  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5" />
  </svg>
);

const TelegramIcon = (
  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
  </svg>
);

const InstagramIcon = (
  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 1 0 0-12.324zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405a1.441 1.441 0 1 1-2.882 0 1.441 1.441 0 0 1 2.882 0z" />
  </svg>
);

/* ------------------------------------------------------------------ */
/*  Status Badge                                                       */
/* ------------------------------------------------------------------ */

function StatusBadge({ status }: { status: ChannelStatus }) {
  const styles: Record<ChannelStatus, { bg: string; text: string; dot: string; label: string }> = {
    active: {
      bg: "bg-green-50",
      text: "text-green-700",
      dot: "bg-green-500",
      label: "Connected",
    },
    inactive: {
      bg: "bg-gray-50",
      text: "text-gray-600",
      dot: "bg-gray-400",
      label: "Not Connected",
    },
    setup_needed: {
      bg: "bg-amber-50",
      text: "text-amber-700",
      dot: "bg-amber-500",
      label: "Setup Needed",
    },
  };

  const s = styles[status];

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${s.bg} ${s.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Channel Card                                                       */
/* ------------------------------------------------------------------ */

function ChannelCard({ channel }: { channel: ChannelInfo }) {
  const [showEmbed, setShowEmbed] = useState(false);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 transition-all hover:shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-xl ${channel.bgColor} ${channel.color} shrink-0`}
          >
            {channel.icon}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-gray-900">{channel.name}</h3>
              {channel.comingSoon && (
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
                  Coming Soon
                </span>
              )}
            </div>
            <StatusBadge status={channel.status} />
            <p className="text-sm text-gray-500 mt-2">{channel.description}</p>
            {channel.detail && (
              <p className="text-sm text-gray-700 mt-1 font-mono">{channel.detail}</p>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
        <div className="flex items-center gap-4">
          <div>
            <p className="text-lg font-bold text-gray-900">{channel.messagesThisWeek}</p>
            <p className="text-xs text-gray-500">messages this week</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {channel.embedCode && (
            <button
              onClick={() => setShowEmbed(!showEmbed)}
              className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              {showEmbed ? "Hide Code" : "Embed Code"}
            </button>
          )}
          <a
            href={channel.actionHref}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              channel.status === "active"
                ? "border border-gray-200 text-gray-700 hover:bg-gray-50"
                : channel.comingSoon
                  ? "border border-gray-200 text-gray-400 cursor-not-allowed"
                  : "bg-brand-600 text-white hover:bg-brand-700"
            }`}
            onClick={(e) => channel.comingSoon && e.preventDefault()}
          >
            {channel.actionLabel}
          </a>
        </div>
      </div>

      {/* Embed code snippet */}
      {showEmbed && channel.embedCode && (
        <div className="mt-4 rounded-lg bg-gray-900 p-4 relative">
          <button
            onClick={() => {
              navigator.clipboard.writeText(channel.embedCode!);
            }}
            className="absolute top-2 right-2 rounded-md bg-gray-700 px-2 py-1 text-xs text-gray-300 hover:bg-gray-600 transition-colors"
          >
            Copy
          </button>
          <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap break-all leading-relaxed">
            {channel.embedCode}
          </pre>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

export default function ChannelsPage() {
  const [clientId, setClientId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [channelStats, setChannelStats] = useState<Record<string, number>>({});

  // Resolve client_id
  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("clients")
      .select("id")
      .single()
      .then(({ data }) => {
        if (data?.id) setClientId(data.id);
      });
  }, []);

  // Fetch channel stats
  useEffect(() => {
    if (!clientId) {
      setLoading(false);
      return;
    }
    apiFetch<{ channels: Array<{ channel: string; count: number }> }>(
      `/chat/channels/${clientId}?days=7`
    ).then((res) => {
      if (res?.channels) {
        const stats: Record<string, number> = {};
        res.channels.forEach((ch) => {
          stats[ch.channel.toLowerCase()] = ch.count;
        });
        setChannelStats(stats);
      }
      setLoading(false);
    });
  }, [clientId]);

  const widgetEmbedCode = `<script
  src="https://cdn.kapso.ai/widget.js"
  data-client-id="${clientId || "YOUR_CLIENT_ID"}"
  data-theme="dark"
  data-position="bottom-right"
  async>
</script>`;

  const channels: ChannelInfo[] = [
    {
      id: "whatsapp",
      name: "WhatsApp",
      icon: WhatsAppIcon,
      status: channelStats["whatsapp"] ? "active" : "setup_needed",
      messagesThisWeek: channelStats["whatsapp"] || 0,
      detail: "+971 XX XXX XXXX",
      description:
        "Your primary customer channel. AI handles FAQ, bookings, complaints, and lead qualification automatically.",
      actionLabel: channelStats["whatsapp"] ? "Configure" : "Connect",
      actionHref: "/dashboard/whatsapp",
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      id: "widget",
      name: "Website Widget",
      icon: WidgetIcon,
      status: channelStats["widget"] ? "active" : "inactive",
      messagesThisWeek: channelStats["widget"] || 0,
      detail: "",
      description:
        "Embed a chat widget on your website. Customers can talk to your AI agent without leaving your site.",
      actionLabel: channelStats["widget"] ? "Configure" : "Add to Website",
      actionHref: "/dashboard/widget",
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      embedCode: widgetEmbedCode,
    },
    {
      id: "telegram",
      name: "Telegram",
      icon: TelegramIcon,
      status: channelStats["telegram"] ? "active" : "inactive",
      messagesThisWeek: channelStats["telegram"] || 0,
      detail: channelStats["telegram"] ? "@your_bot" : "",
      description:
        "Connect a Telegram bot to reach customers on Telegram. Same AI brain, different channel.",
      actionLabel: channelStats["telegram"] ? "Configure" : "Connect",
      actionHref: "#",
      color: "text-sky-600",
      bgColor: "bg-sky-50",
    },
    {
      id: "instagram",
      name: "Instagram DM",
      icon: InstagramIcon,
      status: "inactive",
      messagesThisWeek: 0,
      detail: "",
      description:
        "Let your AI agent respond to Instagram DMs. Auto-reply to inquiries, take bookings from DMs.",
      actionLabel: "Coming Soon",
      actionHref: "#",
      comingSoon: true,
      color: "text-pink-600",
      bgColor: "bg-pink-50",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-1">
            <a href="/dashboard" className="text-sm text-gray-400 hover:text-gray-600">
              Dashboard
            </a>
            <span className="text-gray-300">/</span>
            <span className="text-sm text-gray-600">Channels</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900">Channels</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage how customers reach your AI agent
          </p>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {loading && (
          <div className="h-0.5 w-full bg-gray-100 rounded overflow-hidden mb-6">
            <div className="h-full w-1/3 bg-brand-500 rounded animate-pulse" />
          </div>
        )}

        {/* Summary bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {channels.map((ch) => (
            <div key={ch.id} className="rounded-lg border border-gray-200 bg-white p-3 flex items-center gap-3">
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${ch.bgColor} ${ch.color} shrink-0`}>
                {ch.icon}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900">{ch.messagesThisWeek}</p>
                <p className="text-xs text-gray-500 truncate">{ch.name}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Channel cards */}
        <div className="space-y-4">
          {channels.map((ch) => (
            <ChannelCard key={ch.id} channel={ch} />
          ))}
        </div>
      </main>
    </div>
  );
}

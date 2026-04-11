"use client";

import { useState, useEffect, useCallback } from "react";

/* ------------------------------------------------------------------ */
/*  Constants & Types                                                  */
/* ------------------------------------------------------------------ */

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "https://n8n.srv1328172.hstgr.cloud";

const CLIENT_ID = "default"; // resolved from auth in production

type Platform = "instagram" | "tiktok" | "google";
type Pillar = "brand" | "educational" | "community";
type CaptionStyle = "casual" | "formal" | "storytelling";
type Language = "en" | "ar";
type Difficulty = "easy" | "medium" | "hard";
type Urgency = "today" | "this week" | "this month";

interface CalendarPost {
  id: string;
  title: string;
  platform: Platform;
  pillar: Pillar;
  time?: string;
}

interface CalendarDay {
  date: string;
  dayLabel: string;
  posts: CalendarPost[];
}

interface GeneratedCaption {
  caption: string;
  hashtags: string[];
}

interface PostIdea {
  id: string;
  title: string;
  concept: string;
  platform: Platform;
  pillar: Pillar;
  difficulty: Difficulty;
  why_it_works: string;
}

interface TrendingTopic {
  id: string;
  topic: string;
  description: string;
  urgency: Urgency;
  location: string;
}

interface HashtagGroup {
  label: string;
  key: string;
  hashtags: string[];
}

/* ------------------------------------------------------------------ */
/*  Pillar / Platform / Difficulty config                              */
/* ------------------------------------------------------------------ */

const PILLAR_CONFIG: Record<Pillar, { bg: string; text: string; label: string }> = {
  brand:       { bg: "bg-emerald-500/20", text: "text-emerald-400", label: "Brand" },
  educational: { bg: "bg-blue-500/20",    text: "text-blue-400",    label: "Educational" },
  community:   { bg: "bg-amber-500/20",   text: "text-amber-400",   label: "Community" },
};

const PLATFORM_CONFIG: Record<Platform, { bg: string; text: string; label: string; icon: string }> = {
  instagram: { bg: "bg-pink-500/20",   text: "text-pink-400",   label: "Instagram", icon: "IG" },
  tiktok:    { bg: "bg-cyan-500/20",   text: "text-cyan-400",   label: "TikTok",    icon: "TT" },
  google:    { bg: "bg-yellow-500/20", text: "text-yellow-400", label: "Google",     icon: "G" },
};

const DIFFICULTY_CONFIG: Record<Difficulty, { bg: string; text: string }> = {
  easy:   { bg: "bg-green-500/20",  text: "text-green-400" },
  medium: { bg: "bg-yellow-500/20", text: "text-yellow-400" },
  hard:   { bg: "bg-red-500/20",    text: "text-red-400" },
};

const URGENCY_CONFIG: Record<Urgency, { bg: string; text: string; dot: string }> = {
  "today":      { bg: "bg-red-500/20",    text: "text-red-400",    dot: "bg-red-400" },
  "this week":  { bg: "bg-amber-500/20",  text: "text-amber-400",  dot: "bg-amber-400" },
  "this month": { bg: "bg-surface-600/60", text: "text-surface-400", dot: "bg-surface-400" },
};

/* ------------------------------------------------------------------ */
/*  Placeholder data (used when API is unreachable)                    */
/* ------------------------------------------------------------------ */

const PLACEHOLDER_CALENDAR: CalendarDay[] = (() => {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());

  return days.map((d, i) => {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + i);
    return {
      date: date.toISOString().split("T")[0],
      dayLabel: d,
      posts: [],
    };
  });
})();

/* ------------------------------------------------------------------ */
/*  Badge components                                                   */
/* ------------------------------------------------------------------ */

function PlatformBadge({ platform }: { platform: Platform }) {
  const c = PLATFORM_CONFIG[platform];
  return (
    <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${c.bg} ${c.text}`}>
      {c.icon}
    </span>
  );
}

function PillarBadge({ pillar }: { pillar: Pillar }) {
  const c = PILLAR_CONFIG[pillar];
  return (
    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  );
}

function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  const c = DIFFICULTY_CONFIG[difficulty];
  return (
    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium capitalize ${c.bg} ${c.text}`}>
      {difficulty}
    </span>
  );
}

function UrgencyBadge({ urgency }: { urgency: Urgency }) {
  const c = URGENCY_CONFIG[urgency];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${c.bg} ${c.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
      {urgency}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Copy button                                                        */
/* ------------------------------------------------------------------ */

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1 rounded-md border border-surface-700 bg-surface-800 px-2.5 py-1 text-xs font-medium text-surface-300 hover:bg-surface-700 hover:text-surface-200 transition-colors"
    >
      {copied ? (
        <>
          <CheckIcon />
          Copied
        </>
      ) : (
        <>
          <ClipboardIcon />
          {label || "Copy"}
        </>
      )}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Inline SVG icons                                                   */
/* ------------------------------------------------------------------ */

function ClipboardIcon() {
  return (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9.75a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="h-3.5 w-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
    </svg>
  );
}

function SparklesIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 9v9.75" />
    </svg>
  );
}

function HashIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 8.25h15m-16.5 7.5h15m-1.8-13.5-3.6 19.5m-2.1-19.5-3.6 19.5" />
    </svg>
  );
}

function FireIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 0 0 .495-7.468 5.99 5.99 0 0 0-1.925 3.547 5.975 5.975 0 0 1-2.133-1.001A3.75 3.75 0 0 0 12 18Z" />
    </svg>
  );
}

function LightbulbIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.383a14.406 14.406 0 0 1-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 1 0-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Section wrapper                                                    */
/* ------------------------------------------------------------------ */

function Section({
  title,
  icon,
  children,
  action,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-surface-800 bg-surface-900 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-surface-200">
          {icon}
          <h2 className="text-sm font-semibold">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  1. Content Calendar View                                           */
/* ------------------------------------------------------------------ */

function ContentCalendar() {
  const [calendar, setCalendar] = useState<CalendarDay[]>(PLACEHOLDER_CALENDAR);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);

  const fetchCalendar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/content/calendar/${CLIENT_ID}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setCalendar(data);
          setGenerated(true);
        }
      }
    } catch {
      // API unreachable — keep placeholder
    } finally {
      setLoading(false);
    }
  }, []);

  const generateCalendar = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/content/calendar/${CLIENT_ID}`, {
        method: "GET",
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setCalendar(data);
          setGenerated(true);
        }
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalendar();
  }, [fetchCalendar]);

  const today = new Date().toISOString().split("T")[0];

  return (
    <Section
      title="Content Calendar"
      icon={<CalendarIcon />}
      action={
        <button
          onClick={generateCalendar}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors"
        >
          {loading ? <Spinner /> : <SparklesIcon />}
          {loading ? "Generating..." : "Generate Calendar"}
        </button>
      }
    >
      <div className="grid grid-cols-7 gap-2">
        {calendar.map((day) => {
          const isToday = day.date === today;
          return (
            <div
              key={day.date}
              className={`min-h-[140px] rounded-lg border p-2.5 transition-colors ${
                isToday
                  ? "border-emerald-500/50 bg-emerald-500/5"
                  : "border-surface-800 bg-surface-950/50 hover:border-surface-700"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-semibold ${isToday ? "text-emerald-400" : "text-surface-400"}`}>
                  {day.dayLabel}
                </span>
                <span className={`text-[10px] ${isToday ? "text-emerald-500" : "text-surface-600"}`}>
                  {day.date.split("-").slice(1).join("/")}
                </span>
              </div>
              <div className="space-y-1.5">
                {day.posts.map((post) => (
                  <div
                    key={post.id}
                    className="rounded-md bg-surface-800/80 px-2 py-1.5 group cursor-default"
                  >
                    <p className="text-[11px] font-medium text-surface-200 leading-tight mb-1 line-clamp-2">
                      {post.title}
                    </p>
                    <div className="flex items-center gap-1">
                      <PlatformBadge platform={post.platform} />
                      <PillarBadge pillar={post.pillar} />
                    </div>
                  </div>
                ))}
                {day.posts.length === 0 && generated && (
                  <p className="text-[10px] text-surface-600 italic">No posts</p>
                )}
                {day.posts.length === 0 && !generated && (
                  <p className="text-[10px] text-surface-600 italic">
                    Click Generate
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/*  2. Caption Generator                                               */
/* ------------------------------------------------------------------ */

function CaptionGenerator() {
  const [topic, setTopic] = useState("");
  const [style, setStyle] = useState<CaptionStyle>("casual");
  const [platform, setPlatform] = useState<Platform>("instagram");
  const [lang, setLang] = useState<Language>("en");
  const [result, setResult] = useState<GeneratedCaption | null>(null);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`${API_BASE}/content/caption/${CLIENT_ID}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, style, lang, platform }),
      });
      if (res.ok) {
        const data = await res.json();
        setResult(data);
      }
    } catch {
      // API unreachable
    } finally {
      setLoading(false);
    }
  };

  const selectClasses =
    "w-full rounded-lg border border-surface-700 bg-surface-800 px-3 py-2 text-sm text-surface-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none transition-colors appearance-none";

  return (
    <Section title="Caption Generator" icon={<SparklesIcon />}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Topic input */}
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-surface-400 mb-1.5">
            Topic
          </label>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. Weekend brunch special, New menu launch..."
            className="w-full rounded-lg border border-surface-700 bg-surface-800 px-3 py-2.5 text-sm text-surface-200 placeholder:text-surface-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none transition-colors"
            onKeyDown={(e) => e.key === "Enter" && generate()}
          />
        </div>

        {/* Style */}
        <div>
          <label className="block text-xs font-medium text-surface-400 mb-1.5">
            Style
          </label>
          <select
            value={style}
            onChange={(e) => setStyle(e.target.value as CaptionStyle)}
            className={selectClasses}
          >
            <option value="casual">Casual</option>
            <option value="formal">Formal</option>
            <option value="storytelling">Storytelling</option>
          </select>
        </div>

        {/* Platform */}
        <div>
          <label className="block text-xs font-medium text-surface-400 mb-1.5">
            Platform
          </label>
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value as Platform)}
            className={selectClasses}
          >
            <option value="instagram">Instagram</option>
            <option value="tiktok">TikTok</option>
            <option value="google">Google</option>
          </select>
        </div>

        {/* Language toggle */}
        <div className="md:col-span-2 flex items-center gap-3">
          <label className="text-xs font-medium text-surface-400">Language</label>
          <div className="inline-flex rounded-lg border border-surface-700 overflow-hidden">
            <button
              onClick={() => setLang("en")}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                lang === "en"
                  ? "bg-emerald-600 text-white"
                  : "bg-surface-800 text-surface-400 hover:text-surface-200"
              }`}
            >
              EN
            </button>
            <button
              onClick={() => setLang("ar")}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                lang === "ar"
                  ? "bg-emerald-600 text-white"
                  : "bg-surface-800 text-surface-400 hover:text-surface-200"
              }`}
            >
              AR
            </button>
          </div>
        </div>
      </div>

      <button
        onClick={generate}
        disabled={loading || !topic.trim()}
        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? <Spinner /> : <SparklesIcon />}
        {loading ? "Generating..." : "Generate Caption"}
      </button>

      {/* Result */}
      {result && (
        <div className="mt-5 space-y-3">
          <div className="rounded-lg border border-surface-700 bg-surface-950 p-4">
            <div className="flex items-start justify-between gap-3 mb-3">
              <p
                className={`text-sm leading-relaxed ${
                  lang === "ar" ? "text-right font-arabic" : ""
                } text-surface-200`}
                dir={lang === "ar" ? "rtl" : "ltr"}
              >
                {result.caption}
              </p>
              <CopyButton text={result.caption} label="Copy" />
            </div>
            {result.hashtags.length > 0 && (
              <div className="border-t border-surface-800 pt-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-surface-500">
                    Hashtags
                  </span>
                  <CopyButton
                    text={result.hashtags.map((h) => `#${h}`).join(" ")}
                    label="Copy All"
                  />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {result.hashtags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => navigator.clipboard.writeText(`#${tag}`)}
                      className="rounded-md bg-surface-800 px-2 py-1 text-xs text-emerald-400 hover:bg-surface-700 transition-colors cursor-pointer"
                    >
                      #{tag}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/*  3. Post Ideas                                                      */
/* ------------------------------------------------------------------ */

function PostIdeas() {
  const [ideas, setIdeas] = useState<PostIdea[]>([]);
  const [loading, setLoading] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const fetchIdeas = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `${API_BASE}/content/ideas/${CLIENT_ID}?business_type=restaurant&count=5`
      );
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setIdeas(data);
      }
    } catch {
      // API unreachable
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIdeas();
  }, [fetchIdeas]);

  return (
    <Section
      title="Post Ideas"
      icon={<LightbulbIcon />}
      action={
        <button
          onClick={fetchIdeas}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-surface-700 bg-surface-800 px-3 py-1.5 text-xs font-medium text-surface-300 hover:bg-surface-700 disabled:opacity-50 transition-colors"
        >
          {loading ? <Spinner /> : null}
          {loading ? "Loading..." : "Refresh Ideas"}
        </button>
      }
    >
      {ideas.length === 0 && !loading && (
        <p className="text-sm text-surface-500 text-center py-8">
          No ideas loaded yet. Connect to the API or click Refresh.
        </p>
      )}
      {loading && ideas.length === 0 && (
        <div className="flex items-center justify-center py-8">
          <Spinner />
          <span className="ml-2 text-sm text-surface-400">Loading ideas...</span>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {ideas.map((idea) => (
          <div
            key={idea.id}
            className="relative rounded-lg border border-surface-800 bg-surface-950/50 p-4 hover:border-surface-600 transition-colors"
            onMouseEnter={() => setHoveredId(idea.id)}
            onMouseLeave={() => setHoveredId(null)}
          >
            <h3 className="text-sm font-semibold text-surface-200 mb-1.5 leading-tight">
              {idea.title}
            </h3>
            <p className="text-xs text-surface-400 mb-3 line-clamp-2 leading-relaxed">
              {idea.concept}
            </p>
            <div className="flex items-center gap-1.5 flex-wrap">
              <PlatformBadge platform={idea.platform} />
              <PillarBadge pillar={idea.pillar} />
              <DifficultyBadge difficulty={idea.difficulty} />
            </div>

            {/* "Why it works" tooltip */}
            {hoveredId === idea.id && idea.why_it_works && (
              <div className="absolute z-10 bottom-full left-0 right-0 mb-2 rounded-lg border border-emerald-500/30 bg-surface-900 p-3 shadow-xl shadow-black/30">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400 mb-1">
                  Why it works
                </p>
                <p className="text-xs text-surface-300 leading-relaxed">
                  {idea.why_it_works}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/*  4. Trending Topics                                                 */
/* ------------------------------------------------------------------ */

function TrendingTopics() {
  const [topics, setTopics] = useState<TrendingTopic[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTrending = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/content/trending?location=UAE`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setTopics(data);
      }
    } catch {
      // API unreachable
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrending();
  }, [fetchTrending]);

  return (
    <Section title="Trending in UAE/KSA" icon={<FireIcon />}>
      {topics.length === 0 && !loading && (
        <p className="text-sm text-surface-500 text-center py-6">
          No trending topics available. Connect to the API.
        </p>
      )}
      {loading && (
        <div className="flex items-center justify-center py-6">
          <Spinner />
          <span className="ml-2 text-sm text-surface-400">Loading trends...</span>
        </div>
      )}
      <div className="space-y-2">
        {topics.map((t) => (
          <div
            key={t.id}
            className="flex items-start justify-between gap-3 rounded-lg border border-surface-800 bg-surface-950/50 px-4 py-3 hover:border-surface-600 transition-colors"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-surface-200 truncate">
                {t.topic}
              </p>
              <p className="text-xs text-surface-500 mt-0.5 line-clamp-1">
                {t.description}
              </p>
            </div>
            <UrgencyBadge urgency={t.urgency} />
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/*  5. Hashtag Strategy                                                */
/* ------------------------------------------------------------------ */

function HashtagStrategy() {
  const [groups, setGroups] = useState<HashtagGroup[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchHashtags = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `${API_BASE}/content/hashtags?business_type=restaurant&location=Dubai`
      );
      if (res.ok) {
        const data = await res.json();
        // API may return { high_volume: [...], medium: [...], niche: [...], arabic: [...] }
        if (data && typeof data === "object") {
          const mapped: HashtagGroup[] = [];
          if (data.high_volume) mapped.push({ label: "High Volume", key: "high_volume", hashtags: data.high_volume });
          if (data.medium) mapped.push({ label: "Medium Reach", key: "medium", hashtags: data.medium });
          if (data.niche) mapped.push({ label: "Niche", key: "niche", hashtags: data.niche });
          if (data.arabic) mapped.push({ label: "Arabic", key: "arabic", hashtags: data.arabic });
          // Also support pre-grouped array format
          if (Array.isArray(data)) {
            setGroups(data);
          } else if (mapped.length > 0) {
            setGroups(mapped);
          }
        }
      }
    } catch {
      // API unreachable
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHashtags();
  }, [fetchHashtags]);

  const allHashtags = groups.flatMap((g) => g.hashtags);

  const GROUP_COLORS: Record<string, { border: string; tag: string }> = {
    high_volume: { border: "border-red-500/30", tag: "text-red-400" },
    medium:      { border: "border-amber-500/30", tag: "text-amber-400" },
    niche:       { border: "border-blue-500/30", tag: "text-blue-400" },
    arabic:      { border: "border-emerald-500/30", tag: "text-emerald-400" },
  };

  return (
    <Section
      title="Hashtag Strategy"
      icon={<HashIcon />}
      action={
        allHashtags.length > 0 ? (
          <CopyButton
            text={allHashtags.map((h) => `#${h}`).join(" ")}
            label="Copy All"
          />
        ) : undefined
      }
    >
      {groups.length === 0 && !loading && (
        <p className="text-sm text-surface-500 text-center py-6">
          No hashtags loaded. Connect to the API.
        </p>
      )}
      {loading && (
        <div className="flex items-center justify-center py-6">
          <Spinner />
          <span className="ml-2 text-sm text-surface-400">Loading hashtags...</span>
        </div>
      )}
      <div className="space-y-4">
        {groups.map((group) => {
          const colors = GROUP_COLORS[group.key] || {
            border: "border-surface-700",
            tag: "text-surface-300",
          };
          return (
            <div key={group.key}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-surface-500">
                  {group.label}
                </span>
                <CopyButton
                  text={group.hashtags.map((h) => `#${h}`).join(" ")}
                  label="Copy Group"
                />
              </div>
              <div className={`rounded-lg border ${colors.border} bg-surface-950/50 p-3`}>
                <div className="flex flex-wrap gap-1.5">
                  {group.hashtags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => navigator.clipboard.writeText(`#${tag}`)}
                      className={`rounded-md bg-surface-800 px-2 py-1 text-xs ${colors.tag} hover:bg-surface-700 transition-colors cursor-pointer`}
                    >
                      #{tag}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

export default function ContentEnginePage() {
  return (
    <div className="min-h-screen bg-surface-950">
      {/* Header */}
      <header className="border-b border-surface-800 bg-surface-900 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-1">
            <a
              href="/dashboard"
              className="text-sm text-surface-500 hover:text-surface-300 transition-colors"
            >
              Dashboard
            </a>
            <span className="text-surface-700">/</span>
            <span className="text-sm text-surface-300">Content Engine</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-surface-100">
                Content Engine
              </h1>
              <p className="text-sm text-surface-500">
                AI-powered content planning, generation, and strategy for your social channels
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                AI Ready
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Calendar — full width */}
        <ContentCalendar />

        {/* Caption Generator + Trending — two column */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <CaptionGenerator />
          </div>
          <div>
            <TrendingTopics />
          </div>
        </div>

        {/* Post Ideas — full width */}
        <PostIdeas />

        {/* Hashtag Strategy — full width */}
        <HashtagStrategy />
      </main>
    </div>
  );
}

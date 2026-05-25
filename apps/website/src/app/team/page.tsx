"use client";

// /team — index page listing every Najim teammate.
// Each card links into the /team/[slug] CV page.

import Link from "next/link";
import { DcpProvider } from "@/components/dcp/provider";
import { StickyDemoCta } from "@/components/dcp/sticky-demo-cta";
import { useLang } from "@/components/dcp/lib";
import { Nav, type NavLink } from "@/components/dcp/chrome";
import { Reveal } from "@/components/dcp/motion";
import { Arrow } from "@/components/dcp/icons";
import { TEAM } from "@/lib/team-data";

function buildNavLinks(lang: "en" | "ar"): NavLink[] {
  return [
    { href: "/", label: lang === "ar" ? "الرئيسية" : "Home", key: "home" },
    { href: "/team", label: lang === "ar" ? "الفريق" : "Team", key: "team" },
    { href: "/pricing", label: lang === "ar" ? "الأسعار" : "Pricing", key: "pricing" },
    { href: "/changelog", label: lang === "ar" ? "السجل" : "Changelog", key: "changelog" },
  ];
}

function TeamIndex() {
  const { lang } = useLang();
  return (
    <>
      <section className="section" style={{ paddingTop: 56, paddingBottom: 24 }}>
        <div className="container">
          <div
            className="mono"
            style={{
              fontSize: 10,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              opacity: 0.5,
              marginBottom: 12,
            }}
          >
            {lang === "ar" ? "الفريق · متاحون للتوظيف" : "The team · available for hire"}
          </div>
          <Reveal as="h1" className="display tight" style={{ marginBottom: 16, maxWidth: "16ch" }}>
            {lang === "ar" ? (
              <>
                <em>{TEAM.length} موظفين</em>.<br />
                جاهزون للالتحاق<br />
                بعملك.
              </>
            ) : (
              <>
                <em>{TEAM.length} hires.</em><br />
                Ready to start<br />
                Monday.
              </>
            )}
          </Reveal>
          <p
            className="lede-strong"
            style={{ maxWidth: "56ch", marginBottom: 24, opacity: 0.85, fontSize: 17 }}
          >
            {lang === "ar"
              ? "كل واحد منهم اسم، وجه، صوت، وسيرة ذاتية. مدرّبون على عملك خلال ١٠ أيام عمل. اضغط على أيٍّ منهم لتقرأ ماذا تفعل، وكيف تتحدّث، ومع من تعمل."
              : "Each one has a name, a face, a voice, and a CV. Trained on your business in 10 working days. Click any of them to read what they do, how they talk, and who they work with."}
          </p>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0, paddingBottom: 80 }}>
        <div className="container">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 20,
            }}
          >
            {TEAM.map((m, i) => (
              <Reveal key={m.slug} delay={i * 80}>
                <Link
                  href={`/team/${m.slug}`}
                  style={{
                    display: "block",
                    border: "1px solid var(--line, rgba(255,255,255,0.08))",
                    borderRadius: 12,
                    overflow: "hidden",
                    textDecoration: "none",
                    color: "inherit",
                    background: "var(--card-bg, rgba(255,255,255,0.02))",
                    transition: "transform 250ms ease, border-color 250ms ease",
                  }}
                  className="team-card"
                >
                  <div
                    style={{
                      position: "relative",
                      aspectRatio: "1 / 1",
                      background: `linear-gradient(180deg, ${m.accent}22, transparent)`,
                    }}
                  >
                    <img
                      src={m.portrait}
                      alt={m.name[lang]}
                      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    />
                    <div
                      style={{
                        position: "absolute",
                        top: 12,
                        left: 12,
                        background: "rgba(0,0,0,0.55)",
                        backdropFilter: "blur(8px)",
                        color: "white",
                        padding: "4px 10px",
                        borderRadius: 999,
                        fontFamily: "var(--mono, monospace)",
                        fontSize: 9,
                        letterSpacing: "0.12em",
                        textTransform: "uppercase",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: m.accent }} />
                      {m.status[lang]}
                    </div>
                  </div>
                  <div style={{ padding: "20px 22px 22px" }}>
                    <div
                      style={{
                        fontSize: 26,
                        fontFamily: "var(--serif, Georgia, serif)",
                        marginBottom: 4,
                        fontWeight: 400,
                      }}
                    >
                      {m.name[lang]}
                    </div>
                    <div
                      className="mono"
                      style={{
                        fontSize: 10,
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        opacity: 0.6,
                        marginBottom: 12,
                      }}
                    >
                      {m.role[lang]}
                    </div>
                    <p
                      style={{
                        fontSize: 14,
                        lineHeight: 1.5,
                        opacity: 0.78,
                        margin: 0,
                        marginBottom: 14,
                        minHeight: 60,
                      }}
                    >
                      {m.tagline[lang]}
                    </p>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginTop: 4,
                      }}
                    >
                      <span
                        className="mono"
                        style={{
                          fontSize: 10,
                          letterSpacing: "0.12em",
                          textTransform: "uppercase",
                          color: m.accent,
                        }}
                      >
                        {lang === "ar" ? "اقرأ السيرة" : "Read CV"}
                      </span>
                      <span style={{ color: m.accent }}>
                        <Arrow size={14} />
                      </span>
                    </div>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

function TeamIndexApp() {
  const { lang } = useLang();
  return (
    <div className="page">
      <Nav
        links={buildNavLinks(lang)}
        active="team"
        status={{ label: lang === "ar" ? "متاحون للتوظيف · الإمارات والسعودية" : "HIRING · UAE & SAUDI" }}
        ctaLabel={lang === "ar" ? "احجز موعد التشغيل" : "Schedule kickoff"}
        ctaHref="/teardown"
      />
      <TeamIndex />
    </div>
  );
}

export default function TeamPage() {
  return (
    <DcpProvider initialLang="en">
      <TeamIndexApp />
      <StickyDemoCta />
    </DcpProvider>
  );
}

"use client";

// /team/[slug] — per-agent CV / hire page.
//
// Each member of the Najim team gets their own page. Designed to read
// like a real person's resume + portfolio: portrait + name + role,
// tagline, what she does, specialties, sample conversations,
// "works with the rest of the team" graph, and a hire CTA. The same
// data drives the homepage MeetYourTeam cards via the AGENTS map; this
// page is the deep-dive an interested buyer clicks into.

import { notFound, useParams } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { DcpProvider } from "@/components/dcp/provider";
import { StickyDemoCta } from "@/components/dcp/sticky-demo-cta";
import { useLang } from "@/components/dcp/lib";
import { Nav, type NavLink } from "@/components/dcp/chrome";
import { Reveal } from "@/components/dcp/motion";
import { Arrow } from "@/components/dcp/icons";
import { findMember, TEAM, type TeamMember } from "@/lib/team-data";

function buildNavLinks(lang: "en" | "ar"): NavLink[] {
  return [
    { href: "/", label: lang === "ar" ? "الرئيسية" : "Home", key: "home" },
    { href: "/team", label: lang === "ar" ? "الفريق" : "Team", key: "team" },
    { href: "/pricing", label: lang === "ar" ? "الأسعار" : "Pricing", key: "pricing" },
    { href: "/changelog", label: lang === "ar" ? "السجل" : "Changelog", key: "changelog" },
  ];
}

function HireCv({ member }: { member: TeamMember }) {
  const { lang } = useLang();
  const [activeSample, setActiveSample] = useState(0);
  const accent = member.accent;

  return (
    <>
      {/* Hero — portrait left, identity right */}
      <section className="section" style={{ paddingTop: 40, paddingBottom: 24 }}>
        <div className="container">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(260px, 380px) 1fr",
              gap: 48,
              alignItems: "center",
            }}
            className="cv-hero-grid"
          >
            <Reveal>
              <div
                style={{
                  borderRadius: 12,
                  overflow: "hidden",
                  aspectRatio: "1 / 1",
                  border: "1px solid var(--line, rgba(255,255,255,0.08))",
                  background: `linear-gradient(180deg, ${accent}22, transparent)`,
                  position: "relative",
                }}
              >
                <img
                  src={member.portrait}
                  alt={member.name[lang]}
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                />
                <div
                  style={{
                    position: "absolute",
                    top: 16,
                    left: 16,
                    background: "rgba(0,0,0,0.55)",
                    backdropFilter: "blur(8px)",
                    color: "white",
                    padding: "5px 10px",
                    borderRadius: 999,
                    fontFamily: "var(--mono, monospace)",
                    fontSize: 10,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: accent }} />
                  {member.status[lang]}
                </div>
              </div>
            </Reveal>

            <Reveal delay={120}>
              <div
                className="mono"
                style={{
                  fontSize: 10,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  opacity: 0.5,
                  marginBottom: 14,
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <Link href="/team" style={{ color: "inherit", textDecoration: "none" }}>
                  ← {lang === "ar" ? "كل الفريق" : "All team"}
                </Link>
                <span style={{ opacity: 0.3 }}>·</span>
                <span>{lang === "ar" ? "السيرة الذاتية" : "Resume"}</span>
              </div>
              <h1
                className="display tight"
                style={{
                  fontSize: "clamp(48px, 7vw, 88px)",
                  lineHeight: 0.95,
                  marginBottom: 14,
                }}
              >
                {member.name[lang]}
              </h1>
              <div
                style={{
                  fontSize: 17,
                  fontFamily: "var(--serif, Georgia, serif)",
                  fontStyle: "italic",
                  opacity: 0.75,
                  marginBottom: 18,
                }}
              >
                {member.role[lang]}
              </div>
              <p
                style={{
                  fontSize: 17,
                  lineHeight: 1.55,
                  opacity: 0.92,
                  marginBottom: 22,
                  maxWidth: "52ch",
                }}
              >
                {member.tagline[lang]}
              </p>
              <div
                className="mono"
                style={{
                  fontSize: 11,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  opacity: 0.55,
                  marginBottom: 24,
                }}
              >
                ● {member.location[lang]}
              </div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <a className="btn primary lg" href="/teardown">
                  {lang === "ar" ? `وظّف ${member.name.ar}` : `Hire ${member.name.en}`}
                  <Arrow size={14} />
                </a>
                <a
                  className="btn ghost lg"
                  href="https://wa.me/12058582516?text=Hi"
                  target="_blank"
                  rel="noreferrer"
                >
                  {lang === "ar" ? `كلّم ${member.name.ar} على واتساب` : `Text ${member.name.en} live`}
                </a>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Bio + does + specialties */}
      <section className="section" style={{ paddingTop: 24, paddingBottom: 24 }}>
        <div className="container">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(260px, 1fr) minmax(260px, 1.4fr)",
              gap: 40,
            }}
            className="cv-meta-grid"
          >
            <Reveal>
              <div
                className="mono"
                style={{
                  fontSize: 10,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  opacity: 0.5,
                  marginBottom: 14,
                }}
              >
                {lang === "ar" ? "نبذة" : "About"}
              </div>
              <p style={{ fontSize: 15, lineHeight: 1.7, opacity: 0.88 }}>{member.bio[lang]}</p>
              {member.voiceEn && (
                <div
                  style={{
                    marginTop: 24,
                    padding: 16,
                    border: "1px solid var(--line, rgba(255,255,255,0.08))",
                    borderRadius: 8,
                    background: "var(--card-bg, rgba(255,255,255,0.02))",
                  }}
                >
                  <div
                    className="mono"
                    style={{
                      fontSize: 10,
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                      opacity: 0.55,
                      marginBottom: 8,
                    }}
                  >
                    {lang === "ar" ? "صوتها" : "Her voice"}
                  </div>
                  <div style={{ fontSize: 13, opacity: 0.88, lineHeight: 1.5 }}>
                    {lang === "ar" ? (
                      <>
                        إنجليزية: <b>{member.voiceEn.voiceName}</b> · إيليفن لابز
                        {member.voiceAr && (
                          <>
                            <br />عربية: <b>{member.voiceAr.voiceName}</b> · سعودية
                          </>
                        )}
                      </>
                    ) : (
                      <>
                        English: <b>{member.voiceEn.voiceName}</b> · ElevenLabs
                        {member.voiceAr && (
                          <>
                            <br />Arabic: <b>{member.voiceAr.voiceName}</b> · Saudi
                          </>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
            </Reveal>
            <Reveal delay={100}>
              <div
                className="mono"
                style={{
                  fontSize: 10,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  opacity: 0.5,
                  marginBottom: 14,
                }}
              >
                {lang === "ar" ? "ماذا تفعل" : "What she does"}
              </div>
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 12 }}>
                {member.does.map((d) => (
                  <li
                    key={d.en}
                    style={{ display: "flex", gap: 12, fontSize: 14, lineHeight: 1.55 }}
                  >
                    <span style={{ color: accent, flexShrink: 0, fontSize: 18, lineHeight: 1.3 }}>
                      →
                    </span>
                    <span style={{ opacity: 0.88 }}>{d[lang]}</span>
                  </li>
                ))}
              </ul>
              <div
                style={{
                  marginTop: 28,
                  paddingTop: 24,
                  borderTop: "1px solid var(--line, rgba(255,255,255,0.06))",
                }}
              >
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
                  {lang === "ar" ? "تخصّص" : "Specialties"}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {member.specialties.map((s) => (
                    <span
                      key={s.en}
                      style={{
                        padding: "5px 12px",
                        borderRadius: 999,
                        border: `1px solid ${accent}44`,
                        background: `${accent}11`,
                        fontSize: 12,
                        color: accent,
                      }}
                    >
                      {s[lang]}
                    </span>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Sample conversations — the interactive piece */}
      <section className="section" style={{ paddingTop: 32, paddingBottom: 32 }}>
        <div className="container">
          <div
            className="mono"
            style={{
              fontSize: 10,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              opacity: 0.5,
              marginBottom: 8,
            }}
          >
            {lang === "ar" ? "نماذج محادثات" : "Sample conversations"}
          </div>
          <h2
            className="display-2"
            style={{
              fontSize: "clamp(28px, 4vw, 44px)",
              marginBottom: 24,
            }}
          >
            {lang === "ar" ? "هكذا تردّ على الزبائن" : "How she replies to customers"}
          </h2>

          {member.samples.length > 1 && (
            <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
              {member.samples.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveSample(i)}
                  className="mono"
                  style={{
                    background: i === activeSample ? accent : "transparent",
                    color: i === activeSample ? "#000" : "inherit",
                    border: `1px solid ${i === activeSample ? accent : "var(--line, rgba(255,255,255,0.12))"}`,
                    borderRadius: 999,
                    padding: "6px 14px",
                    fontSize: 11,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    cursor: "pointer",
                  }}
                >
                  {lang === "ar" ? `محادثة ${i + 1}` : `Convo ${i + 1}`}
                </button>
              ))}
            </div>
          )}

          <div
            style={{
              border: "1px solid var(--line, rgba(255,255,255,0.08))",
              borderRadius: 12,
              padding: 24,
              background: "var(--card-bg, rgba(255,255,255,0.02))",
              maxWidth: 720,
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            {(member.samples[activeSample] || []).map((m, i) => {
              const isAgent = m.from === "agent";
              return (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    justifyContent: isAgent ? "flex-end" : "flex-start",
                  }}
                >
                  <div
                    style={{
                      maxWidth: "75%",
                      padding: "10px 14px",
                      borderRadius: 14,
                      background: isAgent ? accent : "rgba(255,255,255,0.06)",
                      color: isAgent ? "#000" : "inherit",
                      fontSize: 14,
                      lineHeight: 1.5,
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {m.text[lang]}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Works with — small team graph */}
      {member.worksWith.length > 0 && (
        <section className="section" style={{ paddingTop: 32, paddingBottom: 32 }}>
          <div className="container">
            <div
              className="mono"
              style={{
                fontSize: 10,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                opacity: 0.5,
                marginBottom: 8,
              }}
            >
              {lang === "ar" ? "تعمل مع" : "Works with"}
            </div>
            <h2
              className="display-2"
              style={{
                fontSize: "clamp(28px, 4vw, 44px)",
                marginBottom: 24,
              }}
            >
              {lang === "ar" ? "ليست وحدها" : "She's not solo."}
            </h2>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 16,
              }}
            >
              {member.worksWith.map((slug) => {
                const other = findMember(slug);
                if (!other) return null;
                return (
                  <Link
                    key={slug}
                    href={`/team/${slug}`}
                    style={{
                      display: "flex",
                      gap: 14,
                      alignItems: "center",
                      padding: 14,
                      border: "1px solid var(--line, rgba(255,255,255,0.08))",
                      borderRadius: 10,
                      textDecoration: "none",
                      color: "inherit",
                      background: "var(--card-bg, rgba(255,255,255,0.02))",
                      transition: "border-color 200ms ease, transform 200ms ease",
                    }}
                  >
                    <div
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: "50%",
                        overflow: "hidden",
                        background: `linear-gradient(180deg, ${other.accent}44, transparent)`,
                        flexShrink: 0,
                      }}
                    >
                      <img
                        src={other.portrait}
                        alt={other.name[lang]}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    </div>
                    <div>
                      <div style={{ fontSize: 16, fontFamily: "var(--serif, Georgia, serif)" }}>
                        {other.name[lang]}
                      </div>
                      <div
                        className="mono"
                        style={{
                          fontSize: 10,
                          letterSpacing: "0.1em",
                          textTransform: "uppercase",
                          opacity: 0.5,
                          marginTop: 2,
                        }}
                      >
                        {other.role[lang]}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Bottom CTA */}
      <section className="section" style={{ paddingTop: 24, paddingBottom: 80 }}>
        <div className="container">
          <div
            style={{
              border: `1px solid ${accent}55`,
              borderRadius: 14,
              padding: "36px 32px",
              background: `linear-gradient(180deg, ${accent}11 0%, ${accent}03 100%)`,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
              gap: 16,
            }}
          >
            <h2
              className="display-2"
              style={{
                fontSize: "clamp(28px, 4vw, 44px)",
                margin: 0,
                lineHeight: 1.15,
              }}
            >
              {lang === "ar" ? (
                <>
                  جاهز توظّف <em style={{ color: accent }}>{member.name.ar}؟</em>
                </>
              ) : (
                <>
                  Ready to hire <em style={{ color: accent }}>{member.name.en}?</em>
                </>
              )}
            </h2>
            <p style={{ fontSize: 16, opacity: 0.78, maxWidth: "46ch", margin: 0 }}>
              {lang === "ar"
                ? "احجز موعد كيكأوف ١٥ دقيقة، نتولّى الإعداد والتدريب، وتستلم موظفتك خلال ١٠ أيام عمل."
                : "Book a 15-min kickoff call. We handle setup and training. Your hire is on WhatsApp in 10 working days."}
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
              <a className="btn primary lg" href="/teardown" style={{ background: accent, borderColor: accent, color: "#000" }}>
                {lang === "ar" ? "احجز موعد التشغيل" : "Schedule kickoff"} <Arrow size={14} />
              </a>
              <Link className="btn ghost lg" href="/team">
                {lang === "ar" ? "← شاهد بقية الفريق" : "← See the rest of the team"}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function TeamMemberApp() {
  const params = useParams();
  const slug = typeof params?.slug === "string" ? params.slug : "";
  const member = findMember(slug);
  const { lang } = useLang();

  if (!member) {
    notFound();
  }

  return (
    <div className="page">
      <Nav
        links={buildNavLinks(lang)}
        active="team"
        status={{ label: lang === "ar" ? "متاحون للتوظيف · الإمارات والسعودية" : "HIRING · UAE & SAUDI" }}
        ctaLabel={lang === "ar" ? "احجز موعد التشغيل" : "Schedule kickoff"}
        ctaHref="/teardown"
      />
      <HireCv member={member!} />
    </div>
  );
}

export default function TeamMemberPage() {
  return (
    <DcpProvider initialLang="en">
      <TeamMemberApp />
      <StickyDemoCta />
    </DcpProvider>
  );
}

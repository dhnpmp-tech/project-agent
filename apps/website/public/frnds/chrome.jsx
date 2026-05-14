// FRNDS — Cursor + Nav + Hero + Marquee
/* global React */
const { useEffect, useRef, useState } = React;

// ---------- Custom cursor ----------
function CursorFollower() {
  useEffect(() => {
    const dot = document.createElement("div");
    dot.className = "cursor-dot";
    const ring = document.createElement("div");
    ring.className = "cursor-ring";
    document.body.append(dot, ring);

    let mx = window.innerWidth / 2, my = window.innerHeight / 2;
    let rx = mx, ry = my;
    const move = (e) => { mx = e.clientX; my = e.clientY; dot.style.transform = `translate(${mx}px, ${my}px) translate(-50%, -50%)`; };
    const raf = () => {
      rx += (mx - rx) * 0.18;
      ry += (my - ry) * 0.18;
      ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%, -50%)`;
      requestAnimationFrame(raf);
    };
    window.addEventListener("mousemove", move);
    requestAnimationFrame(raf);

    const onOver = (e) => {
      const t = e.target;
      if (!t || !t.matches) return;
      if (t.closest("a, button, [data-cursor=hover], .menu-item, .gallery-cell, .press-card, .party-pick .pp, .menu-tab, .flavor")) {
        document.body.classList.add("cursor-hover");
        document.body.classList.remove("cursor-text");
      } else if (t.closest("input, textarea")) {
        document.body.classList.add("cursor-text");
        document.body.classList.remove("cursor-hover");
      } else {
        document.body.classList.remove("cursor-hover");
        document.body.classList.remove("cursor-text");
      }
    };
    window.addEventListener("mouseover", onOver);

    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseover", onOver);
      dot.remove(); ring.remove();
    };
  }, []);
  return null;
}

// ---------- Reveal on scroll ----------
// Observes .reveal elements and adds .in once they intersect. Uses a
// MutationObserver so new .reveal nodes inserted by React (e.g. menu
// items when switching tabs) also get picked up — otherwise the items
// stay opacity-0 forever because useEffect's initial querySelectorAll
// runs once at mount and misses anything added later.
function useReveal() {
  useEffect(() => {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }});
    }, { threshold: 0.12 });

    const observeAll = () => {
      document.querySelectorAll(".reveal:not(.in)").forEach(el => io.observe(el));
    };
    observeAll();

    // Catch nodes inserted later (tab switches, async chunks).
    const mo = new MutationObserver(() => observeAll());
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, []);
}

// ---------- Nav ----------
function Nav({ onReserve }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const links = [
    { href: "#menu", label: "Menu" },
    { href: "#brunch", label: "Night Brunch" },
    { href: "#shisha", label: "Lounge" },
    { href: "#gallery", label: "Room" },
    { href: "#press", label: "Press" },
    { href: "#visit", label: "Visit" },
  ];
  return (
    <nav className={"nav" + (scrolled ? " scrolled" : "")}>
      <a href="#top" className="nav-logo">
        <span className="dot"></span>
        FRNDS
      </a>
      <ul className="nav-links">
        {links.map(l => <li key={l.href}><a href={l.href}>{l.label}</a></li>)}
      </ul>
      <button className="nav-cta" onClick={onReserve}>Reserve</button>
    </nav>
  );
}

// ---------- Hero ----------
function Hero({ voice }) {
  const bgRef = useRef(null);
  useEffect(() => {
    const onScroll = () => {
      if (!bgRef.current) return;
      const y = window.scrollY;
      bgRef.current.style.transform = `translate3d(0, ${y * 0.35}px, 0) scale(${1 + y * 0.0002})`;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <section className="hero" id="top">
      <div
        ref={bgRef}
        className="hero-bg"
        style={{ backgroundImage: "url(images/bar-swing.avif)" }}
      />
      <div className="hero-corner tl">
        <span className="num">25°11′53″N</span>
        <span>·</span>
        <span className="num">55°16′35″E</span>
      </div>
      <div className="hero-corner tr">
        <span>The Address · Dubai Mall</span>
      </div>

      <div className="hero-content">
        <div className="hero-eyebrow">
          <span className="dash"></span>
          {voice.heroEyebrow}
          <span className="dash"></span>
        </div>
        <h1 className="hero-wordmark">FRNDS</h1>
        <div className="hero-underline"></div>
        <p className="hero-tag">{voice.heroTag[0]}<b>{voice.heroTag[1]}</b>{voice.heroTag[2] || ""}</p>
        <p className="hero-sub">{voice.heroSub}</p>
      </div>

      <div className="hero-corner bl">
        <span className="num">N°</span>
        <span>001 / Downtown</span>
      </div>
      <div className="hero-corner br">
        <span className="num">M·T·W·T·F·S·S</span>
        <span>Daily · 12 → Late</span>
      </div>
      <div className="scroll-cue">
        <span>Enter</span>
        <span className="line"></span>
      </div>
    </section>
  );
}

// ---------- Marquee ----------
function Marquee() {
  const items = window.FRNDS_CONTENT.marquee;
  const row = (
    <span>
      {items.map((t, i) => (
        <React.Fragment key={i}>
          {t === "·" ? <span className="star">✦</span> : <span>{t}</span>}
        </React.Fragment>
      ))}
    </span>
  );
  return (
    <div className="marquee" aria-hidden="true">
      <div className="marquee-track">
        {row}{row}{row}{row}
      </div>
    </div>
  );
}

Object.assign(window, { CursorFollower, Nav, Hero, Marquee, useReveal });

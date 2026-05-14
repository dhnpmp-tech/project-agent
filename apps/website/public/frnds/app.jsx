// FRNDS — root app
/* global React, ReactDOM, CursorFollower, Nav, Hero, Marquee, Intro, Menu,
  NightBrunch, Shisha, Gallery, Press, Reservation, ReserveModal, Footer,
  useReveal, FrndsTweaks */
const { useState, useEffect } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "palette": "emerald",
  "voice": "sultry",
  "density": "editorial",
  "grain": true
}/*EDITMODE-END*/;

function App() {
  useReveal();
  const [modal, setModal] = useState(null);
  const [voiceKey, setVoiceKey] = useState(window.__FRNDS_VOICE || "sultry");

  useEffect(() => {
    const onVoice = (e) => setVoiceKey(e.detail);
    window.addEventListener("frnds:voice", onVoice);
    return () => window.removeEventListener("frnds:voice", onVoice);
  }, []);

  // re-run reveal observer when section content changes (voice swap, menu tab)
  useEffect(() => {
    const t = setTimeout(() => {
      document.querySelectorAll(".reveal:not(.in)").forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight - 80) el.classList.add("in");
      });
    }, 100);
    return () => clearTimeout(t);
  }, [voiceKey]);

  const voice = window.FRNDS_CONTENT.voice[voiceKey] || window.FRNDS_CONTENT.voice.sultry;

  const openReserve = () => {
    const target = document.getElementById("visit");
    if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <>
      <CursorFollower />
      <Nav onReserve={openReserve} />
      <Hero voice={voice} />
      <Marquee />
      <Intro voice={voice} />
      <Menu />
      <NightBrunch voice={voice} onReserve={openReserve} />
      <Shisha />
      <Gallery />
      <Press />
      <Reservation openModal={(data) => setModal(data)} />
      <Footer />
      {modal && <ReserveModal data={modal} onClose={() => setModal(null)} />}
      <FrndsTweaks />
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);

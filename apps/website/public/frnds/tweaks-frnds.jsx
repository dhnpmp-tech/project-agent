// FRNDS — Tweaks panel
/* global React, useTweaks, TweaksPanel, TweakSection, TweakRadio, TweakSelect, TweakToggle */

function FrndsTweaks() {
  const [t, setTweak] = useTweaks({
    palette: "emerald",
    voice: "sultry",
    density: "editorial",
    grain: true
  });

  // Apply palette to CSS vars
  React.useEffect(() => {
    const root = document.documentElement;
    const palettes = {
      emerald: {
        "--ink": "#0a0807", "--ink-2": "#110d0b", "--smoke": "#1a1310",
        "--emerald": "#1a3a2a", "--emerald-deep": "#0e2418",
        "--burgundy": "#5a1818", "--burgundy-deep": "#3a0a0a",
        "--gold": "#c9a44c", "--gold-bright": "#d9b860", "--gold-soft": "#8a7038",
        "--parchment": "#e8dcc4", "--parchment-dim": "#b8ac94"
      },
      noir: {
        "--ink": "#08080a", "--ink-2": "#101012", "--smoke": "#161618",
        "--emerald": "#0e1418", "--emerald-deep": "#08080a",
        "--burgundy": "#3a2820", "--burgundy-deep": "#1a1410",
        "--gold": "#c4a058", "--gold-bright": "#d9b864", "--gold-soft": "#7a6038",
        "--parchment": "#d4c4a0", "--parchment-dim": "#9a8e78"
      },
      bordeaux: {
        "--ink": "#100806", "--ink-2": "#1a0d0a", "--smoke": "#211410",
        "--emerald": "#2a1a14", "--emerald-deep": "#1a0d0a",
        "--burgundy": "#6a2418", "--burgundy-deep": "#4a1410",
        "--gold": "#b8923a", "--gold-bright": "#d4a850", "--gold-soft": "#7a5e28",
        "--parchment": "#e0d0b0", "--parchment-dim": "#b8a888"
      },
      parchment: {
        "--ink": "#f4ede0", "--ink-2": "#ece4d4", "--smoke": "#e4dcca",
        "--emerald": "#1a3a2a", "--emerald-deep": "#0e2418",
        "--burgundy": "#5a1818", "--burgundy-deep": "#3a0a0a",
        "--gold": "#a8843c", "--gold-bright": "#b8923a", "--gold-soft": "#6a5028",
        "--parchment": "#1a1410", "--parchment-dim": "#5a4838"
      }
    };
    const p = palettes[t.palette] || palettes.emerald;
    Object.entries(p).forEach(([k, v]) => root.style.setProperty(k, v));
  }, [t.palette]);

  React.useEffect(() => {
    let style = document.getElementById("grain-toggle-style");
    if (!style) {
      style = document.createElement("style");
      style.id = "grain-toggle-style";
      document.head.appendChild(style);
    }
    style.textContent = t.grain ? "" : "body::after { display: none !important; }";
  }, [t.grain]);

  React.useEffect(() => {
    window.__FRNDS_VOICE = t.voice;
    window.dispatchEvent(new CustomEvent("frnds:voice", { detail: t.voice }));
  }, [t.voice]);

  // density: scale section padding via class
  React.useEffect(() => {
    const cls = ["density-compact","density-editorial","density-spacious"];
    document.body.classList.remove(...cls);
    document.body.classList.add(`density-${t.density}`);
  }, [t.density]);

  return (
    <TweaksPanel title="FRNDS · Tweaks">
      <TweakSection label="Palette" />
      <TweakSelect
        label="Mood"
        value={t.palette}
        options={[
          { value: "emerald", label: "Emerald · default" },
          { value: "noir", label: "Noir · graphite" },
          { value: "bordeaux", label: "Bordeaux · velvet red" },
          { value: "parchment", label: "Parchment · day mode" }
        ]}
        onChange={(v) => setTweak("palette", v)}
      />

      <TweakSection label="Voice" />
      <TweakRadio
        label="Copy tone"
        value={t.voice}
        options={[
          { value: "sultry", label: "Sultry" },
          { value: "playful", label: "Playful" }
        ]}
        onChange={(v) => setTweak("voice", v)}
      />

      <TweakSection label="Layout" />
      <TweakRadio
        label="Density"
        value={t.density}
        options={["compact", "editorial", "spacious"]}
        onChange={(v) => setTweak("density", v)}
      />
      <TweakToggle
        label="Film grain"
        value={t.grain}
        onChange={(v) => setTweak("grain", v)}
      />
    </TweaksPanel>
  );
}

window.FrndsTweaks = FrndsTweaks;

// FRNDS — Intro, Menu, Brunch, Shisha sections
/* global React */
const { useState } = React;

// ---------- Intro / Story ----------
function Intro({ voice }) {
  const headParts = voice.introH;
  return (
    <section className="section intro" id="story">
      <div className="wrap">
        <div className="intro-grid reveal">
          <div>
            <div className="intro-eyebrow">
              <span className="num">N° 01</span>
              <span className="line"></span>
              <span className="label">The Room</span>
            </div>
            <h2>
              {headParts.map((part, i) =>
                (i === 1 || i === 3 || i === 5) ? <em key={i}>{part}</em> : <span key={i}>{part}</span>
              )}
            </h2>
          </div>
          <div className="intro-body">
            <p className="lead">{voice.introLead}</p>
            {voice.introBody.map((p, i) => <p key={i}>{p}</p>)}
            <div className="intro-meta">
              <div className="item">
                <span className="k">Kitchen</span>
                <span className="v">French · Japanese</span>
              </div>
              <div className="item">
                <span className="k">Hours</span>
                <span className="v">Daily 12 → Late</span>
              </div>
              <div className="item">
                <span className="k">Address</span>
                <span className="v">The Address Dubai Mall</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------- Menu ----------
function Menu() {
  const sections = window.FRNDS_CONTENT.menu;
  const [active, setActive] = useState(sections[0].id);
  const cur = sections.find(s => s.id === active);
  return (
    <section className="section menu" id="menu">
      <div className="wrap">
        <div className="menu-head reveal">
          <div>
            <span className="eyebrow">N° 02 · The Carte</span>
            <h2>Two kitchens, <em>one table.</em></h2>
          </div>
          <p className="side">A short menu, kept seasonal.<br/>The longer it looks, the worse it gets.</p>
        </div>

        <div className="menu-tabs reveal">
          {sections.map((s, i) => (
            <button
              key={s.id}
              className={"menu-tab" + (active === s.id ? " active" : "")}
              onClick={() => setActive(s.id)}
            >
              <span className="idx">0{i + 1}</span>{s.label}
            </button>
          ))}
        </div>

        <div className="menu-grid">
          {cur.items.map((it, i) => (
            <div className="menu-item reveal" key={it.name} style={{ transitionDelay: `${i * 40}ms` }}>
              <div className="item-name">{it.name}</div>
              <div className="item-price">{it.price}</div>
              <div className="item-desc">{it.desc}</div>
              {it.tags && (
                <div className="item-tags">
                  {it.tags.map(t => <span className="tag" key={t}>{t}</span>)}
                </div>
              )}
            </div>
          ))}
        </div>

        <div style={{ textAlign: "center", marginTop: 60, fontFamily: "var(--f-mono)", fontSize: 11, letterSpacing: "0.24em", textTransform: "uppercase", color: "var(--parchment-dim)"}}>
          <span style={{ color: "var(--gold)" }}>{cur.side}</span>
        </div>
      </div>
    </section>
  );
}

// ---------- Night Brunch ----------
function NightBrunch({ voice, onReserve }) {
  return (
    <section className="brunch" id="brunch">
      <div className="brunch-inner">
        <div
          className="brunch-img reveal"
          style={{ backgroundImage: "url(images/sparklers.jpg)" }}
        />
        <div className="brunch-content reveal">
          <span className="eyebrow">N° 03 · Saturdays</span>
          <h2>The <em>Night</em> Brunch.</h2>
          <p className="lead">{voice.brunchLead}</p>
          <p>
            Three hours of bottomless pours, free-flowing sashimi, robata
            classics, and a DJ that takes the room from candlelit to
            sparkler-lit somewhere around the second course. Saturdays only.
            Booked weeks ahead.
          </p>
          <div className="brunch-stats">
            <div className="stat">
              <span className="k">Service</span>
              <span className="v">Sat · 9pm</span>
            </div>
            <div className="stat">
              <span className="k">Duration</span>
              <span className="v">3 hours</span>
            </div>
            <div className="stat">
              <span className="k">From</span>
              <span className="v">AED 395</span>
            </div>
          </div>
          <div className="brunch-actions">
            <button className="btn-gold" onClick={onReserve}>
              Reserve a table <span className="arrow"></span>
            </button>
            <a className="btn-ghost" href="#menu">See the menu</a>
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------- Shisha Lounge ----------
function Shisha() {
  const flavors = window.FRNDS_CONTENT.shishaFlavors;
  return (
    <section className="section shisha" id="shisha">
      <div className="wrap">
        <div className="shisha-grid">
          <div className="shisha-text reveal">
            <span className="eyebrow">N° 04 · After Dinner</span>
            <h2>A lounge for <em>long evenings.</em></h2>
            <p>
              Past the dining room, the lounge keeps a different time.
              Velvet banquettes by the window, low brass tables, a curated
              shisha menu by our resident sommelier. Reserved for those
              who order one more before leaving.
            </p>
            <blockquote className="pull">
              "The kind of evening that ends three hours after it should."
            </blockquote>
            <span className="label-mono" style={{ display: "block", marginTop: 30, marginBottom: 14 }}>House flavors · curated weekly</span>
            <div className="shisha-flavors">
              {flavors.map(f => <span className="flavor" key={f}>{f}</span>)}
            </div>
          </div>
          <div className="shisha-imgs reveal">
            <div className="img img1" style={{ backgroundImage: "url(images/shisha-2.jpg)" }}></div>
            <div className="img img2" style={{ backgroundImage: "url(images/shisha-1.jpg)" }}></div>
          </div>
        </div>
      </div>
    </section>
  );
}

Object.assign(window, { Intro, Menu, NightBrunch, Shisha });

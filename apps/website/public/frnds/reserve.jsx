// FRNDS — Gallery, Press, Reservation, Footer, Modal
/* global React */
const { useState } = React;

// ---------- Gallery ----------
function Gallery() {
  const cells = window.FRNDS_CONTENT.gallery;
  return (
    <section className="section gallery" id="gallery">
      <div className="wrap">
        <div className="gallery-head reveal">
          <span className="eyebrow">N° 05 · The Room</span>
          <h2>A room <em>built for nights</em><br/>that go long.</h2>
          <span className="sub">Eight scenes · One address · Downtown Dubai</span>
        </div>
        <div className="gallery-grid">
          {cells.map(c => (
            <div
              key={c.cls}
              className={"gallery-cell reveal " + c.cls}
              style={{ backgroundImage: `url(${c.img})` }}
            >
              <span className="num">{c.num}</span>
              <span className="cap">{c.cap}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------- Press ----------
function Press() {
  const press = window.FRNDS_CONTENT.press;
  return (
    <section className="section press" id="press">
      <div className="wrap">
        <div className="press-head reveal">
          <span className="eyebrow">N° 06 · In Print</span>
          <h2>Said about <em>the room.</em></h2>
        </div>
        <div className="press-grid">
          {press.map((p, i) => (
            <div className="press-card reveal" key={i} style={{ transitionDelay: `${i * 80}ms` }}>
              <div className="stars">★ ★ ★ ★ ★</div>
              <blockquote>"{p.quote}"</blockquote>
              <cite>
                <span className="pub">{p.pub}</span>
                {p.auth}
              </cite>
            </div>
          ))}
        </div>
        <div className="press-rating reveal">
          <div className="stat">
            <div className="num">4.7</div>
            <div className="lab">Google · 1,287 reviews</div>
          </div>
          <div className="stat">
            <div className="num">65K</div>
            <div className="lab">Instagram followers</div>
          </div>
          <div className="stat">
            <div className="num">2022</div>
            <div className="lab">Opened · Downtown</div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------- Reservation form ----------
function Reservation({ openModal }) {
  const [form, setForm] = useState({
    name: "", phone: "", date: "", time: "20:00", party: 2,
    occasion: "—", notes: ""
  });

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = (e) => {
    e.preventDefault();
    openModal(form);
  };

  const phoneNum = "+971564223990";
  const waLink = () => {
    const msg = encodeURIComponent(
      `Hello FRNDS,%0AI'd like to book a table.%0A%0AName: ${form.name || "—"}%0ADate: ${form.date || "—"}%0ATime: ${form.time}%0AParty: ${form.party}%0AOccasion: ${form.occasion}%0ANotes: ${form.notes || "—"}`
    );
    return `https://wa.me/${phoneNum.replace(/[^0-9]/g,"")}?text=${msg}`;
  };

  // generate 30-min time slots between 12:00 - 01:30
  const times = [];
  for (let h = 12; h <= 25; h++) {
    const hh = (h % 24).toString().padStart(2, "0");
    times.push(`${hh}:00`);
    times.push(`${hh}:30`);
  }

  return (
    <section className="section reserve" id="visit">
      <div className="wrap">
        <div className="reserve-inner">
          <div className="reserve-text reveal">
            <span className="eyebrow">N° 07 · Reserve</span>
            <h2>A seat at <em>FRNDS.</em></h2>
            <p className="lead">
              The room fills early. Book ahead — and tell us if it's a
              birthday, an anniversary, or the kind of night that needs a
              quiet corner.
            </p>

            <div className="reserve-meta">
              <div className="item">
                <span className="k">Address</span>
                <span className="v">The Address Dubai Mall<br/>Ground Floor · Downtown</span>
              </div>
              <div className="item">
                <span className="k">Phone · WhatsApp</span>
                <span className="v"><a href={`tel:${phoneNum}`}>+971 56 422 3990</a></span>
              </div>
              <div className="item">
                <span className="k">Hours</span>
                <span className="v">Daily · 12pm → Late<br/>Brunch · Saturday · 9pm</span>
              </div>
              <div className="item">
                <span className="k">Press / Events</span>
                <span className="v"><a href="mailto:hello@frndsdubai.com">hello@frndsdubai.com</a></span>
              </div>
            </div>
          </div>

          <form className="reserve-form reveal" onSubmit={submit}>
            <span className="label-mono" style={{ marginBottom: 24, display: "block", color: "var(--gold)" }}>
              ✦ Reservation request
            </span>

            <div className="field full" style={{ marginBottom: 24 }}>
              <span className="label-mono">Full name</span>
              <input
                required
                placeholder="As it should appear on the door"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
              />
            </div>

            <div className="field full" style={{ marginBottom: 26 }}>
              <span className="label-mono">Phone / WhatsApp</span>
              <input
                required
                type="tel"
                placeholder="+971 ..."
                value={form.phone}
                onChange={(e) => update("phone", e.target.value)}
              />
            </div>

            <div className="field-row">
              <div className="field">
                <span className="label-mono">Date</span>
                <input
                  required
                  type="date"
                  value={form.date}
                  onChange={(e) => update("date", e.target.value)}
                />
              </div>
              <div className="field">
                <span className="label-mono">Time</span>
                <select value={form.time} onChange={(e) => update("time", e.target.value)}>
                  {times.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            <div className="field full" style={{ marginBottom: 26 }}>
              <span className="label-mono">Party of</span>
              <div className="party-pick">
                {[1,2,3,4,5,6,7,8].map(n => (
                  <button
                    type="button"
                    key={n}
                    className={"pp" + (form.party === n ? " active" : "")}
                    onClick={() => update("party", n)}
                  >{n}</button>
                ))}
                <button
                  type="button"
                  className={"pp" + (form.party === "9+" ? " active" : "")}
                  onClick={() => update("party", "9+")}
                >9+</button>
              </div>
            </div>

            <div className="field full" style={{ marginBottom: 26 }}>
              <span className="label-mono">Occasion</span>
              <select value={form.occasion} onChange={(e) => update("occasion", e.target.value)}>
                <option>—</option>
                <option>Birthday</option>
                <option>Anniversary</option>
                <option>Business</option>
                <option>Date night</option>
                <option>Night brunch</option>
                <option>Just dinner</option>
              </select>
            </div>

            <div className="field full" style={{ marginBottom: 30 }}>
              <span className="label-mono">A note for the room</span>
              <input
                placeholder="Quiet corner, dietary, surprise cake..."
                value={form.notes}
                onChange={(e) => update("notes", e.target.value)}
              />
            </div>

            <div className="reserve-actions">
              <button type="submit" className="btn-gold">
                Request booking <span className="arrow"></span>
              </button>
              <a className="btn-ghost" href={waLink()} target="_blank" rel="noreferrer">
                or message on WhatsApp
              </a>
            </div>

            <div className="whatsapp-strip">
              <span style={{ color: "var(--gold)" }}>✦</span>
              We confirm by WhatsApp within the hour.
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}

// ---------- Confirmation Modal ----------
function ReserveModal({ data, onClose }) {
  if (!data) return null;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>Close ✕</button>
        <span className="eyebrow">✦ Sent</span>
        <h3>See you <em>soon.</em></h3>
        <p>
          We've received your request. Our maître d' will WhatsApp
          {data.name ? ` ${data.name.split(" ")[0]}` : ""} to confirm within the hour.
        </p>
        <div className="modal-summary">
          <div>
            <div className="k">Date</div>
            <div className="v">{data.date || "—"}</div>
          </div>
          <div>
            <div className="k">Time</div>
            <div className="v">{data.time}</div>
          </div>
          <div>
            <div className="k">Party</div>
            <div className="v">{data.party}</div>
          </div>
          <div>
            <div className="k">Occasion</div>
            <div className="v">{data.occasion}</div>
          </div>
        </div>
        <a
          className="btn-gold"
          href={`https://wa.me/971564223990?text=${encodeURIComponent("Hello FRNDS, I'd like to confirm my booking request — " + (data.name || "") + " · " + data.date + " · " + data.time + " · party of " + data.party)}`}
          target="_blank"
          rel="noreferrer"
        >
          Open WhatsApp <span className="arrow"></span>
        </a>
      </div>
    </div>
  );
}

// ---------- Footer ----------
function Footer() {
  return (
    <footer className="footer">
      <div className="wrap">
        <div className="footer-grid">
          <div>
            <div className="brand-mark">FRNDS</div>
            <p className="tagline">Where Paris keeps a standing reservation in Tokyo. Downtown Dubai.</p>
          </div>
          <div>
            <h4>Visit</h4>
            <ul>
              <li>The Address Dubai Mall</li>
              <li>Ground Floor</li>
              <li>Downtown Dubai, UAE</li>
              <li style={{ marginTop: 12 }}><a href="https://maps.google.com/?q=The+Address+Dubai+Mall" target="_blank" rel="noreferrer">Directions →</a></li>
            </ul>
          </div>
          <div>
            <h4>Hours</h4>
            <ul>
              <li>Daily · 12pm — Late</li>
              <li>Night Brunch · Sat 9pm</li>
              <li>Lounge · Open until 2am</li>
            </ul>
          </div>
          <div>
            <h4>Contact</h4>
            <ul>
              <li><a href="tel:+971564223990">+971 56 422 3990</a></li>
              <li><a href="mailto:hello@frndsdubai.com">hello@frndsdubai.com</a></li>
              <li><a href="https://instagram.com/frndsdubai" target="_blank" rel="noreferrer">@frndsdubai</a></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© FRNDS Dubai · {new Date().getFullYear()}</span>
          <div className="right">
            <a href="#top">Back to top ↑</a>
            <a href="#">Privacy</a>
            <a href="#">Terms</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

Object.assign(window, { Gallery, Press, Reservation, ReserveModal, Footer });

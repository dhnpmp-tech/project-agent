// FRNDS — Privacy + Terms modal popups.
//
// UAE-law grounded: references Federal Decree-Law No. 45 of 2021 (PDPL)
// for personal data, Federal Law No. 15 of 2009 for tobacco/shisha, and
// the standard UAE VAT + municipality fee disclosure pattern. Written in
// plain language but accurate. The content reads as restaurant-house-
// rules, not a wall of legalese.
//
// Trigger: window.FRNDS_OPEN_LEGAL("privacy" | "terms") — used by the
// Footer and (optionally) the consent checkbox under the form.

/* global React */

function LegalModal({ kind, onClose }) {
  if (!kind) return null;
  const isPrivacy = kind === "privacy";

  React.useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  return (
    <div
      className="modal-backdrop legal-modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={isPrivacy ? "Privacy Notice" : "Terms of Service"}
    >
      <div className="modal-card legal-modal-card" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close">Close ✕</button>
        <span className="eyebrow">
          {isPrivacy ? "✦ Privacy Notice" : "✦ Terms of Service"}
        </span>
        <h3>
          {isPrivacy ? (
            <>How we handle <em>your information.</em></>
          ) : (
            <>The <em>house rules.</em></>
          )}
        </h3>

        <div className="legal-body">
          {isPrivacy ? <PrivacyBody /> : <TermsBody />}
        </div>

        <div className="legal-footer">
          <span className="legal-stamp">FRNDS Restaurant · Downtown Dubai · UAE</span>
          <button className="btn-gold legal-ack" onClick={onClose}>
            Understood <span className="arrow"></span>
          </button>
        </div>
      </div>
    </div>
  );
}

function PrivacyBody() {
  return (
    <>
      <p className="legal-lede">
        We collect only what's needed to confirm your reservation and serve
        you well. We do not sell or trade your data. This notice complies
        with UAE Federal Decree-Law No. 45 of 2021 (the Personal Data
        Protection Law, &quot;PDPL&quot;).
      </p>

      <LegalSection title="Who we are" body={
        <>The data controller is <strong>FRNDS Restaurant L.L.C.</strong>,
        operating at The Address Dubai Mall, Downtown Dubai, United Arab
        Emirates. For any privacy questions you can reach us at{" "}
        <a href="mailto:privacy@frndsdubai.com">privacy@frndsdubai.com</a>{" "}
        or +971 56 422 3990.</>
      } />

      <LegalSection title="What we collect" body={
        <ul className="legal-list">
          <li><strong>Identification:</strong> your name, phone number, and (if you provide them) email and WhatsApp identifier.</li>
          <li><strong>Reservation details:</strong> date, time, party size, occasion, dietary or seating notes.</li>
          <li><strong>Communications:</strong> messages exchanged with our maître d&apos; over WhatsApp, phone, or email.</li>
          <li><strong>Operational:</strong> IP address, browser, and device when you use this website (standard server logs).</li>
        </ul>
      } />

      <LegalSection title="Why we collect it · legal basis" body={
        <ul className="legal-list">
          <li>To <strong>confirm and serve your booking</strong> — necessary for performance of a contract (PDPL Art. 4).</li>
          <li>To <strong>recognise you on return visits</strong> with the preferences you&apos;ve shared — based on your consent.</li>
          <li>To <strong>comply with our legal obligations</strong> (tax, health, regulatory requests).</li>
        </ul>
      } />

      <LegalSection title="Who we share with" body={
        <>We share data only with: (a) the maître d&apos; team and kitchen
        staff who need it to serve you; (b) Meta Platforms Ireland (WhatsApp
        Business) if you communicate with us via WhatsApp — Meta&apos;s own
        privacy terms apply to that channel and your messages may be
        processed on Meta servers outside the UAE under contractual
        safeguards; (c) authorities when legally required.
        <br/><br/>
        <strong>We do not sell, rent, or trade your personal data.</strong></>
      } />

      <LegalSection title="How long we keep it" body={
        <>Reservation records: 12 months from your last visit or interaction.
        WhatsApp conversations: 24 months. Anonymised aggregate statistics:
        indefinitely. You can ask us to delete your record sooner at any
        time.</>
      } />

      <LegalSection title="Your rights under UAE PDPL" body={
        <>You may, at any time, by writing to{" "}
        <a href="mailto:privacy@frndsdubai.com">privacy@frndsdubai.com</a>:
        <ul className="legal-list">
          <li>Access the personal data we hold about you (Art. 13).</li>
          <li>Correct inaccurate data (Art. 14).</li>
          <li>Erase your data (Art. 15) — subject to legal retention duties.</li>
          <li>Restrict or object to processing (Arts. 16–17).</li>
          <li>Withdraw consent at any time — without affecting prior lawful processing.</li>
          <li>Lodge a complaint with the UAE Data Office (uaedataoffice.ae).</li>
        </ul></>
      } />

      <LegalSection title="Cookies" body={
        <>This site uses only essential cookies needed to keep your
        preferences (e.g. voice / palette toggles) during your visit. No
        third-party tracking, no advertising cookies.</>
      } />

      <LegalSection title="Security" body={
        <>We apply industry-standard safeguards — encrypted transport, access
        controls, and limited retention — to protect your data against
        unauthorised access, loss, or disclosure. Notwithstanding our care,
        no internet transmission is fully immune from risk.</>
      } />

      <p className="legal-meta">
        Last updated: 14 May 2026 · Governing law: United Arab Emirates ·
        Disputes: Dubai courts.
      </p>
    </>
  );
}

function TermsBody() {
  return (
    <>
      <p className="legal-lede">
        These are the simple rules of our room. By making a reservation or
        visiting FRNDS you agree to them. They are governed by the laws of
        the United Arab Emirates.
      </p>

      <LegalSection title="Reservations" body={
        <>A reservation through this site or WhatsApp is a <strong>request</strong>.
        Your table is confirmed only after our maître d&apos; replies (typically
        within an hour). Tables are held for <strong>15 minutes</strong> past
        the booked time; after that we may release them.</>
      } />

      <LegalSection title="Cancellations · no-shows" body={
        <ul className="legal-list">
          <li>You may cancel free of charge up to <strong>4 hours</strong> before your booking by WhatsApp or phone.</li>
          <li>For parties of <strong>8 or more</strong>, please give 24 hours&apos; notice. Late cancellations or no-shows on large parties may incur a <strong>AED 150 per guest</strong> fee charged to the card on file.</li>
          <li>Night Brunch reservations require a non-refundable deposit equal to one cover.</li>
        </ul>
      } />

      <LegalSection title="Age · alcohol · shisha" body={
        <>
          <strong>Alcohol:</strong> served only to guests aged 21 and over with
          valid government-issued ID. We refuse service to anyone we cannot
          verify or who appears intoxicated.<br/><br/>
          <strong>Shisha:</strong> served only to guests aged <strong>18 and
          over</strong>, in our designated outdoor area, in compliance with
          UAE Federal Law No. 15 of 2009 on tobacco control and the related
          Cabinet Resolutions. Shisha is not available during Holy Month
          daytime hours.
        </>
      } />

      <LegalSection title="Dress code" body={
        <>Smart elegant. No athleisure, beachwear, or branded sportswear.
        Closed shoes after 8pm. Our doormen have final discretion.</>
      } />

      <LegalSection title="Allergens · dietary" body={
        <>Please tell us about any allergy or intolerance when you book and
        again with your server. Our kitchen handles wheat, dairy, eggs,
        soy, sesame, tree nuts, peanuts, fish, shellfish, sulphites, and
        alcohol. We take care but <strong>we cannot guarantee absence of
        traces.</strong> Guests with severe allergies dine at their own
        informed risk.</>
      } />

      <LegalSection title="Pricing" body={
        <>All prices are in <strong>UAE Dirhams (AED)</strong> and exclude
        the statutory 5% VAT and the 7% Dubai municipality fee, both of
        which are added at billing. Service charge is included unless
        stated. Menu items and prices are subject to change without
        notice.</>
      } />

      <LegalSection title="Right to refuse service" body={
        <>FRNDS reserves the right to refuse or terminate service to any
        guest whose conduct is disrespectful, unsafe, or contrary to UAE
        public-decency laws or these terms.</>
      } />

      <LegalSection title="Photography · social media" body={
        <>Discreet photography of your own table is welcome. Filming other
        guests, the kitchen, or staff requires prior permission from
        management. By tagging us on social media you grant FRNDS a
        non-exclusive, royalty-free licence to reshare your post on our own
        channels with attribution.</>
      } />

      <LegalSection title="Force majeure" body={
        <>FRNDS is not liable for failure to perform caused by events beyond
        our reasonable control — including but not limited to severe
        weather, utility outages, public-health orders, government
        instructions, or strikes.</>
      } />

      <LegalSection title="Governing law" body={
        <>These terms, your reservation, and any dispute arising from your
        visit are governed by the federal laws of the United Arab Emirates
        and the local laws of the Emirate of Dubai. Disputes shall be
        submitted to the exclusive jurisdiction of the courts of Dubai.</>
      } />

      <p className="legal-meta">
        Last updated: 14 May 2026 · Questions:{" "}
        <a href="mailto:hello@frndsdubai.com">hello@frndsdubai.com</a>
      </p>
    </>
  );
}

function LegalSection({ title, body }) {
  return (
    <section className="legal-block">
      <h4>{title}</h4>
      <div>{body}</div>
    </section>
  );
}

Object.assign(window, { LegalModal });

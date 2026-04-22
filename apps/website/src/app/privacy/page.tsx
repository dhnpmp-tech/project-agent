export const metadata = {
  title: "Privacy — Project Agent",
  description: "How Project Agent handles your data, with UAE PDPL and KSA PDPL alignment.",
};

export default function PrivacyPage() {
  return (
    <main
      style={{
        maxWidth: 760,
        margin: "0 auto",
        padding: "80px 24px",
        color: "#fafafa",
        fontSize: 15,
        lineHeight: 1.7,
      }}
    >
      <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 24 }}>Privacy</h1>

      <p>
        Project Agent operates in the United Arab Emirates and the Kingdom of Saudi Arabia.
        We align our data handling with the{" "}
        <strong>UAE PDPL</strong> (Federal Decree-Law No. 45 of 2021) and the{" "}
        <strong>KSA PDPL</strong> (Royal Decree M/19 of 2021).
      </p>

      <h2 style={{ fontSize: 22, fontWeight: 600, marginTop: 40, marginBottom: 12 }}>
        Ask Rami chat widget
      </h2>
      <p>
        The chat widget on this site lets you talk to <em>Rami</em>, our AI co-founder.
        It is intentionally minimal:
      </p>
      <ul style={{ paddingInlineStart: 20, marginTop: 12 }}>
        <li>
          <strong>What is stored:</strong> the messages you send, Rami&apos;s replies,
          and any identity facts you volunteer (name, email, company, phone).
          Nothing else — we do not record your IP, fingerprint, or browsing history.
        </li>
        <li>
          <strong>Retention:</strong> conversation history is kept for{" "}
          <strong>30 days</strong>, then automatically purged. Rate-limit metadata
          is dropped after 25 hours.
        </li>
        <li>
          <strong>Forget me:</strong> open the widget, tap the ⓘ icon, and use{" "}
          <strong>Forget me</strong>. Your record is deleted from our database
          immediately.
        </li>
        <li>
          <strong>Cross-device merge:</strong> if you share an email, we may merge
          your prior session on another device into the current one — so Rami
          remembers you across visits. <strong>Forget me</strong> deletes both.
        </li>
        <li>
          <strong>Sharing:</strong> we do not sell or share your chat data. The
          conversation is processed by our LLM provider for the sole purpose of
          generating Rami&apos;s reply.
        </li>
      </ul>

      <h2 style={{ fontSize: 22, fontWeight: 600, marginTop: 40, marginBottom: 12 }}>
        Your rights
      </h2>
      <p>
        Under <strong>UAE PDPL</strong> and <strong>KSA PDPL</strong>, you have the
        right to access, correct, delete, or restrict processing of your personal
        data. Email <a href="mailto:privacy@project-agent.ae" style={{ color: "#10b981" }}>
        privacy@project-agent.ae</a> and we will respond within 30 days.
      </p>

      <hr style={{ borderColor: "#27272a", margin: "48px 0" }} />

      <section dir="rtl" lang="ar">
        <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 12 }}>الخصوصية</h2>
        <p>
          نتعامل مع بياناتك وفقاً لقانون حماية البيانات الشخصية الإماراتي (UAE PDPL)
          وقانون حماية البيانات الشخصية السعودي (KSA PDPL). الدردشة مع رامي تخزن فقط
          الرسائل، الردود، والمعلومات الشخصية اللي تشاركها معنا (مثل الاسم والإيميل).
          نحتفظ بهذه البيانات لمدة 30 يوماً، ثم تُحذف تلقائياً. تقدر تطلب الحذف الفوري
          بأي وقت من زر &quot;Forget me&quot; داخل الويدجت.
        </p>
      </section>
    </main>
  );
}

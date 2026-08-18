"use client";
import { useI18n } from "@/lib/i18n";
import { LegalLayout } from "@/components/shell/legal-layout";

/* Halaman legal/about bilingual penuh — mengikuti locale aktif (en default). */

type Sec = { h: string; p?: string[]; ul?: string[] };
type Doc = { title: string; secs: Sec[] };

const ABOUT: Record<"en" | "id", Doc> = {
  en: {
    title: "About INTENT",
    secs: [
      {
        h: "Mission",
        p: [
          "INTENT turns “what happened in similar projects before” into structured, cited, and calibrated research input — so airdrop/investment decisions are made on causal patterns, not hype.",
        ],
      },
      {
        h: "How knowledge is built",
        ul: [
          "Verified research (whitepapers, on-chain data, official documents) is extracted into structured entities.",
          "Our causal unit is the Decision Event (Context → Trigger → Decision → 8-POV Reactions → Outcomes), not “projects” in general.",
          "A pattern is only recognized when it repeats across unrelated projects, with confidence based on instance count and era scope.",
          "Every claim carries a one-click citation chain and Evidence Level; the prediction track record is published and graded publicly.",
        ],
      },
      {
        h: "Who it is for",
        p: ["Researchers, analysts, and funds doing pre-TGE due diligence — plus content creators who need data-backed material, not speculation."],
      },
      {
        h: "Honest limits",
        p: ["We are not an oracle: outputs are probabilistic, confidence-labeled, and always traceable to sources. When data is thin, the UI shows an empty state — not a guess."],
      },
      {
        h: "Contact",
        p: ["General: hello@cif.local · Privacy: privacy@cif.local · Security: security@cif.local"],
      },
    ],
  },
  id: {
    title: "Tentang INTENT",
    secs: [
      {
        h: "Misi",
        p: [
          "INTENT mengubah “apa yang terjadi pada proyek serupa sebelumnya” menjadi input riset terstruktur, bersitasi, dan terkalibrasi — sehingga keputusan airdrop/investasi dibuat di atas pola kausal, bukan hype.",
        ],
      },
      {
        h: "Cara knowledge dibangun",
        ul: [
          "Riset terverifikasi (whitepaper, on-chain, dokumen resmi) diekstrak ke entitas terstruktur.",
          "Unit kausal kami adalah Decision Event (Context → Trigger → Decision → Reactions 8-POV → Outcomes), bukan “proyek” secara umum.",
          "Pattern hanya diakui bila berulang lintas proyek tak terkait, dengan confidence berbasis jumlah instance dan scope era.",
          "Setiap klaim membawa rantai sitasi satu-klik dan Evidence Level; track record prediksi dipublikasikan dan di-grade publik.",
        ],
      },
      {
        h: "Untuk siapa",
        p: ["Researcher, analis, dan fund yang melakukan due-diligence pre-TGE — serta kreator konten yang butuh bahan berbasis data, bukan spekulasi."],
      },
      {
        h: "Batasan jujur",
        p: ["Kami bukan oracle: output probabilistik, berlabel confidence, dan selalu dapat ditelusuri ke sumbernya. Bila data tipis, UI menampilkan empty-state — bukan tebakan."],
      },
      {
        h: "Kontak",
        p: ["Umum: hello@cif.local · Privacy: privacy@cif.local · Security: security@cif.local"],
      },
    ],
  },
};

const PRIVACY: Record<"en" | "id", Doc> = {
  en: {
    title: "Privacy Policy",
    secs: [
      {
        h: "1. Data we collect",
        ul: [
          "Account: email, name, and (if you sign in with Google) the Google account identifiers you approve via the openid email profile scopes. We do NOT request access to Gmail, Drive, Contacts, or any other Google data.",
          "Your content: drafts, watchlists, saved simulations, and preferences you create on the platform.",
          "Usage logs: timestamps of actions (generate, share, login) for audit trail and security.",
          "Public research data: all intelligence on the platform comes from verified public sources (INTENT dossiers), not from users' personal data.",
        ],
      },
      {
        h: "2. How we use data",
        ul: [
          "To provide the service (authentication, tier personalization, watchlist notifications).",
          "Security: abuse detection, rate-limiting, audit trail.",
          "We do NOT sell personal data; we do NOT use Google data for advertising; Google data use is subject to the Google API Services User Data Policy, including limited use requirements.",
        ],
      },
      {
        h: "3. Data sharing",
        ul: [
          "Content you publish via Direct Post is shared to X only on your explicit instruction.",
          "Infrastructure vendors (hosting, database) process data on our behalf under confidentiality obligations.",
          "Law enforcement: only when required by law.",
        ],
      },
      {
        h: "4. Retention & deletion",
        p: [
          "Account and content data are kept while the account is active. You may request permanent deletion at any time via privacy@cif.local (processed within 30 days). Session cookies expire after at most 7 days.",
        ],
      },
      {
        h: "5. Security",
        p: [
          "Passwords are hashed (scrypt); sessions are signed (HMAC) and HttpOnly; TLS on all connections; RBAC and internal audit trail. No method is 100% secure, but we apply industry standards.",
        ],
      },
      {
        h: "6. Your rights",
        ul: [
          "Access & copy of your data; correction; deletion; restriction of processing; objection to specific processing.",
          "Revoke the Google account connection at any time from your Google account settings.",
        ],
      },
      {
        h: "7. Cookies",
        p: ["Functional cookies only: authentication session (cif_session) and temporary OAuth state. No advertising/third-party tracking cookies."],
      },
      {
        h: "8. Minors",
        p: ["The service is not intended for users under 18; we do not knowingly collect children's data."],
      },
      {
        h: "9. Policy changes",
        p: ["Material changes are announced on this page at least 14 days before taking effect."],
      },
      {
        h: "10. Contact",
        p: ["Data operator: INTENT · privacy@cif.local."],
      },
    ],
  },
  id: {
    title: "Kebijakan Privasi",
    secs: [
      {
        h: "1. Data yang kami kumpulkan",
        ul: [
          "Akun: email, nama, dan (bila Anda sign-in dengan Google) identifier akun Google yang Anda izinkan via scope openid email profile. Kami TIDAK meminta akses ke Gmail, Drive, Contacts, atau data Google lainnya.",
          "Konten Anda: draft konten, watchlist, simulasi tersimpan, dan preferensi yang Anda buat di platform.",
          "Log penggunaan: timestamp aksi (generate, share, login) untuk audit trail dan keamanan.",
          "Data riset publik: seluruh intelligence di platform berasal dari sumber publik terverifikasi (dossier INTENT), bukan data pribadi pengguna.",
        ],
      },
      {
        h: "2. Cara kami menggunakan data",
        ul: [
          "Menyediakan layanan (autentikasi, personalisasi tier, notifikasi watchlist).",
          "Keamanan: deteksi penyalahgunaan, rate-limiting, audit trail.",
          "Kami TIDAK menjual data pribadi; TIDAK memakai data Google untuk iklan; penggunaan data Google tunduk pada Google API Services User Data Policy, termasuk ketentuan limited use.",
        ],
      },
      {
        h: "3. Berbagi data",
        ul: [
          "Konten yang Anda terbitkan via Direct Post dibagikan ke X atas instruksi eksplisit Anda.",
          "Vendor infrastruktur (hosting, database) hanya memproses data atas nama kami dengan kewajiban kerahasiaan.",
          "Penegakan hukum: hanya bila diwajibkan undang-undang.",
        ],
      },
      {
        h: "4. Retensi & penghapusan",
        p: [
          "Data akun dan konten disimpan selama akun aktif. Anda dapat meminta penghapusan permanen kapan pun via privacy@cif.local (diproses ≤ 30 hari). Cookie sesi berakhir maksimal 7 hari.",
        ],
      },
      {
        h: "5. Keamanan",
        p: [
          "Password di-hash (scrypt); sesi ditandatangani (HMAC) dan HttpOnly; TLS di seluruh koneksi; RBAC dan audit trail internal. Tidak ada metode yang 100% aman, namun kami menerapkan standar industri.",
        ],
      },
      {
        h: "6. Hak Anda",
        ul: [
          "Akses & salinan data Anda; koreksi; penghapusan; pembatasan pemrosesan; keberatan atas pemrosesan tertentu.",
          "Mencabut koneksi akun Google kapan pun dari pengaturan akun Google Anda.",
        ],
      },
      {
        h: "7. Cookie",
        p: ["Cookie fungsional saja: sesi autentikasi (cif_session) dan state OAuth sementara. Tanpa cookie iklan/tracking pihak ketiga."],
      },
      {
        h: "8. Anak di bawah umur",
        p: ["Layanan tidak ditujukan untuk usia < 18 tahun; kami tidak sengaja mengumpulkan data anak."],
      },
      {
        h: "9. Perubahan kebijakan",
        p: ["Perubahan material diumumkan di halaman ini ≥ 14 hari sebelum berlaku."],
      },
      {
        h: "10. Kontak",
        p: ["Operator data: INTENT · privacy@cif.local."],
      },
    ],
  },
};

const TERMS: Record<"en" | "id", Doc> = {
  en: {
    title: "Terms of Service",
    secs: [
      { h: "1. Acceptance", p: ["By accessing INTENT (the “Service”), you are bound by these Terms and the Privacy Policy. If you do not agree, do not use the Service."] },
      {
        h: "2. Not investment advice",
        p: [
          "All outputs — scores, patterns, probabilistic predictions, content drafts — are research inputs for your own decisions, not investment/financial/legal advice. Past performance does not guarantee future results. You are fully responsible for your decisions.",
        ],
      },
      {
        h: "3. Accounts & security",
        ul: [
          "You may register with platform credentials or Sign in with Google; the Google connection can be revoked at any time from your Google account.",
          "You are responsible for keeping your access confidential; report abuse to security@cif.local.",
          "Minimum age 18.",
        ],
      },
      {
        h: "4. Permitted & prohibited use",
        ul: [
          "Prohibited: mass scraping, reverse engineering, attempting to bypass access controls (IDOR/CSRF/probing), using the Service for market manipulation, spam, or unlawful activity.",
          "AI content you share must include the “Powered by INTENT” attribution and must not be presented as fact without verification.",
        ],
      },
      {
        h: "5. AI content & data truthfulness",
        p: [
          "The Service is built on verified dossiers with citation chains; however we do not guarantee completeness or error-freedom. Claims carry Evidence Level labels (HIGH/MED/LOW) — use the citation panel to verify raw sources before sharing.",
        ],
      },
      {
        h: "6. Intellectual property",
        p: [
          "The platform, brand, and reasoning framework belong to the operator. You own the content you create; by publishing it via the Service you grant a limited license for technical distribution (rendering, share cards).",
        ],
      },
      { h: "7. Subscriptions & tiers", p: ["Free/Pro features may change with notice; payments (where enabled) follow the payment provider's terms. You may downgrade at any time."] },
      { h: "8. Termination", p: ["We may suspend accounts that violate these Terms, with notice where reasonable. You may delete your account at any time."] },
      {
        h: "9. Limitation of liability",
        p: [
          "The Service is provided “as is”. To the extent permitted by law, we are not liable for indirect losses/lost profits. Our total liability is limited to amounts you paid in the last 12 months (if any).",
        ],
      },
      { h: "10. Changes & governing law", p: ["Material changes are notified at least 14 days in advance. Disputes are governed by the laws of the operator's jurisdiction, without prejudice to mandatory consumer rights."] },
    ],
  },
  id: {
    title: "Ketentuan Layanan (S&K)",
    secs: [
      { h: "1. Persetujuan", p: ["Dengan mengakses INTENT (“Layanan”), Anda terikat oleh Terms ini serta Privacy Policy. Bila Anda tidak setuju, jangan gunakan Layanan."] },
      {
        h: "2. Bukan nasihat investasi",
        p: [
          "Seluruh output — skor, pattern, prediksi probabilistik, draft konten — adalah input riset untuk keputusan Anda sendiri, bukan nasihat investasi/keuangan/legal. Kinerja historis tidak menjamin hasil mendatang. Anda bertanggung jawab penuh atas keputusan Anda.",
        ],
      },
      {
        h: "3. Akun & keamanan",
        ul: [
          "Anda dapat mendaftar dengan kredensial platform atau Sign in with Google; koneksi Google dapat dicabut kapan pun dari akun Google Anda.",
          "Anda bertanggung jawab menjaga kerahasiaan akses Anda; laporkan penyalahgunaan ke security@cif.local.",
          "Usia minimal 18 tahun.",
        ],
      },
      {
        h: "4. Penggunaan yang diizinkan & dilarang",
        ul: [
          "Dilarang: scraping masif, reverse-engineering, mencoba menembus kontrol akses (IDOR/CSRF/probing), memakai Layanan untuk manipulasi pasar, spam, atau pelanggaran hukum.",
          "Konten AI yang Anda bagikan wajib menyertakan atribusi “Powered by INTENT” dan tidak boleh disajikan sebagai fakta tanpa verifikasi.",
        ],
      },
      {
        h: "5. Konten AI & kebenaran data",
        p: [
          "Layanan dibangun di atas dossier terverifikasi dengan rantai sitasi; namun kami tidak menjamin kelengkapan/kebebasan kesalahan. Klaim berlabel Evidence Level (HIGH/MED/LOW) — gunakan panel sitasi untuk memverifikasi sumber mentah sebelum membagikan.",
        ],
      },
      {
        h: "6. Kekayaan intelektual",
        p: [
          "Platform, merek, dan kerangka reasoning adalah milik operator. Anda memiliki konten yang Anda buat; dengan menerbitkannya via Layanan Anda memberi lisensi terbatas untuk distribusi teknis (render, share card).",
        ],
      },
      { h: "7. Langganan & tier", p: ["Fitur Free/Pro dapat berubah dengan pemberitahuan; pembayaran (bila diaktifkan) mengikuti ketentuan penyedia pembayaran. Anda dapat menurunkan tier kapan pun."] },
      { h: "8. Pemutusan", p: ["Kami dapat menangguhkan akun yang melanggar Terms, dengan pemberitahuan bila wajar. Anda dapat menghapus akun kapan pun."] },
      {
        h: "9. Batasan tanggung jawab",
        p: [
          "Layanan disediakan “as is”. Sejauh diizinkan hukum, kami tidak liable atas kerugian tidak langsung/kehilangan keuntungan. Total tanggung jawab kami dibatasi jumlah yang Anda bayar 12 bulan terakhir (bila ada).",
        ],
      },
      { h: "10. Perubahan & hukum yang berlaku", p: ["Perubahan material diberitahukan ≥ 14 hari. Sengketa tunduk pada hukum yurisdiksi operator, tanpa mengesampingkan hak konsumen yang berlaku wajib."] },
    ],
  },
};

function LegalDoc({ doc }: { doc: Doc }) {
  return (
    <LegalLayout title={doc.title} updated="2026-08-12">
      {doc.secs.map((s) => (
        <section key={s.h}>
          <h2>{s.h}</h2>
          {s.p?.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
          {s.ul && (
            <ul>
              {s.ul.map((li, i) => (
                <li key={i}>{li}</li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </LegalLayout>
  );
}

export function AboutClient() {
  const { locale } = useI18n();
  return <LegalDoc doc={ABOUT[locale === "id" ? "id" : "en"]} />;
}
export function PrivacyClient() {
  const { locale } = useI18n();
  return <LegalDoc doc={PRIVACY[locale === "id" ? "id" : "en"]} />;
}
export function TermsClient() {
  const { locale } = useI18n();
  return <LegalDoc doc={TERMS[locale === "id" ? "id" : "en"]} />;
}

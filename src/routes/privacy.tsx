import { createFileRoute, Link } from "@tanstack/react-router";

const CANONICAL = "https://signalsignin.company/privacy";
const DESCRIPTION =
  "How SignalSignin collects, uses, and protects your personal data.";

export const Route = createFileRoute("/privacy")({
  // Conteúdo 100% estático — sem loader, sem fetch. Pré-renderizado em
  // build time via tanstackStart.pages no vite.config.ts.
  head: () => ({
    meta: [
      { title: "Privacy Policy — SignalSignin" },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: "Privacy Policy — SignalSignin" },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: CANONICAL },
    ],
    links: [{ rel: "canonical", href: CANONICAL }],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <Link to="/" className="text-xs text-muted-foreground hover:text-foreground">← Back</Link>
        <article className="mt-6">
          <header>
            <h1 className="text-3xl font-semibold tracking-tight">Privacy Policy</h1>
            <p className="mt-2 text-sm text-muted-foreground">Last updated: June 25, 2026</p>
          </header>

          <div className="prose prose-invert mt-8 space-y-6 text-sm leading-relaxed text-muted-foreground">
            <p>
              This Privacy Policy explains how SignalSignin ("we", "us") collects, uses, and shares
              information about you when you use our Service.
            </p>

            <section>
              <h2 className="text-base font-semibold text-foreground">1. Information we collect</h2>
              <p>
                We collect account information you provide (email, name), authentication metadata,
                usage telemetry, and information about devices you use to access the Service.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-foreground">2. How we use information</h2>
              <p>
                We use the data to operate, secure, and improve the Service, to communicate with you,
                and to comply with legal obligations.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-foreground">3. Sharing</h2>
              <p>
                We do not sell personal information. We share data only with processors needed to run
                the Service (hosting, analytics, payments) under contracts that require confidentiality.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-foreground">4. Your rights</h2>
              <p>
                Depending on your jurisdiction you may have rights to access, correct, or delete your
                personal data. Contact us to exercise these rights.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-foreground">5. Contact</h2>
              <p>For privacy questions, contact support@signalsignin.company.</p>
            </section>

            <p className="pt-4 italic">
              This is placeholder content. Replace with your final legal text before launch.
            </p>
          </div>
        </article>
      </div>
    </main>
  );
}

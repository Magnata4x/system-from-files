import { createFileRoute, Link } from "@tanstack/react-router";

const CANONICAL = "https://signalsignin.company/terms";
const DESCRIPTION =
  "Terms of Service governing use of the SignalSignin platform.";

export const Route = createFileRoute("/terms")({
  // Conteúdo 100% estático — sem loader, sem fetch. Pré-renderizado em
  // build time via tanstackStart.pages no vite.config.ts.
  head: () => ({
    meta: [
      { title: "Terms of Service — SignalSignin" },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: "Terms of Service — SignalSignin" },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: CANONICAL },
    ],
    links: [{ rel: "canonical", href: CANONICAL }],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <Link to="/" className="text-xs text-muted-foreground hover:text-foreground">← Back</Link>
        <article className="mt-6">
          <header>
            <h1 className="text-3xl font-semibold tracking-tight">Terms of Service</h1>
            <p className="mt-2 text-sm text-muted-foreground">Last updated: June 25, 2026</p>
          </header>

          <div className="prose prose-invert mt-8 space-y-6 text-sm leading-relaxed text-muted-foreground">
            <p>
              These Terms of Service ("Terms") govern your access to and use of the SignalSignin
              platform ("Service"). By creating an account or using the Service, you agree to be
              bound by these Terms.
            </p>

            <section>
              <h2 className="text-base font-semibold text-foreground">1. Use of the Service</h2>
              <p>
                The Service provides market analytics, signals, and automated trading tools for
                informational purposes only. Nothing on the platform constitutes financial advice or
                an offer to buy or sell any asset.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-foreground">2. Trading risk</h2>
              <p>
                Trading digital assets is highly speculative and may result in the total loss of your
                capital. You are solely responsible for any decisions you make based on data provided
                by the Service.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-foreground">3. Account responsibility</h2>
              <p>
                You are responsible for safeguarding your credentials and for all activity that occurs
                under your account.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-foreground">4. Changes</h2>
              <p>
                We may update these Terms from time to time. Material changes will be communicated via
                the platform or email.
              </p>
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

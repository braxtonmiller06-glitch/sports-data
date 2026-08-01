import { Link } from "react-router-dom";
import { Navbar } from "../components/Navbar";
import { Button } from "../components/Button";
import { Container } from "../components/Container";
import { PickCard } from "../components/PickCard";
import { samplePick } from "../data/samplePick";

const SPORTS = ["WNBA", "NFL", "MLB", "MLS", "EPL", "La Liga", "Serie A", "Bundesliga", "Ligue 1"];

const PRINCIPLES = [
  {
    title: "No checklist counting",
    body: "Every filter returns a signal, a strength, and a confidence -- not a checkmark. We never say '7/10 filters passed, bet it.'",
  },
  {
    title: "Correlation-aware",
    body: "Pace and volume aren't two signals -- they're one causal chain restated twice. We collapse correlated filters before we trust an edge.",
  },
  {
    title: "Priced against the market",
    body: "A great projection can still be a bad bet if the market already knows. We only surface a pick when our probability clears the market's.",
  },
  {
    title: "Learns from results",
    body: "Every filter's weight adjusts after every graded pick -- filters that call it right earn more influence, filters that don't lose it.",
  },
];

const TIERS = [
  {
    name: "Free",
    price: "$0",
    period: "",
    features: ["Daily lean-tier picks", "Public results tracking", "Community Discord access"],
    cta: "Get started",
    variant: "secondary" as const,
  },
  {
    name: "Sharp",
    price: "$29",
    period: "/mo",
    features: [
      "Every BET & PLAYABLE pick, all sports",
      "Full filter breakdown per pick",
      "Closing-line value tracking",
      "Priority Discord alerts",
    ],
    cta: "Start free trial",
    variant: "primary" as const,
    highlighted: true,
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-ink-950">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden pt-20 pb-24">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[560px] opacity-40"
          style={{
            background:
              "radial-gradient(600px circle at 50% -10%, rgba(22,193,114,0.25), transparent 70%)",
          }}
        />
        <Container className="text-center">
          <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-ink-700 bg-ink-900 px-3 py-1 text-xs font-medium text-ink-300">
            <span className="h-1.5 w-1.5 rounded-full bg-edge-500" />
            43 filters · 4 sports · one probability
          </div>
          <h1 className="mx-auto max-w-3xl text-5xl font-extrabold tracking-tight text-ink-50 sm:text-6xl">
            Picks built on <span className="text-edge-400">edge</span>, not vibes.
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-ink-300">
            Every pick runs through a real probabilistic model — dozens of independent filters,
            weighted by their own track record, checked against the market price before it's
            ever called a bet.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link to="/signup">
              <Button className="px-7 py-3 text-base">See today's picks</Button>
            </Link>
            <a href="#how-it-works">
              <Button variant="secondary" className="px-7 py-3 text-base">
                How it works
              </Button>
            </a>
          </div>
          <div className="mt-14 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-ink-400">
            {SPORTS.map((s) => (
              <span key={s}>{s}</span>
            ))}
          </div>
        </Container>
      </section>

      {/* Live example */}
      <section id="how-it-works" className="border-t border-ink-800 py-24">
        <Container>
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-ink-50">This is what a pick actually looks like</h2>
            <p className="mt-4 text-ink-300">
              Not a tout's gut feeling. An aggregated, market-checked probability with every
              contributing signal shown -- expand it below.
            </p>
          </div>
          <div className="mx-auto mt-10 max-w-2xl">
            <PickCard pick={samplePick} />
            <p className="mt-3 text-center text-xs text-ink-500">
              Illustrative example -- shaped exactly like a real pick, not a historical result.
            </p>
          </div>
        </Container>
      </section>

      {/* Principles */}
      <section className="border-t border-ink-800 bg-ink-900/40 py-24">
        <Container>
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-ink-50">The engine, in four rules</h2>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            {PRINCIPLES.map((p) => (
              <div key={p.title} className="rounded-xl border border-ink-800 bg-ink-900 p-6">
                <h3 className="font-semibold text-ink-50">{p.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-400">{p.body}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-t border-ink-800 py-24">
        <Container>
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-ink-50">Simple pricing</h2>
            <p className="mt-4 text-ink-300">Cancel anytime. No long-term commitment.</p>
          </div>
          <div className="mx-auto mt-12 grid max-w-3xl gap-6 sm:grid-cols-2">
            {TIERS.map((tier) => (
              <div
                key={tier.name}
                className={`rounded-2xl border p-8 ${
                  tier.highlighted
                    ? "border-edge-500/50 bg-ink-900 shadow-xl shadow-edge-500/10"
                    : "border-ink-800 bg-ink-900/60"
                }`}
              >
                <h3 className="text-lg font-semibold text-ink-50">{tier.name}</h3>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-ink-50">{tier.price}</span>
                  <span className="text-ink-400">{tier.period}</span>
                </div>
                <ul className="mt-6 space-y-3 text-sm text-ink-300">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0 text-edge-400" fill="none" stroke="currentColor" strokeWidth={2.5}>
                        <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link to="/signup" className="mt-8 block">
                  <Button variant={tier.variant} className="w-full">
                    {tier.cta}
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Footer */}
      <footer className="border-t border-ink-800 py-10">
        <Container className="flex flex-col items-center justify-between gap-4 text-sm text-ink-500 sm:flex-row">
          <span>© {new Date().getFullYear()} Sharpline. All picks are probabilistic estimates, not guarantees.</span>
          <span>21+. Please bet responsibly.</span>
        </Container>
      </footer>
    </div>
  );
}

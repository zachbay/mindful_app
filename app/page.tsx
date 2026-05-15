import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen px-5 py-6 sm:px-8">
      <section className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-5xl flex-col justify-between gap-12 rounded-none">
        <nav className="flex items-center justify-between text-sm text-[var(--muted)]">
          <span className="font-semibold tracking-[0.14em] text-[var(--leaf-dark)] uppercase">
            BayWel
          </span>
          <Link href="/dashboard" className="hover:text-[var(--leaf-dark)]">
            Dashboard
          </Link>
        </nav>

        <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <p className="mb-4 text-sm font-semibold text-[var(--leaf)]">
              Physical cards first. Digital reflection when it helps.
            </p>
            <h1 className="max-w-3xl text-5xl leading-[1.02] font-semibold text-[var(--leaf-dark)] sm:text-7xl">
              BayWel
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-[var(--muted)]">
              A mobile companion for tactile mindfulness cards, built for quiet
              reflection, optional AI guidance, and user-owned memory.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/r/mindful-work/mw-017"
                className="rounded-md bg-[var(--leaf)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--leaf-dark)]"
              >
                Open sample card
              </Link>
              <Link
                href="/dashboard"
                className="rounded-md border border-[var(--line)] px-5 py-3 text-sm font-semibold text-[var(--leaf-dark)] transition hover:border-[var(--leaf)]"
              >
                View memory preview
              </Link>
            </div>
          </div>

          <div className="soft-shadow border border-[var(--line)] bg-[var(--paper)] p-5 sm:p-6">
            <div className="aspect-[4/5] border border-[var(--line)] bg-[var(--water)] p-6">
              <div className="flex h-full flex-col justify-between">
                <div>
                  <p className="text-xs font-semibold tracking-[0.18em] text-[var(--leaf)] uppercase">
                    Mindful Work
                  </p>
                  <h2 className="mt-8 text-3xl leading-tight font-semibold text-[var(--leaf-dark)]">
                    What would feel lighter if you gave it your full attention
                    for two minutes?
                  </h2>
                </div>
                <p className="text-sm text-[var(--muted)]">
                  Continue this reflection with the QR companion.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 border-t border-[var(--line)] pt-5 text-sm text-[var(--muted)] sm:grid-cols-3">
          <p>No install or signup wall.</p>
          <p>Anonymous reflection stays available.</p>
          <p>Memory starts only with clear consent.</p>
        </div>
      </section>
    </main>
  );
}

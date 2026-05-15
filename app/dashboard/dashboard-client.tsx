"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import BayWelLogo from "../components/baywel-logo";

type SavedReflection = {
  id: string;
  deckId: string;
  cardId: string;
  prompt: string;
  text: string;
  summary: string;
  themes: string[];
  createdAt: string;
};

export default function DashboardClient() {
  const [reflections, setReflections] = useState<SavedReflection[]>([]);
  const [memoryEnabled, setMemoryEnabled] = useState(false);

  useEffect(() => {
    setMemoryEnabled(localStorage.getItem("baywel-memory-enabled") === "true");
    setReflections(
      JSON.parse(localStorage.getItem("baywel-reflections") ?? "[]")
    );
  }, []);

  const themeCounts = useMemo(() => {
    const counts = new Map<string, number>();
    reflections.forEach((reflection) => {
      reflection.themes.forEach((theme) => {
        counts.set(theme, (counts.get(theme) ?? 0) + 1);
      });
    });

    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [reflections]);

  function clearMemory() {
    localStorage.removeItem("baywel-reflections");
    localStorage.removeItem("baywel-memory-enabled");
    setReflections([]);
    setMemoryEnabled(false);
  }

  return (
    <main className="min-h-screen px-4 py-5 sm:px-6">
      <section className="mx-auto max-w-6xl">
        <nav className="flex items-center justify-between text-sm">
          <Link
            href="/"
            className="inline-flex transition hover:opacity-75"
            aria-label="BayWel registered trademark home"
          >
            <BayWelLogo />
          </Link>
          <Link href="/r/mindful-work/mw-017" className="text-[var(--muted)]">
            Sample card
          </Link>
        </nav>

        <header className="mt-12 max-w-3xl">
          <p className="text-sm font-semibold text-[var(--leaf)]">
            Memory preview
          </p>
          <h1 className="mt-2 text-4xl leading-tight font-semibold text-[var(--leaf-dark)] sm:text-5xl">
            A quiet place for patterns to become visible.
          </h1>
          <p className="mt-5 text-lg leading-8 text-[var(--muted)]">
            This MVP stores reflections locally in your browser. It models the
            future longitudinal view without sending private reflections to a
            backend.
          </p>
        </header>

        <section className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="border border-[var(--line)] bg-[var(--paper)] p-5">
            <p className="text-sm text-[var(--muted)]">Memory</p>
            <p className="mt-2 text-2xl font-semibold text-[var(--leaf-dark)]">
              {memoryEnabled ? "Enabled" : "Off"}
            </p>
          </div>
          <div className="border border-[var(--line)] bg-[var(--paper)] p-5">
            <p className="text-sm text-[var(--muted)]">Saved reflections</p>
            <p className="mt-2 text-2xl font-semibold text-[var(--leaf-dark)]">
              {reflections.length}
            </p>
          </div>
          <div className="border border-[var(--line)] bg-[var(--paper)] p-5">
            <p className="text-sm text-[var(--muted)]">Recurring themes</p>
            <p className="mt-2 text-2xl font-semibold text-[var(--leaf-dark)]">
              {themeCounts.length}
            </p>
          </div>
        </section>

        <section className="mt-4 grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="border border-[var(--line)] bg-[var(--paper)] p-5">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xl font-semibold text-[var(--leaf-dark)]">
                Themes
              </h2>
              <button
                type="button"
                onClick={clearMemory}
                className="rounded-md border border-[var(--line)] px-3 py-2 text-sm font-semibold text-[var(--leaf-dark)] transition hover:border-[var(--leaf)]"
              >
                Clear
              </button>
            </div>
            <div className="mt-5 grid gap-3">
              {themeCounts.length > 0 ? (
                themeCounts.map(([theme, count]) => (
                  <div
                    key={theme}
                    className="flex items-center justify-between border-b border-[var(--line)] pb-3 text-sm"
                  >
                    <span className="font-semibold text-[var(--leaf-dark)]">
                      {theme}
                    </span>
                    <span className="text-[var(--muted)]">{count}</span>
                  </div>
                ))
              ) : (
                <p className="leading-7 text-[var(--muted)]">
                  Save a reflection to begin seeing themes.
                </p>
              )}
            </div>
          </div>

          <div className="border border-[var(--line)] bg-[var(--paper)] p-5">
            <h2 className="text-xl font-semibold text-[var(--leaf-dark)]">
              Recent summaries
            </h2>
            <div className="mt-5 grid gap-4">
              {reflections.length > 0 ? (
                reflections.map((reflection) => (
                  <article
                    key={reflection.id}
                    className="border border-[var(--line)] bg-white p-4"
                  >
                    <p className="text-xs font-semibold tracking-[0.16em] text-[var(--leaf)] uppercase">
                      {reflection.deckId} / {reflection.cardId}
                    </p>
                    <p className="mt-3 leading-7 text-[var(--muted)]">
                      {reflection.summary}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {reflection.themes.map((theme) => (
                        <span
                          key={theme}
                          className="rounded-md bg-[var(--water)] px-3 py-1.5 text-sm text-[var(--leaf-dark)]"
                        >
                          {theme}
                        </span>
                      ))}
                    </div>
                  </article>
                ))
              ) : (
                <p className="leading-7 text-[var(--muted)]">
                  This view will show saved summaries once memory is enabled and
                  reflections are saved.
                </p>
              )}
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}

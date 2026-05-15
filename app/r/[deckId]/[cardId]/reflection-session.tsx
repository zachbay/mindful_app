"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type ReflectionSessionProps = {
  deckId: string;
  cardId: string;
  deckName: string;
  prompt: string;
};

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

const themeKeywords = [
  { theme: "Boundaries", words: ["boundary", "boundaries", "no", "space"] },
  { theme: "Pressure", words: ["pressure", "stress", "heavy", "overwhelmed"] },
  { theme: "Presence", words: ["present", "attention", "focus", "now"] },
  { theme: "Rest", words: ["rest", "tired", "sleep", "pause"] },
  { theme: "Connection", words: ["friend", "family", "partner", "together"] }
];

function summarize(text: string) {
  const trimmed = text.trim();
  if (!trimmed) {
    return "";
  }

  const firstSentence = trimmed.split(/[.!?]/).find(Boolean)?.trim() ?? trimmed;
  return firstSentence.length > 150
    ? `${firstSentence.slice(0, 147).trim()}...`
    : firstSentence;
}

function identifyThemes(text: string) {
  const lower = text.toLowerCase();
  const matches = themeKeywords
    .filter(({ words }) => words.some((word) => lower.includes(word)))
    .map(({ theme }) => theme);

  return matches.length > 0 ? matches.slice(0, 3) : ["Reflection"];
}

export default function ReflectionSession({
  deckId,
  cardId,
  deckName,
  prompt
}: ReflectionSessionProps) {
  const [reflection, setReflection] = useState("");
  const [saved, setSaved] = useState(false);
  const [memoryEnabled, setMemoryEnabled] = useState(false);
  const [sessionCount, setSessionCount] = useState(1);

  useEffect(() => {
    const countKey = "baywel-session-count";
    const nextCount = Number(localStorage.getItem(countKey) ?? "0") + 1;
    localStorage.setItem(countKey, String(nextCount));
    setSessionCount(nextCount);
    setMemoryEnabled(localStorage.getItem("baywel-memory-enabled") === "true");
  }, []);

  const summary = useMemo(() => summarize(reflection), [reflection]);
  const themes = useMemo(() => identifyThemes(reflection), [reflection]);
  const wordCount = reflection.trim().split(/\s+/).filter(Boolean).length;
  const shouldOfferMemory = sessionCount >= 2 || wordCount >= 20;

  function saveReflection() {
    if (!reflection.trim() || !memoryEnabled) {
      return;
    }

    const existing = JSON.parse(
      localStorage.getItem("baywel-reflections") ?? "[]"
    ) as SavedReflection[];
    const entry: SavedReflection = {
      id: crypto.randomUUID(),
      deckId,
      cardId,
      prompt,
      text: reflection.trim(),
      summary,
      themes,
      createdAt: new Date().toISOString()
    };

    localStorage.setItem(
      "baywel-reflections",
      JSON.stringify([entry, ...existing].slice(0, 20))
    );
    setSaved(true);
  }

  function enableMemory() {
    localStorage.setItem("baywel-memory-enabled", "true");
    setMemoryEnabled(true);
  }

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-5 sm:px-6">
      <section className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <aside className="border border-[var(--line)] bg-[var(--paper)] p-5 sm:p-6 lg:min-h-[calc(100vh-2.5rem)]">
          <Link
            href="/"
            className="text-sm font-semibold tracking-[0.14em] text-[var(--leaf)] uppercase"
          >
            BayWel
          </Link>
          <div className="mt-10 border border-[var(--line)] bg-[var(--water)] p-6">
            <p className="text-xs font-semibold tracking-[0.18em] text-[var(--leaf)] uppercase">
              {deckName} / {cardId}
            </p>
            <h1 className="mt-8 text-3xl leading-tight font-semibold text-[var(--leaf-dark)] sm:text-4xl">
              {prompt}
            </h1>
            <p className="mt-8 text-sm leading-6 text-[var(--muted)]">
              You can stay with the physical card, reflect silently, or write a
              few private notes here. No account is required.
            </p>
          </div>
          <div className="mt-5 grid gap-3 text-sm text-[var(--muted)]">
            <p>Anonymous session</p>
            <p>AI guidance stays short and non-clinical</p>
            <p>Memory is optional and reversible</p>
          </div>
        </aside>

        <div className="grid content-start gap-4">
          <section className="border border-[var(--line)] bg-[var(--paper)] p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[var(--leaf)]">
                  Reflection
                </p>
                <h2 className="mt-1 text-2xl font-semibold text-[var(--leaf-dark)]">
                  What is here right now?
                </h2>
              </div>
              <span className="rounded-md bg-[var(--water)] px-3 py-2 text-sm text-[var(--leaf-dark)]">
                {wordCount} words
              </span>
            </div>

            <textarea
              value={reflection}
              onChange={(event) => {
                setReflection(event.target.value);
                setSaved(false);
              }}
              placeholder="Write a few honest sentences. Short is enough."
              className="mt-5 min-h-56 w-full resize-y rounded-md border border-[var(--line)] bg-white px-4 py-4 leading-7 text-[var(--foreground)] placeholder:text-[#8b958e]"
            />

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={saveReflection}
                disabled={!memoryEnabled || !reflection.trim()}
                className="rounded-md bg-[var(--leaf)] px-5 py-3 text-sm font-semibold text-white transition enabled:hover:bg-[var(--leaf-dark)] disabled:cursor-not-allowed disabled:opacity-45"
              >
                Save to memory
              </button>
              <Link
                href="/dashboard"
                className="rounded-md border border-[var(--line)] px-5 py-3 text-sm font-semibold text-[var(--leaf-dark)] transition hover:border-[var(--leaf)]"
              >
                View dashboard
              </Link>
            </div>
            {saved ? (
              <p className="mt-3 text-sm text-[var(--leaf)]">
                Saved locally for this MVP prototype.
              </p>
            ) : null}
          </section>

          <section className="grid gap-4 md:grid-cols-2">
            <div className="border border-[var(--line)] bg-[var(--paper)] p-5">
              <p className="text-sm font-semibold text-[var(--leaf)]">
                Gentle prompt
              </p>
              <p className="mt-3 leading-7 text-[var(--muted)]">
                What part of this reflection feels true in your body, even if
                you do not have words for it yet?
              </p>
            </div>
            <div className="border border-[var(--line)] bg-[var(--paper)] p-5">
              <p className="text-sm font-semibold text-[var(--leaf)]">
                Insight preview
              </p>
              {summary ? (
                <div className="mt-3 grid gap-3">
                  <p className="leading-7 text-[var(--muted)]">{summary}</p>
                  <div className="flex flex-wrap gap-2">
                    {themes.map((theme) => (
                      <span
                        key={theme}
                        className="rounded-md bg-[var(--rose)] px-3 py-1.5 text-sm text-[var(--leaf-dark)]"
                      >
                        {theme}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="mt-3 leading-7 text-[var(--muted)]">
                  A short summary and themes will appear after you write.
                </p>
              )}
            </div>
          </section>

          {shouldOfferMemory ? (
            <section className="border border-[var(--line)] bg-[var(--paper)] p-5 sm:p-6">
              <p className="text-sm font-semibold text-[var(--leaf)]">
                Optional memory
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-[var(--leaf-dark)]">
                Would you like BayWel to remember your reflections over time?
              </h2>
              <p className="mt-3 max-w-2xl leading-7 text-[var(--muted)]">
                For this MVP prototype, memory is stored locally in this
                browser. A production version will use explicit account consent,
                deletion controls, and encrypted storage.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={enableMemory}
                  className="rounded-md bg-[var(--leaf)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--leaf-dark)]"
                >
                  {memoryEnabled ? "Memory enabled" : "Enable memory"}
                </button>
                <button
                  type="button"
                  onClick={() => localStorage.removeItem("baywel-memory-enabled")}
                  className="rounded-md border border-[var(--line)] px-5 py-3 text-sm font-semibold text-[var(--leaf-dark)] transition hover:border-[var(--leaf)]"
                >
                  Stay anonymous
                </button>
              </div>
            </section>
          ) : null}
        </div>
      </section>
    </main>
  );
}

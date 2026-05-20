"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  createSavedReflectionJourney,
  isActionableReflection
} from "../../lib/reflection-insights";
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
  const [completedReflectionIds, setCompletedReflectionIds] = useState<string[]>(
    []
  );
  const [memoryEnabled, setMemoryEnabled] = useState(false);
  const [showDataControls, setShowDataControls] = useState(false);

  useEffect(() => {
    setMemoryEnabled(localStorage.getItem("baywel-memory-enabled") === "true");
    setReflections(
      JSON.parse(localStorage.getItem("baywel-reflections") ?? "[]")
    );
    setCompletedReflectionIds(
      JSON.parse(localStorage.getItem("baywel-completed-reflections") ?? "[]")
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
  const savedJourney = useMemo(
    () => createSavedReflectionJourney(reflections, completedReflectionIds),
    [completedReflectionIds, reflections]
  );

  function clearMemory() {
    [
      "baywel-reflections",
      "baywel-completed-reflections",
      "baywel-memory-enabled",
      "baywel-memory-options",
      "baywel-auth-session",
      "baywel-consent-record",
      "baywel-anonymous-reflection-journey",
      "baywel-content-interactions",
      "baywel-session-count"
    ].forEach((key) => localStorage.removeItem(key));

    for (let index = localStorage.length - 1; index >= 0; index -= 1) {
      const key = localStorage.key(index);

      if (
        key?.startsWith("baywel-reflection-draft:") ||
        key?.startsWith("baywel-reflection-memory-entry:") ||
        key?.startsWith("baywel-content-cache:")
      ) {
        localStorage.removeItem(key);
      }
    }

    setCompletedReflectionIds([]);
    setReflections([]);
    setMemoryEnabled(false);
  }

  function markReflectionDone(reflectionId: string) {
    setCompletedReflectionIds((currentIds) => {
      const nextIds = Array.from(new Set([reflectionId, ...currentIds]));

      localStorage.setItem(
        "baywel-completed-reflections",
        JSON.stringify(nextIds)
      );

      return nextIds;
    });
  }

  function removeReflection(reflectionId: string) {
    setReflections((currentReflections) => {
      const nextReflections = currentReflections.filter(
        (reflection) => reflection.id !== reflectionId
      );

      localStorage.setItem("baywel-reflections", JSON.stringify(nextReflections));

      return nextReflections;
    });
    setCompletedReflectionIds((currentIds) => {
      const nextIds = currentIds.filter((id) => id !== reflectionId);

      localStorage.setItem(
        "baywel-completed-reflections",
        JSON.stringify(nextIds)
      );

      return nextIds;
    });

    for (let index = localStorage.length - 1; index >= 0; index -= 1) {
      const key = localStorage.key(index);

      if (
        key?.startsWith("baywel-reflection-memory-entry:") &&
        localStorage.getItem(key) === reflectionId
      ) {
        localStorage.removeItem(key);
      }
    }
  }

  function goBack() {
    if (window.history.length > 1) {
      window.history.back();
      return;
    }

    window.location.href = "/r/mindful-work";
  }

  return (
    <main className="min-h-screen bg-[#fffdf1] px-4 py-5 text-[#28333b] sm:px-6">
      <section className="mx-auto max-w-6xl">
        <nav className="flex items-center justify-between text-sm">
          <Link
            href="/"
            className="inline-flex transition hover:opacity-75"
            aria-label="BayWel registered trademark home"
          >
            <BayWelLogo />
          </Link>
          <button
            type="button"
            onClick={goBack}
            className="rounded-md border-2 border-[#28333b] px-4 py-2 text-sm font-semibold text-[#28333b] transition hover:bg-[#fff9d9]"
          >
            Back
          </button>
        </nav>

        <header className="mt-12 max-w-3xl border-2 border-[#28333b] bg-[#fffdf1] p-5 sm:p-6">
          <p className="text-sm font-semibold text-[#28333b]">
            Saved reflection insights
          </p>
          <h1 className="mt-2 text-3xl leading-tight font-semibold text-[#28333b] sm:text-4xl">
            Your reflection log.
          </h1>
          <p className="mt-4 text-base leading-7 text-[#46545a]">
            Review saved responses and the patterns worth returning to.
          </p>
        </header>

        <section className="mt-6 grid gap-3 sm:grid-cols-4">
          <div className="border border-[#d8cbbb] bg-[#fffdf1] p-4">
            <p className="text-sm text-[#46545a]">Memory</p>
            <p className="mt-1 text-xl font-semibold text-[#28333b]">
              {memoryEnabled ? "Enabled" : "Off"}
            </p>
          </div>
          <div className="border border-[#d8cbbb] bg-[#fffdf1] p-4">
            <p className="text-sm text-[#46545a]">Saved reflections</p>
            <p className="mt-1 text-xl font-semibold text-[#28333b]">
              {reflections.length}
            </p>
          </div>
          <div className="border border-[#d8cbbb] bg-[#fffdf1] p-4">
            <p className="text-sm text-[#46545a]">Completed responses</p>
            <p className="mt-1 text-xl font-semibold text-[#28333b]">
              {savedJourney.completedActionCount}
            </p>
          </div>
          <div className="border border-[#d8cbbb] bg-[#fffdf1] p-4">
            <p className="text-sm text-[#46545a]">Reflection streak</p>
            <p className="mt-1 text-xl font-semibold text-[#28333b]">
              {savedJourney.streakDays} days
            </p>
          </div>
        </section>

        <section className="mt-4 border border-[#d8cbbb] bg-[#fffdf1] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm leading-6 text-[#46545a]">
              {savedJourney.savedCount > 0
                ? `Next useful direction: ${savedJourney.suggestedCategory}.`
                : "Save a reflection to begin seeing patterns."}
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/r/mindful-work"
                className="rounded-md bg-[#f6d73b] px-4 py-2.5 text-sm font-semibold text-[#28333b] transition hover:bg-[#fff9d9]"
              >
                Choose next card
              </Link>
              <button
                type="button"
                aria-expanded={showDataControls}
                onClick={() => setShowDataControls((isOpen) => !isOpen)}
                className="rounded-md border border-[#d8cbbb] px-4 py-2.5 text-sm font-semibold text-[#46545a] transition hover:border-[#28333b] hover:text-[#28333b]"
              >
                Manage data
              </button>
            </div>
          </div>
          {showDataControls ? (
            <div className="mt-4 grid gap-3 border-t border-[#d8cbbb] pt-4">
              <p className="max-w-2xl rounded-md bg-[#f6d73b] p-3 text-sm leading-6 text-[#28333b]">
                This removes saved reflections, completed responses, drafts,
                memory settings, consent records, cached hints, and local
                progress from this browser.
              </p>
              <button
                type="button"
                onClick={clearMemory}
                className="justify-self-start rounded-md bg-[#dc8b3a] px-4 py-2.5 text-sm font-semibold text-[#28333b] transition hover:bg-[#f0a252]"
              >
                Clear all history
              </button>
            </div>
          ) : null}
        </section>

        <section className="mt-6 grid gap-4">
          <div className="border-2 border-[#28333b] bg-[#fffdf1] p-5 sm:p-6">
            <h2 className="text-xl font-semibold text-[#28333b]">
              Reflection log
            </h2>
            {themeCounts.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {themeCounts.slice(0, 3).map(([theme, count]) => (
                  <span
                    key={theme}
                    className="rounded-md bg-[#f6d73b] px-3 py-1.5 text-sm text-[#28333b]"
                  >
                    {theme} {count}
                  </span>
                ))}
              </div>
            ) : null}
            <div className="mt-5 grid gap-4">
              {reflections.length > 0 ? (
                reflections.map((reflection) => (
                  <article
                    key={reflection.id}
                    className="border-2 border-[#28333b] bg-white p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <p className="text-xs font-semibold tracking-[0.16em] text-[#366779] uppercase">
                        {reflection.deckId} / {reflection.cardId}
                      </p>
                      <button
                        type="button"
                        onClick={() => removeReflection(reflection.id)}
                        aria-label={`Remove reflection for ${reflection.cardId}`}
                        className="grid size-8 place-items-center border-2 border-[#28333b] text-sm font-semibold text-[#28333b] transition hover:bg-[#f6d73b]"
                      >
                        X
                      </button>
                    </div>
                    <div className="mt-4 grid gap-4">
                      <div>
                        <p className="text-xs font-semibold tracking-[0.14em] text-[#46545a] uppercase">
                          Prompt
                        </p>
                        <p className="mt-1 text-lg leading-7 font-semibold text-[#28333b]">
                          {reflection.prompt}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold tracking-[0.14em] text-[#46545a] uppercase">
                          Response
                        </p>
                        <p className="mt-1 leading-7 text-[#28333b]">
                          {reflection.text}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      {reflection.themes.map((theme) => (
                        <span
                          key={theme}
                          className="rounded-md bg-[#f6d73b] px-3 py-1.5 text-sm text-[#28333b]"
                        >
                          {theme}
                        </span>
                      ))}
                      {isActionableReflection(reflection.text) ? (
                        !completedReflectionIds.includes(reflection.id) ? (
                          <button
                            type="button"
                            onClick={() => markReflectionDone(reflection.id)}
                            className="rounded-md border-2 border-[#28333b] px-3 py-1.5 text-sm font-semibold text-[#28333b] transition hover:bg-[#fff9d9]"
                          >
                            Done
                          </button>
                        ) : null
                      ) : null}
                    </div>
                  </article>
                ))
              ) : (
                <p className="leading-7 text-[#46545a]">
                  This view will show prompts and saved responses once memory is
                  enabled and reflections are saved.
                </p>
              )}
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}

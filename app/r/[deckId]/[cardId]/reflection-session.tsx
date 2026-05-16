"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import BayWelLogo from "../../../components/baywel-logo";
import {
  createContentInteraction,
  createInitialReflectionHintCache,
  createSavedReflection,
  createSharedContentCacheKey,
  identifyReflectionThemes,
  refreshReflectionHintCache,
  selectCachedReflectionHint,
  summarizeReflection,
  type ContentInteraction,
  type ContentInteractionEvent,
  type ReflectionHintIdea,
  type ReflectionHintCache,
  type SavedReflection
} from "../../../../lib/reflection-insights";

type ReflectionSessionProps = {
  deckId: string;
  cardId: string;
  deckName: string;
  prompt: string;
};

type MemoryOptions = {
  saveReflections: boolean;
  personalization: boolean;
  anonymizedInsights: boolean;
};

const defaultMemoryOptions: MemoryOptions = {
  saveReflections: true,
  personalization: true,
  anonymizedInsights: false
};

export default function ReflectionSession({
  deckId,
  cardId,
  deckName,
  prompt
}: ReflectionSessionProps) {
  const [reflection, setReflection] = useState("");
  const [saved, setSaved] = useState(false);
  const [memoryEnabled, setMemoryEnabled] = useState(false);
  const [memoryOptions, setMemoryOptions] =
    useState<MemoryOptions>(defaultMemoryOptions);
  const [sessionCount, setSessionCount] = useState(1);
  const [cachedHint, setCachedHint] = useState<ReflectionHintIdea | null>(null);
  const [showMemoryOptions, setShowMemoryOptions] = useState(false);

  function trackContentInteraction(
    event: ContentInteractionEvent,
    metadata?: Record<string, boolean | number | string>
  ) {
    const existing = JSON.parse(
      localStorage.getItem("baywel-content-interactions") ?? "[]"
    ) as ContentInteraction[];
    const interaction = createContentInteraction({
      cardId,
      contentId: cachedHint?.id,
      deckId,
      event,
      metadata,
      prompt,
      nowIso: new Date().toISOString()
    });

    localStorage.setItem(
      "baywel-content-interactions",
      JSON.stringify([interaction, ...existing].slice(0, 250))
    );
  }

  useEffect(() => {
    const countKey = "baywel-session-count";
    const nextCount = Number(localStorage.getItem(countKey) ?? "0") + 1;
    localStorage.setItem(countKey, String(nextCount));
    setSessionCount(nextCount);
    setMemoryEnabled(localStorage.getItem("baywel-memory-enabled") === "true");
    setMemoryOptions(
      JSON.parse(
        localStorage.getItem("baywel-memory-options") ??
          JSON.stringify(defaultMemoryOptions)
      ) as MemoryOptions
    );
  }, []);

  useEffect(() => {
    const cacheKey = createSharedContentCacheKey({ cardId, deckId, prompt });
    const nowIso = new Date().toISOString();
    const storedCache = localStorage.getItem(cacheKey);
    const parsedCache = storedCache
      ? (JSON.parse(storedCache) as ReflectionHintCache)
      : createInitialReflectionHintCache(cacheKey, prompt, nowIso);
    const refreshedCache = refreshReflectionHintCache(
      parsedCache,
      cacheKey,
      prompt,
      nowIso
    );
    const selectedHint = selectCachedReflectionHint(refreshedCache);

    localStorage.setItem(cacheKey, JSON.stringify(selectedHint.cache));
    setCachedHint(selectedHint.idea);
  }, [cardId, deckId, prompt]);

  useEffect(() => {
    if (!cachedHint) {
      return;
    }

    trackContentInteraction("hint_impression");
  }, [cachedHint]);

  const summary = useMemo(() => summarizeReflection(reflection), [reflection]);
  const themes = useMemo(() => identifyReflectionThemes(reflection), [reflection]);
  const wordCount = reflection.trim().split(/\s+/).filter(Boolean).length;
  const shouldOfferMemory = sessionCount >= 2 || wordCount >= 20;
  const hasReflection = Boolean(reflection.trim());
  const sessionStateLabel = memoryEnabled
    ? memoryOptions.saveReflections
      ? "Private memory session"
      : "Memory on, reflections unsaved"
    : "Anonymous session";
  const sessionStateDetail = memoryEnabled
    ? memoryOptions.saveReflections
      ? "Reflection summaries can be saved"
      : "Only options are remembered"
    : "No reflection memory is active";
  const saveDisabledReason = !memoryEnabled
    ? "Choose memory options to save this reflection."
    : !memoryOptions.saveReflections
      ? "Turn on saved reflections in memory options."
    : hasReflection
      ? "Ready to save."
      : "Write a reflection to save it.";

  function saveReflection() {
    if (!hasReflection || !memoryEnabled || !memoryOptions.saveReflections) {
      return;
    }

    const existing = JSON.parse(
      localStorage.getItem("baywel-reflections") ?? "[]"
    ) as SavedReflection[];
    const entry = createSavedReflection({
      id: crypto.randomUUID(),
      deckId,
      cardId,
      prompt,
      text: reflection.trim(),
      createdAt: new Date().toISOString()
    });

    localStorage.setItem(
      "baywel-reflections",
      JSON.stringify([entry, ...existing].slice(0, 20))
    );
    trackContentInteraction("reflection_saved", {
      themes: entry.themes.join(","),
      wordCount
    });
    setSaved(true);
  }

  function enableMemory() {
    localStorage.setItem("baywel-memory-enabled", "true");
    localStorage.setItem("baywel-memory-options", JSON.stringify(memoryOptions));
    setMemoryEnabled(true);
    trackContentInteraction("memory_enabled", {
      anonymizedInsights: memoryOptions.anonymizedInsights,
      personalization: memoryOptions.personalization,
      saveReflections: memoryOptions.saveReflections
    });
  }

  function updateMemoryOption(option: keyof MemoryOptions) {
    setMemoryOptions((currentOptions) => {
      const nextOptions = {
        ...currentOptions,
        [option]: !currentOptions[option]
      };

      if (memoryEnabled) {
        localStorage.setItem("baywel-memory-options", JSON.stringify(nextOptions));
      }

      trackContentInteraction("memory_option_changed", {
        option,
        value: nextOptions[option]
      });

      return nextOptions;
    });
  }

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-5 sm:px-6">
      <section className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <aside className="border border-[var(--line)] bg-[var(--paper)] p-5 sm:p-6 lg:min-h-[calc(100vh-2.5rem)]">
          <Link
            href="/"
            className="inline-flex transition hover:opacity-75"
            aria-label="BayWel registered trademark home"
          >
            <BayWelLogo />
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
          <div className="mt-4 ml-auto grid max-w-xs justify-items-end gap-2 text-right text-xs leading-5 text-[var(--muted)]">
            <p className="font-semibold text-[var(--leaf)]">
              {sessionStateLabel}
            </p>
            <p>{sessionStateDetail}</p>
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
                disabled={
                  !memoryEnabled || !hasReflection || !memoryOptions.saveReflections
                }
                aria-describedby="save-memory-status"
                className="rounded-md bg-[var(--leaf)] px-5 py-3 text-sm font-semibold text-white transition enabled:hover:bg-[var(--leaf-dark)] disabled:cursor-not-allowed disabled:opacity-45"
              >
                Save to memory
              </button>
              {!memoryEnabled ? (
                <button
                  type="button"
                  onClick={enableMemory}
                  className="rounded-md bg-[var(--water)] px-5 py-3 text-sm font-semibold text-[var(--leaf-dark)] transition hover:bg-[#cfe3df]"
                >
                  Enable memory
                </button>
              ) : null}
              <Link
                href="/dashboard"
                className="rounded-md border border-[var(--line)] px-5 py-3 text-sm font-semibold text-[var(--leaf-dark)] transition hover:border-[var(--leaf)]"
              >
                View dashboard
              </Link>
            </div>
            <div
              id="save-memory-status"
              className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-[var(--line)] bg-[var(--water)] px-4 py-3 text-sm leading-6 text-[var(--leaf-dark)]"
            >
              <p>
                <span className="font-semibold">
                  {memoryEnabled ? "Memory is on." : "Memory is off."}
                </span>{" "}
                {saveDisabledReason}
              </p>
              {!memoryEnabled ? (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={enableMemory}
                    className="rounded-md bg-[var(--leaf)] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[var(--leaf-dark)]"
                  >
                    Turn on memory
                  </button>
                  <a
                    href="#memory-options"
                    className="rounded-md border border-[var(--leaf)] px-3 py-2 text-xs font-semibold text-[var(--leaf-dark)] transition hover:bg-[var(--paper)]"
                  >
                    Choose memory options
                  </a>
                </div>
              ) : null}
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
                Reflection support
              </p>
              <div className="mt-3 grid gap-3 text-sm leading-6 text-[var(--muted)]">
                <p>
                  {cachedHint?.text ??
                    "Take two quiet breaths before writing. Let the first answer be imperfect."}
                </p>
                <p>
                  Cached shared hint. Rotates locally and refreshes every 3
                  days, so opening the page does not need fresh generated
                  content.
                </p>
                <div className="rounded-md bg-[var(--water)] px-3 py-2 text-[var(--leaf-dark)]">
                  Try one sentence beginning with: Right now, I notice...
                </div>
                <div className="flex flex-wrap gap-2">
                  {themes.map((theme) => (
                    <span
                      key={theme}
                      className="rounded-md bg-[var(--rose)] px-3 py-1.5 text-xs text-[var(--leaf-dark)]"
                    >
                      {theme}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {shouldOfferMemory ? (
            <section
              id="memory-options"
              className="scroll-mt-5 border border-[var(--line)] bg-[var(--paper)] p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-[var(--leaf)]">
                    Optional memory
                  </p>
                  <h2 className="mt-1 text-xl font-semibold text-[var(--leaf-dark)]">
                    Remember reflections over time
                  </h2>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--muted)]">
                    Store summaries and themes locally. Options stay granular
                    and reversible.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={enableMemory}
                    className="rounded-md bg-[var(--leaf)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--leaf-dark)]"
                  >
                    {memoryEnabled ? "Memory enabled" : "Enable memory"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      localStorage.removeItem("baywel-memory-enabled");
                      localStorage.removeItem("baywel-memory-options");
                      setMemoryEnabled(false);
                      setMemoryOptions(defaultMemoryOptions);
                      trackContentInteraction("memory_disabled");
                    }}
                    className="rounded-md border border-[var(--line)] px-5 py-3 text-sm font-semibold text-[var(--leaf-dark)] transition hover:border-[var(--leaf)]"
                  >
                    Stay anonymous
                  </button>
                  <button
                    type="button"
                    aria-expanded={showMemoryOptions}
                    onClick={() => {
                      setShowMemoryOptions((isOpen) => {
                        const nextIsOpen = !isOpen;

                        if (nextIsOpen) {
                          trackContentInteraction("memory_options_opened");
                        }

                        return nextIsOpen;
                      });
                    }}
                    className="rounded-md border border-[var(--line)] px-5 py-3 text-sm font-semibold text-[var(--leaf-dark)] transition hover:border-[var(--leaf)]"
                  >
                    {showMemoryOptions ? "Hide options" : "Show options"}
                  </button>
                </div>
              </div>
              {showMemoryOptions ? (
                <div className="mt-5 grid gap-3">
                  <label className="flex items-start gap-3 rounded-md border border-[var(--line)] bg-white p-4">
                    <input
                      type="checkbox"
                      checked={memoryOptions.saveReflections}
                      onChange={() => updateMemoryOption("saveReflections")}
                      className="mt-1 h-4 w-4 accent-[var(--leaf)]"
                    />
                    <span>
                      <span className="block text-sm font-semibold text-[var(--leaf-dark)]">
                        Save reflections
                      </span>
                      <span className="mt-1 block text-sm leading-6 text-[var(--muted)]">
                        Store reflection summaries and themes in this browser.
                      </span>
                    </span>
                  </label>
                  <label className="flex items-start gap-3 rounded-md border border-[var(--line)] bg-white p-4">
                    <input
                      type="checkbox"
                      checked={memoryOptions.personalization}
                      onChange={() => updateMemoryOption("personalization")}
                      className="mt-1 h-4 w-4 accent-[var(--leaf)]"
                    />
                    <span>
                      <span className="block text-sm font-semibold text-[var(--leaf-dark)]">
                        Personalize prompts
                      </span>
                      <span className="mt-1 block text-sm leading-6 text-[var(--muted)]">
                        Use saved themes to make future reflection prompts more
                        relevant.
                      </span>
                    </span>
                  </label>
                  <label className="flex items-start gap-3 rounded-md border border-[var(--line)] bg-white p-4">
                    <input
                      type="checkbox"
                      checked={memoryOptions.anonymizedInsights}
                      onChange={() => updateMemoryOption("anonymizedInsights")}
                      className="mt-1 h-4 w-4 accent-[var(--leaf)]"
                    />
                    <span>
                      <span className="block text-sm font-semibold text-[var(--leaf-dark)]">
                        Share anonymized product insights
                      </span>
                      <span className="mt-1 block text-sm leading-6 text-[var(--muted)]">
                        Help improve card resonance without sharing your raw
                        reflection.
                      </span>
                    </span>
                  </label>
                </div>
              ) : null}
            </section>
          ) : null}
        </div>
      </section>
    </main>
  );
}

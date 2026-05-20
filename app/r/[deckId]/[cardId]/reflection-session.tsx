"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import BayWelLogo from "../../../components/baywel-logo";
import {
  createContentInteraction,
  createInitialReflectionHintCache,
  createLocalReflectionResponse,
  createSavedReflection,
  createSharedContentCacheKey,
  refreshReflectionHintCache,
  selectCachedReflectionHint,
  type ContentInteraction,
  type ContentInteractionEvent,
  type ReflectionHintIdea,
  type ReflectionHintCache,
  type SavedReflection
} from "../../../../lib/reflection-insights";

type ReflectionSessionProps = {
  category?: string;
  deckId: string;
  cardId: string;
  deckName: string;
  loginHref: string;
  lookupHref: string;
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

function createReflectionDraftKey(deckId: string, cardId: string) {
  return `baywel-reflection-draft:${deckId}:${cardId}`;
}

function createReflectionMemoryKey(deckId: string, cardId: string) {
  return `baywel-reflection-memory-entry:${deckId}:${cardId}`;
}

export default function ReflectionSession({
  category,
  deckId,
  cardId,
  deckName,
  loginHref,
  lookupHref,
  prompt
}: ReflectionSessionProps) {
  const [reflection, setReflection] = useState("");
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);
  const [memorySaveLabel, setMemorySaveLabel] = useState<string | null>(null);
  const [memoryEnabled, setMemoryEnabled] = useState(false);
  const [memoryOptions, setMemoryOptions] =
    useState<MemoryOptions>(defaultMemoryOptions);
  const [cachedHint, setCachedHint] = useState<ReflectionHintIdea | null>(null);
  const [showMemoryControls, setShowMemoryControls] = useState(false);

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
    const draftKey = createReflectionDraftKey(deckId, cardId);
    const savedDraft = localStorage.getItem(draftKey);

    localStorage.setItem(countKey, String(nextCount));
    setReflection(savedDraft ?? "");
    setMemoryEnabled(localStorage.getItem("baywel-memory-enabled") === "true");
    setMemoryOptions(
      JSON.parse(
        localStorage.getItem("baywel-memory-options") ??
          JSON.stringify(defaultMemoryOptions)
      ) as MemoryOptions
    );
  }, [cardId, deckId]);

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

  const localResponse = useMemo(
    () => createLocalReflectionResponse(reflection),
    [reflection]
  );
  const wordCount = reflection.trim().split(/\s+/).filter(Boolean).length;
  const hasReflection = Boolean(reflection.trim());
  useEffect(() => {
    const draftKey = createReflectionDraftKey(deckId, cardId);

    if (!hasReflection) {
      localStorage.removeItem(draftKey);
      setDraftSavedAt(null);
      return;
    }

    localStorage.setItem(draftKey, reflection);
    setDraftSavedAt("Saved in this browser");
  }, [cardId, deckId, hasReflection, reflection]);

  useEffect(() => {
    if (!memoryEnabled || !memoryOptions.saveReflections || !hasReflection) {
      if (!hasReflection) {
        setMemorySaveLabel(null);
      }

      return;
    }

    const saveTimer = window.setTimeout(() => {
      const memoryEntryKey = createReflectionMemoryKey(deckId, cardId);
      const existing = JSON.parse(
        localStorage.getItem("baywel-reflections") ?? "[]"
      ) as SavedReflection[];
      const existingId = localStorage.getItem(memoryEntryKey);
      const previousEntry =
        existing.find((entry) => entry.id === existingId) ??
        existing.find(
          (entry) =>
            entry.deckId === deckId &&
            entry.cardId === cardId &&
            entry.prompt === prompt
        );
      const entry = createSavedReflection({
        id: previousEntry?.id ?? crypto.randomUUID(),
        deckId,
        cardId,
        prompt,
        text: reflection.trim(),
        createdAt: previousEntry?.createdAt ?? new Date().toISOString()
      });

      localStorage.setItem(memoryEntryKey, entry.id);
      localStorage.setItem(
        "baywel-reflections",
        JSON.stringify(
          [entry, ...existing.filter((savedEntry) => savedEntry.id !== entry.id)]
            .slice(0, 20)
        )
      );
      setMemorySaveLabel("Saved to memory");
    }, 500);

    return () => window.clearTimeout(saveTimer);
  }, [
    cardId,
    deckId,
    hasReflection,
    memoryEnabled,
    memoryOptions.saveReflections,
    prompt,
    reflection
  ]);

  function updateMemoryOption(option: keyof MemoryOptions) {
    setMemoryOptions((currentOptions) => {
      const nextOptions = {
        ...currentOptions,
        [option]: !currentOptions[option]
      };

      localStorage.setItem("baywel-memory-options", JSON.stringify(nextOptions));
      trackContentInteraction("memory_option_changed", {
        option,
        value: nextOptions[option]
      });

      return nextOptions;
    });
  }

  function disableMemory() {
    localStorage.removeItem("baywel-memory-enabled");
    localStorage.removeItem("baywel-memory-options");
    setMemoryEnabled(false);
    setMemoryOptions(defaultMemoryOptions);
    setShowMemoryControls(false);
    trackContentInteraction("memory_disabled");
  }

  return (
    <main className="min-h-screen bg-[#fffdf1] px-4 py-5 text-[#28333b] sm:px-6">
      <section className="mx-auto grid max-w-5xl gap-5">
        <section className="border-2 border-[#28333b] bg-[#fffdf1] p-5 sm:p-6">
          <Link
            href="/"
            className="inline-flex transition hover:opacity-75"
            aria-label="BayWel registered trademark home"
          >
            <BayWelLogo />
          </Link>

          <div className="mt-8 grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <div className="rounded-[22px] bg-[#dc8b3a] p-3">
                <div className="flex min-h-[280px] flex-col rounded-[16px] border-2 border-[#28333b] bg-[#fffdf1] px-5 py-6 text-center">
                  <p className="text-xs font-semibold tracking-[0.18em] text-[#28333b] uppercase">
                    {deckName} / {cardId}
                  </p>
                  <div className="flex flex-1 items-center justify-center py-8">
                    <h1 className="text-2xl leading-tight font-normal text-[#28333b] sm:text-3xl">
                      {prompt}
                    </h1>
                  </div>
                  {category ? (
                    <div className="mx-auto flex w-full max-w-xs items-center gap-3 text-[#28333b]">
                      <span className="h-0.5 flex-1 bg-[#dc8b3a]" />
                      <p className="text-xl leading-none">{category}</p>
                      <span className="h-0.5 flex-1 bg-[#dc8b3a]" />
                    </div>
                  ) : null}
                </div>
              </div>
              <Link
                href={lookupHref}
                className="mt-3 inline-flex rounded-md border border-[#d8cbbb] px-3 py-2 text-sm font-semibold text-[#46545a] transition hover:border-[#28333b] hover:text-[#28333b]"
              >
                Find another card
              </Link>
            </div>

            <section className="flex flex-col justify-center">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[#366779]">
                    Reflection
                  </p>
                  <h2 className="mt-1 text-2xl font-semibold text-[#28333b]">
                    Add your reflection.
                  </h2>
                </div>
                <span className="rounded-md bg-[#f6d73b] px-3 py-2 text-sm text-[#28333b]">
                  {wordCount} words
                </span>
              </div>

              <textarea
                value={reflection}
                onChange={(event) => setReflection(event.target.value)}
                placeholder="Write a few honest sentences about this card. Short is enough."
                className="mt-5 min-h-44 w-full resize-y rounded-md border-2 border-[#28333b] bg-white px-4 py-4 leading-7 text-[#28333b] placeholder:text-[#7a8984] focus:border-[#366779] focus:bg-[#fff9d9]"
              />

              <p className="mt-3 text-sm leading-6 text-[#46545a]">
                {cachedHint?.text ??
                  "Take two quiet breaths. Let one small answer be enough."}
              </p>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#d8cbbb] pt-4">
                <p className="text-sm leading-6 text-[#46545a]">
                  {!hasReflection
                    ? memoryEnabled && memoryOptions.saveReflections
                      ? "Memory is on. Reflections will save locally as you write."
                      : "Your words stay private in this browser."
                    : memoryEnabled && memoryOptions.saveReflections
                    ? memorySaveLabel ?? draftSavedAt ?? "Saving locally..."
                    : draftSavedAt ??
                      "Your words stay private in this browser."}
                </p>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    aria-expanded={showMemoryControls}
                    aria-controls="memory-controls"
                    onClick={() => {
                      setShowMemoryControls((isOpen) => {
                        const nextIsOpen = !isOpen;

                        if (nextIsOpen) {
                          trackContentInteraction("memory_options_opened");
                        }

                        return nextIsOpen;
                      });
                    }}
                    className="rounded-md border border-[#d8cbbb] px-4 py-2.5 text-sm font-semibold text-[#46545a] transition hover:border-[#28333b] hover:text-[#28333b]"
                  >
                    Memory
                  </button>
                  <Link
                    href="/dashboard"
                    className="rounded-md border-2 border-[#28333b] px-4 py-2.5 text-sm font-semibold text-[#28333b] transition hover:bg-[#fff9d9]"
                  >
                    View dashboard
                  </Link>
                </div>
              </div>
              {showMemoryControls ? (
                <div
                  id="memory-controls"
                  className="mt-3 rounded-md border border-[#d8cbbb] bg-[#fffdf1] p-3 text-sm leading-6 text-[#46545a]"
                >
                  {!memoryEnabled ? (
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p>Memory is off. Reflections stay only in this browser.</p>
                      <Link
                        href={loginHref}
                        className="rounded-md bg-[#f6d73b] px-4 py-2 text-sm font-semibold text-[#28333b] transition hover:bg-[#fff9d9]"
                      >
                        Enable memory
                      </Link>
                    </div>
                  ) : (
                    <div className="grid gap-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p>
                          Memory is on. Saved reflection summaries stay local to
                          this browser.
                        </p>
                        <button
                          type="button"
                          onClick={disableMemory}
                          className="rounded-md border border-[#d8cbbb] px-3 py-2 text-sm font-semibold text-[#46545a] transition hover:border-[#28333b] hover:text-[#28333b]"
                        >
                          Turn off
                        </button>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-3">
                        <label className="flex items-start gap-2">
                          <input
                            type="checkbox"
                            checked={memoryOptions.saveReflections}
                            onChange={() =>
                              updateMemoryOption("saveReflections")
                            }
                            className="mt-1 h-4 w-4 accent-[#366779]"
                          />
                          <span>Save reflections</span>
                        </label>
                        <label className="flex items-start gap-2">
                          <input
                            type="checkbox"
                            checked={memoryOptions.personalization}
                            onChange={() =>
                              updateMemoryOption("personalization")
                            }
                            className="mt-1 h-4 w-4 accent-[#366779]"
                          />
                          <span>Personalize prompts</span>
                        </label>
                        <label className="flex items-start gap-2">
                          <input
                            type="checkbox"
                            checked={memoryOptions.anonymizedInsights}
                            onChange={() =>
                              updateMemoryOption("anonymizedInsights")
                            }
                            className="mt-1 h-4 w-4 accent-[#366779]"
                          />
                          <span>Share anonymized insights</span>
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
              {localResponse ? (
                <div className="mt-4 border-l-2 border-[#dc8b3a] pl-3 text-sm leading-6 text-[#46545a]">
                  <p>{localResponse.observation}</p>
                  <p className="mt-1 font-semibold text-[#28333b]">
                    {localResponse.nextQuestion}
                  </p>
                </div>
              ) : null}
            </section>
          </div>
        </section>
      </section>
    </main>
  );
}

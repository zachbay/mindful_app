"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import BayWelLogo from "../../../components/baywel-logo";
import {
  createContentInteraction,
  createAnonymousReflectionJourney,
  createInitialReflectionHintCache,
  createLocalReflectionResponse,
  createSavedReflection,
  createSavedReflectionJourney,
  createSharedContentCacheKey,
  identifyReflectionThemes,
  refreshReflectionHintCache,
  recordAnonymousReflectionCompletion,
  selectCachedReflectionHint,
  summarizeReflection,
  type AnonymousReflectionJourney,
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

const anonymousJourneyKey = "baywel-anonymous-reflection-journey";

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
  const [sessionCount, setSessionCount] = useState(1);
  const [cachedHint, setCachedHint] = useState<ReflectionHintIdea | null>(null);
  const [showMemoryOptions, setShowMemoryOptions] = useState(false);
  const [anonymousJourney, setAnonymousJourney] =
    useState<AnonymousReflectionJourney>(createAnonymousReflectionJourney);
  const [savedJourney, setSavedJourney] = useState(() =>
    createSavedReflectionJourney([])
  );

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
    setSessionCount(nextCount);
    setReflection(savedDraft ?? "");
    setMemoryEnabled(localStorage.getItem("baywel-memory-enabled") === "true");
    setMemoryOptions(
      JSON.parse(
        localStorage.getItem("baywel-memory-options") ??
          JSON.stringify(defaultMemoryOptions)
      ) as MemoryOptions
    );
    setAnonymousJourney(
      JSON.parse(
        localStorage.getItem(anonymousJourneyKey) ??
          JSON.stringify(createAnonymousReflectionJourney())
      ) as AnonymousReflectionJourney
    );
    setSavedJourney(
      createSavedReflectionJourney(
        JSON.parse(localStorage.getItem("baywel-reflections") ?? "[]"),
        JSON.parse(localStorage.getItem("baywel-completed-reflections") ?? "[]")
      )
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

  const themes = useMemo(() => identifyReflectionThemes(reflection), [reflection]);
  const localResponse = useMemo(
    () => createLocalReflectionResponse(reflection),
    [reflection]
  );
  const wordCount = reflection.trim().split(/\s+/).filter(Boolean).length;
  const shouldOfferMemory = sessionCount >= 2 || wordCount >= 20;
  const hasReflection = Boolean(reflection.trim());
  const anonymousCardKey = `${deckId}/${cardId}`;
  const anonymousCardComplete =
    anonymousJourney.completedCards.includes(anonymousCardKey);
  const anonymousCompletedCount = anonymousJourney.completedCards.length;
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
      setSavedJourney(
        createSavedReflectionJourney(
          [entry, ...existing.filter((savedEntry) => savedEntry.id !== entry.id)]
            .slice(0, 20),
          JSON.parse(localStorage.getItem("baywel-completed-reflections") ?? "[]")
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

  function completeAnonymousReflection() {
    const nextJourney = recordAnonymousReflectionCompletion(anonymousJourney, {
      cardId,
      deckId,
      nowIso: new Date().toISOString()
    });

    localStorage.setItem(anonymousJourneyKey, JSON.stringify(nextJourney));
    setAnonymousJourney(nextJourney);
    trackContentInteraction("reflection_saved", {
      anonymous: true,
      completedCount: nextJourney.completedCards.length,
      reflectedWithText: hasReflection,
      streakDays: nextJourney.streakDays
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
    <main className="min-h-screen bg-[#fffdf1] px-4 py-5 text-[#28333b] sm:px-6">
      <section className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <aside className="border-2 border-[#28333b] bg-[#fffdf1] p-5 sm:p-6 lg:min-h-[calc(100vh-2.5rem)]">
          <Link
            href="/"
            className="inline-flex transition hover:opacity-75"
            aria-label="BayWel registered trademark home"
          >
            <BayWelLogo />
          </Link>
          <div className="mt-10 rounded-[22px] border-2 border-[#28333b] bg-[#dc8b3a] p-4">
            <div className="flex min-h-[420px] flex-col rounded-[18px] border-2 border-[#28333b] bg-[#fffdf1] px-5 py-6 text-center">
              <p className="text-xs font-semibold tracking-[0.18em] text-[#28333b] uppercase">
                {deckName} / {cardId}
              </p>
              <div className="flex flex-1 items-center justify-center">
                <h1 className="text-3xl leading-tight font-normal text-[#28333b] sm:text-4xl">
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
          <div className="mt-4 ml-auto grid max-w-xs justify-items-end gap-2 text-right text-xs leading-5 text-[#46545a]">
            <p className="font-semibold text-[#28333b]">
              {sessionStateLabel}
            </p>
            <p>{sessionStateDetail}</p>
            <p>Memory is optional and reversible</p>
            <Link
              href={lookupHref}
              className="mt-3 rounded-md border-2 border-[#28333b] px-4 py-2 text-sm font-semibold text-[#28333b] transition hover:bg-[#fff9d9]"
            >
              Find another card
            </Link>
          </div>
        </aside>

        <div className="grid content-start gap-4">
          <section className="border-2 border-[#28333b] bg-[#fffdf1] p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[#366779]">
                  Reflection
                </p>
                <h2 className="mt-1 text-2xl font-semibold text-[#28333b]">
                  {prompt}
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
              className="mt-5 min-h-56 w-full resize-y rounded-md border-2 border-[#28333b] bg-white px-4 py-4 leading-7 text-[#28333b] placeholder:text-[#7a8984] focus:border-[#366779] focus:bg-[#fff9d9]"
            />

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm leading-6 text-[#46545a]">
                {!hasReflection
                  ? memoryEnabled && memoryOptions.saveReflections
                    ? "Memory is on. Reflections will save locally as you write."
                    : "Your words stay private in this browser."
                  : memoryEnabled && memoryOptions.saveReflections
                  ? memorySaveLabel ?? draftSavedAt ?? "Saving locally..."
                  : draftSavedAt ?? "Your words stay private in this browser."}
              </p>
              <div className="flex flex-wrap gap-3">
                {!memoryEnabled ? (
                  <Link
                    href={loginHref}
                    className="rounded-md bg-[#f6d73b] px-5 py-3 text-sm font-semibold text-[#28333b] transition hover:bg-[#fff9d9]"
                  >
                    Enable memory
                  </Link>
                ) : null}
                <Link
                  href="/dashboard"
                  className="rounded-md border-2 border-[#28333b] px-5 py-3 text-sm font-semibold text-[#28333b] transition hover:bg-[#fff9d9]"
                >
                  View dashboard
                </Link>
              </div>
            </div>
            {localResponse ? (
              <div className="mt-5 rounded-md border-2 border-[#28333b] bg-[#f6d73b] p-4 text-sm leading-6 text-[#28333b]">
                <p>{localResponse.observation}</p>
                <p className="mt-2 font-semibold">
                  {localResponse.nextQuestion}
                </p>
              </div>
            ) : null}
          </section>

          {!memoryEnabled ? (
            <section className="border-2 border-[#28333b] bg-[#fffdf1] p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-[#366779]">
                    Anonymous journey
                  </p>
                  <h2 className="mt-1 text-xl font-semibold text-[#28333b]">
                    {anonymousCardComplete
                      ? "Card complete"
                      : "Complete this reflection"}
                  </h2>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-[#46545a]">
                    {anonymousCardComplete
                      ? "You can leave it here or continue with another card."
                      : "Mark the card complete when you have reflected, silently or in writing."}
                  </p>
                </div>
                <div className="flex flex-wrap gap-3 text-sm">
                  <span className="rounded-md bg-[#f6d73b] px-3 py-2 text-[#28333b]">
                    {anonymousCompletedCount}{" "}
                    {anonymousCompletedCount === 1 ? "card" : "cards"}
                  </span>
                  <span className="rounded-md border-2 border-[#28333b] px-3 py-2 text-[#28333b]">
                    {anonymousJourney.streakDays} day streak
                  </span>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                {anonymousCardComplete ? (
                  <span className="rounded-md bg-[#dc8b3a] px-5 py-3 text-sm font-semibold text-[#28333b]">
                    Completed
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={completeAnonymousReflection}
                    className="rounded-md bg-[#f6d73b] px-5 py-3 text-sm font-semibold text-[#28333b] transition hover:bg-[#fff9d9]"
                  >
                    Complete reflection
                  </button>
                )}
                <Link
                  href={lookupHref}
                  className="rounded-md border-2 border-[#28333b] px-5 py-3 text-sm font-semibold text-[#28333b] transition hover:bg-[#fff9d9]"
                >
                  Try another card
                </Link>
              </div>
            </section>
          ) : (
            <section className="border-2 border-[#28333b] bg-[#fffdf1] p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-[#366779]">
                    Saved journey
                  </p>
                  <h2 className="mt-1 text-xl font-semibold text-[#28333b]">
                    {hasReflection
                      ? "This reflection is part of your pattern"
                      : "Continue your reflection journey"}
                  </h2>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-[#46545a]">
                    {hasReflection
                      ? `Your next useful direction may be a ${savedJourney.suggestedCategory.toLowerCase()} card.`
                      : "Saved reflections help BayWel surface themes, streaks, and useful next cards over time."}
                  </p>
                </div>
                <div className="flex flex-wrap gap-3 text-sm">
                  <span className="rounded-md bg-[#f6d73b] px-3 py-2 text-[#28333b]">
                    {savedJourney.savedCount} saved
                  </span>
                  <span className="rounded-md border-2 border-[#28333b] px-3 py-2 text-[#28333b]">
                    {savedJourney.streakDays} day streak
                  </span>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href="/dashboard"
                  className="rounded-md bg-[#f6d73b] px-5 py-3 text-sm font-semibold text-[#28333b] transition hover:bg-[#fff9d9]"
                >
                  View journey
                </Link>
                <Link
                  href={lookupHref}
                  className="rounded-md border-2 border-[#28333b] px-5 py-3 text-sm font-semibold text-[#28333b] transition hover:bg-[#fff9d9]"
                >
                  Choose next card
                </Link>
              </div>
            </section>
          )}

          <section className="grid gap-4 md:grid-cols-2">
            <div className="border-2 border-[#28333b] bg-[#fffdf1] p-5">
              <p className="text-sm font-semibold text-[#366779]">
                Gentle prompt
              </p>
              <p className="mt-3 leading-7 text-[#46545a]">
                What part of this reflection feels true in your body, even if
                you do not have words for it yet?
              </p>
            </div>
            <div className="border-2 border-[#28333b] bg-[#fffdf1] p-5">
              <p className="text-sm font-semibold text-[#366779]">
                Reflection support
              </p>
              <div className="mt-3 grid gap-3 text-sm leading-6 text-[#46545a]">
                <p>
                  {cachedHint?.text ??
                    "Take two quiet breaths before writing. Let the first answer be imperfect."}
                </p>
                <div className="rounded-md bg-[#f6d73b] px-3 py-2 text-[#28333b]">
                  Try one sentence beginning with: Right now, I notice...
                </div>
                <div className="flex flex-wrap gap-2">
                  {themes.map((theme) => (
                    <span
                      key={theme}
                      className="rounded-md bg-[#dc8b3a] px-3 py-1.5 text-xs text-[#28333b]"
                    >
                      {theme}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {shouldOfferMemory && memoryEnabled ? (
            <section
              id="memory-options"
              className="scroll-mt-5 border-2 border-[#28333b] bg-[#fffdf1] p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-[#366779]">
                    Memory
                  </p>
                  <h2 className="mt-1 text-xl font-semibold text-[#28333b]">
                    Memory settings
                  </h2>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-[#46545a]">
                    Reflection summaries are saved locally in this browser.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      localStorage.removeItem("baywel-memory-enabled");
                      localStorage.removeItem("baywel-memory-options");
                      setMemoryEnabled(false);
                      setMemoryOptions(defaultMemoryOptions);
                      trackContentInteraction("memory_disabled");
                    }}
                    className="rounded-md border-2 border-[#28333b] px-5 py-3 text-sm font-semibold text-[#28333b] transition hover:bg-[#fff9d9]"
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
                    className="rounded-md border-2 border-[#28333b] px-5 py-3 text-sm font-semibold text-[#28333b] transition hover:bg-[#fff9d9]"
                  >
                    {showMemoryOptions ? "Hide options" : "Show options"}
                  </button>
                </div>
              </div>
              {showMemoryOptions ? (
                <div className="mt-5 grid gap-3">
                  <label className="flex items-start gap-3 rounded-md border-2 border-[#28333b] bg-white p-4">
                    <input
                      type="checkbox"
                      checked={memoryOptions.saveReflections}
                      onChange={() => updateMemoryOption("saveReflections")}
                      className="mt-1 h-4 w-4 accent-[#366779]"
                    />
                    <span>
                      <span className="block text-sm font-semibold text-[#28333b]">
                        Save reflections
                      </span>
                      <span className="mt-1 block text-sm leading-6 text-[#46545a]">
                        Store reflection summaries and themes in this browser.
                      </span>
                    </span>
                  </label>
                  <label className="flex items-start gap-3 rounded-md border-2 border-[#28333b] bg-white p-4">
                    <input
                      type="checkbox"
                      checked={memoryOptions.personalization}
                      onChange={() => updateMemoryOption("personalization")}
                      className="mt-1 h-4 w-4 accent-[#366779]"
                    />
                    <span>
                      <span className="block text-sm font-semibold text-[#28333b]">
                        Personalize prompts
                      </span>
                      <span className="mt-1 block text-sm leading-6 text-[#46545a]">
                        Use saved themes to make future reflection prompts more
                        relevant.
                      </span>
                    </span>
                  </label>
                  <label className="flex items-start gap-3 rounded-md border-2 border-[#28333b] bg-white p-4">
                    <input
                      type="checkbox"
                      checked={memoryOptions.anonymizedInsights}
                      onChange={() => updateMemoryOption("anonymizedInsights")}
                      className="mt-1 h-4 w-4 accent-[#366779]"
                    />
                    <span>
                      <span className="block text-sm font-semibold text-[#28333b]">
                        Share anonymized product insights
                      </span>
                      <span className="mt-1 block text-sm leading-6 text-[#46545a]">
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

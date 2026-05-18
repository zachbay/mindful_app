import assert from "node:assert/strict";
import { test } from "node:test";
import {
  cardMatchesSearch,
  normalizeCardSearchText
} from "../dist-test/card-search.js";
import {
  createAnonymousReflectionJourney,
  createContentInteraction,
  createInitialReflectionHintCache,
  createLocalReflectionResponse,
  createSavedReflection,
  createSavedReflectionJourney,
  createSharedContentCacheKey,
  identifyReflectionThemes,
  isActionableReflection,
  recordAnonymousReflectionCompletion,
  refreshReflectionHintCache,
  selectCachedReflectionHint,
  summarizeReflection
} from "../dist-test/reflection-insights.js";
import {
  canEnableMemory,
  createConsentRecord,
  createLocalAuthSession
} from "../dist-test/security-flow.js";

test("summarizes the first reflection sentence", () => {
  const summary = summarizeReflection(
    "I feel pressure around work. A pause would help me return to what matters."
  );

  assert.equal(summary, "I feel pressure around work");
});

test("identifies calm MVP themes from reflection text", () => {
  const themes = identifyReflectionThemes(
    "I feel pressure and need space, rest, and attention."
  );

  assert.deepEqual(themes, ["Boundaries", "Pressure", "Presence"]);
});

test("creates local reflection feedback without remote generation", () => {
  const response = createLocalReflectionResponse("I am being judgemental");

  assert.equal(response.observation, "You noticed: I am being judgemental");
  assert.equal(
    response.nextQuestion,
    "What is one small thing this reflection is asking you to notice?"
  );
});

test("creates a saved reflection for the local memory workflow", () => {
  const saved = createSavedReflection({
    id: "test-reflection",
    deckId: "mindful-work",
    cardId: "mw-017",
    prompt: "What would feel lighter?",
    text: " I need space before I answer everyone. ",
    createdAt: "2026-05-15T00:00:00.000Z"
  });

  assert.equal(saved.text, "I need space before I answer everyone.");
  assert.equal(saved.summary, "I need space before I answer everyone");
  assert.deepEqual(saved.themes, ["Boundaries"]);
});

test("detects action-oriented reflections", () => {
  assert.equal(isActionableReflection("I can thank them"), true);
  assert.equal(
    isActionableReflection("I feel uncertain about this conversation"),
    false
  );
});

test("tracks anonymous reflection progress without identity", () => {
  const journey = createAnonymousReflectionJourney();
  const firstCompletion = recordAnonymousReflectionCompletion(journey, {
    deckId: "mindful-work",
    cardId: "mw-045",
    nowIso: "2026-05-15T12:00:00.000Z"
  });
  const secondCompletion = recordAnonymousReflectionCompletion(firstCompletion, {
    deckId: "mindful-work",
    cardId: "mw-046",
    nowIso: "2026-05-16T12:00:00.000Z"
  });

  assert.deepEqual(secondCompletion.completedCards, [
    "mindful-work/mw-046",
    "mindful-work/mw-045"
  ]);
  assert.deepEqual(secondCompletion.completedDays, [
    "2026-05-16",
    "2026-05-15"
  ]);
  assert.equal(secondCompletion.streakDays, 2);
});

test("summarizes a saved reflection journey", () => {
  const reflections = [
    createSavedReflection({
      id: "reflection-1",
      deckId: "mindful-work",
      cardId: "mw-044",
      prompt: "What assumptions am I making?",
      text: "I can ask for space before reacting.",
      createdAt: "2026-05-16T12:00:00.000Z"
    }),
    createSavedReflection({
      id: "reflection-2",
      deckId: "mindful-work",
      cardId: "mw-045",
      prompt: "How can I express appreciation?",
      text: "I need space before I answer everyone.",
      createdAt: "2026-05-15T12:00:00.000Z"
    })
  ];
  const journey = createSavedReflectionJourney(reflections, ["reflection-1"]);

  assert.equal(journey.savedCount, 2);
  assert.equal(journey.actionableCount, 2);
  assert.equal(journey.completedActionCount, 1);
  assert.equal(journey.streakDays, 2);
  assert.equal(journey.suggestedCategory, "Communication");
});

test("caches three prompt hints and rotates shared content locally", () => {
  const cacheKey = createSharedContentCacheKey({
    cardId: "mw-017",
    deckId: "mindful-work",
    prompt: "What would feel lighter?"
  });
  const cache = createInitialReflectionHintCache(
    cacheKey,
    "What would feel lighter?",
    "2026-05-15T00:00:00.000Z"
  );
  const first = selectCachedReflectionHint(cache);
  const second = selectCachedReflectionHint(first.cache);

  assert.equal(cache.ideas.length, 3);
  assert.notEqual(first.idea.id, second.idea.id);
});

test("three-day hint refresh replaces the oldest cached idea", () => {
  const cacheKey = createSharedContentCacheKey({
    cardId: "mw-017",
    deckId: "mindful-work",
    prompt: "What would feel lighter?"
  });
  const cache = createInitialReflectionHintCache(
    cacheKey,
    "What would feel lighter?",
    "2026-05-01T00:00:00.000Z"
  );
  const refreshed = refreshReflectionHintCache(
    cache,
    cacheKey,
    "What would feel lighter?",
    "2026-05-04T00:00:01.000Z"
  );

  assert.equal(refreshed.ideas.length, 3);
  assert.equal(refreshed.ideas[0].id, "hint-3");
  assert.equal(refreshed.ideas[1].id, "hint-1");
  assert.equal(refreshed.ideas[2].id, "hint-2");
});

test("hint refresh interval is configurable", () => {
  const cacheKey = createSharedContentCacheKey({
    cardId: "mw-017",
    deckId: "mindful-work",
    prompt: "What would feel lighter?"
  });
  const cache = createInitialReflectionHintCache(
    cacheKey,
    "What would feel lighter?",
    "2026-05-01T00:00:00.000Z"
  );
  const refreshed = refreshReflectionHintCache(
    cache,
    cacheKey,
    "What would feel lighter?",
    "2026-05-01T00:30:01.000Z",
    { refreshIntervalMs: 30 * 60 * 1000 }
  );

  assert.equal(refreshed.ideas[0].id, "hint-3");
});

test("content interaction events avoid raw reflection text", () => {
  const event = createContentInteraction({
    cardId: "mw-017",
    contentId: "hint-1",
    deckId: "mindful-work",
    event: "reflection_saved",
    metadata: { wordCount: 5 },
    prompt: "What would feel lighter?",
    nowIso: "2026-05-15T00:00:00.000Z"
  });

  assert.equal(event.contentId, "hint-1");
  assert.equal(event.event, "reflection_saved");
  assert.equal(event.metadata.wordCount, 5);
  assert.ok(event.promptHash);
  assert.equal(Object.hasOwn(event, "prompt"), false);
});

test("creates explicit consent before enabling memory", () => {
  const consent = createConsentRecord(
    {
      allow_ai_processing: true,
      enable_personalization: true,
      save_reflections: true,
      use_anonymized_insights: false
    },
    "2026-05-17T12:00:00.000Z"
  );
  const session = createLocalAuthSession({
    email: " user@example.com ",
    provider: "email",
    timestamp: consent.timestamp
  });

  assert.equal(consent.consent_version, "1.0");
  assert.equal(consent.use_anonymized_insights, false);
  assert.equal(canEnableMemory(consent), true);
  assert.equal(session.email, "user@example.com");
  assert.equal(session.sessionKind, "local-prototype");
});

test("card search ignores apostrophes and quote variants", () => {
  const card = {
    cardId: "mw-031",
    category: "Focus",
    prompt: "What’s one way I can make my workspace more calming?"
  };

  assert.equal(normalizeCardSearchText("what's"), "whats");
  assert.equal(normalizeCardSearchText("what’s"), "whats");
  assert.equal(cardMatchesSearch(card, "whats"), true);
  assert.equal(cardMatchesSearch(card, "what's"), true);
  assert.equal(cardMatchesSearch(card, "what’s"), true);
});

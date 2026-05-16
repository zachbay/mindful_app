import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createContentInteraction,
  createInitialReflectionHintCache,
  createSavedReflection,
  createSharedContentCacheKey,
  identifyReflectionThemes,
  refreshReflectionHintCache,
  selectCachedReflectionHint,
  summarizeReflection
} from "../dist-test/reflection-insights.js";

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

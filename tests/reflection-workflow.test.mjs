import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createInitialReflectionHintCache,
  createReflectionHints,
  createSavedReflection,
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

test("creates supportive hints from a short reflection draft", () => {
  const hints = createReflectionHints(
    "complete something meaningful today",
    "What would feel lighter if you gave it your full attention for two minutes?"
  );

  assert.equal(
    hints.nextQuestion,
    "What would make this meaningful enough, even if it stays small?"
  );
  assert.equal(hints.themes[0], "Reflection");
});

test("caches three prompt hints and rotates them locally", () => {
  const cache = createInitialReflectionHintCache(
    "What would feel lighter?",
    "2026-05-15T00:00:00.000Z"
  );
  const first = selectCachedReflectionHint(cache);
  const second = selectCachedReflectionHint(first.cache);

  assert.equal(cache.ideas.length, 3);
  assert.notEqual(first.idea.id, second.idea.id);
});

test("weekly hint refresh replaces the oldest cached idea", () => {
  const cache = createInitialReflectionHintCache(
    "What would feel lighter?",
    "2026-05-01T00:00:00.000Z"
  );
  const refreshed = refreshReflectionHintCache(
    cache,
    "What would feel lighter?",
    "2026-05-15T00:00:00.000Z"
  );

  assert.equal(refreshed.ideas.length, 3);
  assert.equal(refreshed.ideas[0].id, "hint-3");
  assert.equal(refreshed.ideas[1].id, "hint-1");
  assert.equal(refreshed.ideas[2].id, "hint-2");
});

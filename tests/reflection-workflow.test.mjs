import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createSavedReflection,
  identifyReflectionThemes,
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

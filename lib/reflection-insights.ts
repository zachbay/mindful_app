export type SavedReflection = {
  id: string;
  deckId: string;
  cardId: string;
  prompt: string;
  text: string;
  summary: string;
  themes: string[];
  createdAt: string;
};

export type ReflectionHintIdea = {
  id: string;
  text: string;
  createdAt: string;
};

export type ReflectionHintCache = {
  prompt: string;
  ideas: ReflectionHintIdea[];
  nextIndex: number;
  lastRefreshAt: string;
  refreshCursor: number;
};

const themeKeywords = [
  { theme: "Boundaries", words: ["boundary", "boundaries", "no", "space"] },
  { theme: "Pressure", words: ["pressure", "stress", "heavy", "overwhelmed"] },
  { theme: "Presence", words: ["present", "attention", "focus", "now"] },
  { theme: "Rest", words: ["rest", "tired", "sleep", "pause"] },
  { theme: "Connection", words: ["friend", "family", "partner", "together"] }
];

const weeklyRefreshMs = 7 * 24 * 60 * 60 * 1000;

const genericReflectionIdeaTemplates = [
  (prompt: string) =>
    `Notice where this card feels true today: ${prompt} Let one small answer be enough.`,
  () =>
    "Name the lightest next step you could take without turning this into a task list.",
  () =>
    "Ask what wants care before it wants action. Stay with that answer for one breath.",
  () =>
    "Choose one detail from today that carries the feeling behind this card.",
  () =>
    "Let the reflection be practical: what would become easier if you gave this two quiet minutes?",
  () =>
    "Write from the body first: tight, open, tired, clear, heavy, or something else."
];

export function summarizeReflection(text: string) {
  const trimmed = text.trim();
  if (!trimmed) {
    return "";
  }

  const firstSentence = trimmed.split(/[.!?]/).find(Boolean)?.trim() ?? trimmed;
  return firstSentence.length > 150
    ? `${firstSentence.slice(0, 147).trim()}...`
    : firstSentence;
}

export function identifyReflectionThemes(text: string) {
  const lower = text.toLowerCase();
  const matches = themeKeywords
    .filter(({ words }) => words.some((word) => lower.includes(word)))
    .map(({ theme }) => theme);

  return matches.length > 0 ? matches.slice(0, 3) : ["Reflection"];
}

export function createReflectionHints(text: string, prompt: string) {
  const themes = identifyReflectionThemes(text);
  const lower = text.toLowerCase();
  const hasDraft = Boolean(text.trim());

  const nextQuestion = hasDraft
    ? lower.includes("complete") || lower.includes("finish")
      ? "What would make this meaningful enough, even if it stays small?"
      : lower.includes("pressure") || lower.includes("stress")
        ? "What is one expectation you can soften before you act?"
        : "What part of this wants your attention first?"
    : "What is the smallest honest answer to this card?";

  const groundingCue = hasDraft
    ? "Pause for one breath and notice whether this feels heavy, light, or unclear."
    : "Take two quiet breaths before writing. Let the first answer be imperfect.";

  const nextStep = hasDraft
    ? `Try naming one tiny next step connected to: ${prompt.toLowerCase()}`
    : "Write one sentence beginning with: Right now, I notice...";

  return {
    groundingCue,
    nextQuestion,
    nextStep,
    themes
  };
}

export function createInitialReflectionHintCache(
  prompt: string,
  nowIso: string
): ReflectionHintCache {
  return {
    prompt,
    ideas: [0, 1, 2].map((templateIndex) =>
      createReflectionHintIdea(prompt, templateIndex, nowIso)
    ),
    nextIndex: 0,
    lastRefreshAt: nowIso,
    refreshCursor: 3
  };
}

export function refreshReflectionHintCache(
  cache: ReflectionHintCache,
  prompt: string,
  nowIso: string
): ReflectionHintCache {
  if (cache.prompt !== prompt || cache.ideas.length !== 3) {
    return createInitialReflectionHintCache(prompt, nowIso);
  }

  const nowTime = Date.parse(nowIso);
  const lastRefreshTime = Date.parse(cache.lastRefreshAt);
  if (nowTime - lastRefreshTime < weeklyRefreshMs) {
    return cache;
  }

  const oldestIdeaIndex = cache.ideas.reduce((oldestIndex, idea, index) => {
    return Date.parse(idea.createdAt) <
      Date.parse(cache.ideas[oldestIndex].createdAt)
      ? index
      : oldestIndex;
  }, 0);
  const nextIdeas = [...cache.ideas];
  nextIdeas[oldestIdeaIndex] = createReflectionHintIdea(
    prompt,
    cache.refreshCursor,
    nowIso
  );

  return {
    ...cache,
    ideas: nextIdeas,
    lastRefreshAt: nowIso,
    refreshCursor: cache.refreshCursor + 1
  };
}

export function selectCachedReflectionHint(cache: ReflectionHintCache) {
  const selectedIndex = cache.nextIndex % cache.ideas.length;

  return {
    cache: {
      ...cache,
      nextIndex: (selectedIndex + 1) % cache.ideas.length
    },
    idea: cache.ideas[selectedIndex]
  };
}

function createReflectionHintIdea(
  prompt: string,
  templateIndex: number,
  nowIso: string
): ReflectionHintIdea {
  const template =
    genericReflectionIdeaTemplates[
      templateIndex % genericReflectionIdeaTemplates.length
    ];

  return {
    id: `hint-${templateIndex}`,
    text: template(prompt),
    createdAt: nowIso
  };
}

export function createSavedReflection(input: {
  cardId: string;
  deckId: string;
  id: string;
  prompt: string;
  text: string;
  createdAt: string;
}): SavedReflection {
  return {
    ...input,
    text: input.text.trim(),
    summary: summarizeReflection(input.text),
    themes: identifyReflectionThemes(input.text)
  };
}

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

const themeKeywords = [
  { theme: "Boundaries", words: ["boundary", "boundaries", "no", "space"] },
  { theme: "Pressure", words: ["pressure", "stress", "heavy", "overwhelmed"] },
  { theme: "Presence", words: ["present", "attention", "focus", "now"] },
  { theme: "Rest", words: ["rest", "tired", "sleep", "pause"] },
  { theme: "Connection", words: ["friend", "family", "partner", "together"] }
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

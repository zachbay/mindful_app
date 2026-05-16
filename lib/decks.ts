export type ReflectionCard = {
  cardId: string;
  prompt: string;
};

export const deckCards: Record<string, ReflectionCard[]> = {
  "mindful-work": [
    {
      cardId: "mw-017",
      prompt:
        "What would feel lighter if you gave it your full attention for two minutes?"
    },
    {
      cardId: "mw-031",
      prompt: "What boundary would help you return to yourself today?"
    },
    {
      cardId: "mw-044",
      prompt: "Where are you carrying pressure that is not yours to hold?"
    }
  ]
};

export function formatDeckName(deckId: string) {
  return deckId
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function getDeckCards(deckId: string) {
  return deckCards[deckId] ?? [];
}

export function getCardPrompt(deckId: string, cardId: string) {
  return (
    getDeckCards(deckId).find((card) => card.cardId === cardId)?.prompt ??
    "What feels most present for you right now, and what might it be asking for?"
  );
}

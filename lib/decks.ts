import { mindfulWorkCards } from "./mindful-work-cards";

export type ReflectionCard = {
  cardId: string;
  cardNumber?: number;
  category?: string;
  exampleText?: string;
  prompt: string;
  templateFileName?: string;
};

export const deckCards: Record<string, ReflectionCard[]> = {
  "mindful-work": mindfulWorkCards
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
    getDeckCard(deckId, cardId)?.prompt ??
    "What feels most present for you right now, and what might it be asking for?"
  );
}

export function getDeckCard(deckId: string, cardId: string) {
  return getDeckCards(deckId).find((card) => card.cardId === cardId) ?? null;
}

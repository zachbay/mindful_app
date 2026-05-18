import type { ReflectionCard } from "./decks";

const apostrophePattern = /['\u2018\u2019\u201A\u201B\u2032\u02BC]/g;

export function normalizeCardSearchText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(apostrophePattern, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function cardMatchesSearch(card: ReflectionCard, query: string) {
  const normalizedQuery = normalizeCardSearchText(query);

  if (!normalizedQuery) {
    return true;
  }

  return normalizeCardSearchText(
    `${card.cardId} ${card.category ?? ""} ${card.prompt} ${
      card.exampleText ?? ""
    }`
  ).includes(normalizedQuery);
}

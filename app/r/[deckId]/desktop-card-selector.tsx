"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { ReflectionCard } from "../../../lib/decks";

type DesktopCardSelectorProps = {
  cards: ReflectionCard[];
  deckId: string;
};

export default function DesktopCardSelector({
  cards,
  deckId
}: DesktopCardSelectorProps) {
  const [query, setQuery] = useState("");
  const filteredCards = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return cards;
    }

    return cards.filter((card) => {
      return `${card.cardId} ${card.prompt}`
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [cards, query]);

  return (
    <div className="grid gap-4">
      <label className="grid gap-2">
        <span className="text-sm font-semibold text-[var(--leaf)]">
          Find your card
        </span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Type card number or words from the prompt"
          className="w-full rounded-md border border-[var(--line)] bg-white px-4 py-3 text-[var(--foreground)] placeholder:text-[#8b958e]"
        />
      </label>

      <div className="grid gap-3">
        {filteredCards.length > 0 ? (
          filteredCards.map((card) => (
            <Link
              key={card.cardId}
              href={`/r/${deckId}/${card.cardId}`}
              className="rounded-md border border-[var(--line)] bg-white p-4 transition hover:border-[var(--leaf)] hover:bg-[var(--water)]"
            >
              <p className="text-xs font-semibold tracking-[0.16em] text-[var(--leaf)] uppercase">
                {card.cardId}
              </p>
              <p className="mt-2 text-lg leading-7 font-semibold text-[var(--leaf-dark)]">
                {card.prompt}
              </p>
            </Link>
          ))
        ) : (
          <p className="rounded-md border border-[var(--line)] bg-white p-4 text-sm leading-6 text-[var(--muted)]">
            No card matches that search. Try the card number or a shorter phrase.
          </p>
        )}
      </div>
    </div>
  );
}

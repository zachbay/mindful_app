"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { cardMatchesSearch } from "../../../lib/card-search";
import type { ReflectionCard } from "../../../lib/decks";

type DesktopCardSelectorProps = {
  cards: ReflectionCard[];
  campaignQuery?: string;
  deckId: string;
};

export default function DesktopCardSelector({
  cards,
  campaignQuery = "",
  deckId
}: DesktopCardSelectorProps) {
  const [query, setQuery] = useState("");
  const filteredCards = useMemo(() => {
    if (!query.trim()) {
      return cards;
    }

    return cards.filter((card) => cardMatchesSearch(card, query));
  }, [cards, query]);
  const hasQuery = query.trim().length > 0;
  const visibleCards = hasQuery ? filteredCards.slice(0, 8) : [];

  return (
    <div className="grid gap-4">
      <label className="grid gap-2">
        <span className="text-base font-semibold text-[#213b38]">
          Search by prompt text
        </span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Example: assumptions, communication, this person"
          className="w-full rounded-md border-2 border-[#28333b] bg-white px-5 py-4 text-lg text-[#213b38] placeholder:text-[#7a8984] focus:border-[#366779] focus:bg-[#fff9d9]"
          autoFocus
        />
      </label>

      <div className="grid gap-3">
        {!hasQuery ? (
          <p className="rounded-md border-2 border-[#28333b] bg-[#f6d73b] p-4 text-sm leading-6 text-[#28333b]">
            Look at the question printed on your card and type one distinctive
            word here.
          </p>
        ) : visibleCards.length > 0 ? (
          visibleCards.map((card) => (
            <Link
              key={card.cardId}
              href={`/r/${deckId}/${card.cardId}${campaignQuery}`}
              className="rounded-md border-2 border-[#28333b] bg-white p-4 transition hover:bg-[#fff9d9]"
            >
              <p className="text-xs font-semibold tracking-[0.16em] text-[#366779] uppercase">
                {card.cardId}
                {card.category ? ` / ${card.category}` : ""}
              </p>
              <p className="mt-2 text-lg leading-7 font-semibold text-[#213b38]">
                {card.prompt}
              </p>
            </Link>
          ))
        ) : (
          <p className="rounded-md border-2 border-[#28333b] bg-white p-4 text-sm leading-6 text-[#46545a]">
            No card matches that search. Try the card number or a shorter phrase.
          </p>
        )}
      </div>
    </div>
  );
}

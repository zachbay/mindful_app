import ReflectionSession from "./reflection-session";
import { formatDeckName, getDeckCard } from "../../../../lib/decks";

export default async function ReflectionRoute({
  params,
  searchParams
}: {
  params: Promise<{ deckId: string; cardId: string }>;
  searchParams: Promise<{ campaign?: string }>;
}) {
  const { deckId, cardId } = await params;
  const { campaign } = await searchParams;
  const card = getDeckCard(deckId, cardId);
  const prompt =
    card?.prompt ??
    "What feels most present for you right now, and what might it be asking for?";
  const lookupHref = campaign
    ? `/r/${deckId}?campaign=${encodeURIComponent(campaign)}`
    : `/r/${deckId}`;
  const reflectionHref = campaign
    ? `/r/${deckId}/${cardId}?campaign=${encodeURIComponent(campaign)}`
    : `/r/${deckId}/${cardId}`;
  const loginHref = `/login?redirect=${encodeURIComponent(reflectionHref)}`;

  return (
    <ReflectionSession
      category={card?.category}
      deckId={deckId}
      cardId={cardId}
      deckName={formatDeckName(deckId)}
      loginHref={loginHref}
      lookupHref={lookupHref}
      prompt={prompt}
    />
  );
}

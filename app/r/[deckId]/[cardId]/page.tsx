import ReflectionSession from "./reflection-session";
import { formatDeckName, getCardPrompt } from "../../../../lib/decks";

export default async function ReflectionRoute({
  params
}: {
  params: Promise<{ deckId: string; cardId: string }>;
}) {
  const { deckId, cardId } = await params;
  const prompt = getCardPrompt(deckId, cardId);

  return (
    <ReflectionSession
      deckId={deckId}
      cardId={cardId}
      deckName={formatDeckName(deckId)}
      prompt={prompt}
    />
  );
}

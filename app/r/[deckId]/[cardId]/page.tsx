import ReflectionSession from "./reflection-session";

const cardPrompts: Record<string, string> = {
  "mw-017":
    "What would feel lighter if you gave it your full attention for two minutes?",
  "mw-031": "What boundary would help you return to yourself today?",
  "mw-044": "Where are you carrying pressure that is not yours to hold?"
};

function formatDeckName(deckId: string) {
  return deckId
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export default async function ReflectionRoute({
  params
}: {
  params: Promise<{ deckId: string; cardId: string }>;
}) {
  const { deckId, cardId } = await params;
  const prompt =
    cardPrompts[cardId] ??
    "What feels most present for you right now, and what might it be asking for?";

  return (
    <ReflectionSession
      deckId={deckId}
      cardId={cardId}
      deckName={formatDeckName(deckId)}
      prompt={prompt}
    />
  );
}

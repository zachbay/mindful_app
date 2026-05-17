import path from "node:path";
import { createWorker } from "tesseract.js";
import { getDeckCards } from "../../../lib/decks";

export const runtime = "nodejs";

type RankedCard = {
  cardId: string;
  matchedCount: number;
  prompt: string;
  score: number;
};

export async function POST(request: Request) {
  const formData = await request.formData();
  const image = formData.get("image");
  const deckId = String(formData.get("deckId") ?? "mindful-work");

  if (!(image instanceof File)) {
    return Response.json(
      { error: "Card image is required." },
      { status: 400 }
    );
  }

  const cards = getDeckCards(deckId);

  if (!cards.length) {
    return Response.json({ error: "Deck not found." }, { status: 404 });
  }

  const imageBuffer = Buffer.from(await image.arrayBuffer());
  const worker = await createWorker("eng", 1, {
    cacheMethod: "none",
    workerPath: path.join(
      process.cwd(),
      "node_modules/tesseract.js/src/worker-script/node/index.js"
    ),
    langPath: path.join(
      process.cwd(),
      "node_modules/@tesseract.js-data/eng/4.0.0_best_int"
    )
  });

  try {
    const result = await worker.recognize(imageBuffer);
    const text = result.data.text;
    const match = findPromptMatch(cards, text);

    return Response.json({
      cardId: match?.cardId ?? null,
      confidence: match?.score ?? 0,
      ocrText: text,
      prompt: match?.prompt ?? null
    });
  } catch {
    return Response.json(
      { error: "OCR could not read the image." },
      { status: 422 }
    );
  } finally {
    await worker.terminate();
  }
}

function findPromptMatch(
  cards: ReturnType<typeof getDeckCards>,
  text: string
): RankedCard | null {
  const scannedTokens = getSignificantTokens(text);
  const scannedSet = new Set(scannedTokens);

  if (scannedSet.size < 2) {
    return null;
  }

  const rankedCards = cards
    .map((card) => {
      const promptTokens = getSignificantTokens(card.prompt);
      const promptSet = new Set(promptTokens);
      const matchedCount = [...promptSet].filter((token) =>
        scannedSet.has(token)
      ).length;
      const score = matchedCount / Math.max(promptSet.size, 1);

      return {
        cardId: card.cardId,
        matchedCount,
        prompt: card.prompt,
        score
      };
    })
    .sort((first, second) => {
      if (second.score !== first.score) {
        return second.score - first.score;
      }

      return second.matchedCount - first.matchedCount;
    });

  const bestMatch = rankedCards[0];

  if (!bestMatch || bestMatch.score < 0.42 || bestMatch.matchedCount < 2) {
    return null;
  }

  return bestMatch;
}

function getSignificantTokens(value: string) {
  const stopWords = new Set([
    "a",
    "about",
    "am",
    "an",
    "and",
    "are",
    "at",
    "be",
    "can",
    "do",
    "for",
    "how",
    "i",
    "in",
    "is",
    "it",
    "me",
    "my",
    "of",
    "on",
    "one",
    "or",
    "the",
    "this",
    "to",
    "today",
    "what",
    "when",
    "with"
  ]);

  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2 && !stopWords.has(token));
}

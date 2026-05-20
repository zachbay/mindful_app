import Link from "next/link";
import BayWelLogo from "../../components/baywel-logo";
import { formatDeckName, getDeckCards } from "../../../lib/decks";
import DesktopCardSelector from "./desktop-card-selector";
import MobileCardScanner from "./mobile-card-scanner";

export default async function DeckRoute({
  params,
  searchParams
}: {
  params: Promise<{ deckId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { deckId } = await params;
  const campaignQuery = buildCampaignQuery(await searchParams);
  const deckName = formatDeckName(deckId);
  const cards = getDeckCards(deckId);

  return (
    <main className="min-h-screen bg-[#fffdf1] px-4 py-5 text-[#28333b] sm:px-6 lg:py-8">
      <section className="mx-auto max-w-6xl border-2 border-[#28333b] bg-[#fffdf1] p-5 sm:p-6">
        <Link
          href="/"
          className="inline-flex transition hover:opacity-75"
          aria-label="BayWel registered trademark home"
        >
          <BayWelLogo />
        </Link>

        <div className="mt-8 grid gap-6 lg:grid-cols-[0.92fr_1.08fr] lg:items-stretch">
          <div className="rounded-[22px] border-2 border-[#28333b] bg-[#dc8b3a] p-4">
            <div className="flex min-h-[300px] flex-col rounded-[18px] border-2 border-[#28333b] bg-[#fffdf1] px-5 py-6 text-center lg:min-h-full">
              <p className="text-xs font-semibold tracking-[0.18em] text-[#28333b] uppercase">
                Deck scanned
              </p>
              <div className="flex flex-1 items-center justify-center py-10">
                <h1 className="text-4xl leading-tight font-normal text-[#28333b] sm:text-5xl">
                  {deckName}
                </h1>
              </div>
              <div className="mx-auto flex w-full max-w-xs items-center gap-3 text-[#28333b]">
                <span className="h-0.5 flex-1 bg-[#dc8b3a]" />
                <p className="text-lg leading-none">Ready</p>
                <span className="h-0.5 flex-1 bg-[#dc8b3a]" />
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-center">
            <p className="text-sm font-semibold text-[#366779]">
              Find your exact card
            </p>
            <h2 className="mt-1 text-3xl font-semibold text-[#213b38]">
              Search the prompt printed on the card.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#46545a]">
              You are in the right deck. Use a few words from the physical card
              so BayWel can open the matching reflection.
            </p>

            <div className="mt-6 hidden [@media(pointer:coarse)]:block">
              <MobileCardScanner
                campaignQuery={campaignQuery}
                cards={cards}
                deckId={deckId}
              />
            </div>

            <div className="mt-6 [@media(pointer:coarse)]:hidden">
              <DesktopCardSelector
                campaignQuery={campaignQuery}
                cards={cards}
                deckId={deckId}
              />
            </div>

            <p className="mt-5 text-sm leading-6 text-[#46545a]">
              No install, no account, no setup.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

function buildCampaignQuery(
  searchParams: Record<string, string | string[] | undefined>
) {
  const params = new URLSearchParams();

  Object.entries(searchParams).forEach(([key, value]) => {
    if (!value) {
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((entry) => params.append(key, entry));
      return;
    }

    params.set(key, value);
  });

  const query = params.toString();

  return query ? `?${query}` : "";
}

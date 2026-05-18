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
      <section className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-[0.82fr_1.18fr]">
        <aside className="border-2 border-[#28333b] bg-[#fffdf1] p-5 sm:p-6">
          <Link
            href="/"
            className="inline-flex transition hover:opacity-75"
            aria-label="BayWel registered trademark home"
          >
            <BayWelLogo />
          </Link>
          <div className="mt-10 rounded-[22px] border-2 border-[#28333b] bg-[#dc8b3a] p-4">
            <div className="flex min-h-[340px] flex-col rounded-[18px] border-2 border-[#28333b] bg-[#fffdf1] px-5 py-6 text-center">
              <p className="text-xs font-semibold tracking-[0.18em] text-[#28333b] uppercase">
                Deck scanned
              </p>
              <div className="flex flex-1 items-center justify-center">
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
          <div className="mt-4 grid gap-2 text-sm leading-6 text-[#46545a]">
            <p>
              <span className="font-semibold text-[#28333b]">Next:</span> find
              the exact physical card you are holding.
            </p>
            <p>No install, no account, no setup.</p>
          </div>
        </aside>

        <section className="hidden border-2 border-[#28333b] bg-[#fffdf1] p-5 sm:p-6 [@media(pointer:coarse)]:block">
          <p className="text-sm font-semibold text-[#366779]">
            Step 2
          </p>
          <h2 className="mt-1 text-3xl font-semibold text-[#213b38]">
            Take a photo of the prompt.
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#46545a]">
            Fill the photo with the printed question on your card. BayWel will
            read it and open the reflection.
          </p>
          <div className="mt-6">
            <MobileCardScanner
              campaignQuery={campaignQuery}
              cards={cards}
              deckId={deckId}
            />
          </div>
        </section>

        <section className="border-2 border-[#28333b] bg-[#fffdf1] p-6 [@media(pointer:coarse)]:hidden">
          <p className="text-sm font-semibold text-[#366779]">
            Step 2
          </p>
          <h2 className="mt-1 text-3xl font-semibold text-[#213b38]">
            Find the card prompt.
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#46545a]">
            Type any words printed on your physical card. Choose the matching
            prompt to continue.
          </p>
          <div className="mt-6">
            <DesktopCardSelector
              campaignQuery={campaignQuery}
              cards={cards}
              deckId={deckId}
            />
          </div>
        </section>
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

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
    <main className="min-h-screen bg-[var(--background)] px-4 py-5 sm:px-6">
      <section className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <aside className="border border-[var(--line)] bg-[var(--paper)] p-5 sm:p-6 lg:min-h-[calc(100vh-2.5rem)]">
          <Link
            href="/"
            className="inline-flex transition hover:opacity-75"
            aria-label="BayWel registered trademark home"
          >
            <BayWelLogo />
          </Link>
          <div className="mt-10 border border-[var(--line)] bg-[var(--water)] p-6">
            <p className="text-xs font-semibold tracking-[0.18em] text-[var(--leaf)] uppercase">
              {deckName}
            </p>
            <h1 className="mt-8 text-3xl leading-tight font-semibold text-[var(--leaf-dark)] sm:text-4xl">
              Select the card in front of you.
            </h1>
            <p className="mt-8 text-sm leading-6 text-[var(--muted)]">
              This deck QR opens the right flow for your device. Mobile can scan
              the current card; desktop can search the deck.
            </p>
          </div>
        </aside>

        <section className="border border-[var(--line)] bg-[var(--paper)] p-5 sm:p-6 lg:hidden">
          <p className="text-sm font-semibold text-[var(--leaf)]">
            Mobile card scan
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-[var(--leaf-dark)]">
            Scan the card you are holding.
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)]">
            Use the camera to read the card marker and load the prompt
            reflection page. You can enter the card ID if scanning is
            unavailable.
          </p>
          <div className="mt-6">
            <MobileCardScanner
              campaignQuery={campaignQuery}
              cards={cards}
              deckId={deckId}
            />
          </div>
        </section>

        <section className="hidden border border-[var(--line)] bg-[var(--paper)] p-5 sm:p-6 lg:block">
          <p className="text-sm font-semibold text-[var(--leaf)]">
            Desktop card selection
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-[var(--leaf-dark)]">
            Which card are you holding?
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)]">
            No splash screen. Pick the matching card and BayWel will load the
            prompt reflection page.
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

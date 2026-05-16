import Link from "next/link";
import BayWelLogo from "../../components/baywel-logo";
import { formatDeckName, getDeckCards } from "../../../lib/decks";
import DesktopCardSelector from "./desktop-card-selector";

export default async function DeckRoute({
  params
}: {
  params: Promise<{ deckId: string }>;
}) {
  const { deckId } = await params;
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
              This deck QR opens the desktop selection flow. Type the card ID or
              a few words from the prompt, then continue into reflection.
            </p>
          </div>
        </aside>

        <section className="border border-[var(--line)] bg-[var(--paper)] p-5 sm:p-6">
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
            <DesktopCardSelector cards={cards} deckId={deckId} />
          </div>
        </section>
      </section>
    </main>
  );
}

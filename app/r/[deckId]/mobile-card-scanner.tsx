"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ReflectionCard } from "../../../lib/decks";

type MobileCardScannerProps = {
  cards: ReflectionCard[];
  campaignQuery?: string;
  deckId: string;
};

type BarcodeDetectorShape = {
  detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue: string }>>;
};

type BarcodeDetectorConstructor = new (options: {
  formats: string[];
}) => BarcodeDetectorShape;

export default function MobileCardScanner({
  cards,
  campaignQuery = "",
  deckId
}: MobileCardScannerProps) {
  const router = useRouter();
  const [cameraState, setCameraState] = useState<
    "idle" | "starting" | "scanning" | "unsupported" | "blocked"
  >("idle");
  const [manualEntry, setManualEntry] = useState("");
  const [detectedCardId, setDetectedCardId] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scanFrameRef = useRef<number | null>(null);

  const manualMatch = useMemo(() => {
    return findCardMatch(cards, manualEntry);
  }, [cards, manualEntry]);
  const getCardHref = (cardId: string) =>
    `/r/${deckId}/${cardId}${campaignQuery}`;

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  async function startCamera() {
    const BarcodeDetectorClass = getBarcodeDetector();

    if (!navigator.mediaDevices?.getUserMedia || !BarcodeDetectorClass) {
      setCameraState("unsupported");
      return;
    }

    setCameraState("starting");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: "environment" }
        }
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCameraState("scanning");
      scanForCard(BarcodeDetectorClass);
    } catch {
      setCameraState("blocked");
    }
  }

  function stopCamera() {
    if (scanFrameRef.current) {
      cancelAnimationFrame(scanFrameRef.current);
      scanFrameRef.current = null;
    }

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  async function scanForCard(BarcodeDetectorClass: BarcodeDetectorConstructor) {
    const detector = new BarcodeDetectorClass({
      formats: ["qr_code"]
    });

    const scan = async () => {
      if (!videoRef.current || cameraState === "blocked") {
        return;
      }

      try {
        const codes = await detector.detect(videoRef.current);
        const cardId = codes
          .map((code) => parseCardId(code.rawValue, cards))
          .find(Boolean);

        if (cardId) {
          setDetectedCardId(cardId);
          stopCamera();
          router.push(getCardHref(cardId));
          return;
        }
      } catch {
        setCameraState("unsupported");
        stopCamera();
        return;
      }

      scanFrameRef.current = requestAnimationFrame(scan);
    };

    scanFrameRef.current = requestAnimationFrame(scan);
  }

  return (
    <div className="grid gap-4">
      <div className="rounded-md border border-[var(--line)] bg-white p-4">
        <div className="relative aspect-[4/3] overflow-hidden rounded-md border border-[var(--line)] bg-[var(--water)]">
          <video
            ref={videoRef}
            muted
            playsInline
            className="absolute inset-0 h-full w-full object-cover"
          />
          {cameraState !== "scanning" ? (
            <div className="absolute inset-0 grid place-items-center px-5 text-center text-sm leading-6 text-[var(--muted)]">
              <p>
                Start the camera to scan the card marker, or enter the card ID
                below.
              </p>
            </div>
          ) : null}
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={startCamera}
            disabled={cameraState === "starting" || cameraState === "scanning"}
            className="rounded-md bg-[var(--leaf)] px-5 py-3 text-sm font-semibold text-white transition enabled:hover:bg-[var(--leaf-dark)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {cameraState === "scanning" ? "Scanning" : "Start camera"}
          </button>
          {cameraState === "scanning" ? (
            <button
              type="button"
              onClick={() => {
                stopCamera();
                setCameraState("idle");
              }}
              className="rounded-md border border-[var(--line)] px-5 py-3 text-sm font-semibold text-[var(--leaf-dark)]"
            >
              Stop
            </button>
          ) : null}
        </div>

        {cameraState === "unsupported" ? (
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
            Camera scanning is not available in this browser. Enter the card ID
            instead.
          </p>
        ) : null}
        {cameraState === "blocked" ? (
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
            Camera access was blocked. You can still enter the card ID manually.
          </p>
        ) : null}
      </div>

      {detectedCardId ? (
        <p className="rounded-md bg-[var(--water)] px-4 py-3 text-sm font-semibold text-[var(--leaf-dark)]">
          Card {detectedCardId} found. Opening reflection...
        </p>
      ) : null}

      <label className="grid gap-2">
        <span className="text-sm font-semibold text-[var(--leaf)]">
          Enter card ID
        </span>
        <input
          value={manualEntry}
          onChange={(event) => setManualEntry(event.target.value)}
          placeholder="Example: mw-017"
          className="w-full rounded-md border border-[var(--line)] bg-white px-4 py-3 text-[var(--foreground)] placeholder:text-[#8b958e]"
        />
      </label>

      {manualMatch ? (
        <Link
          href={getCardHref(manualMatch.cardId)}
          className="rounded-md border border-[var(--leaf)] bg-[var(--water)] p-4 transition hover:bg-white"
        >
          <p className="text-xs font-semibold tracking-[0.16em] text-[var(--leaf)] uppercase">
            {manualMatch.cardId}
          </p>
          <p className="mt-2 text-lg leading-7 font-semibold text-[var(--leaf-dark)]">
            {manualMatch.prompt}
          </p>
        </Link>
      ) : null}
    </div>
  );
}

function findCardMatch(cards: ReflectionCard[], value: string) {
  const normalizedValue = value.trim().toLowerCase();

  if (!normalizedValue) {
    return null;
  }

  return (
    cards.find((card) => card.cardId.toLowerCase() === normalizedValue) ??
    cards.find((card) => card.cardId.toLowerCase().includes(normalizedValue)) ??
    null
  );
}

function parseCardId(rawValue: string, cards: ReflectionCard[]) {
  const normalizedValue = rawValue.toLowerCase();

  return (
    cards.find((card) => normalizedValue.includes(card.cardId.toLowerCase()))
      ?.cardId ?? null
  );
}

function getBarcodeDetector() {
  return (
    "BarcodeDetector" in window
      ? (window.BarcodeDetector as BarcodeDetectorConstructor)
      : null
  );
}

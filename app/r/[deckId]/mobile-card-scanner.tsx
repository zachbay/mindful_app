"use client";

import jsQR from "jsqr";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { ReflectionCard } from "../../../lib/decks";

type MobileCardScannerProps = {
  cards: ReflectionCard[];
  campaignQuery?: string;
  deckId: string;
};

type BarcodeDetectorShape = {
  detect: (
    source: HTMLVideoElement | HTMLCanvasElement | ImageBitmap
  ) => Promise<Array<{ rawValue: string }>>;
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
  const imageInputId = useId();
  const [cameraState, setCameraState] = useState<
    | "idle"
    | "starting"
    | "scanning"
    | "secure-required"
    | "unsupported"
    | "blocked"
  >("idle");
  const [manualEntry, setManualEntry] = useState("");
  const [detectedCardId, setDetectedCardId] = useState<string | null>(null);
  const [imageScanError, setImageScanError] = useState<string | null>(null);
  const [imageScanMessage, setImageScanMessage] = useState<string | null>(null);
  const [lastOcrText, setLastOcrText] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
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
    if (!window.isSecureContext) {
      setCameraState("secure-required");
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
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
      scanForCard();
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

  async function scanForCard() {
    const BarcodeDetectorClass = getBarcodeDetector();
    const detector = BarcodeDetectorClass
      ? new BarcodeDetectorClass({
          formats: ["qr_code"]
        })
      : null;

    const scan = async () => {
      if (!videoRef.current) {
        return;
      }

      try {
        const cardId = detector
          ? await scanWithBarcodeDetector(detector, videoRef.current, cards)
          : scanWithCanvas(videoRef.current, canvasRef.current, cards);

        if (cardId) {
          setDetectedCardId(cardId);
          stopCamera();
          router.push(getCardHref(cardId));
          return;
        }
      } catch {
        const fallbackCardId = scanWithCanvas(
          videoRef.current,
          canvasRef.current,
          cards
        );

        if (fallbackCardId) {
          setDetectedCardId(fallbackCardId);
          stopCamera();
          router.push(getCardHref(fallbackCardId));
          return;
        }
      }

      scanFrameRef.current = requestAnimationFrame(scan);
    };

    scanFrameRef.current = requestAnimationFrame(scan);
  }

  async function scanCapturedImage(file: File | undefined) {
    if (!file) {
      return;
    }

    setImageScanError(null);
    setLastOcrText(null);
    setImageScanMessage("Reading the card photo...");

    const detectedQrCardId = await scanImageFileWithBarcodeDetector(file, cards);

    if (detectedQrCardId) {
      setDetectedCardId(detectedQrCardId);
      setImageScanMessage(null);
      router.push(getCardHref(detectedQrCardId));
      return;
    }

    const uploadedMatch = await recognizeFileWithApi(
      file,
      deckId,
      setImageScanMessage
    );

    if (uploadedMatch.cardId) {
      setDetectedCardId(uploadedMatch.cardId);
      setImageScanMessage(null);
      router.push(getCardHref(uploadedMatch.cardId));
      return;
    }

    if (uploadedMatch.ocrText) {
      setLastOcrText(uploadedMatch.ocrText);
    }

    const canvasCardId = await decodeImageFile(
      file,
      canvasRef.current,
      cards,
      deckId,
      setImageScanMessage
    );

    if (canvasCardId) {
      setDetectedCardId(canvasCardId);
      setImageScanMessage(null);
      router.push(getCardHref(canvasCardId));
      return;
    }

    setImageScanMessage(null);
    setImageScanError(
      "No matching card was found in that image. Make sure the prompt text is readable, or enter the card ID."
    );
  }

  async function captureCameraFrame() {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    setImageScanError(null);
    setLastOcrText(null);
    setImageScanMessage("Capturing the card...");

    if (!video || !canvas || video.readyState < video.HAVE_CURRENT_DATA) {
      setImageScanMessage(null);
      setImageScanError(
        "The camera frame is not ready yet. Hold the card steady and try again."
      );
      return;
    }

    const width = video.videoWidth;
    const height = video.videoHeight;

    if (!width || !height) {
      setImageScanMessage(null);
      setImageScanError(
        "The camera frame is not ready yet. Hold the card steady and try again."
      );
      return;
    }

    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d", { willReadFrequently: true });

    if (!context) {
      setImageScanMessage(null);
      setImageScanError("This browser could not capture the camera frame.");
      return;
    }

    context.drawImage(video, 0, 0, width, height);

    const qrCardId = scanCanvasForQr(canvas, cards);

    if (qrCardId) {
      setDetectedCardId(qrCardId);
      setImageScanMessage(null);
      stopCamera();
      router.push(getCardHref(qrCardId));
      return;
    }

    setImageScanMessage("No QR found. Reading prompt text...");

    const uploadedMatch = await recognizeCanvasWithApi(
      canvas,
      deckId,
      setImageScanMessage
    );

    if (uploadedMatch.cardId) {
      setDetectedCardId(uploadedMatch.cardId);
      setImageScanMessage(null);
      stopCamera();
      router.push(getCardHref(uploadedMatch.cardId));
      return;
    }

    if (uploadedMatch.ocrText) {
      setLastOcrText(uploadedMatch.ocrText);
    }

    setImageScanMessage(null);
    setImageScanError(
      "No matching card was found from the camera frame. Hold the prompt text flat in view, or use Take photo."
    );
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
          <canvas ref={canvasRef} className="hidden" aria-hidden="true" />
          {cameraState !== "scanning" ? (
            <div className="absolute inset-0 grid place-items-center px-5 text-center text-sm leading-6 text-[var(--muted)]">
              <p>
                Take a photo of the card prompt, start the live camera, or
                enter the card ID below.
              </p>
            </div>
          ) : null}
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <input
            id={imageInputId}
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            onChange={(event) => {
              scanCapturedImage(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
          <label
            htmlFor={imageInputId}
            className="cursor-pointer rounded-md bg-[var(--leaf)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--leaf-dark)]"
          >
            Take photo
          </label>
          <button
            type="button"
            onClick={startCamera}
            disabled={cameraState === "starting" || cameraState === "scanning"}
            className="rounded-md border border-[var(--leaf)] bg-[var(--water)] px-5 py-3 text-sm font-semibold text-[var(--leaf-dark)] transition enabled:hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {cameraState === "scanning" ? "Camera on" : "Start camera"}
          </button>
          {cameraState === "scanning" ? (
            <>
              <button
                type="button"
                onClick={captureCameraFrame}
                disabled={Boolean(imageScanMessage)}
                className="rounded-md bg-[var(--leaf)] px-5 py-3 text-sm font-semibold text-white transition enabled:hover:bg-[var(--leaf-dark)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Capture card
              </button>
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
            </>
          ) : null}
        </div>

        {cameraState === "scanning" ? (
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
            Hold the prompt text in view, then tap Capture card.
          </p>
        ) : null}
        {cameraState === "secure-required" ? (
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
            Camera access needs a secure connection. Open this page over HTTPS,
            or use the card ID field below while testing locally.
          </p>
        ) : null}
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
        {imageScanError ? (
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
            {imageScanError}
          </p>
        ) : null}
        {imageScanMessage ? (
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
            {imageScanMessage}
          </p>
        ) : null}
        {lastOcrText ? (
          <div className="mt-3 rounded-md border border-[var(--line)] bg-[var(--paper)] p-3 text-xs leading-5 text-[var(--muted)]">
            <p className="font-semibold text-[var(--leaf)]">OCR read</p>
            <p>{lastOcrText.trim().slice(0, 220)}</p>
          </div>
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
            {manualMatch.category ? ` / ${manualMatch.category}` : ""}
          </p>
          <p className="mt-2 text-lg leading-7 font-semibold text-[var(--leaf-dark)]">
            {manualMatch.prompt}
          </p>
        </Link>
      ) : null}
    </div>
  );
}

async function decodeImageFile(
  file: File,
  canvas: HTMLCanvasElement | null,
  cards: ReflectionCard[],
  deckId: string,
  onProgress: (message: string) => void
) {
  const detectedCardId = await scanImageFileWithBarcodeDetector(file, cards);

  if (detectedCardId) {
    return detectedCardId;
  }

  return new Promise<string | null>((resolve) => {
    if (!canvas) {
      resolve(null);
      return;
    }

    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);

      const width = image.naturalWidth;
      const height = image.naturalHeight;

      canvas.width = width;
      canvas.height = height;

      const context = canvas.getContext("2d", { willReadFrequently: true });

      if (!context) {
        resolve(null);
        return;
      }

      context.drawImage(image, 0, 0, width, height);

      const qrCardId = scanCanvasForQr(canvas, cards);

      if (qrCardId) {
        resolve(qrCardId);
        return;
      }

      onProgress("No QR found. Reading prompt text...");
      recognizeCardWithApi(canvas, deckId, onProgress).then(resolve);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(null);
    };

    image.src = objectUrl;
  });
}

async function recognizeFileWithApi(
  file: File,
  deckId: string,
  onProgress: (message: string) => void
) {
  onProgress("Uploading card photo for text recognition...");

  const formData = new FormData();
  formData.set("deckId", deckId);
  formData.set("image", file, file.name || "card-photo.jpg");

  try {
    const response = await fetch("/api/card-recognition", {
      method: "POST",
      body: formData
    });
    const result = (await response.json()) as {
      cardId?: string | null;
      error?: string;
      ocrText?: string;
    };

    if (!response.ok) {
      onProgress(result.error ?? "OCR could not read the image.");
      return {
        cardId: null,
        ocrText: result.ocrText ?? null
      };
    }

    onProgress("Matching the card prompt...");

    return {
      cardId: result.cardId ?? null,
      ocrText: result.ocrText ?? null
    };
  } catch {
    onProgress("OCR request failed. Trying local image fallback...");

    return {
      cardId: null,
      ocrText: null
    };
  }
}

async function scanImageFileWithBarcodeDetector(
  file: File,
  cards: ReflectionCard[]
) {
  const BarcodeDetectorClass = getBarcodeDetector();

  if (!BarcodeDetectorClass || !("createImageBitmap" in window)) {
    return null;
  }

  let bitmap: ImageBitmap | null = null;

  try {
    bitmap = await createImageBitmap(file);
    const detector = new BarcodeDetectorClass({
      formats: ["qr_code"]
    });
    const codes = await detector.detect(bitmap);

    return (
      codes.map((code) => parseCardId(code.rawValue, cards)).find(Boolean) ??
      null
    );
  } catch {
    return null;
  } finally {
    bitmap?.close();
  }
}

async function scanWithBarcodeDetector(
  detector: BarcodeDetectorShape,
  video: HTMLVideoElement,
  cards: ReflectionCard[]
) {
  const codes = await detector.detect(video);

  return (
    codes.map((code) => parseCardId(code.rawValue, cards)).find(Boolean) ?? null
  );
}

function scanWithCanvas(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement | null,
  cards: ReflectionCard[]
) {
  if (!canvas || video.readyState < video.HAVE_CURRENT_DATA) {
    return null;
  }

  const width = video.videoWidth;
  const height = video.videoHeight;

  if (!width || !height) {
    return null;
  }

  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d", { willReadFrequently: true });

  if (!context) {
    return null;
  }

  context.drawImage(video, 0, 0, width, height);

  return scanCanvasForQr(canvas, cards);
}

function scanCanvasForQr(
  canvas: HTMLCanvasElement,
  cards: ReflectionCard[]
) {
  const context = canvas.getContext("2d", { willReadFrequently: true });

  if (!context) {
    return null;
  }

  const scanSizes = [
    { width: canvas.width, height: canvas.height },
    getScaledSize(canvas.width, canvas.height, 2200),
    getScaledSize(canvas.width, canvas.height, 1400),
    getScaledSize(canvas.width, canvas.height, 900)
  ].filter((size, index, sizes) => {
    return (
      size.width > 0 &&
      size.height > 0 &&
      sizes.findIndex(
        (candidate) =>
          candidate.width === size.width && candidate.height === size.height
      ) === index
    );
  });

  for (const size of scanSizes) {
    if (size.width === canvas.width && size.height === canvas.height) {
      const imageData = context.getImageData(0, 0, size.width, size.height);
      const code = jsQR(imageData.data, size.width, size.height, {
        inversionAttempts: "attemptBoth"
      });

      if (code) {
        return parseCardId(code.data, cards);
      }

      continue;
    }

    const snapshot = document.createElement("canvas");
    snapshot.width = size.width;
    snapshot.height = size.height;

    const snapshotContext = snapshot.getContext("2d", {
      willReadFrequently: true
    });

    if (!snapshotContext) {
      continue;
    }

    snapshotContext.drawImage(canvas, 0, 0, size.width, size.height);
    const imageData = snapshotContext.getImageData(
      0,
      0,
      size.width,
      size.height
    );
    const code = jsQR(imageData.data, size.width, size.height, {
      inversionAttempts: "attemptBoth"
    });

    if (code) {
      return parseCardId(code.data, cards);
    }
  }

  return null;
}

function getScaledSize(width: number, height: number, maxDimension: number) {
  const scale = Math.min(1, maxDimension / Math.max(width, height));

  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale))
  };
}

async function recognizeCardWithApi(
  canvas: HTMLCanvasElement,
  deckId: string,
  onProgress: (message: string) => void
) {
  const result = await recognizeCanvasWithApi(canvas, deckId, onProgress);

  return result.cardId;
}

async function recognizeCanvasWithApi(
  canvas: HTMLCanvasElement,
  deckId: string,
  onProgress: (message: string) => void
) {
  const image = await canvasToJpegBlob(canvas);

  if (!image) {
    return {
      cardId: null,
      ocrText: null
    };
  }

  onProgress("Uploading card photo for text recognition...");

  const formData = new FormData();
  formData.set("deckId", deckId);
  formData.set("image", image, "card-photo.jpg");

  const response = await fetch("/api/card-recognition", {
    method: "POST",
    body: formData
  });

  const result = (await response.json()) as {
    cardId?: string | null;
    ocrText?: string;
  };

  if (!response.ok) {
    return {
      cardId: null,
      ocrText: result.ocrText ?? null
    };
  }

  onProgress("Matching the card prompt...");

  return {
    cardId: result.cardId ?? null,
    ocrText: result.ocrText ?? null
  };
}

function canvasToJpegBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob(
      (blob) => {
        resolve(blob);
      },
      "image/jpeg",
      0.92
    );
  });
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

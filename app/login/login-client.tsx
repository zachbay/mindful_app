"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import BayWelLogo from "../components/baywel-logo";
import {
  canEnableMemory,
  createConsentRecord,
  createLocalAuthSession,
  type AuthProvider
} from "../../lib/security-flow";

type LoginClientProps = {
  redirectTo: string;
};

type ConsentState = {
  allowAiProcessing: boolean;
  enablePersonalization: boolean;
  saveReflections: boolean;
  useAnonymizedInsights: boolean;
};

const defaultConsent: ConsentState = {
  allowAiProcessing: true,
  enablePersonalization: true,
  saveReflections: true,
  useAnonymizedInsights: false
};

export default function LoginClient({ redirectTo }: LoginClientProps) {
  const router = useRouter();
  const [consent, setConsent] = useState<ConsentState>(defaultConsent);
  const [email, setEmail] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  function updateConsent(option: keyof ConsentState) {
    setConsent((currentConsent) => ({
      ...currentConsent,
      [option]: !currentConsent[option]
    }));
  }

  function completeLogin(provider: AuthProvider) {
    const nowIso = new Date().toISOString();
    const consentRecord = createConsentRecord(
      {
        allow_ai_processing: consent.allowAiProcessing,
        enable_personalization: consent.enablePersonalization,
        save_reflections: consent.saveReflections,
        use_anonymized_insights: consent.useAnonymizedInsights
      },
      nowIso
    );

    if (!canEnableMemory(consentRecord)) {
      setStatusMessage(
        "Saving reflections needs reflection storage and AI memory consent."
      );
      return;
    }

    localStorage.setItem(
      "baywel-auth-session",
      JSON.stringify(
        createLocalAuthSession({
          email,
          provider,
          timestamp: nowIso
        })
      )
    );
    localStorage.setItem("baywel-consent-record", JSON.stringify(consentRecord));
    localStorage.setItem("baywel-memory-enabled", "true");
    localStorage.setItem(
      "baywel-memory-options",
      JSON.stringify({
        anonymizedInsights: consent.useAnonymizedInsights,
        personalization: consent.enablePersonalization,
        saveReflections: consent.saveReflections
      })
    );

    router.push(redirectTo);
  }

  return (
    <main className="min-h-screen bg-[#fffdf1] px-4 py-5 text-[#28333b] sm:px-6">
      <section className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <aside className="border-2 border-[#28333b] bg-[#fffdf1] p-5 sm:p-6">
          <BayWelLogo />
          <div className="mt-10 rounded-[22px] border-2 border-[#28333b] bg-[#dc8b3a] p-4">
            <div className="rounded-[18px] border-2 border-[#28333b] bg-[#fffdf1] p-6">
              <p className="text-xs font-semibold tracking-[0.18em] uppercase">
                Secure memory
              </p>
              <h1 className="mt-6 text-4xl leading-tight font-semibold">
                Remember reflections only with your consent.
              </h1>
              <p className="mt-6 text-sm leading-6 text-[#46545a]">
                Create a lightweight account after reflection has already become
                useful. No passwords are part of this flow.
              </p>
            </div>
          </div>
        </aside>

        <section className="grid content-start gap-4">
          <div className="border-2 border-[#28333b] bg-[#fffdf1] p-5 sm:p-6">
            <p className="text-sm font-semibold text-[#366779]">
              Step 1
            </p>
            <h2 className="mt-1 text-2xl font-semibold">
              Choose a sign-in method.
            </h2>
            <div className="mt-5 grid gap-3">
              <button
                type="button"
                onClick={() => completeLogin("apple")}
                className="rounded-md border-2 border-[#28333b] px-5 py-3 text-left text-sm font-semibold transition hover:bg-[#fff9d9]"
              >
                Continue with Apple
              </button>
              <button
                type="button"
                onClick={() => completeLogin("google")}
                className="rounded-md border-2 border-[#28333b] px-5 py-3 text-left text-sm font-semibold transition hover:bg-[#fff9d9]"
              >
                Continue with Google
              </button>
              <div className="grid gap-2 rounded-md border-2 border-[#28333b] p-4">
                <label className="grid gap-2 text-sm font-semibold">
                  Email magic link
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    className="rounded-md border-2 border-[#28333b] bg-white px-4 py-3 font-normal"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => completeLogin("email")}
                  className="rounded-md bg-[#f6d73b] px-5 py-3 text-sm font-semibold transition hover:bg-[#fff9d9]"
                >
                  Continue with Email Magic Link
                </button>
              </div>
            </div>
            {statusMessage ? (
              <p className="mt-4 rounded-md border-2 border-[#28333b] bg-[#f6d73b] p-3 text-sm">
                {statusMessage}
              </p>
            ) : null}
          </div>

          <div className="border-2 border-[#28333b] bg-[#fffdf1] p-5 sm:p-6">
            <p className="text-sm font-semibold text-[#366779]">
              Step 2
            </p>
            <h2 className="mt-1 text-2xl font-semibold">
              Confirm memory permissions.
            </h2>
            <div className="mt-5 grid gap-3">
              <ConsentOption
                checked={consent.saveReflections}
                description="Store reflection summaries and themes for your journey."
                label="Save reflections"
                onChange={() => updateConsent("saveReflections")}
              />
              <ConsentOption
                checked={consent.allowAiProcessing}
                description="Use saved summaries and themes for AI-assisted memory."
                label="Enable AI memory"
                onChange={() => updateConsent("allowAiProcessing")}
              />
              <ConsentOption
                checked={consent.enablePersonalization}
                description="Use recurring themes to suggest more relevant cards."
                label="Personalize reflection journeys"
                onChange={() => updateConsent("enablePersonalization")}
              />
              <ConsentOption
                checked={consent.useAnonymizedInsights}
                description="Help improve card resonance without sharing raw reflections."
                label="Share anonymized product insights"
                onChange={() => updateConsent("useAnonymizedInsights")}
              />
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}

function ConsentOption({
  checked,
  description,
  label,
  onChange
}: {
  checked: boolean;
  description: string;
  label: string;
  onChange: () => void;
}) {
  return (
    <label className="flex items-start gap-3 rounded-md border-2 border-[#28333b] bg-white p-4">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="mt-1 h-4 w-4 accent-[#366779]"
      />
      <span>
        <span className="block text-sm font-semibold">{label}</span>
        <span className="mt-1 block text-sm leading-6 text-[#46545a]">
          {description}
        </span>
      </span>
    </label>
  );
}

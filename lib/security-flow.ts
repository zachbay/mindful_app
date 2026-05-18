export type AuthProvider = "apple" | "email" | "google";

export type ConsentRecord = {
  allow_ai_processing: boolean;
  consent_version: "1.0";
  enable_personalization: boolean;
  save_reflections: boolean;
  timestamp: string;
  use_anonymized_insights: boolean;
};

export type LocalAuthSession = {
  createdAt: string;
  email?: string;
  provider: AuthProvider;
  sessionKind: "local-prototype";
};

export function createConsentRecord(
  input: Omit<ConsentRecord, "consent_version" | "timestamp">,
  timestamp: string
): ConsentRecord {
  return {
    ...input,
    consent_version: "1.0",
    timestamp
  };
}

export function createLocalAuthSession(input: {
  email?: string;
  provider: AuthProvider;
  timestamp: string;
}): LocalAuthSession {
  return {
    createdAt: input.timestamp,
    email: input.email?.trim() || undefined,
    provider: input.provider,
    sessionKind: "local-prototype"
  };
}

export function canEnableMemory(consent: ConsentRecord) {
  return consent.save_reflections && consent.allow_ai_processing;
}

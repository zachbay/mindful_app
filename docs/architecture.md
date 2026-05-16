# Architecture

# BayWel Architecture

# System Overview

BayWel combines:
1. Physical mindfulness cards
2. Mobile web reflection flows
3. AI-assisted reflection analysis
4. Optional longitudinal memory
5. Privacy-first insight storage

The physical experience remains primary.

---

# Core Workflow

Physical Card
→ QR Scan
→ Reflection Session
→ Optional AI Guidance
→ Optional Memory Opt-In
→ Structured Insight Generation
→ Longitudinal Reflection Tracking

---

# Frontend Architecture

## Initial Platform
Mobile-first web application.

Reasons:
- frictionless access
- no app install
- QR-friendly
- creator-shareable
- rapid iteration

---

# Frontend Stack

- Next.js
- TypeScript
- Tailwind
- Vercel deployment

---

# Backend Stack

- Supabase
- Postgres
- Row Level Security (RLS)
- Edge Functions later if needed

---

# Authentication

## Supported Methods
- Apple Sign-In
- Google Sign-In
- Email magic link

Avoid:
- passwords
- complicated onboarding

Authentication should only appear after user value is established.

---

# QR System

Each deck contains one QR code:
-deck ID
- optional campaign metadata

Example Route:
`/r/mindful-work`

Mobile Workflow:

QR routes should load camera on mobile to read the current card

Camera reads card and loads the prompt refection pages.
-card ID
-optional campaign metadata

Each card contains:
- deck ID
- card ID
- optional campaign metadata

Example route:
`/r/mindful-work/mw-017`

Desktop Workflow:

QR loads card selection screen:

User prompted to type in prompt to quickly find the card in the deck:

User selects card

Each card contains:
- deck ID
- card ID
- optional campaign metadata

Example route:
`/r/mindful-work/mw-017`

No splash screens.

---

# Reflection Session Flow

## Anonymous Phase
Users may:
- reflect anonymously
- complete sessions
- use AI guidance
- leave without creating accounts

Anonymous data collected:
- session starts
- session completion
- interaction type
- anonymous engagement metrics

No personally identifiable information required.

---

# Opt-In Memory Layer

After repeated engagement:
Prompt user:

"Would you like BayWel to remember your reflections over time?"

If accepted:
- create account
- collect consent
- begin longitudinal memory

---

# Reflection Storage Model

## Separate Raw Reflections From Insights

### Raw Reflection
Potentially sensitive.

Examples:
- text
- voice
- journaling

Should be:
- encrypted
- deletable
- user-owned

---

## Structured Insights
Derived metadata.

Examples:
- themes
- emotional tone
- session depth
- category mapping

This layer powers:
- personalization
- recommendations
- analytics
- product intelligence

---

# AI Layer

## AI Responsibilities
- summarize reflections
- identify themes
- detect recurring patterns
- suggest next reflection directions

The AI should remain:
- lightweight
- emotionally intelligent
- non-clinical

---

# AI Restrictions

The AI must NOT:
- diagnose
- provide medical advice
- claim therapeutic outcomes
- simulate licensed therapy

---

# Memory Architecture

The AI memory layer should retrieve:
- prior themes
- recurring categories
- longitudinal trends
- previous summaries

Avoid large raw conversation retrieval when possible.

Use:
- summaries
- embeddings later
- compressed memory objects

---

# Analytics Layer

## User Analytics
- reflection frequency
- recurring themes
- emotional trend shifts
- card engagement

---

## Product Analytics
- card resonance
- deck performance
- creator campaign performance
- repeat engagement
- completion rates

---

# Security

- encrypted reflection storage
- RLS enforcement
- strict consent model
- user deletion support
- minimal data retention

---

# Long-Term Extensibility

Potential future integrations:
- voice reflections
- AI voice companion
- wearable-triggered reflections
- creator reflection channels
- family reflection spaces
- enterprise wellness analytics

All future systems must preserve:
- low friction
- calm UX
- trust
- privacy

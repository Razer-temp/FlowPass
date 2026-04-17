<![CDATA[<div align="center">

# 🎫 FlowPass

### Smart Staggered Exit System

A real-time, AI-powered crowd management platform that replaces dangerous stampede-prone crowd exits with intelligent, wave-based dispersal — zero installs, zero logins, zero friction.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-Realtime-3FCF8E?logo=supabase&logoColor=white)](https://supabase.com/)
[![Gemini](https://img.shields.io/badge/Gemini_2.0-Flash-4285F4?logo=google&logoColor=white)](https://ai.google.dev/)
[![Tests](https://img.shields.io/badge/Tests-49_passing-22C55E?logo=vitest&logoColor=white)](#-testing)
[![Cloud Run](https://img.shields.io/badge/Cloud_Run-Deployed-4285F4?logo=googlecloud&logoColor=white)](https://cloud.google.com/run)

</div>

---

## 📋 Table of Contents

- [Chosen Vertical](#-chosen-vertical)
- [The Problem](#-the-problem)
- [Approach & Logic](#-approach--logic)
- [How It Works](#-how-it-works)
- [Tech Stack](#-tech-stack)
- [Google Services Integration](#-google-services-integration)
- [Architecture](#-architecture)
- [Key Features](#-key-features)
- [Security](#-security)
- [Accessibility](#-accessibility)
- [Testing](#-testing)
- [Running Locally](#-running-locally)
- [Deployment](#-deployment)
- [Environment Variables](#-environment-variables)
- [Assumptions Made](#-assumptions-made)
- [License](#-license)

---

## 🎯 Chosen Vertical

**Event Safety & Crowd Management** — specifically, the problem of safely exiting 10,000–50,000+ people from stadiums, arenas, and large venues after events end.

---

## 🔴 The Problem

When a major event ends, everyone rushes for the exit at once. This leads to:

- **Crowd crushes** that injure or kill (Itaewon 2022, Astroworld 2021)
- **Bottleneck stampedes** at narrow exit points
- **Zero visibility** for organizers on real-time crowd density
- **No communication channel** between staff and attendees

FlowPass solves this by giving every attendee a **live digital pass** that tells them exactly **when** to leave and **which gate** to use — while giving organizers a real-time command center powered by AI.

---

## 💡 Approach & Logic

FlowPass divides a venue into **zones** and schedules **staggered exit waves** with calculated gaps between each zone. A smart algorithm considers:

| Factor | How It's Used |
|--------|---------------|
| **Total crowd size** | More people → larger time gaps between zone releases |
| **Number of exit gates** | More gates → faster per-zone throughput |
| **Gate load balancing** | Distributes zones across gates to prevent bottlenecks |
| **Dynamic adjustments** | Organizers can pause, hold, unlock, or reassign zones in real-time |

### The Smart Algorithm

```
Per-Zone Gap = ⌈ peoplePerZone / (gatesPerZone × 500 people/min) ⌉

Clamped to:  8 min ≤ gap ≤ 20 min  (safety guardrails)
```

Each zone unlocks **sequentially**: Zone A opens first (immediate GO), Zone B opens after one gap, Zone C after two gaps, and so on — ensuring controlled dispersal instead of chaos.

### Intelligent Seat-to-Zone Assignment

When attendees register, a **4-stage pipeline** maps their seat to the optimal zone:

1. **Regex extraction** — Detects stand / block / section identifiers (e.g., `Stand A, Row 5, Seat 12`)
2. **Direct mapping** — Maps alphabetical (`A → Zone A`) or numeric identifiers
3. **Fuzzy matching** — Uses Levenshtein distance for typo tolerance (>70% similarity threshold)
4. **Load balancing fallback** — Assigns to the least-populated non-VIP zone

---

## 🔁 How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│  ORGANIZER creates event → System generates unique URLs:        │
│    → /organizer/:eventId     (real-time command dashboard)      │
│    → /screen/:eventId        (venue big-screen display)         │
│    → /register/:eventId      (attendee self-registration)       │
│    → /gate/:eventId/:gateId  (gate staff validation)            │
├─────────────────────────────────────────────────────────────────┤
│  ATTENDEES scan QR / open link → register → get /pass/:passId   │
│  Their pass shows: zone, gate, countdown, live status            │
├─────────────────────────────────────────────────────────────────┤
│  GATE STAFF open their assigned gate URL on any phone            │
│  They scan QR codes to validate passes + report gate status      │
├─────────────────────────────────────────────────────────────────┤
│  ORGANIZER activates "Exit Mode" on dashboard                    │
│                                                                  │
│  Zone A unlocks → Zone A passes flip 🟢 GO NOW                  │
│  Zone B unlocks after gap → Zone B passes flip 🟢               │
│  ...until all zones clear → event marked complete ✅             │
└─────────────────────────────────────────────────────────────────┘
```

**Every interface updates in real-time** via Supabase Realtime (WebSocket) with automatic polling fallback.

---

## 🛠 Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 19 + TypeScript 5.8 + Vite 6 | SPA with strict type safety |
| **Styling** | Tailwind CSS 4 | Utility-first responsive design |
| **Animation** | Motion (Framer Motion) | Smooth micro-interactions & page transitions |
| **Database** | Supabase (Postgres + Realtime) | Persistent storage + WebSocket subscriptions |
| **AI / LLM** | Google Gemini 2.0 Flash (`@google/genai`) | Crowd safety analysis & smart announcements |
| **Analytics** | Google Analytics 4 (`gtag.js`) | Behavioral tracking & event metrics |
| **Accessibility** | Google Translate Widget | Real-time multi-language translation |
| **Typography** | Google Fonts (Syne, DM Sans, JetBrains Mono, Bebas Neue) | Premium typographic hierarchy |
| **Charts** | Recharts | Network load visualization in SuperAdmin HQ |
| **QR Codes** | qrcode.react + html5-qrcode | Pass generation & camera-based scanning |
| **Routing** | React Router v7 | Client-side SPA routing with 9 routes |
| **Deployment** | Google Cloud Run (Docker + nginx) | Auto-scaling containerized deployment |
| **Testing** | Vitest | 49 unit tests across 5 test suites |

---

## ☁️ Google Services Integration

FlowPass is built **Google-native**, leveraging 5 Google services for enterprise-grade reliability on the free tier:

### 1. 🤖 Google Gemini AI — Core Intelligence

- **AI Crowd Advisor** (`AIAdvisorPanel.tsx`) — Analyzes live zone flow, gate statuses, and crowd density to produce real-time safety scores (1–100) with actionable risk assessments
- **Smart Announcement Generation** (`AnnouncementComposer.tsx`) — Crafts context-aware PA announcements based on current event state (active zones, blocked gates, exit progress)
- **Graceful degradation** — Falls back to rule-based heuristics when API key is unavailable or rate-limited

### 2. 📊 Google Analytics 4 — Behavioral Telemetry

Deep client-side event tracking across the entire application lifecycle:
- `event_created` · `pass_registered` · `pass_scanned` · `zone_activated`
- `gate_status_updated` · `announcement_sent` · `exit_mode_activated`
- Page view tracking on every route transition

### 3. 🌐 Google Translate — International Crowds

Native Google Translate widget integration on `BigScreen` and `PassView` pages, allowing international attendees to read live exit instructions in their native language — critical for international sporting events and concerts.

### 4. ☁️ Google Cloud Run — Serverless Deployment

The application is containerized via a multi-stage `Dockerfile` (Node.js build → nginx serve) and deployed automatically through Cloud Build. Cloud Run provides:
- **Auto-scaling** to handle sudden spikes when thousands of attendees open their passes simultaneously
- **Zero cold-start** for the nginx container
- **HTTPS by default** with Google-managed TLS certificates

### 5. 🔤 Google Fonts — Premium Typography

Four carefully selected typefaces create a strong visual hierarchy:
- **Syne** — Headings (bold, modern, commanding)
- **DM Sans** — Body text (clean, readable)
- **JetBrains Mono** — Code, countdowns, timestamps
- **Bebas Neue** — Hero/display text (impactful)

---

## 🏗 Architecture

```
FlowPass/
├── src/
│   ├── App.tsx                         # Router (9 routes) + GA page tracking
│   ├── main.tsx                        # React 19 entry point
│   ├── index.css                       # Tailwind CSS + design tokens
│   │
│   ├── components/
│   │   ├── dashboard/                  # ── Organizer Dashboard ──────────
│   │   │   ├── AIAdvisorPanel.tsx      #   Gemini-powered crowd safety advisor
│   │   │   ├── StatsRow.tsx            #   Live stats (total, exited, remaining, chaos score)
│   │   │   ├── ZoneCard.tsx            #   Per-zone controls (hold/resume/unlock/edit time)
│   │   │   ├── GatePanel.tsx           #   Gate status + smart reassignment engine
│   │   │   ├── ActivityLog.tsx         #   Timeline log with CSV export
│   │   │   └── AnnouncementComposer.tsx#   AI-assisted broadcast messaging
│   │   │
│   │   ├── landing/                    # ── Marketing Landing Page ────────
│   │   │   ├── ChaosVsCalm.tsx         #   Before/after comparison animation
│   │   │   ├── GlassCard.tsx           #   Glassmorphism feature cards
│   │   │   ├── RolesSwitcher.tsx       #   Interactive role demo (Attendee/Staff/Organizer)
│   │   │   └── ScrollTimeline.tsx      #   Scroll-driven "How It Works" animation
│   │   │
│   │   ├── pass/                       # ── Pass & Gate Components ────────
│   │   │   ├── LivePassCard.tsx        #   Real-time updating attendee pass with QR
│   │   │   ├── AnnouncementFeed.tsx    #   Live announcement ticker
│   │   │   ├── GateStatus.tsx          #   Gate status indicator badges
│   │   │   └── HoldToConfirmButton.tsx #   Long-press confirmation for critical actions
│   │   │
│   │   ├── ui/                         # ── Reusable UI Components ────────
│   │   │   ├── DatePicker.tsx          #   Custom accessible date picker
│   │   │   └── TimePicker.tsx          #   Custom accessible time picker
│   │   │
│   │   ├── ErrorBoundary.tsx           # Global error boundary (crash recovery)
│   │   ├── GoogleTranslate.tsx         # Google Translate widget integration
│   │   ├── Navbar.tsx                  # App navigation
│   │   ├── Footer.tsx                  # App footer
│   │   ├── PassCard.tsx                # Static registration pass preview
│   │   ├── QrScanner.tsx               # Camera-based QR code scanner
│   │   └── ScrollToTop.tsx             # Route-change scroll reset
│   │
│   ├── pages/
│   │   ├── LandingPage.tsx             # Marketing page with role demos
│   │   ├── CreateEvent.tsx             # 3-step event creation wizard
│   │   ├── OrganizerDashboard.tsx      # Real-time organizer command center
│   │   ├── BigScreen.tsx               # Venue display (fullscreen, cursor-hidden)
│   │   ├── AttendeeRegistration.tsx    # Attendee self-registration form
│   │   ├── PassView.tsx                # Live pass with countdown + QR
│   │   ├── GateStaffView.tsx           # Gate validation + QR scanning interface
│   │   ├── EventSelector.tsx           # Multi-event picker for attendees
│   │   └── SuperAdminHQ.tsx            # Global command center (all events)
│   │
│   ├── lib/
│   │   ├── zoneAlgorithm.ts            # Core staggered exit algorithm
│   │   ├── gemini.ts                   # Google Gemini AI integration
│   │   ├── analytics.ts               # Google Analytics 4 typed wrapper
│   │   ├── sanitize.ts                # Input sanitization (XSS prevention)
│   │   ├── constants.ts               # Centralized magic numbers & config
│   │   ├── supabase.ts                # Supabase client initialization
│   │   └── seedData.ts                # Test data seeder utility
│   │
│   ├── hooks/
│   │   ├── useWakeLock.ts              # Prevents screen sleep (pass/gate views)
│   │   └── useIsMobile.ts             # Responsive breakpoint detection
│   │
│   └── types/
│       └── index.ts                    # Centralized TypeScript interfaces (0 `any` types)
│
├── tests/
│   ├── zoneAlgorithm.test.js           # 10 tests — gap calc, scheduling, seat assignment
│   ├── sanitize.test.js               # 17 tests — XSS prevention, input validation
│   ├── gemini.test.js                 #  8 tests — AI analysis, announcements, fallbacks
│   ├── gateAssignment.test.js         #  8 tests — gate validation, smart reassignment
│   └── passStatus.test.js            #  6 tests — pass lifecycle, countdown, QR greyout
│
├── Dockerfile                          # Multi-stage build (Node → nginx)
├── nginx.conf                          # Security headers + SPA routing + gzip
├── cloudbuild.yaml                    # Google Cloud Build CI/CD pipeline
├── vite.config.ts                     # Vite + Tailwind CSS + React plugin
└── tsconfig.json                      # Strict TypeScript (noUnusedLocals, noUnusedParams)
```

---

## ✨ Key Features

### For Organizers
- **3-step event creation wizard** with live schedule preview, gate load visualization, and intelligent zone configuration
- **Real-time command dashboard** with zone controls (hold / resume / unlock / edit time), gate status management, and activity log with CSV export
- **AI Crowd Advisor** — Gemini-powered safety scoring with risk detection and actionable recommendations (refreshed every 30 seconds)
- **Smart Announcements** — AI-generated context-aware PA messages + manual broadcast capability
- **Smart Gate Reassignment** — When a gate is blocked, the system automatically suggests alternate gates and notifies affected attendees
- **Ghost Protocol** — When an event ends, all attendee PII (names, phones, passes) is permanently purged from the database

### For Attendees
- **Zero-install, zero-login** — Open a URL, register, get a live pass. No app download, no account creation
- **Live Pass** with real-time zone status, countdown timer, assigned gate, and QR code for scanning
- **Wake Lock** — Screen stays on while pass is visible (critical for gate scanning)
- **Google Translate** — Read instructions in your native language

### For Gate Staff
- **QR Scanner** — Camera-based pass validation with instant feedback (VALID / USED / WRONG GATE / ZONE NOT OPEN)
- **Override capability** — Staff can override validation for edge cases (logged for audit)
- **Shift stats** — Tracks checked, valid, invalid, overrides per shift
- **Hold-to-confirm** — Critical actions require long-press to prevent accidental triggers
- **Offline detection** — Visual warning when network connectivity drops

### For Venue Big Screens
- **Fullscreen display** — Cursor-hidden, zero-chrome interface designed for large venue screens
- **Live zone countdown** — Shows which zones are active and time until next zone opens
- **Announcement ticker** — Real-time broadcast messages from the organizer
- **Google Translate** — Multi-language support for international events

---

## 🔒 Security

FlowPass implements **defense-in-depth** security across four layers:

### Layer 1: Database Security (Supabase)
| Measure | Detail |
|---------|--------|
| **Row Level Security (RLS)** | Enabled on all 5 tables — the anon key can only perform RLS-allowed operations |
| **UUID-based IDs** | Prevents sequential enumeration attacks on passes and events |
| **Anon key only** | No admin/service key is ever exposed to the client bundle |

### Layer 2: Input Sanitization (`src/lib/sanitize.ts`)
| Sanitizer | Protection |
|-----------|------------|
| `sanitizeText()` | Strips HTML tags, dangerous protocols (`javascript:`, `data:`, `vbscript:`, `blob:`, `file:`), event handlers (`onclick=`, `onerror=`), HTML comments, CSS comments |
| `sanitizeName()` | Unicode letter allowlist + 50-char limit |
| `sanitizeSeat()` | Alphanumeric allowlist + 50-char limit |
| `sanitizeEventField()` | Alphanumeric + common punctuation + 100-char limit |
| `sanitizePin()` | Alphanumeric + hyphen only, 4–10 chars, auto-uppercase |
| `sanitizeMessage()` | General sanitization + 160-char SMS-style limit |
| `isValidUUID()` | Strict UUID v4 regex validation for all URL parameters |

### Layer 3: Application Security
- **Rate limiting** — 5-second cooldown between form submissions to prevent spam/abuse
- **Duplicate pass prevention** — Checks if a seat is already registered before creating a new pass
- **Ghost Protocol** — When an event ends, all attendee PII is permanently purged
- **No API keys in client bundle** — `vite.config.ts` explicitly sets `define: {}` to prevent key injection

### Layer 4: Infrastructure Security (`nginx.conf`)
| Header | Value | Protection |
|--------|-------|------------|
| `Content-Security-Policy` | Restrictive allowlist (self + Supabase + Google) | Prevents unauthorized script/resource loading |
| `X-Frame-Options` | `DENY` | Prevents clickjacking via iframe embedding |
| `X-Content-Type-Options` | `nosniff` | Prevents MIME type sniffing attacks |
| `X-XSS-Protection` | `1; mode=block` | Enables browser-level XSS filter |
| `Permissions-Policy` | Blocks microphone, geolocation, payment | Restricts unused browser APIs |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Controls information leakage |
| `X-Robots-Tag` | `noarchive` | Prevents search engines from caching sensitive event data |
| Dotfile blocking | `location ~ /\.` → `404` | Protects `.env`, `.git` from access |

---

## ♿ Accessibility

FlowPass is designed to be usable by everyone, including attendees with disabilities in high-stress crowd situations:

| Feature | Implementation |
|---------|---------------|
| **ARIA labels** | `aria-label` on all interactive buttons, form fields, and navigation elements |
| **Required fields** | `aria-required` and `aria-invalid` on all required inputs |
| **Error linking** | `aria-describedby` connects error messages to their respective inputs |
| **Live regions** | `aria-live` regions for dynamic status updates (zone changes, countdowns) |
| **Alert roles** | `role="alert"` for error messages and critical notifications |
| **Touch targets** | ≥ 44×44px on all interactive elements (Gate Staff interface optimized for gloved hands) |
| **Keyboard navigation** | All interactive elements are keyboard-accessible |
| **Color contrast** | High-contrast color palette (light text on dark backgrounds) |
| **Multi-language** | Google Translate integration for international crowds |
| **Screen wake** | `useWakeLock` hook prevents screen sleep during pass display and gate scanning |

---

## 🧪 Testing

**49 unit tests** across 5 test suites, covering critical safety-path logic:

```bash
npm test
```

| Test Suite | Tests | Coverage |
|-----------|-------|----------|
| `zoneAlgorithm.test.js` | 10 | Gap calculation, schedule generation, seat-to-zone assignment (regex, fuzzy, load balancing) |
| `sanitize.test.js` | 17 | XSS prevention, HTML stripping, protocol blocking, UUID validation, field-specific sanitizers |
| `gemini.test.js` | 8 | AI crowd analysis, announcement generation, fallback behavior, safety scoring |
| `gateAssignment.test.js` | 8 | Pass validation, smart gate reassignment, wrong-gate detection, override logging |
| `passStatus.test.js` | 6 | Pass lifecycle states, countdown triggers, QR greyout behavior, gate reassignment alerts |

> **Note:** Gemini tests validate offline/fallback behavior and do not require a live API key.

---

## 🚀 Running Locally

### Prerequisites
- **Node.js** ≥ 18
- **npm** ≥ 9
- A [Supabase](https://supabase.com/) project (free tier works)
- A [Google Gemini API Key](https://ai.google.dev/) (optional — AI features degrade gracefully)

### Setup

```bash
# 1. Clone the repository
git clone https://github.com/rehmanmusharaf/FlowPass.git
cd FlowPass

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env
# Edit .env with your Supabase URL, anon key, and (optionally) Gemini API key

# 4. Start the development server
npm run dev
# → Opens at http://localhost:3000

# 5. Run tests
npm test

# 6. Type-check (no emit)
npm run lint

# 7. Build for production
npm run build
```

### Available Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `vite --port=3000 --host=0.0.0.0` | Start dev server with HMR |
| `build` | `vite build` | Production build to `dist/` |
| `preview` | `vite preview` | Preview production build locally |
| `test` | `vitest run` | Run all 49 unit tests |
| `lint` | `tsc --noEmit` | TypeScript type-checking (strict mode) |
| `clean` | `rm -rf dist` | Remove build artifacts |

---

## ☁️ Deployment

### Google Cloud Run (Production)

The project includes a multi-stage `Dockerfile` and `cloudbuild.yaml` for fully automated CI/CD:

```bash
# One-command deploy via Cloud Build
gcloud builds submit --config cloudbuild.yaml
```

**What happens:**
1. **Stage 1 (Build):** Node.js 20 installs dependencies and runs `vite build`
2. **Stage 2 (Serve):** nginx Alpine serves the static bundle with security headers
3. **Deploy:** Cloud Run deploys the container with auto-scaling and HTTPS

### The container provides:
- **SPA routing** — All routes resolve to `index.html`
- **Gzip compression** — Automatic for JS, CSS, SVG, JSON
- **Static asset caching** — 1-year cache with `immutable` for hashed Vite outputs
- **Security headers** — CSP, X-Frame-Options, HSTS, and more

---

## 🔐 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_SUPABASE_URL` | ✅ | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | ✅ | Supabase anon (public) key — RLS-protected |
| `VITE_GEMINI_API_KEY` | ⬜ Optional | Google Gemini API key (AI features degrade gracefully without it) |
| `VITE_GA_MEASUREMENT_ID` | ⬜ Optional | Google Analytics 4 measurement ID |

> **Security:** No secret keys are ever injected into the client bundle. The `vite.config.ts` explicitly sets `define: {}` to prevent accidental exposure.

---

## 📝 Assumptions Made

1. **No user authentication** — FlowPass is designed as a "zero install, zero account" system. Attendees register and view their pass with just a URL — no login required. This maximizes adoption in high-stress exit scenarios.

2. **Single organizer per event** — The current design assumes one organizer manages the dashboard. Multi-user organizer auth can be added via Supabase Auth.

3. **Gate staff trust model** — Gate staff access is URL-based. In production, a PIN/passcode layer (already implemented in the data model) would gate access.

4. **Crowd estimates** — The gap algorithm uses crowd estimates (entered during event creation), not real-time headcounts. Physical gate counters or IoT sensors could enhance precision.

5. **Network availability** — While `GateStaffView` includes offline detection with visual warnings, full offline-first sync (service worker + IndexedDB queue) is not yet implemented.

6. **Browser compatibility** — The QR scanner requires a device with a camera and a browser supporting the `getUserMedia` API (all modern mobile browsers).

---

## 📄 License

Open Source — Built for physical event safety.

---

<div align="center">
  <sub>Built with ❤️ for safer crowds everywhere</sub>
</div>
]]>

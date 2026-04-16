# 🎫 FlowPass — Smart Staggered Exit System

> A real-time, zero-install crowd management system that replaces dangerous stampede-prone crowd exits with intelligent, wave-based dispersal.

---

## 🎯 Chosen Vertical

**Event Safety & Crowd Management** — Specifically, the problem of safely exiting 10,000–50,000+ people from stadiums, arenas, and large venues after events end.

## 💡 Approach & Logic

FlowPass divides a venue into **zones** and schedules **staggered exit waves** with calculated gaps between each zone. A smart algorithm considers:

- **Total crowd size** — More people = larger gaps
- **Number of exit gates** — More gates = faster clearing
- **Gate load balancing** — Distributes zones across gates to prevent bottlenecks
- **Dynamic adjustments** — Organizers can pause, unlock, or reassign zones in real-time

### The Smart Algorithm

```
Gap = ceil(peoplePerZone / (gatesPerZone × 500 people/min))
Clamped to: 8 min ≤ gap ≤ 20 min
```

Each zone unlocks sequentially. Zone A opens first (immediate GO), Zone B opens after one gap, Zone C after two gaps, etc.

## 🔁 How It Works

```
ORGANISER creates event → System generates 3 URLs:
  → /organizer/:eventId     (dashboard)
  → /screen/:eventId        (big screen)
  → /register/:eventId      (attendees)

ATTENDEES scan QR / open link → register → get /pass/:passId

GATE STAFF open /gate/:eventId/:gateId on their phones

ORGANISER hits "Activate Exit Mode" on dashboard

Zone A unlocks → Zone A passes flip 🟢 GO NOW
Zone B unlocks after gap → Zone B passes flip 🟢
...until all zones clear → event complete ✅
```

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + Vite + TypeScript |
| Styling | Tailwind CSS 4 |
| Database | Supabase (Postgres + Realtime) |
| Animation | Framer Motion |
| QR Codes | qrcode.react |
| Deployment | Google Cloud Run (Docker + nginx) |
| Testing | Vitest (24 unit tests) |

## 🏗 Architecture

```
src/
├── components/
│   ├── dashboard/        # Organizer dashboard components
│   │   ├── StatsRow.tsx        # Live stats (total, exited, remaining, chaos score)
│   │   ├── ZoneCard.tsx        # Per-zone controls (hold/resume/unlock/edit time)
│   │   ├── GatePanel.tsx       # Gate status + smart reassignment
│   │   ├── ActivityLog.tsx     # Timeline log with CSV export
│   │   └── AnnouncementComposer.tsx  # Broadcast messaging
│   ├── pass/
│   │   └── LivePassCard.tsx    # Real-time updating attendee pass
│   ├── PassCard.tsx            # Static registration pass
│   ├── Navbar.tsx
│   └── Footer.tsx
├── lib/
│   ├── supabase.ts             # Supabase client
│   ├── sanitize.ts             # Input sanitization utility
│   ├── zoneAlgorithm.ts        # Core staggered exit algorithm
│   └── seedData.ts             # Test data seeder
├── pages/
│   ├── LandingPage.tsx         # Marketing landing
│   ├── CreateEvent.tsx         # 3-step event creation wizard
│   ├── OrganizerDashboard.tsx  # Real-time organizer controls
│   ├── BigScreen.tsx           # Venue display (fullscreen)
│   ├── AttendeeRegistration.tsx # Attendee self-registration
│   ├── PassView.tsx            # Live pass with countdown
│   └── GateStaffView.tsx       # Gate validation interface
└── App.tsx                     # Router
```

## 🔒 Security

FlowPass implements defense-in-depth security across multiple layers:

### Database Security
- **Row Level Security (RLS)** enabled on all 5 Supabase tables — the anon key can only perform RLS-allowed operations
- **UUID-based IDs** prevent sequential enumeration attacks on passes and events
- **Anon key only** — no admin/service key is ever exposed to the client bundle

### Input Sanitization (`src/lib/sanitize.ts`)
- **HTML tag stripping** — prevents stored XSS via `<script>`, `<img onerror>`, etc.
- **Dangerous protocol blocking** — removes `javascript:`, `data:`, `vbscript:`, `blob:`, `file:` schemes
- **Event handler removal** — strips `onclick=`, `onerror=`, and all `on*=` attributes
- **Field-specific sanitizers** — `sanitizeName()`, `sanitizeSeat()`, `sanitizeEventField()`, `sanitizePin()` each enforce character allowlists and length limits
- **UUID validation** — `isValidUUID()` validates URL parameters before database queries

### Application Security
- **Duplicate pass prevention** — checks if a seat is already registered before creating a new pass
- **Rate limiting** — 5-second cooldown between form submissions to prevent spam/abuse
- **Ghost Protocol** — when an event ends, all attendee PII (names, phones, passes) is permanently purged from the database
- **No API keys in client bundle** — Gemini/server-side keys are never injected into frontend JavaScript

### Infrastructure Security (`nginx.conf`)
- **Content-Security-Policy** — restricts resource loading to own origin + Supabase + Google Fonts
- **X-Frame-Options: DENY** — prevents clickjacking by blocking iframe embedding
- **X-Content-Type-Options: nosniff** — prevents MIME type sniffing attacks
- **Permissions-Policy** — blocks unused browser APIs (microphone, geolocation, payment)
- **Dotfile blocking** — nginx returns 404 for any `/.env`, `/.git` access attempts
- **Referrer-Policy** — controls information leakage via Referer headers

## ♿ Accessibility

- `aria-label` on all interactive buttons and form fields
- `aria-required` and `aria-invalid` on required inputs
- `aria-describedby` linking error messages to their inputs
- `aria-live` regions for dynamic status updates
- `role="alert"` for error messages
- Touch targets ≥ 44×44px for mobile interfaces (Gate Staff)

## 🧪 Testing

Run all 41 unit tests:

```bash
npm test
```

Test coverage:
- **zoneAlgorithm.test.js** (10 tests) — Gap calculation, schedule generation, seat-to-zone assignment
- **passStatus.test.js** (6 tests) — Pass state logic, countdown triggers, QR greyout
- **gateAssignment.test.js** (8 tests) — Gate validation, smart reassignment, wrong gate detection
- **sanitize.test.js** (17 tests) — XSS prevention, HTML stripping, protocol blocking, UUID validation, PIN sanitization

## 🚀 Running Locally

```bash
# 1. Clone the repo
git clone https://github.com/rehmanmusharaf/FlowPass.git
cd FlowPass

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
# Edit .env with your Supabase credentials

# 4. Start development server
npm run dev

# 5. Run tests
npm test

# 6. Build for production
npm run build
```

## ☁️ Deployment (Google Cloud Run)

The project includes a `Dockerfile` and `nginx.conf` for containerized deployment:

```bash
# Build and deploy via Cloud Build
gcloud builds submit --config cloudbuild.yaml
```

The container serves the built React app via nginx with:
- SPA routing (all routes → index.html)
- Gzip compression
- Static asset caching

## 📝 Assumptions Made

1. **No user authentication** — FlowPass is designed as a "zero install, zero account" system. Attendees should be able to register and view their pass with just a URL, no login required.
2. **Single organizer per event** — The current design assumes one organizer manages the dashboard. Multi-user organizer auth can be added via Supabase Auth.
3. **Gate staff trust model** — Gate staff access is URL-based. In production, a PIN/passcode layer would be added.
4. **Crowd estimates** — The gap algorithm uses crowd estimates, not real-time headcounts. Physical gate counters could enhance this.
5. **Network availability** — While GateStaffView has offline detection, full offline-first sync is not yet implemented (queued operations logged to console only).

## 📄 License

Open Source — Built for physical event safety.

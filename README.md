
# FlowPass: The Smart Event Exit System

**Vertical:** Smart Event & Crowd Safety Management

FlowPass is a real-time event exit coordination system designed to prevent post-event stampedes at large venues (stadiums, concerts, etc.) by implementing a staggered, wave-based dispersal strategy.

## 🚀 The Approach
- **Real-Time Coordination:** Uses Supabase Realtime and Postgres Changes to sync gate statuses and zone clearances instantly across organizers, staff, and attendees.
- **Premium User Experience:** Built with React 19 and custom motion logic to provide a high-end, responsive feel that works on any mobile browser without an app download.
- **Decision Support:** Provides organizers with a live dashboard to manage gate congestion and reassign flow dynamically based on real-world conditions.

## 🧠 How It Works
1. **Organizer Setup:** Create an event, define zones, and assign gates.
2. **Attendee Registration:** Attendees scan a QR code and get a personal digital pass tied to their seat/zone.
3. **Staggered Exit:** When the event ends, the organizer triggers the "Exit Sequence." Attendees receive live notifications/timers on their passes indicating when it is safe to leave through their assigned gate.
4. **Gate Monitoring:** Staff use a dedicated view to validate passes and report congestion, which updates the organizer's dashboard in real-time.

## 📝 Assumptions & Logistics
- **Network Dependency:** Relies on mobile connectivity for real-time updates.
- **User Hardware:** Assumes attendees have access to a smartphone with a web browser.
- **Zero-Install:** Designed as a web app to eliminate friction; no App Store/Play Store download required.

## Run Locally

**Prerequisites:** Node.js

1. **Clone and Install:**
   ```bash
   npm install
   ```
2. **Environment Variables:**
   Set the following variables in a `.env` file:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. **Launch:**
   ```bash
   npm run dev
   ```


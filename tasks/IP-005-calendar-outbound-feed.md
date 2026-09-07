# IP-005: Outbound Calendar Feed (Admin → Google Calendar)

> **Autonomous Agent Implementation Document**
> **Date:** 2026-09-06
> **Status:** Implemented in working tree (uncommitted)
> **Related specifications:**
> - [`CONSTITUTION.md`](file:///home/ale/Work/nenufar/CONSTITUTION.md) (Art. I, III, IV, VI)
> - [`AGENTS.md`](file:///home/ale/Work/nenufar/AGENTS.md)
> - [`docs/SDD.md`](file:///home/ale/Work/nenufar/docs/SDD.md) §2 (order flow untouched)

---

## 1. Executive Summary and Objective

Reverse the calendar sync direction. Previously the storefront **pulled** events from Shirley's personal Google Calendar (inbound iCal read), which risked flooding the site with non-store content. Now the storefront **publishes** an iCal feed that Shirley subscribes to once in Google Calendar: everything she adds in `/admin` appears in her calendar automatically. Her personal calendar never leaks into the site.

### Primary Outcomes:
1. **Outbound ICS feed (`/api/calendar/feed`):** RFC 5545 feed built from published `events` collection docs + the home page `upcomingEvents` block list (deduplicated, no demo fallbacks), revalidated every 5 minutes.
2. **Inbound disabled by default:** `syncWithGoogleCalendar` defaults to `false` in both block config and server component; the inbound iCal code path is preserved as opt-in only.
3. **Admin copy updated:** Spanish field descriptions explain the new direction and the subscribe steps (`calendar.google.com → Other calendars → From URL → /api/calendar/feed`).

---

## 2. Hard Constraints & Constitution Compliance

1. **Strict Push & Branch Governance:** No push to `main`. Work on a feature branch, PR for review.
2. **Bilingual Boundary (Constitution Art. VI.1):** Admin labels/descriptions in Spanish (`es-CO`). Code identifiers, comments, commits, and this document in English.
3. **Zero SaaS Cost Policy ($0/mo):** Subscription-by-URL uses free Google Calendar functionality. No Calendar API keys, no OAuth, no new dependencies.
4. **Dev Port Invariant:** Dev server on port **3002**. Note: Google cannot subscribe to `localhost`; Shirley must subscribe using the public production URL.
5. **Pre-Existing TypeScript Exceptions:** Preserve known upstream plugin exceptions (`slug`, `paymentMethod`, block `admin.description`).

---

## 3. Detailed Task Breakdown

### 🔹 Phase 1: Outbound ICS Feed (done)

#### Task 1.1: New route `src/app/(app)/api/calendar/feed/route.ts`
- **Change:**
  - `GET` returns `text/calendar` with `VCALENDAR` (`PRODID -//Nenufar Cartagena//Eventos//ES`, `X-WR-CALNAME`, `America/Bogota`).
  - Source 1: published `events` collection docs from the last 30 days onward (limit 100, sorted by date).
  - Source 2: `events` array of the published home page (`slug` home/inicio) `upcomingEvents` block — Shirley's primary workflow.
  - Dedupe by `title|date`; demo fallbacks excluded.
  - RFC 5545 escaping (`\,`, `\;`, `\\`, `\n`), 75-octet line folding, stable UIDs (`nenufar-event-<id>@nenufar`), timed events default to 3h duration, date-only values emitted as `VALUE=DATE` (exclusive `DTEND`).
- **Verify:** `curl localhost:3002/api/calendar/feed` returns 7 well-formed `VEVENT`s; `tsc` clean on the file.

### 🔹 Phase 2: Disable Inbound Default (done)

#### Task 2.1: `src/blocks/UpcomingEvents/Component.tsx`
- `syncWithGoogleCalendar = true` → `false`; comment updated. Inbound fetch code untouched (opt-in).

#### Task 2.2: `src/blocks/UpcomingEvents/config.ts`
- `syncWithGoogleCalendar` `defaultValue: false`, label/description rewritten for the outbound direction.
- `googleCalendarIcalUrl` marked optional with copy explaining it only pulls her calendar into the site when explicitly set.

### 🔹 Phase 3: Operator Handoff (pending)

#### Task 3.1: Shirley subscribes once (production URL required)
1. Google Calendar (desktop) → Other calendars → **+** → **From URL**.
2. Paste `https://<production-domain>/api/calendar/feed` → Add calendar ("Nénufar — Ferias y Talleres").
3. Expect first sync + refresh lag of a few hours (Google-side polling, not controllable).

---

## 4. Acceptance Criteria

- [x] `/api/calendar/feed` returns valid ICS with real events, no demo fallbacks.
- [x] Homepage renders with inbound sync off and no "Google Calendar" badge unless explicitly enabled.
- [x] Admin field copy describes admin → Google direction in Spanish.
- [ ] Feed subscribed on Shirley's production Google account and first events visible (operator step).
- [ ] Changes committed on a feature branch with English commit message; PR opened for review.

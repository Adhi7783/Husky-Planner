# Milestones & Retrospective

Planned milestones and what shipped.

1. MVP — Class & Assignment management
   - Planned: 2026-04-01
   - Shipped: core CRUD and local persistence (localStorage)
   - Notes: Basic UI implemented; tests for storage & validation added.

2. Authentication (Google Sign-in)
   - Planned: 2026-04-10
   - Shipped: Google Sign-in implemented; requires OAuth origin registration for production preview URLs.

3. AI Prioritization
   - Planned: 2026-04-20
   - Shipped: GROQ-based priority service, enriched prompt, and UI to show ranked items.

4. CI + Docs
   - Planned: 2026-05-01
   - Shipped: GitHub Actions CI added; briefing & milestone docs added to repo.

What didn't make it
-------------------
- Canvas API import: blocked by institutional access and API key restrictions.
- Full streaming UI for AI tokens: planned but left as next-step enhancement.

Retrospective
-------------
- Keep scope small and prioritize core user flows (add -> view -> prioritize).
- External integrations require early validation (OAuth origins, Canvas access).

Planned vs Done (weekly snapshots)
---------------------------------
The project tracked short weekly "Planned" vs "Done" boards while developing. Key recurring items across the snapshots:

- Planned items seen in screenshots:
   - UI fixes and visual improvements (layout, headings, spacing).
   - AI sort assignments (improve prompt and prioritize flow).
   - Google sign-in and authentication flows.
   - Deploy to Vercel and make the project publicly available.
   - Add a calendar view (future work).

- Done items seen in screenshots:
   - Deployed on Vercel and cleaned up the repo.
   - Implemented class and assignment creation UI.
   - Added a course & assignment difficulty slider.
   - Improved the AI prompt and explanations returned to users.

These snapshots were used as lightweight status boards during development to track visible progress for demos and project check-ins.


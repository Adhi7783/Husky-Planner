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
The project used short weekly "Planned" vs "Done" boards during development. Below are the consolidated items pulled from those snapshots.

Planned (examples from snapshots)
- Add feature to let users add assignments and course info (Canvas import was planned but later pivoted).
- UI improvements: layout polish, headings, spacing, and clearer visuals for the dashboard.
- AI-driven sorting: refine prompt, add clearer explanations, and support streaming tokens (future enhancement).
- Google Sign-in / authentication flows (register OAuth origins for preview and production URLs).
- Deploy the project to Vercel and keep deployment stable.
- Add a calendar view and other visualizations (future work).

Done (examples from snapshots)
- Deployed on Vercel and cleaned up the repository.
- Implemented class and assignment creation UI (users can add courses and assignments manually).
- Added a course & assignment difficulty slider to capture effort signals.
- Improved the AI prompt and explanation text returned to users; integrated GROQ-based service for prioritization.
- Fixed build/test issues (TypeScript tests and Vite/Vitest typing) so CI/build can succeed.

These snapshots were used as lightweight status boards during development to track visible progress for demos and project check-ins.


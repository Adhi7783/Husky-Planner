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

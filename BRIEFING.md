# Husky Planner — Project Briefing

Problem statement
-----------------
Students often struggle to prioritize coursework when juggling multiple classes, differing assignment weights, and varying effort levels. Husky Planner helps UW Bothell CSS students decide what to work on next by combining simple UI controls with an AI-powered prioritization assistant.

Target audience
---------------
- UW Bothell CSS undergraduate students
- Instructors or graders who want to preview student workload patterns

Original feature plan
---------------------
- Class and assignment CRUD (create, read, update, delete)
- Local persistence and per-user isolation (localStorage)
- Manual priority list UI
- AI-assisted ranking using Groq/OpenAI for a prioritized list
- Google sign-in for user identity
- (Ambitious) Canvas API integration to import course rosters and assignments

What we actually built
----------------------
- MVP: Class and assignment management with local persistence and a priority list UI.
- AI prioritization: integrated Groq service to score and rank assignments based on urgency, grade weight, and difficulty.
- Auth: Google sign-in added (requires proper OAuth origins on Cloud Console).
- Tests: basic unit tests for storage and validation.

What we cut or pivoted
----------------------
- Canvas API integration was attempted but blocked by institutional access restrictions; documented in the README.
- Some experimental Gemini integration was removed in favor of a GROQ-based service.

How to read this repo
---------------------
- `src/` — application sources (components, services, utils)
- `docs/` — auxiliary documentation and retrospectives
- `BRIEFING.md` — this briefing

If you want a quick demo, deploy the app or run locally with `npm install && npm run dev`.

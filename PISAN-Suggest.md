# 10 Suggested Improvements for Husky Planner

## Code quality & cleanup

**1. Remove the noisy `console.log` debug instrumentation from production code.**
[src/store/plannerStore.ts:172-291](src/store/plannerStore.ts#L172-L291), [src/services/geminiService.ts:207-307](src/services/geminiService.ts#L207-L307), [src/components/DashboardView.tsx:32-36](src/components/DashboardView.tsx#L32-L36) are saturated with `[STORE]`, `[GROQ]`, `[DASHBOARD]` logs left over from the 429-debugging session. They run on every render/sort and leak debug detail into the user's console. Replace with a `debug(...)` helper guarded by `import.meta.env.DEV`, or delete.

**2. Rename `geminiService` to `aiService` (or `groqService`).**
The file [src/services/geminiService.ts](src/services/geminiService.ts) actually calls Groq, the error class is `GeminiServiceError`, and [AuthGate.tsx:242](src/components/AuthGate.tsx#L242) still markets "Gemini helps rank what to work on first." This naming mismatch is confusing for anyone new to the code. Rename the module, class, and marketing copy in a single sweep.

**3. Delete (or move to a `docs/` archive) the stale debugging markdown.**
[429_DEBUGGING_ANALYSIS.md](429_DEBUGGING_ANALYSIS.md), [CALL_SITES_ANALYSIS.md](CALL_SITES_ANALYSIS.md), and [DEBUG_GUIDE.md](DEBUG_GUIDE.md) describe a resolved bug (commit `142ccc9 fixed http 429 error`). They are now noise at the repo root. Per the global CLAUDE.md they also displace the missing `BRIEFING.md` / `CHANGES.md`, which the project should adopt.

## Features

**4. Add an "edit assignment / edit class name" flow.**
Today the only mutations are add, toggle-complete, delete. A typo in a class name or a due-date change forces a delete + re-add, which loses the AI explanation. Add edit actions in [plannerStore.ts](src/store/plannerStore.ts) plus inline edit UI in [ClassDetailView.tsx](src/components/ClassDetailView.tsx).

**5. Sort/group assignments by due date in `ClassDetailView`.**
[ClassDetailView.tsx:19](src/components/ClassDetailView.tsx#L19) shows assignments in insertion order. Default to ascending due-date, with completed items collapsed/dimmed. Most planner users scan "what's next," not "what did I type first."

**6. Add a global "All upcoming assignments" view on the dashboard.**
Right now you must drill into each class to see assignments. A cross-class list (sorted by due date, with class chip per row) on [DashboardView.tsx](src/components/DashboardView.tsx) is the most common planner use case and would also make the "Sort by Priority" output more useful in context.

## Architecture & robustness

**7. Scope localStorage per user.**
[storageService.ts:3](src/services/storageService.ts#L3) uses a single `huskyPlanner_v1` key, but [App.tsx:7](src/App.tsx#L7) stores a separate user identity. If two students sign in on the same browser, they share planner data. Key the storage by `user.subject` (e.g. `huskyPlanner_v1:${subject}`) and pass it through `storageService`.

**8. Move side-effectful hydration out of module top-level.**
[plannerStore.ts:299-319](src/store/plannerStore.ts#L299-L319) runs `localStorage.getItem` at module-import time. That breaks SSR, makes per-user keying (#7) awkward, and makes tests need to clear `localStorage` before importing the store. Move hydration into an exported `hydrate(userKey)` called once from [main.tsx](src/main.tsx) or [App.tsx](src/App.tsx).

**9. Tighten ID-token handling in `AuthGate`.**
[AuthGate.tsx:71-83](src/components/AuthGate.tsx#L71-L83) decodes the Google JWT client-side without verifying the signature, audience, or `exp`. For a local-only planner this is low-risk, but at minimum check `aud === clientId` and `exp > now` before accepting the identity, and document explicitly in the README that this is a client-only trust boundary.

## DX & polish

**10. Wire up tests and a CI check, and remove dead `setupTests.ts`.**
`package.json` declares `vitest`, `@testing-library/react`, and `fast-check`, but [src/setupTests.ts](src/setupTests.ts) is a 1-line stub and there are no test files in [src/](src/). Either add real tests for `validation.ts`, `storageService.ts`, and the `geminiService` parser (the JSON shape handling is the most fragile code) and run them in CI, or drop the unused dev dependencies to slim install time.

---

# Additional UI Improvements & New Features

## UI improvements

**11. Confirmation step on destructive Delete buttons.**
[DashboardView.tsx:78](src/components/DashboardView.tsx#L78) and [ClassDetailView.tsx:69-77](src/components/ClassDetailView.tsx#L69-L77) delete instantly on one click. Deleting a class also wipes every assignment under it (see [plannerStore.ts:97-108](src/store/plannerStore.ts#L97-L108)). Add an inline "Delete? Cancel" two-step confirm, or a 5-second "Undo" toast that restores the removed entity from a snapshot.

**12. Visual urgency cues on assignment rows.**
Right now every row in [ClassDetailView.tsx:43-79](src/components/ClassDetailView.tsx#L43-L79) looks identical. Color the date pill: red for overdue, amber for due-today/tomorrow, neutral for >3 days out, dimmed for completed. Gives the planner real glance-value without opening the AI sort.

**13. Light / system theme support.**
[index.css:5-15](src/index.css#L5-L15) hard-codes the dark purple gradient. White form inputs on a dark page is also a small contrast clash. Add a `prefers-color-scheme: light` block plus a manual toggle in the header.

**14. Responsive header and card grid.**
[index.css:92-96](src/index.css#L92-L96) sets the header to a fixed two-column grid (`1fr auto`) with no media query. On mobile the user chip wraps awkwardly under "Husky Planner." Collapse to a single column under ~640px and hide the email under a popover.

**15. Real spinner for AI sort, not an emoji.**
[PriorityListPanel.tsx:33-39](src/components/PriorityListPanel.tsx#L33-L39) shows an hourglass emoji. Replace with a CSS-animated spinner and an estimated-time line ("usually ~3s"), which calibrates expectations when Groq is slow.

**16. Persist `priorityList` across reloads.**
[storageService.ts:104-107](src/services/storageService.ts#L104-L107) explicitly excludes `priorityList`, so a refresh wipes the AI's work and the explanations the user just paid an API call for. Save it alongside assignments and only invalidate when the assignment set changes.

**17. Inline "Add Class" / "Add Assignment" instead of a permanent card.**
[DashboardView.tsx:95-97](src/components/DashboardView.tsx#L95-L97) keeps the form mounted at the bottom of every page. A single "+ Add class" button that expands into the form keeps the dashboard quieter once a student has 6-8 classes loaded.

**18. Keyboard-first interactions.**
Add `n` to focus new-class/new-assignment input, `/` to focus search (see feature #20), `Esc` to back out of `ClassDetailView`. Power users on a planner will repeat-add a lot.

## New features

**19. "All Upcoming" cross-class list with overdue section.**
Beyond the per-class drill-down, surface a single chronological list of all incomplete assignments on the dashboard with their class chip, grouped by Overdue / Today / This Week / Later. This is the single most-asked planner feature and works without an API call.

**20. Search and filter.**
A search box that filters by assignment name, class name, or description text. Add quick filters: `hide completed`, `this week only`. Cheap to implement on top of the existing store.

**21. Color per class.**
Add a `color` field to `Class` ([types/index.ts:1-5](src/types/index.ts#L1-L5)) with a small swatch picker on creation. Class chips, priority-list items, and the upcoming list all pick that color up. Massive readability win for ~30 lines of code.

**22. Recurring assignments.**
"Weekly problem set, Fri 11:59pm" is the dominant assignment pattern in UW courses. Let the user mark an assignment as recurring (weekly/biweekly until end-date) and auto-spawn the next instance when the current one is marked complete.

**23. Estimated effort + weekly workload bar.**
Optional `estimatedMinutes` field on `Assignment`. Show a thin bar at the top of the dashboard summing this week's incomplete effort (e.g. "6h 30m due this week"). Also feeds the AI sort prompt at [geminiService.ts:40-83](src/services/geminiService.ts#L40-L83) so "workload" stops being a guess.

**24. Notes / syllabus per class.**
A free-text note field on `Class` for syllabus URL, instructor, office hours, Canvas link. Rendered at the top of [ClassDetailView.tsx](src/components/ClassDetailView.tsx). Turns the planner into a single jump-off page per class.

**25. Export / import JSON + ICS calendar feed.**
A "Download backup" button that emits the current store as JSON, and a matching import. Bonus: emit `.ics` so students can subscribe to their assignments in Google Calendar / Apple Calendar. Pairs naturally with per-user storage (#7).

**26. Browser notifications for upcoming due dates.**
Opt-in `Notification.requestPermission()` once, then fire a notification at 24h and 1h before any incomplete assignment's due date while the tab is open (or via a tiny service worker for background).

**27. Quick-add via natural language.**
A single input at the top of the dashboard: "PS3 for CSE 142 due Friday 11:59pm" parsed (date-fns can do most of the date side) into class + name + due date. Falls back to the structured form if parsing fails. High delight, modest code.

**28. Per-assignment subtasks / checklist.**
Most "assignments" are really 3-5 sub-steps (read, draft, revise, submit). Let users break an assignment into checkbox subtasks; completion bar fills automatically. Visible in the detail view.

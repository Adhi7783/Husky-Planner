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

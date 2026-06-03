# Debugging the 429 Error - Console Logging Guide

I've added comprehensive console.log debugging to trace exactly where the duplicate API calls are happening.

## How to Run the Debug Session

1. **Open DevTools**: Press `F12` or `Ctrl+Shift+I` in your browser
2. **Go to Console tab**: Click the "Console" tab
3. **Look for `[STORE]`, `[GEMINI]`, and `[DASHBOARD]` prefixed logs**
4. Click the "Sort by Priority" button **ONE TIME** (just a single click)
5. Watch the console output carefully
6. **Screenshot or copy the logs** and share what you see

## What You Should See (Normal Flow)

A single button click should produce this sequence:

```
[DASHBOARD] Sort button clicked
[STORE] requestPrioritySort() called
[STORE] Current sortState: idle
[STORE] Found 3 incomplete assignments
[STORE] Setting sortState to 'loading', making API request...
[STORE] Calling geminiService.prioritize() with 3 assignments
[GEMINI] prioritize() called with 3 assignments
[GEMINI] Sending fetch request to Gemini API...
[GEMINI] Got response with status 429
[GEMINI] API error: HTTP 429
[STORE] Error during prioritization: GeminiServiceError: API error...
[STORE] Setting sortState to 'error' with message: API error: ...
```

## What Would Indicate a Problem

### Problem 1: Button Clicked Twice
If you see this pattern, the button was clicked multiple times:
```
[DASHBOARD] Sort button clicked          ← First click
[STORE] requestPrioritySort() called
[STORE] Current sortState: idle
...
[DASHBOARD] Sort button clicked          ← SECOND click (shouldn't happen if you clicked once!)
[STORE] requestPrioritySort() called
```
**Solution**: Click only once. The button should be disabled after the first click.

### Problem 2: Request Blocked by Guard (Expected)
If you click again while loading:
```
[DASHBOARD] Sort button clicked
[STORE] requestPrioritySort() called
[STORE] Current sortState: loading
[STORE] Request already in flight (sortState=loading), ignoring duplicate call  ← Guard working!
```
**This is GOOD** - it means the guard is protecting against duplicate requests.

### Problem 3: Multiple Gemini Calls Per Click (Bad)
If you see the `[GEMINI] prioritize() called` message multiple times for a single button click:
```
[DASHBOARD] Sort button clicked
[STORE] requestPrioritySort() called
...
[GEMINI] prioritize() called with 3 assignments
[GEMINI] Sending fetch request to Gemini API...
[GEMINI] prioritize() called with 3 assignments          ← Second call (shouldn't happen!)
[GEMINI] Sending fetch request to Gemini API...
```
**This would indicate a problem in the code logic.**

### Problem 4: React StrictMode Double Render
In development, you might see double renders (one unmount, one remount):
```
[DASHBOARD] Rendering with sortState=idle, priorityList.length=0
[DASHBOARD] Rendering with sortState=idle, priorityList.length=0  ← Render happens twice
```
**This is NORMAL in development** with StrictMode. It doesn't trigger the button click twice, just re-renders components.

## Key Guards in Place

1. **In-flight request guard** (the fix I added):
   ```typescript
   if (currentSortState === 'loading') {
     console.warn(`[STORE] Request already in flight...`);
     return;  // ← Prevents duplicate request
   }
   ```

2. **Button disable state**:
   ```typescript
   disabled={sortState === 'loading' || !hasClasses}  // ← Disables button while loading
   ```

## Steps to Diagnose

1. **Run the app**: `npm run dev`
2. **Add a test class**: "Test Class"
3. **Add 1-2 test assignments** with different due dates
4. **Clear the console**: Right-click in console → "Clear console"
5. **Click the "Sort by Priority" button ONE TIME**
6. **Watch all the logs that appear**
7. **Count how many `[GEMINI] prioritize() called` messages you see**
   - Should be exactly 1
   - If more than 1, there's a bug

## Likely Cause of Your 429

The 429 error after a single click suggests:

**Most Likely**: Your API key quota has been exhausted (hourly or daily limit)
- Solution: Wait for quota to reset or create a new API key

**Less Likely**: The logs will reveal if there are actually multiple requests being sent

## Copy-Paste Template

Once you have the console logs, use this template to report:

```
Console log output from single button click:

[Paste your console logs here]

I saw X [GEMINI] prioritize() called messages.
```

This will help identify if the issue is:
- Multiple button clicks (user behavior)
- Multiple API calls per click (code bug)
- API quota exceeded (rate limit)


# Gemini `prioritize()` - All Call Sites Analysis

## Single Source of Truth: DashboardView Button

`prioritize()` should ONLY be called when:
- User clicks the "Sort by Priority" button
- Button is enabled (not loading, has classes)

### Call Chain
```
User Click (Browser)
    ↓
DashboardView.handleSortClick()  [src/components/DashboardView.tsx:L41]
    ↓
    console.log(`[DASHBOARD] Sort button clicked`)
    ↓
    requestPrioritySort()  [from zustand store]
        ↓
        plannerStore.requestPrioritySort()  [src/store/plannerStore.ts:L171]
            ↓
            Check: sortState === 'loading'?  [NEW GUARD]
                If YES → return early (prevents duplicate)
                If NO → continue
            ↓
            Check: incompleteAssignments.length === 0?
                If YES → return early (no assignments)
                If NO → continue
            ↓
            set({ sortState: 'loading', sortError: null })
            ↓
            Compile payload from incomplete assignments
            ↓
            geminiService.prioritize(payload)  [src/services/geminiService.ts:L166]
                ↓
                Make single fetch request to Gemini API
                ↓
                Await response
                ↓
                Parse response
                ↓
                Return results to requestPrioritySort()
            ↓
            set({ priorityList, sortState: 'idle', sortError: null })
            ↓
            UI updates with sorted assignments
Done
```

## All Locations Where `requestPrioritySort` is Called

### ✅ ALLOWED (Only One)
- **File**: `src/components/DashboardView.tsx`
- **Line**: L45 (in handleSortClick button handler)
- **Context**: Button click handler
- **Frequency**: Once per user button click

```typescript
const handleSortClick = async () => {
  console.log(`[DASHBOARD] Sort button clicked`);
  await requestPrioritySort();
};

<button onClick={handleSortClick}>Sort by Priority</button>
```

### ❌ NOT ALLOWED (Should not exist)
These locations would cause duplicate calls:
- Inside a `useEffect` without proper dependencies
- Inside a render function
- Multiple event handlers on the same button
- Auto-triggered on state changes
- Inside another async handler that's called multiple times

**Search for these patterns**:
```bash
grep -r "requestPrioritySort" src/
# Should return only:
# - The function definition in plannerStore.ts
# - The single usage in DashboardView.tsx
```

## Guards Against Duplicate Requests

### Guard 1: In-Flight Request Check
**Location**: `src/store/plannerStore.ts` lines 174-178
```typescript
if (currentSortState === 'loading') {
  console.warn(`[STORE] Request already in flight...`);
  return;  // ← Prevents duplicate
}
```
**Trigger**: When `sortState === 'loading'` (request in progress)
**Result**: Subsequent clicks are silently ignored

### Guard 2: Button Disabled State
**Location**: `src/components/DashboardView.tsx` line 44
```typescript
disabled={sortState === 'loading' || !hasClasses}
```
**Trigger**: When `sortState === 'loading'`
**Result**: Button visually disabled, prevents accidental re-clicks

### Guard 3: Empty Assignments Check
**Location**: `src/store/plannerStore.ts` lines 182-187
```typescript
if (incompleteAssignments.length === 0) {
  console.log(`No incomplete assignments...`);
  set({ sortError: 'No incomplete assignments to prioritize.' });
  return;
}
```
**Trigger**: When no incomplete assignments exist
**Result**: No API call made

## Debugging Checklist

- [ ] Single button click produces exactly 1 `[GEMINI] prioritize() called` log
- [ ] Multiple rapid clicks produce multiple `[STORE] Request already in flight` warnings
- [ ] Button is disabled immediately after first click
- [ ] Button re-enables after response (success or error)
- [ ] No console errors or warnings (except for expected ones)
- [ ] sortState transitions: idle → loading → idle/error
- [ ] Console shows clear cause of 429 error

## Expected Console Output (Single Click)

```
[DASHBOARD] Sort button clicked
[STORE] requestPrioritySort() called
[STORE] Current sortState: idle
[STORE] Found 3 incomplete assignments
[STORE] Setting sortState to 'loading'...
[STORE] Calling geminiService.prioritize() with 3 assignments
[GEMINI] prioritize() called with 3 assignments
[GEMINI] Sending fetch request to Gemini API...
[GEMINI] Got response with status 429
[STORE] Error during prioritization: GeminiServiceError: API error...
[STORE] Setting sortState to 'error'...
```

## If Multiple Requests Appear

This sequence would indicate a bug:
```
[DASHBOARD] Sort button clicked
...
[GEMINI] prioritize() called with 3 assignments  ← First call
[GEMINI] Sending fetch request...
[GEMINI] prioritize() called with 3 assignments  ← SECOND CALL (BAD!)
[GEMINI] Sending fetch request...
```

**This would mean**: Something is calling `requestPrioritySort()` multiple times per click

**Check for**:
- useEffect with missing dependencies
- Render-time function calls
- Multiple button handlers
- Automatic retry logic

## Current Status

| Component | Status | Details |
|-----------|--------|---------|
| geminiService.prioritize() | ✅ Guarded | Single fetch, no retries |
| requestPrioritySort() | ✅ Guarded | In-flight check added |
| DashboardView button | ✅ Guarded | Disabled while loading |
| useEffect calls | ✅ Clean | Only for persistence toast |
| React StrictMode | ✅ OK | Doesn't trigger button twice |

All guards are in place. The 429 error is likely due to:
1. API quota exceeded (most likely)
2. Multiple test clicks
3. Network retries (not our code)


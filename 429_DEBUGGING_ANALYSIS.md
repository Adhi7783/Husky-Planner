# 429 Error Debugging - Complete Analysis & Fixes

## Changes Made

I've added comprehensive debugging and improved the request guard system to prevent duplicate API calls.

### 1. Added Console Logging (Execution Flow Tracing)

#### In `src/services/geminiService.ts`
```typescript
console.log(`[GEMINI] prioritize() called with ${assignments.length} assignments`);
console.log(`[GEMINI] Sending fetch request to Gemini API...`);
console.log(`[GEMINI] Got response with status ${response.status}`);
```

#### In `src/store/plannerStore.ts`
```typescript
console.log(`[STORE] requestPrioritySort() called`);
console.log(`[STORE] Current sortState: ${currentSortState}`);
console.warn(`[STORE] Request already in flight (sortState=loading), ignoring duplicate call`);
console.log(`[STORE] Calling geminiService.prioritize() with ${payload.length} assignments`);
```

#### In `src/components/DashboardView.tsx`
```typescript
console.log(`[DASHBOARD] Rendering with sortState=${sortState}, ...`);
console.log(`[DASHBOARD] Sort button clicked`);
```

### 2. Improved In-Flight Request Guard

**Previous code** (was missing!):
```typescript
async requestPrioritySort(): Promise<void> {
  const { assignments, classes } = get();
  
  // Only check: if no incomplete assignments exist
  const incompleteAssignments = assignments.filter((a) => !a.completed);
  if (incompleteAssignments.length === 0) {
    set({ sortError: 'No incomplete assignments to prioritize.' });
    return;
  }
  
  // Set loading AFTER the check
  set({ sortState: 'loading', sortError: null });
  // If user clicks button again here (before await finishes), state is already 'loading'
  // but second request could still start
}
```

**New code** (with guard):
```typescript
async requestPrioritySort(): Promise<void> {
  const { assignments, classes, sortState: currentSortState } = get();
  
  // ✅ NEW GUARD: Check if request already in flight
  if (currentSortState === 'loading') {
    console.warn(`[STORE] Request already in flight (sortState=loading), ignoring duplicate call`);
    return;  // ← EXIT HERE, don't proceed
  }
  
  // Then check: if no incomplete assignments exist
  const incompleteAssignments = assignments.filter((a) => !a.completed);
  if (incompleteAssignments.length === 0) {
    set({ sortError: 'No incomplete assignments to prioritize.' });
    return;
  }
  
  // Now safe to set loading and make request
  set({ sortState: 'loading', sortError: null });
  // ...make API call
}
```

### 3. Added Click Handler with Logging

**Previous code**:
```typescript
onClick={() => void requestPrioritySort()}
```

**New code**:
```typescript
const handleSortClick = async () => {
  console.log(`[DASHBOARD] Sort button clicked`);
  await requestPrioritySort();
};

// In JSX:
onClick={handleSortClick}
```

## Execution Flow (Complete Trace)

### Normal Single Click Flow:
```
User clicks "Sort by Priority" button
       ↓
handleSortClick() fires
       ↓
[DASHBOARD] Sort button clicked (logged)
       ↓
requestPrioritySort() called
       ↓
[STORE] requestPrioritySort() called (logged)
[STORE] Current sortState: idle (logged)
       ↓
Check: sortState !== 'loading'? YES, continue
       ↓
Get incomplete assignments
[STORE] Found 3 incomplete assignments (logged)
       ↓
Check: incompleteAssignments.length > 0? YES, continue
       ↓
Set sortState to 'loading'
[STORE] Setting sortState to 'loading'... (logged)
       ↓
Compile payload and call geminiService.prioritize()
[STORE] Calling geminiService.prioritize()... (logged)
       ↓
geminiService.prioritize(payload) executes
[GEMINI] prioritize() called with 3 assignments (logged)
[GEMINI] Sending fetch request to Gemini API... (logged)
       ↓
await fetch() waits for response
       ↓
[GEMINI] Got response with status X (logged)
       ↓
Parse response
[GEMINI] Successfully parsed response (logged)
       ↓
Return to requestPrioritySort()
[STORE] Gemini returned 3 results (logged)
[STORE] Setting priorityList and sortState to 'idle' (logged)
       ↓
Update UI, button re-enables
Done ✓
```

### If User Clicks Again While Loading:
```
First request in flight (sortState = 'loading')
User clicks "Sort by Priority" button again
       ↓
handleSortClick() fires
[DASHBOARD] Sort button clicked (logged)
       ↓
requestPrioritySort() called
[STORE] requestPrioritySort() called (logged)
[STORE] Current sortState: loading (logged)
       ↓
Check: sortState === 'loading'? YES!
       ↓
[STORE] Request already in flight... (logged)
return; ← EXIT HERE! Don't proceed.
       ↓
No second API call is made ✓
```

## What to Test

### Test 1: Single Click (No Error Expected Yet)
1. Open browser DevTools (F12)
2. Go to Console tab
3. Clear console
4. Click "Sort by Priority" button ONE TIME only
5. Watch the console logs
6. **Count `[GEMINI] prioritize() called` messages** - should be exactly 1

### Test 2: Rapid Multiple Clicks
1. Clear console
2. Click "Sort by Priority" button 5 times very quickly
3. Watch console
4. **Should see**:
   - `[DASHBOARD] Sort button clicked` × 5 (button fires 5 times)
   - `[STORE] requestPrioritySort() called` × 5 (function called 5 times)
   - `[GEMINI] prioritize() called` × 1 (only ONE API call!)
   - Four `[STORE] Request already in flight...` messages (4 rejections)

### Test 3: Wait for First Request to Complete
1. Clear console
2. Click button
3. Wait for it to complete (see `[STORE] Setting priorityList...` message)
4. Wait a few seconds
5. Click button again
6. **Should see two separate request sequences**

### Test 4: Check Button State
1. Click "Sort by Priority"
2. **Button should immediately become disabled** (text changes to "Sorting…")
3. Wait for response
4. **Button should re-enable** when done

## Possible Causes of 429 Error

### 1. **API Quota Exceeded** (Most Likely)
- Free tier Gemini API has hourly/daily limits
- Each API request counts against quota
- **Fix**: Wait 1 hour for reset OR create new API key

### 2. **Multiple Requests Per Click** (Would show in console)
- Console logs will reveal this
- Logs should show `[GEMINI] prioritize() called` only once per click
- If you see it multiple times, there's a code issue

### 3. **Browser Retries** (Would show in Network tab)
- Open DevTools → Network tab
- Look at the request to Gemini API
- If you see one request with 429 response, it's the quota
- If you see multiple requests, browser/network is retrying

### 4. **React StrictMode Double Mount** (Won't cause 429)
- In development, React.StrictMode intentionally unmounts/remounts
- This causes renders to run twice but **does NOT trigger the button click twice**
- The logs would show `[DASHBOARD] Rendering` twice but `[DASHBOARD] Sort button clicked` only once

## Console Log Reference

| Log Prefix | Meaning |
|-----------|---------|
| `[DASHBOARD]` | DashboardView component events |
| `[STORE]` | Zustand store actions |
| `[GEMINI]` | Gemini API service calls |

## Next Steps

1. **Run the app**: `npm run dev`
2. **Open DevTools Console** (F12 → Console tab)
3. **Add test data**: 1 class + 2-3 assignments
4. **Clear console** and click button ONE TIME
5. **Share the console output** - tells us exactly what's happening
6. **Check the actual error message** - if it's HTTP 429, it's likely API quota
7. **Possible fixes**:
   - Wait 1 hour for API quota reset
   - Create new API key
   - Or check if logs show multiple requests (code bug)

## Summary

✅ **In-flight request guard added** - prevents concurrent requests  
✅ **Comprehensive logging added** - traces complete execution  
✅ **Console output will reveal root cause** - API quota vs code bug  
✅ **Button disabled while loading** - prevents accidental double-clicks  

The debugging logs will clearly show whether the issue is:
1. Multiple API calls being made (code issue)
2. API quota limit being hit (infrastructure issue)
3. Network-level retries (browser behavior)


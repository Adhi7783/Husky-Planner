import type { AssignmentPayload, PriorityResult } from '../types';

// ---------------------------------------------------------------------------
// Typed error class
// ---------------------------------------------------------------------------

export type GroqErrorKind = 'http' | 'timeout' | 'parse';

export class GroqServiceError extends Error {
  readonly kind: GroqErrorKind;
  readonly statusCode?: number;

  constructor(kind: GroqErrorKind, message: string, statusCode?: number) {
    super(message);

    this.name = 'GroqServiceError';
    this.kind = kind;
    this.statusCode = statusCode;

    Object.setPrototypeOf(this, new.target.prototype);
  }
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_GROQ_MODEL = 'llama-3.1-8b-instant';
const TIMEOUT_MS = 30_000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function difficultyLabel(d: number): string {
  const labels: Record<number, string> = {
    1: 'Very Easy',
    2: 'Easy',
    3: 'Moderate',
    4: 'Hard',
    5: 'Very Hard',
  };
  return labels[d] ?? 'Unknown';
}

function daysUntil(dueDateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDateStr);
  due.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

// ---------------------------------------------------------------------------
// Prompt builder — enriched with difficulty, weight, and urgency signals
// ---------------------------------------------------------------------------

function buildPrompt(assignments: AssignmentPayload[]): string {
  const today = new Date().toISOString().split('T')[0];

  const list = assignments
    .map((a, i) => {
      const days = daysUntil(a.dueDate);
      const urgencyTag =
        days < 0
          ? '⚠️ OVERDUE'
          : days === 0
          ? '🔴 DUE TODAY'
          : days <= 2
          ? '🟠 DUE VERY SOON'
          : days <= 7
          ? '🟡 DUE THIS WEEK'
          : '🟢 DUE LATER';

      const weightStr =
        a.weight !== undefined
          ? `Grade Weight: ${a.weight}% of final grade`
          : 'Grade Weight: not specified';

      const diffStr =
        a.difficulty !== undefined
          ? `Assignment Difficulty: ${a.difficulty}/5 (${difficultyLabel(a.difficulty)})`
          : 'Assignment Difficulty: not specified';

      const classDiffStr =
        a.classDifficulty !== undefined
          ? `Course Difficulty: ${a.classDifficulty}/5 (${difficultyLabel(a.classDifficulty)})`
          : 'Course Difficulty: not specified';

      const descStr = a.description
        ? `Notes: ${a.description}`
        : '';

      return [
        `${i + 1}. [ID: ${a.id}] ${urgencyTag}`,
        `   Assignment: ${a.name}`,
        `   Course: ${a.className}`,
        `   Due: ${a.dueDate} (${days >= 0 ? `${days} day${days !== 1 ? 's' : ''} from now` : `${Math.abs(days)} day${Math.abs(days) !== 1 ? 's' : ''} overdue`})`,
        `   ${weightStr}`,
        `   ${diffStr}`,
        `   ${classDiffStr}`,
        descStr ? `   ${descStr}` : '',
      ]
        .filter(Boolean)
        .join('\n');
    })
    .join('\n\n');

  return `
You are an academic priority assistant helping a UW Bothell CSS student manage their workload.

Today's date: ${today}

## Your Task
Rank the following assignments from HIGHEST to LOWEST priority so the student knows what to work on first.

## Scoring Rubric (reason step by step before ranking)
Use a weighted scoring model:

1. **Urgency** (40%): Overdue > due today > ≤2 days > ≤7 days > later.
   Overdue = very high urgency regardless of other factors.

2. **Grade Impact** (30%): Higher grade weight = higher priority.
   If weight is unspecified, assume it is moderately important (~20%).

3. **Effort Required** (30%): Combine assignment difficulty × course difficulty.
   A hard assignment in a hard course requires the most lead time.
   Start harder tasks earlier even if due date is slightly further away.

## Output Rules
- Return ONLY valid JSON, no markdown fences, no explanation outside JSON.
- Every assignment in the input must appear exactly once in the output.
- Explanations must be 1–2 sentences, specific to THIS student's situation
  (mention due date, grade weight, and difficulty where relevant).

JSON shape:
{
  "priorityList": [
    {
      "assignmentId": "<exact id from input>",
      "explanation": "<1–2 sentence specific reason>"
    }
  ]
}

## Assignments to rank:
${list}
`.trim();
}

// ---------------------------------------------------------------------------
// Response parser
// ---------------------------------------------------------------------------

function isPriorityResult(value: unknown): value is PriorityResult {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.assignmentId === 'string' &&
    typeof obj.explanation === 'string'
  );
}

function parseGroqResponse(body: unknown): PriorityResult[] {
  if (typeof body !== 'object' || body === null) {
    throw new GroqServiceError('parse', 'Groq response body is not an object');
  }

  const obj = body as Record<string, unknown>;
  const candidates = obj.choices;

  if (!Array.isArray(candidates) || candidates.length === 0) {
    throw new GroqServiceError('parse', 'No choices returned from Groq');
  }

  const firstCandidate = candidates[0] as Record<string, unknown>;
  const content = firstCandidate.message as Record<string, unknown> | undefined;
  const text = content?.content;

  if (typeof text !== 'string') {
    throw new GroqServiceError('parse', 'Groq response text missing');
  }

  const cleaned = text
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  let parsed: unknown;

  try {
    parsed = JSON.parse(cleaned);
  } catch {
    if (import.meta.env.DEV) {
      console.error('[GROQ] Failed JSON text:', cleaned);
    }
    throw new GroqServiceError('parse', 'Failed to parse Groq JSON response');
  }

  let priorityItems: unknown[];

  if (Array.isArray(parsed)) {
    priorityItems = parsed;
  } else {
    if (typeof parsed !== 'object' || parsed === null) {
      throw new GroqServiceError('parse', 'Parsed Groq response is not an array or object');
    }

    const obj = parsed as Record<string, unknown>;
    const wrappedList =
      obj.priorityList ?? obj.priorities ?? obj.results ?? obj.items ?? obj.assignments;

    if (!Array.isArray(wrappedList)) {
      throw new GroqServiceError('parse', 'Parsed Groq response does not contain a priority list array');
    }

    priorityItems = wrappedList;
  }

  const results: PriorityResult[] = [];

  for (const item of priorityItems) {
    if (!isPriorityResult(item)) {
      throw new GroqServiceError('parse', `Invalid PriorityResult: ${JSON.stringify(item)}`);
    }
    results.push(item);
  }

  return results;
}

// ---------------------------------------------------------------------------
// GroqService
// ---------------------------------------------------------------------------

export const groqService = {
  async prioritize(assignments: AssignmentPayload[]): Promise<PriorityResult[]> {
    const apiKey = import.meta.env.VITE_GROQ_API_KEY as string | undefined;

    if (!apiKey?.trim()) {
      throw new GroqServiceError('http', 'Missing VITE_GROQ_API_KEY in .env');
    }

    const model =
      (import.meta.env.VITE_GROQ_MODEL as string | undefined)?.trim() ||
      DEFAULT_GROQ_MODEL;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const requestBody = {
      model,
      messages: [
        {
          role: 'system',
          content:
            'You are an academic priority assistant for UW Bothell CSS students. ' +
            'You analyze assignment urgency, grade weight, and difficulty to rank work. ' +
            'Return only JSON that matches the requested shape, no markdown fences.',
        },
        {
          role: 'user',
          content: buildPrompt(assignments),
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.15,
      max_completion_tokens: 1024,
      stream: false,
    };

    let response: Response;

    try {
      response = await fetch(GROQ_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });
    } catch (err) {
      clearTimeout(timeoutId);
      if (err instanceof Error && err.name === 'AbortError') {
        throw new GroqServiceError('timeout', 'Groq request timed out');
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      let errorText = '';
      try {
        errorText = await response.text();
      } catch {
        errorText = 'Unable to read error body';
      }

      if (import.meta.env.DEV) {
        console.error('[GROQ] API ERROR BODY:', errorText);
      }

      throw new GroqServiceError(
        'http',
        `Groq API error ${response.status}: ${errorText}`,
        response.status
      );
    }

    let responseBody: unknown;

    try {
      responseBody = await response.json();
    } catch {
      throw new GroqServiceError('parse', 'Failed to parse Groq response JSON');
    }

    if (import.meta.env.DEV) {
      console.log('[GROQ] Success:', responseBody);
    }

    return parseGroqResponse(responseBody);
  },
};

export default groqService;

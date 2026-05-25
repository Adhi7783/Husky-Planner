import type { AssignmentPayload, PriorityResult } from '../types';

// ---------------------------------------------------------------------------
// Typed error class
// ---------------------------------------------------------------------------

export type GeminiErrorKind = 'http' | 'timeout' | 'parse';

export class GeminiServiceError extends Error {
  readonly kind: GeminiErrorKind;
  readonly statusCode?: number;

  constructor(kind: GeminiErrorKind, message: string, statusCode?: number) {
    super(message);

    this.name = 'GeminiServiceError';
    this.kind = kind;
    this.statusCode = statusCode;

    Object.setPrototypeOf(this, new.target.prototype);
  }
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// IMPORTANT:
// Use v1beta instead of v1
const GEMINI_ENDPOINT =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

const TIMEOUT_MS = 30_000;

// ---------------------------------------------------------------------------
// Prompt builder
// ---------------------------------------------------------------------------

function buildPrompt(assignments: AssignmentPayload[]): string {
  const list = assignments
    .map((a, i) => {
      const desc = a.description
        ? `\n   Description: ${a.description}`
        : '';

      return (
        `${i + 1}. ID: ${a.id}\n` +
        `   Name: ${a.name}\n` +
        `   Due Date: ${a.dueDate}\n` +
        `   Class: ${a.className}` +
        desc
      );
    })
    .join('\n\n');

  return `
You are an academic planner assistant.

Analyze the assignments below and rank them from highest priority to lowest priority.

Prioritize based on:
- due date proximity
- workload
- urgency
- dependencies

Assignments:
${list}

Return ONLY valid JSON.

Format:
[
  {
    "assignmentId": "abc123",
    "explanation": "Due soon and likely requires significant effort."
  }
]
`.trim();
}

// ---------------------------------------------------------------------------
// Response parser
// ---------------------------------------------------------------------------

function isPriorityResult(value: unknown): value is PriorityResult {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const obj = value as Record<string, unknown>;

  return (
    typeof obj.assignmentId === 'string' &&
    typeof obj.explanation === 'string'
  );
}

function parseGeminiResponse(body: unknown): PriorityResult[] {
  if (typeof body !== 'object' || body === null) {
    throw new GeminiServiceError(
      'parse',
      'Gemini response body is not an object'
    );
  }

  const obj = body as Record<string, unknown>;

  const candidates = obj.candidates;

  if (!Array.isArray(candidates) || candidates.length === 0) {
    throw new GeminiServiceError(
      'parse',
      'No candidates returned from Gemini'
    );
  }

  const firstCandidate = candidates[0] as Record<string, unknown>;

  const content = firstCandidate.content as
    | Record<string, unknown>
    | undefined;

  const parts = content?.parts;

  if (!Array.isArray(parts) || parts.length === 0) {
    throw new GeminiServiceError(
      'parse',
      'No content parts returned from Gemini'
    );
  }

  const firstPart = parts[0] as Record<string, unknown>;

  const text = firstPart.text;

  if (typeof text !== 'string') {
    throw new GeminiServiceError(
      'parse',
      'Gemini response text missing'
    );
  }

  // Remove markdown fences if Gemini adds them
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
    console.error('[GEMINI] Failed JSON text:', cleaned);

    throw new GeminiServiceError(
      'parse',
      'Failed to parse Gemini JSON response'
    );
  }

  if (!Array.isArray(parsed)) {
    throw new GeminiServiceError(
      'parse',
      'Parsed Gemini response is not an array'
    );
  }

  const results: PriorityResult[] = [];

  for (const item of parsed) {
    if (!isPriorityResult(item)) {
      throw new GeminiServiceError(
        'parse',
        `Invalid PriorityResult: ${JSON.stringify(item)}`
      );
    }

    results.push(item);
  }

  return results;
}

// ---------------------------------------------------------------------------
// GeminiService
// ---------------------------------------------------------------------------

export const geminiService = {
  async prioritize(
    assignments: AssignmentPayload[]
  ): Promise<PriorityResult[]> {
    console.log(
      `[GEMINI] prioritize() called with ${assignments.length} assignments`
    );

    const apiKey = import.meta.env.VITE_GEMINI_API_KEY as
      | string
      | undefined;

    if (!apiKey?.trim()) {
      throw new GeminiServiceError(
        'http',
        'Missing VITE_GEMINI_API_KEY in .env'
      );
    }

    const controller = new AbortController();

    const timeoutId = setTimeout(() => {
      controller.abort();
    }, TIMEOUT_MS);

    const requestBody = {
      contents: [
        {
          parts: [
            {
              text: buildPrompt(assignments),
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: 'application/json',
      },
    };

    let response: Response;

    try {
      console.log('[GEMINI] Sending request...');

      response = await fetch(
        `${GEMINI_ENDPOINT}?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        }
      );
    } catch (err) {
      clearTimeout(timeoutId);

      if (err instanceof Error && err.name === 'AbortError') {
        throw new GeminiServiceError(
          'timeout',
          'Gemini request timed out'
        );
      }

      throw err;
    } finally {
      clearTimeout(timeoutId);
    }

    // IMPORTANT:
    // Read full error body from Gemini
    if (!response.ok) {
      let errorText = '';

      try {
        errorText = await response.text();
      } catch {
        errorText = 'Unable to read error body';
      }

      console.error('[GEMINI] API ERROR BODY:', errorText);

      throw new GeminiServiceError(
        'http',
        `Gemini API error ${response.status}: ${errorText}`,
        response.status
      );
    }

    let responseBody: unknown;

    try {
      responseBody = await response.json();
    } catch {
      throw new GeminiServiceError(
        'parse',
        'Failed to parse Gemini response JSON'
      );
    }

    console.log('[GEMINI] Success:', responseBody);

    return parseGeminiResponse(responseBody);
  },
};

export default geminiService;
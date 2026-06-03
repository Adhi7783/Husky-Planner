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

// IMPORTANT:
// Groq uses an OpenAI-compatible chat completions endpoint.
const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';

const DEFAULT_GROQ_MODEL = 'llama-3.1-8b-instant';

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
{
  "priorityList": [
    {
      "assignmentId": "abc123",
      "explanation": "Due soon and likely requires significant effort."
    }
  ]
}
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

function parseGroqResponse(body: unknown): PriorityResult[] {
  if (typeof body !== 'object' || body === null) {
    throw new GroqServiceError(
      'parse',
      'Groq response body is not an object'
    );
  }

  const obj = body as Record<string, unknown>;

  const candidates = obj.choices;

  if (!Array.isArray(candidates) || candidates.length === 0) {
    throw new GroqServiceError(
      'parse',
      'No choices returned from Groq'
    );
  }

  const firstCandidate = candidates[0] as Record<string, unknown>;

  const content = firstCandidate.message as
    | Record<string, unknown>
    | undefined;

  const text = content?.content;

  if (typeof text !== 'string') {
    throw new GroqServiceError(
      'parse',
      'Groq response text missing'
    );
  }

  // Remove markdown fences if the model wraps the JSON in a code block
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

    throw new GroqServiceError(
      'parse',
      'Failed to parse Groq JSON response'
    );
  }

  let priorityItems: unknown[];

  if (Array.isArray(parsed)) {
    priorityItems = parsed;
  } else {
    if (typeof parsed !== 'object' || parsed === null) {
      throw new GroqServiceError(
        'parse',
        'Parsed Groq response is not an array or object'
      );
    }

    const obj = parsed as Record<string, unknown>;
    const wrappedList =
      obj.priorityList ?? obj.priorities ?? obj.results ?? obj.items ?? obj.assignments;

    if (!Array.isArray(wrappedList)) {
      throw new GroqServiceError(
        'parse',
        'Parsed Groq response does not contain a priority list array'
      );
    }

    priorityItems = wrappedList;
  }

  const results: PriorityResult[] = [];

  for (const item of priorityItems) {
    if (!isPriorityResult(item)) {
      throw new GroqServiceError(
        'parse',
        `Invalid PriorityResult: ${JSON.stringify(item)}`
      );
    }

    results.push(item);
  }

  return results;
}

// ---------------------------------------------------------------------------
// GroqService
// ---------------------------------------------------------------------------

export const groqService = {
  async prioritize(
    assignments: AssignmentPayload[]
  ): Promise<PriorityResult[]> {
    const apiKey = import.meta.env.VITE_GROQ_API_KEY as
      | string
      | undefined;

    if (!apiKey?.trim()) {
      throw new GroqServiceError(
        'http',
        'Missing VITE_GROQ_API_KEY in .env'
      );
    }

    const model =
      (import.meta.env.VITE_GROQ_MODEL as string | undefined)?.trim() ||
      DEFAULT_GROQ_MODEL;

    const controller = new AbortController();

    const timeoutId = setTimeout(() => {
      controller.abort();
    }, TIMEOUT_MS);

    const requestBody = {
      model,
      messages: [
        {
          role: 'system',
          content:
            'You are an academic planner assistant. Return only JSON that matches the requested shape.',
        },
        {
          role: 'user',
          content: buildPrompt(assignments),
        },
      ],
      response_format: {
        type: 'json_object',
      },
      temperature: 0.2,
      max_completion_tokens: 512,
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

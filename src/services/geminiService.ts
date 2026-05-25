import type { AssignmentPayload, PriorityResult } from '../types';

// ---------------------------------------------------------------------------
// Typed error class
// ---------------------------------------------------------------------------

export type GeminiErrorKind = 'http' | 'timeout' | 'parse';

/**
 * Typed error thrown by GeminiService for all failure modes:
 * - 'http'    — non-2xx HTTP response from the Gemini API
 * - 'timeout' — request exceeded the 30-second AbortController timeout
 * - 'parse'   — response body could not be parsed into PriorityResult[]
 */
export class GeminiServiceError extends Error {
  readonly kind: GeminiErrorKind;
  readonly statusCode?: number;

  constructor(kind: GeminiErrorKind, message: string, statusCode?: number) {
    super(message);
    this.name = 'GeminiServiceError';
    this.kind = kind;
    this.statusCode = statusCode;
    // Restore prototype chain (required when extending built-in Error in TS)
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const GEMINI_ENDPOINT =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

const TIMEOUT_MS = 30_000;

// ---------------------------------------------------------------------------
// Prompt builder
// ---------------------------------------------------------------------------

function buildPrompt(assignments: AssignmentPayload[]): string {
  const list = assignments
    .map((a, i) => {
      const desc = a.description ? `\n   Description: ${a.description}` : '';
      return (
        `${i + 1}. ID: ${a.id}\n` +
        `   Name: ${a.name}\n` +
        `   Due Date: ${a.dueDate}\n` +
        `   Class: ${a.className}` +
        desc
      );
    })
    .join('\n\n');

  return (
    'You are an academic planner assistant. Analyze the following assignments and ' +
    'return a prioritized list ordered from highest to lowest priority.\n\n' +
    'For each assignment, provide a concise explanation that references at least one ' +
    'concrete prioritization factor such as due date proximity, estimated effort, or ' +
    'dependencies between assignments.\n\n' +
    'Assignments:\n' +
    list +
    '\n\n' +
    'Respond with ONLY a valid JSON array (no markdown, no code fences) in this exact format:\n' +
    '[\n' +
    '  { "assignmentId": "<id>", "explanation": "<explanation referencing a concrete factor>" },\n' +
    '  ...\n' +
    ']\n\n' +
    'The array must contain exactly one entry per assignment, ordered by priority ' +
    '(highest priority first). Do not include any text outside the JSON array.'
  );
}

// ---------------------------------------------------------------------------
// Response parser
// ---------------------------------------------------------------------------

function isPriorityResult(value: unknown): value is PriorityResult {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.assignmentId === 'string' &&
    typeof obj.explanation === 'string' &&
    obj.explanation.trim().length > 0
  );
}

function parseGeminiResponse(body: unknown): PriorityResult[] {
  // Gemini REST response shape:
  // { candidates: [{ content: { parts: [{ text: "..." }] } }] }
  if (typeof body !== 'object' || body === null) {
    throw new GeminiServiceError('parse', 'Response body is not an object');
  }

  const obj = body as Record<string, unknown>;
  const candidates = obj.candidates;

  if (!Array.isArray(candidates) || candidates.length === 0) {
    throw new GeminiServiceError('parse', 'No candidates in Gemini response');
  }

  const firstCandidate = candidates[0] as Record<string, unknown>;
  const content = firstCandidate?.content as Record<string, unknown> | undefined;
  const parts = content?.parts;

  if (!Array.isArray(parts) || parts.length === 0) {
    throw new GeminiServiceError('parse', 'No parts in Gemini response candidate');
  }

  const firstPart = parts[0] as Record<string, unknown>;
  const text = firstPart?.text;

  if (typeof text !== 'string') {
    throw new GeminiServiceError('parse', 'Response part text is not a string');
  }

  // Strip optional markdown code fences that the model may include despite instructions
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new GeminiServiceError(
      'parse',
      `Could not parse Gemini response as JSON: ${cleaned.slice(0, 200)}`
    );
  }

  if (!Array.isArray(parsed)) {
    throw new GeminiServiceError('parse', 'Parsed Gemini response is not an array');
  }

  const results: PriorityResult[] = [];
  for (const item of parsed) {
    if (!isPriorityResult(item)) {
      throw new GeminiServiceError(
        'parse',
        `Invalid PriorityResult entry: ${JSON.stringify(item)}`
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
  /**
   * Sends all provided assignments to the Gemini API and returns them ordered
   * by priority, each with an explanation referencing a concrete factor.
   *
   * @throws {GeminiServiceError} with kind 'http'    on non-2xx HTTP status
   * @throws {GeminiServiceError} with kind 'timeout' when the request exceeds 30 s
   * @throws {GeminiServiceError} with kind 'parse'   on unparseable response
   */
  async prioritize(assignments: AssignmentPayload[]): Promise<PriorityResult[]> {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;

    if (!apiKey?.trim()) {
      throw new GeminiServiceError(
        'http',
        'Gemini API key is not configured. Add VITE_GEMINI_API_KEY to a .env file in the project root and restart the dev server.'
      );
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const requestBody = {
      contents: [
        {
          parts: [{ text: buildPrompt(assignments) }],
        },
      ],
    };

    let response: Response;
    try {
      response = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey ?? ''}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });
    } catch (err) {
      clearTimeout(timeoutId);
      // AbortController fires a DOMException with name 'AbortError'
      if (err instanceof Error && err.name === 'AbortError') {
        throw new GeminiServiceError(
          'timeout',
          'Gemini API request timed out after 30 seconds'
        );
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      throw new GeminiServiceError(
        'http',
        `Gemini API returned HTTP ${response.status}: ${response.statusText}`,
        response.status
      );
    }

    let responseBody: unknown;
    try {
      responseBody = await response.json();
    } catch {
      throw new GeminiServiceError('parse', 'Failed to parse Gemini API response as JSON');
    }

    return parseGeminiResponse(responseBody);
  },
};

export default geminiService;

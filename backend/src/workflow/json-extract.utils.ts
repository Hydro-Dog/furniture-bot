export interface ParsedAiText {
  json: Record<string, unknown> | null;
  summary: string | null;
}

export function parseAiJsonAndSummary(text: string): ParsedAiText {
  const cleaned = text.trim();
  const fencedMatch = cleaned.match(/```json\s*([\s\S]*?)```/i);
  const jsonCandidate = fencedMatch?.[1] || extractFirstJsonObject(cleaned);

  if (!jsonCandidate) {
    return {
      json: null,
      summary: cleaned || null
    };
  }

  try {
    const parsed = JSON.parse(jsonCandidate) as Record<string, unknown>;
    const summary = cleaned
      .replace(fencedMatch?.[0] || jsonCandidate, '')
      .trim();

    return {
      json: parsed,
      summary: summary || null
    };
  } catch {
    return {
      json: null,
      summary: cleaned || null
    };
  }
}

function extractFirstJsonObject(text: string): string | null {
  const start = text.indexOf('{');
  if (start === -1) {
    return null;
  }

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < text.length; index += 1) {
    const char = text[index];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === '\\') {
      escaped = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) {
      continue;
    }

    if (char === '{') {
      depth += 1;
    }

    if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return text.slice(start, index + 1);
      }
    }
  }

  return null;
}


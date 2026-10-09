/**
 * LogEasy Robust AI JSON Parsing & Repair Utility
 * Gracefully parses AI-generated JSON even when markdown fences,
 * unescaped newlines, leading/trailing conversational text, or
 * truncated/unterminated strings are present.
 */

export function safeParseJSON<T = any>(raw: any, fallback: T): T {
  if (raw === null || raw === undefined) return fallback;
  if (typeof raw === 'object') return raw as T;
  if (typeof raw !== 'string') return fallback;

  let text = raw.trim();
  if (!text) return fallback;

  // 1. Strip markdown code fences (```json ... ``` or ``` ... ```)
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (codeBlockMatch) {
    text = codeBlockMatch[1].trim();
  } else {
    text = text
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim();
  }

  // 2. Try direct JSON.parse
  try {
    return JSON.parse(text);
  } catch (err1) {
    // Continue to advanced repair passes
  }

  // 3. Extract outermost JSON object { ... } or array [ ... ]
  const firstBrace = text.indexOf('{');
  const firstBracket = text.indexOf('[');
  let startIdx = -1;
  let isArray = false;

  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    startIdx = firstBrace;
    isArray = false;
  } else if (firstBracket !== -1) {
    startIdx = firstBracket;
    isArray = true;
  }

  if (startIdx !== -1) {
    const closeChar = isArray ? ']' : '}';
    const lastCloseIdx = text.lastIndexOf(closeChar);
    let candidate = lastCloseIdx > startIdx ? text.substring(startIdx, lastCloseIdx + 1) : text.substring(startIdx);

    // Pass 3a: direct parse of extracted candidate
    try {
      return JSON.parse(candidate);
    } catch (err2) {
      // Pass 3b: fix unescaped newlines/tabs inside strings
      try {
        const sanitized = sanitizeUnescapedControlChars(candidate);
        return JSON.parse(sanitized);
      } catch (err3) {
        // Pass 3c: auto-close unterminated strings and unclosed brackets
        try {
          const autoClosed = autoCloseJSON(candidate);
          return JSON.parse(autoClosed);
        } catch (err4) {
          // Pass 3d: sanitize control chars + auto-close
          try {
            const combined = autoCloseJSON(sanitizeUnescapedControlChars(candidate));
            return JSON.parse(combined);
          } catch (err5) {
            // Fall through to regex extraction
          }
        }
      }
    }
  }

  // 4. Regex-based key extraction when fallback is an object schema
  if (fallback && typeof fallback === 'object' && !Array.isArray(fallback)) {
    try {
      const extractedObj: any = { ...fallback };
      let foundAny = false;

      for (const key of Object.keys(fallback as object)) {
        // Match string field: "key": "value..." (handles escaped quotes and unterminated strings)
        const strRegex = new RegExp(`"${key}"\\s*:\\s*"([^"\\\\]*(?:\\\\.[^"\\\\]*)*)(?:"|$)`, 'i');
        const strMatch = text.match(strRegex);
        if (strMatch) {
          extractedObj[key] = strMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
          foundAny = true;
          continue;
        }

        // Match array field: "key": [ ... ]
        const arrRegex = new RegExp(`"${key}"\\s*:\\s*\\[([\\s\\S]*?)(?:\\]|$)`, 'i');
        const arrMatch = text.match(arrRegex);
        if (arrMatch) {
          try {
            const parsedArr = JSON.parse(`[${arrMatch[1].replace(/,\s*$/, '')}]`);
            if (Array.isArray(parsedArr) && parsedArr.length > 0) {
              extractedObj[key] = parsedArr;
              foundAny = true;
              continue;
            }
          } catch {
            // Fallback: extract individual quoted strings inside the array
            const itemMatches = arrMatch[1].match(/"([^"\\\\]*(?:\\\\.[^"\\\\]*)*)"/g);
            if (itemMatches && itemMatches.length > 0) {
              extractedObj[key] = itemMatches.map(m => m.slice(1, -1).replace(/\\n/g, '\n').replace(/\\"/g, '"'));
              foundAny = true;
              continue;
            }
          }
        }
      }

      if (foundAny) {
        return extractedObj as T;
      }
    } catch {
      // Return fallback
    }
  }

  return fallback;
}

/**
 * Escapes unescaped newlines and carriage returns that occur inside JSON string literals.
 */
function sanitizeUnescapedControlChars(str: string): string {
  let inString = false;
  let escaped = false;
  let result = '';

  for (let i = 0; i < str.length; i++) {
    const char = str[i];

    if (escaped) {
      result += char;
      escaped = false;
      continue;
    }

    if (char === '\\') {
      result += char;
      escaped = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      result += char;
      continue;
    }

    if (inString) {
      if (char === '\n') {
        result += '\\n';
        continue;
      }
      if (char === '\r') {
        continue;
      }
      if (char === '\t') {
        result += '\\t';
        continue;
      }
    }

    result += char;
  }

  return result;
}

/**
 * Repairs truncated JSON by closing open quotes, arrays, and objects.
 */
function autoCloseJSON(str: string): string {
  let inString = false;
  let escaped = false;
  const stack: ('{' | '[')[] = [];

  for (let i = 0; i < str.length; i++) {
    const char = str[i];

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

    if (!inString) {
      if (char === '{' || char === '[') {
        stack.push(char);
      } else if (char === '}') {
        if (stack.length > 0 && stack[stack.length - 1] === '{') {
          stack.pop();
        }
      } else if (char === ']') {
        if (stack.length > 0 && stack[stack.length - 1] === '[') {
          stack.pop();
        }
      }
    }
  }

  let repaired = str.trim();

  // If ended mid-string, close the quote
  if (inString) {
    repaired += '"';
  }

  // Remove any trailing comma right before closing brackets
  repaired = repaired.replace(/,\s*$/, '');

  // Close remaining open brackets in reverse order
  while (stack.length > 0) {
    const open = stack.pop();
    repaired += open === '{' ? '}' : ']';
  }

  return repaired;
}

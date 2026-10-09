import { describe, it, expect } from 'vitest';
import { safeParseJSON } from '../json_helper';

describe('safeParseJSON AI JSON repair utility', () => {
  it('parses pristine JSON correctly', () => {
    const raw = '{"strategy": "Micro habits", "milestones": ["M1", "M2"]}';
    const parsed = safeParseJSON(raw, {});
    expect(parsed).toEqual({ strategy: 'Micro habits', milestones: ['M1', 'M2'] });
  });

  it('handles markdown fences ```json ... ``` and surrounding conversational prose', () => {
    const raw = `Here is your strategy:
\`\`\`json
{
  "strategy": "Wake up early",
  "decisions": "Sleep by 11pm"
}
\`\`\`
Hope this helps!`;
    const parsed = safeParseJSON<any>(raw, {});
    expect(parsed.strategy).toBe('Wake up early');
    expect(parsed.decisions).toBe('Sleep by 11pm');
  });

  it('handles raw unescaped newlines inside strings', () => {
    const raw = `{\n  "strategy": "Line 1\nLine 2",\n  "decisions": "None"\n}`;
    const parsed = safeParseJSON<any>(raw, {});
    expect(parsed.strategy).toBe('Line 1\nLine 2');
  });

  it('repairs truncated / unterminated string in JSON (the exact error report)', () => {
    // Simulating token cutoff mid-string at line 8 column 330
    const raw = `{\n  "strategy": "Phase 1 is starting now and we will build a very long road towards wellness and cognitive focus that covers everything in the life system,\n  "milestones": ["Step 1", "Step 2"],\n  "decisions": "Audit evening routine`;
    const fallback = {
      strategy: 'fallback strategy',
      milestones: [],
      decisions: 'fallback decision',
      opportunities: 'fallback opp'
    };
    const parsed = safeParseJSON(raw, fallback);
    expect(parsed.strategy).toBeDefined();
    expect(parsed.decisions).toContain('Audit evening routine');
  });

  it('recovers fields via regex when JSON is severely malformed', () => {
    const raw = `Not valid json at all: "strategy": "Focus on rest and recovery", "decisions": "Turn off screens early"`;
    const fallback = {
      strategy: 'default',
      decisions: 'default'
    };
    const parsed = safeParseJSON(raw, fallback);
    expect(parsed.strategy).toBe('Focus on rest and recovery');
    expect(parsed.decisions).toBe('Turn off screens early');
  });

  it('returns fallback gracefully when input is empty or null', () => {
    expect(safeParseJSON('', { fallback: true })).toEqual({ fallback: true });
    expect(safeParseJSON(null, { fallback: true })).toEqual({ fallback: true });
  });
});

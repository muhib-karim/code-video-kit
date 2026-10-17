export type DiffLineType = 'add' | 'remove' | 'context';

export interface DiffLine {
  type: DiffLineType;
  /** Line text without the leading marker. */
  text: string;
  /** Line number in the old file (undefined for added lines). */
  oldNumber?: number;
  /** Line number in the new file (undefined for removed lines). */
  newNumber?: number;
}

/**
 * Parses a minimal unified diff body: each line starts with "+", "-" or " ".
 * Header lines ("+++", "---", "@@") are skipped. Lines with no marker are
 * treated as context so hand-written diffs stay forgiving.
 */
export function parseUnifiedDiff(text: string): DiffLine[] {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  if (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();
  const out: DiffLine[] = [];
  let oldNo = 1;
  let newNo = 1;
  for (const line of lines) {
    if (line.startsWith('+++') || line.startsWith('---')) continue;
    if (line.startsWith('@@')) {
      const m = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(line);
      if (m) {
        oldNo = Number(m[1]);
        newNo = Number(m[2]);
      }
      continue;
    }
    if (line.startsWith('+')) {
      out.push({ type: 'add', text: line.slice(1), newNumber: newNo++ });
    } else if (line.startsWith('-')) {
      out.push({ type: 'remove', text: line.slice(1), oldNumber: oldNo++ });
    } else {
      const body = line.startsWith(' ') ? line.slice(1) : line;
      out.push({ type: 'context', text: body, oldNumber: oldNo++, newNumber: newNo++ });
    }
  }
  return out;
}

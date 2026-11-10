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
 * File/hunk headers and git metadata are skipped. Inside a hunk, leading
 * "+"/"-" characters belong to the changed line. Unmarked lines are treated
 * as context so hand-written diffs stay forgiving.
 *
 * Without a hunk header, "--- x" is only a file header when the next line is
 * "+++ y" (headers always come as a pair); otherwise it is a removed line
 * whose text starts with "-- ", such as an SQL comment.
 */
export function parseUnifiedDiff(text: string): DiffLine[] {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  if (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();
  const out: DiffLine[] = [];
  let oldNo = 1;
  let newNo = 1;
  let inHunk = false;
  // True between a "diff --git" line and its first hunk: everything there
  // (index, file modes, renames, ---/+++, "Binary files ...") is metadata.
  let inGitHeader = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('diff --git ')) {
      inHunk = false;
      inGitHeader = true;
      continue;
    }
    if (line === '\\ No newline at end of file') continue;
    if (line.startsWith('@@')) {
      const m = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(line);
      if (m) {
        oldNo = Number(m[1]);
        newNo = Number(m[2]);
        inHunk = true;
      }
      inGitHeader = false;
      continue;
    }
    if (inGitHeader) continue;
    if (!inHunk) {
      if (/^index [0-9a-f]{4,}\.\.[0-9a-f]{4,}/.test(line)) continue;
      if (/^---[ \t]/.test(line) && /^\+\+\+[ \t]/.test(lines[i + 1] ?? '')) {
        i += 1; // skip the "+++" half of the header pair too
        continue;
      }
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

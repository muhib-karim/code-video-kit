/**
 * A small, dependency-free syntax tokenizer for TypeScript/JavaScript,
 * Python and Bash. It is intentionally simple (regex rules, no grammar) but
 * good enough for colouring short snippets in videos.
 *
 * Guarantee: concatenating the `text` of every token of every line, joined
 * with "\n", reproduces the input exactly.
 */

export type Language = 'ts' | 'js' | 'py' | 'bash';

export type TokenType =
  | 'plain'
  | 'keyword'
  | 'string'
  | 'comment'
  | 'number'
  | 'function'
  | 'type'
  | 'operator'
  | 'punctuation';

export interface Token {
  type: TokenType;
  text: string;
}

const TS_KEYWORDS = new Set([
  'abstract', 'as', 'async', 'await', 'break', 'case', 'catch', 'class', 'const', 'continue', 'debugger',
  'declare', 'default', 'delete', 'do', 'else', 'enum', 'export', 'extends', 'false', 'finally', 'for',
  'from', 'function', 'get', 'if', 'implements', 'import', 'in', 'instanceof', 'interface', 'keyof', 'let',
  'new', 'null', 'of', 'private', 'protected', 'public', 'readonly', 'return', 'satisfies', 'set', 'static',
  'super', 'switch', 'this', 'throw', 'true', 'try', 'type', 'typeof', 'undefined', 'var', 'void', 'while',
  'with', 'yield',
]);

const TS_TYPES = new Set([
  'any', 'bigint', 'boolean', 'never', 'number', 'object', 'string', 'symbol', 'unknown',
]);

const PY_KEYWORDS = new Set([
  'False', 'None', 'True', 'and', 'as', 'assert', 'async', 'await', 'break', 'class', 'continue', 'def',
  'del', 'elif', 'else', 'except', 'finally', 'for', 'from', 'global', 'if', 'import', 'in', 'is', 'lambda',
  'match', 'case', 'nonlocal', 'not', 'or', 'pass', 'raise', 'return', 'try', 'while', 'with', 'yield',
]);

const PY_BUILTINS = new Set([
  'self', 'cls', 'int', 'float', 'str', 'bool', 'list', 'dict', 'set', 'tuple', 'bytes', 'object', 'type',
]);

const BASH_KEYWORDS = new Set([
  'if', 'then', 'else', 'elif', 'fi', 'for', 'in', 'do', 'done', 'while', 'until', 'case', 'esac',
  'function', 'return', 'export', 'local', 'readonly', 'set', 'unset',
]);

type Classifier = (match: string, code: string, end: number, state: ScanState) => TokenType;

interface Rule {
  re: RegExp;
  type: TokenType | Classifier;
  /** Optional guard on the character before the match. */
  guard?: (code: string, pos: number) => boolean;
}

interface ScanState {
  /** Bash: true when the next word is in command position. */
  expectCommand: boolean;
}

const afterSpaceOrStart = (code: string, pos: number) => pos === 0 || /\s/.test(code[pos - 1]);

function isCallAhead(code: string, end: number): boolean {
  return /^\s*\(/.test(code.slice(end, end + 32));
}

const tsIdentifier: Classifier = (word, code, end) => {
  if (TS_KEYWORDS.has(word)) return 'keyword';
  if (TS_TYPES.has(word)) return 'type';
  if (isCallAhead(code, end)) return 'function';
  if (/^[A-Z]/.test(word)) return 'type';
  return 'plain';
};

const pyIdentifier: Classifier = (word, code, end) => {
  if (PY_KEYWORDS.has(word)) return 'keyword';
  if (isCallAhead(code, end)) return 'function';
  if (PY_BUILTINS.has(word)) return 'type';
  if (/^[A-Z]/.test(word)) return 'type';
  return 'plain';
};

const bashWord: Classifier = (word, _code, _end, state) => {
  if (BASH_KEYWORDS.has(word)) {
    state.expectCommand = ['if', 'then', 'else', 'elif', 'do', 'while', 'until'].includes(word);
    return 'keyword';
  }
  if (state.expectCommand && !word.includes('=')) {
    state.expectCommand = false;
    return 'function';
  }
  return 'plain';
};

const NUMBER = /\b(?:0[xX][0-9a-fA-F_]+|0[bB][01_]+|\d[\d_]*(?:\.\d+)?(?:[eE][+-]?\d+)?n?)\b/y;

const RULES: Record<Language, Rule[]> = {
  ts: [
    { re: /\s+/y, type: 'plain' },
    { re: /\/\/[^\n]*/y, type: 'comment' },
    { re: /\/\*[\s\S]*?(?:\*\/|$)/y, type: 'comment' },
    { re: /`(?:\\[\s\S]|[^\\`])*`?/y, type: 'string' },
    { re: /"(?:\\.|[^"\\\n])*"?/y, type: 'string' },
    { re: /'(?:\\.|[^'\\\n])*'?/y, type: 'string' },
    { re: NUMBER, type: 'number' },
    { re: /[A-Za-z_$][\w$]*/y, type: tsIdentifier },
    { re: /=>|[+\-*/%=<>!&|^~?:]+/y, type: 'operator' },
    { re: /[{}()[\];,.@]/y, type: 'punctuation' },
  ],
  js: [],
  py: [
    { re: /\s+/y, type: 'plain' },
    { re: /#[^\n]*/y, type: 'comment' },
    { re: /(?:[rRbBfFuU]{1,2})?(?:"""[\s\S]*?(?:"""|$)|'''[\s\S]*?(?:'''|$))/y, type: 'string' },
    { re: /(?:[rRbBfFuU]{1,2})?"(?:\\.|[^"\\\n])*"?/y, type: 'string' },
    { re: /(?:[rRbBfFuU]{1,2})?'(?:\\.|[^'\\\n])*'?/y, type: 'string' },
    { re: /@[A-Za-z_][\w.]*/y, type: 'function' },
    { re: NUMBER, type: 'number' },
    { re: /[A-Za-z_][\w]*/y, type: pyIdentifier },
    { re: /->|[+\-*/%=<>!&|^~:]+/y, type: 'operator' },
    { re: /[{}()[\];,.]/y, type: 'punctuation' },
  ],
  bash: [
    { re: /\s+/y, type: 'plain' },
    { re: /#[^\n]*/y, type: 'comment', guard: afterSpaceOrStart },
    { re: /"(?:\\.|[^"\\])*"?/y, type: 'string' },
    { re: /'[^']*'?/y, type: 'string' },
    { re: /\$\{[^}\n]*\}?|\$[A-Za-z_]\w*|\$[0-9@#?$!*-]/y, type: 'type' },
    { re: /--?[A-Za-z0-9][\w-]*(?:=[^\s;|&]*)?/y, type: 'operator', guard: afterSpaceOrStart },
    { re: /\d+(?![^\s;|&)])/y, type: 'number' },
    { re: /&&|\|\||[|;]/y, type: 'operator' },
    { re: /[<>&]+|\\/y, type: 'operator' },
    { re: /\$\(|[(){}[\]]/y, type: 'punctuation' },
    { re: /[^\s"'$|&;()<>#\\[\]{}]+/y, type: bashWord },
  ],
};
RULES.js = RULES.ts;

/** Tokenizes `code` into lines of tokens. Always returns `code.split("\n").length` lines. */
export function tokenize(code: string, language: Language = 'ts'): Token[][] {
  const rules = RULES[language] ?? RULES.ts;
  const state: ScanState = { expectCommand: true };
  const flat: Token[] = [];
  let pos = 0;

  const push = (type: TokenType, text: string) => {
    flat.push({ type, text });
  };

  while (pos < code.length) {
    let matched = false;
    for (const rule of rules) {
      if (rule.guard && !rule.guard(code, pos)) continue;
      rule.re.lastIndex = pos;
      const m = rule.re.exec(code);
      if (!m || m[0].length === 0) continue;
      const text = m[0];
      const end = pos + text.length;
      const type = typeof rule.type === 'function' ? rule.type(text, code, end, state) : rule.type;
      if (language === 'bash') {
        if (type === 'plain' && text.includes('\n')) state.expectCommand = true;
        if (type === 'operator' && /^(?:&&|\|\||\||;)$/.test(text)) state.expectCommand = true;
        if (type === 'punctuation' && text === '$(') state.expectCommand = true;
      }
      push(type, text);
      pos = end;
      matched = true;
      break;
    }
    if (!matched) {
      push('plain', code[pos]);
      pos += 1;
    }
  }

  // Split tokens that contain newlines into per-line arrays.
  const lines: Token[][] = [[]];
  for (const token of flat) {
    const parts = token.text.split('\n');
    parts.forEach((part, i) => {
      if (i > 0) lines.push([]);
      if (part.length > 0) lines[lines.length - 1].push({ type: token.type, text: part });
    });
  }
  return lines;
}

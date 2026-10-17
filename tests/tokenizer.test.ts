import { describe, expect, it } from 'vitest';
import { tokenize, type Language, type Token } from '../src/lib/tokenizer';

const join = (lines: Token[][]) => lines.map((l) => l.map((t) => t.text).join('')).join('\n');
const find = (lines: Token[][], text: string) => lines.flat().find((t) => t.text === text);

describe('tokenize: round trip', () => {
  const samples: Array<[Language, string]> = [
    ['ts', "import { a } from 'b';\nconst x: number = 42; // answer\n\n/* block\ncomment */ fn(`tpl ${x}`);"],
    ['js', 'export default function add(a, b) {\n  return a + b * 0x1f;\n}\n'],
    ['py', 'def add(a, b):\n    """Doc\n    string"""\n    return a + b  # sum\n'],
    ['bash', 'npm install --save-dev vitest # dev\necho "$HOME" | grep -i user && ls -la\n'],
  ];
  it.each(samples)('%s reproduces the input exactly', (lang, code) => {
    expect(join(tokenize(code, lang))).toBe(code);
  });

  it('returns one array per line, including empty lines', () => {
    const lines = tokenize('a\n\nb', 'ts');
    expect(lines).toHaveLength(3);
    expect(lines[1]).toEqual([]);
  });

  it('handles empty input', () => {
    expect(tokenize('', 'ts')).toEqual([[]]);
  });
});

describe('tokenize: typescript', () => {
  const lines = tokenize("const total = sum(42, 'x'); // done", 'ts');
  it('classifies keywords, functions, numbers, strings, comments', () => {
    expect(find(lines, 'const')?.type).toBe('keyword');
    expect(find(lines, 'sum')?.type).toBe('function');
    expect(find(lines, '42')?.type).toBe('number');
    expect(find(lines, "'x'")?.type).toBe('string');
    expect(find(lines, '// done')?.type).toBe('comment');
    expect(find(lines, 'total')?.type).toBe('plain');
  });

  it('treats capitalised identifiers and primitive types as types', () => {
    const l = tokenize('let a: string = new Map();', 'ts');
    expect(find(l, 'string')?.type).toBe('type');
    expect(find(l, 'Map')?.type).toBe('function');
    const l2 = tokenize('const r: Record = x;', 'ts');
    expect(find(l2, 'Record')?.type).toBe('type');
  });

  it('keeps multi-line block comments as comment tokens on each line', () => {
    const l = tokenize('/* a\nb */ x', 'ts');
    expect(l[0][0]).toEqual({ type: 'comment', text: '/* a' });
    expect(l[1][0]).toEqual({ type: 'comment', text: 'b */' });
  });

  it('tokenizes template literals as strings', () => {
    const l = tokenize('const s = `hi`;', 'ts');
    expect(find(l, '`hi`')?.type).toBe('string');
  });
});

describe('tokenize: python', () => {
  const lines = tokenize('def add(a, b):\n    return a + b  # sum', 'py');
  it('classifies def/return and function names', () => {
    expect(find(lines, 'def')?.type).toBe('keyword');
    expect(find(lines, 'add')?.type).toBe('function');
    expect(find(lines, 'return')?.type).toBe('keyword');
    expect(find(lines, '# sum')?.type).toBe('comment');
  });

  it('recognises f-strings, decorators and None', () => {
    const l = tokenize('@cache\ndef f():\n    return f"x{1}" or None', 'py');
    expect(find(l, '@cache')?.type).toBe('function');
    expect(find(l, 'f"x{1}"')?.type).toBe('string');
    expect(find(l, 'None')?.type).toBe('keyword');
  });
});

describe('tokenize: bash', () => {
  it('colours the command word, flags, variables and comments', () => {
    const l = tokenize('npm install --save-dev vitest # dev', 'bash');
    expect(find(l, 'npm')?.type).toBe('function');
    expect(find(l, 'install')?.type).toBe('plain');
    expect(find(l, '--save-dev')?.type).toBe('operator');
    expect(find(l, '# dev')?.type).toBe('comment');
  });

  it('starts a new command after a pipe', () => {
    const l = tokenize('echo $HOME | grep x', 'bash');
    expect(find(l, 'echo')?.type).toBe('function');
    expect(find(l, '$HOME')?.type).toBe('type');
    expect(find(l, 'grep')?.type).toBe('function');
    expect(find(l, 'x')?.type).toBe('plain');
  });

  it('does not treat # inside a word as a comment', () => {
    const l = tokenize('echo a#b', 'bash');
    expect(l.flat().some((t) => t.type === 'comment')).toBe(false);
  });
});

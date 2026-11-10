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

describe('tokenize: bash line continuations', () => {
  it('keeps arguments after a backslash-newline out of command position', () => {
    const l = tokenize('curl -sS \\\n  https://example.com/api \\\n  -o out.json', 'bash');
    expect(find(l, 'curl')?.type).toBe('function');
    expect(find(l, 'https://example.com/api')?.type).toBe('plain');
    expect(find(l, 'out.json')?.type).toBe('plain');
  });

  it('still starts a new command after a plain newline, a blank line or an escaped backslash', () => {
    expect(find(tokenize('echo a\nls', 'bash'), 'ls')?.type).toBe('function');
    expect(find(tokenize('echo a \\\n\nls', 'bash'), 'ls')?.type).toBe('function');
    expect(find(tokenize('echo a \\\\\nls', 'bash'), 'ls')?.type).toBe('function');
  });

  it('keeps a double-quoted string that spans a backslash-newline as one string', () => {
    const code = 'echo "one \\\ntwo" && ls';
    const l = tokenize(code, 'bash');
    expect(join(l)).toBe(code);
    expect(l[0].map((t) => t.type)).toEqual(['function', 'plain', 'string']);
    expect(l[1][0]).toEqual({ type: 'string', text: 'two"' });
    expect(find(l, 'ls')?.type).toBe('function');
  });
});

describe('tokenize: unicode', () => {
  const splitsPair = (t: Token) => /[\ud800-\udbff]$/.test(t.text) || /^[\udc00-\udfff]/.test(t.text);

  it.each<Language>(['ts', 'js', 'py', 'bash'])('never splits a surrogate pair (%s)', (lang) => {
    const code = '<p>Hi 👋</p> 𝑥 = 1 # 🚀';
    const l = tokenize(code, lang);
    expect(join(l)).toBe(code);
    expect(l.flat().filter(splitsPair)).toEqual([]);
  });

  it('keeps an unpaired surrogate so the round trip stays exact', () => {
    const code = 'a \ud83d b';
    expect(join(tokenize(code, 'ts'))).toBe(code);
  });

  it('treats non-ASCII letters as part of identifiers', () => {
    const ts = tokenize('const naïve = café(1);', 'ts');
    expect(find(ts, 'naïve')?.type).toBe('plain');
    expect(find(ts, 'café')?.type).toBe('function');
    const py = tokenize('größe = länge(x)', 'py');
    expect(find(py, 'größe')?.type).toBe('plain');
    expect(find(py, 'länge')?.type).toBe('function');
  });
});

describe('tokenize: number literals', () => {
  it('colours octal, BigInt-suffixed and Python complex literals', () => {
    expect(find(tokenize('const m = 0o17;', 'ts'), '0o17')?.type).toBe('number');
    expect(find(tokenize('const big = 0xffn;', 'ts'), '0xffn')?.type).toBe('number');
    const py = tokenize('os.chmod(p, 0o755); z = 3j', 'py');
    expect(find(py, '0o755')?.type).toBe('number');
    expect(find(py, '3j')?.type).toBe('number');
  });
});

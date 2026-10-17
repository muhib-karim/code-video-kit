import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BenchmarkBars, benchmarkBarsDefaults } from '../src/components/BenchmarkBars';
import { SubtitleBar, subtitleBarDefaults } from '../src/components/SubtitleBar';
import { TerminalSession, terminalSessionDefaults } from '../src/components/TerminalSession';
import { LowerThird, lowerThirdDefaults } from '../src/components/LowerThird';
import { CodeHighlightSteps, codeHighlightStepsDefaults } from '../src/components/CodeHighlightSteps';

// Supply a composition clock without a browser; keep Remotion's animation math real.
const clock = vi.hoisted(() => ({ frame: 0, durationInFrames: 150 }));
vi.mock('remotion', async (importOriginal) => {
  const actual = await importOriginal<typeof import('remotion')>();
  return {
    ...actual,
    useCurrentFrame: () => clock.frame,
    useVideoConfig: () => ({ fps: 30, width: 1280, height: 720, durationInFrames: clock.durationInFrames }),
  };
});

beforeEach(() => { clock.frame = 0; clock.durationInFrames = 150; });

describe('short animation windows', () => {
  it('lets the lower-third entrance finish before a zero-length hold exits', () => {
    clock.frame = 37;
    const html = renderToStaticMarkup(createElement(LowerThird, { ...lowerThirdDefaults, holdFrames: 0 }));
    expect(html).toContain('clip-path:inset(0 0% 0 0)');
  });

  it('finishes the lower-third exit on the last frame of a short composition', () => {
    clock.frame = 19;
    clock.durationInFrames = 20;
    const html = renderToStaticMarkup(createElement(LowerThird, lowerThirdDefaults));
    expect(html).toContain('clip-path:inset(0 100% 0 0)');
  });

  it('does not skip the first highlight step when it is shorter than the entrance delay', () => {
    const props = {
      ...codeHighlightStepsDefaults,
      steps: [
        { lines: '1', label: 'First step marker', durationInFrames: 1 },
        { lines: '2', label: 'Second step marker', durationInFrames: 1 },
      ],
    };
    const first = renderToStaticMarkup(createElement(CodeHighlightSteps, props));
    expect(first).toContain('First step marker');
    expect(first).not.toContain('Second step marker');
    clock.frame = 1;
    const second = renderToStaticMarkup(createElement(CodeHighlightSteps, props));
    expect(second).toContain('Second step marker');
    expect(second).not.toContain('First step marker');
  });
});

describe('subtitle timing', () => {
  const render = (frame: number) => {
    clock.frame = frame;
    return renderToStaticMarkup(createElement(SubtitleBar, {
      ...subtitleBarDefaults,
      cues: [{ text: 'One frame cue', startSec: 1, endSec: 31 / 30 }],
    }));
  };

  it('shows a one-frame cue at its inclusive start, then removes it at its end', () => {
    expect(render(29)).not.toContain('One frame cue');
    const shown = render(30);
    expect(shown).toContain('One frame cue');
    expect(shown).toContain('opacity:1;transform:translateY(0px);max-width:980px');
    expect(render(31)).not.toContain('One frame cue');
  });
});

describe('terminal command timing', () => {
  const render = (frame: number) => {
    clock.frame = frame;
    return renderToStaticMarkup(createElement(TerminalSession, {
      ...terminalSessionDefaults,
      prompt: 'PROMPT_MARKER',
      commands: [{ command: 'x', output: [] }],
      charsPerFrame: 1,
    }));
  };

  it('waits until a command with no output has executed before showing the next prompt', () => {
    // Typing ends at 25, Enter at 33, and the next prompt appears at 39.
    expect(render(31).match(/PROMPT_MARKER/g)).toHaveLength(1);
    expect(render(39).match(/PROMPT_MARKER/g)).toHaveLength(2);
  });
});

describe('benchmark multipliers', () => {
  it.each([true, false])('does not call a tied score faster (lowerIsBetter=%s)', (lowerIsBetter) => {
    clock.frame = 100;
    const html = renderToStaticMarkup(createElement(BenchmarkBars, {
      ...benchmarkBarsDefaults,
      lowerIsBetter,
      items: [{ label: 'Hero', value: 10, highlight: true }, { label: 'Baseline', value: 10 }],
    }));
    expect(html).not.toContain('× faster');
  });

  it('keeps a zero-latency competitor when selecting the best baseline', () => {
    clock.frame = 100;
    const html = renderToStaticMarkup(createElement(BenchmarkBars, {
      ...benchmarkBarsDefaults,
      items: [
        { label: 'Hero', value: 10, highlight: true },
        { label: 'Zero', value: 0 },
        { label: 'Slower', value: 30 },
      ],
    }));
    expect(html).not.toContain('× faster');
  });

  it('still shows a valid speedup against the best competitor', () => {
    clock.frame = 100;
    const html = renderToStaticMarkup(createElement(BenchmarkBars, {
      ...benchmarkBarsDefaults,
      items: [{ label: 'Hero', value: 10, highlight: true }, { label: 'Baseline', value: 30 }],
    }));
    expect(html).toContain('3.0× faster');
  });
});

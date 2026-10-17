/** A word with start/end times in seconds (as produced by most transcription tools). */
export interface TimedWord {
  text: string;
  startSec: number;
  endSec: number;
}

/** A subtitle cue with start/end times in seconds. */
export interface Cue {
  text: string;
  startSec: number;
  endSec: number;
}

/** Converts a frame index to seconds. */
export function frameToSec(frame: number, fps: number): number {
  return frame / fps;
}

/** Converts seconds to the nearest frame index. */
export function secToFrame(sec: number, fps: number): number {
  return Math.round(sec * fps);
}

/**
 * Index of the word being spoken at `timeSec`: the last word whose start is
 * <= timeSec. Returns -1 before the first word starts. Between words the
 * previous word stays active, which avoids flicker in gaps.
 */
export function activeWordIndex(words: readonly TimedWord[], timeSec: number): number {
  let idx = -1;
  for (let i = 0; i < words.length; i++) {
    if (words[i].startSec <= timeSec) idx = i;
    else break;
  }
  return idx;
}

/** 0..1 progress through a single word at `timeSec` (0 before, 1 after). */
export function wordProgress(word: TimedWord, timeSec: number): number {
  const span = word.endSec - word.startSec;
  if (span <= 0) return timeSec >= word.startSec ? 1 : 0;
  return Math.min(1, Math.max(0, (timeSec - word.startSec) / span));
}

export interface WordPage {
  /** Index of the first word on the page in the original array. */
  startIndex: number;
  words: TimedWord[];
  startSec: number;
  endSec: number;
}

/**
 * Groups words into pages of at most `maxWords`. A page also breaks early
 * when the silence before the next word exceeds `maxGapSec`, so a caption
 * never spans a long pause.
 */
export function paginateWords(words: readonly TimedWord[], maxWords: number, maxGapSec = 0.8): WordPage[] {
  const size = Math.max(1, Math.floor(maxWords));
  const pages: WordPage[] = [];
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const last: WordPage | undefined = pages[pages.length - 1];
    const gapBreak = i > 0 && word.startSec - words[i - 1].endSec > maxGapSec;
    if (last === undefined || last.words.length >= size || gapBreak) {
      pages.push({ startIndex: i, words: [word], startSec: word.startSec, endSec: word.endSec });
    } else {
      last.words.push(word);
      last.endSec = word.endSec;
    }
  }
  return pages;
}

/** The page whose words are on screen at `timeSec` (-1 before the first word). */
export function activePageIndex(pages: readonly WordPage[], timeSec: number): number {
  let idx = -1;
  for (let i = 0; i < pages.length; i++) {
    if (pages[i].startSec <= timeSec) idx = i;
    else break;
  }
  return idx;
}

/** Index of the cue visible at `timeSec` (start inclusive, end exclusive) or -1. */
export function activeCueIndex(cues: readonly Cue[], timeSec: number): number {
  for (let i = 0; i < cues.length; i++) {
    if (timeSec >= cues[i].startSec && timeSec < cues[i].endSec) return i;
  }
  return -1;
}

/**
 * Spreads the words of `text` evenly between `startSec` and `endSec`.
 * Handy when you have a script but no transcript timings yet.
 */
export function evenWordTimings(text: string, startSec: number, endSec: number): TimedWord[] {
  const parts = text.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return [];
  const step = (endSec - startSec) / parts.length;
  return parts.map((part, i) => ({
    text: part,
    startSec: startSec + step * i,
    endSec: startSec + step * (i + 1),
  }));
}

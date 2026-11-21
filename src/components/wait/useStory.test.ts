import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { JobClock, WorkerJob } from '../../workers/useWorkerJob';
import { stepAt } from './progress';
import { revealAt, storyLength, storyProgress, STORY_OVERRIDE_KEY, useStory } from './useStory';

const STEPS = [
  { id: 'reading', label: 'Reading' },
  { id: 'working', label: 'Working' },
  { id: 'packing', label: 'Packing' },
];

type Job = WorkerJob<string, { n: number }>;

describe('story pacing', () => {
  it('never runs ahead of the real work', () => {
    expect(storyProgress(0.3, 10_000, 6000)).toBe(0.3);
  });

  it('is paced by time when the work is fast', () => {
    expect(storyProgress(1, 2400, 6000)).toBeCloseTo(0.5);
    expect(storyProgress(1, 4800, 6000)).toBe(1);
  });

  it('jumps straight to the real progress when there is no story', () => {
    expect(storyProgress(0.7, 0, 0)).toBe(0.7);
  });

  it('reveals after the full story, or after a finale for slow work', () => {
    expect(revealAt({ startedAt: 0, doneAt: 500 }, 6000)).toBe(6000);
    expect(revealAt({ startedAt: 0, doneAt: 10_000 }, 6000)).toBe(11_200);
    expect(revealAt({ startedAt: 0, doneAt: null }, 6000)).toBe(Infinity);
  });

  it('maps a value back to a step', () => {
    expect(stepAt(STEPS, 0)).toEqual({ current: 'reading', progress: 0 });
    expect(stepAt(STEPS, 0.5).current).toBe('working');
    expect(stepAt(STEPS, 0.5).progress).toBeCloseTo(0.5);
    expect(stepAt(STEPS, 1)).toEqual({ current: 'packing', progress: 1 });
  });

  it('can be shortened from storage', () => {
    localStorage.setItem(STORY_OVERRIDE_KEY, '250');
    expect(storyLength(false)).toBe(250);
    localStorage.removeItem(STORY_OVERRIDE_KEY);
    expect(storyLength(false)).toBe(0);
  });
});

describe('useStory', () => {
  beforeEach(() => {
    vi.useFakeTimers({
      toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval', 'performance'],
    });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  const render = (job: Job, clock: JobClock | null) =>
    renderHook(({ j, c }) => useStory(j, c, STEPS, 6000), {
      initialProps: { j: job, c: clock },
    });

  it('holds a fast result until the story has played', () => {
    const t0 = performance.now();
    const hook = render(
      { status: 'running', stage: 'reading', progress: 0 },
      { startedAt: t0, doneAt: null },
    );
    act(() => vi.advanceTimersByTime(300));
    hook.rerender({ j: { status: 'done', n: 1 }, c: { startedAt: t0, doneAt: performance.now() } });
    act(() => vi.advanceTimersByTime(1000));
    expect(hook.result.current.job.status).toBe('running');
    expect(hook.result.current.canSkip).toBe(false);
    act(() => vi.advanceTimersByTime(1500));
    expect(hook.result.current.canSkip).toBe(true);
    act(() => vi.advanceTimersByTime(3400));
    expect(hook.result.current.job.status).toBe('done');
    expect(hook.result.current.progress).toBe(1);
  });

  it('never holds back an error', () => {
    const t0 = performance.now();
    const hook = render(
      { status: 'running', stage: 'reading', progress: 0 },
      { startedAt: t0, doneAt: null },
    );
    hook.rerender({ j: { status: 'error', message: 'nope' }, c: { startedAt: t0, doneAt: null } });
    expect(hook.result.current.job.status).toBe('error');
  });

  it('shows the result right away after a skip', () => {
    const t0 = performance.now();
    const hook = render({ status: 'done', n: 1 }, { startedAt: t0, doneAt: t0 });
    act(() => vi.advanceTimersByTime(2100));
    expect(hook.result.current.job.status).toBe('running');
    act(() => hook.result.current.skip());
    expect(hook.result.current.job.status).toBe('done');
  });

  it('a skip only lasts for its own run', () => {
    const t0 = performance.now();
    const hook = render({ status: 'done', n: 1 }, { startedAt: t0, doneAt: t0 });
    act(() => vi.advanceTimersByTime(2100));
    act(() => hook.result.current.skip());
    const t1 = performance.now();
    hook.rerender({ j: { status: 'done', n: 2 }, c: { startedAt: t1, doneAt: t1 } });
    act(() => vi.advanceTimersByTime(200));
    expect(hook.result.current.job.status).toBe('running');
  });

  it('follows real progress while the work is slow', () => {
    const t0 = performance.now();
    const hook = render(
      { status: 'running', stage: 'working', progress: 0.5 },
      { startedAt: t0, doneAt: null },
    );
    act(() => vi.advanceTimersByTime(20_000));
    expect(hook.result.current.progress).toBeCloseTo(0.5);
    expect(hook.result.current.job).toMatchObject({ status: 'running', stage: 'working' });
  });
});

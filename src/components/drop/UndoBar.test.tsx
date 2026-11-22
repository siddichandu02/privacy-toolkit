import { act, render, renderHook, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MotionConfig } from 'framer-motion';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { UNDO_MS, UndoBar } from './UndoBar';
import { restoreItems, useFileQueue, type QueuedFile } from './useFileQueue';

const file = (name: string) => new File([new Uint8Array(8)], name, { type: 'application/pdf' });
const q = (id: string): QueuedFile => ({ id, file: file(`${id}.pdf`) });
const names = (items: readonly QueuedFile[]) => items.map((i) => i.file.name);

describe('restoreItems', () => {
  it('puts files back at their old positions', () => {
    const [a, b, c, d] = [q('a'), q('b'), q('c'), q('d')];
    expect(
      restoreItems(
        [a, c],
        [
          { item: d, index: 3 },
          { item: b, index: 1 },
        ],
      ).map((i) => i.id),
    ).toEqual(['a', 'b', 'c', 'd']);
  });

  it('skips files that are already back and clamps to the end', () => {
    const [a, b] = [q('a'), q('b')];
    expect(restoreItems([a], [{ item: a, index: 0 }]).map((i) => i.id)).toEqual(['a']);
    expect(restoreItems([a], [{ item: b, index: 9 }]).map((i) => i.id)).toEqual(['a', 'b']);
  });
});

describe('useFileQueue undo', () => {
  it('undoes a single remove in place', () => {
    const { result } = renderHook(() => useFileQueue());
    act(() => result.current.add([file('1.pdf'), file('2.pdf'), file('3.pdf')]));
    const middle = result.current.items[1] as QueuedFile;
    act(() => result.current.remove(middle.id));
    expect(names(result.current.items)).toEqual(['1.pdf', '3.pdf']);
    expect(result.current.removed?.entries).toHaveLength(1);
    act(() => result.current.undo());
    expect(names(result.current.items)).toEqual(['1.pdf', '2.pdf', '3.pdf']);
    expect(result.current.removed).toBeNull();
  });

  it('undoes remove all, and clear() leaves nothing to undo', () => {
    const { result } = renderHook(() => useFileQueue());
    act(() => result.current.add([file('1.pdf'), file('2.pdf')]));
    act(() => result.current.removeAll());
    expect(result.current.items).toHaveLength(0);
    act(() => result.current.undo());
    expect(names(result.current.items)).toEqual(['1.pdf', '2.pdf']);
    act(() => result.current.removeAll());
    act(() => result.current.clear());
    expect(result.current.removed).toBeNull();
  });
});

describe('UndoBar', () => {
  afterEach(() => vi.useRealTimers());

  const removed = (n: number) => ({
    entries: Array.from({ length: n }, (_, i) => ({ item: q(`f${i}`), index: i })),
    stamp: n,
  });

  it('names the file and undoes on click or Ctrl+Z', async () => {
    const onUndo = vi.fn();
    render(
      <MotionConfig reducedMotion="always">
        <UndoBar removed={removed(1)} accent="violet" onUndo={onUndo} onDone={() => {}} />
      </MotionConfig>,
    );
    expect(screen.getByTestId('undo-bar')).toHaveTextContent('Removed f0.pdf');
    await userEvent.click(screen.getByRole('button', { name: 'Undo' }));
    await userEvent.keyboard('{Control>}z{/Control}');
    expect(onUndo).toHaveBeenCalledTimes(2);
  });

  it('counts several files and goes away after the fuse burns down', () => {
    vi.useFakeTimers();
    const onDone = vi.fn();
    render(<UndoBar removed={removed(3)} accent="mint" onUndo={() => {}} onDone={onDone} />);
    expect(screen.getByTestId('undo-bar')).toHaveTextContent('Removed 3 files');
    act(() => vi.advanceTimersByTime(UNDO_MS - 100));
    expect(onDone).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(200));
    expect(onDone).toHaveBeenCalledOnce();
  });

  it('holds the fuse while the pointer is on the slip', () => {
    vi.useFakeTimers();
    const onDone = vi.fn();
    render(<UndoBar removed={removed(1)} accent="sky" onUndo={() => {}} onDone={onDone} />);
    act(() => {
      screen
        .getByTestId('undo-bar')
        .dispatchEvent(new PointerEvent('pointerover', { bubbles: true }));
    });
    act(() => vi.advanceTimersByTime(UNDO_MS * 2));
    expect(onDone).not.toHaveBeenCalled();
  });
});

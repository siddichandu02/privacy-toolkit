import { act, render, renderHook, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MotionConfig } from 'framer-motion';
import { describe, expect, it, vi } from 'vitest';
import { FileList } from './FileList';
import { moveItem, useFileQueue } from './useFileQueue';

vi.mock('./preview', () => ({
  isPdf: (f: File) => f.name.endsWith('.pdf'),
  makePreview: vi.fn(async (f: File) => ({ url: null, pages: f.name.startsWith('one') ? 1 : 4 })),
}));

const pdf = (name: string) => new File([new Uint8Array(2048)], name, { type: 'application/pdf' });

describe('moveItem', () => {
  it('moves and clamps', () => {
    expect(moveItem(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a']);
    expect(moveItem(['a', 'b', 'c'], 2, -5)).toEqual(['c', 'a', 'b']);
    expect(moveItem(['a', 'b'], 1, 1)).toEqual(['a', 'b']);
  });
});

function Harness() {
  const q = useFileQueue();
  return (
    <MotionConfig reducedMotion="always">
      <button onClick={() => q.add([pdf('one.pdf'), pdf('two.pdf'), pdf('three.pdf')])}>add</button>
      <FileList
        items={q.items}
        accent="violet"
        onReorder={q.setItems}
        onMove={q.move}
        onRemove={q.remove}
      />
    </MotionConfig>
  );
}

const names = () =>
  screen
    .getAllByTestId('file-row')
    .map((row) => row.querySelector('p[title]')?.getAttribute('title'));

describe('FileList', () => {
  it('shows size and page count for each file', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByText('add'));
    expect(names()).toEqual(['one.pdf', 'two.pdf', 'three.pdf']);
    expect(await screen.findByText('2 KB, 1 page')).toBeInTheDocument();
    expect(screen.getAllByText('2 KB, 4 pages')).toHaveLength(2);
  });

  it('moves files with buttons and announces it', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByText('add'));
    expect(screen.getByRole('button', { name: 'Move one.pdf up' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Move one.pdf down' }));
    expect(names()).toEqual(['two.pdf', 'one.pdf', 'three.pdf']);
    expect(screen.getByRole('status')).toHaveTextContent('one.pdf moved to position 2 of 3.');
  });

  it('moves files with arrow keys on the grip', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByText('add'));
    screen.getByRole('button', { name: /reorder three\.pdf/i }).focus();
    await user.keyboard('{ArrowUp}{ArrowUp}{ArrowUp}');
    expect(names()).toEqual(['three.pdf', 'one.pdf', 'two.pdf']);
  });

  it('removes a file', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByText('add'));
    await user.click(screen.getByRole('button', { name: 'Remove two.pdf' }));
    await waitFor(() => expect(names()).toEqual(['one.pdf', 'three.pdf']));
    expect(screen.getByRole('status')).toHaveTextContent('two.pdf removed.');
  });

  it('numbers files in order', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByText('add'));
    const rows = screen.getAllByTestId('file-row');
    expect(within(rows[2] as HTMLElement).getByText('3.')).toBeInTheDocument();
  });
});

describe('useFileQueue', () => {
  it('adds, moves, removes and clears', () => {
    const { result } = renderHook(() => useFileQueue());
    act(() => result.current.add([pdf('a.pdf'), pdf('b.pdf')]));
    const [a] = result.current.items;
    act(() => result.current.move(a?.id ?? '', 1));
    expect(result.current.items.map((i) => i.file.name)).toEqual(['b.pdf', 'a.pdf']);
    act(() => result.current.remove(a?.id ?? ''));
    expect(result.current.items).toHaveLength(1);
    act(() => result.current.clear());
    expect(result.current.items).toEqual([]);
  });
});

import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MotionConfig } from 'framer-motion';
import { describe, expect, it, vi } from 'vitest';
import { DropZone } from './DropZone';
import { PDF_RULES } from './validate';

const pdf = (name: string, size = 20) =>
  new File([new Uint8Array(size)], name, { type: 'application/pdf' });

function setup(props: Partial<Parameters<typeof DropZone>[0]> = {}) {
  const onFiles = vi.fn();
  render(
    <MotionConfig reducedMotion="always">
      <DropZone rules={PDF_RULES} accent="violet" onFiles={onFiles} {...props} />
    </MotionConfig>,
  );
  return { onFiles, zone: screen.getByRole('button', { name: /choose pdfs|add more pdfs/i }) };
}

const dropEvent = (files: File[]) => ({ dataTransfer: { files, types: ['Files'] } });

describe('DropZone', () => {
  it('opens the file picker with Enter and Space', async () => {
    const user = userEvent.setup();
    const { zone } = setup();
    const input = screen.getByTestId('file-input');
    const click = vi.spyOn(input, 'click');
    zone.focus();
    await user.keyboard('{Enter}');
    await user.keyboard(' ');
    expect(click).toHaveBeenCalledTimes(2);
  });

  it('passes picked files through', async () => {
    const user = userEvent.setup();
    const { onFiles } = setup();
    await user.upload(screen.getByTestId('file-input'), [pdf('a.pdf'), pdf('b.pdf')]);
    expect(onFiles).toHaveBeenCalledWith([
      expect.objectContaining({ name: 'a.pdf' }),
      expect.objectContaining({ name: 'b.pdf' }),
    ]);
  });

  it('highlights while dragging and takes dropped files', () => {
    const { onFiles, zone } = setup();
    fireEvent.dragEnter(zone, dropEvent([]));
    expect(zone).toHaveAttribute('data-dragging', 'true');
    expect(screen.getByText('Let go to add them')).toBeInTheDocument();
    fireEvent.drop(zone, dropEvent([pdf('c.pdf')]));
    expect(zone).toHaveAttribute('data-dragging', 'false');
    expect(onFiles).toHaveBeenCalledWith([expect.objectContaining({ name: 'c.pdf' })]);
  });

  it('stays highlighted while crossing child elements', () => {
    const { zone } = setup();
    fireEvent.dragEnter(zone, dropEvent([]));
    fireEvent.dragEnter(zone, dropEvent([]));
    fireEvent.dragLeave(zone, dropEvent([]));
    expect(zone).toHaveAttribute('data-dragging', 'true');
    fireEvent.dragLeave(zone, dropEvent([]));
    expect(zone).toHaveAttribute('data-dragging', 'false');
  });

  it('explains files it leaves out and lets you dismiss that', async () => {
    const user = userEvent.setup();
    const { onFiles, zone } = setup();
    fireEvent.drop(zone, dropEvent([new File(['x'], 'cat.png', { type: 'image/png' })]));
    expect(onFiles).not.toHaveBeenCalled();
    expect(screen.getByText(/cat\.png is not one of the PDFs/)).toBeInTheDocument();
    expect(zone).toHaveAccessibleDescription(/cat\.png/);
    await user.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(screen.queryByText(/cat\.png/)).not.toBeInTheDocument();
  });

  it('respects the count limit including existing files', () => {
    const { onFiles, zone } = setup({ existingCount: 49 });
    fireEvent.drop(zone, dropEvent([pdf('1.pdf'), pdf('2.pdf')]));
    expect(onFiles).toHaveBeenCalledWith([expect.objectContaining({ name: '1.pdf' })]);
    expect(screen.getByText(/2\.pdf was left out/)).toBeInTheDocument();
  });

  it('takes pasted files', () => {
    const { onFiles } = setup();
    const event = new Event('paste', { bubbles: true, cancelable: true });
    Object.assign(event, { clipboardData: { files: [pdf('pasted.pdf')] } });
    window.dispatchEvent(event);
    expect(onFiles).toHaveBeenCalledWith([expect.objectContaining({ name: 'pasted.pdf' })]);
  });

  it('has a slim add-more mode', () => {
    setup({ compact: true });
    expect(screen.getByRole('button', { name: 'Add more PDFs' })).toBeInTheDocument();
  });
});

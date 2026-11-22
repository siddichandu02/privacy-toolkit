import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PdfOpenProblem } from './PdfOpenProblem';

describe('PdfOpenProblem', () => {
  it('walks through making an unlocked copy of a locked file', () => {
    render(<PdfOpenProblem name="lease.pdf" locked accent="sky" />);
    const alert = screen.getByRole('alert', { name: 'This PDF has a password' });
    expect(alert).toHaveTextContent('lease.pdf is locked');
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
    expect(alert).toHaveTextContent('Save as PDF');
    expect(screen.getByTestId('paper-lock')).toBeInTheDocument();
  });

  it('says a broken file may be damaged, without unlock steps', () => {
    render(<PdfOpenProblem name="scan.pdf" locked={false} accent="sky" />);
    const alert = screen.getByRole('alert', { name: 'This PDF could not be opened' });
    expect(alert).toHaveTextContent('scan.pdf may be damaged');
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
    expect(screen.queryByTestId('paper-lock')).not.toBeInTheDocument();
  });
});

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import type { CategoryFilter as Category } from '../../tools';
import { CategoryFilter, type CategoryOption } from './CategoryFilter';

const options: CategoryOption[] = [
  { value: 'all', label: 'All', count: 10 },
  { value: 'pdf', label: 'PDF', count: 6 },
  { value: 'image', label: 'Image', count: 4 },
];

function Harness({ onChange }: { onChange?: (v: Category) => void }) {
  const [value, setValue] = useState<Category>('all');
  return (
    <CategoryFilter
      options={options}
      value={value}
      onChange={(v) => {
        setValue(v);
        onChange?.(v);
      }}
    />
  );
}

describe('CategoryFilter', () => {
  it('is a labelled radio group with the current choice checked', () => {
    render(<Harness />);
    expect(screen.getByRole('radiogroup', { name: /tool type/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /all/i })).toBeChecked();
    expect(screen.getByRole('radio', { name: /pdf/i })).not.toBeChecked();
  });

  it('changes on click', async () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    await userEvent.click(screen.getByRole('radio', { name: /image/i }));
    expect(onChange).toHaveBeenCalledWith('image');
    expect(screen.getByRole('radio', { name: /image/i })).toBeChecked();
  });

  it('has a single tab stop and moves with arrow keys', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.tab();
    expect(screen.getByRole('radio', { name: /all/i })).toHaveFocus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('radio', { name: /pdf/i })).toHaveFocus();
    expect(screen.getByRole('radio', { name: /pdf/i })).toBeChecked();
    await user.keyboard('{ArrowLeft}{ArrowLeft}');
    expect(screen.getByRole('radio', { name: /image/i })).toBeChecked();
    await user.keyboard('{Home}');
    expect(screen.getByRole('radio', { name: /all/i })).toBeChecked();
  });

  it('shows how many tools each option has', () => {
    render(<Harness />);
    expect(screen.getByLabelText('6 tools')).toHaveTextContent('6');
  });
});

import { render, screen, within } from '@testing-library/react';
import App from './App';
import { TOOLS } from './tools';

describe('App placeholder landing', () => {
  it('states the privacy promise in the main heading', () => {
    render(<App />);
    expect(
      screen.getByRole('heading', { level: 1, name: /your files stay on your device/i }),
    ).toBeInTheDocument();
  });

  it('lists every planned tool', () => {
    render(<App />);
    const list = screen.getByRole('list');
    expect(within(list).getAllByRole('listitem')).toHaveLength(TOOLS.length);
    expect(within(list).getByText('Merge PDF')).toBeInTheDocument();
  });
});

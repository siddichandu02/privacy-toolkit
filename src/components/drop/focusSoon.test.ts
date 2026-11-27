import { afterEach, describe, expect, it } from 'vitest';
import { focusIsLost, focusSoon } from './focusSoon';

afterEach(() => {
  document.body.innerHTML = '';
});

const nextFrames = () => new Promise((r) => setTimeout(r, 80));

describe('focusSoon', () => {
  it('focuses the target once it shows up', async () => {
    focusSoon(document, '#late');
    expect(focusIsLost()).toBe(true);
    document.body.innerHTML = '<button id="late">late</button>';
    await nextFrames();
    expect(document.activeElement?.id).toBe('late');
  });

  it('leaves focus alone if it moved somewhere else first', async () => {
    document.body.innerHTML = '<button id="other">other</button>';
    focusSoon(document, '#late');
    document.getElementById('other')?.focus();
    document.body.insertAdjacentHTML('beforeend', '<button id="late">late</button>');
    await nextFrames();
    expect(document.activeElement?.id).toBe('other');
  });

  it('can be cancelled', async () => {
    const stop = focusSoon(document, '#late');
    stop();
    document.body.innerHTML = '<button id="late">late</button>';
    await nextFrames();
    expect(document.activeElement?.id).not.toBe('late');
  });
});

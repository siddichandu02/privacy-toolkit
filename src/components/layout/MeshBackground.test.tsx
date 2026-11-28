import { renderApp } from '../../test/renderApp';

const meshRoot = () => document.querySelector('.mesh-root');

describe('MeshBackground', () => {
  it('has no accent tint on the home page', () => {
    renderApp('/');
    expect(meshRoot()).toHaveAttribute('data-accent', 'none');
    expect(document.querySelector('.mesh-accent')).toBeNull();
  });

  it('tints with the tool accent on a tool page', () => {
    renderApp('/tools/split');
    expect(meshRoot()).toHaveAttribute('data-accent', 'coral');
    expect(document.querySelector('.mesh-accent')).not.toBeNull();
  });

  it('falls back to the CSS gradients when the canvas cannot be painted', () => {
    const spy = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    renderApp('/');
    const mesh = document.querySelector('canvas.mesh');
    expect(mesh).not.toBeNull();
    expect(mesh).not.toHaveAttribute('data-painted');
    spy.mockRestore();
  });

  it('is hidden from assistive tech', () => {
    renderApp('/tools/merge');
    expect(meshRoot()).toHaveAttribute('aria-hidden', 'true');
  });
});

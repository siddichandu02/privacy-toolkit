import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Helper } from './Helper';
import { HelperGhost } from './helperGhost';
import { With3DHelpers } from './With3DHelpers';

const inSvg = (node: React.ReactNode) => <svg>{node}</svg>;

describe('Helper', () => {
  it('draws the flat helper and keeps markers for the 3D layer', () => {
    const { container } = render(inSvg(<Helper x={10} y={20} color="mint" hopping />));
    const marker = container.querySelector('[data-helper-anchor]') as SVGGElement;
    expect(marker.dataset.color).toBe('mint');
    expect(marker.dataset.hopping).toBe('true');
    expect(marker.dataset.sitting).toBe('false');
    expect(marker.querySelector('[data-anchor="feet"]')).not.toBeNull();
    expect(marker.querySelector('[data-anchor="head"]')).not.toBeNull();
    // Stamped on mount so 3D throws line up with the page tosses.
    expect(Number(marker.dataset.t0)).toBeGreaterThan(0);
    expect(container.querySelector('[data-part="helper"] > g > g')).toHaveAttribute('opacity', '1');
  });

  it('turns invisible once 3D helpers are drawing', () => {
    const { container } = render(
      <HelperGhost.Provider value>
        {inSvg(
          <Helper
            x={0}
            y={0}
            color="sky"
            sitting
            throwing={{ delay: 1, cycle: 2.4, hold: 0.42 }}
          />,
        )}
      </HelperGhost.Provider>,
    );
    expect(container.querySelector('[data-part="helper"] > g > g')).toHaveAttribute('opacity', '0');
    const marker = container.querySelector('[data-helper-anchor]') as SVGGElement;
    expect(marker.dataset.sitting).toBe('true');
    expect(marker.dataset.throwCycle).toBe('2.4');
  });

  it('keeps the flat helpers when the browser cannot draw 3D', () => {
    const { container } = render(
      <With3DHelpers width={300} height={180}>
        {inSvg(<Helper x={0} y={0} color="mint" />)}
      </With3DHelpers>,
    );
    expect(screen.queryByTestId('helpers-3d')).toBeNull();
    expect(container.querySelector('[data-part="helper"] > g > g')).toHaveAttribute('opacity', '1');
  });
});

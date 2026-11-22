import { lazy, Suspense, useState, type ReactNode } from 'react';
import { useStillMotion } from '../../../useStillMotion';
import { Fallback } from './Fallback';
import { HelperGhost } from './helperGhost';
import { canUse3D, loadHelpers3D } from './three';

const Helpers3D = lazy(loadHelpers3D);

/**
 * Wrap a wait scene's contents to give its paper helpers real 3D bodies. Put
 * it directly inside the scene's positioned box. The flat helpers show until
 * the 3D layer is drawing, and stay if WebGL is missing, the chunk cannot
 * load, or motion is reduced.
 */
export function With3DHelpers({
  width,
  height,
  children,
}: {
  /** The scene's viewBox size. */
  width: number;
  height: number;
  children: ReactNode;
}) {
  const still = useStillMotion();
  const [state, setState] = useState<'off' | 'loading' | 'ready'>(() =>
    canUse3D() ? 'loading' : 'off',
  );
  const on = state !== 'off' && !still;

  return (
    <HelperGhost.Provider value={on && state === 'ready'}>
      {children}
      {on ? (
        <Fallback onError={() => setState('off')}>
          <Suspense fallback={null}>
            <Helpers3D
              width={width}
              height={height}
              onReady={() => setState('ready')}
              onFail={() => setState('off')}
            />
          </Suspense>
        </Fallback>
      ) : null}
    </HelperGhost.Provider>
  );
}

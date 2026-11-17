import { matchPath, useLocation } from 'react-router-dom';
import { getTool } from '../../tools';
import type { Accent } from '../ui';

/** The accent of the tool page we are on, if any. */
export function useRouteAccent(): Accent | undefined {
  const { pathname } = useLocation();
  const match = matchPath('/tools/:id', pathname);
  return getTool(match?.params.id)?.accent;
}

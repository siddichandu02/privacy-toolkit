import { createContext } from 'react';

/**
 * True once a scene's 3D helpers are drawing: flat helpers then turn into
 * invisible markers that the 3D layer follows.
 */
export const HelperGhost = createContext(false);

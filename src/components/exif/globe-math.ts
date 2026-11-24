export const R = 40;
export const C = 48;
const RAD = Math.PI / 180;

/**
 * Orthographic projection of (lat, lon) onto a globe turned to face
 * (lat0, lon0). Points on the far side come back null.
 */
export function project(
  lat: number,
  lon: number,
  lat0: number,
  lon0: number,
): { x: number; y: number } | null {
  const φ = lat * RAD;
  const λ = (lon - lon0) * RAD;
  const φ0 = lat0 * RAD;
  const cosc = Math.sin(φ0) * Math.sin(φ) + Math.cos(φ0) * Math.cos(φ) * Math.cos(λ);
  if (cosc < 0) return null;
  return {
    x: C + R * Math.cos(φ) * Math.sin(λ),
    y: C - R * (Math.cos(φ0) * Math.sin(φ) - Math.sin(φ0) * Math.cos(φ) * Math.cos(λ)),
  };
}

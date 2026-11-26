/** How far (px) or how fast (px/s) a downward drag has to go to close. */
export const DISMISS_DISTANCE = 110;
export const DISMISS_SPEED = 550;

export function shouldDismiss(offsetY: number, velocityY: number): boolean {
  return offsetY > DISMISS_DISTANCE || (offsetY > 24 && velocityY > DISMISS_SPEED);
}

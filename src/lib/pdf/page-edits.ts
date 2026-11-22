/** What to do with one page of the source file. */
export interface PageEdit {
  /** Quarter turns clockwise. Negative turns go the other way. */
  turns: number;
  /** False drops the page from the result. */
  keep: boolean;
}

/** A page left as it is. */
export const NO_EDIT: PageEdit = { turns: 0, keep: true };

/** Any number of quarter turns as 0, 90, 180 or 270. */
export const toDegrees = (turns: number) => ((((turns % 4) + 4) % 4) * 90) as 0 | 90 | 180 | 270;

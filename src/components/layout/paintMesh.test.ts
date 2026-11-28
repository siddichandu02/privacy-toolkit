import { MESH_BLOBS, MESH_SIZE, paintMesh } from './paintMesh';

function fakeCanvas(ctx: unknown) {
  return { width: 0, height: 0, getContext: () => ctx } as unknown as HTMLCanvasElement;
}

describe('paintMesh', () => {
  it('keeps the CSS gradients when there is no 2D canvas', () => {
    expect(paintMesh(fakeCanvas(null))).toBe(false);
    const throws = {
      getContext: () => {
        throw new Error('blocked');
      },
    } as unknown as HTMLCanvasElement;
    expect(paintMesh(throws)).toBe(false);
  });

  it('draws every blob as a stretched circle into a small bitmap', () => {
    const stops: [number, string][] = [];
    const transforms: number[][] = [];
    const rects: number[][] = [];
    const ctx = {
      clearRect: vi.fn(),
      setTransform: (...m: number[]) => transforms.push(m),
      createRadialGradient: () => ({
        addColorStop: (o: number, c: string) => stops.push([o, c]),
      }),
      fillRect: (...r: number[]) => rects.push(r),
      fillStyle: null as unknown,
    };
    const canvas = fakeCanvas(ctx);
    expect(paintMesh(canvas)).toBe(true);

    expect(canvas.width).toBe(MESH_SIZE);
    expect(canvas.height).toBe(MESH_SIZE);
    expect(rects).toHaveLength(MESH_BLOBS.length);
    // First blob: violet, centred at 20% / 25%, 40% x 35% radii.
    expect(transforms[0]).toEqual([0.4 * 128, 0, 0, 0.35 * 128, 0.2 * 128, 0.25 * 128]);
    expect(stops[0]).toEqual([0, 'rgba(124, 92, 255, 0.45)']);
    // Fades to the same colour, so the edge never goes grey.
    expect(stops[1]).toEqual([0.7, 'rgba(124, 92, 255, 0)']);
    // Each fill covers the whole canvas in the blob's own coordinates.
    const [x = NaN, y = NaN, w = NaN, h = NaN] = rects[0] ?? [];
    expect(x * 0.4 + 0.2).toBeCloseTo(0);
    expect(y * 0.35 + 0.25).toBeCloseTo(0);
    expect(w * 0.4).toBeCloseTo(1);
    expect(h * 0.35).toBeCloseTo(1);
    // Ends with a clean transform.
    expect(transforms.at(-1)).toEqual([1, 0, 0, 1, 0, 0]);
  });
});

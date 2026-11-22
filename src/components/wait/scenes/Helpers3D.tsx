import { useEffect, useRef } from 'react';
import {
  AmbientLight,
  Color,
  DirectionalLight,
  HemisphereLight,
  NeutralToneMapping,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
} from 'three';
import { buildHelper, SOLE, type Rig } from './helperModel';

export interface Helpers3DProps {
  /** The scene's viewBox size; the canvas maps 1:1 onto it. */
  width: number;
  height: number;
  onReady?: () => void;
  onFail?: () => void;
}

/** Feet-to-head distance of a flat helper at its normal size, in scene units. */
const FLAT_SPAN = 17 * 1.3;
/** 3D size per unit of that span, so a 3D helper stands about as tall as a flat one. */
const SCALE = 0.95 / FLAT_SPAN;

/** The canvas reaches this far past each edge of the scene, so wings and shadows near the edge are not cut off. */
const PAD = 0.15;

const clamp = (v: number) => Math.min(1, Math.max(0, v));
const easeOut = (v: number) => 1 - (1 - v) ** 3;
const easeInOut = (v: number) => (v < 0.5 ? 4 * v ** 3 : 1 - (-2 * v + 2) ** 3 / 2);

function cssColor(name: string | undefined) {
  const v = getComputedStyle(document.documentElement)
    .getPropertyValue(`--${name ?? 'mint'}`)
    .trim();
  return new Color(v || '#3ddc97');
}

interface Live {
  rig: Rig;
  index: number;
}

/**
 * Pip's paper helpers in real 3D, drawn with three.js on a transparent canvas
 * over a wait scene. The scene keeps its flat helpers as invisible markers
 * (see Helper's ghost mode); every frame this layer reads where each marker
 * is, how it is tilted and whether it sits, hops or throws, and poses a
 * folded-paper figure there. So each scene's own choreography (riding the
 * loaf, perching on the album, stirring on the spoon) carries over unchanged.
 */
export default function Helpers3D({ width, height, onReady, onFail }: Helpers3DProps) {
  const host = useRef<HTMLDivElement>(null);
  const callbacks = useRef({ onReady, onFail });
  useEffect(() => {
    callbacks.current = { onReady, onFail };
  });

  useEffect(() => {
    const el = host.current;
    const stage = el?.parentElement;
    if (!el || !stage) return;

    let renderer: WebGLRenderer;
    try {
      renderer = new WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
    } catch {
      callbacks.current.onFail?.();
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = NeutralToneMapping;
    const canvas = renderer.domElement;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    el.appendChild(canvas);

    const disposables: { dispose: () => void }[] = [];
    const track = (thing: { dispose: () => void }) => disposables.push(thing);

    // A narrow perspective camera: at z = 0 one unit is one scene unit (y runs
    // up, so a point at scene y sits at -y), with just enough depth to read as 3D.
    const fov = 22;
    const dist = (height * (1 + 2 * PAD)) / 2 / Math.tan(((fov / 2) * Math.PI) / 180);
    const camera = new PerspectiveCamera(fov, width / height, 1, dist * 3);
    camera.position.set(width / 2, -height / 2, dist);
    const scene = new Scene();
    scene.add(new HemisphereLight(0xffffff, 0x2a1f4d, 1.25));
    scene.add(new AmbientLight(0xffffff, 0.1));
    const sun = new DirectionalLight(0xffffff, 2.1);
    sun.position.set(width / 2 - 60, 90, dist);
    scene.add(sun);
    // A cool light from behind traces the folds' edges.
    const rim = new DirectionalLight(cssColor('sky'), 2.2);
    rim.position.set(width / 2 + 80, 40, -120);
    scene.add(rim);

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = el;
      if (w > 0 && h > 0) renderer.setSize(w, h, false);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);

    const rigs = new Map<Element, Live>();
    let count = 0;
    let frame = 0;
    let told = false;

    const tick = (now: number) => {
      const box = stage.getBoundingClientRect();
      const toX = (px: number) => ((px - box.left) / box.width) * width;
      const toY = (py: number) => ((py - box.top) / box.height) * height;
      const seen = new Set<Element>();

      for (const marker of stage.querySelectorAll<SVGGElement>('[data-helper-anchor]')) {
        const feet = marker.querySelector('[data-anchor="feet"]')?.getBoundingClientRect();
        const head = marker.querySelector('[data-anchor="head"]')?.getBoundingClientRect();
        if (!feet || !head || box.width === 0) continue;
        seen.add(marker);

        let live = rigs.get(marker);
        if (!live) {
          const rig = buildHelper(cssColor(marker.dataset.color), track);
          scene.add(rig.root);
          live = { rig, index: count++ };
          rigs.set(marker, live);
        }
        const { rig, index } = live;
        const { root, body, wingL, wingR, legs, shadow } = rig;

        // Where the flat helper is, how big and how tilted.
        const fx = toX(feet.left + feet.width / 2);
        const fy = toY(feet.top + feet.height / 2);
        const hx = toX(head.left + head.width / 2);
        const hy = toY(head.top + head.height / 2);
        const span = Math.hypot(hx - fx, hy - fy);
        const tilt = Math.atan2(hx - fx, fy - hy);
        const size = span * SCALE;

        const t = now / 1000;
        const sitting = marker.dataset.sitting === 'true';
        const hopping = marker.dataset.hopping === 'true';
        let lean = 0;
        let wing = 0.12 + Math.sin(t * 9 + index) * 0.06;
        let spin = 0;

        // Throws (merge): wind up, snap forward as the page leaves, recover;
        // every other throw ends in a little spin.
        const t0 = Number(marker.dataset.t0);
        const delay = Number(marker.dataset.throwDelay);
        const cycle = Number(marker.dataset.throwCycle);
        const hold = Number(marker.dataset.throwHold);
        if (t0 && cycle > 0) {
          const c = (now - t0) / 1000 - delay;
          if (c >= 0) {
            const p = c % cycle;
            const n = Math.floor(c / cycle);
            if (p < hold) {
              const k = easeInOut(p / hold);
              lean = -0.34 * k;
              wing = k;
            } else if (p < hold + 0.12) {
              const k = (p - hold) / 0.12;
              lean = -0.34 + 0.8 * k;
              wing = 1 - k * 0.6;
            } else if (p < hold + 0.7) {
              const k = easeOut((p - hold - 0.12) / 0.58);
              lean = 0.46 * (1 - k);
              wing = 0.4 * (1 - k);
            }
            if (n % 2 === 1 && p > hold + 0.55 && p < hold + 1.25) {
              spin = easeInOut((p - hold - 0.55) / 0.7) * Math.PI * 2;
            }
          }
        } else if (hopping) {
          // Cheering: wings up and flapping, and a twirl every few seconds.
          wing = 0.65 + 0.35 * Math.sin(t * 13 + index);
          const p = (t + index * 1.7) % 4.8;
          spin = easeInOut(clamp((p - 3.6) / 0.8)) * Math.PI * 2;
        }

        root.position.set(fx, -fy + SOLE * size, 0);
        root.scale.setScalar(size);
        // Seen a little from above, turned toward the middle of the scene.
        const face = fx > width / 2 ? -0.45 : 0.45;
        root.rotation.set(0.18, face + spin, -tilt);
        body.rotation.z = -lean;
        body.position.y = sitting ? -2.2 : 0;
        legs.visible = !sitting;
        shadow.visible = !sitting;
        wingL.rotation.z = -(0.25 + 1.15 * wing);
        wingR.rotation.z = 0.25 + 1.15 * wing;
      }

      // Helpers that left the scene.
      for (const [marker, { rig }] of rigs) {
        if (!seen.has(marker)) {
          scene.remove(rig.root);
          rigs.delete(marker);
        }
      }

      renderer.render(scene, camera);
      if (!told && rigs.size > 0) {
        told = true;
        callbacks.current.onReady?.();
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    const onLost = (e: Event) => {
      e.preventDefault();
      callbacks.current.onFail?.();
    };
    canvas.addEventListener('webglcontextlost', onLost);

    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
      canvas.removeEventListener('webglcontextlost', onLost);
      for (const d of disposables) d.dispose();
      renderer.dispose();
      canvas.remove();
    };
  }, [width, height]);

  return (
    <div
      ref={host}
      aria-hidden="true"
      data-testid="helpers-3d"
      className="pointer-events-none absolute"
      style={{ inset: `-${PAD * 100}%` }}
    />
  );
}

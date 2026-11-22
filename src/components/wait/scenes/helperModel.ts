import {
  CanvasTexture,
  CircleGeometry,
  Color,
  CylinderGeometry,
  DoubleSide,
  Group,
  IcosahedronGeometry,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  Shape,
  ShapeGeometry,
  SphereGeometry,
  TetrahedronGeometry,
  type BufferGeometry,
  type Material,
} from 'three';

export interface Rig {
  root: Group;
  body: Group;
  wingL: Group;
  wingR: Group;
  legs: Group;
  shadow: Mesh;
}

type Track = (thing: { dispose: () => void }) => void;

const WHITE = new Color('#ffffff');
const INK = new Color('#1b1033');

/** How far the soles sit below the model's origin, in model units. */
export const SOLE = 3.4;

/** A soft round shadow, blurred at the edge, drawn once into a texture. */
function shadowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  if (g) {
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(20,10,45,0.55)');
    grad.addColorStop(0.55, 'rgba(20,10,45,0.22)');
    grad.addColorStop(1, 'rgba(20,10,45,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
  }
  return new CanvasTexture(c);
}

/**
 * One of Pip's paper helpers as a 3D folded-paper figure: a twenty-fold paper
 * egg for a body with a lighter folded bib, pointed paper ears, flat paper wing
 * flaps, glossy ink eyes with a glint, a blush and stubby legs. Flat shading
 * lets every fold catch the light on its own. Origin is between the feet.
 */
export function buildHelper(color: Color, track: Track): Rig {
  const tint = (k: number) => color.clone().lerp(WHITE, k);
  const paper = new MeshStandardMaterial({ color, flatShading: true, roughness: 0.82 });
  const bibPaper = new MeshStandardMaterial({
    color: tint(0.3),
    flatShading: true,
    roughness: 0.8,
  });
  const wingPaper = new MeshStandardMaterial({
    color: tint(0.3),
    flatShading: true,
    roughness: 0.8,
    side: DoubleSide,
  });
  const earPaper = new MeshStandardMaterial({
    color: color.clone().lerp(INK, 0.35),
    flatShading: true,
    roughness: 0.9,
  });
  const ink = new MeshPhysicalMaterial({ color: '#140c2b', roughness: 0.15, clearcoat: 1 });
  const glint = new MeshBasicMaterial({ color: '#ffffff' });
  const blush = new MeshBasicMaterial({ color: '#ff6b8b', transparent: true, opacity: 0.5 });
  const legInk = new MeshStandardMaterial({ color: '#3a3352', roughness: 0.6 });
  const shadowMap = shadowTexture();
  const shade = new MeshBasicMaterial({ map: shadowMap, transparent: true, depthWrite: false });
  for (const m of [paper, bibPaper, wingPaper, earPaper, ink, glint, blush, legInk, shade]) {
    track(m);
  }
  track(shadowMap);

  const root = new Group();
  const body = new Group();
  const legs = new Group();
  root.add(body, legs);
  const add = (g: BufferGeometry, m: Material, parent: Group = body) => {
    track(g);
    const mesh = new Mesh(g, m);
    parent.add(mesh);
    return mesh;
  };

  const torso = add(new IcosahedronGeometry(10, 0), paper);
  torso.position.y = 12;
  torso.scale.set(1, 1.1, 0.95);
  const bib = add(new IcosahedronGeometry(6, 0), bibPaper);
  bib.position.set(0, 9, 4.2);
  bib.scale.set(1, 1, 0.5);

  for (const side of [-1, 1]) {
    const ear = add(new TetrahedronGeometry(3.6), earPaper);
    ear.position.set(side * 4.8, 22.6, -0.4);
    ear.scale.set(0.75, 1.9, 0.75);
    ear.rotation.set(0.15, 0.7, side * 0.45);

    const eye = add(new SphereGeometry(1.7, 24, 16), ink);
    eye.position.set(side * 3.1, 14, 8.6);
    eye.scale.z = 0.7;
    const dot = add(new SphereGeometry(0.55, 12, 8), glint);
    dot.position.set(side * 3.1 + 0.6, 14.7, 9.8);
    const cheek = add(new CircleGeometry(1.5, 20), blush);
    cheek.position.set(side * 5.8, 11, 8.3);
    cheek.rotation.y = side * 0.55;

    const leg = add(new CylinderGeometry(0.85, 0.85, 4, 6), legInk, legs);
    leg.position.set(side * 3.4, -1.4, 0);
  }

  // Wing flaps, hinged at the body's sides.
  const flap = new Shape();
  flap.moveTo(0, 0);
  flap.lineTo(10, 4.5);
  flap.lineTo(7, -5.5);
  flap.closePath();
  const wings = [-1, 1].map((side) => {
    const hinge = new Group();
    hinge.position.set(side * 8.8, 11.5, 0);
    const w = add(new ShapeGeometry(flap), wingPaper, hinge);
    w.scale.x = side;
    body.add(hinge);
    return hinge;
  });

  // A soft blurred shadow lying on the ground.
  const shadow = new Mesh(new PlaneGeometry(30, 30), shade);
  track(shadow.geometry);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.set(0, -SOLE + 0.6, 0);
  root.add(shadow);

  return { root, body, wingL: wings[0] as Group, wingR: wings[1] as Group, legs, shadow };
}

/**
 * Geometry factories. Primitive shapes are unit-sized and scaled per instance;
 * shapes whose proportions matter (insulators with sheds, bushings) are built
 * at their real size and keyed by their dimensions.
 */
import {
  BoxGeometry,
  BufferGeometry,
  CylinderGeometry,
  EdgesGeometry,
  Float32BufferAttribute,
  IcosahedronGeometry,
  LatheGeometry,
  SphereGeometry,
  TorusGeometry,
  Vector2,
} from 'three';

/** 1 x 1 x 1 box centred on the origin. */
export const unitBox = (): BufferGeometry => new BoxGeometry(1, 1, 1);

/** Radius 1, height 1 cylinder along +Y centred on the origin. topRatio < 1 tapers it. */
export const unitCylinder = (segments: number, topRatio = 1): BufferGeometry =>
  new CylinderGeometry(topRatio, 1, 1, segments, 1, false);

export const unitSphere = (detail: number): BufferGeometry =>
  detail <= 1 ? new IcosahedronGeometry(1, detail) : new SphereGeometry(1, detail * 4, detail * 2);

/** Torus in the XZ plane, major radius 1. */
export const unitTorus = (tube: number, radial: number, tubular: number): BufferGeometry => {
  const g = new TorusGeometry(1, tube, radial, tubular);
  g.rotateX(Math.PI / 2);
  return g;
};

export const unitBoxEdges = (): BufferGeometry => {
  const box = new BoxGeometry(1, 1, 1);
  const edges = new EdgesGeometry(box);
  box.dispose();
  return edges;
};

/**
 * Gable prism: base x,z in [-0.5, 0.5] at y = 0, ridge along X at y = 1.
 * No bottom face (it would z-fight with the wall top it sits on).
 */
export function unitPrism(): BufferGeometry {
  // Counter-clockwise seen from outside.
  const v = [
    // slope facing -Z
    -0.5, 0, -0.5, 0.5, 1, 0, 0.5, 0, -0.5, -0.5, 0, -0.5, -0.5, 1, 0, 0.5, 1, 0,
    // slope facing +Z
    0.5, 0, 0.5, -0.5, 1, 0, -0.5, 0, 0.5, 0.5, 0, 0.5, 0.5, 1, 0, -0.5, 1, 0,
    // gable ends
    -0.5, 0, 0.5, -0.5, 1, 0, -0.5, 0, -0.5, 0.5, 0, -0.5, 0.5, 1, 0, 0.5, 0, 0.5,
  ];
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(v, 3));
  g.computeVertexNormals();
  return g;
}

/**
 * Porcelain/polymer insulator body along +Y from 0 to h: a core of radius rc
 * with `sheds` skirts of radius rs. taper < 1 narrows the top (bushings).
 */
export function shedGeometry(h: number, rc: number, rs: number, sheds: number, segments: number, taper = 1): BufferGeometry {
  const pts: Vector2[] = [new Vector2(0, 0), new Vector2(rc * 1.15, 0)];
  const pitch = h / (sheds + 0.4);
  for (let i = 0; i < sheds; i++) {
    const y = pitch * (i + 0.3);
    const k = 1 - (1 - taper) * (y / h);
    const c = rc * k;
    const s = rs * k * (sheds > 6 && i % 2 === 1 ? 0.86 : 1);
    pts.push(new Vector2(c, y));
    pts.push(new Vector2(s, y + pitch * 0.12));
    pts.push(new Vector2(s * 0.96, y + pitch * 0.26));
    pts.push(new Vector2(c, y + pitch * 0.62));
  }
  const kTop = taper;
  pts.push(new Vector2(rc * kTop, h));
  pts.push(new Vector2(0, h));
  return new LatheGeometry(pts, segments);
}

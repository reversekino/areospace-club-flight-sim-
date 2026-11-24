import * as THREE from 'three';

const M = (c, extra) => new THREE.MeshLambertMaterial(Object.assign({ color: c, side: THREE.DoubleSide }, extra || {}));

// cylinder along z: rFront at -z end, rRear at +z end
function cyl(rFront, rRear, len, mat, seg = 14) {
  const g = new THREE.CylinderGeometry(rRear, rFront, len, seg);
  g.rotateX(Math.PI / 2);
  return new THREE.Mesh(g, mat);
}
function box(w, h, d, mat) { return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); }
// planform: [x, forward] points; flat surface lying in the xz plane
function plate(points, thick, mat) {
  const s = new THREE.Shape(points.map(([x, y]) => new THREE.Vector2(x, y)));
  const g = new THREE.ExtrudeGeometry(s, { depth: thick, bevelEnabled: false });
  g.rotateX(-Math.PI / 2);
  g.translate(0, -thick / 2, 0);
  return new THREE.Mesh(g, mat);
}
// fin profile: [back, up] points; standing in the yz plane
function fin(points, thick, mat) {
  const s = new THREE.Shape(points.map(([x, y]) => new THREE.Vector2(x, y)));
  const g = new THREE.ExtrudeGeometry(s, { depth: thick, bevelEnabled: false });
  g.translate(0, 0, -thick / 2);
  g.rotateY(-Math.PI / 2);
  return new THREE.Mesh(g, mat);
}
function strut(a, b, mat, r = 0.05) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, A.distanceTo(B), 6), mat);
  m.position.copy(A).add(B).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize());
  return m;
}
function wheel(x, y, z, r, mat) {
  const w = new THREE.Mesh(new THREE.CylinderGeometry(r, r, r * 0.6, 12), mat);
  w.rotation.z = Math.PI / 2;
  w.position.set(x, y, z);
  return w;
}
function prop(g, z, len, blades, mat) {
  const hub = new THREE.Group();
  for (let i = 0; i < blades; i++) {
    const b = box(0.16, len, 0.05, mat);
    b.position.y = len / 2;
    const arm = new THREE.Group();
    arm.rotation.z = (i / blades) * Math.PI * 2;
    arm.add(b);
    hub.add(arm);
  }
  hub.position.z = z;
  g.add(hub);
  g.userData.prop = hub;
}
function add(g, m, x = 0, y = 0, z = 0) { m.position.set(x, y, z); g.add(m); return m; }

function cessna() {
  const g = new THREE.Group();
  const white = M(0xf3f5f8), blue = M(0x1f5fbf), dark = M(0x1c2633), grey = M(0x555b63);
  add(g, cyl(0.62, 0.28, 6.4, white), 0, 0, 0.9);
  add(g, cyl(0.45, 0.62, 1.2, white), 0, 0, -2.9);
  add(g, new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.6, 12).rotateX(-Math.PI / 2), blue), 0, 0, -3.75);
  add(g, box(1.15, 0.5, 1.5, dark), 0, 0.5, -1.4);
  add(g, box(11, 0.14, 1.5, white), 0, 0.85, -1.1);
  add(g, box(1.0, 0.15, 1.52, blue), 5.0, 0.85, -1.1);
  add(g, box(1.0, 0.15, 1.52, blue), -5.0, 0.85, -1.1);
  g.add(strut([0.55, -0.35, -1.1], [2.6, 0.8, -1.1], grey));
  g.add(strut([-0.55, -0.35, -1.1], [-2.6, 0.8, -1.1], grey));
  add(g, plate([[-1.7, 0.4], [1.7, 0.4], [1.7, -0.6], [-1.7, -0.6]], 0.1, white), 0, 0.1, 3.9);
  add(g, fin([[0, 0], [1.1, 1.5], [1.6, 1.5], [1.5, 0]], 0.1, blue), 0, 0.2, 3.1);
  g.add(strut([0, -0.4, -2.6], [0, -1.1, -2.6], grey, 0.06));
  g.add(wheel(0, -1.15, -2.6, 0.25, dark));
  g.add(strut([0.4, -0.4, -0.3], [1.2, -1.1, -0.3], grey, 0.06));
  g.add(strut([-0.4, -0.4, -0.3], [-1.2, -1.1, -0.3], grey, 0.06));
  g.add(wheel(1.25, -1.15, -0.3, 0.27, dark));
  g.add(wheel(-1.25, -1.15, -0.3, 0.27, dark));
  prop(g, -4.0, 0.95, 2, grey);
  return g;
}

function cub() {
  const g = new THREE.Group();
  const yellow = M(0xf3c11b), black = M(0x161616), dark = M(0x26313d), grey = M(0x4f545b);
  add(g, cyl(0.6, 0.22, 5.8, yellow, 6), 0, 0, 0.6);
  add(g, cyl(0.42, 0.6, 0.9, yellow, 6), 0, 0, -2.7);
  add(g, box(0.06, 0.16, 3.2, black), 0.56, 0.05, -1.2);
  add(g, box(0.06, 0.16, 3.2, black), -0.56, 0.05, -1.2);
  add(g, box(1.0, 0.45, 1.3, dark), 0, 0.5, -1.2);
  add(g, box(10.7, 0.13, 1.6, yellow), 0, 0.85, -0.9);
  g.add(strut([0.5, -0.3, -0.9], [2.7, 0.8, -0.9], grey));
  g.add(strut([-0.5, -0.3, -0.9], [-2.7, 0.8, -0.9], grey));
  add(g, plate([[-1.6, 0.4], [1.6, 0.4], [1.6, -0.5], [-1.6, -0.5]], 0.09, yellow), 0, 0.05, 3.3);
  add(g, fin([[0, 0], [0.7, 1.2], [1.3, 1.25], [1.3, 0]], 0.09, yellow), 0, 0.1, 2.7);
  g.add(strut([0.35, -0.4, -1.8], [0.9, -1.1, -1.8], grey, 0.05));
  g.add(strut([-0.35, -0.4, -1.8], [-0.9, -1.1, -1.8], grey, 0.05));
  g.add(wheel(0.95, -1.15, -1.8, 0.33, dark));
  g.add(wheel(-0.95, -1.15, -1.8, 0.33, dark));
  g.add(wheel(0, -0.35, 3.5, 0.1, dark));
  prop(g, -3.2, 0.9, 2, black);
  return g;
}

function p51() {
  const g = new THREE.Group();
  const silver = M(0xc7ccd3), dark = M(0x1d2733), yellow = M(0xf2c230), black = M(0x111111), white = M(0xf5f5f5);
  add(g, cyl(0.72, 0.25, 9.6, silver), 0, 0, 0.6);
  add(g, new THREE.Mesh(new THREE.ConeGeometry(0.45, 0.9, 14).rotateX(-Math.PI / 2), yellow), 0, 0, -4.6);
  add(g, box(1.0, 0.04, 2.2, dark), 0, 0.68, -2.8);           // anti-glare panel
  const canopy = add(g, new THREE.Mesh(new THREE.SphereGeometry(0.55, 14, 10), dark), 0, 0.62, -0.4);
  canopy.scale.set(0.95, 0.85, 1.9);
  add(g, box(0.75, 0.5, 2.4, silver), 0, -0.75, 0.9);         // belly radiator scoop
  add(g, plate([[-5.65, -0.4], [-5.65, -1.6], [5.65, -1.6], [5.65, -0.4], [0.9, 1.0], [-0.9, 1.0]], 0.18, silver), 0, -0.4, -0.6);
  // invasion stripes
  add(g, box(1.4, 0.2, 2.0, black), 3.0, -0.4, -0.8);
  add(g, box(0.5, 0.21, 2.0, white), 3.0, -0.4, -0.8);
  add(g, box(1.4, 0.2, 2.0, black), -3.0, -0.4, -0.8);
  add(g, box(0.5, 0.21, 2.0, white), -3.0, -0.4, -0.8);
  add(g, plate([[-2.1, -0.2], [-2.1, -0.9], [2.1, -0.9], [2.1, -0.2], [0.4, 0.6], [-0.4, 0.6]], 0.1, silver), 0, 0.15, 4.7);
  add(g, fin([[0, 0], [1.3, 1.7], [1.9, 1.75], [2.1, 0]], 0.1, silver), 0, 0.2, 3.6);
  prop(g, -5.0, 1.65, 4, black);
  return g;
}

function f16() {
  const g = new THREE.Group();
  const grey = M(0x8f9aa6), dark = M(0x2a2f36), gold = M(0x8a7440), white = M(0xeeeeee);
  add(g, cyl(0.62, 0.55, 10.5, grey), 0, 0, 0.8);
  add(g, new THREE.Mesh(new THREE.ConeGeometry(0.62, 3.2, 14).rotateX(-Math.PI / 2), grey), 0, 0, -6.05);
  add(g, box(1.1, 0.75, 3.2, dark), 0, -0.65, -1.6);            // intake
  const canopy = add(g, new THREE.Mesh(new THREE.SphereGeometry(0.5, 14, 10), gold), 0, 0.6, -3.6);
  canopy.scale.set(0.9, 0.85, 2.2);
  add(g, plate([[-0.6, 4.6], [-1.2, 1.6], [-4.7, -1.5], [-4.7, -2.4], [4.7, -2.4], [4.7, -1.5], [1.2, 1.6], [0.6, 4.6]], 0.14, grey), 0, -0.1, 1.0);
  add(g, cyl(0.07, 0.07, 3.0, white, 8), 4.8, -0.1, 1.6);       // wingtip missiles
  add(g, cyl(0.07, 0.07, 3.0, white, 8), -4.8, -0.1, 1.6);
  add(g, plate([[-0.6, 0.4], [-2.9, -1.0], [-2.9, -1.8], [2.9, -1.8], [2.9, -1.0], [0.6, 0.4]], 0.1, grey), 0, -0.1, 5.4);
  add(g, fin([[0, 0], [2.1, 3.0], [3.0, 3.0], [3.4, 0]], 0.12, grey), 0, 0.5, 2.8);
  add(g, cyl(0.55, 0.48, 0.9, dark), 0, 0, 6.4);                 // nozzle
  const burner = add(g, new THREE.Mesh(new THREE.ConeGeometry(0.45, 3.5, 12).rotateX(Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0xffa040, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false })), 0, 0, 8.6);
  g.userData.burner = burner;
  return g;
}

function b747() {
  const g = new THREE.Group();
  const white = M(0xf4f6f9), blue = M(0x1d3f8f), grey = M(0x9aa1aa), dark = M(0x1e2834), belly = M(0xc8ccd2);
  add(g, cyl(3.2, 1.2, 50, white, 20), 0, 0, 6);
  add(g, cyl(1.2, 3.2, 12, white, 20), 0, 0, -25);
  const nose = add(g, new THREE.Mesh(new THREE.SphereGeometry(1.25, 16, 12), white), 0, 0, -31);
  nose.scale.set(1, 1, 1.8);
  const hump = add(g, new THREE.Mesh(new THREE.SphereGeometry(2.3, 18, 12), white), 0, 2.2, -19);
  hump.scale.set(1, 0.9, 5.5);
  add(g, box(2.2, 0.6, 1.4, dark), 0, 3.5, -27);                 // cockpit windows
  add(g, plate([[-2.5, 7], [-32, -16], [-32, -20], [-2.5, -8], [2.5, -8], [32, -20], [32, -16], [2.5, 7]], 0.6, belly), 0, -1.8, 2);
  for (const x of [11, 21]) {
    const le = 7 - (23 / 29.5) * (x - 2.5);
    for (const s of [1, -1]) {
      add(g, cyl(1.35, 1.05, 6, grey), s * x, -3.6, 2 - le - 2.5);
      g.add(strut([s * x, -2.4, 2 - le], [s * x, -1.9, 2 - le + 1.5], grey, 0.25));
    }
  }
  add(g, plate([[-1, 3], [-11, -4], [-11, -6.5], [11, -6.5], [11, -4], [1, 3]], 0.4, white), 0, 0.8, 30);
  add(g, fin([[0, 0], [7, 11], [10.5, 11], [12, 0]], 0.5, blue), 0, 1.5, 22);
  return g;
}

export const MODELS = { cessna, cub, p51, f16, b747 };

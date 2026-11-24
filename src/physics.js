import * as THREE from 'three';

export const G = 9.81;

// K = 0.5 * air density * wing area / mass  (so lift accel = K * v^2 * CL)
// thrust = max thrust accel (m/s^2); vProp = speed where propeller thrust fades to 0 (jets: none)
export const PLANES = [
  {
    id: 'cessna', name: 'Cessna 172 Skyhawk', type: 'Light trainer, 1956',
    blurb: 'The classic trainer. Stable and forgiving, and used in almost every intro flight course.',
    facts: ['Wingspan 11.0 m', 'Max weight about 1,160 kg', 'Cruise about 226 km/h'], handling: 'Easy',
    K: 0.0090, thrust: 3.0, vProp: 110, cd0: 0.030, ki: 0.054, slope: 5.0, clMax: 1.6,
    pitchRate: 0.9, rollRate: 1.4, yawRate: 0.5, stab: 0.6, v0: 55,
    ringR: 30, spacing: 450, lateral: 220, gearH: 2, cam: [3.6, 16]
  },
  {
    id: 'cub', name: 'Piper J-3 Cub', type: 'Light utility, 1938',
    blurb: 'Light, slow and simple. It lands at about the speed of a car on a highway.',
    facts: ['Wingspan 10.7 m', 'Max weight about 550 kg', 'Cruise about 120 km/h'], handling: 'Easy, slow',
    K: 0.0185, thrust: 3.5, vProp: 70, cd0: 0.045, ki: 0.055, slope: 5.0, clMax: 1.5,
    pitchRate: 1.0, rollRate: 1.3, yawRate: 0.6, stab: 0.6, v0: 32,
    ringR: 30, spacing: 300, lateral: 140, gearH: 2, cam: [3.4, 15]
  },
  {
    id: 'p51', name: 'P-51D Mustang', type: 'WWII fighter, 1944',
    blurb: 'Famous for its laminar-flow wing, shaped to keep drag very low at high speed.',
    facts: ['Wingspan 11.3 m', 'Loaded weight about 4,200 kg', 'Top speed about 700 km/h'], handling: 'Fast, agile',
    K: 0.0032, thrust: 8.0, vProp: 300, cd0: 0.018, ki: 0.07, slope: 4.8, clMax: 1.4,
    pitchRate: 1.3, rollRate: 2.6, yawRate: 0.5, stab: 0.6, v0: 120,
    ringR: 34, spacing: 750, lateral: 320, gearH: 2, cam: [3.8, 18]
  },
  {
    id: 'f16', name: 'F-16 Fighting Falcon', type: 'Jet fighter, 1978',
    blurb: 'The first fighter built to be naturally unstable, kept flying by computer (fly-by-wire).',
    facts: ['Wingspan 9.5 m', 'Combat weight about 12,000 kg', 'Top speed about Mach 2'], handling: 'Very fast',
    K: 0.00142, thrust: 11.0, vProp: 0, cd0: 0.022, ki: 0.12, slope: 3.6, clMax: 1.6,
    pitchRate: 1.8, rollRate: 4.0, yawRate: 0.4, stab: 0.8, v0: 170,
    ringR: 55, spacing: 1200, lateral: 200, gearH: 2.5, cam: [4.2, 22]
  },
  {
    id: 'b747', name: 'Boeing 747-400', type: 'Airliner, 1989',
    blurb: 'The original jumbo jet. Huge and slow to respond, so start your turns early.',
    facts: ['Wingspan 64.4 m', 'Max weight about 397,000 kg', 'Cruise about Mach 0.85'], handling: 'Heavy',
    K: 0.00095, thrust: 2.8, vProp: 0, cd0: 0.022, ki: 0.05, slope: 5.2, clMax: 2.0,
    pitchRate: 0.5, rollRate: 0.7, yawRate: 0.25, stab: 0.5, v0: 130,
    ringR: 90, spacing: 1100, lateral: 120, gearH: 6, cam: [15, 105]
  }
];

export function thrustAt(p, v) {
  return p.vProp ? p.thrust * Math.max(0, 1 - v / p.vProp) : p.thrust;
}
export function cdAt(p, v, CL) {
  const m = (v - 290) / 60;               // simple drag rise near the speed of sound
  const wave = m > 0 ? 0.05 * Math.min(1, m * m) : 0;
  return p.cd0 + p.ki * CL * CL + wave;
}
for (const p of PLANES) {
  p.stallAoa = p.clMax / p.slope;
  p.vStall = Math.sqrt(G / (p.K * p.clMax));
  p.trimCL = G / (p.K * p.v0 * p.v0);
  p.trimAoa = p.trimCL / p.slope;
  p.trimThr = Math.min(1, (p.K * p.v0 * p.v0 * cdAt(p, p.v0, p.trimCL)) / Math.max(0.01, thrustAt(p, p.v0)));
}

export function terrainH(x, z) {
  const h =
    90 * Math.sin(x * 0.0021 + 1.0) * Math.cos(z * 0.0017) +
    45 * Math.sin(x * 0.0063 + z * 0.0051) +
    20 * Math.sin(x * 0.017) * Math.sin(z * 0.015) - 10;
  return Math.max(h, -15);
}

export function makeCourse(p, n = 12) {
  const out = [];
  for (let i = 0; i < n; i++) {
    out.push(new THREE.Vector3(
      p.lateral * Math.sin(i * 0.5),
      260 + 60 * Math.sin(i * 0.65 + 0.5),
      -p.spacing * (i + 1)
    ));
  }
  return out;
}

const AX = new THREE.Vector3(1, 0, 0);
const AY = new THREE.Vector3(0, 1, 0);
const AZ = new THREE.Vector3(0, 0, 1);
const qa = new THREE.Quaternion();
const f = new THREE.Vector3(), u = new THREE.Vector3(), r = new THREE.Vector3();
const vh = new THREE.Vector3(), lu = new THREE.Vector3(), acc = new THREE.Vector3();

export function createState(p, ringCount = 12) {
  const S = {
    p, pos: new THREE.Vector3(), vel: new THREE.Vector3(), q: new THREE.Quaternion(),
    throttle: 0.5, pitchIn: 0, rollIn: 0, yawIn: 0,
    state: 'ready', time: 0, nextRing: 0, ringCount,
    aoa: 0, speed: 0, stalled: false, agl: 0, vy: 0
  };
  reset(S);
  return S;
}

export function reset(S) {
  const p = S.p;
  S.pos.set(0, 300, 0);
  S.q.setFromAxisAngle(AX, p.trimAoa);
  S.vel.set(0, 0, -p.v0);
  S.throttle = p.trimThr;
  S.pitchIn = S.rollIn = S.yawIn = 0;
  S.time = 0; S.nextRing = 0; S.stalled = false;
}

// inp: { pitch: -1..1 (+1 = pull up), roll: -1..1 (+1 = roll right), yaw: -1..1, thr: -1..1 (rate), thrSet: 0..1 or null }
export function step(S, inp, rings, dt) {
  if (S.state !== 'flying') return;
  const p = S.p;

  const sm = Math.min(1, 6 * dt);
  S.pitchIn += (inp.pitch - S.pitchIn) * sm;
  S.rollIn += (inp.roll - S.rollIn) * sm;
  S.yawIn += (inp.yaw - S.yawIn) * sm;
  if (inp.thrSet != null) S.throttle = inp.thrSet;
  S.throttle = Math.min(1, Math.max(0, S.throttle + inp.thr * 0.5 * dt));

  const speed = S.vel.length();
  const auth = Math.min(1, speed / (1.3 * p.vStall));

  qa.setFromAxisAngle(AX, S.pitchIn * p.pitchRate * auth * dt); S.q.multiply(qa);
  qa.setFromAxisAngle(AZ, -S.rollIn * p.rollRate * auth * dt); S.q.multiply(qa);
  qa.setFromAxisAngle(AY, -S.yawIn * p.yawRate * auth * dt); S.q.multiply(qa);

  f.set(0, 0, -1).applyQuaternion(S.q);
  u.set(0, 1, 0).applyQuaternion(S.q);
  r.set(1, 0, 0).applyQuaternion(S.q);

  let aoa = 0;
  if (speed > 1) aoa = Math.atan2(-S.vel.dot(u), S.vel.dot(f));
  S.aoa = aoa;
  const absA = Math.abs(aoa);
  let CL;
  if (absA <= p.stallAoa) CL = p.slope * absA;
  else CL = p.clMax * Math.max(0.25, 1 - (absA - p.stallAoa) * 2.5);
  CL *= Math.sign(aoa) || 0;
  S.stalled = absA > p.stallAoa && speed > 5;

  // stability: nose weathervanes toward the trimmed angle; drops in a stall
  const stab = -(aoa - p.trimAoa) * p.stab * Math.min(1, speed / (1.5 * p.vStall));
  qa.setFromAxisAngle(AX, stab * dt + (S.stalled && aoa > 0 ? -1.3 * dt : 0));
  S.q.multiply(qa);
  if (Math.abs(S.rollIn) < 0.1) { qa.setFromAxisAngle(AZ, -r.y * 0.5 * dt); S.q.multiply(qa); }

  acc.set(0, -G, 0);
  acc.addScaledVector(f, S.throttle * thrustAt(p, speed));
  if (speed > 0.5) {
    vh.copy(S.vel).divideScalar(speed);
    lu.copy(u).addScaledVector(vh, -u.dot(vh));
    if (lu.lengthSq() > 1e-6) { lu.normalize(); acc.addScaledVector(lu, p.K * speed * speed * CL); }
    acc.addScaledVector(vh, -p.K * speed * speed * cdAt(p, speed, CL));
  }
  S.vel.addScaledVector(acc, dt);
  S.vel.addScaledVector(r, -S.vel.dot(r) * Math.min(1, 1.2 * dt));

  S.pos.addScaledVector(S.vel, dt);
  S.q.normalize();
  S.time += dt;
  S.speed = S.vel.length();
  S.vy = S.vel.y;

  const ground = Math.max(0, terrainH(S.pos.x, S.pos.z));
  S.agl = S.pos.y - ground;
  if (S.agl < p.gearH) { S.state = 'crashed'; return; }

  if (S.nextRing < rings.length && S.pos.distanceTo(rings[S.nextRing]) < p.ringR) {
    S.nextRing++;
    if (S.nextRing >= rings.length) S.state = 'won';
  }
}

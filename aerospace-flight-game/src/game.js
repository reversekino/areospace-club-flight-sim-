import * as THREE from 'three';
import { PLANES, terrainH, makeCourse, createState, reset, step } from './physics.js';
import { MODELS } from './models.js';

const $ = (id) => document.getElementById(id);
const isTouch = window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
document.body.classList.toggle('touch', isTouch);
if (isTouch) document.getElementById('keyhelp').textContent = 'Left stick: pull down to climb, push up to dive, sideways to roll. Right slider: throttle. Keep your speed up: if you pull the nose too high, the wing stalls.';

const renderer = new THREE.WebGLRenderer({ canvas: $('c'), antialias: !isTouch });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isTouch ? 1.5 : 2));
const scene = new THREE.Scene();
const SKY = new THREE.Color(0x9fd0f5);
scene.background = SKY;
scene.fog = new THREE.Fog(SKY, 1800, 7500);
const camera = new THREE.PerspectiveCamera(65, 1, 0.5, 11000);

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.fov = w < h ? 80 : 65;           // wider view in portrait
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

scene.add(new THREE.HemisphereLight(0xdff1ff, 0x5a6b4a, 0.85));
const sun = new THREE.DirectionalLight(0xfff2d6, 1.1);
sun.position.set(600, 900, 300);
scene.add(sun);
const sunBall = new THREE.Mesh(new THREE.SphereGeometry(140, 24, 16), new THREE.MeshBasicMaterial({ color: 0xfff6c8, fog: false }));
scene.add(sunBall);

// ---- terrain + sea ----
const SIZE = 18000, SEG = 220, CZ = -7000;
const tg = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG);
tg.rotateX(-Math.PI / 2);
{
  const p = tg.attributes.position;
  const col = new Float32Array(p.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const h = terrainH(p.getX(i), p.getZ(i) + CZ);
    p.setY(i, h);
    if (h < 3) c.setRGB(0.80, 0.74, 0.5);
    else if (h < 60) c.setRGB(0.28 + h * 0.001, 0.52 - h * 0.0008, 0.24);
    else if (h < 110) c.setRGB(0.48, 0.45, 0.41);
    else c.setRGB(0.95, 0.96, 0.98);
    col.set([c.r, c.g, c.b], i * 3);
  }
  tg.setAttribute('color', new THREE.BufferAttribute(col, 3));
  tg.computeVertexNormals();
}
const terrain = new THREE.Mesh(tg, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
terrain.position.z = CZ;
scene.add(terrain);
const sea = new THREE.Mesh(new THREE.PlaneGeometry(SIZE, SIZE).rotateX(-Math.PI / 2),
  new THREE.MeshLambertMaterial({ color: 0x2a6fb0, transparent: true, opacity: 0.88 }));
sea.position.set(0, 0, CZ);
scene.add(sea);

const cloudMat = new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0xc8d4e0, transparent: true, opacity: 0.92 });
const puff = new THREE.SphereGeometry(1, 10, 8);
for (let i = 0; i < 70; i++) {
  const g = new THREE.Group();
  const n = 3 + Math.floor(Math.random() * 3);
  for (let j = 0; j < n; j++) {
    const s = new THREE.Mesh(puff, cloudMat);
    const r = 30 + Math.random() * 30;
    s.scale.set(r, r * 0.55, r);
    s.position.set(j * 40 - n * 20, Math.random() * 12, Math.random() * 30);
    g.add(s);
  }
  g.position.set((Math.random() - 0.5) * 9000, 480 + Math.random() * 400, 1500 - Math.random() * 16000);
  scene.add(g);
}

// ---- per-plane setup ----
let P = PLANES[0], rings = [], ringMeshes = [], plane = null, S = null;
const camQ = new THREE.Quaternion();

function loadPlane(p) {
  P = p;
  ringMeshes.forEach((m) => { scene.remove(m); m.geometry.dispose(); m.material.dispose(); });
  rings = makeCourse(p);
  ringMeshes = rings.map((pos, i) => {
    const m = new THREE.Mesh(new THREE.TorusGeometry(p.ringR, p.ringR * 0.09, 12, 44),
      new THREE.MeshBasicMaterial({ color: 0x66aaff, transparent: true, opacity: 0.5 }));
    m.position.copy(pos);
    m.lookAt(rings[i + 1] || new THREE.Vector3(pos.x, pos.y, pos.z - 100));
    scene.add(m);
    return m;
  });
  if (plane) scene.remove(plane);
  plane = MODELS[p.id]();
  scene.add(plane);
  S = createState(p, rings.length);
  $('pname').textContent = p.name;
}

// ---- input: keyboard ----
const keys = {};
const BLOCK = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'ControlLeft', 'ControlRight']);
window.addEventListener('keydown', (e) => {
  if (BLOCK.has(e.code)) e.preventDefault();
  keys[e.code] = true;
  if (mode === 'menu') {
    const n = parseInt(e.key, 10);
    if (n >= 1 && n <= PLANES.length) startWith(PLANES[n - 1]);
    return;
  }
  if (e.code === 'KeyR') restart();
  if (e.code === 'KeyM') openMenu();
});
window.addEventListener('keyup', (e) => { keys[e.code] = false; });
window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

// ---- input: touch joystick + throttle ----
const stick = { x: 0, y: 0, id: null };
const joy = $('joy'), knob = $('knob');
function joyMove(e) {
  const r = joy.getBoundingClientRect();
  const R = r.width / 2;
  let dx = e.clientX - (r.left + R), dy = e.clientY - (r.top + R);
  const d = Math.hypot(dx, dy);
  if (d > R) { dx *= R / d; dy *= R / d; }
  stick.x = dx / R; stick.y = dy / R;
  knob.style.transform = `translate(${dx}px, ${dy}px)`;
}
joy.addEventListener('pointerdown', (e) => { stick.id = e.pointerId; joy.setPointerCapture(e.pointerId); joyMove(e); e.preventDefault(); });
joy.addEventListener('pointermove', (e) => { if (e.pointerId === stick.id) joyMove(e); });
const joyEnd = (e) => { if (e.pointerId !== stick.id) return; stick.id = null; stick.x = stick.y = 0; knob.style.transform = ''; };
joy.addEventListener('pointerup', joyEnd);
joy.addEventListener('pointercancel', joyEnd);

let thrTouch = null, thrDrag = null;
const thrEl = $('thrslider'), thrFill = $('thrfill');
function thrMove(e) {
  const r = thrEl.getBoundingClientRect();
  thrTouch = Math.min(1, Math.max(0, 1 - (e.clientY - r.top) / r.height));
}
thrEl.addEventListener('pointerdown', (e) => { thrDrag = e.pointerId; thrEl.setPointerCapture(e.pointerId); thrMove(e); e.preventDefault(); });
thrEl.addEventListener('pointermove', (e) => { if (e.pointerId === thrDrag) thrMove(e); });
const thrEnd = (e) => { if (e.pointerId === thrDrag) thrDrag = null; };
thrEl.addEventListener('pointerup', thrEnd);
thrEl.addEventListener('pointercancel', thrEnd);

const rud = { l: false, r: false };
for (const [id, k] of [['rudL', 'l'], ['rudR', 'r']]) {
  const b = $(id);
  b.addEventListener('pointerdown', (e) => { rud[k] = true; b.setPointerCapture(e.pointerId); e.preventDefault(); });
  const up = () => { rud[k] = false; };
  b.addEventListener('pointerup', up);
  b.addEventListener('pointercancel', up);
}
$('btnRestart').addEventListener('click', () => restart());
$('btnMenu').addEventListener('click', () => openMenu());
document.addEventListener('gesturestart', (e) => e.preventDefault());

function readInput() {
  const k = keys;
  const curve = (v) => Math.sign(v) * Math.pow(Math.abs(v), 1.4);   // finer control near centre
  let pitch = ((k.KeyS || k.ArrowDown) ? 1 : 0) - ((k.KeyW || k.ArrowUp) ? 1 : 0);
  let roll = ((k.KeyD || k.ArrowRight) ? 1 : 0) - ((k.KeyA || k.ArrowLeft) ? 1 : 0);
  if (stick.id !== null) { pitch = curve(stick.y); roll = curve(stick.x); }
  const inp = {
    pitch, roll,
    yaw: ((k.KeyE || rud.r) ? 1 : 0) - ((k.KeyQ || rud.l) ? 1 : 0),
    thr: ((k.ShiftLeft || k.ShiftRight || k.KeyZ) ? 1 : 0) - ((k.ControlLeft || k.ControlRight || k.KeyX) ? 1 : 0),
    thrSet: thrTouch
  };
  thrTouch = null;
  return inp;
}

// ---- menu / game flow ----
let mode = 'menu';
const bestKey = (p) => 'crosswind-best-' + p.id;
function getBest(p) { try { return parseFloat(localStorage.getItem(bestKey(p))) || null; } catch (e) { return null; } }
function setBest(p, t) { try { localStorage.setItem(bestKey(p), String(t)); } catch (e) {} }
function fmtTime(t) { const m = Math.floor(t / 60); return m + ':' + (t % 60).toFixed(1).padStart(4, '0'); }

function buildMenu() {
  const grid = $('cards');
  grid.innerHTML = '';
  PLANES.forEach((p, i) => {
    const b = document.createElement('button');
    b.className = 'card';
    const best = getBest(p);
    b.innerHTML = `<div class="ct"><span class="num">${i + 1}</span><span><b>${p.name}</b><small>${p.type}</small></span></div>
      <p>${p.blurb}</p><ul>${p.facts.map((f) => `<li>${f}</li>`).join('')}</ul>
      <div class="cf"><span class="tag">${p.handling}</span><span>Best ${best ? fmtTime(best) : '--'}</span></div>`;
    b.addEventListener('click', () => startWith(p));
    grid.appendChild(b);
  });
}
function openMenu() {
  mode = 'menu';
  buildMenu();
  $('menu').style.display = 'flex';
  $('end').style.display = 'none';
  document.body.classList.remove('flying');
}
function startWith(p) {
  loadPlane(p);
  $('menu').style.display = 'none';
  restart();
}
function restart() {
  if (!S) return;
  reset(S);
  S.state = 'flying';
  mode = 'fly';
  camQ.copy(S.q);
  lastState = 'flying';
  lastRing = -1;
  $('end').style.display = 'none';
  document.body.classList.add('flying');
}

function paintRings() {
  ringMeshes.forEach((m, i) => {
    m.visible = i >= S.nextRing;
    const next = i === S.nextRing;
    m.material.color.setHex(next ? 0xffc83d : 0x66aaff);
    m.material.opacity = next ? 0.95 : 0.35;
  });
}

let lastRing = -1, lastState = 'menu';
function showEnd(title, line) {
  const end = $('end');
  end.innerHTML = `<h2>${title}</h2><p>${line}</p>
    <div class="row2"><button class="btn" id="again">Fly again <small>(R)</small></button>
    <button class="btn alt" id="change">Change plane <small>(M)</small></button></div>`;
  end.style.display = 'flex';
  $('again').onclick = () => restart();
  $('change').onclick = () => openMenu();
}
function updateHud() {
  $('spd').textContent = Math.round(S.speed * 3.6);
  $('alt').textContent = Math.round(S.pos.y);
  $('agl').textContent = Math.max(0, Math.round(S.agl));
  $('vs').textContent = (S.vy >= 0 ? '+' : '') + S.vy.toFixed(0);
  $('aoa').textContent = (S.aoa * 57.2958).toFixed(0) + '°';
  $('thr').style.width = (S.throttle * 100) + '%';
  thrFill.style.height = (S.throttle * 100) + '%';
  $('rings').textContent = S.nextRing + '/' + S.ringCount;
  $('time').textContent = fmtTime(S.time);
  const best = getBest(P);
  $('best').textContent = best ? fmtTime(best) : '--';
  const warn = $('warn');
  if (S.state === 'flying' && S.stalled) { warn.textContent = 'STALL: lower the nose'; warn.style.display = 'block'; }
  else if (S.state === 'flying' && S.agl < 4 * P.cam[0] + 50 && S.vy < -6) { warn.textContent = 'PULL UP'; warn.style.display = 'block'; }
  else warn.style.display = 'none';
  if (S.nextRing !== lastRing) { paintRings(); lastRing = S.nextRing; }
  if (S.state !== lastState) {
    lastState = S.state;
    if (S.state === 'crashed') {
      showEnd('Crashed', `You made it through ${S.nextRing} of ${S.ringCount} rings in the ${P.name}.`);
    } else if (S.state === 'won') {
      const b = getBest(P);
      const rec = !b || S.time < b;
      if (rec) setBest(P, S.time);
      showEnd('Course complete', `${P.name}: ${fmtTime(S.time)}${rec ? ' (new best)' : ''}`);
    }
  }
}

// ---- loop ----
const off = new THREE.Vector3(), look = new THREE.Vector3();
let last = performance.now(), menuT = 0;
function frame(now) {
  const dt = Math.min(0.033, (now - last) / 1000);
  last = now;
  if (mode === 'menu') {
    // slow orbit around the selected plane in the background
    menuT += dt * 0.15;
    plane.position.set(0, 300, 0);
    plane.quaternion.identity();
    const d = P.cam[1] * 1.3;
    camera.position.set(Math.sin(menuT) * d, 300 + P.cam[0] * 1.5, Math.cos(menuT) * d);
    camera.up.set(0, 1, 0);
    camera.lookAt(plane.position);
  } else {
    if (S.state === 'flying') {
      const inp = readInput();
      for (let i = 0; i < 2; i++) step(S, inp, rings, dt / 2);
    }
    plane.position.copy(S.pos);
    plane.quaternion.copy(S.q);
    camQ.slerp(S.q, 1 - Math.exp(-5 * dt));
    off.set(0, P.cam[0], P.cam[1]).applyQuaternion(camQ);
    camera.position.copy(S.pos).add(off);
    const floor = Math.max(0, terrainH(camera.position.x, camera.position.z)) + 3;
    if (camera.position.y < floor) camera.position.y = floor;
    camera.up.set(0, 1, 0).applyQuaternion(camQ);
    look.set(0, P.cam[0] * 0.15, -P.cam[1] * 2).applyQuaternion(S.q).add(S.pos);
    camera.lookAt(look);
    updateHud();
  }
  if (plane.userData.prop) plane.userData.prop.rotation.z += dt * (mode === 'menu' ? 25 : 15 + 60 * S.throttle);
  if (plane.userData.burner) {
    const on = mode !== 'menu' && S.throttle > 0.85 && S.state === 'flying';
    plane.userData.burner.visible = on;
    if (on) plane.userData.burner.scale.set(1, 1, 0.8 + Math.random() * 0.4);
  }
  sunBall.position.set(camera.position.x + 4000, 4200, camera.position.z - 4000);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

loadPlane(PLANES[0]);
openMenu();
requestAnimationFrame(frame);

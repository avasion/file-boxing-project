// gym.js — the room around the ring: brick walls, speckled concrete floor,
// the walkout runway crowned by the fight mural, gray lockers, fight posters,
// water cooler, mezzanine shelving, free weights, tires, dummies.
// The stands (stands.js) sit inside this shell, ringing the canvas.

import * as THREE from 'three';
import { VoxelBuilder } from './voxel.js';
import { muralTexture, posterTexture, concreteTexture, fighterPosterTexture } from './textures.js';
import { ROSTER } from './npcs.js';

export const GYM = {
  x0: -120, x1: 120,
  z0: -105, z1: 90,      // z0 = north wall (tunnel side)
  wallH: 64,
  tunnel: { x0: -16, x1: 16, h: 22, depth: 48 }, // runway runs z0 → z0-depth
};

const BRICK = '#6e2e1f';
const BRICKD = '#571f14';
const MORTAR = '#7d7466';
const LOCKER = '#565550';
const LOCKERD = '#3f3e3a';

export function buildGym(scene) {
  const v = new VoxelBuilder({ jitter: 0.06 });
  const { x0, x1, z0, z1, wallH, tunnel } = GYM;

  /* ---------------- floor ---------------- */
  const floorMat = new THREE.MeshStandardMaterial({ map: concreteTexture(), roughness: 1 });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, (z0 + z1) / 2);
  floor.receiveShadow = true;
  scene.add(floor);
  // runway floor
  const runFloor = new THREE.Mesh(new THREE.PlaneGeometry(tunnel.x1 - tunnel.x0 + 8, tunnel.depth), floorMat.clone());
  runFloor.material.map = concreteTexture();
  runFloor.material.map.repeat.set(2, 3);
  runFloor.rotation.x = -Math.PI / 2;
  runFloor.position.set(0, 0.01, z0 - tunnel.depth / 2);
  scene.add(runFloor);

  /* ---------------- brick walls (voxel courses) ---------------- */
  const brickWall = (axis, a0, a1, fixed, inward) => {
    for (let a = a0; a < a1; a += 6) {
      for (let y = 0; y < wallH; y += 3) {
        const off = (y / 3) % 2 ? 3 : 0; // running bond
        const col = Math.random() < 0.12 ? BRICKD : BRICK;
        const jx = a + off;
        if (jx + 6 > a1) continue;
        if (axis === 'x') v.add(jx + 3, y + 1.5, fixed + inward * 1, 6, 3, 2, col);
        else v.add(fixed + inward * 1, y + 1.5, jx + 3, 2, 3, 6, col);
      }
    }
  };
  // north wall in two pieces around the tunnel mouth, plus header above it
  brickWall('x', x0, tunnel.x0 - 4, z0, 1);
  brickWall('x', tunnel.x1 + 4, x1, z0, 1);
  for (let a = tunnel.x0 - 4; a < tunnel.x1 + 4; a += 6)
    for (let y = tunnel.h; y < wallH; y += 3)
      v.add(a + 3, y + 1.5, z0 + 1, 6, 3, 2, Math.random() < 0.12 ? BRICKD : BRICK);
  brickWall('x', x0, x1, z1, -1);      // south
  brickWall('z', z0, z1, x0, 1);       // west
  brickWall('z', z0, z1, x1, -1);      // east
  // concrete base skirting — split so the runway mouth stays OPEN
  v.wall('x', x0, tunnel.x0 - 8, 0, 8, z0 + 2.6, 1.5, MORTAR, 8);
  v.wall('x', tunnel.x1 + 8, x1, 0, 8, z0 + 2.6, 1.5, MORTAR, 8);
  // columns flanking the tunnel + steel header
  v.add(tunnel.x0 - 6, wallH / 2, z0 + 2, 8, wallH, 6, '#8a8172');
  v.add(tunnel.x1 + 6, wallH / 2, z0 + 2, 8, wallH, 6, '#8a8172');
  v.add(0, tunnel.h + 1.5, z0 + 2, tunnel.x1 - tunnel.x0 + 12, 3, 6, '#2a2822');

  /* ---------------- walkout runway ---------------- */
  const t = tunnel;
  v.wall('z', z0 - t.depth, z0, 0, t.h, t.x0 - 3, 2, BRICKD, 6);
  v.wall('z', z0 - t.depth, z0, 0, t.h, t.x1 + 3, 2, BRICKD, 6);
  v.slab(t.x0 - 4, t.x1 + 4, t.h + 1, z0 - t.depth, z0, 2, '#242118', 8);
  // roll-up doors at the far end
  for (let i = 0; i < 3; i++) {
    const dx = -11 + i * 11;
    v.add(dx, 8, z0 - t.depth + 1, 9.5, 16, 1.2, '#3a362c');
    for (let yy = 2; yy < 15; yy += 2.4) v.add(dx, yy, z0 - t.depth + 1.7, 9.5, 0.5, 0.3, '#2a271f');
  }
  // amber strip lights
  v.add(t.x0 - 1.6, t.h - 5, z0 - 4, 0.8, 1.6, 5, '#ffd257', { emissive: true });
  v.add(t.x1 + 1.6, t.h - 5, z0 - 4, 0.8, 1.6, 5, '#ffd257', { emissive: true });
  for (let i = 0; i < 3; i++)
    v.add(-11 + i * 11, t.h - 3.5, z0 - t.depth + 3, 8, 1.4, 0.8, '#ffd257', { emissive: true });

  /* -------- fight card: one poster per contender, 4 per runway wall -------- */
  ROSTER.forEach((c, i) => {
    const side = i < 4 ? -1 : 1;                    // west wall gets 0–3, east 4–7
    const pz = z0 - 13 - (i % 4) * 9.5;
    const art = fighterPosterTexture(c);
    const poster = new THREE.Mesh(
      new THREE.PlaneGeometry(7.5, 10),
      new THREE.MeshStandardMaterial({
        map: art,
        emissive: '#ffffff',
        emissiveMap: art,          // self-lit print — readable in the dark runway
        emissiveIntensity: 0.55,
        roughness: 1,
      })
    );
    poster.position.set(side * 17.7, 12, pz);
    poster.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2;
    scene.add(poster);
    v.add(side * 17.9, 12, pz, 0.4, 10.8, 8.2, '#1d1a14');                   // frame
    v.add(side * 17.5, 18.2, pz, 0.5, 0.7, 4.5, '#ffd257', { emissive: true }); // picture light
  });

  /* ---------------- mural above the tunnel ---------------- */
  const mural = new THREE.Mesh(
    new THREE.PlaneGeometry(78, 34),
    new THREE.MeshStandardMaterial({ map: muralTexture(), roughness: 0.95 })
  );
  mural.position.set(0, tunnel.h + 3 + 17, z0 + 2.2);
  scene.add(mural);
  v.add(0, tunnel.h + 2.4, z0 + 3, 80, 1.2, 1.6, '#1d1a14');

  /* ---------------- lockers (west of tunnel) ---------------- */
  for (let i = 0; i < 7; i++) {
    const lx = x0 + 10 + i * 9;
    v.add(lx, 11, z0 + 5.5, 8, 22, 5, i % 3 === 0 ? LOCKERD : LOCKER);
    v.add(lx, 11, z0 + 8.2, 7, 20, 0.6, LOCKERD);            // door
    for (let s = 0; s < 3; s++) v.add(lx - 2, 18 - s * 1.6, z0 + 8.6, 3, 0.5, 0.3, '#2c2b28'); // vents
    v.add(lx + 2.4, 11, z0 + 8.7, 0.7, 1.6, 0.4, '#8a8578'); // handle
  }
  // one door hanging open with gear inside
  v.add(x0 + 10 + 3 * 9 + 5.5, 11, z0 + 10, 0.6, 20, 6, LOCKERD);
  v.add(x0 + 10 + 3 * 9, 6, z0 + 7.5, 4, 4, 2.5, '#b5473f');

  // fire-alarm bell on tunnel column
  v.add(tunnel.x0 - 6, 34, z0 + 5.6, 4.5, 4.5, 1.2, '#caa33a');
  v.add(tunnel.x0 - 6, 34, z0 + 6.2, 1.4, 1.4, 0.8, '#6e5a20');

  /* ---------------- posters, cooler, bench (east of tunnel) ---------------- */
  for (let i = 0; i < 3; i++) {
    const p = new THREE.Mesh(
      new THREE.PlaneGeometry(10, 13),
      new THREE.MeshStandardMaterial({ map: posterTexture(i), roughness: 1 })
    );
    p.position.set(tunnel.x1 + 16 + i * 12, 20, z0 + 3.4);
    scene.add(p);
    v.add(tunnel.x1 + 16 + i * 12, 20, z0 + 3.1, 11, 14, 0.4, '#1d1a14');
  }
  // water cooler — teal bottle on white base
  const wcx = tunnel.x1 + 52;
  v.add(wcx, 8, z0 + 6, 6, 16, 6, '#e8e2cf');
  v.add(wcx, 18.5, z0 + 6, 5, 6, 5, '#2ab3ba');
  v.add(wcx, 22, z0 + 6, 3, 1.5, 3, '#1a8a90');
  v.add(wcx - 1.2, 11.5, z0 + 9.2, 0.8, 0.8, 0.6, '#b5473f');
  v.add(wcx + 1.2, 11.5, z0 + 9.2, 0.8, 0.8, 0.6, '#3a6ea8');
  v.add(wcx, 13.4, z0 + 9, 4, 0.6, 0.5, '#ffd257', { emissive: true });
  // green bench + bin
  v.add(tunnel.x1 + 30, 4.2, z0 + 8, 14, 1.2, 4.5, '#2e7d5b');
  v.add(tunnel.x1 + 24.5, 2, z0 + 8, 1.2, 4, 1.2, '#2c2b28');
  v.add(tunnel.x1 + 35.5, 2, z0 + 8, 1.2, 4, 1.2, '#2c2b28');
  v.add(tunnel.x1 + 40, 3, z0 + 8, 4, 6, 4, '#3f6d3a');

  // wall vent fans (green pixel fans in square housings, both flanks)
  for (const vx of [x0 + 34, x1 - 34]) {
    v.add(vx, 46, z0 + 3.4, 12, 12, 1.4, '#4a473e');
    v.add(vx, 46, z0 + 4.2, 9, 9, 0.6, '#1d1b16');
    v.add(vx, 46, z0 + 4.6, 2, 8, 0.5, '#2e7d5b');
    v.add(vx, 46, z0 + 4.6, 8, 2, 0.5, '#2e7d5b');
  }

  /* ---------------- mezzanine along the east wall ---------------- */
  const mezY = 34;
  v.slab(x1 - 42, x1, mezY, z0 + 6, z0 + 90, 3, '#8a8172', 8);
  // support columns
  for (const cz of [z0 + 14, z0 + 46, z0 + 80]) {
    v.add(x1 - 42, mezY / 2, cz, 6, mezY, 6, '#8a8172');
    v.add(x1 - 42, mezY / 2, cz, 6.5, 4, 6.5, '#6e2e1f'); // brick band
  }
  // railing
  for (let rz = z0 + 8; rz < z0 + 88; rz += 4) v.add(x1 - 41, mezY + 5, rz, 0.8, 7, 0.8, '#4a473e');
  v.add(x1 - 41, mezY + 8.6, z0 + 48, 0.9, 1, 82, '#5a574c');
  // shelving stacked with colorful stock
  const stock = ['#b5473f', '#2ab3ba', '#caa33a', '#2e7d5b', '#e8e2cf', '#3a6ea8'];
  for (let szi = 0; szi < 14; szi++) {
    const sx = x1 - 6 - Math.random() * 30;
    const sz = z0 + 12 + Math.random() * 72;
    v.add(sx, mezY + 1.5 + 2, sz, 4, 4, 4, stock[(Math.random() * stock.length) | 0]);
    if (Math.random() < 0.5) v.add(sx, mezY + 1.5 + 6, sz, 3.4, 3.4, 3.4, stock[(Math.random() * stock.length) | 0]);
  }
  // ground-floor shelf bays under the mezzanine (against the east wall)
  for (let bi = 0; bi < 3; bi++) {
    const bz = z0 + 18 + bi * 26;
    v.add(x1 - 8, 12, bz, 12, 1.2, 18, '#6e6a5e');
    v.add(x1 - 8, 22, bz, 12, 1.2, 18, '#6e6a5e');
    for (let it = 0; it < 5; it++) {
      v.add(x1 - 5 - Math.random() * 7, 14.5, bz - 7 + Math.random() * 14, 3, 3.5, 3, stock[(Math.random() * stock.length) | 0]);
    }
  }

  /* ---------------- west side: weights, racks, dummies ---------------- */
  // dumbbell rack
  v.add(x0 + 14, 6, -40, 4, 12, 30, '#3a382f');
  v.add(x0 + 20, 4, -40, 8, 1, 30, '#4a473e');
  v.add(x0 + 20, 9, -40, 8, 1, 30, '#4a473e');
  for (let di = 0; di < 6; di++) {
    for (const dy of [5.5, 10.5]) {
      v.add(x0 + 20, dy, -52 + di * 4.6, 2.2, 2.2, 2.2, '#2c2b28');
      v.add(x0 + 20, dy, -52 + di * 4.6, 4.4, 1, 1, '#55524a');
    }
  }
  // colorful tank bottles rack
  v.add(x0 + 10, 10, -6, 3, 20, 24, '#3a382f');
  const tanks = ['#d9d23a', '#2ab3ba', '#9bd93a', '#e8e2cf'];
  for (let ti = 0; ti < 4; ti++) {
    v.add(x0 + 13, 8, -15 + ti * 6, 3.4, 12, 3.4, tanks[ti]);
    v.add(x0 + 13, 14.6, -15 + ti * 6, 1.4, 1.6, 1.4, '#55524a');
  }
  // standing punch dummy (yellow torso on teal base)
  v.add(x0 + 22, 3, 22, 7, 6, 7, '#12707e');
  v.add(x0 + 22, 10, 22, 4, 8, 4, '#caa33a');
  v.add(x0 + 22, 16, 22, 3.4, 3.4, 3.4, '#d9b23a');
  // heavy bag hanging near it
  v.add(x0 + 34, 30, 34, 1, 14, 1, '#2c2b28');
  v.add(x0 + 34, 17, 34, 6, 13, 6, '#1a7d86');

  /* ---------------- south side: tires + gear chest (corners) ---------------- */
  const tireCols = ['#2c2b28', '#3a6ea8', '#b5473f', '#caa33a'];
  let tx = 82; // SE corner, clear of the south stand
  for (let stack = 0; stack < 3; stack++) {
    const n = 2 + ((Math.random() * 3) | 0);
    for (let k = 0; k < n; k++) {
      const col = k === n - 1 && Math.random() < 0.7 ? tireCols[1 + ((Math.random() * 3) | 0)] : tireCols[0];
      v.add(tx, 2 + k * 4, z1 - 14, 10, 3.4, 10, col);
      v.add(tx, 2 + k * 4, z1 - 14, 5, 3.6, 5, '#141310');
    }
    tx += 13;
  }
  // green gear chest + pink towel cart in the SW corner
  v.add(-92, 5, z1 - 10, 14, 9, 8, '#2e7d5b');
  v.add(-92, 9.8, z1 - 10, 14.6, 1.2, 8.6, '#245f46');
  v.add(-108, 4, z1 - 10, 8, 7, 6, '#c98fa4');

  v.build(scene, { castShadow: false });
}
